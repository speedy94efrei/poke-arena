'use strict';
/**
 * Banc d'essai des bots d'entraînement : fait jouer des IA l'une contre l'autre dans le simulateur, avec des
 * équipes variées. Chaque paire d'équipes est jouée deux fois, camps échangés, pour que la force des équipes
 * s'annule. Construire d'abord le serveur (`node build`).
 *
 *   node tools/banc-entrainement.js [--duels 5:4,5:3] [--equipes 20] [--graine 1] [--processus 4] [--rapport banc.json]
 *   node tools/banc-entrainement.js --voir 5:4 [--graine 3]
 *
 * IA : `1` à `5` (niveaux des bots, le 5 simule ses options dans le simulateur) et `5-regles` (niveau 5 par règles,
 * sans simulation). `--voir` joue un seul combat et affiche le raisonnement du moteur à chaque tour.
 */
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const DIST = path.join(__dirname, '../dist/');
const MAX_TURNS = 250;
const STYLES = [{ level: 3 }, { level: 3 }, { level: 4, theme: 'Pluie' }, { level: 4, theme: 'Stall' }, { level: 4, theme: 'Distorsion' }, { level: 4, theme: 'Hyper offense' }];

function seeded(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6D2B79F5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function load() {
	const { Dex } = require(DIST + 'sim/dex');
	global.toID = Dex.toID;
	return {
		TrainingAI: require(DIST + 'server/chat-plugins/entrainement/ia').TrainingAI,
		Teams: require(DIST + 'server/chat-plugins/entrainement/equipes'),
		Draft: require(DIST + 'server/chat-plugins/pokedraft'),
		Streams: require(DIST + 'sim/battle-stream'),
		packer: require(DIST + 'sim/teams').Teams,
	};
}

function makeAI(lib, spec, roster, random) {
	const engine = spec !== '5-regles';
	const level = Number(spec.replace('-regles', ''));
	return new lib.TrainingAI(level, roster, random, { engine });
}

/** Équipes d'une paire : styles variés (équilibré ou thème du roster), tirés de la graine. */
function teamsFor(lib, roster, seed, pair) {
	const random = seeded(seed * 7919 + pair);
	const pick = () => ({ key: 'banc', name: 'Banc', ...STYLES[Math.floor(random() * STYLES.length)] });
	return [lib.Teams.teamFor(pick(), roster, random), lib.Teams.teamFor(pick(), roster, random)];
}

/** Erreurs repérées dans le journal complet, par camp. */
function mistakeTracker() {
	const counts = { p1: { immunite: 0, entreKo: 0, boostKo: 0 }, p2: { immunite: 0, entreKo: 0, boostKo: 0 } };
	const fresh = { p1: null, p2: null };
	const boosted = { p1: null, p2: null };
	let lastMove = null;
	return {
		counts,
		line(line) {
			const parts = line.split('|');
			const command = parts[1];
			const side = (parts[2] || '').slice(0, 2);
			if (command === 'move') {
				lastMove = { side, target: parts[4] || '' };
				if (fresh[side] === parts[2]) fresh[side] = null;
				if (boosted[side] && boosted[side].mon === parts[2] && boosted[side].used) boosted[side] = null;
				else if (boosted[side] && boosted[side].mon === parts[2]) boosted[side].used = true;
			} else if (command === '-immune' && lastMove && lastMove.side !== side && lastMove.target === parts[2]) {
				counts[lastMove.side].immunite++;
			} else if (command === 'switch' || command === 'drag') {
				fresh[side] = parts[2];
				boosted[side] = null;
			} else if (command === '-boost' && lastMove && lastMove.side === side && !parts[5]) {
				boosted[side] = { mon: parts[2], used: false };
			} else if (command === 'faint') {
				if (fresh[side] === parts[2]) counts[side].entreKo++;
				if (boosted[side] && boosted[side].mon === parts[2] && !boosted[side].used) counts[side].boostKo++;
				fresh[side] = null;
				boosted[side] = null;
			}
		},
	};
}

async function play(lib, roster, game, watch = null) {
	const [first, second] = game.duel;
	const [teamA, teamB] = teamsFor(lib, roster, game.seed, game.pair);
	const sides = game.swap ? [[second, teamA], [first, teamB]] : [[first, teamA], [second, teamB]];
	const timing = { p1: { total: 0, count: 0 }, p2: { total: 0, count: 0 } };
	const streams = lib.Streams.getPlayerStreams(new lib.Streams.BattleStream());

	class Player extends lib.Streams.BattlePlayer {
		constructor(stream, side, ai) {
			super(stream);
			this.side = side;
			this.ai = ai;
		}

		receiveLine(line) {
			if (!line.startsWith('|request|') && !line.startsWith('|error|')) this.ai.receiveLine(line);
			super.receiveLine(line);
		}

		receiveRequest(request) {
			const start = process.hrtime.bigint();
			const choice = this.ai.decide(request);
			timing[this.side].total += Number(process.hrtime.bigint() - start) / 1e6;
			timing[this.side].count++;
			if (watch && this.side === 'p1' && this.ai.lastAnalysis && !request.wait) watch.analysis(this.ai.lastAnalysis, choice);
			if (choice) this.choose(choice);
		}

		receiveError() {
			this.choose('default');
		}
	}

	const players = sides.map(([spec, team], index) => {
		const side = `p${index + 1}`;
		const ai = makeAI(lib, spec, roster, seeded(game.seed * 31 + game.pair * 2 + index + (game.swap ? 1000 : 0)));
		ai.setTeam(team);
		return new Player(streams[side], side, ai);
	});
	const engineErrors = () => players.map(player => player.ai.engineErrors);
	for (const player of players) void player.start();
	void streams.omniscient.write([
		`>start ${JSON.stringify({ formatid: lib.Draft.FORMAT, seed: [game.seed, game.pair, game.swap ? 1 : 0, 7] })}`,
		`>player p1 ${JSON.stringify({ name: 'p1', team: lib.packer.pack(sides[0][1]) })}`,
		`>player p2 ${JSON.stringify({ name: 'p2', team: lib.packer.pack(sides[1][1]) })}`,
	].join('\n'));

	const mistakes = mistakeTracker();
	let turns = 0;
	let winner = 'egalite';
	outer: for await (const chunk of streams.omniscient) {
		for (const line of chunk.split('\n')) {
			if (watch) watch.line(line);
			mistakes.line(line);
			if (line.startsWith('|turn|')) {
				turns = Number(line.slice(6));
				if (turns > MAX_TURNS) {
					void streams.omniscient.write('>forcetie');
				}
			}
			if (line.startsWith('|win|')) {
				winner = line.slice(5);
				break outer;
			}
			if (line === '|tie') break outer;
		}
	}
	const firstSide = game.swap ? 'p2' : 'p1';
	const secondSide = game.swap ? 'p1' : 'p2';
	return {
		duel: game.duel.join(':'),
		result: winner === 'egalite' ? 'egalite' : winner === firstSide ? 'victoire' : 'defaite',
		turns,
		decision: [timing[firstSide], timing[secondSide]].map(entry => entry.count ? entry.total / entry.count : 0),
		mistakes: [mistakes.counts[firstSide], mistakes.counts[secondSide]],
		engineErrors: (game.swap ? engineErrors().reverse() : engineErrors()).map(list => list.length),
		firstError: engineErrors().flat()[0] ?? null,
	};
}

function wilson(wins, total) {
	if (!total) return [0, 0];
	const z = 1.96;
	const p = wins / total;
	const center = (p + z * z / (2 * total)) / (1 + z * z / total);
	const margin = z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / (1 + z * z / total);
	return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

const pct = value => `${Math.round(value * 100)} %`;

function summarize(results, duels) {
	const rows = duels.map(duel => {
		const key = duel.join(':');
		const games = results.filter(result => result.duel === key);
		const wins = games.filter(game => game.result === 'victoire').length;
		const ties = games.filter(game => game.result === 'egalite').length;
		const score = wins + ties / 2;
		const sum = (side, field) => games.reduce((total, game) => total + game.mistakes[side][field], 0);
		const average = list => list.reduce((total, value) => total + value, 0) / Math.max(1, list.length);
		return {
			duel: key,
			games: games.length,
			wins,
			ties,
			rate: score / Math.max(1, games.length),
			interval: wilson(score, games.length),
			turns: average(games.map(game => game.turns)),
			decision: [0, 1].map(side => average(games.map(game => game.decision[side]))),
			mistakes: [0, 1].map(side => ({
				immunite: sum(side, 'immunite') / Math.max(1, games.length),
				entreKo: sum(side, 'entreKo') / Math.max(1, games.length),
				boostKo: sum(side, 'boostKo') / Math.max(1, games.length),
			})),
		};
	});
	console.log('');
	console.log('Duel'.padEnd(24) + 'Victoires'.padEnd(26) + 'IC 95 %'.padEnd(14) + 'Tours'.padEnd(8) + 'Décision (ms)'.padEnd(17) + 'Erreurs par combat (immunité / entré puis KO / boost puis KO)');
	for (const row of rows) {
		const [a, b] = row.duel.split(':');
		const errors = row.mistakes.map(entry => `${entry.immunite.toFixed(1)} / ${entry.entreKo.toFixed(1)} / ${entry.boostKo.toFixed(1)}`);
		console.log(
			`${a} contre ${b}`.padEnd(24) +
			`${row.wins}${row.ties ? ` (+${row.ties} nuls)` : ''}/${row.games} · ${pct(row.rate)}`.padEnd(26) +
			`${pct(row.interval[0])}–${pct(row.interval[1])}`.padEnd(14) +
			row.turns.toFixed(0).padEnd(8) +
			`${row.decision[0].toFixed(0)} / ${row.decision[1].toFixed(0)}`.padEnd(17) +
			`${a} : ${errors[0]}   ${b} : ${errors[1]}`
		);
	}
	return rows;
}

function watcher(lib) {
	const { Dex } = require(DIST + 'sim/dex');
	const dex = Dex.forFormat(lib.Draft.FORMAT);
	const label = option => {
		if (option.kind === 'switch') return `→ ${dex.species.get(option.id).name}`;
		return `${dex.moves.get(option.id).name}${option.tera ? ' + Téra' : ''}`;
	};
	return {
		line(line) {
			if (/^\|(turn|move|switch|faint|-damage|-supereffective|-resisted|-immune|-boost|-status|-weather|-fieldstart|-sidestart|-terastallize|cant|-miss|win)\|/.test(line)) {
				console.log(`  ${line}`);
			}
		},
		analysis(analysis, choice) {
			console.log(`    ┌ le moteur a simulé ${analysis.simulations} tours (${analysis.ms.toFixed(0)} ms)`);
			for (const option of analysis.options.slice(0, 6)) {
				const mark = option.chosen ? '▶' : ' ';
				console.log(`    │ ${mark} ${label(option).padEnd(26)} ${option.score.toFixed(2).padStart(6)}   pire riposte : ${label(option.worst)} (${option.worstScore.toFixed(2)})`);
			}
			console.log(`    └ choix : ${choice}`);
		},
	};
}

async function main() {
	const { values } = parseArgs({
		options: {
			duels: { type: 'string', default: '5:4,5:3,4:3,3:2,2:1' },
			equipes: { type: 'string', default: '20' },
			graine: { type: 'string', default: '1' },
			processus: { type: 'string', default: String(Math.max(1, os.cpus().length - 1)) },
			rapport: { type: 'string' },
			voir: { type: 'string' },
		},
	});
	const seed = Number(values.graine);
	if (values.voir) {
		const lib = load();
		const roster = lib.Draft.loadRoster();
		const result = await play(lib, roster, { duel: values.voir.split(':'), pair: 0, swap: false, seed }, watcher(lib));
		console.log(`\nRésultat pour ${values.voir.split(':')[0]} : ${result.result} en ${result.turns} tours`);
		return;
	}
	const duels = values.duels.split(',').map(duel => duel.split(':'));
	const pairs = Number(values.equipes);
	const games = [];
	for (const duel of duels) {
		for (let pair = 0; pair < pairs; pair++) {
			for (const swap of [false, true]) games.push({ duel, pair, swap, seed });
		}
	}
	const workers = Math.min(Number(values.processus), games.length);
	console.log(`${games.length} combats, ${workers} processus…`);
	const started = Date.now();
	const results = [];
	await Promise.all(Array.from({ length: workers }, (_, index) => new Promise((resolve, reject) => {
		const worker = new Worker(__filename, { workerData: games.filter((_, game) => game % workers === index) });
		worker.on('message', result => {
			results.push(result);
			if (results.length % 20 === 0) process.stdout.write(`  ${results.length}/${games.length}\n`);
		});
		worker.on('error', reject);
		worker.on('exit', resolve);
	})));
	const rows = summarize(results, duels);
	const failures = results.filter(result => result.firstError);
	if (failures.length) {
		const total = failures.reduce((sum, result) => sum + result.engineErrors[0] + result.engineErrors[1], 0);
		console.log(`\nErreurs du moteur : ${total} décisions retombées sur les règles, dans ${failures.length} combats. Première :\n${failures[0].firstError}`);
	}
	console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s`);
	if (values.rapport) {
		fs.writeFileSync(values.rapport, JSON.stringify({ date: new Date().toISOString(), graine: seed, equipes: pairs, duels: rows, combats: results }, null, '\t'));
		console.log(`Rapport : ${values.rapport}`);
	}
}

if (isMainThread) {
	main().catch(error => {
		console.error(error);
		process.exit(1);
	});
} else {
	(async () => {
		const lib = load();
		const roster = lib.Draft.loadRoster();
		for (const game of workerData) parentPort.postMessage(await play(lib, roster, game));
	})();
}

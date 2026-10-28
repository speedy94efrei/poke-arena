'use strict';

const assert = require('./../../assert');
const { makeUser, destroyUser } = require('../../users-utils');

let Gen = null;
let Journal = null;
let Rogue = null;
let roster = null;

const tierOf = id => Gen.rosterTier(roster.pokemon.find(pokemon => pokemon.id === id));

describe('[Arène] Roguelike à étages', () => {
	before(() => {
		Gen = require('./../../../dist/server/chat-plugins/roguelike/generateur');
		Journal = require('./../../../dist/server/chat-plugins/roguelike/journal');
		Rogue = require('./../../../dist/server/chat-plugins/roguelike').Roguelike;
		roster = require('./../../../dist/server/chat-plugins/pokedraft').loadRoster();
		Rogue.save = () => {};
	});

	beforeEach(() => {
		Rogue.store = { runs: {}, records: {}, weekly: {} };
		Rogue.invites.clear();
	});

	it('la même seed donne les mêmes départs, ennemis et récompenses', () => {
		const draw = Gen.startDraw(roster, 'weekly-2026-w44').map(pokemon => pokemon.id);
		assert.deepEqual(Gen.startDraw(roster, 'weekly-2026-w44').map(pokemon => pokemon.id), draw);
		assert.notDeepEqual(Gen.startDraw(roster, 'libre-autre').map(pokemon => pokemon.id), draw);
		const plan = seed => Gen.planFloor(roster, seed, 7, [3]).teams[0].map(set => set.species);
		assert.deepEqual(plan('weekly-2026-w44'), plan('weekly-2026-w44'));
		const team = [{ species: 'dewgong', moves: ['surf'] }];
		const beaten = Gen.planFloor(roster, 's', 3, [2]).teams[0];
		assert.deepEqual(Gen.rewardsFor(roster, 's', 3, 0, beaten, team), Gen.rewardsFor(roster, 's', 3, 0, beaten, team));
		assert.equal(draw.length, 3);
	});

	it('monte en difficulté : tranches du roster, sets, IA et bonus de stats', () => {
		for (let floor = 1; floor <= 9; floor++) {
			if (Gen.floorKind(floor) !== 'combat') continue;
			for (const set of Gen.planFloor(roster, `seed-${floor}`, floor, [6]).teams[0]) {
				assert(['ZU', 'PU'].includes(tierOf(set.species)), `${set.species} (${tierOf(set.species)}) à l'étage ${floor}`);
				assert.equal(set.item, '', 'pas d\'objet avant l\'étage 10');
				assert.equal(set.level, 50);
			}
		}
		assert(Gen.planFloor(roster, 's', 12, [4]).teams[0].every(set => ['ZU', 'PU', 'NU'].includes(tierOf(set.species))));
		assert.deepEqual([1, 9, 10, 19, 20, 30].map(floor => Gen.aiLevel(floor)), [2, 2, 3, 3, 4, 5]);
		assert.deepEqual([29, 30, 40, 55].map(Gen.statBonus), [0, 5, 10, 15]);
		assert.equal(Gen.planFloor(roster, 's', 13, [2], true).level, 4, "un combat d'élite a une IA d'un cran plus forte");
	});

	it('les boss ont une équipe complète à thème, les gros boss une règle spéciale', () => {
		const boss = Gen.planFloor(roster, 'boss', 5, [2]);
		assert.equal(boss.kind, 'boss');
		assert.equal(boss.teams[0].length, 6);
		assert(Gen.BOSS_THEMES.includes(boss.theme));
		const big = Gen.planFloor(roster, 'boss', 10, [3]);
		assert.equal(big.kind, 'grosboss');
		assert(['pieges', 'lead'].includes(big.rule));
		const themes = [5, 10, 15, 20, 25, 30, 35, 40].map(floor => Gen.bossTheme('boss', floor));
		assert.equal(new Set(themes).size, 8, `les 8 thèmes une fois chacun (${themes.join(', ')})`);
		assert.equal(Gen.planFloor(roster, 'duo', 5, [2, 3], false, 3).teams.every(team => team.length === 3), true, 'en coop, 3 Pokémon par camp');
	});

	it('jamais plus de 2 Pokémon faibles au même type quand le roster le permet', () => {
		const { Dex } = require('./../../../dist/sim/dex');
		const dex = Dex.forFormat('gen9pokedraft');
		for (let seed = 0; seed < 20; seed++) {
			const team = Gen.planFloor(roster, `synergie-${seed}`, 23, [6]).teams[0];
			for (const type of dex.types.names()) {
				const weak = team.filter(set => {
					const types = dex.species.get(set.species).types;
					return dex.getImmunity(type, types) && dex.getEffectiveness(type, types) > 0;
				});
				assert(weak.length <= 2, `${weak.length} faibles à ${type} : ${weak.map(set => set.species).join(', ')}`);
			}
		}
	});

	it('relit les PV exacts et les statuts dans le journal, lignes secrètes comprises', () => {
		const start = new Map([['Lamantine', { hp: 80, status: '' }], ['Arbok', { hp: 100, status: '' }], ['Hypnomade', { hp: 50, status: 'par' }]]);
		const lines = [
			'|split|p1', '|switch|p1a: Lamantine|Dewgong, L50|130/167', '|switch|p1a: Lamantine|Dewgong, L50|78/100',
			'|split|p1', '|-damage|p1a: Lamantine|40/167 brn', '|-damage|p1a: Lamantine|24/100 brn',
			'|switch|p2a: Arbok|Arbok, L50|100/100',
			'|split|p1', '|switch|p1a: Arbok|Arbok, L50|150/150', '|switch|p1a: Arbok|Arbok, L50|100/100',
			'|faint|p1a: Arbok',
		];
		const end = Journal.finalConditions(lines, 'p1', start);
		assert.deepEqual(end.get('Lamantine'), { hp: 24, status: 'brn' });
		assert.deepEqual(end.get('Arbok'), { hp: 0, status: '' });
		assert.deepEqual(end.get('Hypnomade'), { hp: 50, status: 'par' });
	});

	it('applique en combat les PV gardés, les pièges du gros boss et le bonus de stats', () => {
		const { Battle } = require('./../../../dist/sim/battle');
		const team = ['dewgong', 'arbok'].map(id => Gen.rogueSet(roster.pokemon.find(pokemon => pokemon.id === id), 'simple'));
		const battle = new Battle({
			formatid: `${Gen.ROGUE_FORMAT}@@@Roguelike PV = 50brn.30slp,Roguelike Boss = pieges,Roguelike Bonus = 10`,
			p1: { name: 'Joueur', team }, p2: { name: 'IA', team },
		});
		battle.choose('p1', 'team 1');
		battle.choose('p2', 'team 1');
		const [lead, bench] = battle.p1.pokemon;
		assert.equal(lead.status, 'brn');
		assert(lead.hp < lead.maxhp * 0.5, 'Piège de Roc et Picots blessent le Pokémon de tête');
		assert.equal(bench.hp, Math.ceil(bench.maxhp * 0.3));
		assert.equal(bench.status, 'slp');
		assert(battle.p2.active[0].getStat('atk') > battle.p1.active[0].getStat('atk'), "l'IA a ses stats bonifiées");
	});

	it("déroule une run : départ, victoire, K.O. perdus, récompense, portes, puis défaite et classement de la semaine", () => {
		const user = makeUser('Grimpeur');
		try {
			const run = Rogue.create([user], 'semaine');
			const player = run.players[0];
			const species = player.draw[0];
			Rogue.act(user, { type: 'depart', species, set: 1 });
			assert.equal(run.phase, 'combat');
			assert.equal(player.team[0].set.level, 50);

			const plan = Gen.planFloor(roster, run.seed, 1, [1]);
			run.battle = { roomid: 'battle-gen9pokedraftroguelike-1', plan };
			const name = player.team[0].set.name;
			Rogue.battleEnded(run.battle.roomid, user.id, 7, ['|split|p1', `|-damage|p1a: ${name}|60/150 psn`, `|-damage|p1a: ${name}|40/100 psn`]);
			assert.equal(run.phase, 'recompense');
			assert.deepEqual([player.team[0].hp, player.team[0].status], [40, 'psn']);
			assert.equal(run.turns, 7);
			assert(run.tokens > 0);

			const options = player.rewards.options;
			const item = options.findIndex(option => option.kind === 'objet');
			Rogue.act(user, { type: 'recompense', choix: [{ index: item }] });
			assert.equal(run.floor, 2);
			assert.equal(player.bag.length, 1);
			Rogue.act(user, { type: 'objet', species, item: player.bag[0] });
			assert(player.team[0].set.item);

			run.battle = { roomid: 'battle-gen9pokedraftroguelike-2', plan: Gen.planFloor(roster, run.seed, 2, [1]) };
			Rogue.battleEnded(run.battle.roomid, user.id, 5, []);
			Rogue.act(user, { type: 'recompense', choix: [{ index: player.rewards.options.findIndex(option => option.kind !== 'recrue' && option.kind !== 'ct') }] });
			assert.equal(run.phase, 'porte', 'des portes après l\'étage 2');
			run.doors = ['centre', 'pension'];
			Rogue.act(user, { type: 'porte', index: 0 });
			assert.deepEqual([player.team[0].hp, player.team[0].status], [100, ''], 'le Centre Pokémon soigne');

			run.battle = { roomid: 'battle-gen9pokedraftroguelike-3', plan: Gen.planFloor(roster, run.seed, 3, [1]) };
			Rogue.battleEnded(run.battle.roomid, 'bot', 9, [`|faint|p1a: ${name}`]);
			assert.equal(run.phase, 'fin');
			assert.equal(player.team.length, 0);
			assert.deepEqual(player.lost, [{ species, floor: 3 }]);
			const board = Rogue.leaderboard(run.seed, false, user.id);
			assert.deepEqual([board.mine.floor, board.mine.turns], [3, 21]);
			assert.equal(Rogue.store.records[user.id].semaine, 3);
		} finally {
			destroyUser(user);
		}
	});

	it('recruter avec une équipe pleine oblige à relâcher un Pokémon', () => {
		const user = makeUser('Recruteur');
		try {
			const run = Rogue.create([user], 'libre');
			const player = run.players[0];
			Rogue.act(user, { type: 'depart', species: player.draw[0], set: 0 });
			const others = roster.pokemon.filter(pokemon => pokemon.id !== player.team[0].species).slice(0, 6);
			for (const pokemon of others.slice(0, 5)) {
				player.team.push({ species: pokemon.id, set: Gen.rogueSet(pokemon), learned: [], hp: 100, status: '' });
			}
			const newcomer = others[5];
			assert.throws(() => Rogue.recruit(run, player, newcomer.id, Gen.rogueSet(newcomer)), /relâcher/);
			Rogue.recruit(run, player, newcomer.id, Gen.rogueSet(newcomer), others[0].id);
			assert.equal(player.team.length, 6);
			assert(player.team.some(member => member.species === newcomer.id));
			assert(!player.team.some(member => member.species === others[0].id));
		} finally {
			destroyUser(user);
		}
	});

	it('en coop, deux joueurs partagent la run, chacun avec son tirage et sa récompense', () => {
		const host = makeUser('Hote');
		const guest = makeUser('Invite');
		try {
			Rogue.act(host, { type: 'inviter', pseudo: 'Invite', mode: 'libre' });
			Rogue.act(guest, { type: 'accepter' });
			const run = Rogue.activeRun(host.id);
			assert(run.duo);
			assert.equal(Rogue.activeRun(guest.id), run);
			Rogue.act(host, { type: 'depart', species: run.players[0].draw[0], set: 0 });
			assert.equal(run.phase, 'depart', 'le combat attend le départ des deux joueurs');
			Rogue.act(guest, { type: 'depart', species: run.players[1].draw[1], set: 0 });
			assert.equal(run.phase, 'combat');
			const plan = Gen.planFloor(roster, run.seed, 1, [1, 1], false, 3);
			assert.equal(plan.teams.length, 2);
			run.battle = { roomid: 'battle-gen9pokedraftroguelikeduo-1', plan };
			Rogue.battleEnded(run.battle.roomid, host.id, 4, ['|split|p3', `|-damage|p3a: ${run.players[1].team[0].set.name}|10/200`, '|x|']);
			assert.equal(run.players[1].team[0].hp, 5);
			assert(run.players[0].rewards && run.players[1].rewards);
			Rogue.act(host, { type: 'recompense', choix: [{ index: run.players[0].rewards.options.findIndex(option => option.kind === 'objet') }] });
			assert.equal(run.phase, 'recompense', "on attend la récompense de l'autre joueur");
			Rogue.act(guest, { type: 'recompense', choix: [{ index: run.players[1].rewards.options.findIndex(option => option.kind === 'objet') }] });
			assert.equal(run.floor, 2);
		} finally {
			destroyUser(host);
			destroyUser(guest);
		}
	});

	it('en combat multi, les deux IA visent leurs cibles et finissent le combat', async function () {
		this.timeout(120000);
		const { BattleStream, BattlePlayer, getPlayerStreams } = require('./../../../dist/sim/battle-stream');
		const { MultiTrainingAI } = require('./../../../dist/server/chat-plugins/entrainement/ia');
		const packer = require('./../../../dist/sim/teams').Teams;
		let errors = 0;
		class Player extends BattlePlayer {
			constructor(stream, ai) {
				super(stream);
				this.ai = ai;
			}

			receiveLine(line) {
				if (!line.startsWith('|request|') && !line.startsWith('|error|')) this.ai.receiveLine(line);
				super.receiveLine(line);
			}

			receiveRequest(request) {
				const choice = this.ai.decide(request);
				if (choice) this.choose(choice);
			}

			receiveError() {
				errors++;
				this.choose('default');
			}
		}
		const plan = Gen.planFloor(roster, 'multi', 12, [3, 3], false, 3);
		const random = Gen.seeded('multi-ia');
		const streams = getPlayerStreams(new BattleStream());
		for (const side of ['p1', 'p2', 'p3', 'p4']) {
			void new Player(streams[side], new MultiTrainingAI(side === 'p2' || side === 'p4' ? 4 : 2, roster, random, { format: Gen.DUO_FORMAT })).start();
		}
		void streams.omniscient.write([
			`>start ${JSON.stringify({ formatid: Gen.DUO_FORMAT, seed: [1, 2, 3, 4] })}`,
			...['p1', 'p2', 'p3', 'p4'].map((side, index) => `>player ${side} ${JSON.stringify({ name: side, team: packer.pack(plan.teams[index % 2]) })}`),
		].join('\n'));
		let winner = '';
		let targeted = 0;
		for await (const chunk of streams.omniscient) {
			for (const line of chunk.split('\n')) {
				if (line.startsWith('|win|')) winner = line.slice(5);
				if (/^\|move\|p[24]a: [^|]+\|[^|]+\|p[13]a: /.test(line)) targeted++;
			}
			if (winner) break;
		}
		assert(winner, 'le combat se termine');
		assert(targeted > 0, "l'IA vise les Pokémon des joueurs");
		assert(errors <= 2, `${errors} choix refusés par le simulateur`);
	});
});

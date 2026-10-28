'use strict';

const assert = require('./../../assert');

let Ai = null;
let Teams = null;
let Draft = null;
let roster = null;

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

function rosterMon(id) {
	return roster.pokemon.find(pokemon => pokemon.id === id);
}

/** Un Pokémon de la requête, à partir de son set par défaut ; `hp` est la part de PV restants. */
function mon(ai, id, { active = false, hp = 1, moves } = {}) {
	const set = Draft.defaultSet(rosterMon(id));
	const stats = ai.statsFor(id);
	const current = Math.round(stats.hp * hp);
	return {
		ident: `p1: ${set.name}`,
		details: `${ai.dex.species.get(id).name}, L100`,
		condition: current ? `${current}/${stats.hp}` : '0 fnt',
		active,
		stats: { atk: stats.atk, def: stats.def, spa: stats.spa, spd: stats.spd, spe: stats.spe },
		moves: moves ?? set.moves,
		baseAbility: set.ability,
		item: set.item,
		pokeball: 'pokeball',
		ability: set.ability,
		teraType: ai.dex.species.get(id).types[0],
	};
}

function moveRequest(ai, active, moves, bench = []) {
	return {
		active: [{ moves: moves.map(id => ({ move: id, id, pp: 10, maxpp: 10, disabled: false })) }],
		side: { name: 'Bot', id: 'p1', pokemon: [mon(ai, active.id, { ...active, active: true, moves }), ...bench.map(other => mon(ai, other.id, other))] },
		rqid: 1,
	};
}

function foe(ai, id, hp = 100) {
	const name = rosterMon(id).nom;
	ai.receiveLine(`|switch|p2a: ${name}|${ai.dex.species.get(id).name}, L100|${hp}/100`);
}

describe('PokéDraft · bots d\'entraînement', () => {
	before(() => {
		Ai = require('./../../../dist/server/chat-plugins/entrainement/ia');
		Teams = require('./../../../dist/server/chat-plugins/entrainement/equipes');
		Draft = require('./../../../dist/server/chat-plugins/pokedraft');
		roster = Draft.loadRoster();
	});

	it('le niveau 2 choisit l\'attaque super efficace', () => {
		const ai = new Ai.TrainingAI(2, roster, seeded(1));
		foe(ai, 'luxray');
		assert.equal(ai.decide(moveRequest(ai, { id: 'flygon' }, ['dragonclaw', 'earthquake'])), 'move 2');
	});

	it('le niveau 1 ne change jamais de Pokémon de lui-même', () => {
		const ai = new Ai.TrainingAI(1, roster, seeded(2));
		foe(ai, 'luxray');
		const request = moveRequest(ai, { id: 'sharpedo', hp: 0.1 }, ['waterfall', 'crunch'], [{ id: 'mudsdale' }]);
		for (let i = 0; i < 20; i++) assert(ai.decide(request).startsWith('move '));
	});

	it('le niveau 3 se replie sur un Pokémon qui encaisse quand il va être mis KO', () => {
		const ai = new Ai.TrainingAI(3, roster, seeded(3));
		foe(ai, 'luxray');
		const request = moveRequest(ai, { id: 'sharpedo', hp: 0.1 }, ['waterfall', 'crunch'], [{ id: 'weavile', hp: 0 }, { id: 'mudsdale' }]);
		assert.equal(ai.decide(request), 'switch 3');
	});

	it('le niveau 4 achève avec une attaque prioritaire quand l\'adversaire est plus rapide', () => {
		const ai = new Ai.TrainingAI(4, roster, seeded(4));
		foe(ai, 'luxray', 5);
		assert.equal(ai.decide(moveRequest(ai, { id: 'bisharp', hp: 0.05 }, ['ironhead', 'suckerpunch'])), 'move 2');
	});

	it('les équipes des bots sont valides pour le format', () => {
		const validator = require('./../../../dist/sim/team-validator').TeamValidator.get(Draft.FORMAT);
		for (const profile of Teams.BOTS) {
			for (let seed = 1; seed <= 3; seed++) {
				const team = Teams.teamFor(profile, roster, seeded(seed));
				assert.equal(team.length, 6);
				assert.equal(validator.validateTeam(team), null, `${profile.name} : équipe invalide`);
			}
		}
	});

	it('un bot à thème pioche dans son archétype et met un poseur de terrain en tête', () => {
		const profile = Teams.BOTS.find(bot => bot.key === 'pluie');
		const team = Teams.teamFor(profile, roster, seeded(5));
		assert(team.every(set => rosterMon(set.species).archetypes.includes('Pluie')));
		assert(team[0].moves.includes('raindance'));
		assert(Teams.bansFor(profile, roster, seeded(6)).every(id => !rosterMon(id).archetypes.includes('Pluie')));
		assert.equal(rosterMon(Teams.pickFor(profile, roster, ['bisharp', 'lanturn', 'weavile'], [], seeded(7))).archetypes.includes('Pluie'), true);
	});

	it('le niveau 5 bat le niveau 1 avec la même équipe', async function () {
		this.timeout(60000);
		const { BattleStream, BattlePlayer, getPlayerStreams } = require('./../../../dist/sim/battle-stream');
		const packer = require('./../../../dist/sim/teams').Teams;

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
				this.choose('default');
			}
		}

		async function play(seed) {
			const team = packer.pack(Teams.teamFor(Teams.BOTS[2], roster, seeded(seed)));
			const streams = getPlayerStreams(new BattleStream());
			void new Player(streams.p1, new Ai.TrainingAI(5, roster, seeded(seed * 2))).start();
			void new Player(streams.p2, new Ai.TrainingAI(1, roster, seeded(seed * 3))).start();
			void streams.omniscient.write([
				`>start ${JSON.stringify({ formatid: Draft.FORMAT, seed: [seed, seed + 1, seed + 2, seed + 3] })}`,
				`>player p1 ${JSON.stringify({ name: 'Expert', team })}`,
				`>player p2 ${JSON.stringify({ name: 'Debutant', team })}`,
			].join('\n'));
			for await (const chunk of streams.omniscient) {
				for (const line of chunk.split('\n')) {
					if (line.startsWith('|win|')) return line.slice(5);
					if (line === '|tie') return 'tie';
				}
			}
			return 'tie';
		}

		const winners = [];
		for (let seed = 1; seed <= 6; seed++) winners.push(await play(seed));
		const wins = winners.filter(name => name === 'Expert').length;
		assert(wins >= 5, `le niveau 5 n'a gagné que ${wins} combats sur 6 (${winners.join(', ')})`);
	});
});

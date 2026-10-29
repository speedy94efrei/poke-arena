'use strict';

const assert = require('./../../assert');
const { makeUser, destroyUser } = require('../../users-utils');

let Data = null;
let Route = null;
let kanto = null;

const FORMAT = 'gen9routedesligueskanto';
const set = (species, moves, level = 20) => ({
	name: species, species, item: '', ability: '', moves, nature: 'Hardy', gender: '', level,
	evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
});

describe('[Arène] Route des Ligues', () => {
	before(() => {
		Data = require('./../../../dist/server/chat-plugins/route/donnees');
		Route = require('./../../../dist/server/chat-plugins/route').Route;
		kanto = Data.loadRegion('kanto');
		Route.save = () => {};
	});

	beforeEach(() => {
		Route.saves = {};
	});

	it('tire 12 Pokémon de Kanto au premier stade : un starter au moins, 2 par type au plus, aucun légendaire', () => {
		for (const seed of ['a', 'b', 'c', 'd', 'e']) {
			const draw = Data.drawBench(kanto, seed);
			assert.deepEqual(Data.drawBench(kanto, seed), draw, 'la même seed donne le même banc');
			assert.equal(new Set(draw).size, 12);
			assert(draw.some(id => kanto.starters.includes(id)), 'au moins un starter');
			const species = draw.map(id => Dex.mod('routedesligues').species.get(id));
			assert(species.every(entry => entry.num >= 1 && entry.num <= 151 && !entry.prevo || Dex.species.get(entry.prevo).num > 151));
			assert(!species.some(entry => entry.tags.length), 'ni légendaire ni fabuleux');
			const perType = {};
			for (const entry of species) perType[entry.types[0]] = (perType[entry.types[0]] ?? 0) + 1;
			assert(Object.values(perType).every(count => count <= 2), JSON.stringify(perType));
		}
	});

	it('fait grandir les Pokémon : évolutions par niveau, pierre ou badge, et attaques apprises au niveau', () => {
		assert.equal(Data.stageForLevel('weedle', kanto, 15, 0), 'beedrill');
		assert.equal(Data.stageForLevel('abra', kanto, 15, 0), 'abra');
		assert.equal(Data.stageForLevel('abra', kanto, 43, 6), 'alakazam', 'Kadabra évolue au badge de l\'échange');
		assert.deepEqual(Data.evolutionPaths('pikachu', kanto), [{ to: 'raichu', by: 'stone', stone: 'thunderstone' }]);
		const known = Data.knownMoves('charmander', 15);
		assert(known.includes('ember') && !known.includes('flamethrower'));
		assert(Data.knownMoves('tauros', 15, ['bodyslam']).includes('bodyslam'), 'une CT débloquée ajoute son attaque');
		assert.deepEqual(kanto.levels.gyms.map((level, index) => Data.teamLevel(kanto, { kind: 'gym', index })), [15, 21, 26, 32, 38, 43, 47, 50]);
		assert.deepEqual([Data.prizeFor({ kind: 'gym', index: 7 }), Data.prizeFor({ kind: 'elite', index: 0 }), Data.prizeFor({ kind: 'champion' })], [8000, 5000, 15000]);
	});

	it('le sac sert en combat : 2 potions et 1 Rappel au plus, à la place d\'une attaque', () => {
		const { Battle } = require('./../../../dist/sim/battle');
		const battle = new Battle({
			formatid: `${FORMAT}@@@Route Sac = potion.3+revive.2/hyperpotion.1,Route PV = 40.0`,
			p1: { name: 'Joueur', team: [set('Pikachu', ['thundershock']), set('Charmander', ['ember'])] },
			p2: { name: 'Champion', team: [set('Magikarp', ['splash'])] },
		});
		const lead = battle.p1.pokemon[0];
		const bench = battle.p1.pokemon[1];
		assert(bench.fainted, 'un Pokémon K.O. au combat précédent le reste');
		assert.deepEqual(battle.p1.activeRequest.bag.map(item => item.id), ['potion', 'revive']);
		assert(!battle.p1.choose('item potion 2'), 'pas de potion sur un Pokémon K.O.');

		const before = lead.hp;
		battle.makeChoices('item potion 1', 'move 1');
		assert.equal(lead.hp, before + Math.floor(lead.maxhp * 0.25));
		assert(battle.log.some(line => line === '|bagitem|p1|Potion|p1a: Pikachu'));

		battle.makeChoices('item revive 2', 'move 1');
		assert(!bench.fainted && bench.hp === Math.floor(bench.maxhp / 2), 'le Rappel ramène à 50 %');
		assert(!battle.p1.activeRequest.bag.some(item => item.id === 'revive'), 'un seul Rappel par combat');

		battle.makeChoices('item potion 1', 'move 1');
		assert(!battle.p1.choose('item potion 1'), 'pas de 3e potion dans le même combat');
		assert.equal(battle.p1.bag.potion, 1);
		assert.equal(battle.p2.activeRequest.bag[0].id, 'hyperpotion', 'le Champion a son propre sac');
	});

	it("déroule une région : tirage, équipe, badge, récompense, évolution, puis défaite et nouveau tirage", () => {
		const user = makeUser('Dresseur Route');
		try {
			const save = Route.saveOf(user);
			const run = Route.start(save, 'kanto');
			assert.equal(run.phase, 'tirage');
			assert.throws(() => Route.keep(save, run.draw.slice(0, 5)), /Garde 6/);
			const kept = [...run.draw.filter(id => kanto.starters.includes(id)), ...run.draw].filter((id, index, list) => list.indexOf(id) === index).slice(0, 6);
			Route.keep(save, kept);
			assert.equal(run.phase, 'carte');
			assert.equal(run.team.length, 6);
			assert(run.starter, 'le Maître a choisi son starter contre ton équipe');
			assert(run.team.every(member => member.moves.length >= 1 && member.moves.length <= 4));
			assert.throws(() => Route.setMoves(run, 0, ['hyperbeam']), /connaît/);

			run.battle = { roomid: 'battle-gen9routedesligueskanto-1' };
			run.bag = { potion: 1 };
			const name = Data.routeDex().species.get(run.team[0].species).name;
			Route.battleEnded(run.battle.roomid, user.id, [`|bagitem|p1|Potion|p1a: ${name}`]);
			assert.equal(run.badges, 1);
			assert.equal(run.money, 1000);
			assert.deepEqual(run.tms, ['stealthrock'], 'la CT de Pierre');
			assert.equal(run.bag.potion, 0, 'la potion utilisée quitte le sac');
			assert.equal(Route.level(run), 21);
			const starter = run.team.findIndex(member => kanto.starters.includes(member.species));
			assert.equal(run.phase, 'evolution', 'le starter évolue au niveau 21');
			Route.evolve(run, starter, true);
			assert(!kanto.starters.includes(run.team[starter].species));
			for (const pending of [...run.evolutions]) Route.evolve(run, pending.index, false);
			assert.equal(run.phase, 'carte');

			Route.buy(run, 'potion');
			assert.equal(run.money, 700);
			assert.throws(() => Route.buy(run, 'lifeorb'), /pas encore/);
			const given = run.team[1].species;
			const received = Route.trade(run, 1);
			assert.notEqual(received, given);
			assert.equal(run.trades, 1);

			run.battle = { roomid: 'battle-gen9routedesligueskanto-2' };
			Route.battleEnded(run.battle.roomid, 'championondine', []);
			assert.equal(save.run.attempt, 2, 'une défaite fait recommencer Kanto');
			assert.equal(save.run.phase, 'tirage');
			assert.equal(save.run.money, 0);
			assert.deepEqual(save.defeat, { region: 'kanto', against: 'Ondine', attempt: 1 });
		} finally {
			destroyUser(user);
		}
	});

	it('pendant la Ligue, les PV restent d\'un combat à l\'autre, et le Maître laisse un dernier essai', () => {
		const user = makeUser('Dresseur Ligue');
		try {
			const save = Route.saveOf(user);
			const run = Route.start(save, 'kanto');
			Route.keep(save, run.draw.slice(0, 6));
			run.badges = 8;
			const [first, second] = run.team.map(member => Data.routeDex().species.get(member.species).name);
			run.battle = { roomid: 'battle-gen9routedesligueskanto-3' };
			Route.battleEnded(run.battle.roomid, user.id, [`|-damage|p1a: ${first}|30/100`, `|faint|p1a: ${second}`]);
			assert.equal(run.league, 1);
			assert.deepEqual([run.team[0].hp, run.team[1].hp], [30, 0]);

			run.league = 4;
			for (const member of run.team) Object.assign(member, { hp: 100, status: '' });
			run.phase = 'carte';
			run.battle = { roomid: 'battle-gen9routedesligueskanto-4' };
			Route.battleEnded(run.battle.roomid, 'maitreblue', []);
			assert.equal(save.run, run, 'un essai de plus contre le Maître');
			assert(run.championRetry);
			run.battle = { roomid: 'battle-gen9routedesligueskanto-5' };
			Route.battleEnded(run.battle.roomid, user.id, []);
			assert.equal(run.phase, 'fin');
			assert.deepEqual(save.completed, ['kanto']);
			assert.equal(save.bonus, 15000, 'la prime du Maître part avec toi dans la région suivante');
		} finally {
			destroyUser(user);
		}
	});

	it('un Champion soigne son Pokémon bas en PV avec une potion', () => {
		const { LeaderAI } = require('./../../../dist/server/chat-plugins/entrainement/ia');
		const ai = new LeaderAI(3, { pokemon: [] }, () => 0.5, { format: FORMAT, sets: () => null });
		ai.receiveLine('|switch|p1a: Pikachu|Pikachu, L15|100/100');
		ai.receiveLine('|switch|p2a: Onix|Onix, L16|8/40');
		const request = {
			active: [{ moves: [{ move: 'Tackle', id: 'tackle', pp: 35, maxpp: 35, target: 'normal', disabled: false }] }],
			side: {
				name: 'Champion Pierre', id: 'p2', pokemon: [{
					ident: 'p2: Onix', details: 'Onix, L16', condition: '8/40', active: true, moves: ['tackle'], baseAbility: 'sturdy',
					item: '', pokeball: 'pokeball', stats: { atk: 30, def: 80, spa: 20, spd: 30, spe: 40 },
				}],
			},
			bag: [{ id: 'potion', name: 'Potion', kind: 'potion', count: 2 }],
		};
		assert.equal(ai.decide(request), 'item potion 1');
		request.side.pokemon[0].condition = '35/40';
		assert.equal(ai.decide(request), 'move 1');
	});
});

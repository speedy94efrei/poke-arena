'use strict';

const assert = require('./../../assert');

const T0 = 1_000_000;
let Draft = null;

function session(random = () => 0) {
	return new Draft.DraftSession('draft-test', ['alice', 'bruno'], Draft.loadRoster(), T0, random);
}

function ids(draft) {
	return draft.roster.pokemon.map(pokemon => pokemon.id);
}

function toPicks(draft, now = T0) {
	draft.lockBans(0, now);
	draft.lockBans(1, now);
	draft.update(draft.deadline);
	return draft.deadline;
}

function draftAll(draft) {
	let now = toPicks(draft);
	while (draft.phase === 'pick') {
		const { side } = draft.currentTurn();
		draft.pick(side, draft.available()[0], now);
		now += 1000;
	}
	return now;
}

describe('[PokéDraft] Draft classé', () => {
	before(() => {
		Draft = require('./../../../dist/server/chat-plugins/pokedraft');
	});

	it('cache les bans adverses jusqu\'à la révélation', () => {
		const draft = session();
		const [a, b, c] = ids(draft);
		draft.setBans(0, [a, b]);
		draft.setBans(1, [c]);
		assert.deepEqual(draft.view(0, T0).bans, { mine: [a, b], theirs: [] });
		draft.lockBans(0, T0);
		draft.lockBans(1, T0);
		assert.equal(draft.phase, 'reveal');
		assert.deepEqual(draft.view(0, T0).bans, { mine: [a, b], theirs: [c] });
	});

	it('perd les bans non choisis à la fin du chrono et garde les bans sélectionnés', () => {
		const draft = session();
		const [a] = ids(draft);
		draft.setBans(0, [a]);
		assert.equal(draft.update(T0 + Draft.DURATIONS.ban - 1), false);
		assert(draft.update(T0 + Draft.DURATIONS.ban));
		assert.equal(draft.phase, 'reveal');
		assert.deepEqual(draft.lostBans, [2, 3]);
		assert.deepEqual(draft.bans[0], [a]);
	});

	it('refuse plus de 3 bans et un Pokémon hors roster', () => {
		const draft = session();
		assert.throws(() => draft.setBans(0, ids(draft).slice(0, 4)), Draft.DraftError);
		assert.throws(() => draft.setBans(0, ['pikachu']), Draft.DraftError);
	});

	it('suit l\'ordre en serpent 1-2-2-2-2-2-1 et donne 6 Pokémon à chacun', () => {
		const draft = session();
		const order = [];
		let now = toPicks(draft);
		while (draft.phase === 'pick') {
			const { side } = draft.currentTurn();
			order.push(side);
			draft.pick(side, draft.available()[0], now);
			now += 1000;
		}
		assert.deepEqual(order, [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0]);
		assert.equal(draft.phase, 'prep');
		assert.equal(draft.picksOf(0).length, 6);
		assert.equal(draft.picksOf(1).length, 6);
	});

	it('interdit de picker un Pokémon banni, déjà pris, ou hors de son tour', () => {
		const draft = session();
		const [banned, first] = ids(draft);
		draft.setBans(1, [banned]);
		const now = toPicks(draft);
		assert.throws(() => draft.pick(0, banned, now), /plus disponible/);
		assert.throws(() => draft.pick(1, first, now), /pas ton tour/);
		draft.pick(0, first, now);
		assert.throws(() => draft.pick(1, first, now), /plus disponible/);
	});

	it('verrouille la présélection quand le chrono d\'un pick expire', () => {
		const draft = session();
		const now = toPicks(draft);
		const choice = draft.available()[5];
		draft.preselect(0, choice);
		draft.update(now + Draft.DURATIONS.pick);
		assert.deepEqual(draft.picks, [{ id: choice, side: 0, random: false }]);
	});

	it('choisit au hasard parmi les Pokémon restants quand le chrono expire sans présélection', () => {
		const draft = session(() => 0.999);
		const now = toPicks(draft);
		draft.pick(0, draft.available()[0], now);
		const remaining = draft.available();
		draft.update(now + Draft.DURATIONS.pick);
		assert.deepEqual(draft.picks.slice(1).map(pick => [pick.side, pick.random]), [[1, true], [1, true]]);
		assert.equal(draft.picks[1].id, remaining[remaining.length - 1]);
	});

	it('n\'accepte en préparation que les 6 Pokémon draftés, dans un set valide', () => {
		const draft = session();
		draftAll(draft);
		const other = draft.picksOf(1);
		const byId = new Map(draft.roster.pokemon.map(pokemon => [pokemon.id, pokemon]));
		const team = ids => Teams.pack(ids.map(id => Draft.defaultSet(byId.get(id))));
		assert.throws(() => draft.submitTeam(0, team(other)), /6 Pokémon draftés/);
		const invalid = Draft.defaultSet(byId.get(draft.picksOf(0)[0]));
		invalid.evs = { hp: 252, atk: 252, def: 252, spa: 0, spd: 0, spe: 0 };
		assert.throws(() => draft.submitTeam(0, Teams.pack([invalid, ...draft.picksOf(0).slice(1).map(id => Draft.defaultSet(byId.get(id)))])), Draft.DraftError);
		draft.submitTeam(0, team(draft.picksOf(0)));
		assert.deepEqual(draft.view(1, T0).ready, { mine: false, theirs: true });
		draft.submitTeam(1, team(draft.picksOf(1)));
		assert.equal(draft.phase, 'done');
	});

	it('prend les sets par défaut quand l\'équipe envoyée est vide', () => {
		const draft = session();
		draftAll(draft);
		draft.submitTeam(0, '');
		assert.equal(draft.teams[0], draft.defaultTeam(0));
	});

	it('termine la préparation au chrono avec les sets par défaut, tous valides', () => {
		const draft = session();
		const now = draftAll(draft);
		draft.update(now + Draft.DURATIONS.prep);
		assert.equal(draft.phase, 'done');
		const validator = require('./../../../dist/sim/team-validator').TeamValidator.get(Draft.FORMAT);
		for (const side of [0, 1]) {
			assert.equal(validator.validateTeam(Teams.unpack(draft.teamFor(side))), null);
		}
	});
});

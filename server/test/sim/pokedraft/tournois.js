'use strict';

const assert = require('./../../assert');
const { makeUser, destroyUser } = require('../../users-utils');

const MINUTE = 60 * 1000;
let Tours = null;

function proposal(overrides = {}) {
	return {
		name: 'Coupe de test', format: 'gen9ou', type: 'elimination', cap: 8,
		startsAt: Date.now() + 20 * MINUTE, rules: {}, ...overrides,
	};
}

describe('[Arène] Tournois', () => {
	before(() => {
		Tours = require('./../../../dist/server/chat-plugins/arene-tournois').ArenaTournaments;
		Tours.save = () => {};
	});

	beforeEach(() => {
		Tours.store = { planned: [], results: [] };
	});

	it('refuse un tournoi sans pseudo, au mauvais format, trop tôt ou avec trop de places', () => {
		const user = makeUser('Organisateur');
		try {
			assert.equal(typeof Tours.propose(user, proposal({ name: '' })), 'string');
			assert.equal(typeof Tours.propose(user, proposal({ format: 'gen9pasunformat' })), 'string');
			assert.equal(typeof Tours.propose(user, proposal({ startsAt: Date.now() + MINUTE })), 'string');
			assert.equal(typeof Tours.propose(user, proposal({ cap: 12 })), 'string');
			assert.equal(Tours.store.planned.length, 0);
		} finally {
			destroyUser(user);
		}
	});

	it('enregistre un tournoi valide et traduit les clauses en règles du format', () => {
		const user = makeUser('Organisatrice');
		try {
			const event = Tours.propose(user, proposal({ rules: { 'Team Preview': false, 'Item Clause': true, 'Species Clause': true } }));
			assert.equal(typeof event, 'object');
			assert.equal(event.author, user.id);
			assert.deepEqual(event.rules.sort(), ['!Team Preview', 'Item Clause = 1'].sort());
			assert.equal(Tours.store.planned.length, 1);
		} finally {
			destroyUser(user);
		}
	});

	it('limite chaque joueur à trois tournois à venir', () => {
		const user = makeUser('Prolifique');
		try {
			for (let index = 0; index < 3; index++) assert.equal(typeof Tours.propose(user, proposal()), 'object');
			assert.equal(typeof Tours.propose(user, proposal()), 'string');
		} finally {
			destroyUser(user);
		}
	});

	it('planifie les tournois réguliers chaque semaine, à leur jour', () => {
		const events = Tours.regularEvents(Date.now());
		const weekly = events.filter(event => event.id.startsWith('hebdo-'));
		assert(weekly.length >= 2);
		for (const event of weekly) {
			assert.equal(new Date(event.startsAt).getDay(), 1);
			assert.equal(event.format, 'gen9ou');
		}
	});

	it('ouvre le salon et le tournoi, puis montre les inscrits dans le calendrier', () => {
		const user = makeUser('Joueur Inscrit');
		const now = Date.now();
		const event = Tours.propose(user, proposal({ startsAt: now + 16 * MINUTE }));
		Tours.open(event, now);
		const room = Rooms.get(`tournoi-${event.id}`);
		try {
			assert(room?.game, 'le tournoi est créé dans son salon');
			assert.equal(room.game.playerCap, 8);
			user.joinRoom(room.roomid);
			room.game.addUser(user, { sendReply() {}, errorReply() {} });
			const view = Tours.view(user).events.find(entry => entry.id === event.id);
			assert.equal(view.status, 'open');
			assert.equal(view.roomid, room.roomid);
			assert.deepEqual(view.players, ['Joueur Inscrit']);
			assert.equal(view.joined, true);
		} finally {
			room?.destroy();
			destroyUser(user);
		}
	});

	it('garde le vainqueur et le finaliste à la fin du tournoi', () => {
		const event = { id: 'finale-test', name: 'Finale', format: 'gen9ou' };
		Tours.recordResult(event, { generator: { getResults: () => [[{ name: 'Kaïros' }], [{ name: 'Mistral' }]] }, players: [1, 2, 3, 4] });
		assert.equal(Tours.store.results[0].winner, 'Kaïros');
		assert.equal(Tours.store.results[0].finalist, 'Mistral');
		assert.equal(Tours.store.results[0].players, 4);
	});
});

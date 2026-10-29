'use strict';

const assert = require('./../../assert');
const { makeUser, destroyUser } = require('../../users-utils');

const TEAM = 'Weavile||lifeorb||swordsdance,knockoff,iceshard,iciclecrash|Jolly|,252,,,4,252|||||';

describe('[Arène] Replays', () => {
	let Replays = null;
	let Arene = null;
	let room = null;
	let players = [];

	before(() => {
		Replays = require('./../../../dist/server/chat-plugins/replays');
		Arene = require('./../../../dist/server/chat-plugins/pokedraft').Arene;
	});

	beforeEach(async () => {
		players = [makeUser('Alice Replay'), makeUser('Bruno Replay')];
		room = Rooms.createBattle({ format: '', players: players.map(user => ({ user, team: TEAM })) });
		room.add('|c|+Alice Replay|bonne chance');
		room.add('|j|Spectateur');
		assert(room.battle.forfeit(players[0]));
		for (let wait = 0; wait < 200 && !room.battle.ended; wait++) await new Promise(resolve => setTimeout(resolve, 10));
		assert(room.battle.ended, 'le combat se termine sur abandon');
	});

	afterEach(() => {
		for (const user of players) destroyUser(user);
		room?.destroy();
	});

	it('garde le journal public du combat, sans chat ni arrivées', () => {
		const payload = Replays.replayPayload(room.battle);
		assert.equal(payload.id, room.roomid.slice(7));
		assert.equal(payload.winner, 'Bruno Replay');
		assert.deepEqual(payload.players.map(player => [player.slot, player.name, player.showdown_id]), [
			['p1', 'Alice Replay', 'alicereplay'], ['p2', 'Bruno Replay', 'brunoreplay'],
		]);
		const lines = payload.log.split('\n');
		assert(lines.some(line => line.startsWith('|player|p1|Alice Replay|')), 'les joueurs sont dans le journal');
		assert(lines.includes('|win|Bruno Replay'));
		assert(!lines.some(line => /^\|(c|j|split|request)\|/.test(line)), 'ni chat, ni arrivées, ni lignes secrètes');
		assert(lines.some(line => /^\|switch\|p1a: Weavile\|[^|]+\|\d+\/100$/.test(line)), 'les PV sont en %, comme pour un spectateur');
	});

	it("n'envoie rien pour un combat privé", () => {
		room.settings.isPrivate = true;
		assert.equal(Replays.replayPayload(room.battle), null);
	});

	it("envoie le replay à l'API quand elle est configurée", () => {
		const calls = [];
		const request = Arene.request;
		const env = { url: process.env.ARENE_API_URL, secret: process.env.ARENE_API_SECRET };
		Arene.request = (method, path, body) => {
			calls.push({ method, path, body });
			return Promise.resolve({});
		};
		process.env.ARENE_API_URL = 'http://api.test/api';
		process.env.ARENE_API_SECRET = 'secret';
		try {
			Replays.handlers.onBattleEnd(room.battle, toID('Bruno Replay'), []);
		} finally {
			Arene.request = request;
			if (env.url === undefined) delete process.env.ARENE_API_URL; else process.env.ARENE_API_URL = env.url;
			if (env.secret === undefined) delete process.env.ARENE_API_SECRET; else process.env.ARENE_API_SECRET = env.secret;
		}
		assert.equal(calls.length, 1);
		assert.deepEqual([calls[0].method, calls[0].path, calls[0].body.id], ['POST', '/replays', room.roomid.slice(7)]);
	});
});

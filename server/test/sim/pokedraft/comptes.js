'use strict';

const assert = require('./../../assert');
const { makeUser, destroyUser } = require('../../users-utils');

describe('[Arène] Pseudos des comptes', () => {
	let Comptes = null;
	let Arene = null;
	let Drafts = null;
	let request = null;
	const env = {};
	const users = [];

	before(() => {
		Comptes = require('./../../../dist/server/chat-plugins/comptes');
		({ Arene, Drafts } = require('./../../../dist/server/chat-plugins/pokedraft'));
		request = Arene.request;
		env.url = process.env.ARENE_API_URL;
		env.secret = process.env.ARENE_API_SECRET;
		process.env.ARENE_API_URL = 'http://api.test/api';
		process.env.ARENE_API_SECRET = 'secret';
	});

	after(() => {
		Arene.request = request;
		if (env.url === undefined) delete process.env.ARENE_API_URL; else process.env.ARENE_API_URL = env.url;
		if (env.secret === undefined) delete process.env.ARENE_API_SECRET; else process.env.ARENE_API_SECRET = env.secret;
	});

	beforeEach(() => {
		Comptes.Accounts.names = new Set(['mistral']);
		Arene.request = (method, path) => Promise.resolve(path === '/showdown-sessions' ? { name: 'Mistral', showdown_id: 'mistral' } : {});
	});

	afterEach(() => {
		for (const user of users.splice(0)) destroyUser(user);
	});

	/** Un joueur connecté sans compte, comme après un /trn : son pseudo n'est pas enregistré. */
	const guest = name => {
		const user = makeUser();
		user.forceRename(name, false);
		users.push(user);
		return user;
	};

	it("personne ne prend le pseudo d'un compte par /trn, les pseudos libres restent ouverts", () => {
		const user = guest('Promeneur');
		assert.equal(Comptes.namefilter('Mistral', user), '');
		assert.equal(Comptes.namefilter('MISTRAL', user), '', 'la casse ne change rien');
		assert.equal(Comptes.namefilter('Brume', user), 'Brume');
	});

	it('le jeton du compte connecte sous son pseudo, comme un compte enregistré, prêt pour le classé', async () => {
		const user = guest('Promeneur');
		await Comptes.Accounts.login(user, 'jeton');
		assert.equal(user.id, 'mistral');
		assert(user.registered);
		assert.equal(Drafts.verified.get('mistral'), 'Mistral');
		assert.equal(Comptes.namefilter('Mistral', user), 'Mistral', 'il peut reprendre son propre pseudo');
	});

	it("un invité qui occupait le pseudo repasse en invité quand le propriétaire se connecte", async () => {
		const intrus = guest('Mistral');
		const owner = guest('Promeneur');
		await Comptes.Accounts.login(owner, 'jeton');
		assert.equal(owner.id, 'mistral');
		assert.notEqual(intrus.id, 'mistral');
	});

	it('un compte au nom d\'un bot du serveur ne prend pas ce pseudo', async () => {
		Arene.request = () => Promise.resolve({ name: 'Bot Niveau 1', showdown_id: 'botniveau1' });
		const user = guest('Promeneur');
		await assert.rejects(Comptes.Accounts.login(user, 'jeton'), /réservé aux bots/);
		assert.equal(user.id, 'promeneur');
	});
});

'use strict';

const assert = require('./../../assert');
const roster = require('./../../../../data/rosters/roster-saison-1.json');
const objets = require('./../../../../data/references/objets.json');
const natures = require('./../../../../data/references/natures.json');
const interdites = require('./../../../../data/references/attaques-interdites.json');

const FORMAT = 'gen9pokedraft';

function set(pokemon, changes = {}) {
	const defaut = pokemon.setParDefaut;
	return {
		species: pokemon.id,
		item: defaut.objetId,
		ability: pokemon.talent.id,
		moves: defaut.attaquesIds.filter(id => !defaut.horsMovepool.includes(id)),
		nature: defaut.natureId,
		evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
		...changes,
	};
}

function erreurs(sets) {
	const { Dex } = require('./../../../dist/sim/dex');
	const { TeamValidator } = require('./../../../dist/sim/team-validator');
	Dex.formats.validate(FORMAT);
	const validator = TeamValidator.get(FORMAT);
	return sets.flatMap(([label, pokemonSet]) => (validator.validateTeam([pokemonSet]) || []).map(erreur => `${label} : ${erreur}`));
}

describe('[PokéDraft] Atelier', () => {
	it('accepte le set par défaut de chaque fiche', () => {
		assert.deepEqual(erreurs(roster.pokemon.map(pokemon => [pokemon.nom, set(pokemon)])), []);
	});

	it('accepte chaque objet proposé', () => {
		const porteur = roster.pokemon[0];
		assert.deepEqual(erreurs(objets.map(objet => [objet.nom, set(porteur, { item: objet.id })])), []);
	});

	it('accepte chaque nature proposée', () => {
		const porteur = roster.pokemon[0];
		assert.deepEqual(erreurs(natures.map(nature => [nature.nom, set(porteur, { nature: nature.id })])), []);
	});

	it('refuse exactement les attaques du movepool listées comme interdites', () => {
		const refusees = new Set(erreurs(roster.pokemon.flatMap(pokemon => pokemon.movepool.map(id => [`${pokemon.id}/${id}`, set(pokemon, { moves: [id] })])))
			.map(erreur => erreur.split(' : ')[0]));
		const listees = new Set(Object.entries(interdites).flatMap(([pokemon, moves]) => Object.keys(moves).map(id => `${pokemon}/${id}`)));
		assert.deepEqual([...refusees].sort(), [...listees].sort());
	});

	it('accepte 510 EV et des IV à 0 sur chaque stat', () => {
		const sets = roster.pokemon.map(pokemon => [pokemon.nom, set(pokemon, {
			evs: { hp: 252, atk: 0, def: 4, spa: 252, spd: 0, spe: 0 },
			ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
		})]);
		assert.deepEqual(erreurs(sets), []);
	});
});

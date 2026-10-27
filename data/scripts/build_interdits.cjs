'use strict';

const fs = require('fs');
const path = require('path');

const [serverDir, rosterPath, outPath] = process.argv.slice(2);
const FORMAT = 'gen9pokedraft';
const RAISONS = [
	[/Evasion Moves Clause/, "Interdite par la clause d'esquive du format."],
	[/OHKO Clause/, 'Interdite par la clause K.O. en un coup du format.'],
	[/can't be transferred/, 'Impossible à obtenir légalement pour ce Pokémon.'],
	[/is banned\.$/, 'Interdite dans le format.'],
];

const { Dex } = require(path.resolve(serverDir, 'dist/sim/dex'));
const { TeamValidator } = require(path.resolve(serverDir, 'dist/sim/team-validator'));
Dex.formats.validate(FORMAT);
const validator = TeamValidator.get(FORMAT);
const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));

const interdites = {};
let total = 0;
for (const pokemon of roster.pokemon) {
	for (const move of pokemon.movepool) {
		const problems = validator.validateTeam([{
			species: pokemon.id,
			item: pokemon.setParDefaut.objetId,
			ability: pokemon.talent.id,
			moves: [move],
			nature: pokemon.setParDefaut.natureId,
			evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
		}]);
		if (!problems) continue;
		const raison = RAISONS.find(([pattern]) => problems.some(problem => pattern.test(problem)));
		if (!raison) throw new Error(`${pokemon.id} / ${move} : raison inconnue (${problems.join(' ; ')})`);
		(interdites[pokemon.id] ??= {})[move] = raison[1];
		total++;
	}
}

fs.writeFileSync(outPath, `${JSON.stringify(interdites, null, 2)}\n`);
console.log(`${total} attaques interdites sur ${Object.keys(interdites).length} Pokémon`);

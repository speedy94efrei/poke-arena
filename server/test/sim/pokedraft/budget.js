'use strict';

const assert = require('./../../assert');

let TeamValidator = null;
let Budget = null;

function set(species, ability, move) {
	return {
		species, ability, moves: [move], item: '', nature: 'Jolly', level: 100,
		evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
		ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
	};
}

describe('[Arène] Combat à budget', () => {
	before(() => {
		TeamValidator = require('./../../../dist/sim/team-validator').TeamValidator;
		Budget = require('./../../../dist/config/budget');
	});

	it('donne à chaque Pokémon le coût de son tier, et 3 points sous le ZU', () => {
		const dex = Dex.forFormat('gen9combatbudget');
		assert.equal(Budget.budgetCost(dex.species.get('Great Tusk')), 30);
		assert.equal(Budget.budgetCost(dex.species.get('Pelipper')), 26);
		assert.equal(Budget.budgetCost(dex.species.get('Arbok')), 5);
		assert.equal(Budget.budgetCost(dex.species.get('Charmander')), 3);
		assert.equal(Budget.budgetCost(dex.species.get('Koraidon')), null);
	});

	it('accepte une équipe dans le budget, même de moins de 6 Pokémon', () => {
		const validator = TeamValidator.get('gen9combatbudget');
		const team = [
			set('Great Tusk', 'Protosynthesis', 'Earthquake'),
			set('Gholdengo', 'Good as Gold', 'Make It Rain'),
			set('Kingambit', 'Supreme Overlord', 'Kowtow Cleave'),
		];
		assert.equal(validator.validateTeam(team), null);
	});

	it('refuse une équipe qui dépasse les 100 points, avec le détail des coûts', () => {
		const validator = TeamValidator.get('gen9combatbudget');
		const problems = validator.validateTeam([
			set('Great Tusk', 'Protosynthesis', 'Earthquake'),
			set('Gholdengo', 'Good as Gold', 'Make It Rain'),
			set('Kingambit', 'Supreme Overlord', 'Kowtow Cleave'),
			set('Corviknight', 'Pressure', 'Brave Bird'),
		]);
		assert(problems && problems.some(problem => problem.includes('120 points')));
	});

	it('refuse les Ubers comme en OU', () => {
		const validator = TeamValidator.get('gen9combatbudget');
		const problems = validator.validateTeam([set('Koraidon', 'Orichalcum Pulse', 'Collision Course')]);
		assert(problems && problems.length === 1);
	});
});

/**
 * Combat à budget : `/budget` envoie au site le barème (coût de départ de chaque tier) et le coût de chaque Pokémon
 * autorisé ce mois-ci, pour le compteur de points du constructeur d'équipe. La validation reste celle du format.
 */

import { BASE_COSTS, BUDGET, UNRANKED_COST, baseCost, budgetCost, budgetMonth } from '../../config/budget';

export const BUDGET_FORMAT = 'gen9combatbudget';

/** Pokémon autorisés : `[id, tier, coût de départ, coût du mois]`. */
function costList() {
	const dex = Dex.forFormat(BUDGET_FORMAT);
	const pokemon: [string, string, number, number][] = [];
	for (const species of dex.species.all()) {
		if (species.num <= 0 || species.battleOnly || species.isNonstandard) continue;
		const base = baseCost(species);
		const cost = budgetCost(species);
		if (base === null || cost === null) continue;
		pokemon.push([species.id, species.tier, base, cost]);
	}
	return { type: 'costs', format: BUDGET_FORMAT, budget: BUDGET, month: budgetMonth(), tiers: BASE_COSTS, unranked: UNRANKED_COST, pokemon };
}

export const commands: Chat.ChatCommands = {
	budget(target, room, user) {
		user.send(`|budget|${JSON.stringify(costList())}`);
	},
};

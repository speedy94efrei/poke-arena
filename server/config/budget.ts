// Combat à budget : chaque Pokémon coûte des points selon son tier Smogon, et l'équipe ne doit pas dépasser le budget.

import * as fs from 'fs';
import * as path from 'path';

export const BUDGET = 100;

/** Coût de départ par tier Smogon Gen 9 ; `null` : interdit. Les tiers BL coûtent entre les deux. */
export const BASE_COSTS: Record<string, number | null> = {
	OU: 30, UUBL: 26, UU: 22, RUBL: 19, RU: 16, NUBL: 14, NU: 12, PUBL: 10, PU: 8, ZUBL: 6, ZU: 5,
	Uber: null, AG: null, Illegal: null, Unreleased: null, CAP: null, 'CAP NFE': null, 'CAP LC': null,
};
/** Les Pokémon sous le ZU (pas encore évolués). */
export const UNRANKED_COST = 3;
/** Garde-fous des ajustements mensuels : pas plus de 8 points d'écart avec le coût de départ, jamais sous 2. */
export const MAX_DRIFT = 8;
export const MIN_COST = 2;

export interface BudgetCosts {
	/** Mois des ajustements (« 2026-11 »), ou vide tant qu'aucun n'est publié. */
	month: string;
	/** Coût ajusté par Pokémon, publié le 1er du mois par `tools/update-budget-costs`. */
	costs: Record<string, number>;
}

const COSTS_FILE = path.resolve(__dirname, '../../config/budget-costs.json');
let adjusted: BudgetCosts = { month: '', costs: {} };

export function reloadBudgetCosts() {
	try {
		adjusted = JSON.parse(fs.readFileSync(COSTS_FILE, 'utf8'));
	} catch {
		adjusted = { month: '', costs: {} };
	}
	return adjusted;
}
reloadBudgetCosts();

export function budgetMonth() {
	return adjusted.month;
}

export function baseCost(species: { tier: string }): number | null {
	const tier = species.tier.replace(/[()]/g, '');
	return tier in BASE_COSTS ? BASE_COSTS[tier] : UNRANKED_COST;
}

/** Coût d'un Pokémon ce mois-ci : l'ajustement publié s'il y en a un, sinon le coût de départ ; `null` s'il est interdit. */
export function budgetCost(species: { id: string, tier: string }): number | null {
	const base = baseCost(species);
	if (base === null) return null;
	return adjusted.costs[species.id] ?? base;
}

/** Erreur de validation d'une équipe qui dépasse le budget (les Pokémon interdits sont refusés par la banlist du format). */
export function budgetProblems(team: { species: string }[], dex: { species: { get(name: string): { id: string, name: string, tier: string } } }, budget = BUDGET) {
	const details: string[] = [];
	let total = 0;
	for (const set of team) {
		const species = dex.species.get(set.species);
		const cost = budgetCost(species);
		if (cost === null) continue;
		total += cost;
		details.push(`${species.name} (${cost})`);
	}
	if (total > budget) return [`Ton équipe coûte ${total} points pour un budget de ${budget} : ${details.join(', ')}.`];
}

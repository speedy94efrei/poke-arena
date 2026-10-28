// Formats d'Arène. Showdown fusionne cette liste avec config/formats.ts, qui reste celui de l'upstream.

import { BUDGET, budgetProblems } from './budget';

export const Formats: import('../sim/dex-formats').FormatList = [
	{
		section: "PokéDraft",
	},
	{
		name: "[Gen 9] PokeDraft",
		desc: `Fiches PokéDraft de la saison en cours, base National Dex.`,
		mod: 'pokedraft',
		ruleset: ['Standard NatDex', 'Terastal Clause', 'PokeDraft Mod'],
		banlist: [
			'Arena Trap', 'Moody', 'Power Construct', 'Shadow Tag', 'King\'s Rock',
			'Quick Claw', 'Razor Fang', 'Assist', 'Baton Pass', 'Last Respects', 'Shed Tail',
		],
	},
	{
		section: "Modes à part",
	},
	{
		name: "[Gen 9] Combat à Budget",
		desc: `${BUDGET} points pour toute l'équipe : chaque Pokémon coûte selon son tier Smogon. Ubers et AG interdits, règles de l'OU.`,
		mod: 'gen9',
		ruleset: ['Standard', 'Evasion Abilities Clause', 'Sleep Moves Clause', '!Sleep Clause Mod'],
		banlist: ['Uber', 'AG', 'Arena Trap', 'Moody', 'Shadow Tag', 'King\'s Rock', 'Razor Fang', 'Baton Pass', 'Last Respects', 'Shed Tail', 'Tera Blast'],
		onValidateTeam(team) {
			return budgetProblems(team, this.dex);
		},
	},
];

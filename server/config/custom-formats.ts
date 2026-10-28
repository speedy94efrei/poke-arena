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
	{
		name: "[Gen 9] PokeDraft Roguelike",
		desc: `Roguelike à étages : fiches PokéDraft au niveau 50. Les combats sont lancés par le serveur contre l'IA.`,
		mod: 'pokedraft',
		ruleset: ['Standard NatDex', 'Terastal Clause', 'PokeDraft Mod', 'Adjust Level = 50'],
		searchShow: false,
		challengeShow: false,
		tournamentShow: false,
		rated: false,
	},
	{
		name: "[Gen 9] PokeDraft Roguelike Duo",
		desc: `Roguelike à étages en coop : deux joueurs contre deux IA, chacun avec 3 Pokémon au plus.`,
		mod: 'pokedraft',
		gameType: 'multi',
		ruleset: ['Standard NatDex', 'Terastal Clause', 'PokeDraft Mod', 'Adjust Level = 50', 'Max Team Size = 3'],
		searchShow: false,
		challengeShow: false,
		tournamentShow: false,
		rated: false,
	},
];

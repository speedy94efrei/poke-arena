// Formats d'Arène. Showdown fusionne cette liste avec config/formats.ts, qui reste celui de l'upstream.

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
];

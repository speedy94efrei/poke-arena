// Talents qui protègent toute l'équipe, même depuis le banc : leur effet vit dans une condition de camp.
// Elle est posée à la première entrée en jeu, quand tous les Pokémon de départ sont sur le terrain.
const TALENTS_D_EQUIPE = ['sagedelaforet', 'majordome'];

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	pokedraftmod: {
		effectType: 'Rule',
		name: 'PokeDraft Mod',
		desc: "Règles propres au mod PokéDraft : talents d'équipe actifs depuis le banc.",
		onSwitchIn() {
			for (const side of this.sides) {
				for (const talent of TALENTS_D_EQUIPE) {
					if (side.sideConditions[talent]) continue;
					const porteur = side.pokemon.find(pokemon => pokemon.baseAbility === talent);
					if (porteur) side.addSideCondition(talent, porteur);
				}
			}
		},
	},
};

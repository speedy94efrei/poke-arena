import { applyKeptHp } from '../pokedraft/rulesets';

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	routesac: {
		effectType: 'Rule',
		name: 'Route Sac',
		desc: "Sac de chaque camp pour ce combat : « potion.2+revive.1/hyperpotion.2+revive.1 » (le joueur, puis le Champion). " +
			"Au plus 2 potions et 1 Rappel utilisés par combat.",
		hasValue: true,
		onValidateRule(value) {
			if (!/^[a-z0-9.+/]*$/.test(value)) throw new Error(`Route Sac : valeur invalide « ${value} ».`);
		},
		onBegin() {
			const value = this.ruleTable.valueRules.get('routesac') ?? '';
			value.split('/').forEach((entry, index) => {
				const side = this.sides[index];
				if (!side) return;
				side.bag = {};
				for (const part of entry.split('+')) {
					const [item, count] = part.split('.');
					if (item && Number(count) > 0) side.bag[item] = Number(count);
				}
			});
		},
	},
	routepv: {
		effectType: 'Rule',
		name: 'Route PV',
		desc: "PV (en %) et statut de départ des Pokémon du joueur pendant la Ligue, gardés du combat précédent : « 64brn.100.38par ».",
		hasValue: true,
		onValidateRule(value) {
			if (!/^[0-9a-z.]+$/.test(value)) throw new Error(`Route PV : valeur invalide « ${value} ».`);
		},
		onBegin() {
			applyKeptHp(this, this.ruleTable.valueRules.get('routepv') ?? '');
		},
	},
};

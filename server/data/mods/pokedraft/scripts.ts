import { AjoutsMovepool } from './movepool';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		for (const [speciesid, moveids] of Object.entries(AjoutsMovepool)) {
			const learnset = this.modData('Learnsets', speciesid).learnset;
			for (const moveid of moveids) learnset[moveid] ??= ['9L1'];
		}
	},
};

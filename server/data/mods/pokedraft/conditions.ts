// Danse du Carnaval : Palmaval utilise ses attaques de danse malgré le sommeil, la paralysie ou la confusion.

function danseLibre(pokemon: Pokemon, move?: ActiveMove) {
	return !!move?.flags['dance'] && pokemon.hasAbility('danseducarnaval');
}

export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	par: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			if (danseLibre(pokemon, move)) return;
			if (this.randomChance(1, 4)) {
				this.add('cant', pokemon, 'par');
				return false;
			}
		},
	},
	slp: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			if (pokemon.hasAbility('earlybird')) pokemon.statusState.time--;
			pokemon.statusState.time--;
			if (pokemon.statusState.time <= 0) {
				pokemon.cureStatus();
				return;
			}
			if (danseLibre(pokemon, move)) return;
			this.add('cant', pokemon, 'slp');
			if (move.sleepUsable) return;
			return false;
		},
	},
	confusion: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			pokemon.volatiles['confusion'].time--;
			if (!pokemon.volatiles['confusion'].time) {
				pokemon.removeVolatile('confusion');
				return;
			}
			if (danseLibre(pokemon, move)) return;
			this.add('-activate', pokemon, 'confusion');
			if (!this.randomChance(33, 100)) return;
			this.activeTarget = pokemon;
			const damage = this.actions.getConfusionDamage(pokemon, 40);
			if (typeof damage !== 'number') throw new Error("Confusion damage not dealt");
			const activeMove = { id: this.toID('confused'), effectType: 'Move', type: '???' };
			this.damage(damage, pokemon, pokemon, activeMove as ActiveMove);
			return false;
		},
	},
};

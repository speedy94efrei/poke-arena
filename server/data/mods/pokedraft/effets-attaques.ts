type EffetAttaque = Partial<import('../../../sim/dex-moves').MoveData>;

const PIEGES = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb'];
const PLUIE = ['raindance', 'primordialsea'];

function poserPiege(condition: string): EffetAttaque {
	return {
		onAfterHit(target, source, move) {
			if (move.hasSheerForce) return;
			for (const side of source.side.foeSidesWithConditions()) side.addSideCondition(condition, source);
		},
		onAfterSubDamage(damage, target, source, move) {
			if (move.hasSheerForce || !source.hp) return;
			for (const side of source.side.foeSidesWithConditions()) side.addSideCondition(condition, source);
		},
		secondary: {},
	};
}

function retirerPieges(this: Battle, pokemon: Pokemon, move: ActiveMove) {
	if (move.hasSheerForce || !pokemon.hp) return;
	for (const condition of PIEGES) {
		if (pokemon.side.removeSideCondition(condition)) {
			this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, `[from] move: ${move.name}`, `[of] ${pokemon}`);
		}
	}
}

const NETTOYEUR: EffetAttaque = {
	onAfterHit(target, pokemon, move) {
		retirerPieges.call(this, pokemon, move);
	},
	onAfterSubDamage(damage, target, pokemon, move) {
		retirerPieges.call(this, pokemon, move);
	},
};

const BAISSE_VITESSE: EffetAttaque = { secondary: { chance: 100, boosts: { spe: -1 } } };

export const EffetsAttaques: { [id: string]: EffetAttaque } = {
	glissebanquise: { selfSwitch: true },
	envoleclair: { selfSwitch: true },
	rubanretour: { selfSwitch: true },
	overdrive: { selfSwitch: true },
	phareabyssal: {
		selfSwitch: true,
		onAfterMoveSecondarySelf(pokemon) {
			this.heal(pokemon.baseMaxhp / 8, pokemon, pokemon);
		},
	},

	eboulissismique: poserPiege('stealthrock'),
	coupdecarapace: poserPiege('spikes'),
	crachatdegravier: poserPiege('spikes'),
	barbbarrage: {
		onAfterHit(target, source, move) {
			if (move.hasSheerForce) return;
			for (const side of source.side.foeSidesWithConditions()) side.addSideCondition('toxicspikes', source);
		},
	},
	brasierpurifiant: NETTOYEUR,
	ventilofeuilles: NETTOYEUR,
	souffledutombeau: NETTOYEUR,

	souffledesenfers: { secondary: { chance: 30, status: 'brn' } },
	gazardent: { secondary: { chance: 30, status: 'brn' } },
	blizzardsacre: { secondary: { chance: 10, status: 'frz' } },
	croctyrannique: {
		flags: { protect: 1, mirror: 1, metronome: 1, contact: 1, bite: 1 },
		secondary: { chance: 20, volatileStatus: 'flinch' },
	},
	griffeglacee: { secondary: { chance: 30, boosts: { spe: -1 } } },
	bourrasqueboreale: { ...BAISSE_VITESSE, target: 'allAdjacentFoes' },
	linceuldefeuilles: BAISSE_VITESSE,
	ruadedeboue: BAISSE_VITESSE,
	cornecatapulte: {
		secondary: {
			chance: 30,
			onHit(target, source, move) {
				if (!target.hp || !source.hp || !this.canSwitch(target.side)) return;
				if (this.runEvent('DragOut', target, source, move)) target.forceSwitchFlag = true;
			},
		},
	},
	chargeblindee: { overrideOffensiveStat: 'def' },
	chocprimitif: { ignoreAbility: true },
	chantdesdunes: { ignoreImmunity: { 'Ground': true } },

	ailesdecoton: {
		onAfterMoveSecondarySelf(pokemon) {
			this.heal(pokemon.baseMaxhp / 4, pokemon, pokemon);
		},
	},
	eclairpercant: {
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (!target || target.fainted || target.hp <= 0) this.boost({ atk: 1, spe: 1 }, pokemon, pokemon, move);
		},
	},
	ripostekaiju: {
		basePowerCallback(pokemon, target, move) {
			return pokemon.attackedBy.some(attack => attack.damage > 0 && attack.thisTurn) ? move.basePower * 2 : move.basePower;
		},
	},
	paumedaura: {
		onModifyPriority(priority, source) {
			const target = source.adjacentFoes()[0];
			if (target && target.hp * 2 < target.maxhp) return priority + 1;
		},
	},
	coupdepoireau: {
		onModifyMove(move, source, target) {
			if (target && Object.values(target.boosts).some(boost => boost > 0)) move.willCrit = true;
		},
	},
	aquastep: {
		basePowerCallback(pokemon, target, move) {
			return PLUIE.includes(pokemon.effectiveWeather()) ? 90 : move.basePower;
		},
	},
	etreintevenimeuse: {
		secondary: { chance: 100, status: 'psn', volatileStatus: 'etreintevenimeuse' },
		condition: {
			duration: 3,
			onStart(target) {
				this.add('-start', target, 'move: Étreinte Venimeuse');
			},
			onTrapPokemon(pokemon) {
				pokemon.tryTrap();
			},
			onEnd(target) {
				this.add('-end', target, 'move: Étreinte Venimeuse');
			},
		},
	},

	pleingaz: {
		heal: [33, 100],
		boosts: { spe: 1 },
		flags: { snatch: 1, heal: 1, metronome: 1 },
	},
	rechargeelectrique: {
		boosts: { spa: 1, spe: 1 },
		target: 'adjacentAllyOrSelf',
		flags: { snatch: 1, metronome: 1 },
	},
	etincellepartagee: {
		onHit(pokemon) {
			const factor = this.field.isTerrain('electricterrain') && pokemon.hasAbility('joueselectriques') ? 0.33 : 0.25;
			if (!this.heal(pokemon.baseMaxhp * factor, pokemon, pokemon)) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
		},
		flags: { snatch: 1, heal: 1, metronome: 1 },
	},
	linceuldegivre: {
		target: 'normal',
		flags: { protect: 1, reflectable: 1, mirror: 1, metronome: 1 },
		onHit(target, source) {
			target.side.addSideCondition('spikes', source);
			this.boost({ spe: -1 }, target, source);
		},
	},
	transe: {
		flags: { heal: 1, metronome: 1 },
		onHit(pokemon) {
			if (!this.field.getPseudoWeather('trickroom') && this.field.addPseudoWeather('trickroom', pokemon)) {
				this.field.pseudoWeather['trickroom'].duration = 3;
			}
			this.heal(pokemon.baseMaxhp / 4, pokemon, pokemon);
		},
	},
	boldelait: {
		flags: { snatch: 1, heal: 1, metronome: 1 },
		onHit(pokemon) {
			const healed = !!this.heal(pokemon.baseMaxhp / 2, pokemon, pokemon);
			let cured = false;
			if (!pokemon.m.bolDeLait) {
				pokemon.m.bolDeLait = true;
				for (const ally of pokemon.side.pokemon) {
					if (ally.cureStatus()) cured = true;
				}
			}
			if (!healed && !cured) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
		},
	},
	revepartage: {
		flags: { snatch: 1, heal: 1, metronome: 1 },
		onTry(source) {
			if (source.status === 'slp' || source.hasAbility('comatose')) return false;
			if (source.hp === source.maxhp) {
				this.add('-fail', source, 'heal');
				return null;
			}
			if (source.hasAbility(['insomnia', 'vitalspirit'])) {
				this.add('-fail', source, `[from] ability: ${source.getAbility().name}`, `[of] ${source}`);
				return null;
			}
		},
		onHit(target, source, move) {
			const result = target.setStatus('slp', source, move);
			if (!result) return result;
			target.statusState.time = 3;
			target.statusState.startTime = 3;
			this.heal(target.maxhp);
			for (const ally of target.adjacentAllies()) this.heal(ally.baseMaxhp / 4, ally, target);
		},
	},
	shoreup: {
		onHit(pokemon) {
			const factor = this.field.isWeather('sandstorm') ? 0.667 : 0.5;
			const healed = !!this.heal(this.modify(pokemon.maxhp, factor));
			const cured = pokemon.cureStatus();
			if (!healed && !cured) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
		},
	},
	spicyextract: { boosts: { atk: 1, def: -2 } },

	marquedupredateur: {
		basePowerCallback(pokemon, target, move) {
			return pokemon.m.marquePosee ? 70 : move.basePower;
		},
		onModifyPriority(priority, source) {
			if (source.m.marquePosee) return priority + 1;
		},
		onHit(target, source) {
			if (source.m.marquePosee) return;
			source.m.marquePosee = true;
			target.addVolatile('marquedupredateur', source);
		},
		condition: {
			onStart(target) {
				this.add('-start', target, 'move: Marque du Prédateur');
			},
			onTrapPokemon(pokemon) {
				if (!this.effectState.source?.isActive) {
					pokemon.removeVolatile('marquedupredateur');
					return;
				}
				pokemon.tryTrap();
			},
			onResidualOrder: 28,
			onResidual(pokemon) {
				if (!this.effectState.source?.isActive) pokemon.removeVolatile('marquedupredateur');
			},
			onEnd(pokemon) {
				this.add('-end', pokemon, 'move: Marque du Prédateur');
			},
		},
	},
	auservice: {
		selfSwitch: true,
		flags: { metronome: 1 },
		onHit(pokemon) {
			pokemon.side.addSlotCondition(pokemon, 'auservice', pokemon);
		},
		condition: {
			duration: 2,
			onModifyPriority(priority, pokemon, target, move) {
				if (move.category !== 'Status' && this.effectState.duration === 1) return priority + 1;
			},
			onBeforeMove(pokemon, target, move) {
				if (move.category !== 'Status') pokemon.side.removeSlotCondition(pokemon, 'auservice');
			},
		},
	},
	trickortreat: {
		onHit(target, source) {
			if (target.hasType('Ghost') || !target.addType('Ghost')) return false;
			this.add('-start', target, 'typeadd', 'Ghost', '[from] move: Trick-or-Treat');
			target.addVolatile('trickortreat', source);
		},
		condition: {
			onResidualOrder: 8,
			onResidual(pokemon) {
				if (pokemon.addedType !== 'Ghost') {
					pokemon.removeVolatile('trickortreat');
					return;
				}
				const source = this.effectState.source as Pokemon | undefined;
				const damage = this.damage(pokemon.baseMaxhp / 16, pokemon, source);
				if (damage && source?.isActive && source.hp) this.heal(damage, source, pokemon);
			},
		},
	},
	instruct: {
		target: 'allySide',
		sideCondition: 'instruct',
		flags: { snatch: 1, metronome: 1 },
		onHit() {},
		condition: {
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Sommation');
			},
			onSwitchIn(pokemon) {
				this.boost({ spd: 1 }, pokemon, pokemon);
				pokemon.side.removeSideCondition('instruct');
			},
			onSideEnd(side) {
				this.add('-sideend', side, 'move: Sommation');
			},
		},
	},
	gigatonhammer: {
		flags: { protect: 1, mirror: 1 },
		onDisableMove(pokemon) {
			if (pokemon.lastMove?.id !== 'gigatonhammer') return;
			if (!pokemon.adjacentFoes().some(foe => foe.hasType('Steel'))) pokemon.disableMove('gigatonhammer');
		},
		onEffectiveness(typeMod, target, type) {
			if (type === 'Steel') return 0;
		},
	},

	murfossile: {
		target: 'allySide',
		sideCondition: 'murfossile',
		selfSwitch: true,
		flags: { snatch: 1, metronome: 1 },
		condition: {
			duration: 4,
			onAnyModifyDamage(damage, source, target, move) {
				if (target === source || !this.effectState.target.hasAlly(target) || this.getCategory(move) !== 'Physical') return;
				if (!target.getMoveHitData(move).crit && !move.infiltrates) return this.chainModify([2732, 4096]);
			},
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Mur Fossile');
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 3,
			onSideEnd(side) {
				this.add('-sideend', side, 'move: Mur Fossile');
			},
		},
	},
	nuageparfume: {
		target: 'allySide',
		sideCondition: 'nuageparfume',
		flags: { snatch: 1, metronome: 1 },
		condition: {
			duration: 3,
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Nuage Parfumé');
			},
			onResidualOrder: 5,
			onResidualSubOrder: 2,
			onResidual(pokemon) {
				if (pokemon.hp < pokemon.maxhp) this.heal(pokemon.baseMaxhp * 0.15, pokemon);
			},
			onTryBoost(boost, target, source, effect) {
				if (!source || target === source) return;
				if (effect.effectType === 'Move' && (effect as ActiveMove).infiltrates && !target.isAlly(source)) return;
				let blocked = false;
				let stat: BoostID;
				for (stat in boost) {
					if (boost[stat]! < 0) {
						delete boost[stat];
						blocked = true;
					}
				}
				if (blocked && !(effect as ActiveMove).secondaries) this.add('-activate', target, 'move: Nuage Parfumé');
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 4,
			onSideEnd(side) {
				this.add('-sideend', side, 'move: Nuage Parfumé');
			},
		},
	},
};

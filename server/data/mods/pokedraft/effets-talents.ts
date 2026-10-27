type EffetTalent = Partial<import('../../../sim/dex-abilities').AbilityData>;

const PLUIE = ['raindance', 'primordialsea'];
const SOLEIL = ['sunnyday', 'desolateland'];

function annoncer(battle: Battle, pokemon: Pokemon) {
	battle.add('-ability', pokemon, pokemon.getAbility().name);
}

function estAttaqueDeBoost(move: Move) {
	if (move.category !== 'Status') return false;
	const boosts = move.target === 'self' || move.target === 'adjacentAllyOrSelf' ? move.boosts : move.self?.boosts;
	return Object.values(boosts ?? {}).some(stage => stage > 0);
}

/** Dernier tour où l'effet compte : celui de la prochaine décision, plus `tours - 1`. */
function jusquAuTour(battle: Battle, tours: number) {
	return battle.turn + tours;
}

function equipeProtegee(side: Side, talent: string) {
	return side.pokemon.some(pokemon => pokemon.baseAbility === talent && !pokemon.fainted);
}

function passeSousLaMoitie(target: Pokemon, move: ActiveMove) {
	const last = target.getLastAttackedBy();
	if (!last || !move.totalDamage) return false;
	const damage = move.multihit && !move.smartTarget ? move.totalDamage : last.damage;
	return target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2;
}

export const EffetsTalents: { [id: string]: EffetTalent } = {
	couchepolaire: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.category === 'Physical' && target.hp > target.maxhp / 2) return this.chainModify(0.75);
		},
		flags: { breakable: 1 },
	},
	rocmillenaire: {
		onStart() {
			this.effectState.defenseGagnee = 0;
		},
		onDamagePriority: -30,
		onDamage(damage, target, source, effect) {
			if (target.hp === target.maxhp && damage >= target.hp && effect?.effectType === 'Move') {
				annoncer(this, target);
				return target.hp - 1;
			}
		},
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			const gained = this.effectState.defenseGagnee ?? 0;
			if (!pokemon.activeTurns || gained >= 2) return;
			this.effectState.defenseGagnee = gained + 1;
			this.boost({ def: 1 }, pokemon, pokemon);
		},
		flags: { breakable: 1 },
	},
	deuilvengeur: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (pokemon.side.pokemon.some(ally => ally !== pokemon && ally.fainted)) return this.chainModify([5325, 4096]);
		},
	},
	motifterrifiant: {
		onStart(pokemon) {
			let activated = false;
			for (const target of pokemon.adjacentFoes()) {
				if (!activated) {
					this.add('-ability', pokemon, pokemon.getAbility().name, 'boost');
					activated = true;
				}
				if (target.volatiles['substitute']) this.add('-immune', target);
				else this.boost({ atk: -1, spa: -1 }, target, pokemon, null, true);
			}
		},
	},
	poireaufidele: {
		onModifyCritRatio(critRatio) {
			return critRatio + 1;
		},
		onModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).crit) return this.chainModify([5461, 4096]);
		},
	},
	pendule: {
		onAnySwitchIn() {
			const holder = this.effectState.target as Pokemon;
			for (const foe of holder.foes()) {
				if (foe.activeTurns || foe.m.penduleVu === foe.previouslySwitchedIn) continue;
				foe.m.penduleVu = foe.previouslySwitchedIn;
				annoncer(this, holder);
				this.boost({ spa: -1 }, foe, holder, null, true);
			}
		},
	},
	laitnourricier: {
		onResidualOrder: 5,
		onResidualSubOrder: 4,
		onResidual(pokemon) {
			for (const ally of pokemon.alliesAndSelf()) {
				if (ally.hp < ally.maxhp) this.heal(ally.baseMaxhp / 16, ally, pokemon);
			}
		},
	},
	mareeabyssale: {
		onStart() {
			this.field.setWeather('raindance');
		},
	},
	colleretteardente: {
		onAfterMoveSecondary(target, source, move) {
			if (target.m.colleretteArdente || !source || source === target || !target.hp) return;
			if (!passeSousLaMoitie(target, move)) return;
			target.m.colleretteArdente = true;
			this.boost({ spa: 1, spe: 1 }, target, target);
		},
	},
	gonflement: {
		onDamagingHit(damage, target, source, move) {
			if (target.m.gonflement || !this.checkMoveMakesContact(move, source, target)) return;
			target.m.gonflement = true;
			this.add('-activate', target, `ability: ${target.getAbility().name}`);
			(source.isAlly(target) ? source.side.foe : source.side).addSideCondition('toxicspikes', target);
		},
	},
	cornelevier: {
		onModifyDamage(damage, source, target) {
			if (target.getWeight() > 1000) return this.chainModify([5325, 4096]);
		},
	},
	fossilevivant: {
		onTryBoost(boost, target, source, effect) {
			if (!source || target === source) return;
			let blocked = false;
			let stat: BoostID;
			for (stat in boost) {
				if (boost[stat]! < 0) {
					delete boost[stat];
					blocked = true;
				}
			}
			if (blocked && !(effect as ActiveMove).secondaries) {
				this.add('-fail', target, 'unboost', `[from] ability: ${target.getAbility().name}`, `[of] ${target}`);
			}
		},
		onModifySpe(spe, pokemon) {
			if (PLUIE.includes(pokemon.effectiveWeather())) return this.chainModify(2);
		},
		flags: { breakable: 1 },
	},
	espritdudesert: {
		onModifySpe(spe) {
			if (this.field.isWeather('sandstorm')) return this.chainModify(1.5);
		},
		onImmunity(type) {
			if (type === 'sandstorm') return false;
		},
	},
	regimedebananes: {
		onResidualOrder: 28,
		onResidualSubOrder: 3,
		onResidual(pokemon) {
			const eaten = pokemon.m.bananes ?? 0;
			if (eaten >= 3 || pokemon.hp * 2 >= pokemon.maxhp) return;
			pokemon.m.bananes = eaten + 1;
			this.add('-activate', pokemon, `ability: ${pokemon.getAbility().name}`);
			this.heal(pokemon.baseMaxhp / 4, pokemon, pokemon);
		},
	},
	odeurdusang: {
		onModifyDamage(damage, source, target) {
			if (target.hp * 2 < target.maxhp) return this.chainModify([5325, 4096]);
		},
	},
	nuagedecoton: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.m.nuageDeCoton || target.getMoveHitData(move).typeMod <= 0) return;
			target.m.nuageDeCoton = true;
			annoncer(this, target);
			return this.chainModify(0.5);
		},
		flags: { breakable: 1 },
	},
	bouclierfrontal: {
		onSourceModifyDamage(damage, source, target, move) {
			if (this.checkMoveMakesContact(move, source, target)) return this.chainModify(0.5);
		},
		flags: { breakable: 1 },
	},
	roidesneiges: {
		onStart() {
			this.field.setWeather('snowscape');
		},
		onModifyMove(move) {
			if (move.type === 'Ice' && this.field.isWeather(['snowscape', 'hail'])) move.accuracy = true;
		},
	},
	poupeedeneige: {
		onDamagePriority: -30,
		onDamage(damage, target, source, effect) {
			if (target.m.poupeeDeNeige || damage < target.hp || effect?.effectType !== 'Move') return;
			target.m.poupeeDeNeige = true;
			annoncer(this, target);
			return target.hp - 1;
		},
		flags: { breakable: 1 },
	},
	signesgraves: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect?.effectType === 'Move') this.boost({ atk: length }, source);
		},
	},
	joueselectriques: {
		onStart() {
			this.field.setTerrain('electricterrain');
		},
	},
	visionx: {
		onModifyMove(move) {
			move.flags = { ...move.flags, bypasssub: 1 };
			move.ignoreEvasion = true;
		},
	},
	chefdemeute: {
		onStart() {
			this.effectState.atqGagnee = 0;
		},
		onAnyFaint(target, source, effect) {
			const holder = this.effectState.target as Pokemon;
			if (target.side === holder.side || source?.side !== holder.side || effect?.effectType !== 'Move') return;
			const gained = this.effectState.atqGagnee ?? 0;
			if (gained >= 2) return;
			this.effectState.atqGagnee = gained + 1;
			this.boost({ atk: 1 }, holder, holder);
		},
	},
	couturiere: {
		onModifyMove(move) {
			if (move.secondaries) {
				move.secondaries = move.secondaries.map(secondary => secondary.boosts?.spe && secondary.boosts.spe < 0 ?
					{ ...secondary, boosts: { ...secondary.boosts, spe: secondary.boosts.spe - 1 } } : secondary);
			}
			if (move.boosts?.spe && move.boosts.spe < 0) move.boosts = { ...move.boosts, spe: move.boosts.spe - 1 };
		},
	},
	maisondepierre: {
		onAfterMoveSecondary(target, source, move) {
			if (target.m.maisonDePierre || !source || source === target || !target.hp) return;
			if (!passeSousLaMoitie(target, move)) return;
			target.m.maisonDePierre = true;
			annoncer(this, target);
			for (const side of target.side.foeSidesWithConditions()) side.addSideCondition('stealthrock', target);
			this.boost({ def: 1 }, target, target);
		},
	},
	brumeonirique: {
		onStart() {
			this.field.setTerrain('psychicterrain');
		},
	},
	entreeenscene: {
		onStart(pokemon) {
			pokemon.m.entrees = (pokemon.m.entrees ?? 0) + 1;
		},
		onModifyPriority(priority, pokemon, target, move) {
			if (pokemon.m.entrees === 1 && !pokemon.m.entreeEnScene && move.category !== 'Status') return priority + 1;
		},
		onBeforeMove(pokemon, target, move) {
			if (move.category !== 'Status') pokemon.m.entreeEnScene = true;
		},
	},
	antennesbrumeuses: {
		onStart() {
			this.field.setTerrain('mistyterrain');
		},
		onTryAddVolatile(status, target) {
			if (this.field.isTerrain('mistyterrain') && ['confusion', 'taunt'].includes(status.id)) {
				this.add('-immune', target, `[from] ability: ${target.getAbility().name}`);
				return null;
			}
		},
	},
	potagerhante: {
		onStart() {
			this.field.setTerrain('grassyterrain');
		},
		onResidualOrder: 5,
		onResidualSubOrder: 3,
		onResidual(pokemon) {
			if (this.field.isTerrain('grassyterrain') && pokemon.isGrounded()) this.heal(pokemon.baseMaxhp / 16, pokemon, pokemon);
		},
	},
	boueprotectrice: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Water') return this.chainModify(0.5);
		},
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) this.boost({ atk: -1 }, source, target, null, true);
		},
		flags: { breakable: 1 },
	},
	souffledivin: {
		onModifyMove(move) {
			if (move.type !== 'Ice') return;
			move.onEffectiveness = (typeMod, target, type) => ['Fire', 'Water', 'Ice', 'Steel'].includes(type) && typeMod < 0 ? 0 : undefined;
		},
	},
	pheromonestoxiques: {
		onModifyMovePriority: -5,
		onModifyMove(move) {
			if (move.type !== 'Poison') return;
			if (!move.ignoreImmunity) move.ignoreImmunity = {};
			if (move.ignoreImmunity !== true) move.ignoreImmunity['Poison'] = true;
		},
	},
	moteurvivant: {
		onStart(pokemon) {
			this.boost({ spe: 1 }, pokemon, pokemon);
		},
	},
	ferronniere: {
		onModifyDamage(damage, source, target) {
			if (target.hasType('Steel') || target.hasType('Flying')) return this.chainModify([5325, 4096]);
		},
	},
	doublepiment: {
		onStart() {
			this.field.setWeather('sunnyday');
		},
		onModifyDamage(damage, source, target, move) {
			if (move.type === 'Grass' && SOLEIL.includes(source.effectiveWeather())) return this.chainModify(1.5);
		},
	},

	chiendesenfers: {
		onStart(pokemon) {
			let activated = false;
			for (const foe of pokemon.adjacentFoes()) {
				const types = foe.getTypes();
				if (this.dex.getEffectiveness('Fire', types) <= 0 && this.dex.getEffectiveness('Dark', types) <= 0) continue;
				if (!activated) {
					annoncer(this, pokemon);
					activated = true;
				}
				foe.addVolatile('chiendesenfers', pokemon);
			}
		},
		onFoeBeforeSwitchOut(pokemon) {
			const holder = this.effectState.target as Pokemon;
			if (!pokemon.volatiles['chiendesenfers'] || !holder.hp || !holder.isAdjacent(pokemon)) return;
			const action = this.queue.willMove(holder);
			if (!action || action.move.category === 'Status' || !this.queue.cancelMove(holder)) return;
			this.add('-activate', holder, `ability: ${holder.getAbility().name}`);
			pokemon.removeVolatile('destinybond');
			this.actions.runMove(action.move.id, holder, holder.getLocOf(pokemon));
		},
		condition: {
			onStart(target) {
				this.effectState.jusquAuTour = jusquAuTour(this, 2);
				this.add('-start', target, 'ability: Chien des Enfers');
			},
			onTrapPokemon(pokemon) {
				if (this.turn > this.effectState.jusquAuTour || !this.effectState.source?.isActive) {
					pokemon.removeVolatile('chiendesenfers');
					return;
				}
				pokemon.tryTrap();
			},
			onModifyMove(move, pokemon) {
				if (!move.selfSwitch || !this.effectState.source?.isActive) return;
				move.selfSwitch = false;
				this.add('-message', `${pokemon.name} est cloué sur place par le Chien des Enfers !`);
			},
			onResidualOrder: 28,
			onResidual(pokemon) {
				if (this.turn >= this.effectState.jusquAuTour || !this.effectState.source?.isActive) pokemon.removeVolatile('chiendesenfers');
			},
			onEnd(pokemon) {
				this.add('-end', pokemon, 'ability: Chien des Enfers');
			},
		},
	},
	mueeclair: {
		onSwitchOut(pokemon) {
			if (!pokemon.hp) return;
			pokemon.side.addSlotCondition(pokemon, 'mueeclair', pokemon);
			const leurre = pokemon.side.slotConditions[pokemon.position]['mueeclair'];
			if (leurre) leurre.pv = Math.floor(pokemon.maxhp / 4);
		},
		condition: {
			onSwitchIn(pokemon) {
				this.add('-activate', pokemon, 'ability: Mue Éclair');
			},
			onDamagePriority: -20,
			onDamage(damage, target, source, effect) {
				if (effect?.effectType !== 'Move' || !source || source.side === target.side) return;
				const absorbe = Math.min(damage, this.effectState.pv);
				target.side.removeSlotCondition(target, 'mueeclair');
				this.add('-activate', target, 'ability: Mue Éclair', '[leurre]');
				return damage - absorbe;
			},
		},
	},
	lecturedaura: {
		onStart(pokemon) {
			for (const foe of pokemon.adjacentFoes()) {
				if (foe.item) this.add('-item', foe, foe.getItem().name, `[from] ability: ${pokemon.getAbility().name}`, `[of] ${pokemon}`);
				for (const moveSlot of foe.moveSlots) {
					this.add('-activate', pokemon, `ability: ${pokemon.getAbility().name}`, `move: ${moveSlot.move}`, `[of] ${foe}`);
				}
			}
		},
	},
	rubansapaisants: {
		onStart(pokemon) {
			for (const foe of pokemon.adjacentFoes()) foe.addVolatile('rubansapaisants', pokemon);
		},
		condition: {
			onStart(target) {
				this.effectState.jusquAuTour = this.midTurn ? this.turn + 1 : this.turn + 2;
				this.add('-start', target, 'ability: Rubans Apaisants');
			},
			onDisableMove(pokemon) {
				if (this.turn > this.effectState.jusquAuTour) return;
				for (const moveSlot of pokemon.moveSlots) {
					if (estAttaqueDeBoost(this.dex.moves.get(moveSlot.id))) pokemon.disableMove(moveSlot.id);
				}
			},
			onBeforeMovePriority: 5,
			onBeforeMove(pokemon, target, move) {
				if (this.turn > this.effectState.jusquAuTour || !estAttaqueDeBoost(move)) return;
				this.add('cant', pokemon, 'ability: Rubans Apaisants', move);
				return false;
			},
			onResidualOrder: 28,
			onResidual(pokemon) {
				if (this.turn >= this.effectState.jusquAuTour) pokemon.removeVolatile('rubansapaisants');
			},
			onEnd(pokemon) {
				this.add('-end', pokemon, 'ability: Rubans Apaisants');
			},
		},
	},
	machoireroyale: {
		onModifyMove(move) {
			if (!move.flags['bite']) return;
			const { protect, ...flags } = move.flags;
			move.flags = flags;
			move.breaksProtect = true;
		},
		onSourceTryHit(target, source, move) {
			if (!move.flags['bite']) return;
			for (const ecran of ['reflect', 'lightscreen']) {
				if (target.side.removeSideCondition(ecran)) {
					this.add('-sideend', target.side, this.dex.conditions.get(ecran).name, `[from] ability: ${source.getAbility().name}`, `[of] ${source}`);
				}
			}
		},
	},
	sagedelaforet: {
		condition: {
			onModifyAtkPriority: 5,
			onModifyAtk(atk, pokemon) {
				if (this.field.getPseudoWeather('trickroom') && equipeProtegee(pokemon.side, 'sagedelaforet')) return this.chainModify([4915, 4096]);
			},
			onModifySpAPriority: 5,
			onModifySpA(spa, pokemon) {
				if (this.field.getPseudoWeather('trickroom') && equipeProtegee(pokemon.side, 'sagedelaforet')) return this.chainModify([4915, 4096]);
			},
		},
	},
	majordome: {
		condition: {
			onAnyModifyDamage(damage, source, target, move) {
				if (target.side !== this.effectState.target || move.priority <= 0.1 || !equipeProtegee(target.side, 'majordome')) return;
				return this.chainModify([3277, 4096]);
			},
			onTryHit(target, source, move) {
				if (move.id !== 'fakeout' || !equipeProtegee(target.side, 'majordome')) return;
				this.add('-activate', target, 'ability: Majordome');
				return null;
			},
		},
	},

	mummy: {
		onDamagingHit(damage, target, source, move) {
			if (!this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) return;
			const sourceAbility = source.getAbility();
			if (!sourceAbility.flags['cantsuppress'] && sourceAbility.id !== 'mummy') source.setAbility('mummy', target);
			this.boost({ atk: -1 }, source, target, null, true);
		},
	},
	watercompaction: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Water') return this.chainModify(0.5);
		},
	},
	stalwart: {
		onDragOutPriority: 1,
		onDragOut(pokemon) {
			this.add('-activate', pokemon, 'ability: Stalwart');
			return null;
		},
	},
	sandspit: {
		onDamagingHit() {
			if (this.field.setWeather('sandstorm')) this.field.weatherState.duration = 8;
		},
	},
	punkrock: {
		onModifyMove(move) {
			if (!move.flags['sound'] || move.category === 'Status') return;
			move.secondaries = [...(move.secondaries ?? []), { chance: 20, status: 'psn' }];
		},
	},
	lingeringaroma: {
		onSourceDamagingHit(damage, target, source, move) {
			if (!this.checkMoveMakesContact(move, source, target)) return;
			const targetAbility = target.getAbility();
			if (targetAbility.flags['cantsuppress'] || targetAbility.id === 'lingeringaroma') return;
			target.setAbility('lingeringaroma', source);
		},
	},
};

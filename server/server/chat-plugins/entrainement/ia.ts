/**
 * IA des bots d'entraînement. Elle suit le journal du combat (Pokémon adverses, PV, statuts, boosts, pièges,
 * météo, distorsion) et choisit une action à chaque requête. Les niveaux se cumulent :
 * 1 attaque au hasard ; 2 vise les dégâts ; 3 change de Pokémon menacé, pose les pièges, se soigne, garde la Téra ;
 * 4 prend les KO, se booste, inflige des statuts, pose la météo, anticipe les changements ;
 * 5 compare chaque attaque et chaque changement avec la meilleure riposte probable.
 */
import { Dex, toID, type ModdedDex } from '../../../sim/dex';
import type { Move } from '../../../sim/dex-moves';
import { BAG_ITEMS, type BagRequestData, type ChoiceRequest, type MoveRequest, type PokemonSwitchRequestData } from '../../../sim/side';
import type { Archetype, Pokemon as RosterPokemon, Roster } from '../../../../data/types/roster';
import { FORMAT, defaultSet } from '../pokedraft';
import { search, type Analysis, type OptionChoice, type SearchInput } from './moteur';

const GENERIC_EVS = { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 };
const MAX_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

export type Level = 1 | 2 | 3 | 4 | 5;
/** Set supposé d'une espèce dans le format du combat, ou `null` si on n'en sait rien. */
export type SetSource = (species: string) => PokemonSet | null;

const KO_BONUS = 0.5;
/** Changer de Pokémon laisse un tour gratuit à l'adversaire. */
const SWITCH_COST = 0.25;
/** Deux tours de sommeil après un soin qui endort (Repos, Rêve Partagé). */
const SLEEP_COST = 0.35;
const HAZARDS = ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb'];
const SPIKES_DAMAGE = [0, 1 / 8, 1 / 6, 1 / 4];
const WEATHER_TYPES: { [weather: string]: string } = {
	raindance: 'Water', sunnyday: 'Fire', sandstorm: 'Rock', snowscape: 'Ice',
};
/** Hors PokéDraft, les talents qui profitent d'une météo. */
const WEATHER_ABILITIES: { [weather: string]: string[] } = {
	raindance: ['swiftswim', 'raindish', 'dryskin', 'hydration'], sunnyday: ['chlorophyll', 'solarpower', 'protosynthesis'],
	sandstorm: ['sandrush', 'sandforce'], snowscape: ['slushrush', 'icebody'],
};
/** Attaque de terrain : l'archétype du roster qui en profite. */
const FIELD_MOVES: { [move: string]: Archetype } = {
	raindance: 'Pluie', sunnyday: 'Soleil', sandstorm: 'Sable', snowscape: 'Neige', trickroom: 'Distorsion',
};
const IMMUNE_ABILITIES: { [ability: string]: string } = {
	levitate: 'Ground', eartheater: 'Ground', flashfire: 'Fire', wellbakedbody: 'Fire', waterabsorb: 'Water',
	stormdrain: 'Water', dryskin: 'Water', voltabsorb: 'Electric', lightningrod: 'Electric', motordrive: 'Electric',
	sapsipper: 'Grass',
};

/** Ce qu'on sait d'un Pokémon en combat, réel pour les siens, estimé pour ceux de l'adversaire. */
export interface Fighter {
	species: string;
	types: string[];
	stabTypes: string[];
	stats: StatsTable;
	hp: number;
	status: string;
	boosts: SparseBoostsTable;
	item: string;
	ability: string;
	tera: string | null;
	moves: string[];
	/** Niveau du Pokémon (100 hors Route des Ligues et Roguelike). */
	level?: number;
}

interface Tracked {
	species: string;
	level: number;
	hp: number;
	status: string;
	moves: Set<string>;
	tera: string | null;
	item: string | null;
}

interface SideTrack {
	team: Map<string, Tracked>;
	nicks: Map<string, string>;
	active: string | null;
	boosts: SparseBoostsTable;
	hazards: Map<string, number>;
	teraUsed: boolean;
}

interface Attack {
	slot: number;
	id: string;
	move: Move;
}

interface Threat {
	damage: number;
	raw: number;
	priority: number;
	move: string;
}

interface Situation {
	ours: Fighter;
	theirs: Fighter;
	attacks: Attack[];
	switches: { slot: number, fighter: Fighter }[];
	canTera: string | null;
	threat: Threat;
	alive: number;
}

function boostMultiplier(boost = 0) {
	return boost >= 0 ? (2 + boost) / 2 : 2 / (2 - boost);
}

function parseHp(condition: string) {
	const [hp = '0', status = ''] = condition.split(' ');
	if (status === 'fnt' || hp === '0') return { hp: 0, max: 0, status: 'fnt' };
	const [current, max] = hp.split('/').map(Number);
	return { hp: max ? current / max : 0, max: max || 0, status };
}

function speciesOf(details: string) {
	return toID(details.split(',')[0]);
}

/** Niveau dans les détails d'un Pokémon (« Pikachu, L38, M ») ; 100 quand il n'est pas précisé. */
function levelOf(details: string) {
	return Number(details.split(', ').find(part => /^L\d+$/.test(part))?.slice(1)) || 100;
}

export class TrainingAI {
	readonly dex: ModdedDex;
	readonly byId: Map<string, RosterPokemon>;
	readonly sides: { [side: string]: SideTrack } = {};
	me = 'p1';
	turnNumber = 0;
	weather = '';
	weatherSince = 0;
	terrain = '';
	terrainSince = 0;
	trickRoom = false;
	trickRoomSince = 0;
	/** Raisonnement du moteur pour la dernière décision, montré au joueur une fois le tour joué. */
	lastAnalysis: Analysis | null = null;
	/** Erreurs du moteur ; le bot retombe alors sur ses règles. */
	engineErrors: string[] = [];
	private statsCache = new Map<string, StatsTable>();
	/** Les sets que le bot a lui-même envoyés : le moteur en a besoin pour rejouer ses options. */
	team: PokemonSet[] = [];

	readonly format: string;

	/**
	 * Hors PokéDraft, `options.format` donne le format du combat et `options.sets` le set supposé de chaque espèce
	 * (statistiques Smogon) : le roster n'est alors plus consulté.
	 */
	constructor(
		readonly level: Level, roster: Roster, readonly random: () => number = Math.random,
		readonly options: { engine?: boolean, format?: string, sets?: SetSource } = {}
	) {
		this.format = options.format ?? FORMAT;
		this.dex = Dex.forFormat(this.format);
		this.byId = options.sets ? new Map() : new Map(roster.pokemon.map(pokemon => [pokemon.id, pokemon]));
	}

	/** Set de référence d'une espèce : celui du format s'il y a une source, sinon le set par défaut de sa fiche. */
	referenceSet(species: string): PokemonSet | null {
		if (this.options.sets) return this.options.sets(species);
		const rosterMon = this.byId.get(species);
		return rosterMon ? defaultSet(rosterMon) : null;
	}

	setTeam(team: PokemonSet[]) {
		this.team = team;
	}

	get foe(): string {
		return this.me === 'p1' ? 'p2' : 'p1';
	}

	protected side(id: string): SideTrack {
		const key = id.slice(0, 2);
		return this.sides[key] ??= { team: new Map(), nicks: new Map(), active: null, boosts: {}, hazards: new Map(), teraUsed: false };
	}

	private tracked(ident: string): Tracked | undefined {
		const side = this.side(ident);
		const nick = ident.slice(ident.indexOf(':') + 1).trim();
		const species = side.nicks.get(nick);
		return species ? side.team.get(species) : undefined;
	}

	private ensure(side: SideTrack, species: string): Tracked {
		let mon = side.team.get(species);
		if (!mon) {
			mon = { species, level: 100, hp: 1, status: '', moves: new Set(), tera: null, item: null };
			side.team.set(species, mon);
		}
		return mon;
	}

	receiveLine(line: string) {
		if (!line.startsWith('|')) return;
		const parts = line.slice(1).split('|');
		const [command, target = '', value = ''] = parts;
		switch (command) {
		case 'turn':
			this.turnNumber = Number(target) || this.turnNumber;
			break;
		case '-item': case '-enditem': {
			const mon = this.tracked(target);
			if (mon) mon.item = command === '-item' ? toID(value) : '';
			break;
		}
		case 'poke':
			this.ensure(this.side(target), speciesOf(value)).level = levelOf(value);
			break;
		case 'switch': case 'drag': case 'replace': {
			const side = this.side(target);
			const species = speciesOf(value);
			side.nicks.set(target.slice(target.indexOf(':') + 1).trim(), species);
			const mon = this.ensure(side, species);
			mon.level = levelOf(value);
			const condition = parseHp(parts[3] ?? '100/100');
			mon.hp = condition.hp;
			mon.status = condition.status === 'fnt' ? '' : condition.status;
			side.active = species;
			if (command !== 'replace') side.boosts = {};
			break;
		}
		case 'detailschange': case '-formechange': {
			const mon = this.tracked(target);
			if (mon) mon.species = speciesOf(value);
			break;
		}
		case '-damage': case '-heal': case '-sethp': {
			const mon = this.tracked(target);
			if (!mon) break;
			const condition = parseHp(value);
			mon.hp = condition.hp;
			if (condition.status !== 'fnt') mon.status = condition.status;
			break;
		}
		case 'faint': {
			const mon = this.tracked(target);
			if (mon) mon.hp = 0;
			break;
		}
		case '-status': {
			const mon = this.tracked(target);
			if (mon) mon.status = value;
			break;
		}
		case '-curestatus': {
			const mon = this.tracked(target);
			if (mon) mon.status = '';
			break;
		}
		case '-cureteam':
			for (const mon of this.side(target).team.values()) mon.status = '';
			break;
		case '-boost': case '-unboost': case '-setboost': {
			const boosts = this.side(target).boosts;
			const stat = value as BoostID;
			const amount = Number(parts[3]) || 0;
			const next = command === '-setboost' ? amount : (boosts[stat] ?? 0) + (command === '-boost' ? amount : -amount);
			boosts[stat] = Math.max(-6, Math.min(6, next));
			break;
		}
		case '-clearboost':
			this.side(target).boosts = {};
			break;
		case '-clearallboost':
			for (const side of Object.values(this.sides)) side.boosts = {};
			break;
		case '-clearnegativeboost': {
			const boosts = this.side(target).boosts;
			for (const stat of Object.keys(boosts) as BoostID[]) if ((boosts[stat] ?? 0) < 0) delete boosts[stat];
			break;
		}
		case 'move': {
			const mon = this.tracked(target);
			if (mon) mon.moves.add(toID(value));
			break;
		}
		case '-terastallize': {
			const mon = this.tracked(target);
			if (mon) mon.tera = value;
			this.side(target).teraUsed = true;
			break;
		}
		case '-sidestart': case '-sideend': {
			const hazards = this.side(target).hazards;
			const hazard = toID(value.replace(/^move: /, ''));
			if (command === '-sideend') hazards.delete(hazard);
			else hazards.set(hazard, (hazards.get(hazard) ?? 0) + 1);
			break;
		}
		case '-weather': {
			const weather = target === 'none' ? '' : toID(target);
			if (weather !== this.weather) this.weatherSince = this.turnNumber;
			this.weather = weather;
			break;
		}
		case '-fieldstart': case '-fieldend': {
			const effect = toID(target.replace(/^move: /, ''));
			const starts = command === '-fieldstart';
			if (effect === 'trickroom') {
				this.trickRoom = starts;
				this.trickRoomSince = this.turnNumber;
			} else if (effect.endsWith('terrain')) {
				this.terrain = starts ? effect : '';
				this.terrainSince = this.turnNumber;
			}
			break;
		}
		}
	}

	/** Réponse à une requête du simulateur : `move 2`, `switch 3`, `team 213456`… ou chaîne vide s'il faut attendre. */
	decide(request: ChoiceRequest): string {
		this.me = request.side.id;
		this.lastAnalysis = null;
		if (request.wait) return '';
		if (request.teamPreview) return this.teamOrder(request.side.pokemon);
		if (request.forceSwitch) return this.forcedSwitch(request.side.pokemon);
		return this.turn(request);
	}

	statsFor(species: string, level = 100): StatsTable {
		const key = `${species}:${level}`;
		const cached = this.statsCache.get(key);
		if (cached) return cached;
		const data = this.dex.species.get(species);
		const set = this.referenceSet(species) ?? this.referenceSet(toID(data.baseSpecies));
		const nature = this.dex.natures.get(set?.nature ?? 'serious');
		const stats = {} as StatsTable;
		for (const stat of Object.keys(data.baseStats) as StatID[]) {
			const core = Math.floor((2 * data.baseStats[stat] + 31 + Math.floor((set?.evs[stat] ?? 84) / 4)) * level / 100);
			if (stat === 'hp') {
				stats.hp = core + level + 10;
			} else {
				const modifier = nature.plus === stat ? 1.1 : nature.minus === stat ? 0.9 : 1;
				stats[stat] = Math.floor((core + 5) * modifier);
			}
		}
		this.statsCache.set(key, stats);
		return stats;
	}

	ourFighter(pokemon: PokemonSwitchRequestData): Fighter {
		const species = speciesOf(pokemon.details);
		const level = levelOf(pokemon.details);
		const condition = parseHp(pokemon.condition);
		const types = [...this.dex.species.get(species).types];
		const tera = pokemon.terastallized || null;
		return {
			species,
			level,
			types: tera ? [tera] : types,
			stabTypes: tera ? [...types, tera] : types,
			stats: { hp: condition.max || this.statsFor(species, level).hp, ...pokemon.stats },
			hp: condition.hp,
			status: condition.status === 'fnt' ? '' : condition.status,
			boosts: pokemon.active ? this.side(this.me).boosts : {},
			item: pokemon.item,
			ability: pokemon.ability ?? pokemon.baseAbility,
			tera,
			moves: pokemon.moves,
		};
	}

	theirFighter(mon: Tracked, active: boolean): Fighter {
		const types = [...this.dex.species.get(mon.species).types];
		const reference = this.referenceSet(mon.species);
		const probable = reference ? reference.moves.map(toID) : [];
		const moves = mon.moves.size >= 4 ? [...mon.moves] : [...new Set([...mon.moves, ...probable])];
		return {
			species: mon.species,
			level: mon.level,
			types: mon.tera ? [mon.tera] : types,
			stabTypes: mon.tera ? [...types, mon.tera] : types,
			stats: this.statsFor(mon.species, mon.level),
			hp: mon.hp,
			status: mon.status,
			boosts: active ? this.side(this.foe).boosts : {},
			item: mon.item ?? toID(reference?.item ?? ''),
			ability: toID(reference?.ability ?? ''),
			tera: mon.tera,
			moves: moves.length ? moves : types.map(type => `stab:${type}`),
		};
	}

	/** Part des PV max du défenseur retirée par l'attaque (moyenne des jets, sans coup critique). */
	damage(attacker: Fighter, defender: Fighter, moveId: string): number {
		let type: string;
		let power: number;
		let move: Move | null = null;
		if (moveId.startsWith('stab:')) {
			type = moveId.slice(5);
			power = 80;
		} else {
			move = this.dex.moves.get(moveId);
			if (!move.exists || move.category === 'Status' || move.ohko) return 0;
			type = move.type;
			if (move.id === 'terablast' && attacker.tera) type = attacker.tera;
			if (move.id === 'weatherball' && WEATHER_TYPES[this.weather]) type = WEATHER_TYPES[this.weather];
			power = move.basePower || 60;
		}
		if (!this.dex.getImmunity(type, defender.types)) return 0;
		if (IMMUNE_ABILITIES[defender.ability] === type) return 0;
		if (type === 'Ground' && defender.item === 'airballoon') return 0;
		if (move?.damage === 'level') return (attacker.level ?? 100) / defender.stats.hp;
		if (typeof move?.damage === 'number') return move.damage / defender.stats.hp;
		if (move && ['superfang', 'ruination', 'naturesmadness'].includes(move.id)) return defender.hp / 2;

		const physical = move ? move.category === 'Physical' : attacker.stats.atk >= attacker.stats.spa;
		const offense = move?.overrideOffensiveStat ?? (physical ? 'atk' : 'spa');
		const defense = move?.overrideDefensiveStat ?? (physical ? 'def' : 'spd');
		const source = move?.overrideOffensivePokemon === 'target' ? defender : attacker;
		let attack = source.stats[offense] * boostMultiplier(source.boosts[offense]);
		let guard = defender.stats[defense] * boostMultiplier(defender.boosts[defense]);
		if (attacker.item === 'choiceband' && physical) attack *= 1.5;
		if (attacker.item === 'choicespecs' && !physical) attack *= 1.5;
		if (defender.item === 'assaultvest' && !physical) guard *= 1.5;
		if (defender.item === 'eviolite') guard *= 1.5;
		if (this.weather === 'sandstorm' && defender.types.includes('Rock') && !physical) guard *= 1.5;
		if (this.weather === 'snowscape' && defender.types.includes('Ice') && physical) guard *= 1.5;

		const levelFactor = Math.floor(2 * (attacker.level ?? 100) / 5) + 2;
		let damage = Math.floor(Math.floor(levelFactor * power * attack / guard) / 50) + 2;
		if (attacker.stabTypes.includes(type)) {
			damage *= attacker.tera === type && attacker.stabTypes.indexOf(type) !== attacker.stabTypes.lastIndexOf(type) ? 2 : 1.5;
		}
		const effectiveness = this.dex.getEffectiveness(type, defender.types);
		damage *= 2 ** effectiveness;
		if ((this.weather === 'raindance' && type === 'Water') || (this.weather === 'sunnyday' && type === 'Fire')) damage *= 1.5;
		if ((this.weather === 'raindance' && type === 'Fire') || (this.weather === 'sunnyday' && type === 'Water')) damage *= 0.5;
		if (attacker.status === 'brn' && physical && attacker.ability !== 'guts' && move?.id !== 'facade') damage *= 0.5;
		if (attacker.item === 'lifeorb') damage *= 1.3;
		if (attacker.item === 'expertbelt' && effectiveness > 0) damage *= 1.2;
		const multihit = move?.multihit;
		const hits = Array.isArray(multihit) ? (attacker.ability === 'skilllink' ? multihit[1] : 3.1) : multihit || 1;
		return damage * hits * 0.925 / defender.stats.hp;
	}

	accuracy(moveId: string) {
		if (moveId.startsWith('stab:')) return 1;
		const accuracy = this.dex.moves.get(moveId).accuracy;
		return accuracy === true ? 1 : accuracy / 100;
	}

	speed(fighter: Fighter) {
		let speed = fighter.stats.spe * boostMultiplier(fighter.boosts.spe);
		if (fighter.status === 'par') speed *= 0.5;
		if (fighter.item === 'choicescarf') speed *= 1.5;
		return speed;
	}

	movesFirst(ours: Fighter, theirs: Fighter, ourPriority = 0, theirPriority = 0) {
		if (ourPriority !== theirPriority) return ourPriority > theirPriority;
		const [mine, other] = [this.speed(ours), this.speed(theirs)];
		return this.trickRoom ? mine < other : mine > other;
	}

	/** Meilleure attaque probable de `attacker` sur `defender`. */
	threat(attacker: Fighter, defender: Fighter): Threat {
		let best: Threat = { damage: 0, raw: 0, priority: 0, move: '' };
		for (const move of attacker.moves) {
			const raw = this.damage(attacker, defender, move);
			const damage = raw * this.accuracy(move);
			if (damage > best.damage) {
				best = { damage, raw, priority: move.startsWith('stab:') ? 0 : this.dex.moves.get(move).priority, move };
			}
		}
		return best;
	}

	/** Avantage d'un Pokémon sur un autre : dégâts infligés moins dégâts reçus, KO compris, et un bonus s'il est plus rapide. */
	matchup(ours: Fighter, theirs: Fighter) {
		const attack = this.threat(ours, theirs);
		const defense = this.threat(theirs, ours);
		const first = this.movesFirst(ours, theirs, attack.priority, defense.priority);
		const kills = attack.raw >= theirs.hp && (first || defense.raw < ours.hp);
		const dies = defense.raw >= ours.hp && !(first && attack.raw >= theirs.hp);
		return Math.min(attack.damage, theirs.hp) - Math.min(defense.damage, ours.hp) +
			(kills ? KO_BONUS : 0) - (dies ? KO_BONUS : 0) + (first ? 0.1 : 0);
	}

	private theirActive(): Fighter | null {
		const side = this.side(this.foe);
		const mon = side.active ? side.team.get(side.active) : undefined;
		return mon ? this.theirFighter(mon, true) : null;
	}

	private theirTeam(): Fighter[] {
		return [...this.side(this.foe).team.values()].filter(mon => mon.hp > 0).map(mon => this.theirFighter(mon, false));
	}

	private bench(pokemon: PokemonSwitchRequestData[]) {
		return pokemon
			.map((mon, index) => ({ slot: index + 1, mon }))
			.filter(({ mon }) => !mon.active && !mon.condition.endsWith(' fnt'))
			.map(({ slot, mon }) => ({ slot, fighter: this.ourFighter(mon) }));
	}

	private pick<T>(list: T[]): T {
		return list[Math.floor(this.random() * list.length)];
	}

	private teamOrder(pokemon: PokemonSwitchRequestData[]) {
		const order = pokemon.map((_, index) => index + 1);
		const foes = this.theirTeam();
		if (this.level >= 4 && foes.length) {
			const score = (slot: number) => {
				const fighter = this.ourFighter(pokemon[slot - 1]);
				return foes.reduce((sum, foe) => sum + this.matchup(fighter, foe), 0);
			};
			const lead = order.reduce((best, slot) => score(slot) > score(best) ? slot : best, 1);
			return `team ${[lead, ...order.filter(slot => slot !== lead)].join('')}`;
		}
		return `team ${order.join('')}`;
	}

	private forcedSwitch(pokemon: PokemonSwitchRequestData[]) {
		const bench = this.bench(pokemon);
		if (!bench.length) return 'pass';
		const theirs = this.theirActive();
		if (this.level === 1 || !theirs) return `switch ${this.pick(bench).slot}`;
		const score = (fighter: Fighter) => this.level === 2 ? this.threat(fighter, theirs).damage : this.matchup(fighter, theirs);
		const best = bench.reduce((top, option) => score(option.fighter) > score(top.fighter) ? option : top);
		return `switch ${best.slot}`;
	}

	private turn(request: MoveRequest) {
		const active = request.active[0];
		const ourMon = request.side.pokemon.find(mon => mon.active);
		const attacks: Attack[] = active.moves
			.map((move, index) => ({ slot: index + 1, id: move.id, move: this.dex.moves.get(move.id), usable: !move.disabled && (move.pp ?? 1) > 0 }))
			.filter(move => move.usable)
			.map(({ slot, id, move }) => ({ slot, id, move }));
		if (!attacks.length) return 'move 1';
		const theirs = this.theirActive();
		if (this.level === 1 || !ourMon || !theirs) return `move ${this.pick(attacks).slot}`;

		const ours = this.ourFighter(ourMon);
		const situation: Situation = {
			ours,
			theirs,
			attacks,
			switches: active.trapped ? [] : this.bench(request.side.pokemon),
			canTera: active.canTerastallize ?? null,
			threat: this.threat(theirs, ours),
			alive: request.side.pokemon.filter(mon => !mon.condition.endsWith(' fnt')).length,
		};
		if (this.level === 5 && this.options.engine) {
			const input = this.searchInput(request);
			if (input) {
				try {
					const { best, analysis } = search(input, this.random);
					this.lastAnalysis = analysis;
					return this.toChoice(best, request);
				} catch (error) {
					this.engineErrors.push((error as Error).stack ?? String(error));
				}
			}
		}
		if (this.level === 5) return this.advancedChoice(situation) || this.expertChoice(situation);
		return (this.level >= 4 && this.advancedChoice(situation)) ||
			(this.level >= 3 && this.carefulChoice(situation)) ||
			this.attack(situation);
	}

	/** État du combat tel que le bot le voit, pour le moteur ; `null` si le bot ne connaît pas encore son adversaire. */
	searchInput(request: MoveRequest): SearchInput | null {
		const theirs = this.side(this.foe);
		const active = request.active?.[0];
		if (!this.team.length || !theirs.active || !active) return null;
		const ours = this.side(this.me);
		const remaining = (since: number) => Math.max(1, 5 - (this.turnNumber - since));
		const theirTeam = [...theirs.team.values()];
		return {
			format: this.format,
			me: this.me as SideID,
			turn: this.turnNumber,
			ourSets: this.team,
			theirSets: theirTeam.map(mon => this.probableSet(mon.species)),
			ours: {
				team: request.side.pokemon.map(mon => {
					const condition = parseHp(mon.condition);
					return {
						species: speciesOf(mon.details), hp: condition.hp, status: condition.status === 'fnt' ? '' : condition.status,
						moves: mon.moves, item: mon.item, tera: mon.terastallized || null, active: mon.active,
					};
				}),
				boosts: ours.boosts,
				hazards: Object.fromEntries(ours.hazards),
				teraUsed: ours.teraUsed,
			},
			theirs: {
				team: theirTeam.map(mon => ({
					species: mon.species, hp: mon.hp, status: mon.status, moves: [...mon.moves],
					item: mon.item, tera: mon.tera, active: mon.species === theirs.active,
				})),
				boosts: theirs.boosts,
				hazards: Object.fromEntries(theirs.hazards),
				teraUsed: theirs.teraUsed,
			},
			options: {
				moves: active.moves.filter(move => !move.disabled && (move.pp ?? 1) > 0).map(move => move.id),
				canTera: Boolean(active.canTerastallize),
				switches: active.trapped ? [] : this.bench(request.side.pokemon).map(option => option.fighter.species),
			},
			field: {
				weather: this.weather,
				weatherTurns: remaining(this.weatherSince),
				terrain: this.terrain,
				terrainTurns: remaining(this.terrainSince),
				trickRoom: this.trickRoom ? remaining(this.trickRoomSince) : 0,
			},
		};
	}

	/** Set supposé d'un Pokémon adverse : le plus joué du format, ou le set par défaut de sa fiche PokéDraft. */
	probableSet(species: string): PokemonSet {
		const reference = this.referenceSet(species);
		if (reference) return reference;
		return {
			name: species, species, item: '', ability: '', moves: [], nature: 'serious', gender: '',
			evs: GENERIC_EVS, ivs: MAX_IVS, level: 100,
		};
	}

	/** Traduit une option du moteur dans les numéros de la vraie requête. */
	toChoice(option: OptionChoice, request: MoveRequest) {
		if (option.kind === 'switch') return `switch ${request.side.pokemon.findIndex(mon => speciesOf(mon.details) === option.id) + 1}`;
		const slot = request.active[0].moves.findIndex(move => move.id === option.id) + 1;
		return `move ${slot}${option.tera ? ' terastallize' : ''}`;
	}

	/** Niveau 2 et plus : l'attaque qui retire le plus de PV, au hasard parmi les quasi-égales. */
	private bestAttacks(situation: Situation, target = situation.theirs) {
		const scored = situation.attacks
			.map(attack => ({ attack, damage: this.damage(situation.ours, target, attack.id) * this.accuracy(attack.id) }))
			.sort((a, b) => b.damage - a.damage);
		return scored;
	}

	private attack(situation: Situation) {
		const scored = this.bestAttacks(situation);
		const top = scored[0];
		if (!top.damage) return `move ${this.pick(situation.attacks).slot}`;
		const close = scored.filter(entry => entry.damage >= top.damage * 0.95);
		const chosen = this.pick(close).attack;
		return `move ${chosen.slot}${this.teraFor(situation, chosen) ? ' terastallize' : ''}`;
	}

	/** Niveau 3 : la Téra pour les deux derniers Pokémon, quand elle renforce l'attaque choisie. */
	private teraFor(situation: Situation, attack: Attack) {
		if (this.level < 3 || !situation.canTera || situation.alive > (this.level >= 4 ? 3 : 2)) return false;
		return attack.move.category !== 'Status' && attack.move.type === situation.canTera;
	}

	private isRecovery(move: Move) {
		return Boolean(move.flags.heal) || this.sleepsToHeal(move);
	}

	private sleepsToHeal(move: Move) {
		return move.id === 'rest' || /s'endort/.test((move as { shortDesc?: string }).shortDesc ?? '');
	}

	private asleep(fighter: Fighter, move: Move) {
		return fighter.status === 'slp' && !move.sleepUsable;
	}

	private hazardsDamage(fighter: Fighter) {
		const hazards = this.side(this.me).hazards;
		let damage = hazards.has('stealthrock') ? 0.125 * 2 ** this.dex.getEffectiveness('Rock', fighter.types) : 0;
		const grounded = !fighter.types.includes('Flying') && fighter.ability !== 'levitate';
		if (grounded) damage += SPIKES_DAMAGE[Math.min(3, hazards.get('spikes') ?? 0)];
		return fighter.item === 'heavydutyboots' ? 0 : damage;
	}

	private foesAlive() {
		const team = this.side(this.foe).team;
		return [...team.values()].filter(mon => mon.hp > 0).length + Math.max(0, 6 - team.size);
	}

	/** Niveau 3 : changer face à un KO ou un mur, poser les pièges, se soigner. */
	private carefulChoice(situation: Situation): string | null {
		const { ours, theirs, threat, switches } = situation;
		const best = this.bestAttacks(situation)[0];
		const ourBestRaw = this.damage(ours, theirs, best.attack.id);
		const doomed = threat.raw >= ours.hp && !(this.movesFirst(ours, theirs, best.attack.move.priority, threat.priority) && ourBestRaw >= theirs.hp);
		const walled = best.damage < 0.12;
		if ((doomed || walled) && switches.length) {
			const safe = switches
				.map(option => ({ ...option, taken: this.threat(theirs, option.fighter).damage, value: this.matchup(option.fighter, theirs) }))
				.filter(option => option.fighter.hp >= 0.5 && option.taken + this.hazardsDamage(option.fighter) <= (doomed ? 0.35 : 0.4) &&
					(!walled || doomed || this.threat(option.fighter, theirs).damage >= 0.35))
				.sort((a, b) => b.value - a.value);
			if (safe.length) return `switch ${safe[0].slot}`;
		}
		const comfortable = threat.raw < ours.hp;
		const hazard = situation.attacks.find(attack => HAZARDS.includes(attack.id) && !this.side(this.foe).hazards.has(attack.id));
		if (hazard && comfortable && this.foesAlive() >= 3) return `move ${hazard.slot}`;
		const recovery = situation.attacks.find(attack => this.isRecovery(attack.move));
		if (recovery && ours.hp < 0.45 && threat.damage < 0.45) return `move ${recovery.slot}`;
		return null;
	}

	private teamBenefits(fieldMove: string, situation: Situation) {
		if (fieldMove === 'trickroom') {
			if (this.trickRoom) return false;
			const ourSpeed = [situation.ours, ...situation.switches.map(option => option.fighter)].map(f => this.speed(f));
			const theirSpeed = this.theirTeam().map(f => this.speed(f));
			const average = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / Math.max(1, list.length);
			return average(ourSpeed) < average(theirSpeed);
		}
		if (this.weather === fieldMove) return false;
		const archetype = FIELD_MOVES[fieldMove];
		const team = [situation.ours, ...situation.switches.map(option => option.fighter)];
		if (this.options.sets) {
			return team.filter(fighter => WEATHER_ABILITIES[fieldMove]?.includes(toID(fighter.ability)) ||
				fighter.types.includes(WEATHER_TYPES[fieldMove])).length >= 2;
		}
		return team.filter(fighter => this.byId.get(fighter.species)?.archetypes.includes(archetype)).length >= 2;
	}

	private statusWorks(move: Move, theirs: Fighter) {
		if (theirs.status || !move.status) return false;
		if (!this.dex.getImmunity(move.type, theirs.types)) return false;
		if (move.status === 'brn') return !theirs.types.includes('Fire') && theirs.stats.atk > theirs.stats.spa;
		if (move.status === 'par') return !theirs.types.includes('Electric');
		if (move.status === 'psn' || move.status === 'tox') return !theirs.types.includes('Poison') && !theirs.types.includes('Steel');
		return true;
	}

	private setupGain(move: Move, ours: Fighter) {
		if (move.target !== 'self' || !move.boosts) return 0;
		const main: BoostID = ours.stats.atk >= ours.stats.spa ? 'atk' : 'spa';
		const gain = (move.boosts[main] ?? 0) + (move.boosts.spe ?? 0) * 0.5;
		return (ours.boosts[main] ?? 0) >= 2 ? 0 : gain;
	}

	/** Niveau 4 : KO, coup de grâce prioritaire, terrain, boost, statut, puis anticipation d'un changement. */
	private advancedChoice(situation: Situation): string | null {
		const { ours, theirs, threat, attacks } = situation;
		const killers = attacks.filter(attack => this.damage(ours, theirs, attack.id) * (this.accuracy(attack.id) >= 0.9 ? 1 : 0.8) >= theirs.hp);
		const safeKill = killers.find(attack => this.movesFirst(ours, theirs, attack.move.priority, threat.priority) || threat.raw < ours.hp);
		if (safeKill) return `move ${safeKill.slot}`;
		const relaxed = threat.raw < ours.hp * 0.8;
		const field = attacks.find(attack => FIELD_MOVES[attack.id] && this.teamBenefits(attack.id, situation));
		if (field && relaxed) return `move ${field.slot}`;
		const setup = attacks.find(attack => this.setupGain(attack.move, ours) > 0);
		if (setup && threat.damage <= 0.25 && ours.hp >= 0.6) return `move ${setup.slot}`;
		const status = attacks.find(attack => attack.move.category === 'Status' && this.statusWorks(attack.move, theirs));
		if (status && threat.damage < 0.4) return `move ${status.slot}`;
		if (this.level === 5) return null;
		const careful = this.carefulChoice(situation);
		if (careful) return careful;
		const best = this.bestAttacks(situation)[0];
		const pressured = this.damage(ours, theirs, best.attack.id) >= theirs.hp * 0.8 || this.dex.getEffectiveness(best.attack.move.type, theirs.types) > 0;
		if (pressured && this.random() < 0.4) {
			const foes = this.theirTeam().filter(foe => foe.species !== theirs.species);
			if (foes.length) {
				const coverage = attacks
					.filter(attack => attack.move.category !== 'Status')
					.map(attack => ({ attack, total: foes.reduce((sum, foe) => sum + this.damage(ours, foe, attack.id), 0) }))
					.sort((a, b) => b.total - a.total)[0];
				if (coverage) return `move ${coverage.attack.slot}`;
			}
		}
		return null;
	}

	private terastallized(fighter: Fighter, type: string): Fighter {
		return { ...fighter, types: [type], stabTypes: [...fighter.stabTypes, type], tera: type };
	}

	/** Niveau 5 : chaque option est notée contre la meilleure riposte probable de l'adversaire. */
	private expertChoice(situation: Situation) {
		const { ours, theirs, threat } = situation;
		const options: { choice: string, score: number }[] = [];
		const variants: { fighter: Fighter, suffix: string, incoming: Threat }[] = [{ fighter: ours, suffix: '', incoming: threat }];
		if (situation.canTera && situation.alive <= 3) {
			const tera = this.terastallized(ours, situation.canTera);
			variants.push({ fighter: tera, suffix: ' terastallize', incoming: this.threat(theirs, tera) });
		}
		for (const { fighter, suffix, incoming } of variants) {
			for (const attack of situation.attacks) {
				options.push({ choice: `move ${attack.slot}${suffix}`, score: this.moveScore(fighter, theirs, attack, incoming, situation) });
			}
		}
		for (const option of situation.switches) {
			const hit = threat.move ? this.damage(theirs, option.fighter, threat.move) * this.accuracy(threat.move) : 0;
			const entry = this.hazardsDamage(option.fighter);
			const left = option.fighter.hp - hit - entry;
			const score = left <= 0 ? -1.5 : -(hit + entry) + 0.6 * this.matchup({ ...option.fighter, hp: left }, theirs) - SWITCH_COST;
			options.push({ choice: `switch ${option.slot}`, score });
		}
		const top = Math.max(...options.map(option => option.score));
		return this.pick(options.filter(option => option.score >= top - 0.01)).choice;
	}

	private moveScore(ours: Fighter, theirs: Fighter, attack: Attack, incoming: Threat, situation: Situation) {
		const { move } = attack;
		const first = this.movesFirst(ours, theirs, move.priority, incoming.priority);
		const theyKill = incoming.raw >= ours.hp;
		if (move.category !== 'Status') {
			const raw = this.damage(ours, theirs, attack.id);
			const accuracy = this.accuracy(attack.id);
			const kills = raw >= theirs.hp;
			const acts = (first || !theyKill) && !this.asleep(ours, move);
			const dealt = Math.min(raw, theirs.hp);
			let score = acts ? accuracy * (dealt + (kills ? KO_BONUS : 0)) : 0;
			const spared = first && kills && accuracy >= 0.9;
			if (!spared) score -= Math.min(incoming.damage, ours.hp) + (theyKill ? KO_BONUS : 0);
			if (move.recoil) score -= dealt * move.recoil[0] / move.recoil[1] * 0.5;
			if (move.drain) score += dealt * move.drain[0] / move.drain[1] * 0.5;
			return score;
		}
		const taken = Math.min(incoming.damage, ours.hp) + (theyKill ? KO_BONUS : 0);
		const survives = (!theyKill || first) && !this.asleep(ours, move);
		let value = 0;
		if (!survives) {
			value = 0;
		} else if (HAZARDS.includes(attack.id)) {
			value = this.side(this.foe).hazards.has(attack.id) ? 0 : 0.08 * this.foesAlive();
		} else if (this.isRecovery(move)) {
			value = this.sleepsToHeal(move) ? 1 - ours.hp - SLEEP_COST : Math.min(0.5, 1 - ours.hp);
		} else if (FIELD_MOVES[attack.id]) {
			value = this.teamBenefits(attack.id, situation) ? 0.35 : 0;
		} else if (this.setupGain(move, ours) > 0) {
			value = incoming.damage <= 0.3 ? 0.25 * this.setupGain(move, ours) : 0;
		} else if (this.statusWorks(move, theirs)) {
			value = 0.3;
		}
		return value - taken;
	}
}

/**
 * IA d'un camp de combat multi (roguelike en coop) : chaque joueur n'a qu'un Pokémon sur le terrain, face à deux
 * adversaires. Elle vise celui qu'elle abîme le plus (un KO d'abord), joue contre lui comme en simple, puis ajoute
 * la position de la cible aux attaques qui en demandent une.
 */
export class MultiTrainingAI extends TrainingAI {
	private focus: string | null = null;

	override get foe() {
		return this.focus ?? super.foe;
	}

	/** Les deux camps d'en face : p2 et p4 pour p1 et p3, et inversement. */
	private foeSides() {
		const half = (Number(this.me.slice(1)) - 1) % 2;
		return [`p${2 - half}`, `p${4 - half}`];
	}

	override decide(request: ChoiceRequest): string {
		this.me = request.side.id;
		const sides = this.foeSides().filter(id => this.side(id).active);
		this.focus = sides[0] ?? null;
		const ourMon = request.side.pokemon.find(mon => mon.active);
		if (sides.length > 1 && ourMon && 'active' in request && request.active && !request.forceSwitch) {
			const ours = this.ourFighter(ourMon);
			const moves = request.active[0].moves.filter(move => !move.disabled && (move.pp ?? 1) > 0).map(move => move.id);
			let best = { id: sides[0], score: -1 };
			for (const id of sides) {
				const track = this.side(id);
				const mon = track.team.get(track.active!);
				if (!mon) continue;
				this.focus = id;
				const theirs = this.theirFighter(mon, true);
				const damage = Math.max(0, ...moves.map(move => this.damage(ours, theirs, move)));
				const score = Math.min(damage, theirs.hp) + (damage >= theirs.hp ? 1 : 0);
				if (score > best.score) best = { id, score };
			}
			this.focus = best.id;
		}
		return this.withTarget(super.decide(request), request);
	}

	private withTarget(choice: string, request: ChoiceRequest) {
		const match = /^move (\d+)( terastallize)?$/.exec(choice);
		if (!match || !this.focus || !('active' in request) || !request.active) return choice;
		const move = this.dex.moves.get(request.active[0].moves[Number(match[1]) - 1]?.id ?? '');
		if (!['normal', 'any', 'adjacentFoe'].includes(move.target)) return choice;
		const location = Number(this.focus.slice(1)) > 2 ? 2 : 1;
		return `move ${match[1]} ${location}${match[2] ?? ''}`;
	}
}

/** Sous ce seuil de PV, un Champion soigne son Pokémon actif avec une potion. */
const POTION_THRESHOLD = 0.33;
/** Un Champion n'utilise son Rappel que si son Pokémon actif peut encaisser le tour perdu. */
const REVIVE_THRESHOLD = 0.7;

/**
 * Champion de la Route des Ligues : il joue comme l'IA de son niveau, et garde ses objets de sac pour le bon moment
 * (2 potions et 1 Rappel par combat, comme le joueur) : une potion quand son Pokémon actif est bas, le Rappel quand
 * un de ses Pokémon est K.O. et que l'actif est en forme.
 */
export class LeaderAI extends TrainingAI {
	override decide(request: ChoiceRequest): string {
		const choice = super.decide(request);
		if (request.wait || request.teamPreview || request.forceSwitch) return choice;
		return this.bagChoice(request, request.bag ?? []) ?? choice;
	}

	private bagChoice(request: MoveRequest, bag: BagRequestData[]): string | null {
		if (!bag.length) return null;
		const team = request.side.pokemon;
		const active = team.findIndex(pokemon => pokemon.active);
		if (active < 0) return null;
		const condition = parseHp(team[active].condition);
		const potions = bag.filter(item => item.kind === 'potion').sort((a, b) => BAG_ITEMS[b.id].amount - BAG_ITEMS[a.id].amount);
		if (potions.length && condition.hp > 0 && condition.hp <= POTION_THRESHOLD) return `item ${potions[0].id} ${active + 1}`;
		const revive = bag.find(item => item.kind === 'revive');
		const fainted = team.findIndex(pokemon => parseHp(pokemon.condition).status === 'fnt');
		if (revive && fainted >= 0 && condition.hp >= REVIVE_THRESHOLD) return `item ${revive.id} ${fainted + 1}`;
		return null;
	}
}

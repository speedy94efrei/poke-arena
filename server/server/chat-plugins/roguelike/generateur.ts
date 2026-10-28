/**
 * Roguelike à étages : tout ce que la seed d'une run décide. Chaque tirage a sa propre clé (seed, étage, usage) :
 * avec la même seed, deux joueurs voient les mêmes départs, les mêmes ennemis et les mêmes récompenses proposées,
 * quels que soient leurs choix.
 */
import { Dex } from '../../../sim/dex';
import type { Archetype, Pokemon as RosterPokemon, Roster } from '../../../../data/types/roster';
import { FORMAT, defaultSet } from '../pokedraft';
import type { Level } from '../entrainement/ia';

export const ROGUE_FORMAT = 'gen9pokedraftroguelike';
export const DUO_FORMAT = 'gen9pokedraftroguelikeduo';
export const LEVEL = 50;
/** Taille d'équipe maximale d'un joueur : 6 en solo, 3 chacun en coop (6 Pokémon par camp en combat multi). */
export const MAX_TEAM = { solo: 6, duo: 3 };

export type Random = () => number;
export type Tier = 'ZU' | 'PU' | 'NU' | 'RU' | 'UU' | 'OU';
export type FloorKind = 'combat' | 'boss' | 'grosboss';
export type BossRule = 'pieges' | 'lead';
export type DoorKind = 'centre' | 'boutique' | 'elite' | 'pension' | 'mystere';
export type SetStyle = 'simple' | 'fiche' | 'optimise';

const TIERS: Tier[] = ['ZU', 'PU', 'NU', 'RU', 'UU', 'OU'];
/** Les tiers BL comptent avec le tier du dessus. */
const TIER_OF: { [tier: string]: Tier } = {
	ZU: 'ZU', ZUBL: 'PU', PU: 'PU', PUBL: 'NU', NU: 'NU', NUBL: 'RU', RU: 'RU', RUBL: 'UU', UU: 'UU', UUBL: 'OU', OU: 'OU',
};
export const BOSS_THEMES = ['Pluie', 'Soleil', 'Sable', 'Neige', 'Distorsion', 'Monotype', 'Stall', 'Hyper offense'] as const;
export type BossTheme = typeof BOSS_THEMES[number];
const BOSS_RULES: BossRule[] = ['pieges', 'lead'];
const TEAM_SIZE = 6;
const DOORS: [DoorKind, number][] = [['centre', 3], ['boutique', 2], ['elite', 2], ['pension', 2], ['mystere', 2]];
/** Objets que les récompenses et la boutique proposent. */
export const ITEMS = [
	'leftovers', 'heavydutyboots', 'sitrusberry', 'rockyhelmet', 'assaultvest', 'focussash', 'lifeorb',
	'choicescarf', 'choiceband', 'choicespecs', 'expertbelt', 'lumberry', 'weaknesspolicy',
];
/** Objets maudits de l'événement mystère : forts, mais avec un défaut. */
export const CURSED_ITEMS = ['lifeorb', 'choiceband', 'choicespecs', 'choicescarf', 'flameorb'];
/** Attaques de statut assez utiles pour qu'une CT les apprenne. */
const USEFUL_STATUS = [
	'stealthrock', 'spikes', 'toxicspikes', 'toxic', 'willowisp', 'thunderwave', 'recover', 'roost', 'slackoff',
	'swordsdance', 'nastyplot', 'calmmind', 'dragondance', 'bulkup', 'quiverdance', 'protect', 'substitute',
	'trickroom', 'raindance', 'sunnyday', 'sandstorm', 'snowscape', 'partingshot', 'taunt', 'encore', 'defog', 'rapidspin',
];
const OFFENSIVE_ROLES = ['Sweeper', 'Nettoyeur', 'Wallbreaker', 'Revenge killer', 'Wallbreaker spécial', 'Sweeper mixte', 'Sweeper spécial', 'Wallbreaker mixte'];

const dex = Dex.forFormat(FORMAT);
const TYPES = dex.types.names();

/** Générateur déterministe : la même clé donne toujours la même suite (hachage xmur3, puis mulberry32). */
export function seeded(key: string): Random {
	let hash = 1779033703 ^ key.length;
	for (let index = 0; index < key.length; index++) {
		hash = Math.imul(hash ^ key.charCodeAt(index), 3432918353);
		hash = (hash << 13) | (hash >>> 19);
	}
	let state = (hash ^ (hash >>> 16)) >>> 0;
	return () => {
		state = (state + 0x6D2B79F5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffle<T>(list: T[], random: Random): T[] {
	const copy = [...list];
	for (let index = copy.length - 1; index > 0; index--) {
		const other = Math.floor(random() * (index + 1));
		[copy[index], copy[other]] = [copy[other], copy[index]];
	}
	return copy;
}

function pickOne<T>(list: T[], random: Random): T {
	return list[Math.floor(random() * list.length)];
}

function weighted<T>(entries: [T, number][], random: Random): T {
	let roll = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
	for (const [value, weight] of entries) {
		roll -= weight;
		if (roll < 0) return value;
	}
	return entries[entries.length - 1][0];
}

/** Seed du défi de la semaine : la même pour tout le monde, du lundi au dimanche (semaine ISO). */
export function weeklySeed(date = new Date()) {
	const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const weekday = day.getUTCDay() || 7;
	day.setUTCDate(day.getUTCDate() + 4 - weekday);
	const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `weekly-${day.getUTCFullYear()}-w${String(week).padStart(2, '0')}`;
}

/** Fin du défi de la semaine en cours : lundi suivant, 0 h UTC. */
export function weeklyEnd(date = new Date()) {
	const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	end.setUTCDate(end.getUTCDate() + (8 - (end.getUTCDay() || 7)));
	return end.getTime();
}

export function rosterTier(pokemon: RosterPokemon): Tier {
	for (const source of [pokemon.tierSmogonFiche, pokemon.tierShowdownActuel]) {
		const match = /\b(UUBL|RUBL|NUBL|PUBL|ZUBL|OU|UU|RU|NU|PU|ZU)\b/.exec(source ?? '');
		if (match) return TIER_OF[match[1]];
	}
	return 'NU';
}

/** Pokémon de la tranche d'étages : ZU et PU jusqu'à l'étage 9, NU en plus jusqu'au 19, tout le roster ensuite. */
export function floorPool(roster: Roster, floor: number) {
	const max = floor < 10 ? 'PU' : floor < 20 ? 'NU' : 'OU';
	return roster.pokemon.filter(pokemon => TIERS.indexOf(rosterTier(pokemon)) <= TIERS.indexOf(max));
}

export function floorKind(floor: number): FloorKind {
	if (floor % 10 === 0) return 'grosboss';
	return floor % 5 === 0 ? 'boss' : 'combat';
}

/** Niveau de l'IA : vise les dégâts (1 à 9), change de Pokémon menacé (10 à 19), joue sa stratégie (20 à 29), IA complète ensuite. Boss et élites : un cran de plus. */
export function aiLevel(floor: number, harder = false): Level {
	const base = floor < 10 ? 2 : floor < 20 ? 3 : floor < 30 ? 4 : 5;
	return Math.min(5, base + (harder ? 1 : 0)) as Level;
}

/** Bonus de stats des ennemis : +5 % tous les 10 étages à partir du 30. */
export function statBonus(floor: number) {
	return floor < 30 ? 0 : 5 * (Math.floor(floor / 10) - 2);
}

export function setStyle(floor: number, harder = false): SetStyle {
	if (harder || floor >= 20) return 'optimise';
	return floor < 10 ? 'simple' : 'fiche';
}

function typesOf(pokemon: RosterPokemon) {
	return dex.species.get(pokemon.id).types;
}

function weaknesses(pokemon: RosterPokemon) {
	const types = typesOf(pokemon);
	return TYPES.filter(type => dex.getImmunity(type, types) && dex.getEffectiveness(type, types) > 0);
}

/** Règle de synergie : jamais plus de 2 Pokémon faibles au même type. */
function keepsSynergy(team: RosterPokemon[], candidate: RosterPokemon) {
	return weaknesses(candidate).every(type => team.filter(member => weaknesses(member).includes(type)).length < 2);
}

/** Tire une équipe dans une liste, dans l'ordre de la liste, en respectant la synergie tant que c'est possible. */
function draftTeam(candidates: RosterPokemon[], size: number, exclude: Set<string> = new Set()) {
	const team: RosterPokemon[] = [];
	const pool = candidates.filter(pokemon => !exclude.has(pokemon.id));
	for (const candidate of pool) {
		if (team.length >= size) break;
		if (keepsSynergy(team, candidate)) team.push(candidate);
	}
	for (const candidate of pool) {
		if (team.length >= size) break;
		if (!team.includes(candidate)) team.push(candidate);
	}
	return team;
}

const NATURE_PLUS: { [nature: string]: StatID } = {
	lonely: 'atk', brave: 'atk', adamant: 'atk', naughty: 'atk', bold: 'def', relaxed: 'def', impish: 'def', lax: 'def',
	timid: 'spe', hasty: 'spe', jolly: 'spe', naive: 'spe', modest: 'spa', mild: 'spa', quiet: 'spa', rash: 'spa',
	calm: 'spd', gentle: 'spd', sassy: 'spd', careful: 'spd',
};

function isDefensive(set: PokemonSet) {
	const plus = NATURE_PLUS[set.nature];
	return plus === 'def' || plus === 'spd';
}

function offensiveSet(pokemon: RosterPokemon, base: PokemonSet): PokemonSet {
	const physical = pokemon.stats.atq >= pokemon.stats.atqSpe;
	const fast = pokemon.stats.vit >= 70;
	const nature = physical ? (fast ? 'jolly' : 'adamant') : (fast ? 'timid' : 'modest');
	const evs = { hp: 4, atk: physical ? 252 : 0, def: 0, spa: physical ? 0 : 252, spd: 0, spe: 252 };
	const item = base.item && !['leftovers', 'heavydutyboots', 'sitrusberry'].includes(base.item) ? base.item : 'lifeorb';
	return { ...base, nature, evs, item };
}

function defensiveSet(pokemon: RosterPokemon, base: PokemonSet): PokemonSet {
	const physical = pokemon.stats.atq >= pokemon.stats.atqSpe;
	const plus = pokemon.stats.def <= pokemon.stats.defSpe ? 'def' : 'spd';
	const nature = plus === 'def' ? (physical ? 'impish' : 'bold') : (physical ? 'careful' : 'calm');
	const evs = { hp: 252, atk: 0, def: plus === 'def' ? 252 : 4, spa: 0, spd: plus === 'spd' ? 252 : 4, spe: 0 };
	return { ...base, nature, evs, item: 'leftovers' };
}

/** Set d'un Pokémon du roster pour le roguelike, au niveau 50. */
export function rogueSet(pokemon: RosterPokemon, style: SetStyle = 'fiche'): PokemonSet {
	const base = { ...defaultSet(pokemon), level: LEVEL };
	if (style === 'simple') return { ...base, item: '' };
	if (style === 'fiche') return base;
	const offensive = pokemon.roles.some(role => OFFENSIVE_ROLES.includes(role));
	if (offensive && isDefensive(base)) return offensiveSet(pokemon, base);
	return base.item ? base : { ...base, item: offensive ? 'lifeorb' : 'leftovers' };
}

/** Les deux sets proposés au départ : celui de la fiche et son contraire (offensif ou défensif). */
export function startSets(pokemon: RosterPokemon): { label: string, set: PokemonSet }[] {
	const base = rogueSet(pokemon, 'fiche');
	return isDefensive(base) ?
		[{ label: 'Défensif · set de la fiche', set: base }, { label: 'Offensif', set: offensiveSet(pokemon, base) }] :
		[{ label: 'Offensif · set de la fiche', set: base }, { label: 'Défensif', set: defensiveSet(pokemon, base) }];
}

/** Les 3 Pokémon tirés au départ d'un joueur (le joueur 2 d'une run en coop a ses propres tirages). */
export function startDraw(roster: Roster, seed: string, player = 0) {
	return shuffle(roster.pokemon, seeded(`${seed}|depart|${player}`)).slice(0, 3);
}

/** Thème du n-ième boss de la run : chaque thème une fois, dans l'ordre tiré par la seed, avant de recommencer. */
export function bossTheme(seed: string, floor: number): BossTheme {
	const order = shuffle([...BOSS_THEMES], seeded(`${seed}|themes`));
	return order[(floor / 5 - 1) % order.length];
}

export function bossRule(seed: string, floor: number): BossRule {
	return pickOne(BOSS_RULES, seeded(`${seed}|regle|${floor}`));
}

/** Type d'un boss monotype : un type porté par au moins 4 Pokémon du roster. */
function monotype(roster: Roster, random: Random) {
	const counts = new Map<string, number>();
	for (const pokemon of roster.pokemon) {
		for (const type of typesOf(pokemon)) counts.set(type, (counts.get(type) ?? 0) + 1);
	}
	const types = [...counts].filter(([, count]) => count >= 4).map(([type]) => type).sort();
	return pickOne(types, random);
}

export interface FloorPlan {
	floor: number;
	kind: FloorKind;
	elite: boolean;
	theme: BossTheme | null;
	/** Type du boss monotype. */
	type: string | null;
	rule: BossRule | null;
	level: Level;
	bonus: number;
	/** Équipe de chaque camp de l'IA : un en solo, deux en coop. */
	teams: PokemonSet[][];
}

/**
 * Ennemis d'un étage. `sizes` : la taille d'équipe de chaque joueur (une équipe d'IA en face de chacun) ;
 * `full` : la taille d'une équipe complète (6 en solo, 3 par joueur en coop). Les étages normaux tirent dans la
 * tranche du roster, les boss dans leur thème, avec une équipe complète.
 */
export function planFloor(roster: Roster, seed: string, floor: number, sizes: number[], elite = false, full = TEAM_SIZE): FloorPlan {
	const kind = floorKind(floor);
	const boss = kind !== 'combat';
	const harder = boss || elite;
	const style = setStyle(floor, harder);
	const random = seeded(`${seed}|etage|${floor}`);
	let theme: BossTheme | null = null;
	let type: string | null = null;
	let ordered: RosterPokemon[];
	if (boss) {
		theme = bossTheme(seed, floor);
		if (theme === 'Monotype') type = monotype(roster, seeded(`${seed}|monotype|${floor}`));
		const themed = roster.pokemon.filter(pokemon => type ? typesOf(pokemon).includes(type) : pokemon.archetypes.includes(theme as Archetype));
		const others = roster.pokemon.filter(pokemon => !themed.includes(pokemon));
		ordered = [...shuffle(themed, random), ...shuffle(others, random)];
	} else if (floor >= 30) {
		const archetype = pickOne([...new Set(roster.pokemon.flatMap(pokemon => pokemon.archetypes))].sort(), random);
		const themed = roster.pokemon.filter(pokemon => pokemon.archetypes.includes(archetype));
		ordered = [...shuffle(themed, random), ...shuffle(roster.pokemon.filter(pokemon => !themed.includes(pokemon)), random)];
	} else {
		ordered = shuffle(floorPool(roster, floor), random);
	}
	const used = new Set<string>();
	const teams = sizes.map((size) => {
		const team = draftTeam(ordered, boss ? full : Math.max(1, Math.min(full, size)), used);
		for (const pokemon of team) used.add(pokemon.id);
		return team.map(pokemon => rogueSet(pokemon, style));
	});
	return {
		floor, kind, elite, theme, type, rule: kind === 'grosboss' ? bossRule(seed, floor) : null,
		level: aiLevel(floor, harder), bonus: statBonus(floor), teams,
	};
}

/** Portes entre deux étages : après les étages 2, 4, 7, 9, 12, 14… (deux portes avant chaque boss). */
export function hasDoors(floor: number) {
	return floor % 5 === 2 || floor % 5 === 4;
}

export function doorsFor(seed: string, floor: number): [DoorKind, DoorKind] {
	const random = seeded(`${seed}|portes|${floor}`);
	const first = weighted(DOORS, random);
	const second = weighted(DOORS.filter(([kind]) => kind !== first), random);
	return [first, second];
}

/** Jetons gagnés à chaque victoire ; le double contre un boss. */
export function tokensFor(floor: number, boss: boolean) {
	return (10 + floor) * (boss ? 2 : 1);
}

export const PRICES = { item: 60, tm: 80 };

/** Attaque qu'une CT peut apprendre à l'un des Pokémon : une attaque offensive d'au moins 70 de puissance, ou un statut utile. */
export function tmCandidates(roster: Roster, team: { species: string, moves: string[] }[]) {
	const byId = new Map(roster.pokemon.map(pokemon => [pokemon.id, pokemon]));
	const moves = new Map<string, string[]>();
	for (const member of team) {
		const pokemon = byId.get(member.species);
		if (!pokemon) continue;
		for (const id of pokemon.movepool) {
			if (member.moves.includes(id)) continue;
			const move = dex.moves.get(id);
			if (!move.exists || move.isNonstandard === 'Unobtainable') continue;
			if (move.category === 'Status' ? !USEFUL_STATUS.includes(move.id) : (move.basePower || 0) < 70) continue;
			moves.set(id, [...(moves.get(id) ?? []), member.species]);
		}
	}
	return [...moves].map(([move, members]) => ({ move, members })).sort((a, b) => a.move.localeCompare(b.move));
}

export type RewardOption =
	{ kind: 'recrue', species: string, set: PokemonSet } |
	{ kind: 'objet', item: string } |
	{ kind: 'ct', move: string, members: string[] } |
	{ kind: 'jetons', amount: number };

/**
 * Les 3 récompenses d'une victoire : recruter un Pokémon de l'équipe battue, un objet, une CT. Les jetons
 * remplacent ce qui ne sert à rien (aucun Pokémon à recruter, aucune CT possible).
 */
export function rewardsFor(
	roster: Roster, seed: string, floor: number, player: number,
	beaten: PokemonSet[], team: { species: string, moves: string[] }[], bossRecruit = false
): RewardOption[] {
	const random = seeded(`${seed}|recompense|${floor}|${player}`);
	const owned = new Set(team.map(member => member.species));
	const options: RewardOption[] = [];
	const recruits = beaten.filter(set => !owned.has(set.species));
	if (recruits.length) {
		const set = bossRecruit ? recruits[0] : pickOne(recruits, random);
		options.push({ kind: 'recrue', species: set.species, set: { ...set, level: LEVEL } });
	}
	options.push({ kind: 'objet', item: pickOne(ITEMS, random) });
	const tms = tmCandidates(roster, team);
	if (tms.length) {
		const tm = pickOne(tms, random);
		options.push({ kind: 'ct', move: tm.move, members: tm.members });
	}
	while (options.length < 3) options.push({ kind: 'jetons', amount: 30 + 3 * floor });
	return options;
}

export interface ShopOffer {
	kind: 'objet' | 'ct';
	id: string;
	price: number;
	members?: string[];
}

export function shopFor(roster: Roster, seed: string, floor: number, team: { species: string, moves: string[] }[]): ShopOffer[] {
	const random = seeded(`${seed}|boutique|${floor}`);
	const offers: ShopOffer[] = shuffle(ITEMS, random).slice(0, 3).map(id => ({ kind: 'objet', id, price: PRICES.item }));
	const tms = tmCandidates(roster, team);
	if (tms.length) {
		const tm = pickOne(tms, random);
		offers.push({ kind: 'ct', id: tm.move, price: PRICES.tm, members: tm.members });
	}
	return offers;
}

export type MysteryEvent =
	{ kind: 'recrue', species: string, set: PokemonSet } |
	{ kind: 'maudit', item: string } |
	{ kind: 'piege', damage: number };

/** Événement mystère : un Pokémon rare à recruter (RU et au-dessus), un objet maudit, ou un piège qui blesse l'équipe. */
export function mysteryFor(roster: Roster, seed: string, floor: number, owned: string[]): MysteryEvent {
	const random = seeded(`${seed}|mystere|${floor}`);
	const kind = weighted<MysteryEvent['kind']>([['recrue', 4], ['maudit', 3], ['piege', 3]], random);
	if (kind === 'recrue') {
		const rare = roster.pokemon.filter(pokemon => TIERS.indexOf(rosterTier(pokemon)) >= TIERS.indexOf('RU') && !owned.includes(pokemon.id));
		if (rare.length) {
			const pokemon = pickOne(rare, random);
			return { kind, species: pokemon.id, set: rogueSet(pokemon, 'optimise') };
		}
	}
	if (kind === 'piege') return { kind, damage: 20 };
	return { kind: 'maudit', item: pickOne(CURSED_ITEMS, random) };
}

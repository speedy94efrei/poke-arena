/**
 * Route des Ligues : données des régions (data/route-des-ligues/<région>.json) et règles pures du mode — Pokédex
 * régional, tirage du banc, niveaux, évolutions, attaques apprises, primes et boutique. Tout est tiré d'une seed.
 */
import { FS } from '../../../lib';
import type { Species } from '../../../sim/dex-species';
import { seeded, shuffle } from '../roguelike/generateur';

export const MOD = 'routedesligues';
export const BENCH_SIZE = 12;
export const TEAM_SIZE = 6;
export const TRADES = 2;
export const MAX_PER_TYPE = 2;
/** Un Pokémon sans évolution dans la région n'est tiré que s'il est déjà assez fort (Tauros, Scarabrute…). */
export const STRONG_BST = 450;
export const ELITE_PRIZE = 5000;
export const CHAMPION_PRIZE = 15000;
const DATA_DIR = '../data/route-des-ligues';

export interface TrainerSet {
	species: string;
	level: number;
	ability: string;
	item?: string;
	nature?: string;
	moves: string[];
}

export interface Trainer {
	id: string;
	name: string;
	type: string;
	sprite: string;
	ai: 1 | 2 | 3 | 4 | 5;
	strategy: string;
	/** Sac du Champion pour le combat, au format de la règle Route Sac (« hyperpotion.2+revive.1 »). */
	bag: string;
	team: TrainerSet[];
	city?: string;
	badge?: string;
	reward?: { tms?: string[], items?: string[], stones?: string[] };
}

export interface ShopEntry {
	id: string;
	kind: 'bag' | 'held' | 'tm';
	price: number;
	/** Arène à partir de laquelle la boutique le vend : « dès l'arène 3 », soit après 2 badges. */
	from: number;
}

export interface Region {
	id: string;
	name: string;
	dex: [number, number];
	mechanic: string;
	tagline: string;
	starters: string[];
	levels: { gyms: number[], league: number, champion: number };
	evolutionBadges: { friendship: number, trade: number };
	gyms: Trainer[];
	elite: Trainer[];
	champion: Trainer & { starters: { [species: string]: TrainerSet } };
	shop: ShopEntry[];
}

/** Les neuf régions dans l'ordre de la Route ; seules celles qui ont un fichier de données sont jouables. */
export const REGIONS: { id: string, name: string, mechanic: string, note: string }[] = [
	{ id: 'kanto', name: 'Kanto', mechanic: 'Aucune mécanique', note: 'La région tutoriel' },
	{ id: 'johto', name: 'Johto', mechanic: 'Objets tenus, Ténèbres et Acier', note: 'Les objets deviennent importants' },
	{ id: 'hoenn', name: 'Hoenn', mechanic: 'Météo et talents', note: 'Un combat double contre Lévy et Tatia' },
	{ id: 'sinnoh', name: 'Sinnoh', mechanic: 'Pièges, physique / spécial', note: 'Des équipes plus défensives' },
	{ id: 'unys', name: 'Unys', mechanic: 'Talents cachés, combats triples', note: 'Un combat triple dans la Ligue' },
	{ id: 'kalos', name: 'Kalos', mechanic: 'Méga-évolution, type Fée', note: 'Une Méga par équipe' },
	{ id: 'alola', name: 'Alola', mechanic: 'Capacités Z', note: '7 épreuves et 4 Doyens au lieu des arènes' },
	{ id: 'galar', name: 'Galar', mechanic: 'Dynamax', note: "Réservé aux arènes et à la Ligue" },
	{ id: 'paldea', name: 'Paldea', mechanic: 'Téracristal', note: '1 Téracristal par combat' },
];

const cache = new Map<string, Region | null>();

export function loadRegion(id: string): Region | null {
	if (!cache.has(id)) {
		const file = FS(`${DATA_DIR}/${toID(id)}.json`);
		cache.set(id, file.existsSync() ? JSON.parse(file.readSync()) as Region : null);
	}
	return cache.get(id) ?? null;
}

export function formatFor(region: Region) {
	return `gen9routedesligues${region.id}`;
}

export function routeDex() {
	return Dex.mod(MOD);
}

const LEGENDARY_TAGS = ['Mythical', 'Sub-Legendary', 'Restricted Legendary', 'Paradox'];

export function inRegion(species: Species, region: Region) {
	return species.num >= region.dex[0] && species.num <= region.dex[1];
}

/** Évolutions d'une espèce qui existent déjà dans la région (numéro inférieur ou égal à son dernier), formes régionales exclues. */
export function evolutionsOf(species: Species, region: Region) {
	const dex = routeDex();
	return species.evos.map(name => dex.species.get(name))
		.filter(evo => evo.exists && !evo.forme && evo.num <= region.dex[1]);
}

/** Pokédex régional du tirage : formes de base de la région, ni légendaires ni fabuleux, qui grandiront. */
export function benchPool(region: Region) {
	const dex = routeDex();
	return dex.species.all().filter(species => (
		inRegion(species, region) && !species.forme && species.name === species.baseSpecies &&
		!['CAP', 'Custom', 'Future', 'Pokestar'].includes(species.isNonstandard ?? '') &&
		!species.tags.some(tag => LEGENDARY_TAGS.includes(tag)) &&
		!(species.prevo && inRegion(dex.species.get(species.prevo), region)) &&
		(evolutionsOf(species, region).length > 0 || species.bst >= STRONG_BST)
	));
}

/** Les 12 Pokémon du banc : au moins un starter, au plus 2 par type principal, tirés d'après la seed de la tentative. */
export function drawBench(region: Region, seed: string): ID[] {
	const random = seeded(`${seed}|banc`);
	const dex = routeDex();
	const starter = shuffle([...region.starters], random)[0]!;
	const picked: ID[] = [toID(starter)];
	const perType = new Map<string, number>([[dex.species.get(starter).types[0], 1]]);
	for (const species of shuffle(benchPool(region), random)) {
		if (picked.length >= BENCH_SIZE) break;
		if (picked.includes(species.id)) continue;
		const type = species.types[0];
		if ((perType.get(type) ?? 0) >= MAX_PER_TYPE) continue;
		perType.set(type, (perType.get(type) ?? 0) + 1);
		picked.push(species.id);
	}
	return shuffle(picked, random);
}

export type Stage = { kind: 'gym', index: number } | { kind: 'elite', index: number } | { kind: 'champion' };

/** Prochain combat d'après les badges et la Ligue déjà franchie (0 à 4 membres du Conseil battus). */
export function stageOf(badges: number, league: number): Stage {
	if (badges < 8) return { kind: 'gym', index: badges };
	if (league < 4) return { kind: 'elite', index: league };
	return { kind: 'champion' };
}

export function trainerFor(region: Region, stage: Stage): Trainer {
	if (stage.kind === 'gym') return region.gyms[stage.index];
	if (stage.kind === 'elite') return region.elite[stage.index];
	return region.champion;
}

/** Niveau de l'équipe du joueur pour ce combat : c'est le badge qui fait monter le niveau, pas l'expérience. */
export function teamLevel(region: Region, stage: Stage) {
	if (stage.kind === 'gym') return region.levels.gyms[stage.index];
	return stage.kind === 'elite' ? region.levels.league : region.levels.champion;
}

/** Prime d'une victoire : 1 000 × n pour l'arène n, 5 000 par membre du Conseil, 15 000 pour le Maître (pour la région suivante). */
export function prizeFor(stage: Stage) {
	if (stage.kind === 'gym') return 1000 * (stage.index + 1);
	return stage.kind === 'elite' ? ELITE_PRIZE : CHAMPION_PRIZE;
}

/** Nom du bot qui joue le Champion : « Champion Pierre », « Conseil Olga », « Maître Blue » (18 caractères au plus). */
export function botName(trainer: Trainer, stage: Stage) {
	const title = stage.kind === 'gym' ? 'Champion' : stage.kind === 'elite' ? 'Conseil' : 'Maître';
	return `${title} ${trainer.name}`.slice(0, 18);
}

export interface Evolution {
	to: ID;
	/** Ce qui la déclenche : le niveau atteint, une pierre du sac, ou un badge (échange, bonheur). */
	by: 'level' | 'stone' | 'badge';
	level?: number;
	stone?: ID;
	badge?: number;
}

/** Comment chaque évolution d'une espèce se débloque dans la région. */
export function evolutionPaths(speciesId: string, region: Region): Evolution[] {
	const dex = routeDex();
	return evolutionsOf(dex.species.get(speciesId), region).map((evo): Evolution => {
		if (!evo.evoType && evo.evoLevel) return { to: evo.id, by: 'level', level: evo.evoLevel };
		if (evo.evoType === 'useItem' && evo.evoItem) return { to: evo.id, by: 'stone', stone: toID(evo.evoItem) };
		if (evo.evoType === 'levelFriendship') return { to: evo.id, by: 'badge', badge: region.evolutionBadges.friendship };
		return { to: evo.id, by: 'badge', badge: region.evolutionBadges.trade };
	});
}

/** Évolution que le Pokémon peut faire maintenant, sans pierre : niveau atteint, ou badge de l'échange et du bonheur. */
export function readyEvolution(speciesId: string, region: Region, level: number, badges: number) {
	return evolutionPaths(speciesId, region).find(path => (
		(path.by === 'level' && path.level! <= level) || (path.by === 'badge' && path.badge! <= badges)
	)) ?? null;
}

/** Stade normal d'un Pokémon à ce niveau et ce nombre de badges (départ de région, échange à l'aveugle). */
export function stageForLevel(speciesId: string, region: Region, level: number, badges: number): ID {
	let current = toID(speciesId);
	for (let step = 0; step < 3; step++) {
		const next = readyEvolution(current, region, level, badges);
		if (!next) break;
		current = next.to;
	}
	return current;
}

/** La lignée d'une espèce, elle comprise : ses attaques de niveau restent connues après l'évolution. */
function lineage(speciesId: string) {
	const dex = routeDex();
	const line: Species[] = [];
	let species = dex.species.get(speciesId);
	while (species.exists && line.length < 4) {
		line.push(species);
		species = species.prevo ? dex.species.get(species.prevo) : dex.species.get('');
	}
	return line;
}

/** Attaques apprises par niveau, d'après la génération la plus récente qui a des données pour l'espèce. */
function levelUpMoves(species: Species): { move: ID, level: number }[] {
	const learnset = routeDex().species.getLearnsetData(species.id).learnset ?? {};
	const entries = Object.entries(learnset).flatMap(([move, sources]) => sources
		.map(source => /^(\d)L(\d+)$/.exec(source))
		.filter((match): match is RegExpExecArray => Boolean(match))
		.map(match => ({ move: move as ID, gen: Number(match[1]), level: Number(match[2]) })));
	const gen = Math.max(0, ...entries.map(entry => entry.gen));
	return entries.filter(entry => entry.gen === gen).map(({ move, level }) => ({ move, level }));
}

/** Attaques qu'un Pokémon connaît à ce niveau (sa lignée comprise), plus les CT débloquées qu'il peut apprendre. */
export function knownMoves(speciesId: string, level: number, tms: string[] = []): ID[] {
	const dex = routeDex();
	const known = new Set<ID>();
	for (const species of lineage(speciesId)) {
		for (const entry of levelUpMoves(species)) {
			if (entry.level <= level && dex.moves.get(entry.move).exists) known.add(entry.move);
		}
	}
	for (const tm of tms) {
		if (lineage(speciesId).some(species => routeDex().species.getLearnsetData(species.id).learnset?.[tm])) known.add(toID(tm));
	}
	return [...known];
}

/** Les 4 attaques de départ : les plus puissantes avec le bonus de type, puis la meilleure attaque de statut. */
export function defaultMoves(speciesId: string, level: number, tms: string[] = []): ID[] {
	const dex = routeDex();
	const species = dex.species.get(speciesId);
	const moves = knownMoves(speciesId, level, tms).map(id => dex.moves.get(id));
	const damaging = moves.filter(move => move.category !== 'Status' && move.basePower > 0)
		.map(move => ({
			id: move.id,
			type: move.type,
			score: move.basePower * (species.types.includes(move.type) ? 1.5 : 1) * (move.accuracy === true ? 1 : move.accuracy / 100),
		}))
		.sort((a, b) => b.score - a.score);
	const picked: ID[] = [];
	for (const move of damaging) {
		if (picked.length >= 3) break;
		if (picked.some(id => dex.moves.get(id).type === move.type)) continue;
		picked.push(move.id);
	}
	const status = moves.filter(move => move.category === 'Status').sort((a, b) => (b.flags.heal ? 1 : 0) - (a.flags.heal ? 1 : 0));
	for (const move of [...damaging.map(entry => dex.moves.get(entry.id)), ...status]) {
		if (picked.length >= 4) break;
		if (!picked.includes(move.id)) picked.push(move.id);
	}
	return picked;
}

/** Starter du Maître : celui qui frappe le mieux l'équipe gardée par le joueur, et la craint le moins. */
export function counterStarter(region: Region, team: string[]): string {
	const dex = routeDex();
	const typesOf = (id: string) => dex.species.get(id).types;
	const scored = Object.keys(region.champion.starters).map((starter) => {
		const mine = typesOf(starter);
		const score = team.reduce((sum, member) => {
			const theirs = typesOf(member);
			const offense = Math.max(...mine.map(type => dex.getEffectiveness(type, theirs)));
			const defense = Math.max(...theirs.map(type => dex.getEffectiveness(type, mine)));
			return sum + offense - defense;
		}, 0);
		return { starter, score };
	});
	return scored.sort((a, b) => b.score - a.score)[0]!.starter;
}

/** Ce que la boutique propose avec ce nombre de badges : ce qui est en vente dès l'arène à affronter. */
export function shopFor(region: Region, badges: number) {
	return region.shop.filter(entry => entry.from <= badges + 1);
}

/** Pokémon reçu par un échange à l'aveugle : tiré dans le Pokédex régional, au stade normal pour le niveau de l'équipe. */
export function blindTrade(region: Region, seed: string, team: string[], level: number, badges: number): ID {
	const owned = new Set(team.map(id => lineage(id).map(species => species.id)).flat());
	const pool = benchPool(region).filter(species => !owned.has(species.id));
	const pick = shuffle(pool, seeded(`${seed}|echange|${team.join(',')}`))[0];
	return stageForLevel(pick?.id ?? region.starters[0], region, level, badges);
}

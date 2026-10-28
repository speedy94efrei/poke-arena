/**
 * Sets supposés hors PokéDraft : le set le plus joué de chaque espèce d'après les statistiques Smogon du format
 * (data/references/usage), sinon ses attaques de Random Battle.
 */
import { FS } from '../../../lib';
import { Dex, toID } from '../../../sim/dex';
import type { SetSource } from './ia';

type Share = [string, number];

interface UsageEntry {
	id: string;
	items: Share[];
	abilities: Share[];
	moves: Share[];
	tera: Share[];
	spreads: Share[];
}

interface RandomSets {
	[species: string]: { level?: number, sets: { movepool: string[], abilities: string[], teraTypes?: string[] }[] };
}

const USAGE_DIR = '../data/references/usage';
const RANDOM_SETS = 'data/random-battles/gen9/sets.json';
const STATS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const MAX_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const usageCache = new Map<string, Map<string, UsageEntry> | null>();
let usageFiles: string[] | null = null;
let randomSets: RandomSets | null = null;

/** Fichier de statistiques du format : le même, ou le plus proche par préfixe (`gen9vgc2026regf` donne `gen9vgc2026`). */
function usageFileOf(format: string): string | null {
	usageFiles ??= FS(USAGE_DIR).readdirIfExistsSync().filter(file => /^gen\d.+\.json$/.test(file)).map(file => file.slice(0, -5));
	if (usageFiles.includes(format)) return format;
	return usageFiles.filter(file => format.startsWith(file)).sort((a, b) => b.length - a.length)[0] ?? null;
}

function usageOf(format: string) {
	if (!usageCache.has(format)) {
		const file = usageFileOf(format);
		let entries: Map<string, UsageEntry> | null = null;
		if (file) {
			const data = JSON.parse(FS(`${USAGE_DIR}/${file}.json`).readSync()) as { pokemon: UsageEntry[] };
			entries = new Map(data.pokemon.map(entry => [entry.id, entry]));
		}
		usageCache.set(format, entries);
	}
	return usageCache.get(format)!;
}

function randomSetsOf() {
	randomSets ??= JSON.parse(FS(RANDOM_SETS).readIfExistsSync() || '{}') as RandomSets;
	return randomSets;
}

/** Lit une répartition Smogon « Jolly:0/252/4/0/0/252 ». */
function spreadOf(spread: string | undefined) {
	const [nature = 'serious', values = ''] = (spread ?? '').split(':');
	const numbers = values.split('/').map(Number);
	const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
	STATS.forEach((stat, index) => {
		evs[stat] = numbers[index] || 0;
	});
	return { nature: toID(nature) || 'serious', evs };
}

/** Le set le plus joué d'une espèce dans le format, ou `null` si les statistiques ne la connaissent pas. */
export function usageSet(format: string, species: string, level = 100): PokemonSet | null {
	const entry = usageOf(format)?.get(species);
	if (!entry) return null;
	const { nature, evs } = spreadOf(entry.spreads[0]?.[0]);
	const pick = (shares: Share[]) => shares.find(([id]) => id && id !== 'nothing')?.[0] ?? '';
	return {
		name: species, species, item: pick(entry.items), ability: pick(entry.abilities),
		moves: entry.moves.map(([id]) => id).filter(id => id && id !== 'nothing').slice(0, 4),
		nature, gender: '', evs, ivs: MAX_IVS, level, teraType: entry.tera[0]?.[0],
	};
}

/** Sets d'un format : statistiques Smogon d'abord, puis le premier rôle de Random Battle de l'espèce. */
export function smogonSets(format: string, level = 100): SetSource {
	const dex = Dex.forFormat(format);
	return (species) => {
		const fromUsage = usageSet(format, species, level);
		if (fromUsage) return fromUsage;
		const data = dex.species.get(species);
		const random = randomSetsOf()[species] ?? randomSetsOf()[toID(data.baseSpecies)];
		const role = random?.sets[0];
		if (!data.exists || !role) return null;
		return {
			name: species, species, item: '', ability: toID(role.abilities[0] ?? ''), moves: role.movepool.slice(0, 4).map(toID),
			nature: 'serious', gender: '', evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 }, ivs: MAX_IVS,
			level: random.level ?? level, teraType: role.teraTypes?.[0],
		};
	};
}

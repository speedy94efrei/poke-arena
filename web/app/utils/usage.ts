type Share = [string, number]

export interface UsagePokemon {
  id: string
  usage: number
  items: Share[]
  abilities: Share[]
  moves: Share[]
  tera: Share[]
  spreads: Share[]
  teammates: Share[]
  counters: Share[]
}

export interface UsageData {
  format: string
  battles: number
  pokemon: UsagePokemon[]
  styles: Share[]
}

const files = import.meta.glob<UsageData>('../../../data/references/usage/gen*.json', { import: 'default' })
const byFormat = new Map(Object.entries(files).map(([path, load]) => [path.split('/').pop()!.replace(/\.json$/, ''), load]))

/** Format dont on a les statistiques : le même, ou le plus proche par préfixe (`gen9vgc2026regf` donne `gen9vgc2026`). */
export function usageFormat(format: string): string | null {
  if (byFormat.has(format)) return format
  let best: string | null = null
  for (const candidate of byFormat.keys()) {
    if (format.startsWith(candidate) && (!best || candidate.length > best.length)) best = candidate
  }
  return best
}

/** Statistiques d'usage Smogon du format (Pokémon les plus joués, sets, styles d'équipe), ou `null` s'il n'y en a pas. */
export async function loadUsage(format: string): Promise<UsageData | null> {
  const source = usageFormat(format)
  return source ? await byFormat.get(source)!() : null
}

const STYLES: Record<string, string> = {
  weatherless: 'Sans météo', hyperoffense: 'Hyper offense', offense: 'Offense', balance: 'Balance', semistall: 'Semi-stall',
  stall: 'Stall', voltturn: 'Volt-Turn', rain: 'Pluie', rainoffense: 'Pluie offensive', rainstall: 'Pluie défensive',
  sun: 'Soleil', sunoffense: 'Soleil offensif', sunstall: 'Soleil défensif', sand: 'Sable', sandoffense: 'Sable offensif',
  sandstall: 'Sable défensif', hail: 'Neige', hailoffense: 'Neige offensive', hailstall: 'Neige défensive', trickroom: 'Distorsion',
  trickrain: 'Pluie et Distorsion', tricksun: 'Soleil et Distorsion', multiweather: 'Plusieurs météos', choice: 'Objets Choix',
  tailwind: 'Vent Arrière', gravity: 'Gravité', webs: 'Toile Gluante', dragmag: 'Dragmag', monotype: 'Monotype',
  swagplay: 'Swagplay', batonpass: 'Relais', allweather: 'Toutes météos',
}

const MONO_TYPES: Record<string, string> = {
  bug: 'Insecte', dark: 'Ténèbres', dragon: 'Dragon', electric: 'Électrik', fairy: 'Fée', fighting: 'Combat', fire: 'Feu',
  flying: 'Vol', ghost: 'Spectre', grass: 'Plante', ground: 'Sol', ice: 'Glace', normal: 'Normal', poison: 'Poison',
  psychic: 'Psy', rock: 'Roche', steel: 'Acier', water: 'Eau',
}

/** Nom français d'un style d'équipe Smogon (tags « metagame » des statistiques). */
export function styleLabel(tag: string): string {
  if (tag.startsWith('mono') && MONO_TYPES[tag.slice(4)]) return `Mono ${MONO_TYPES[tag.slice(4)]}`
  return STYLES[tag] ?? tag
}

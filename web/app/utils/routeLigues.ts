export type RoutePhase = 'tirage' | 'carte' | 'evolution' | 'fin'
export type RouteStage = { kind: 'gym', index: number } | { kind: 'elite', index: number } | { kind: 'champion' }

export interface RouteEvolution {
  to: string
  by: 'level' | 'stone' | 'badge'
  level?: number
  stone?: string
  badge?: number
}

export interface RouteRegion {
  id: string
  name: string
  mechanic: string
  note: string
  open: boolean
  completed: boolean
  unlocked: boolean
  attempts: number
}

export interface RouteMember {
  species: string
  moves: string[]
  item: string
  hp: number
  status: string
  known: string[]
  evolutions: RouteEvolution[]
}

export interface RouteTrainer {
  id: string
  name: string
  type: string
  city: string | null
  badge: string | null
  sprite: string
  strategy: string
  bag: string
  done: boolean
  current: boolean
  level: number
  teamLevel: number
  team: { species: string, level: number }[]
  reward: { tms?: string[], items?: string[], stones?: string[] } | null
  prize: number
}

export interface RouteShopEntry {
  id: string
  kind: 'bag' | 'held' | 'tm'
  price: number
  from: number
  available: boolean
}

export interface RouteRun {
  region: string
  name: string
  mechanic: string
  tagline: string
  attempt: number
  phase: RoutePhase
  badges: number
  league: number
  level: number
  money: number
  trades: number
  championRetry: boolean
  battle: string | null
  bag: Record<string, number>
  held: string[]
  tms: string[]
  stones: string[]
  history: { at: number, text: string }[]
  draw: { species: string, evolutions: RouteEvolution[], starter: boolean }[]
  team: RouteMember[]
  evolutions: { index: number, to: string }[]
  next: { stage: RouteStage, trainer: RouteTrainer } | null
  gyms: RouteTrainer[]
  elite: RouteTrainer[]
  champion: RouteTrainer
  shop: RouteShopEntry[]
}

export interface RouteState {
  type: 'state'
  regions: RouteRegion[]
  run: RouteRun | null
  bonus: number
  defeat: { region: string, against: string, attempt: number } | null
  error?: string
}

/** Objets de sac utilisables en combat : leur nom en français, et celui du simulateur dans le journal. */
export const BAG_ITEMS: { [id: string]: { nom: string, anglais: string, effet: string } } = {
  potion: { nom: 'Potion', anglais: 'Potion', effet: 'Soigne 25 % en combat' },
  superpotion: { nom: 'Super Potion', anglais: 'Super Potion', effet: 'Soigne 50 % en combat' },
  hyperpotion: { nom: 'Hyper Potion', anglais: 'Hyper Potion', effet: 'Soigne 100 % en combat' },
  revive: { nom: 'Rappel', anglais: 'Revive', effet: 'Ramène un Pokémon K.O. à 50 %' },
}

export function trainerSprite(sprite: string): string {
  return `https://play.pokemonshowdown.com/sprites/trainers/${sprite}.png`
}

export function money(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} ₽`
}

/** Le combat à venir, en toutes lettres : « Arène 5 », « Conseil 4 · 2/4 », « Maître ». */
export function stageLabel(stage: RouteStage): string {
  if (stage.kind === 'gym') return `Arène ${stage.index + 1}`
  return stage.kind === 'elite' ? `Conseil 4 · ${stage.index + 1}/4` : 'Maître'
}

/** Ligne du journal de la région : le serveur écrit les espèces {id}, affichées ici avec leur nom français. */
export function historyText(text: string, name: (id: string) => string): string {
  return text.replace(/\{([a-z0-9]+)\}/g, (_, id: string) => name(id))
}

/** Comment un Pokémon évolue dans la région : « Évolue au N.16 », « Pierre Eau », « au badge 6 ». */
export function evolutionText(evolutions: RouteEvolution[], name: (id: string) => string, item: (id: string) => string): string {
  if (!evolutions.length) return 'Sans évolution, déjà fort'
  return evolutions.map((evolution) => {
    if (evolution.by === 'level') return `${name(evolution.to)} au N.${evolution.level}`
    if (evolution.by === 'stone') return `${name(evolution.to)} avec ${item(evolution.stone!)}`
    return `${name(evolution.to)} au badge ${evolution.badge}`
  }).join(', ')
}

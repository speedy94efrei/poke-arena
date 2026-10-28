/** Roguelike à étages : l'état d'une run tel que le serveur de combat l'envoie (`server/server/chat-plugins/roguelike`). */
export type RoguelikePhase = 'depart' | 'combat' | 'recompense' | 'porte' | 'boutique' | 'pension' | 'mystere' | 'fin'
export type DoorKind = 'centre' | 'boutique' | 'elite' | 'pension' | 'mystere'

export interface RogueMember {
  species: string
  hp: number
  status: string
  learned: string[]
  item: string
  ability: string
  nature: string
  moves: string[]
}

export type RewardOption =
  { kind: 'recrue', species: string, set: { moves: string[], item: string, nature: string } }
  | { kind: 'objet', item: string }
  | { kind: 'ct', move: string, members: string[] }
  | { kind: 'jetons', amount: number }

export interface RoguePlayer {
  id: string
  name: string
  ready: boolean
  recruited: number
  lost: { species: string, floor: number }[]
  bag: string[]
  pensionUsed: boolean
  mysteryDone: boolean
  team: RogueMember[]
  draw: { species: string, sets: { label: string, item: string, nature: string, moves: string[] }[] }[]
  rewards: { options: RewardOption[], picks: number } | null
}

export interface TowerFloor {
  floor: number
  kind: 'combat' | 'boss' | 'grosboss'
  theme: string | null
  rule: 'pieges' | 'lead' | null
  state: 'gagne' | 'en-cours' | 'a-venir'
  species: string[]
}

export interface RoguelikeRun {
  id: string
  mode: 'libre' | 'semaine'
  duo: boolean
  seed: string
  floor: number
  phase: RoguelikePhase
  me: number
  tokens: number
  turns: number
  wins: number
  elite: boolean
  maxTeam: number
  doors: [DoorKind, DoorKind] | null
  shop: { offers: { kind: 'objet' | 'ct', id: string, price: number, members?: string[] }[], bought: number[] } | null
  mystery: { kind: 'recrue', species: string } | { kind: 'maudit', item: string } | { kind: 'piege', damage: number } | null
  battle: string | null
  next: { kind: TowerFloor['kind'], elite: boolean, theme: string | null, type: string | null, rule: TowerFloor['rule'], level: number, bonus: number, sizes: number[] } | null
  tower: TowerFloor[]
  players: RoguePlayer[]
  history: { floor: number, icon: string, text: string }[]
  result: { text: string } | null
}

export interface RogueScore {
  rank: number
  mine: boolean
  names: string[]
  floor: number
  turns: number
}

export interface RoguelikeState {
  type: 'state'
  run: RoguelikeRun | null
  records: { libre: number, runs: number, semaine: number, duo: number }
  weekly: {
    seed: string
    endsAt: number
    solo: { top: RogueScore[], mine: RogueScore | null, count: number }
    duo: { top: RogueScore[], mine: RogueScore | null, count: number }
  }
  invite: { from: string, mode: 'libre' | 'semaine' } | null
  sent: { to: string, mode: 'libre' | 'semaine' } | null
  bots: number
  error?: string
}

interface DoorInfo {
  title: string
  tag: string
  text: string
  icon: string
  color: string
}

export const DOORS: { [kind in DoorKind]: DoorInfo } = {
  centre: { title: 'Centre Pokémon', tag: 'Soin complet', text: "Soigne toute l'équipe : PV et statuts. Aucune récompense.", icon: '✚', color: '#e0507a' },
  boutique: { title: 'Boutique', tag: 'Jetons', text: 'Échange tes jetons contre des objets ou une CT.', icon: '$', color: '#2f9a58' },
  elite: { title: "Combat d'élite", tag: 'Risqué · meilleure récompense', text: "L'étage suivant oppose une équipe aux sets optimisés et une IA plus forte. 2 récompenses au lieu d'une.", icon: '★', color: '#7a52c8' },
  pension: { title: 'Pension', tag: 'Réglages', text: "Change la nature et les attaques d'un Pokémon, parmi tout son movepool.", icon: '⌂', color: '#c8862a' },
  mystere: { title: 'Événement mystère', tag: 'Au hasard', text: 'Un Pokémon rare à recruter, un objet maudit, ou un piège.', icon: '?', color: '#3a6fc8' },
}

export const BOSS_RULES: { [rule in 'pieges' | 'lead']: string } = {
  pieges: 'Piège de Roc et Picots déjà posés de ton côté',
  lead: 'Son Pokémon de tête commence à +1 partout',
}

/** Thème d'un boss, en clair. */
export function themeLabel(theme: string | null, type?: string | null) {
  if (!theme) return ''
  return theme === 'Monotype' ? `Monotype ${type ? frenchType(type) : ''}`.trim() : theme
}

/** Libellé d'un étage de la tour. */
export function floorTitle(floor: Pick<TowerFloor, 'kind' | 'theme'>) {
  if (floor.kind === 'grosboss') return `Gros boss · ${themeLabel(floor.theme)}`
  if (floor.kind === 'boss') return `Boss · ${themeLabel(floor.theme)}`
  return 'Combat'
}

/** Code de statut court affiché sur les cartes (« BRÛ », « PAR »…). */
export function statusLabel(status: string) {
  return STATUS_LABELS[status]?.court ?? ''
}

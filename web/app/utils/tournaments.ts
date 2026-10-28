import type { BracketData } from '~/utils/chatRooms'

export type TourType = 'elimination' | 'double' | 'roundrobin'
export type TourStatus = 'planned' | 'open' | 'started' | 'ended' | 'past'

export interface ArenaEvent {
  id: string
  name: string
  format: string
  formatName: string
  type: TourType
  cap: number
  startsAt: number
  rules: string[]
  author: string | null
  regular: boolean
  roomid: string | null
  status: TourStatus
  players: string[]
  /** Nombre d'inscrits, gardé après la fin du tournoi. */
  count: number
  joined: boolean
  bracket: BracketData | null
  winner: string | null
}

export interface ArenaResult {
  id: string
  name: string
  format: string
  winner: string
  finalist: string | null
  players: number
  at: number
}

export interface ArenaCalendar {
  now: number
  registration: number
  clauses: string[]
  caps: number[]
  events: ArenaEvent[]
  results: ArenaResult[]
}

export interface ArenaProposal {
  name: string
  format: string
  type: TourType
  cap: number
  startsAt: number
  rules: Record<string, boolean>
}

const TYPES: Record<TourType, string> = { elimination: 'Élimination directe', double: 'Double élimination', roundrobin: 'Toutes rondes' }
const CLAUSES: Record<string, string> = {
  'Sleep Clause Mod': 'Clause Sommeil', 'Species Clause': 'Clause Espèce', 'Evasion Moves Clause': 'Clause Esquive',
  'OHKO Clause': 'Clause K.O. en un coup', 'Team Preview': 'Aperçu des équipes', 'Item Clause': 'Clause Objet',
}
const STATUS: Record<TourStatus, string> = { planned: 'À venir', open: 'Inscriptions ouvertes', started: 'En cours', ended: 'Terminé', past: 'Passé' }

export function tourTypeLabel(type: TourType): string {
  return TYPES[type] ?? type
}

export function clauseLabel(clause: string): string {
  return CLAUSES[clause] ?? clause
}

/** Règle d'un tournoi en français : « Item Clause = 1 » ajoutée, « !Team Preview » retirée. */
export function ruleLabel(rule: string): string {
  const name = rule.replace(/^!/, '').replace(/ = .*$/, '')
  return rule.startsWith('!') ? `Sans ${clauseLabel(name).toLowerCase()}` : clauseLabel(name)
}

export function tourStatusLabel(status: TourStatus): string {
  return STATUS[status] ?? status
}

/** Date d'un tournoi : « lundi 2 nov. · 21h00 ». */
export function tourDate(time: number): string {
  const date = new Date(time)
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
  return `${day} · ${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`
}

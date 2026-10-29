export type TierKey = 'poke' | 'super' | 'hyper' | 'honor' | 'luxe' | 'master' | 'champion' | 'placement'

export interface RankInfo {
  tier: TierKey
  tier_name: string
  division: string | null
  label: string
  points: number
  total: number
}

export interface LadderEventInfo {
  type: 'victoire' | 'defaite' | 'egalite' | 'abandon' | 'inactivite'
  points_delta: number
  points_after: number
  opponent: string | null
  opponent_id: string | null
  note: string | null
  at: string
}

export interface BannerInfo {
  key: string
  name: string
  condition: string
  unlocked: boolean
  equipped: boolean
}

export interface PlayerCard {
  name: string
  showdown_id: string
  banner: string
  season: number
  rank: RankInfo & { placed: boolean }
  next: { label: string, points_needed: number } | null
  placement: { played: number, needed: number }
  position: number | null
  players: number
  top_percent: number | null
  record: { wins: number, losses: number, ties: number }
  streak: number
  banners: BannerInfo[]
  past_seasons: { number: number, name: string, rank: string, wins: number, losses: number }[]
}

export interface Profile extends PlayerCard {
  shield_games: number
  abandons: { abandons: number, wait_seconds: number }
  decay: { concerned: boolean, idle_days: number | null }
  history: LadderEventInfo[]
}

export interface PlayerDraft {
  room_id: string
  result: 'victoire' | 'defaite' | 'egalite'
  points_delta: number | null
  note: string | null
  turns: number
  opponent: { name: string, showdown_id: string }
  team: string[]
  opponent_team: string[]
  at: string
}

export interface PublicProfile extends PlayerCard {
  peak: string | null
  signature: { pokemon: string, picks: number, win_rate: number | null }[]
  bans: { pokemon: string, bans: number }[]
  drafts: PlayerDraft[]
}

export interface SeasonInfo {
  number: number
  name: string
  patch: string
  starts_at: string
  ends_at: string
}

export interface LadderRow {
  position: number
  name: string
  showdown_id: string
  banner: string
  rank: RankInfo
  wins: number
  losses: number
}

export interface TierShare {
  tier: TierKey
  name: string
  players: number
  share: number
}

export interface PokemonStat {
  pokemon: string
  picks: number
  bans: number
  presence: number
  ban_rate: number
  win_rate: number | null
}

export interface Duo {
  pokemon: [string, string]
  teams: number
  share: number
}

export const TIERS: { key: TierKey, level: number, ink: string, ball: string, divisions: string }[] = [
  { key: 'poke', level: 0, ink: '#ff9a8a', ball: 'poke-ball', divisions: 'III · II · I' },
  { key: 'super', level: 1, ink: '#8cc0ff', ball: 'great-ball', divisions: 'III · II · I' },
  { key: 'hyper', level: 2, ink: '#ffd23a', ball: 'ultra-ball', divisions: 'III · II · I' },
  { key: 'honor', level: 3, ink: '#ff8a7a', ball: 'premier-ball', divisions: 'III · II · I' },
  { key: 'luxe', level: 4, ink: '#f0c040', ball: 'luxury-ball', divisions: 'III · II · I · −25 PL/j si inactif' },
  { key: 'master', level: 5, ink: '#d8a8ff', ball: 'master-ball', divisions: 'Au-dessus de Luxe I' },
  { key: 'champion', level: 6, ink: '#ffd970', ball: 'master-ball', divisions: 'Top 10 des Master Ball' },
]

export const PLACEMENT_TIER = { key: 'placement' as const, level: 0, ink: '#c8d0dc', ball: 'poke-ball', divisions: '' }

export const BANNER_BACKGROUNDS: Record<string, string> = {
  depart: 'repeating-linear-gradient(135deg, #3a3f4a 0 12px, #30343e 12px 24px)',
  poke: 'radial-gradient(circle, #fff 0 4px, #222 4px 6px, transparent 6px) 0 0 / 34px 34px, linear-gradient(120deg, #c8362a, #6a160e)',
  super: 'repeating-linear-gradient(115deg, #2a62b8 0 22px, #3a7fd8 22px 44px, #c8362a 44px 50px)',
  hyper: 'linear-gradient(115deg, transparent 0 56%, #f8d030 56% 60%, transparent 60% 66%, #f8d030 66% 70%, transparent 70%), linear-gradient(120deg, #1a1a1a, #3a3a3a)',
  honor: 'linear-gradient(115deg, #f4f4f4 0 40%, #c8362a 40% 47%, #f4f4f4 47%)',
  luxe: 'linear-gradient(115deg, #111 0 45%, #f0c040 45% 50%, #c8362a 50% 52%, #111 52%)',
  master: 'radial-gradient(circle at 78% 30%, #ff7ad8 0 7%, transparent 8%), radial-gradient(circle at 90% 70%, #ff7ad8 0 6%, transparent 7%), linear-gradient(120deg, #3a1272, #8a3ac8)',
  champion: 'conic-gradient(from 200deg at 85% 50%, #ffd970, #c8362a, #7a3ac8, #ffd970)',
}

export function tierStyle(key: TierKey) {
  return TIERS.find(tier => tier.key === key) ?? PLACEMENT_TIER
}

export function ballSprite(key: TierKey): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${tierStyle(key).ball}.png`
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits).replace('.', ',')} %`
}

export function eventLabel(type: LadderEventInfo['type']): string {
  return { victoire: 'Victoire', defaite: 'Défaite', egalite: 'Égalité', abandon: 'Abandon du draft', inactivite: 'Inactivité' }[type]
}

export function signed(value: number): string {
  return value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0'
}

export function playerPath(showdownId: string): string {
  return `/pokedraft/joueur/${showdownId}`
}

export function relativeDate(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'hier' : `il y a ${days} j`
}

import type { BattleState } from '~/utils/battleTracker'

const STORAGE_KEY = 'arene-historique-classique'
const MAX_ENTRIES = 200

export interface PlayedBattle {
  roomid: string
  format: string
  formatName: string
  opponent: string
  result: 'victoire' | 'defaite' | 'egalite'
  turns: number
  at: string
  /** Elo après le combat et son écart, pour un combat classé. */
  elo?: number
  delta?: number
  /** Espèces de l'équipe jouée. */
  team?: string[]
}

function load(): PlayedBattle[] {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as PlayedBattle[]
    return Array.isArray(entries) ? entries : []
  } catch {
    return []
  }
}

/**
 * Derniers combats Classique joués dans ce navigateur, avec l'Elo gagné ou perdu dans les combats classés.
 */
export function useBattleHistory() {
  const history = useState<PlayedBattle[]>('classic-history', () => import.meta.client ? load() : [])

  const persist = (next: PlayedBattle[]) => {
    history.value = next.slice(0, MAX_ENTRIES)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
    } catch {
      return
    }
  }

  const ratingOf = (battle: BattleState) => battle.mySide ? battle.ratings[toId(battle.sides[battle.mySide].name)] : undefined

  const record = (battle: BattleState) => {
    if (!battle.mySide || isPokedraft(battle) || history.value.some(entry => entry.roomid === battle.roomid)) return
    const opponent = battle.sides[battle.mySide === 'p1' ? 'p2' : 'p1'].name
    const result = !battle.winner ? 'egalite' : toId(battle.winner) === toId(battle.sides[battle.mySide].name) ? 'victoire' : 'defaite'
    const rating = ratingOf(battle)
    persist([{
      roomid: battle.roomid,
      format: battle.format,
      formatName: battle.formatName,
      opponent,
      result,
      turns: battle.turn,
      at: new Date().toISOString(),
      team: battle.sides[battle.mySide].team.map(pokemon => pokemon.speciesId),
      ...(rating ? { elo: rating.after, delta: rating.after - rating.before } : {}),
    } as PlayedBattle, ...history.value])
  }

  /** L'Elo arrive juste après la fin du combat : il complète l'entrée déjà enregistrée. */
  const rate = (battle: BattleState) => {
    const rating = ratingOf(battle)
    if (!rating || !history.value.some(entry => entry.roomid === battle.roomid)) return
    persist(history.value.map(entry => entry.roomid === battle.roomid ? { ...entry, elo: rating.after, delta: rating.after - rating.before } : entry))
  }

  return { history, record, rate }
}

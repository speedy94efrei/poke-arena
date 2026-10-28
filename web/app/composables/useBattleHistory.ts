import type { BattleState } from '~/utils/battleTracker'

const STORAGE_KEY = 'arene-historique-classique'
const MAX_ENTRIES = 30

export interface PlayedBattle {
  roomid: string
  format: string
  formatName: string
  opponent: string
  result: 'victoire' | 'defaite' | 'egalite'
  turns: number
  at: string
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
 * Derniers combats Classique joués dans ce navigateur.
 */
export function useBattleHistory() {
  const history = useState<PlayedBattle[]>('classic-history', () => import.meta.client ? load() : [])

  const record = (battle: BattleState) => {
    if (!battle.mySide || isPokedraft(battle) || history.value.some(entry => entry.roomid === battle.roomid)) return
    const opponent = battle.sides[battle.mySide === 'p1' ? 'p2' : 'p1'].name
    const result = !battle.winner ? 'egalite' : toId(battle.winner) === toId(battle.sides[battle.mySide].name) ? 'victoire' : 'defaite'
    history.value = [{ roomid: battle.roomid, format: battle.format, formatName: battle.formatName, opponent, result, turns: battle.turn, at: new Date().toISOString() } as PlayedBattle, ...history.value].slice(0, MAX_ENTRIES)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
    } catch {
      return
    }
  }

  return { history, record }
}

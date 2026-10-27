import type { DraftView } from '~/utils/draft'
import type { TeamSet } from '~/utils/showdownTeam'

interface DraftEvent {
  id: number
  text: string
  tone: 'info' | 'alerte' | 'adverse'
}

interface RankedResult {
  outcome: 'victoire' | 'defaite' | 'egalite'
  points_delta: number
  points_after: number
  note: string | null
}

interface DraftStore {
  account: { ranked: boolean, verified: boolean, name: string | null }
  results: Record<string, RankedResult>
  draft: DraftView | null
  deadline: number
  searching: boolean
  challengeTo: string | null
  challengedBy: string[]
  battle: string
  battles: string[]
  cancelled: string
  event: DraftEvent | null
}

const store = reactive<DraftStore>({
  account: { ranked: false, verified: false, name: null },
  results: {},
  draft: null, deadline: 0, searching: false, challengeTo: null, challengedBy: [], battle: '', battles: [], cancelled: '', event: null,
})
let eventCounter = 0
let registered = false

function announce(text: string, tone: DraftEvent['tone'] = 'info') {
  store.event = { id: ++eventCounter, text, tone }
}

function describe(previous: DraftView | null, next: DraftView) {
  if (!previous || previous.id !== next.id) {
    announce(`Draft contre ${next.opponent} : choisis jusqu'à ${DRAFT.bans} bans.`)
    return
  }
  if (previous.phase === 'ban' && next.phase !== 'ban') {
    const lost = next.lostBans.mine
    announce(lost ? `Bans révélés · ${lost} ban${lost > 1 ? 's' : ''} perdu${lost > 1 ? 's' : ''}` : 'Bans révélés', lost ? 'alerte' : 'info')
  }
  const added = next.picks.slice(previous.picks.length)
  const random = added.filter(pick => pick.mine && pick.random)
  const theirs = added.filter(pick => !pick.mine)
  if (random.length) announce(`Chrono écoulé : pick aléatoire → ${random.map(pick => speciesName(pick.id)).join(', ')}`, 'alerte')
  else if (theirs.length) announce(`L'adversaire a pické ${theirs.map(pick => speciesName(pick.id)).join(', ')}`, 'adverse')
  if (previous.phase === 'pick' && next.phase === 'prep') announce('Draft terminé : prépare ton équipe.')
  if (!previous.ready.theirs && next.ready.theirs) announce(`${next.opponent} est prêt.`, 'adverse')
}

function handle(payload: string) {
  const message = JSON.parse(payload)
  switch (message.type) {
    case 'state': {
      const next = message.draft as DraftView | null
      if (next) {
        describe(store.draft, next)
        store.cancelled = ''
        store.searching = false
      }
      store.draft = next
      store.deadline = Date.now() + (next?.remaining ?? 0)
      break
    }
    case 'search':
      store.searching = message.searching
      break
    case 'account':
      store.account = { ranked: message.ranked, verified: message.verified, name: message.name }
      break
    case 'result':
      store.results[message.roomid] = { outcome: message.outcome, points_delta: message.points_delta, points_after: message.points_after, note: message.note }
      break
    case 'challenge':
      store.challengeTo = message.to
      if (message.rejectedBy) announce(`${message.rejectedBy} a refusé ton défi.`, 'alerte')
      break
    case 'challenged':
      store.challengedBy = store.challengedBy.filter(name => toId(name) !== toId(message.from))
      if (message.active) store.challengedBy.push(message.from)
      break
    case 'error':
      announce(message.message, 'alerte')
      break
    case 'cancelled':
      store.draft = null
      store.cancelled = message.reason
      break
    case 'battle':
      store.battle = message.roomid
      store.battles.push(message.roomid)
      store.draft = null
      break
  }
}

export function useDraft() {
  const showdown = useShowdown()
  if (!registered) {
    showdown.onGlobal('pokedraft', handle)
    registered = true
  }
  const run = (text: string) => showdown.command(`/pokedraft ${text}`)

  return {
    store,
    refresh: () => showdown.command('/pokedraft'),
    search: () => run('search'),
    cancelSearch: () => run('cancelsearch'),
    challenge: (name: string) => run(`challenge ${name}`),
    cancelChallenge: () => run('cancelchallenge'),
    accept: (name: string) => run(`accept ${name}`),
    reject: (name: string) => run(`reject ${name}`),
    setBans: (ids: string[]) => run(`bans ${ids.join(',')}`),
    lockBans: () => run('lockbans'),
    preselect: (id: string | null) => run(`preselect ${id ?? ''}`),
    pick: (id: string) => run(`pick ${id}`),
    submitTeam: (team: TeamSet[]) => run(`team ${packTeam(team)}`),
    quit: () => {
      run('quit')
      store.draft = null
    },
    link: (token: string) => run(`auth ${token}`),
    unlink: () => run('deauth'),
    clearBattle: () => {
      store.battle = ''
    },
  }
}

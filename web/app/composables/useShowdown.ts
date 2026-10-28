import type { BattleState } from '~/utils/battleTracker'
import type { FormatSection } from '~/utils/formats'
import type { TeamSet } from '~/utils/showdownTeam'

export const POKEDRAFT_FORMAT = 'gen9pokedraft'

type ConnectionStatus = 'deconnecte' | 'connexion' | 'connecte'

interface ShowdownStore {
  status: ConnectionStatus
  name: string
  challengesFrom: Record<string, { from: string, format: string }>
  challengeTo: { to: string, format: string } | null
  searching: boolean
  searchingFormats: string[]
  formats: FormatSection[]
  notices: { id: number, text: string }[]
  battles: Record<string, BattleState>
  latestBattle: string
}

/** Équipe à envoyer : sets PokéDraft, ou équipe déjà au format compact de Showdown (vide pour une équipe générée). */
type OutgoingTeam = TeamSet[] | string

const store = reactive<ShowdownStore>({
  status: 'deconnecte', name: '', challengesFrom: {}, challengeTo: null, searching: false, searchingFormats: [], formats: [], notices: [], battles: {}, latestBattle: '',
})
const queues = new Map<string, string[]>()
const playing = new Set<string>()
const globalHandlers = new Map<string, (payload: string) => void>()
const queryWaiters = new Map<string, ((data: unknown) => void)[]>()
const QUERY_TIMEOUT = 6000
let socket: WebSocket | null = null
let wantedName = ''
let noticeCounter = 0

function cleanName(raw = ''): string {
  return raw.replace(/^[^\p{L}\p{N}]/u, '').trim()
}

function notify(text: string) {
  const notice = { id: ++noticeCounter, text: text.replace(/\|\|/g, '\n') }
  store.notices.push(notice)
  setTimeout(() => {
    store.notices = store.notices.filter(n => n.id !== notice.id)
  }, 9000)
}

function send(text: string) {
  socket?.send(text)
}

function applyPendingRequest(battle: BattleState) {
  const request = battle.pendingRequest
  if (!request) return
  battle.pendingRequest = null
  applyRequest(battle, request)
  battle.request = request.wait ? null : request
  battle.choiceSent = false
  battle.error = ''
  if (request.teamPreview) battle.message = 'Choisis ton Pokémon de tête.'
}

function pump(roomid: string) {
  const battle = store.battles[roomid]
  const queue = queues.get(roomid)
  if (!battle || !queue || playing.has(roomid)) return
  const line = queue.shift()
  if (line === undefined) {
    setTimeout(() => {
      if (!queues.get(roomid)?.length && !playing.has(roomid)) applyPendingRequest(battle)
    }, 150)
    return
  }
  applyLine(battle, line)
  const delay = lineDelay(line)
  if (!delay) return pump(roomid)
  playing.add(roomid)
  setTimeout(() => {
    playing.delete(roomid)
    pump(roomid)
  }, delay)
}

function handleBattle(roomid: string, lines: string[]) {
  if (!store.battles[roomid]) {
    if (!lines.includes('|init|battle')) return
    store.battles[roomid] = createBattle(roomid)
    queues.set(roomid, [])
    store.latestBattle = roomid
    store.challengeTo = null
    store.searching = false
    if (lines.some(line => line.startsWith('|turn|'))) {
      // Combat rejoint en cours (spectateur) : l'historique s'applique d'un coup, seule la suite est animée.
      for (const line of lines) if (line && !line.startsWith('|request|') && !line.startsWith('|t:|')) applyLine(store.battles[roomid], line)
      return
    }
  }
  const battle = store.battles[roomid]
  const queue = queues.get(roomid)!
  for (const line of lines) {
    if (line.startsWith('|request|')) {
      const json = line.slice(9)
      if (json) battle.pendingRequest = JSON.parse(json)
    } else if (line.startsWith('|error|')) {
      applyLine(battle, line)
    } else if (line && !line.startsWith('|t:|')) {
      queue.push(line)
    }
  }
  pump(roomid)
}

function handleGlobal(line: string) {
  const [, command = '', ...args] = line.split('|')
  switch (command) {
    case 'challstr':
      send(`|/trn ${wantedName}`)
      break
    case 'updateuser': {
      store.name = cleanName(args[0])
      if (args[1] === '1') store.status = 'connecte'
      break
    }
    case 'nametaken':
      notify(args[1] || `Le pseudo ${args[0]} est déjà pris.`)
      break
    case 'popup':
      notify(args.join('|'))
      break
    case 'updatesearch': {
      const search = JSON.parse(args.join('|') || '{}')
      store.searchingFormats = search.searching ?? []
      store.searching = store.searchingFormats.length > 0
      break
    }
    case 'formats':
      store.formats = parseFormats(args.join('|'))
      break
    case 'queryresponse': {
      const [type = '', ...rest] = args
      const waiters = queryWaiters.get(type) ?? []
      queryWaiters.delete(type)
      let data: unknown = null
      try {
        data = JSON.parse(rest.join('|'))
      } catch {
        data = null
      }
      for (const resolve of waiters) resolve(data)
      break
    }
    case 'pm': {
      const sender = cleanName(args[0])
      const receiver = cleanName(args[1])
      const message = args.slice(2).join('|')
      if (message.startsWith('/challenge')) {
        const format = message.slice('/challenge'.length).trim().split('|')[0] ?? ''
        if (toId(receiver) === toId(store.name)) {
          if (format) store.challengesFrom[toId(sender)] = { from: sender, format }
          else delete store.challengesFrom[toId(sender)]
        }
        if (toId(sender) === toId(store.name)) store.challengeTo = format ? { to: receiver, format } : null
      } else if (message.startsWith('/error ')) {
        notify(message.slice(7))
      } else if (message.startsWith('/text ') || message.startsWith('/log ')) {
        notify(message.replace(/^\/(text|log) /, ''))
      }
      break
    }
    default:
      globalHandlers.get(command)?.(args.join('|'))
  }
}

function handleData(data: string) {
  let lines = data.split('\n')
  let roomid = ''
  if (lines[0]?.startsWith('>')) {
    roomid = lines[0].slice(1)
    lines = lines.slice(1)
  }
  if (roomid.startsWith('battle-')) handleBattle(roomid, lines)
  else lines.forEach(handleGlobal)
}

export function useShowdown() {
  const url = useRuntimeConfig().public.showdownUrl as string

  const connect = (name: string) => {
    wantedName = name.trim()
    if (!wantedName) return
    if (socket && socket.readyState <= WebSocket.OPEN) {
      send(`|/trn ${wantedName}`)
      return
    }
    store.status = 'connexion'
    socket = new WebSocket(url)
    socket.onmessage = event => handleData(String(event.data))
    socket.onclose = () => {
      store.status = 'deconnecte'
      socket = null
    }
    socket.onerror = () => notify(`Impossible de joindre le serveur de combat (${url}). Est-il lancé ?`)
  }

  const sendTeam = (team: OutgoingTeam) => send(`|/utm ${typeof team === 'string' ? team || 'null' : packTeam(team)}`)

  return {
    store,
    serverUrl: url,
    connect,
    command(text: string) {
      send(`|${text}`)
    },
    onGlobal(command: string, handler: (payload: string) => void) {
      globalHandlers.set(command, handler)
    },
    challenge(to: string, team: OutgoingTeam, format = POKEDRAFT_FORMAT) {
      sendTeam(team)
      send(`|/challenge ${to}, ${format}`)
    },
    cancelChallenge() {
      if (store.challengeTo) send(`|/cancelchallenge ${store.challengeTo.to}`)
      store.challengeTo = null
    },
    accept(from: string, team: OutgoingTeam) {
      sendTeam(team)
      send(`|/accept ${from}`)
      delete store.challengesFrom[toId(from)]
    },
    reject(from: string) {
      send(`|/reject ${from}`)
      delete store.challengesFrom[toId(from)]
    },
    search(team: OutgoingTeam, format = POKEDRAFT_FORMAT) {
      sendTeam(team)
      send(`|/search ${format}`)
    },
    cancelSearch() {
      send('|/cancelsearch')
    },
    choose(roomid: string, choice: string) {
      const battle = store.battles[roomid]
      if (!battle?.request) return
      send(`${roomid}|/choose ${choice}|${battle.request.rqid ?? ''}`)
      battle.choiceSent = true
      battle.error = ''
      battle.message = "En attente de l'adversaire…"
    },
    forfeit(roomid: string) {
      send(`${roomid}|/forfeit`)
    },
    /** Requête au serveur (`laddertop`, `roomlist`, `rooms`…) ; `null` sans réponse au bout de quelques secondes. */
    query<T>(type: string, target = ''): Promise<T | null> {
      if (store.status !== 'connecte') return Promise.resolve(null)
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), QUERY_TIMEOUT)
        queryWaiters.set(type, [...(queryWaiters.get(type) ?? []), (data) => {
          clearTimeout(timer)
          resolve(data as T)
        }])
        send(`|/cmd ${type} ${target}`.trimEnd())
      })
    },
    join(roomid: string) {
      send(`|/join ${roomid}`)
    },
    leave(roomid: string) {
      send(`|/leave ${roomid}`)
      delete store.battles[roomid]
      queues.delete(roomid)
      if (store.latestBattle === roomid) store.latestBattle = ''
    },
  }
}

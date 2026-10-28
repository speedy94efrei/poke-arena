import type { BattleState } from '~/utils/battleTracker'
import type { ChatRoomState } from '~/utils/chatRooms'
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
  /** Salons de discussion rejoints (hors combats), avec leur tournoi s'il y en a un. */
  rooms: Record<string, ChatRoomState>
  /** Conversations privées, par identifiant de l'autre joueur. */
  pms: Record<string, PrivateChat>
}

export interface PrivateChat {
  name: string
  messages: { id: number, from: string, text: string, at: number }[]
  unread: number
}

/** Équipe à envoyer : sets PokéDraft, ou équipe déjà au format compact de Showdown (vide pour une équipe générée). */
type OutgoingTeam = TeamSet[] | string

const store = reactive<ShowdownStore>({
  status: 'deconnecte', name: '', challengesFrom: {}, challengeTo: null, searching: false, searchingFormats: [], formats: [], notices: [], battles: {}, latestBattle: '',
  rooms: {}, pms: {},
})
const queues = new Map<string, string[]>()
const playing = new Set<string>()
const globalHandlers = new Map<string, (payload: string) => void>()
const queryWaiters = new Map<string, ((data: unknown) => void)[]>()
let validationWaiter: ((text: string) => void) | null = null
const QUERY_TIMEOUT = 6000
const LOBBY = 'lobby'
let socket: WebSocket | null = null
let wantedName = ''
let noticeCounter = 0
let pmCounter = 0

function cleanName(raw = ''): string {
  return raw.replace(/^[^\p{L}\p{N}]/u, '').trim()
}

function notify(text: string) {
  const french = frenchNotice(text.replace(/\|\|/g, '\n'))
  if (!french) return
  const notice = { id: ++noticeCounter, text: french }
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
      // Combat rejoint en cours (spectateur, ou joueur qui revient) : l'historique s'applique d'un coup, seule la suite
      // est animée ; un joueur reçoit aussi sa demande en cours.
      const battle = store.battles[roomid]
      for (const line of lines) if (line && !line.startsWith('|request|') && !line.startsWith('|t:|')) applyLine(battle, line)
      const request = lines.filter(line => line.length > 9 && line.startsWith('|request|')).at(-1)
      if (request) {
        battle.pendingRequest = JSON.parse(request.slice(9))
        applyPendingRequest(battle)
      }
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
      if (validationWaiter && /team (is valid|was rejected)/i.test(args.join('|'))) {
        validationWaiter(args.join('|'))
        validationWaiter = null
        break
      }
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
      // Le serveur répond dans l'ordre des requêtes : chaque réponse revient à la plus ancienne en attente de ce type.
      const waiters = queryWaiters.get(type) ?? []
      const resolve = waiters.shift()
      if (!waiters.length) queryWaiters.delete(type)
      let data: unknown = null
      try {
        data = JSON.parse(rest.join('|'))
      } catch {
        data = null
      }
      resolve?.(data)
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
      } else if (message.startsWith('/raw ') || message.startsWith('/html ')) {
        notify(htmlText(message.replace(/^\/(raw|html) /, '')))
      } else if (!message.startsWith('/') || message.startsWith('//')) {
        recordPm(sender, receiver, message.replace(/^\/\//, '/'))
      }
      break
    }
    default:
      globalHandlers.get(command)?.(args.join('|'))
  }
}

function recordPm(sender: string, receiver: string, text: string) {
  const mine = toId(sender) === toId(store.name)
  const other = mine ? receiver : sender
  const id = toId(other)
  const chat = store.pms[id] ?? (store.pms[id] = { name: other, messages: [], unread: 0 })
  chat.messages.push({ id: ++pmCounter, from: sender, text, at: Date.now() })
  if (!mine) chat.unread++
}

function handleRoom(roomid: string, lines: string[]) {
  if (!store.rooms[roomid]) {
    if (!lines.some(line => line.startsWith('|init|chat'))) {
      lines.forEach(handleGlobal)
      return
    }
    store.rooms[roomid] = createChatRoom(roomid)
  }
  const room = store.rooms[roomid]!
  for (const line of lines) {
    if (line.startsWith('|deinit') || line.startsWith('|expire')) {
      delete store.rooms[roomid]
      return
    }
    if (line.startsWith('|noinit')) {
      notify(`Impossible de rejoindre le salon ${roomid}.`)
      delete store.rooms[roomid]
      return
    }
    if (!applyRoomLine(room, line, notify)) handleGlobal(line)
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
  else if (roomid) handleRoom(roomid, lines)
  // Le Lobby est le salon par défaut du protocole : ses messages arrivent sans préfixe de salon.
  else if (store.rooms[LOBBY] || lines.some(line => line.startsWith('|init|chat'))) handleRoom(LOBBY, lines)
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
      battle.lastChoice = choice
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
    /** Fait valider l'équipe par le serveur pour un format : liste des problèmes, vide si elle est valide, `null` sans réponse. */
    validateTeam(packed: string, format: string): Promise<string[] | null> {
      if (store.status !== 'connecte') return Promise.resolve(null)
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          validationWaiter = null
          resolve(null)
        }, QUERY_TIMEOUT)
        validationWaiter = (text) => {
          clearTimeout(timer)
          resolve(/team is valid/i.test(text) ? [] : text.split('||').map(line => line.replace(/^-\s*/, '').trim()).filter(line => line && !/rejected/i.test(line)))
        }
        send(`|/utm ${packed || 'null'}`)
        send(`|/vtm ${format}`)
      })
    },
    join(roomid: string) {
      send(`|/join ${roomid}`)
    },
    leaveRoom(roomid: string) {
      send(`|/leave ${roomid}`)
      delete store.rooms[roomid]
    },
    /** Message dans un salon ; un texte qui commence par « / » est envoyé tel quel, pas comme une commande. */
    say(roomid: string, text: string) {
      send(`${roomid}|${text.startsWith('/') ? `/${text}` : text}`)
    },
    sendPm(to: string, text: string) {
      send(`|/pm ${to}, ${text.startsWith('/') ? `/${text}` : text}`)
    },
    readPm(userid: string) {
      const chat = store.pms[userid]
      if (chat) chat.unread = 0
    },
    /** Commande de tournoi dans son salon ; avec une équipe, elle est envoyée d'abord (pour `ready`). */
    tournament(roomid: string, command: 'join' | 'leave' | 'ready' | 'cancelready', team?: OutgoingTeam) {
      if (team !== undefined) sendTeam(team)
      send(`${roomid}|/tour ${command}`)
    },
    leave(roomid: string) {
      send(`|/leave ${roomid}`)
      delete store.battles[roomid]
      queues.delete(roomid)
      if (store.latestBattle === roomid) store.latestBattle = ''
    },
  }
}

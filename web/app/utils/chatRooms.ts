export interface ChatLine {
  id: number
  kind: 'chat' | 'join' | 'leave' | 'info'
  user: string
  text: string
  at: number
}

export interface BracketNode {
  team?: string
  state?: 'unavailable' | 'available' | 'challenging' | 'inprogress' | 'finished'
  result?: 'win' | 'loss' | 'draw'
  score?: number[]
  room?: string
  children?: BracketNode[]
}

export interface BracketData {
  type: 'tree' | 'table'
  rootNode?: BracketNode | null
  users?: string[]
  tableHeaders?: { cols: string[], rows: string[] }
  tableContents?: ({ state: string, result?: string, score?: number[], room?: string } | null)[][]
  scores?: number[]
}

export interface TournamentState {
  format: string
  generator: string
  cap: number
  name: string
  players: string[]
  started: boolean
  joined: boolean
  /** Adversaire de ton prochain match, tant que tu n'as pas dit que tu étais prêt. */
  challenged: string | null
  /** Adversaire attendu une fois que tu es prêt. */
  challenging: string | null
  bracket: BracketData | null
  autostartAt: number | null
  ended: boolean
  results: string[][]
}

export interface ChatRoomState {
  id: string
  title: string
  users: string[]
  log: ChatLine[]
  tournament: TournamentState | null
}

const MAX_LINES = 200
let lineCounter = 0

/** Pseudo sans son rang (« +Brume » donne « Brume ») ni son statut (« Brume@!absent »). */
export function bareName(raw = ''): string {
  return raw.replace(/^[^\p{L}\p{N}]/u, '').replace(/@.*$/, '').trim()
}

/** Identifiant d'un salon tel que le serveur le calcule depuis son titre : les lettres accentuées disparaissent (« Stratégie » donne « stratgie »). */
export function serverRoomId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function createChatRoom(id: string): ChatRoomState {
  return { id, title: id, users: [], log: [], tournament: null }
}

function push(room: ChatRoomState, kind: ChatLine['kind'], user: string, text: string, at = Date.now()) {
  room.log.push({ id: ++lineCounter, kind, user, text, at })
  if (room.log.length > MAX_LINES) room.log.splice(0, room.log.length - MAX_LINES)
}

const NOTICES: [RegExp, string][] = [
  [/You must be registered to send private messages/i, 'Les messages privés sont réservés aux comptes Arène reliés au serveur de combat.'],
  [/is unregistered and cannot be PMed/i, "Ce joueur n'a pas de compte Arène relié : il ne peut pas recevoir de messages privés."],
  [/user .*(was not found|is offline)/i, 'Joueur introuvable : il est peut-être hors ligne.'],
]

/** Avis du serveur en français pour les refus les plus courants ; les autres restent tels quels. */
export function frenchNotice(text: string): string {
  return NOTICES.find(([pattern]) => pattern.test(text))?.[1] ?? text
}

/** Texte lisible d'un fragment HTML envoyé par le serveur (messages d'accueil, annonces). */
export function htmlText(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, ' ')
  return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const TOUR_ERRORS: Record<string, string> = {
  AlreadyJoined: 'Tu es déjà inscrit à ce tournoi.',
  AlreadyStarted: 'Le tournoi a déjà commencé.',
  Full: 'Le tournoi est complet.',
  NotEnoughUsers: 'Pas assez de joueurs : le tournoi est annulé.',
  UserNotAdded: "Tu n'es pas inscrit à ce tournoi.",
  BannedFromTournament: 'Tu ne peux pas participer aux tournois de ce salon.',
  AutoconfirmedOnly: 'Ce tournoi est réservé aux comptes confirmés.',
  NotStarted: "Le tournoi n'a pas encore commencé.",
}

function applyTournament(room: ChatRoomState, args: string[], notify: (text: string) => void) {
  const [kind = '', ...rest] = args
  if (kind === 'create') {
    const [format = '', generator = '', cap = '0', name = ''] = rest
    room.tournament = {
      format, generator, cap: Number(cap), name: name || format, players: [], started: false, joined: false,
      challenged: null, challenging: null, bracket: null, autostartAt: null, ended: false, results: [],
    }
    return
  }
  const tour = room.tournament
  if (kind === 'forceend') {
    room.tournament = null
    push(room, 'info', '', 'Le tournoi a été annulé.')
    return
  }
  if (kind === 'error') {
    notify(TOUR_ERRORS[rest[0] ?? ''] ?? `Tournoi : ${rest.join(' ')}`)
    return
  }
  if (!tour) return
  switch (kind) {
    case 'update': {
      const update = JSON.parse(rest.join('|') || '{}') as Record<string, unknown>
      if ('bracketData' in update) {
        tour.bracket = update.bracketData as BracketData
        if (tour.bracket?.users) tour.players = tour.bracket.users
      }
      if (typeof update.isStarted === 'boolean') tour.started = update.isStarted
      if (typeof update.isJoined === 'boolean') tour.joined = update.isJoined
      if ('challenged' in update) tour.challenged = (update.challenged as string | null) ?? null
      if ('challenging' in update) tour.challenging = (update.challenging as string | null) ?? null
      if (typeof update.generator === 'string') tour.generator = update.generator
      break
    }
    case 'join':
      if (!tour.players.includes(rest[0] ?? '')) tour.players.push(rest[0] ?? '')
      break
    case 'leave':
    case 'disqualify':
      if (!tour.started) tour.players = tour.players.filter(player => player !== rest[0])
      break
    case 'start':
      tour.started = true
      push(room, 'info', '', `Le tournoi commence avec ${rest[0]} joueurs.`)
      break
    case 'autostart':
      tour.autostartAt = rest[0] === 'on' ? Date.now() + Number(rest[1] ?? 0) : null
      break
    case 'battleend': {
      const [p1 = '', p2 = '', result = ''] = rest
      push(room, 'info', '', result === 'win' ? `${p1} bat ${p2}.` : result === 'loss' ? `${p2} bat ${p1}.` : `${p1} et ${p2} font match nul.`)
      break
    }
    case 'end': {
      const end = JSON.parse(rest.join('|') || '{}') as { results?: string[][], bracketData?: BracketData }
      tour.ended = true
      tour.results = end.results ?? []
      if (end.bracketData) tour.bracket = end.bracketData
      tour.challenged = tour.challenging = null
      if (tour.results[0]?.[0]) push(room, 'info', '', `${tour.results[0][0]} remporte le tournoi !`)
      break
    }
  }
}

/** Applique une ligne du protocole à un salon de discussion. Renvoie `false` si elle ne concerne pas les salons. */
export function applyRoomLine(room: ChatRoomState, line: string, notify: (text: string) => void): boolean {
  if (!line.startsWith('|')) {
    if (line.trim()) push(room, 'info', '', line)
    return true
  }
  const [, command = '', ...args] = line.split('|')
  switch (command) {
    case 'init':
    case 'deinit':
      return true
    case 'title':
      room.title = args.join('|')
      return true
    case 'users':
      room.users = (args[0] ?? '').split(',').slice(1).map(entry => entry.replace(/@.*$/, ''))
      return true
    case 'c':
      push(room, 'chat', bareName(args[0]), args.slice(1).join('|'))
      return true
    case 'c:':
      push(room, 'chat', bareName(args[1]), args.slice(2).join('|'), Number(args[0]) * 1000)
      return true
    case 'j':
    case 'J':
    case 'join':
      if (!room.users.some(user => bareName(user) === bareName(args[0]))) room.users.push(args[0] ?? '')
      if (command !== 'J') push(room, 'join', bareName(args[0]), '')
      return true
    case 'l':
    case 'L':
    case 'leave':
      room.users = room.users.filter(user => bareName(user) !== bareName(args[0]))
      return true
    case 'n':
    case 'N':
    case 'name': {
      const previous = toId(args[1] ?? '')
      room.users = room.users.filter(user => toId(bareName(user)) !== previous)
      room.users.push(args[0] ?? '')
      return true
    }
    case 'raw':
    case 'html': {
      const text = htmlText(args.join('|')).replace(/^You joined (.+)$/, 'Tu as rejoint $1.')
      if (text) push(room, 'info', '', text)
      return true
    }
    case 'tournament':
      applyTournament(room, args, notify)
      return true
    case '':
      if (args.join('|').trim()) push(room, 'info', '', args.join('|'))
      return true
    default:
      return false
  }
}

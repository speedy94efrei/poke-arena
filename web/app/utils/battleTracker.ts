import type { TypePokemon } from '#data/types/roster'
import type { FxEvent, FxSpec } from '~/utils/battleAnims'

export type SideId = 'p1' | 'p2'
export type LogKind = 'move' | 'damage' | 'heal' | 'switch' | 'faint' | 'status' | 'boost' | 'unboost' | 'field' | 'hazard' | 'crit' | 'item' | 'info' | 'win'

export interface BattlePokemon {
  name: string
  speciesId: string
  hp: number
  maxHp: number
  status: string
  fainted: boolean
  active: boolean
  /** Place sur le terrain quand il est actif : 0 pour a, 1 pour b, 2 pour c (combats doubles et triples). */
  position: number
  boosts: Record<string, number>
  item: string
  ability: string
  moves: string[]
  tera?: string
  level: number
  /** A été vu sur le terrain (pas seulement à l'aperçu des équipes). */
  revealed: boolean
  /** Tes Pokémon : stats exactes, type Téra possible et PP restants connus (vus quand il était actif). */
  stats?: { atk: number, def: number, spa: number, spd: number, spe: number }
  teraType?: string
  pp: Record<string, { pp: number, maxpp: number }>
}

export interface BattleSide {
  id: SideId
  name: string
  team: BattlePokemon[]
  conditions: Record<string, number>
  /** Tour où chaque effet de ce côté a commencé, pour afficher les tours restants. */
  since: Record<string, number>
  /** Nombre de Pokémon de l'équipe, annoncé au début du combat. */
  size?: number
}

export interface LogSection {
  turn: number
  lines: { kind: LogKind, text: string }[]
}

export interface RequestMove {
  move: string
  id: string
  pp: number
  maxpp: number
  target?: string
  disabled?: boolean | string
}

export interface RequestActive {
  moves: RequestMove[]
  trapped?: boolean
  maybeTrapped?: boolean
  canTerastallize?: string
  canMegaEvo?: boolean
  canDynamax?: boolean
  canZMove?: ({ move: string, target: string } | null)[]
}

export interface RequestPokemon {
  ident: string
  details: string
  condition: string
  active: boolean
  moves: string[]
  baseAbility: string
  item: string
  stats?: { atk: number, def: number, spa: number, spd: number, spe: number }
  teraType?: string
  terastallized?: string
}

export interface ShowdownRequest {
  rqid?: number
  wait?: boolean
  teamPreview?: boolean
  maxChosenTeamSize?: number
  forceSwitch?: boolean[]
  active?: RequestActive[]
  side: { name: string, id: SideId, pokemon: RequestPokemon[] }
}

export interface BattleState {
  roomid: string
  /** Identifiant du format (`gen9ou`, `gen9pokedraft`…), lu dans la ligne `|tier|`. */
  format: string
  formatName: string
  gameType: string
  mySide: SideId | null
  sides: Record<SideId, BattleSide>
  turn: number
  weather: string
  /** Tour du début de la météo, et sa durée quand on la connaît (5, ou 8 avec une roche). */
  weatherSince: number
  weatherTurns: number | null
  fieldEffects: string[]
  fieldSince: Record<string, number>
  log: LogSection[]
  message: string
  request: ShowdownRequest | null
  pendingRequest: ShowdownRequest | null
  choiceSent: boolean
  /** Dernier choix envoyé (« move 2 terastallize », « switch 3 »), pour le comparer au conseil du coach. */
  lastChoice: string
  started: boolean
  ended: boolean
  winner: string
  /** Elo avant et après le combat, par joueur (identifiant), annoncé par le serveur à la fin d'un combat classé. */
  ratings: Record<string, { before: number, after: number }>
  /** Combat de ladder : il compte pour l'Elo. */
  rated: boolean
  error: string
  anims: Record<SideId, { name: string, key: number }>
  floats: { id: number, side: SideId, text: string, color: string }[]
  /** Effets visuels récents (attaques, changements, statuts…), joués une fois par la scène. */
  fx: FxEvent[]
}

const DELAYS: Record<string, number> = {
  'switch': 850, 'drag': 850, 'replace': 750, 'move': 950, '-terastallize': 700, 'faint': 800, '-damage': 450, '-heal': 450,
  '-status': 400, '-boost': 350, '-unboost': 350, '-weather': 400, '-fieldstart': 400, '-sidestart': 400,
  'cant': 450, '-supereffective': 250, '-resisted': 250, '-crit': 250, '-miss': 300, 'win': 300,
}

let animationCounter = 0

export function createBattle(roomid: string): BattleState {
  const side = (id: SideId): BattleSide => ({ id, name: '', team: [], conditions: {}, since: {} })
  return {
    roomid, format: '', formatName: '', gameType: 'singles', mySide: null, sides: { p1: side('p1'), p2: side('p2') }, turn: 0,
    weather: '', weatherSince: 0, weatherTurns: null, fieldEffects: [], fieldSince: {},
    log: [{ turn: 0, lines: [] }], message: 'Le combat va commencer…', request: null, pendingRequest: null,
    choiceSent: false, lastChoice: '', started: false, ended: false, winner: '', ratings: {}, rated: false, error: '',
    anims: { p1: { name: '', key: 0 }, p2: { name: '', key: 0 } }, floats: [], fx: [],
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Texte d'un fragment HTML échappé par le serveur (`&#39;`, `&amp;`…). */
function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|\w+);/g, (entity, code: string) => code.startsWith('#') ? String.fromCharCode(Number(code.slice(1))) : ENTITIES[code] ?? entity)
}

const WEATHER_BALL_TYPES: Record<string, TypePokemon> = {
  raindance: 'Eau', primordialsea: 'Eau', sunnyday: 'Feu', desolateland: 'Feu', sandstorm: 'Roche', snow: 'Glace', snowscape: 'Glace', hail: 'Glace',
}
const WEATHER_FX: Record<string, string> = {
  raindance: '#3a8ef0', primordialsea: '#2060c0', sunnyday: '#ffb030', desolateland: '#ff7020', sandstorm: '#c8a050',
  snow: '#c0f0ff', snowscape: '#c0f0ff', hail: '#c0f0ff', deltastream: '#a0c0e0',
}
const WEATHER_ROCKS: Record<string, string> = { raindance: 'damprock', sunnyday: 'heatrock', sandstorm: 'smoothrock', snow: 'icyrock', snowscape: 'icyrock', hail: 'icyrock' }
let lastMover: BattlePokemon | null = null

/**
 * Durée d'une météo qui commence : celle d'un talent ou d'une attaque dure 5 tours, 8 avec la roche qui la prolonge.
 * `null` quand on ne connaît pas l'objet de celui qui l'a posée.
 */
function weatherDuration(state: BattleState, tags: string[]): number | null {
  const id = state.weather
  if (!id || ['desolateland', 'primordialsea', 'deltastream'].includes(id)) return null
  const of = tags.find(tag => tag.startsWith('[of] '))
  const setter = of ? pokemonFrom(state, of.slice(5)).pokemon : lastMover
  if (!setter) return null
  const rock = WEATHER_ROCKS[id]
  if (setter.item) return setter.item === rock ? 8 : 5
  const mine = state.mySide ? state.sides[state.mySide].team.includes(setter) : false
  return mine ? 5 : null
}

export function lineDelay(line: string): number {
  return DELAYS[line.split('|')[1] ?? ''] ?? 0
}

export function hpPercent(pokemon: BattlePokemon): number {
  return pokemon.maxHp ? Math.round(pokemon.hp / pokemon.maxHp * 100) : 0
}

export function hpColor(percent: number): string {
  return percent > 50 ? '#48c878' : percent > 20 ? '#f8c030' : '#f05838'
}

export function activePokemon(state: BattleState, side: SideId): BattlePokemon | undefined {
  return state.sides[side].team.find(p => p.active && p.position === 0) ?? state.sides[side].team.find(p => p.active)
}

/** Pokémon actifs d'un camp, de la place a à la place c. */
export function activePokemons(state: BattleState, side: SideId): BattlePokemon[] {
  return state.sides[side].team.filter(p => p.active).sort((a, b) => a.position - b.position)
}

/** Nombre de Pokémon actifs par camp selon le type de combat. */
export function activeCount(state: BattleState): number {
  return state.gameType === 'triples' ? 3 : state.gameType === 'doubles' || state.gameType === 'multi' ? 2 : 1
}

export function isPokedraft(state: BattleState): boolean {
  return state.format.endsWith('pokedraft')
}

export function displayName(state: BattleState, side: SideId, pokemon: BattlePokemon): string {
  const name = speciesName(pokemon.speciesId, pokemon.name)
  return state.mySide && side !== state.mySide ? `${name} adverse` : name
}

/** « de » devant un nom, élidé en « d' » devant une voyelle : « Talent d'Arbok ». */
function ofName(name: string): string {
  return /^[aeiouyhàâéèêëîïôûü]/i.test(name) ? `d'${name}` : `de ${name}`
}

function parseIdent(ident: string): { side: SideId, name: string, position: number } {
  const [place = '', ...name] = ident.split(': ')
  const letter = place.charAt(2)
  return { side: place.slice(0, 2) as SideId, name: name.join(': ').normalize('NFC'), position: letter ? letter.charCodeAt(0) - 97 : 0 }
}

function parseCondition(condition: string): { hp: number, maxHp: number, status: string, fainted: boolean } {
  const [hpPart = '0', status = ''] = condition.split(' ')
  if (status === 'fnt' || hpPart === '0') return { hp: 0, maxHp: 0, status: '', fainted: true }
  const [hp = '0', maxHp = '100'] = hpPart.split('/')
  return { hp: Number(hp), maxHp: Number(maxHp), status, fainted: false }
}

function blankPokemon(name: string, speciesId: string): BattlePokemon {
  return { name, speciesId, hp: 100, maxHp: 100, status: '', fainted: false, active: false, position: 0, boosts: {}, item: '', ability: '', moves: [], level: 100, revealed: false, pp: {} }
}

/** Niveau lu dans les détails d'un Pokémon (« Great Tusk, L77, M ») ; 100 par défaut. */
function levelOf(details: string): number {
  return Number(/(?:^|, )L(\d+)/.exec(details)?.[1] ?? 100)
}

function findOrAdd(state: BattleState, side: SideId, name: string, details = ''): BattlePokemon {
  const team = state.sides[side].team
  const speciesId = details ? toId(details.split(',')[0] ?? '') : ''
  let pokemon = team.find(p => p.name === name)
    ?? team.find(p => !p.name && speciesId && p.speciesId === speciesId)
  if (!pokemon) {
    team.push(blankPokemon(name, speciesId))
    pokemon = team[team.length - 1]!
  }
  pokemon.name = name
  if (speciesId) pokemon.speciesId = speciesId
  if (details) pokemon.level = levelOf(details)
  return pokemon
}

function pokemonFrom(state: BattleState, ident: string): { side: SideId, pokemon: BattlePokemon } {
  const { side, name } = parseIdent(ident)
  return { side, pokemon: findOrAdd(state, side, name) }
}

function addLine(state: BattleState, kind: LogKind, text: string) {
  const section = state.log[state.log.length - 1]
  section?.lines.push({ kind, text })
  state.message = text
}

function animate(state: BattleState, side: SideId, name: string) {
  state.anims[side] = { name, key: ++animationCounter }
}

function addFx(state: BattleState, spec: FxSpec) {
  state.fx = [...state.fx.slice(-14), { ...spec, id: ++animationCounter }]
}

function placeOf(state: BattleState, ident: string): { side: SideId, position: number } | null {
  if (!ident || !ident.includes(': ')) return null
  const { side, name, position } = parseIdent(ident)
  const pokemon = state.sides[side].team.find(p => p.name === name)
  return { side, position: pokemon?.active ? pokemon.position : position }
}

/** Animation d'une attaque : données de l'attaque (Pokédex ou fiche PokéDraft) et drapeaux du calculateur (contact, poing…). */
function animateMove(state: BattleState, ident: string, moveName: string, targetIdent: string, tags: string[]) {
  if (tags.includes('[still]') || tags.includes('[notarget]')) return
  const from = placeOf(state, ident)
  if (!from) return
  const id = toId(moveName)
  const view = moveView(id, isPokedraft(state))
  const type = id === 'weatherball' && WEATHER_BALL_TYPES[state.weather] ? WEATHER_BALL_TYPES[state.weather]! : view?.type ?? 'Normal'
  const data = currentCalc()?.Generations.get(9).moves.get(currentCalc()!.toID(id))
  const flags = (data?.flags ?? {}) as Record<string, unknown>
  const category = view?.category ?? 'Physique'
  const target = placeOf(state, targetIdent)
  const animation = moveAnimation({
    id, type, category,
    contact: data ? Boolean(flags.contact) : category === 'Physique',
    punch: Boolean(flags.punch), bite: Boolean(flags.bite), slicing: Boolean(flags.slicing),
    selfTarget: data?.target === 'self' || data?.target === 'allySide' || data?.target === 'allies',
  }, from, target && (target.side !== from.side || target.position !== from.position) ? target : null)
  const facing = from.side === state.mySide || (!state.mySide && from.side === 'p1') ? 'Me' : 'Opp'
  if (animation.motion === 'lunge') animate(state, from.side, `lunge${facing} .5s ease-out`)
  else if (animation.motion === 'cast') animate(state, from.side, `cast${facing} .45s ease-out`)
  else if (animation.motion === 'spin') animate(state, from.side, 'spinSelf .6s ease-in-out')
  for (const spec of animation.fx) addFx(state, spec)
  lastTarget = target ?? from
}

let lastTarget: { side: SideId, position: number } | null = null

function float(state: BattleState, side: SideId, text: string, color: string) {
  state.floats = [...state.floats.slice(-3), { id: ++animationCounter, side, text, color }]
}

function revealFromTags(state: BattleState, target: BattlePokemon, tags: string[]) {
  const from = tags.find(tag => tag.startsWith('[from] item: ') || tag.startsWith('[from] ability: '))
  if (!from) return
  const of = tags.find(tag => tag.startsWith('[of] '))
  const holder = of ? pokemonFrom(state, of.slice(5)).pokemon : target
  const [kind, name = ''] = from.slice(7).split(': ')
  if (kind === 'item') holder.item = toId(name)
  else holder.ability = toId(name)
}

function setHp(state: BattleState, side: SideId, pokemon: BattlePokemon, condition: string): number {
  const before = hpPercent(pokemon)
  const parsed = parseCondition(condition)
  pokemon.hp = parsed.hp
  if (parsed.maxHp) pokemon.maxHp = parsed.maxHp
  pokemon.fainted = parsed.fainted
  if (parsed.fainted) pokemon.hp = 0
  pokemon.status = parsed.fainted ? '' : parsed.status
  return hpPercent(pokemon) - before
}

export function applyRequest(state: BattleState, request: ShowdownRequest) {
  state.mySide = request.side.id
  state.sides[request.side.id].name = request.side.name
  for (const own of request.side.pokemon) {
    const { side, name } = parseIdent(own.ident)
    const pokemon = findOrAdd(state, side, name, own.details)
    const condition = parseCondition(own.condition)
    Object.assign(pokemon, {
      hp: condition.hp, maxHp: condition.maxHp || pokemon.maxHp, status: condition.status, fainted: condition.fainted,
      item: own.item, ability: own.baseAbility, moves: own.moves, stats: own.stats, teraType: own.teraType,
    })
  }
  request.active?.forEach((active, index) => {
    const member = request.side.pokemon[index]
    if (!member) return
    const pokemon = findOrAdd(state, request.side.id, parseIdent(member.ident).name, member.details)
    for (const move of active.moves) pokemon.pp[move.id] = { pp: move.pp, maxpp: move.maxpp }
  })
}

export function applyLine(state: BattleState, line: string) {
  if (!line.startsWith('|')) return
  const parts = line.slice(1).split('|')
  const command = parts[0] ?? ''
  const args = parts.slice(1)
  const tags = args.filter(arg => arg.startsWith('['))

  switch (command) {
    case 'player':
      if (args[1]) state.sides[args[0] as SideId].name = args[1]
      break
    case 'tier':
      state.formatName = args[0] ?? ''
      state.format = showdownId(state.formatName)
      break
    case 'gametype':
      state.gameType = args[0] ?? 'singles'
      break
    case 'rated':
      state.rated = true
      break
    case 'teamsize':
      state.sides[args[0] as SideId].size = Number(args[1] ?? 6)
      break
    case 'clearpoke':
      state.sides.p1.team = state.sides.p1.team.filter(p => p.name)
      state.sides.p2.team = state.sides.p2.team.filter(p => p.name)
      break
    case 'poke': {
      const side = args[0] as SideId
      const speciesId = toId(args[1]?.split(',')[0] ?? '')
      if (!state.sides[side].team.some(p => p.speciesId === speciesId)) {
        state.sides[side].team.push({ ...blankPokemon('', speciesId), level: levelOf(args[1] ?? '') })
      }
      break
    }
    case 'teampreview':
      state.message = 'Choisis ton Pokémon de tête.'
      break
    case 'start':
      state.started = true
      break
    case 'switch':
    case 'drag':
    case 'replace': {
      const { side, name, position } = parseIdent(args[0] ?? '')
      for (const other of state.sides[side].team) {
        if (other.active && other.position === position) {
          other.active = false
          other.boosts = {}
        }
      }
      const pokemon = findOrAdd(state, side, name, args[1])
      pokemon.active = true
      pokemon.revealed = true
      pokemon.position = position
      setHp(state, side, pokemon, args[2] ?? '100/100')
      addFx(state, { kind: 'ball', to: { side, position } })
      animate(state, side, 'sendOut .55s .25s both')
      const trainer = state.sides[side].name
      const nom = speciesName(pokemon.speciesId, pokemon.name)
      addLine(state, 'switch', side === state.mySide ? `En avant, ${nom} !` : command === 'drag' ? `${nom} est forcé d'entrer !` : `${trainer} envoie ${nom} !`)
      break
    }
    case 'move': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      lastMover = pokemon
      animateMove(state, args[0] ?? '', args[1] ?? '', args[2] ?? '', tags)
      const moveId = toId(args[1] ?? '')
      if (side !== state.mySide && moveId && !pokemon.moves.includes(moveId)) pokemon.moves.push(moveId)
      addLine(state, 'move', `${displayName(state, side, pokemon)} utilise ${moveName(args[1] ?? '')} !`)
      break
    }
    case '-damage':
    case '-heal': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      const delta = setHp(state, side, pokemon, args[1] ?? '')
      revealFromTags(state, pokemon, tags)
      if (!delta) break
      const damage = command === '-damage'
      const hazard = tags.some(tag => /^\[from\] (Stealth Rock|Spikes|G-Max Steelsurge)/.test(tag))
      const itemDamage = tags.some(tag => tag.startsWith('[from] item: '))
      float(state, side, `${damage ? '−' : '+'}${Math.abs(delta)} %`, damage ? '#ff5a4a' : '#48c878')
      if (damage) animate(state, side, hazard || tags.some(tag => /^\[from\] (brn|psn|tox|sandstorm|hail)/.test(tag)) ? 'hurt .35s' : 'hit .45s')
      if (!damage) addFx(state, { kind: 'rise', to: { side, position: pokemon.position }, image: fxImage('shine'), color: '#70e070', count: 4 })
      addLine(state, hazard ? 'hazard' : itemDamage ? 'item' : damage ? 'damage' : 'heal', `${displayName(state, side, pokemon)} ${damage ? 'perd' : 'récupère'} ${Math.abs(delta)} % de ses PV${causeText(tags)}.`)
      break
    }
    case '-sethp': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      setHp(state, side, pokemon, args[1] ?? '')
      break
    }
    case 'faint': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.fainted = true
      pokemon.hp = 0
      animate(state, side, 'faint .7s ease-in both')
      addLine(state, 'faint', `${displayName(state, side, pokemon)} est K.O. !`)
      break
    }
    case '-status': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.status = args[1] ?? ''
      addFx(state, { kind: 'puff', to: { side, position: pokemon.position }, color: STATUS_LABELS[pokemon.status]?.couleur ?? '#ffffff', label: STATUS_LABELS[pokemon.status]?.court })
      addLine(state, 'status', `${displayName(state, side, pokemon)} ${STATUS_LABELS[pokemon.status]?.inflige ?? 'change de statut'} !`)
      break
    }
    case '-curestatus': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      const status = args[1] ?? pokemon.status
      pokemon.status = ''
      addLine(state, 'status', `${displayName(state, side, pokemon)} ${STATUS_LABELS[status]?.soigne ?? 'est soigné'}.`)
      break
    }
    case '-cureteam': {
      const { side } = parseIdent(args[0] ?? '')
      for (const pokemon of state.sides[side].team) pokemon.status = ''
      addLine(state, 'status', `L'équipe ${ofName(state.sides[side].name)} est soignée.`)
      break
    }
    case '-boost':
    case '-unboost': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      const stat = args[1] ?? ''
      const amount = Number(args[2] ?? 0) * (command === '-boost' ? 1 : -1)
      pokemon.boosts[stat] = Math.max(-6, Math.min(6, (pokemon.boosts[stat] ?? 0) + amount))
      if (amount) addFx(state, { kind: 'arrows', to: { side, position: pokemon.position }, color: amount > 0 ? '#ff7a30' : '#3a8ef0', count: Math.min(3, Math.abs(amount)), label: amount > 0 ? 'up' : 'down' })
      if (amount) addLine(state, amount > 0 ? 'boost' : 'unboost', `${STAT_LABELS[stat] ?? stat} ${ofName(displayName(state, side, pokemon))} ${boostVerb(amount)} !`)
      break
    }
    case '-clearboost':
    case '-clearnegativeboost': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.boosts = command === '-clearboost' ? {} : Object.fromEntries(Object.entries(pokemon.boosts).filter(([, v]) => v > 0))
      addLine(state, 'info', `Les changements de stats ${ofName(displayName(state, side, pokemon))} sont annulés.`)
      break
    }
    case '-clearallboost':
      for (const side of [state.sides.p1, state.sides.p2]) for (const pokemon of side.team) pokemon.boosts = {}
      addLine(state, 'info', 'Tous les changements de stats sont annulés.')
      break
    case '-weather': {
      const id = toId(args[0] ?? '')
      if (tags.includes('[upkeep]')) break
      state.weather = id === 'none' ? '' : id
      if (state.weather) addFx(state, { kind: 'flash', color: WEATHER_FX[state.weather] ?? '#ffffff' })
      state.weatherSince = state.turn
      state.weatherTurns = weatherDuration(state, tags)
      addLine(state, 'field', id === 'none' ? 'La météo redevient normale.' : WEATHERS[id]?.debut ?? `Météo : ${effectName(args[0] ?? '')}`)
      break
    }
    case '-fieldstart':
    case '-fieldend': {
      const id = toId((args[0] ?? '').replace(/^move: /, ''))
      const name = effectName(args[0] ?? '')
      state.fieldEffects = state.fieldEffects.filter(effect => effect !== id)
      if (command === '-fieldstart') {
        state.fieldEffects.push(id)
        state.fieldSince[id] = state.turn
      }
      addLine(state, 'field', command === '-fieldstart' ? `${name} s'installe sur le terrain !` : `${name} prend fin.`)
      break
    }
    case '-sidestart':
    case '-sideend': {
      const side = (args[0] ?? '').slice(0, 2) as SideId
      const id = toId((args[1] ?? '').replace(/^move: /, ''))
      const conditions = state.sides[side].conditions
      if (command === '-sidestart') {
        conditions[id] = (conditions[id] ?? 0) + 1
        state.sides[side].since[id] = state.turn
      } else {
        delete conditions[id]
      }
      const name = SIDE_CONDITIONS[id]?.nom ?? effectName(args[1] ?? '')
      addLine(state, 'field', command === '-sidestart' ? `${name} : mis en place du côté ${ofName(state.sides[side].name)}.` : `${name} disparaît du côté ${ofName(state.sides[side].name)}.`)
      break
    }
    case 'detailschange':
    case '-formechange': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.speciesId = toId(args[1]?.split(',')[0] ?? pokemon.speciesId)
      if (command === 'detailschange' && /-Mega/.test(args[1] ?? '')) addLine(state, 'info', `${displayName(state, side, pokemon)} méga-évolue !`)
      break
    }
    case '-terastallize': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.tera = args[1] ?? ''
      addFx(state, { kind: 'crystal', to: { side, position: pokemon.position }, color: TYPE_GLOW[frenchType(pokemon.tera)] ?? '#ffffff' })
      addLine(state, 'info', `${displayName(state, side, pokemon)} se téracristallise (type ${frenchType(args[1] ?? '?')}) !`)
      break
    }
    case '-supereffective':
      if (lastTarget) addFx(state, { kind: 'burst', to: lastTarget, image: fxImage('hitmarker'), color: '#ff3030' })
      addLine(state, 'info', "C'est super efficace !")
      break
    case '-resisted':
      addLine(state, 'info', "Ce n'est pas très efficace…")
      break
    case '-immune': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      addLine(state, 'info', `Ça n'affecte pas ${displayName(state, side, pokemon)}…`)
      break
    }
    case '-crit':
      addLine(state, 'crit', 'Coup critique !')
      break
    case '-miss': {
      const target = args[1] ? pokemonFrom(state, args[1]) : null
      if (target) animate(state, target.side, 'dodge .45s ease-out')
      addLine(state, 'info', target ? `${displayName(state, target.side, target.pokemon)} évite l'attaque !` : "L'attaque échoue !")
      break
    }
    case '-fail':
      addLine(state, 'info', 'Mais cela échoue !')
      break
    case '-ability': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.ability = toId(args[1] ?? '')
      addLine(state, 'info', `Talent ${ofName(displayName(state, side, pokemon))} : ${abilityName(args[1] ?? '')}.`)
      break
    }
    case '-item':
    case '-enditem': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.item = command === '-item' ? toId(args[1] ?? '') : ''
      addLine(state, 'info', `${displayName(state, side, pokemon)} ${command === '-item' ? 'tient' : 'utilise'} ${itemName(args[1] ?? '')}.`)
      break
    }
    case 'cant': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      const reason = toId(args[1] ?? '')
      const why = reason === 'par' ? 'est paralysé et ne peut pas attaquer' : reason === 'slp' ? 'dort profondément' : reason === 'frz' ? 'est gelé' : reason === 'recharge' ? 'doit se recharger' : `ne peut pas agir (${effectName(args[1] ?? '')})`
      addLine(state, 'info', `${displayName(state, side, pokemon)} ${why} !`)
      break
    }
    case '-activate':
    case '-start':
    case '-end': {
      if (!args[0]?.includes(': ') || !args[1]) break
      const of = tags.find(tag => tag.startsWith('[of] '))
      if (command === '-activate' && args[2]?.startsWith('move: ') && of) {
        const revealed = pokemonFrom(state, of.slice(5))
        const moveId = toId(args[2].slice(6))
        if (!revealed.pokemon.moves.includes(moveId)) revealed.pokemon.moves.push(moveId)
        addLine(state, 'info', `${effectName(args[1])} révèle ${moveName(args[2].slice(6))} chez ${displayName(state, revealed.side, revealed.pokemon)}.`)
        break
      }
      if (tags.includes('[leurre]')) {
        const holder = pokemonFrom(state, args[0])
        addLine(state, 'info', `Le leurre encaisse l'attaque à la place ${ofName(displayName(state, holder.side, holder.pokemon))} !`)
        break
      }
      const { side, pokemon } = pokemonFrom(state, args[0])
      if (tags.includes('[silent]')) break
      const effectId = toId(args[1].replace(/^(move|ability|item): /, ''))
      const boosted = /^(protosynthesis|quarkdrive)(atk|def|spa|spd|spe)$/.exec(effectId)
      if (boosted) {
        addLine(state, 'boost', `${displayName(state, side, pokemon)} : ${abilityName(boosted[1]!)} augmente ${['atk', 'spa'].includes(boosted[2]!) ? 'son' : 'sa'} ${STAT_LABELS[boosted[2]!]} !`)
        break
      }
      const volatile = VOLATILES[effectId]
      const volatileText = volatile && (command === '-start' ? volatile.debut : command === '-end' ? volatile.fin : volatile.actif)
      if (volatileText) {
        addLine(state, 'info', `${displayName(state, side, pokemon)} ${volatileText} !`)
        break
      }
      const verb = command === '-end' ? 'fin de' : ''
      addLine(state, 'info', `${displayName(state, side, pokemon)} : ${verb ? `${verb} ` : ''}${effectName(args[1])}.`)
      break
    }
    case '-message':
      addLine(state, 'info', args[0] ?? '')
      break
    case 'turn': {
      state.turn = Number(args[0] ?? 0)
      state.log.push({ turn: state.turn, lines: [] })
      state.message = `Tour ${state.turn} : que vas-tu faire ?`
      break
    }
    case 'win':
      state.ended = true
      state.winner = args[0] ?? ''
      state.request = null
      addLine(state, 'win', `${state.winner} remporte le combat !`)
      break
    case 'tie':
      state.ended = true
      state.request = null
      addLine(state, 'win', 'Égalité !')
      break
    case 'raw': {
      const rating = /^(.+?)'s rating: (\d+) &rarr; <strong>(\d+)<\/strong>/.exec(args.join('|'))
      if (rating) state.ratings[toId(decodeEntities(rating[1]!))] = { before: Number(rating[2]), after: Number(rating[3]) }
      break
    }
    case 'error':
      state.error = (args[0] ?? '').replace(/^\[[^\]]*\]\s*/, '')
      state.choiceSent = false
      break
  }
}

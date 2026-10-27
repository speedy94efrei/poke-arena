export type SideId = 'p1' | 'p2'
export type LogKind = 'move' | 'damage' | 'heal' | 'switch' | 'faint' | 'status' | 'boost' | 'unboost' | 'field' | 'info' | 'win'

export interface BattlePokemon {
  name: string
  speciesId: string
  hp: number
  maxHp: number
  status: string
  fainted: boolean
  active: boolean
  boosts: Record<string, number>
  item: string
  ability: string
  moves: string[]
}

export interface BattleSide {
  id: SideId
  name: string
  team: BattlePokemon[]
  conditions: Record<string, number>
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
  disabled?: boolean | string
}

export interface RequestPokemon {
  ident: string
  details: string
  condition: string
  active: boolean
  moves: string[]
  baseAbility: string
  item: string
}

export interface ShowdownRequest {
  rqid?: number
  wait?: boolean
  teamPreview?: boolean
  forceSwitch?: boolean[]
  active?: { moves: RequestMove[], trapped?: boolean, maybeTrapped?: boolean }[]
  side: { name: string, id: SideId, pokemon: RequestPokemon[] }
}

export interface BattleState {
  roomid: string
  mySide: SideId | null
  sides: Record<SideId, BattleSide>
  turn: number
  weather: string
  fieldEffects: string[]
  log: LogSection[]
  message: string
  request: ShowdownRequest | null
  pendingRequest: ShowdownRequest | null
  choiceSent: boolean
  started: boolean
  ended: boolean
  winner: string
  error: string
  anims: Record<SideId, { name: string, key: number }>
  floats: { id: number, side: SideId, text: string, color: string }[]
}

const DELAYS: Record<string, number> = {
  'switch': 750, 'drag': 750, 'replace': 750, 'move': 700, 'faint': 800, '-damage': 450, '-heal': 450,
  '-status': 400, '-boost': 350, '-unboost': 350, '-weather': 400, '-fieldstart': 400, '-sidestart': 400,
  'cant': 450, '-supereffective': 250, '-resisted': 250, '-crit': 250, '-miss': 300, 'win': 300,
}

let animationCounter = 0

export function createBattle(roomid: string): BattleState {
  const side = (id: SideId): BattleSide => ({ id, name: '', team: [], conditions: {} })
  return {
    roomid, mySide: null, sides: { p1: side('p1'), p2: side('p2') }, turn: 0, weather: '', fieldEffects: [],
    log: [{ turn: 0, lines: [] }], message: 'Le combat va commencer…', request: null, pendingRequest: null,
    choiceSent: false, started: false, ended: false, winner: '', error: '',
    anims: { p1: { name: '', key: 0 }, p2: { name: '', key: 0 } }, floats: [],
  }
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
  return state.sides[side].team.find(p => p.active)
}

export function displayName(state: BattleState, side: SideId, pokemon: BattlePokemon): string {
  const name = speciesName(pokemon.speciesId, pokemon.name)
  return state.mySide && side !== state.mySide ? `${name} adverse` : name
}

function parseIdent(ident: string): { side: SideId, name: string } {
  const [position = '', ...name] = ident.split(': ')
  return { side: position.slice(0, 2) as SideId, name: name.join(': ').normalize('NFC') }
}

function parseCondition(condition: string): { hp: number, maxHp: number, status: string, fainted: boolean } {
  const [hpPart = '0', status = ''] = condition.split(' ')
  if (status === 'fnt' || hpPart === '0') return { hp: 0, maxHp: 0, status: '', fainted: true }
  const [hp = '0', maxHp = '100'] = hpPart.split('/')
  return { hp: Number(hp), maxHp: Number(maxHp), status, fainted: false }
}

function findOrAdd(state: BattleState, side: SideId, name: string, details = ''): BattlePokemon {
  const team = state.sides[side].team
  const speciesId = details ? toId(details.split(',')[0] ?? '') : ''
  let pokemon = team.find(p => p.name === name)
    ?? team.find(p => !p.name && speciesId && p.speciesId === speciesId)
  if (!pokemon) {
    team.push({ name, speciesId, hp: 100, maxHp: 100, status: '', fainted: false, active: false, boosts: {}, item: '', ability: '', moves: [] })
    pokemon = team[team.length - 1]!
  }
  pokemon.name = name
  if (speciesId) pokemon.speciesId = speciesId
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
      item: own.item, ability: own.baseAbility, moves: own.moves,
    })
  }
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
    case 'clearpoke':
      state.sides.p1.team = state.sides.p1.team.filter(p => p.name)
      state.sides.p2.team = state.sides.p2.team.filter(p => p.name)
      break
    case 'poke': {
      const side = args[0] as SideId
      const speciesId = toId(args[1]?.split(',')[0] ?? '')
      if (!state.sides[side].team.some(p => p.speciesId === speciesId)) {
        state.sides[side].team.push({ name: '', speciesId, hp: 100, maxHp: 100, status: '', fainted: false, active: false, boosts: {}, item: '', ability: '', moves: [] })
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
      const { side, name } = parseIdent(args[0] ?? '')
      for (const other of state.sides[side].team) {
        if (other.active) {
          other.active = false
          other.boosts = {}
        }
      }
      const pokemon = findOrAdd(state, side, name, args[1])
      pokemon.active = true
      setHp(state, side, pokemon, args[2] ?? '100/100')
      animate(state, side, 'sendOut .55s both')
      const trainer = state.sides[side].name
      const nom = speciesName(pokemon.speciesId, pokemon.name)
      addLine(state, 'switch', side === state.mySide ? `En avant, ${nom} !` : command === 'drag' ? `${nom} est forcé d'entrer !` : `${trainer} envoie ${nom} !`)
      break
    }
    case 'move': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
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
      float(state, side, `${damage ? '−' : '+'}${Math.abs(delta)} %`, damage ? '#ff5a4a' : '#48c878')
      if (damage) animate(state, side, 'hit .35s')
      addLine(state, damage ? 'damage' : 'heal', `${displayName(state, side, pokemon)} ${damage ? 'perd' : 'récupère'} ${Math.abs(delta)} % de ses PV${causeText(tags)}.`)
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
      addLine(state, 'status', `L'équipe de ${state.sides[side].name} est soignée.`)
      break
    }
    case '-boost':
    case '-unboost': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      const stat = args[1] ?? ''
      const amount = Number(args[2] ?? 0) * (command === '-boost' ? 1 : -1)
      pokemon.boosts[stat] = Math.max(-6, Math.min(6, (pokemon.boosts[stat] ?? 0) + amount))
      if (amount) addLine(state, amount > 0 ? 'boost' : 'unboost', `${STAT_LABELS[stat] ?? stat} de ${displayName(state, side, pokemon)} ${boostVerb(amount)} !`)
      break
    }
    case '-clearboost':
    case '-clearnegativeboost': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.boosts = command === '-clearboost' ? {} : Object.fromEntries(Object.entries(pokemon.boosts).filter(([, v]) => v > 0))
      addLine(state, 'info', `Les changements de stats de ${displayName(state, side, pokemon)} sont annulés.`)
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
      addLine(state, 'field', id === 'none' ? 'La météo redevient normale.' : WEATHERS[id]?.debut ?? `Météo : ${effectName(args[0] ?? '')}`)
      break
    }
    case '-fieldstart':
    case '-fieldend': {
      const id = toId((args[0] ?? '').replace(/^move: /, ''))
      const name = effectName(args[0] ?? '')
      state.fieldEffects = state.fieldEffects.filter(effect => effect !== id)
      if (command === '-fieldstart') state.fieldEffects.push(id)
      addLine(state, 'field', command === '-fieldstart' ? `${name} s'installe sur le terrain !` : `${name} prend fin.`)
      break
    }
    case '-sidestart':
    case '-sideend': {
      const side = (args[0] ?? '').slice(0, 2) as SideId
      const id = toId((args[1] ?? '').replace(/^move: /, ''))
      const conditions = state.sides[side].conditions
      if (command === '-sidestart') conditions[id] = (conditions[id] ?? 0) + 1
      else delete conditions[id]
      const name = SIDE_CONDITIONS[id]?.nom ?? effectName(args[1] ?? '')
      addLine(state, 'field', command === '-sidestart' ? `${name} : mis en place du côté de ${state.sides[side].name}.` : `${name} disparaît du côté de ${state.sides[side].name}.`)
      break
    }
    case '-supereffective':
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
      addLine(state, 'info', 'Coup critique !')
      break
    case '-miss': {
      const target = args[1] ? pokemonFrom(state, args[1]) : null
      addLine(state, 'info', target ? `${displayName(state, target.side, target.pokemon)} évite l'attaque !` : "L'attaque échoue !")
      break
    }
    case '-fail':
      addLine(state, 'info', 'Mais cela échoue !')
      break
    case '-ability': {
      const { side, pokemon } = pokemonFrom(state, args[0] ?? '')
      pokemon.ability = toId(args[1] ?? '')
      addLine(state, 'info', `Talent de ${displayName(state, side, pokemon)} : ${abilityName(args[1] ?? '')}.`)
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
      const { side, pokemon } = pokemonFrom(state, args[0])
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
    case 'error':
      state.error = (args[0] ?? '').replace(/^\[[^\]]*\]\s*/, '')
      state.choiceSent = false
      break
  }
}

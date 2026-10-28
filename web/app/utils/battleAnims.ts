import type { TypePokemon } from '#data/types/roster'
import type { SideId } from '~/utils/battleTracker'

/** Un effet visuel de la scène de combat, joué une fois puis oublié. */
export interface FxEvent {
  id: number
  kind: 'shot' | 'throw' | 'burst' | 'drop' | 'orbit' | 'rise' | 'shield' | 'arrows' | 'puff' | 'bite' | 'slash' | 'flash' | 'shake' | 'ball' | 'crystal'
  /** Camp et place de départ (lanceur) et d'arrivée (cible). */
  from?: { side: SideId, position: number }
  to?: { side: SideId, position: number }
  image?: string
  color?: string
  count?: number
  delay?: number
  label?: string
}

export type FxSpec = Omit<FxEvent, 'id'>

export interface MoveAnimation {
  /** Mouvement du lanceur : il fonce sur la cible, ou se ramasse pour lancer son attaque. */
  motion: 'lunge' | 'cast' | 'spin' | 'none'
  fx: FxSpec[]
}

const FX = 'https://play.pokemonshowdown.com/fx/'

/** Projectile de chaque type, pour les attaques à distance. */
const PROJECTILES: Record<string, string> = {
  Feu: 'fireball', Eau: 'waterwisp', Électrik: 'electroball', Plante: 'leaf1', Glace: 'iceball', Combat: 'mistball',
  Poison: 'poisonwisp', Sol: 'mudwisp', Vol: 'feather', Psy: 'mistball', Insecte: 'energyball', Roche: 'rock1',
  Spectre: 'shadowball', Dragon: 'flareball', Ténèbres: 'blackwisp', Acier: 'gear', Fée: 'mistball', Normal: 'wisp',
  Stellaire: 'shine',
}

export const TYPE_GLOW: Record<string, string> = {
  Feu: '#ff7030', Eau: '#3a8ef0', Électrik: '#f8d030', Plante: '#58c040', Glace: '#70d8f0', Combat: '#d05030', Poison: '#a050c8',
  Sol: '#c8a050', Vol: '#90b8f0', Psy: '#f05888', Insecte: '#a8b820', Roche: '#b8a060', Spectre: '#7058a0', Dragon: '#7038f8',
  Ténèbres: '#504040', Acier: '#b8b8d0', Fée: '#f0a0e0', Normal: '#e0e0d0', Stellaire: '#ffffff',
}

/** Attaques qui envoient plusieurs projectiles à la suite, comme un rayon. */
const BEAMS = ['flamethrower', 'hydropump', 'icebeam', 'hyperbeam', 'solarbeam', 'thunderbolt', 'surf', 'dazzlinggleam', 'moonblast', 'psychic', 'psyshock', 'darkpulse', 'dragonpulse', 'flashcannon', 'energyball', 'sludgebomb', 'sludgewave', 'scald', 'aurasphere', 'focusblast', 'shadowball', 'earthpower', 'heatwave', 'hurricane', 'airslash', 'bugbuzz', 'boomburst', 'hypervoice', 'makeitrain', 'fierydance', 'blizzard', 'freezedry', 'gigadrain', 'leafstorm', 'overheat', 'fireblast', 'weatherball', 'voltswitch', 'discharge', 'chargebeam']
/** Attaques au sol qui font trembler toute la scène. */
const QUAKES = ['earthquake', 'bulldoze', 'precipiceblades', 'magnitude', 'fissure', 'stompingtantrum', 'highhorsepower', 'earthpower']
/** Attaques de pierres qui tombent sur la cible. */
const ROCK_FALLS = ['stoneedge', 'rockslide', 'rocktomb', 'diamondstorm', 'ceaselessedge', 'stealthrock', 'meteormash', 'dracometeor']
const KICKS = ['highjumpkick', 'jumpkick', 'tripleaxel', 'lowkick', 'blazekick', 'megakick', 'doublekick', 'rollingkick', 'tropkick', 'axekick', 'triplekick', 'lowsweep']
const CLAWS = ['dragonclaw', 'shadowclaw', 'crushclaw', 'metalclaw', 'honeclaws', 'dragontail']
const PROTECTS = ['protect', 'detect', 'kingsshield', 'spikyshield', 'banefulbunker', 'silktrap', 'obstruct', 'burningbulwark', 'endure']
const HEALS = ['recover', 'roost', 'slackoff', 'softboiled', 'moonlight', 'morningsun', 'synthesis', 'milkdrink', 'shoreup', 'wish', 'rest', 'healorder', 'strengthsap', 'junglehealing', 'lifedew', 'painsplit']
const SETUPS = ['swordsdance', 'dragondance', 'bulkup', 'calmmind', 'nastyplot', 'quiverdance', 'shellsmash', 'agility', 'rockpolish', 'irondefense', 'amnesia', 'coil', 'growth', 'curse', 'shiftgear', 'tidyup', 'victorydance', 'bellydrum', 'workup', 'autotomize', 'cosmicpower', 'geomancy', 'tailglow', 'filletaway', 'clangoroussoul']
const HAZARDS: Record<string, string> = { stealthrock: 'rock1', spikes: 'caltrop', toxicspikes: 'poisoncaltrop', stickyweb: 'web' }
const STATUS_SHOTS: Record<string, { image: string, color: string }> = {
  willowisp: { image: 'bluefireball', color: '#5870f0' }, toxic: { image: 'poisonwisp', color: '#a050c8' },
  poisonpowder: { image: 'poisonwisp', color: '#a050c8' }, thunderwave: { image: 'electroball', color: '#f8d030' },
  glare: { image: 'stare', color: '#f8d030' }, nuzzle: { image: 'electroball', color: '#f8d030' }, spore: { image: 'wisp', color: '#80c060' },
  sleeppowder: { image: 'wisp', color: '#80c060' }, yawn: { image: 'wisp', color: '#c0c0f0' }, hypnosis: { image: 'mistball', color: '#f05888' },
  leechseed: { image: 'leaf1', color: '#58c040' }, taunt: { image: 'angry', color: '#e04838' }, encore: { image: 'heart', color: '#f0a0e0' },
  trick: { image: 'gear', color: '#c0c0c0' }, switcheroo: { image: 'gear', color: '#c0c0c0' }, partingshot: { image: 'angry', color: '#504040' },
  haze: { image: 'blackwisp', color: '#7a7a8a' }, whirlwind: { image: 'feather', color: '#b0d0f0' }, roar: { image: 'angry', color: '#e0a040' },
}
const WEATHER_FLASH: Record<string, string> = {
  raindance: '#3a8ef0', sunnyday: '#ffb030', sandstorm: '#c8a050', snowscape: '#c0f0ff', hail: '#c0f0ff', chillyreception: '#c0f0ff',
  trickroom: '#c050f0', electricterrain: '#f8d030', grassyterrain: '#58c040', psychicterrain: '#f05888', mistyterrain: '#f0a0e0',
}

export function fxImage(name: string): string {
  return `${FX}${name}.png`
}

interface MoveInfo {
  id: string
  type: TypePokemon
  category: 'Physique' | 'Spéciale' | 'Statut'
  contact: boolean
  punch: boolean
  bite: boolean
  slicing: boolean
  selfTarget: boolean
}

/**
 * Animation d'une attaque, d'après Showdown : les attaques de contact foncent sur la cible (poing, pied, morsure,
 * griffe ou impact), celles à distance envoient le projectile de leur type, les attaques de statut entourent leur
 * lanceur ou visent la cible ; quelques attaques connues ont leur propre effet (séisme, pierres, pièges, protection).
 */
export function moveAnimation(move: MoveInfo, from: { side: SideId, position: number }, to: { side: SideId, position: number } | null): MoveAnimation {
  const target = to ?? from
  const glow = TYPE_GLOW[move.type] ?? '#ffffff'
  const projectile = fxImage(PROJECTILES[move.type] ?? 'wisp')

  if (HAZARDS[move.id]) {
    const foe = { side: (from.side === 'p1' ? 'p2' : 'p1') as SideId, position: 0 }
    return { motion: 'cast', fx: [{ kind: 'drop', to: foe, image: fxImage(HAZARDS[move.id]!), count: 4 }] }
  }
  if (WEATHER_FLASH[move.id]) return { motion: 'cast', fx: [{ kind: 'flash', color: WEATHER_FLASH[move.id] }, { kind: 'rise', to: from, image: fxImage('shine'), color: WEATHER_FLASH[move.id], count: 5 }] }
  if (PROTECTS.includes(move.id)) return { motion: 'none', fx: [{ kind: 'shield', to: from, color: move.id === 'endure' ? '#f0a040' : '#80c8ff' }] }
  if (HEALS.includes(move.id)) return { motion: 'none', fx: [{ kind: 'rise', to: from, image: fxImage('shine'), color: '#70e070', count: 6 }] }
  if (move.id === 'swordsdance') return { motion: 'spin', fx: [{ kind: 'orbit', to: from, image: fxImage('sword'), count: 3 }] }
  if (SETUPS.includes(move.id)) return { motion: 'cast', fx: [{ kind: 'rise', to: from, image: fxImage('shine'), color: glow, count: 6 }, { kind: 'flash', color: glow }] }
  if (['rapidspin', 'mortalspin', 'defog', 'tidyup'].includes(move.id)) {
    return { motion: 'spin', fx: move.category === 'Statut' ? [{ kind: 'flash', color: '#d0e8ff' }] : [{ kind: 'burst', to: target, image: fxImage('impact') }] }
  }
  if (move.category === 'Statut') {
    const shot = STATUS_SHOTS[move.id]
    if (shot && to) return { motion: 'cast', fx: [{ kind: 'shot', from, to, image: fxImage(shot.image), color: shot.color }, { kind: 'puff', to, color: shot.color, delay: 380 }] }
    if (move.selfTarget || !to) return { motion: 'cast', fx: [{ kind: 'rise', to: from, image: fxImage('shine'), color: glow, count: 5 }] }
    return { motion: 'cast', fx: [{ kind: 'shot', from, to, image: projectile, color: glow }, { kind: 'puff', to, color: glow, delay: 380 }] }
  }

  if (QUAKES.includes(move.id)) return { motion: 'cast', fx: [{ kind: 'shake' }, { kind: 'drop', to: target, image: fxImage('rock3'), count: 3 }] }
  if (ROCK_FALLS.includes(move.id)) return { motion: 'cast', fx: [{ kind: 'drop', to: target, image: fxImage(move.id === 'dracometeor' ? 'flareball' : move.id === 'meteormash' ? 'gear' : 'rock1'), count: 4 }, { kind: 'burst', to: target, image: fxImage('impact'), delay: 450 }] }

  if (move.contact) {
    const hit: FxSpec = { kind: 'burst', to: target, image: fxImage('impact'), color: glow, delay: 220 }
    if (move.punch) return { motion: 'lunge', fx: [{ kind: 'throw', from, to: target, image: fxImage('fist') }, hit] }
    if (KICKS.includes(move.id)) return { motion: 'lunge', fx: [{ kind: 'throw', from, to: target, image: fxImage('foot') }, hit] }
    if (move.bite) return { motion: 'lunge', fx: [{ kind: 'bite', to: target }, hit] }
    if (CLAWS.includes(move.id)) return { motion: 'lunge', fx: [{ kind: 'slash', to: target, image: fxImage('rightclaw') }, hit] }
    if (move.slicing) return { motion: 'lunge', fx: [{ kind: 'slash', to: target, image: fxImage('rightslash') }, hit] }
    return { motion: 'lunge', fx: [hit, { kind: 'flash', color: glow, delay: 220 }] }
  }

  const count = BEAMS.includes(move.id) ? 4 : 1
  return {
    motion: 'cast',
    fx: [
      { kind: 'shot', from, to: target, image: move.id.startsWith('thunder') ? fxImage('lightning') : projectile, color: glow, count },
      { kind: 'burst', to: target, image: fxImage('impact'), color: glow, delay: 360 + (count - 1) * 90 },
    ],
  }
}

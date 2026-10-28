import type { TypePokemon } from '#data/types/roster'
import type { ClassicSet } from '~/utils/classicTeam'
import type { PokedexData } from '~/utils/dex'
import type { Evs, StatId } from '~/utils/showdownTeam'
import type { UsageData, UsagePokemon } from '~/utils/usage'

/** Point de départ d'une nouvelle équipe. */
export type TeamStart = 'empty' | 'assistant' | 'import'

const STAT_ORDER: StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

/** Les 18 types, dans l'ordre du tableau des faiblesses. */
export const TYPE_ORDER: TypePokemon[] = ['Normal', 'Feu', 'Eau', 'Plante', 'Électrik', 'Glace', 'Combat', 'Poison', 'Sol', 'Vol', 'Psy', 'Insecte', 'Roche', 'Spectre', 'Dragon', 'Ténèbres', 'Acier', 'Fée']

/** Talents qui changent les faiblesses : immunité (0) ou résistance (0,5) à un type. */
const ABILITY_TYPE_MODIFIERS: Record<string, Partial<Record<TypePokemon, number>>> = {
  levitate: { Sol: 0 }, eartheater: { Sol: 0 }, flashfire: { Feu: 0 }, wellbakedbody: { Feu: 0 }, waterabsorb: { Eau: 0 },
  stormdrain: { Eau: 0 }, dryskin: { Eau: 0 }, voltabsorb: { Électrik: 0 }, lightningrod: { Électrik: 0 }, motordrive: { Électrik: 0 },
  sapsipper: { Plante: 0 }, thickfat: { Feu: 0.5, Glace: 0.5 }, purifyingsalt: { Spectre: 0.5 }, heatproof: { Feu: 0.5 }, waterbubble: { Feu: 0.5 },
}

/** Niveau imposé par le format : 50 en VGC et formats niveau 50, 5 en Little Cup. */
export function levelFor(format: string, level50: boolean): number {
  if (level50 || /vgc|battlestadium|bss/.test(format)) return 50
  return /lc(uu)?$/.test(format) && !format.includes('vgc') ? 5 : 100
}

export function emptySetFor(species: string, level: number): ClassicSet {
  return { nickname: '', species, item: '', ability: '', moves: [], nature: '', evs: {}, ivs: {}, gender: '', level, shiny: false, teraType: '' }
}

/** Lit une répartition Smogon « Jolly:0/252/4/0/0/252 » en nature et EV. */
export function parseSpread(spread: string): { nature: string, evs: Partial<Evs> } {
  const [nature = '', values = ''] = spread.split(':')
  const numbers = values.split('/').map(Number)
  const evs: Partial<Evs> = {}
  STAT_ORDER.forEach((stat, index) => {
    if (numbers[index]) evs[stat] = numbers[index]
  })
  return { nature: toId(nature), evs }
}

/**
 * Set le plus joué d'un Pokémon selon les statistiques Smogon du format. Sans statistiques : son premier talent
 * et une répartition d'attaquant rapide sur sa meilleure stat offensive, les attaques restant à choisir.
 */
export function setFromUsage(species: string, usage: UsagePokemon | undefined, dex: PokedexData | null, level: number): ClassicSet {
  const set = emptySetFor(species, level)
  const entry = dex?.pokemon[species]
  set.ability = usage?.abilities[0]?.[0] ?? toId(entry?.abilities[0] ?? '')
  if (!usage) {
    const physical = (entry?.stats.atk ?? 0) >= (entry?.stats.spa ?? 0)
    return { ...set, nature: physical ? 'jolly' : 'timid', evs: physical ? { hp: 4, atk: 252, spe: 252 } : { hp: 4, spa: 252, spe: 252 } }
  }
  set.moves = usage.moves.map(([move]) => move).filter(move => move && move !== 'nothing').slice(0, 4)
  set.item = usage.items[0]?.[0] && usage.items[0][0] !== 'nothing' ? usage.items[0][0] : ''
  set.teraType = usage.tera[0]?.[0] ?? ''
  if (usage.spreads[0]) Object.assign(set, parseSpread(usage.spreads[0][0]))
  return set
}

export function usageOf(usage: UsageData | null, species: string): UsagePokemon | undefined {
  return usage?.pokemon.find(entry => entry.id === species)
}

/** Multiplicateur de dégâts d'un type d'attaque sur un Pokémon, talent compris. */
export function damageTaken(type: TypePokemon, types: TypePokemon[], ability: string): number {
  const modifier = ABILITY_TYPE_MODIFIERS[ability]?.[type]
  const base = effectiveness(type, types)
  return modifier === undefined ? base : base * modifier
}

/** Tableau des faiblesses : pour chaque type d'attaque, le multiplicateur subi par chaque Pokémon de l'équipe. */
export function weaknessTable(sets: ClassicSet[], dex: PokedexData | null) {
  return TYPE_ORDER.map((type) => {
    const cells = sets.map((set) => {
      const types = dex?.pokemon[set.species]?.types ?? []
      return types.length ? damageTaken(type, types, set.ability) : 1
    })
    return { type, cells, weak: cells.filter(value => value > 1).length, resist: cells.filter(value => value < 1).length }
  })
}

export interface StyleProfile {
  label: string
  bars: { left: string, right: string, value: number }[]
}

const SETUP_MOVES = ['swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'quiverdance', 'shellsmash', 'bulkup', 'tidyup', 'victorydance', 'shiftgear', 'agility', 'rockpolish', 'bellydrum', 'coil', 'growth', 'irondefense', 'curse', 'workup']
const RECOVERY_MOVES = ['recover', 'roost', 'slackoff', 'softboiled', 'moonlight', 'morningsun', 'synthesis', 'milkdrink', 'shoreup', 'strengthsap', 'wish', 'rest', 'healorder', 'junglehealing', 'lunarblessing']

/**
 * Profil de jeu de l'équipe, calculé sur les stats de base et les attaques : offensif ou défensif, physique ou spécial,
 * rapide ou lent ; le libellé reprend les styles officiels de Smogon (météo, Distorsion, hyper offense, balance, stall).
 */
export function styleProfile(sets: ClassicSet[], dex: PokedexData | null): StyleProfile {
  const species = sets.map(set => dex?.pokemon[set.species]).filter(entry => entry !== undefined)
  if (!species.length || !dex) return { label: 'Équipe vide', bars: [] }
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
  const offense = average(species.map(entry => Math.max(entry.stats.atk, entry.stats.spa) + entry.stats.spe))
  const bulk = average(species.map(entry => entry.stats.hp + (entry.stats.def + entry.stats.spd) / 2))
  const moves = sets.flatMap(set => set.moves.map(move => dex.moves[move]).filter(move => move !== undefined))
  const physical = moves.filter(move => move.category === 'Physique').length
  const special = moves.filter(move => move.category === 'Spéciale').length
  const speed = average(species.map(entry => entry.stats.spe))
  const offensive = offense / (offense + bulk)
  const abilities = sets.map(set => set.ability)
  const allMoves = sets.flatMap(set => set.moves)
  const recovery = allMoves.filter(move => RECOVERY_MOVES.includes(move)).length
  const setup = allMoves.filter(move => SETUP_MOVES.includes(move)).length
  let label = offensive > 0.6 ? (setup >= 2 ? 'Hyper offense' : 'Offense') : offensive > 0.5 ? 'Balance' : recovery >= 3 ? 'Stall' : 'Semi-stall'
  if (abilities.includes('drizzle')) label = 'Pluie'
  else if (abilities.includes('drought') || abilities.includes('orichalcumpulse')) label = 'Soleil'
  else if (abilities.includes('sandstream')) label = 'Sable'
  else if (abilities.includes('snowwarning')) label = 'Neige'
  else if (allMoves.includes('trickroom') && speed < 70) label = 'Distorsion'
  return {
    label,
    bars: [
      { left: 'Défensif', right: 'Offensif', value: Math.min(1, Math.max(0, (offensive - 0.4) / 0.3)) },
      { left: 'Spécial', right: 'Physique', value: physical + special ? physical / (physical + special) : 0.5 },
      { left: 'Lent', right: 'Rapide', value: Math.min(1, Math.max(0, (speed - 40) / 80)) },
    ],
  }
}

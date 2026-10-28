import { shallowRef } from 'vue'
import type * as Calc from '@smogon/calc'
import type { TypePokemon } from '#data/types/roster'
import type { BattlePokemon, BattleState, SideId } from '~/utils/battleTracker'
import type { UsageData } from '~/utils/usage'

type CalcModule = typeof Calc
type Stats = { hp: number, atk: number, def: number, spa: number, spd: number, spe: number }

/** Set supposé d'un Pokémon : objet, talent, nature, EV et type Téra. */
export interface ProbableSet {
  item: string
  ability: string
  nature: string
  evs: Partial<Stats>
  teraType: string
  /** D'où vient le set : statistiques du format, fiche PokéDraft, ou valeurs génériques. */
  source: 'usage' | 'fiche' | 'generique'
}

export interface MoveCalc {
  /** Type réel de l'attaque (Ball'Météo sous la pluie, Téra Explosion…), en français. */
  type: TypePokemon
  /** Puissance réelle (Ball'Météo sous la pluie, Acrobatie sans objet…). */
  power: number
  minPct: number
  maxPct: number
  min: number
  max: number
  defenderHp: number
  defenderMaxHp: number
  critMinPct: number
  critMaxPct: number
  koText: string
  multiplier: number
  immune: boolean
  rows: { k: string, v: string }[]
  warnings: string[]
}

const CALC_WEATHERS: Record<string, Calc.State.Field['weather']> = {
  raindance: 'Rain', sunnyday: 'Sun', sandstorm: 'Sand', snow: 'Snow', snowscape: 'Snow', hail: 'Hail',
  desolateland: 'Harsh Sunshine', primordialsea: 'Heavy Rain', deltastream: 'Strong Winds',
}
const TERRAINS: Record<string, Calc.State.Field['terrain']> = {
  electricterrain: 'Electric', grassyterrain: 'Grassy', psychicterrain: 'Psychic', mistyterrain: 'Misty',
}
const STATUS = ['brn', 'par', 'psn', 'tox', 'slp', 'frz']
const BOOST_LABELS: Record<string, string> = { atk: 'Atq', def: 'Déf', spa: 'Atq. Spé.', spd: 'Déf. Spé.', spe: 'Vit' }
const CONTACT_PUNISH: Record<string, string> = {
  rockyhelmet: 'Casque Brut −1/6 PV', roughskin: 'Peau Dure −1/8 PV', ironbarbs: 'Épine de Fer −1/8 PV',
  flamebody: 'Corps Ardent : risque de brûlure', static: 'Statik : risque de paralysie', poisonpoint: 'Point Poison : risque de poison',
}
/** Effets marquants à rappeler sur la carte de l'attaque. */
const MOVE_NOTES: Record<string, string> = {
  knockoff: "Retire l'objet de la cible", rapidspin: 'Retire tes pièges · Vit +1', mortalspin: 'Retire tes pièges · empoisonne',
  defog: 'Retire les pièges des deux côtés', tidyup: 'Retire les pièges · Atq et Vit +1', uturn: 'Te fait changer de Pokémon',
  voltswitch: 'Te fait changer de Pokémon', flipturn: 'Te fait changer de Pokémon', partingshot: 'Te fait changer de Pokémon',
  closecombat: 'Déf et Déf. Spé. −1 pour toi', superpower: 'Atq et Déf −1 pour toi', dracometeor: 'Atq. Spé. −2 pour toi',
  overheat: 'Atq. Spé. −2 pour toi', leafstorm: 'Atq. Spé. −2 pour toi', makeitrain: 'Atq. Spé. −1 pour toi',
  headlongrush: 'Déf et Déf. Spé. −1 pour toi', hammerarm: 'Vit −1 pour toi', suckerpunch: 'Échoue si la cible n\'attaque pas',
  fakeout: 'Seulement au premier tour sur le terrain', explosion: 'Le lanceur est K.O.', destinybond: 'Emporte l\'attaquant s\'il te met K.O.',
}

let loading: Promise<CalcModule> | null = null
const loaded = shallowRef<CalcModule | null>(null)

/** Le calculateur de dégâts de Smogon, chargé à la première utilisation. */
export function loadCalc(): Promise<CalcModule> {
  loading ??= import('@smogon/calc').then((module) => {
    loaded.value = module
    return module
  })
  return loading
}

export function currentCalc(): CalcModule | null {
  return loaded.value
}

const FR_TO_EN = Object.fromEntries(Object.entries(TYPE_EN_TO_FR).map(([en, fr]) => [fr, en])) as Record<string, string>
const percentText = (value: number) => `${Math.round(value * 100)} %`
const decimal = (value: number) => String(value).replace('.', ',')

export function generationOf(format: string): Calc.GenerationNum {
  const gen = Number(/^gen(\d)/.exec(format)?.[1] ?? 9)
  return (gen >= 1 && gen <= 9 ? gen : 9) as Calc.GenerationNum
}

/** Set supposé d'un Pokémon adverse : le plus joué du format, la fiche PokéDraft, ou un set générique. */
export function probableSet(speciesId: string, usage: UsageData | null, pokedraft: boolean): ProbableSet {
  if (pokedraft) {
    const fiche = findPokemon(speciesId)
    if (fiche) {
      const variant = defaultVariant(fiche)
      return { item: variant.objetId, ability: fiche.talent.id, nature: variant.natureId, evs: variant.evs, teraType: '', source: 'fiche' }
    }
  }
  const entry = usage?.pokemon.find(candidate => candidate.id === speciesId)
  if (entry) {
    const pick = (shares: [string, number][]) => shares.find(([id]) => id && id !== 'nothing')?.[0] ?? ''
    const { nature, evs } = parseSpread(entry.spreads[0]?.[0] ?? '')
    return { item: pick(entry.items), ability: pick(entry.abilities), nature: nature || 'serious', evs, teraType: entry.tera[0]?.[0] ?? '', source: 'usage' }
  }
  const abilities = currentPokedex()?.pokemon[speciesId]?.abilities ?? []
  return { item: '', ability: toId(abilities[0] ?? ''), nature: 'serious', evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 }, teraType: '', source: 'generique' }
}

/** Ce que le calcul sait d'un Pokémon en combat : le vrai set pour les tiens, le set supposé pour l'adversaire. */
export interface Fighter {
  pokemon: BattlePokemon
  side: SideId
  own: boolean
  set: ProbableSet
  /** Type Téra actif (déjà téracristallisé, ou Téracristal choisi pour ce tour). */
  tera: string
}

/** Le calculateur reconnaît Pokémon, objets, talents et attaques par leur nom anglais, pas par leur identifiant. */
function calcName(table: { get: (id: ReturnType<CalcModule['toID']>) => { name: string } | undefined }, calc: CalcModule, id: string): string {
  return table.get(calc.toID(id))?.name ?? id
}

function buildPokemon(calc: CalcModule, gen: Calc.GenerationNum, fighter: Fighter, pokedraft: boolean) {
  const { pokemon, set, own } = fighter
  const data = calc.Generations.get(gen)
  const item = own ? pokemon.item : pokemon.item || set.item
  const ability = pokemon.ability || set.ability
  const fiche = pokedraft ? findPokemon(pokemon.speciesId) : undefined
  const overrides = fiche
    ? {
        types: fiche.types.map(type => FR_TO_EN[type] ?? type),
        baseStats: { hp: fiche.stats.pv, atk: fiche.stats.atq, def: fiche.stats.def, spa: fiche.stats.atqSpe, spd: fiche.stats.defSpe, spe: fiche.stats.vit },
      } as unknown as Calc.State.Pokemon['overrides']
    : undefined
  const result = new calc.Pokemon(gen, calcName(data.species, calc, pokemon.speciesId), {
    level: pokemon.level || 100,
    item: item ? calcName(data.items, calc, item) : undefined,
    ability: ability ? calcName(data.abilities, calc, ability) : undefined,
    nature: set.nature || undefined,
    evs: set.evs,
    boosts: pokemon.boosts,
    status: (STATUS.includes(pokemon.status) ? pokemon.status : '') as Calc.State.Pokemon['status'],
    teraType: (fighter.tera || undefined) as Calc.State.Pokemon['teraType'],
    overrides,
  })
  if (own && pokemon.stats) {
    result.rawStats = { ...pokemon.stats, hp: pokemon.maxHp }
    result.stats = { ...pokemon.stats, hp: pokemon.maxHp }
  }
  const max = own ? pokemon.maxHp : result.maxHP()
  result.originalCurHP = own ? pokemon.hp : Math.max(1, Math.round(max * (pokemon.maxHp ? pokemon.hp / pokemon.maxHp : 1)))
  return result
}

function sideState(battle: BattleState, side: SideId): Partial<Calc.State.Side> {
  const conditions = battle.sides[side].conditions
  return {
    isSR: Boolean(conditions.stealthrock), spikes: conditions.spikes ?? 0, isReflect: Boolean(conditions.reflect),
    isLightScreen: Boolean(conditions.lightscreen), isAuroraVeil: Boolean(conditions.auroraveil), isTailwind: Boolean(conditions.tailwind),
  }
}

/** PV supposés d'un Pokémon adverse : sa part de PV appliquée à ses PV max supposés. */
export function estimatedHp(calc: CalcModule, battle: BattleState, pokemon: BattlePokemon, set: ProbableSet) {
  const pokedraft = isPokedraft(battle)
  const built = buildPokemon(calc, generationOf(battle.format), { pokemon, side: 'p2', own: false, set, tera: '' }, pokedraft)
  return { hp: built.originalCurHP, max: built.maxHP() }
}

/** Texte de la chance de K.O. renvoyée par le calculateur, en français. */
function koText(ko: { chance?: number, n: number }) {
  if (!ko.n) return 'Pas de K.O. en 4 coups'
  const hits = ko.n === 1 ? 'en un coup' : `en ${ko.n} coups`
  if (ko.chance === undefined || ko.chance >= 1) return `K.O. ${hits} assuré`
  return `${percentText(ko.chance)} de chances de K.O. ${hits}`
}

/**
 * Dégâts d'une attaque du joueur sur un Pokémon adverse, avec le calculateur de Smogon : fourchette en PV et en %,
 * coup critique, chance de K.O., efficacité du type et avertissements (contact puni, effets de l'attaque).
 */
export function calcMove(calc: CalcModule, battle: BattleState, attacker: Fighter, defender: Fighter, moveId: string): MoveCalc | null {
  const gen = generationOf(battle.format)
  const pokedraft = isPokedraft(battle)
  const data = calc.Generations.get(gen).moves.get(calc.toID(moveId))
  const fiche = pokedraft ? findMove(moveId) : undefined
  const category = fiche ? (fiche.categorie === 'physique' ? 'Physical' : fiche.categorie === 'spécial' ? 'Special' : 'Status') : data?.category
  const overrides = fiche
    ? { basePower: fiche.puissance ?? 0, type: FR_TO_EN[fiche.type] ?? fiche.type, category } as unknown as Calc.State.Move['overrides']
    : undefined
  if ((!data && !fiche) || category === 'Status') return null

  const field = new calc.Field({
    gameType: battle.gameType === 'doubles' ? 'Doubles' : 'Singles',
    weather: CALC_WEATHERS[battle.weather],
    terrain: TERRAINS[battle.fieldEffects.find(effect => TERRAINS[effect]) ?? ''],
    isGravity: battle.fieldEffects.includes('gravity'),
    attackerSide: sideState(battle, attacker.side) as Calc.State.Side,
    defenderSide: sideState(battle, defender.side) as Calc.State.Side,
  })
  const source = buildPokemon(calc, gen, attacker, pokedraft)
  const target = buildPokemon(calc, gen, defender, pokedraft)
  const moveName = data?.name ?? moveId
  const move = new calc.Move(gen, moveName, { overrides })
  const result = calc.calculate(gen, source, target, move, field)
  const crit = calc.calculate(gen, source, target, new calc.Move(gen, moveName, { isCrit: true, overrides }), field)

  const [min, max] = result.range()
  const [critMin, critMax] = crit.range()
  const hp = target.originalCurHP
  const maxHp = target.maxHP()
  const typeData = calc.Generations.get(gen).types
  const moveType = result.move.type
  const effectivenessParts = target.types.map((type) => {
    const value = typeData.get(calc.toID(moveType))?.effectiveness[type] ?? 1
    return { type, value }
  })
  const multiplier = effectivenessParts.reduce((product, part) => product * part.value, 1)
  const immune = max === 0
  let ko = 'Aucun dégât'
  if (!immune) {
    try {
      ko = koText(result.kochance(false))
    } catch {
      ko = ''
    }
  }

  const power = result.rawDesc.moveBP ?? move.bp
  const stab = source.types.includes(moveType) || (Boolean(attacker.tera) && FR_TO_EN[frenchType(attacker.tera)] === moveType)
  const offensive = move.category === 'Physical' ? 'atk' : 'spa'
  const boost = attacker.pokemon.boosts[offensive] ?? 0
  const rows: { k: string, v: string }[] = [
    { k: 'Puissance', v: `${power || '—'}${moveType !== move.type ? ` · type ${frenchType(moveType)}` : ''}${stab ? ' · STAB ×1,5' : ' · sans STAB'}` },
  ]
  if (result.rawDesc.weather && WEATHERS[battle.weather]) rows.push({ k: 'Météo', v: WEATHERS[battle.weather]!.nom })
  if (result.rawDesc.terrain) rows.push({ k: 'Champ', v: FIELD_EFFECTS[battle.fieldEffects.find(effect => TERRAINS[effect]) ?? ''] ?? result.rawDesc.terrain })
  if (boost) rows.push({ k: BOOST_LABELS[offensive]!, v: `${boost > 0 ? '+' : ''}${boost}` })
  rows.push({
    k: 'Efficacité',
    v: `${effectivenessParts.map(part => `${frenchType(part.type)} ×${decimal(part.value)}`).join(' · ')} → ×${decimal(multiplier)}`,
  })
  rows.push({ k: 'Dégâts', v: immune ? 'aucun' : `${min}–${max} PV sur ${defender.own ? '' : '≈ '}${hp}` })
  if (!immune) rows.push({ k: 'Coup critique', v: `${percentText(critMin / maxHp)}–${percentText(critMax / maxHp)}` })
  if (!defender.own && !defender.pokemon.item && defender.set.item) rows.push({ k: 'Objet supposé', v: itemName(defender.set.item) })
  if (!defender.own && !defender.pokemon.ability && defender.set.ability) rows.push({ k: 'Talent supposé', v: abilityName(defender.set.ability) })

  const warnings: string[] = []
  if (immune) warnings.push(`${speciesName(defender.pokemon.speciesId)} n'est pas touché`)
  const defenderItem = defender.pokemon.item || defender.set.item
  const defenderAbility = defender.pokemon.ability || defender.set.ability
  if (move.flags.contact) {
    const punish = CONTACT_PUNISH[defenderItem] ?? CONTACT_PUNISH[defenderAbility]
    warnings.push(punish ? `Contact · ${punish}` : 'Contact')
  }
  if (move.recoil) warnings.push(`Contrecoup : ${move.recoil[0]}/${move.recoil[1]} des dégâts`)
  if (move.drain) warnings.push(`Soigne ${move.drain[0]}/${move.drain[1]} des dégâts`)
  if (move.priority > 0) warnings.push(`Prioritaire (+${move.priority})`)
  if (MOVE_NOTES[moveId]) warnings.push(MOVE_NOTES[moveId]!)

  return {
    type: frenchType(moveType), power, min, max, minPct: min / maxHp, maxPct: max / maxHp, defenderHp: hp, defenderMaxHp: maxHp,
    critMinPct: critMin / maxHp, critMaxPct: critMax / maxHp, koText: ko, multiplier: immune ? 0 : multiplier, immune, rows, warnings,
  }
}

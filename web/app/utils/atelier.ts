import type { Pokemon, Stats } from '#data/types/roster'
import interditesJson from '#data/references/attaques-interdites.json'
import naturesJson from '#data/references/natures.json'
import objetsJson from '#data/references/objets.json'
import type { Evs, StatId, TeamSet } from '~/utils/showdownTeam'

export interface Objet {
  id: string
  nom: string
  groupe: string
  description: string | null
}

export interface NatureInfo {
  id: string
  nom: string
  plus: StatId | null
  moins: StatId | null
}

export type PresetId = 'phy' | 'spe' | 'tphy' | 'tspe' | 'tr'

export interface Variante {
  nom: string
  objetId: string
  natureId: string
  attaquesIds: (string | null)[]
  evs: Evs
  ivVit0: boolean
  ivAtq0: boolean
  favorite: boolean
  preset: PresetId | null
}

export const OBJETS = objetsJson as Objet[]
export const NATURES = naturesJson as NatureInfo[]
export const MOVE_SLOTS = 4
export const MAX_EV = 252
export const MAX_EV_TOTAL = 510

export const STATS: { id: StatId, key: keyof Omit<Stats, 'total'>, label: string }[] = [
  { id: 'hp', key: 'pv', label: 'PV' },
  { id: 'atk', key: 'atq', label: 'Atq' },
  { id: 'def', key: 'def', label: 'Déf' },
  { id: 'spa', key: 'atqSpe', label: 'Atq Spé' },
  { id: 'spd', key: 'defSpe', label: 'Déf Spé' },
  { id: 'spe', key: 'vit', label: 'Vit' },
]

export const EV_PRESETS: { id: PresetId, label: string, detail: string }[] = [
  { id: 'phy', label: 'Attaquant physique rapide', detail: '252 Atq · 252 Vit · 4 PV' },
  { id: 'spe', label: 'Attaquant spécial rapide', detail: '252 Atq Spé · 252 Vit · 4 PV · IV Atq 0' },
  { id: 'tphy', label: 'Tank physique', detail: '252 PV · 252 Déf · 4 Déf Spé' },
  { id: 'tspe', label: 'Tank spécial', detail: '252 PV · 252 Déf Spé · 4 Déf' },
  { id: 'tr', label: 'Distorsion', detail: '252 PV · 252 attaque principale · IV Vit 0' },
]

const INTERDITES = interditesJson as Record<string, Record<string, string>>
const objetsById = new Map(OBJETS.map(objet => [objet.id, objet]))
const naturesById = new Map(NATURES.map(nature => [nature.id, nature]))

export function banReason(pokemonId: string, moveId: string): string | undefined {
  return INTERDITES[pokemonId]?.[moveId]
}

export function isUsable(pokemon: Pokemon, moveId: string | null): moveId is string {
  return Boolean(moveId) && pokemon.movepool.includes(moveId!) && !banReason(pokemon.id, moveId!)
}

export function blankEvs(): Evs {
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
}

export function evTotal(evs: Evs): number {
  return STATS.reduce((total, stat) => total + evs[stat.id], 0)
}

export function findObjet(id: string): Objet | undefined {
  return objetsById.get(id)
}

export function findNature(id: string): NatureInfo | undefined {
  return naturesById.get(id)
}

export function natureLabel(nature: NatureInfo): string {
  if (!nature.plus || !nature.moins) return `${nature.nom} (neutre)`
  return `${nature.nom} (+${statLabel(nature.plus)} −${statLabel(nature.moins)})`
}

export function statLabel(id: StatId): string {
  return STATS.find(stat => stat.id === id)!.label
}

export function defaultVariant(pokemon: Pokemon, nom = 'Variante 1'): Variante {
  const set = pokemon.setParDefaut
  const moves = set.attaquesIds.filter(id => !set.horsMovepool.includes(id))
  return {
    nom,
    objetId: set.objetId,
    natureId: set.natureId,
    attaquesIds: Array.from({ length: MOVE_SLOTS }, (_, index) => moves[index] ?? null),
    evs: defaultEvs(pokemon),
    ivVit0: false,
    ivAtq0: false,
    favorite: false,
    preset: null,
  }
}

export function presetPatch(pokemon: Pokemon, preset: PresetId, variant: Variante): Partial<Variante> {
  const physical = pokemon.stats.atq >= pokemon.stats.atqSpe
  const evs = blankEvs()
  if (preset === 'phy') Object.assign(evs, { atk: 252, spe: 252, hp: 4 })
  if (preset === 'spe') Object.assign(evs, { spa: 252, spe: 252, hp: 4 })
  if (preset === 'tphy') Object.assign(evs, { hp: 252, def: 252, spd: 4 })
  if (preset === 'tspe') Object.assign(evs, { hp: 252, spd: 252, def: 4 })
  if (preset === 'tr') Object.assign(evs, { hp: 252, [physical ? 'atk' : 'spa']: 252, def: 4 })
  return {
    evs,
    preset,
    ivVit0: preset === 'tr' ? true : variant.ivVit0,
    ivAtq0: preset === 'spe' ? true : preset === 'phy' ? false : variant.ivAtq0,
  }
}

export function normalizeVariant(pokemon: Pokemon, raw: unknown, index: number): Variante {
  const base = defaultVariant(pokemon, `Variante ${index + 1}`)
  if (!raw || typeof raw !== 'object') return base
  const value = raw as Partial<Variante>
  const evs = blankEvs()
  for (const stat of STATS) evs[stat.id] = Math.max(0, Math.min(MAX_EV, Number(value.evs?.[stat.id] ?? base.evs[stat.id]) || 0))
  const moves = Array.isArray(value.attaquesIds) ? value.attaquesIds : base.attaquesIds
  return {
    nom: typeof value.nom === 'string' && value.nom.trim() ? value.nom : base.nom,
    objetId: typeof value.objetId === 'string' ? value.objetId : base.objetId,
    natureId: typeof value.natureId === 'string' && findNature(value.natureId) ? value.natureId : base.natureId,
    attaquesIds: Array.from({ length: MOVE_SLOTS }, (_, slot) => typeof moves[slot] === 'string' ? moves[slot] : null),
    evs: evTotal(evs) > MAX_EV_TOTAL ? base.evs : evs,
    ivVit0: Boolean(value.ivVit0),
    ivAtq0: Boolean(value.ivAtq0),
    favorite: Boolean(value.favorite),
    preset: value.preset ?? null,
  }
}

export function finalStat(pokemon: Pokemon, variant: Variante, stat: StatId): number {
  const base = pokemon.stats[STATS.find(s => s.id === stat)!.key]
  const iv = (stat === 'spe' && variant.ivVit0) || (stat === 'atk' && variant.ivAtq0) ? 0 : 31
  const core = 2 * base + iv + Math.floor(variant.evs[stat] / 4)
  if (stat === 'hp') return core + 110
  const nature = findNature(variant.natureId)
  const multiplier = nature?.plus === stat ? 1.1 : nature?.moins === stat ? 0.9 : 1
  return Math.floor((core + 5) * multiplier)
}

export function variantWarnings(pokemon: Pokemon, variant: Variante): string[] {
  const warnings: string[] = []
  for (const id of variant.attaquesIds) {
    if (id && !pokemon.movepool.includes(id)) warnings.push(`« ${moveName(id)} » n'est plus dans le movepool de ${pokemon.nom} : remplace-la.`)
    else if (id && banReason(pokemon.id, id)) warnings.push(`« ${moveName(id)} » : ${banReason(pokemon.id, id)} Remplace-la.`)
  }
  if (!variant.attaquesIds.some(id => isUsable(pokemon, id))) warnings.push('Aucune attaque utilisable : choisis-en au moins une.')
  if (!findObjet(variant.objetId)) warnings.push(`L'objet « ${itemName(variant.objetId)} » n'est plus proposé : choisis-en un autre.`)
  return warnings
}

export function variantToSet(pokemon: Pokemon, variant: Variante): TeamSet {
  const ivs: Partial<Evs> = {}
  if (variant.ivAtq0) ivs.atk = 0
  if (variant.ivVit0) ivs.spe = 0
  return {
    nickname: pokemon.nom,
    speciesId: pokemon.id,
    itemId: variant.objetId,
    abilityId: pokemon.talent.id,
    moves: variant.attaquesIds.filter((id): id is string => isUsable(pokemon, id)),
    natureId: variant.natureId,
    evs: { ...variant.evs },
    ivs,
  }
}

export function variantText(pokemon: Pokemon, variant: Variante): string {
  const evs = STATS.filter(stat => variant.evs[stat.id]).map(stat => `${variant.evs[stat.id]} ${stat.label}`).join(' / ')
  const ivs = [variant.ivAtq0 && '0 Atq', variant.ivVit0 && '0 Vit'].filter(Boolean).join(' / ')
  return [
    `${pokemon.nom} @ ${findObjet(variant.objetId)?.nom ?? itemName(variant.objetId)}`,
    `Talent : ${pokemon.talent.nom}`,
    ...(evs ? [`EV : ${evs}`] : []),
    `Nature : ${findNature(variant.natureId)?.nom ?? variant.natureId}`,
    ...(ivs ? [`IV : ${ivs}`] : []),
    ...variant.attaquesIds.filter((id): id is string => Boolean(id)).map(id => `- ${moveName(id)}`),
  ].join('\n')
}

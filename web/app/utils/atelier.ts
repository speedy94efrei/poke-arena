import type { Pokemon, Stats } from '#data/types/roster'
import interditesJson from '#data/references/attaques-interdites.json'
import naturesJson from '#data/references/natures.json'
import objetsJson from '#data/references/objets.json'
import smogonJson from '#data/references/smogon.json'
import type { Evs, StatId, TeamSet } from '~/utils/showdownTeam'

export interface Objet {
  id: string
  nom: string
  groupe: string
  sprite: number
  description: string | null
}

export interface NatureInfo {
  id: string
  nom: string
  plus: StatId | null
  moins: StatId | null
}

export interface SmogonObjet {
  id: string
  formats: string[]
}

export type PresetId = 'phy' | 'spe' | 'tphy' | 'tspe' | 'tr'

export interface Variante {
  nom: string
  objetId: string
  natureId: string
  attaquesIds: (string | null)[]
  evs: Evs
  ivs: Evs
  favorite: boolean
  preset: PresetId | null
}

export const OBJETS = objetsJson as Objet[]
export const NATURES = naturesJson as NatureInfo[]
export const MOVE_SLOTS = 4
export const MAX_EV = 252
export const MAX_EV_TOTAL = 510
export const MAX_IV = 31
export const NEUTRAL_NATURE = 'serious'

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

const ITEM_SHEET = 'https://play.pokemonshowdown.com/sprites/itemicons-sheet.png'
const ITEM_SHEET_COLUMNS = 16
const ITEM_ICON = 24
const INTERDITES = interditesJson as Record<string, Record<string, string>>
const SMOGON = smogonJson as Record<string, { generation: number, objets: SmogonObjet[] }>
const objetsById = new Map(OBJETS.map(objet => [objet.id, objet]))
const naturesById = new Map(NATURES.map(nature => [nature.id, nature]))

export function banReason(pokemonId: string, moveId: string): string | undefined {
  return INTERDITES[pokemonId]?.[moveId]
}

export function isUsable(pokemon: Pokemon, moveId: string | null): moveId is string {
  return Boolean(moveId) && pokemon.movepool.includes(moveId!) && !banReason(pokemon.id, moveId!)
}

export function smogonItems(pokemonId: string): SmogonObjet[] {
  return SMOGON[pokemonId]?.objets ?? []
}

export function itemIconStyle(sprite: number, size: number) {
  const scale = size / ITEM_ICON
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${ITEM_SHEET})`,
    backgroundSize: `${ITEM_SHEET_COLUMNS * ITEM_ICON * scale}px auto`,
    backgroundPosition: `-${(sprite % ITEM_SHEET_COLUMNS) * size}px -${Math.floor(sprite / ITEM_SHEET_COLUMNS) * size}px`,
  }
}

export function blankEvs(): Evs {
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
}

export function maxIvs(): Evs {
  return { hp: MAX_IV, atk: MAX_IV, def: MAX_IV, spa: MAX_IV, spd: MAX_IV, spe: MAX_IV }
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

export function natureFor(plus: StatId | null, moins: StatId | null): string {
  if (!plus || !moins || plus === moins) return NEUTRAL_NATURE
  return NATURES.find(nature => nature.plus === plus && nature.moins === moins)!.id
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
    ivs: maxIvs(),
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
  const ivs = { ...variant.ivs }
  if (preset === 'tr') ivs.spe = 0
  if (preset === 'spe') ivs.atk = 0
  if (preset === 'phy') ivs.atk = MAX_IV
  return { evs, ivs, preset }
}

export function normalizeVariant(pokemon: Pokemon, raw: unknown, index: number): Variante {
  const base = defaultVariant(pokemon, `Variante ${index + 1}`)
  if (!raw || typeof raw !== 'object') return base
  const value = raw as Partial<Variante> & { ivVit0?: boolean, ivAtq0?: boolean }
  const evs = blankEvs()
  const ivs = maxIvs()
  for (const stat of STATS) {
    evs[stat.id] = Math.max(0, Math.min(MAX_EV, Number(value.evs?.[stat.id] ?? base.evs[stat.id]) || 0))
    ivs[stat.id] = Math.max(0, Math.min(MAX_IV, Number(value.ivs?.[stat.id] ?? MAX_IV) || 0))
  }
  if (value.ivVit0) ivs.spe = 0
  if (value.ivAtq0) ivs.atk = 0
  const moves = Array.isArray(value.attaquesIds) ? value.attaquesIds : base.attaquesIds
  return {
    nom: typeof value.nom === 'string' && value.nom.trim() ? value.nom : base.nom,
    objetId: typeof value.objetId === 'string' ? value.objetId : base.objetId,
    natureId: typeof value.natureId === 'string' && findNature(value.natureId) ? value.natureId : base.natureId,
    attaquesIds: Array.from({ length: MOVE_SLOTS }, (_, slot) => typeof moves[slot] === 'string' ? moves[slot] : null),
    evs: evTotal(evs) > MAX_EV_TOTAL ? base.evs : evs,
    ivs,
    favorite: Boolean(value.favorite),
    preset: value.preset ?? null,
  }
}

export function finalStat(pokemon: Pokemon, variant: Variante, stat: StatId): number {
  const base = pokemon.stats[STATS.find(s => s.id === stat)!.key]
  const core = 2 * base + variant.ivs[stat] + Math.floor(variant.evs[stat] / 4)
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
  for (const stat of STATS) {
    if (variant.ivs[stat.id] !== MAX_IV) ivs[stat.id] = variant.ivs[stat.id]
  }
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
  const ivs = STATS.filter(stat => variant.ivs[stat.id] !== MAX_IV).map(stat => `${variant.ivs[stat.id]} ${stat.label}`).join(' / ')
  return [
    `${pokemon.nom} @ ${findObjet(variant.objetId)?.nom ?? itemName(variant.objetId)}`,
    `Talent : ${pokemon.talent.nom}`,
    ...(evs ? [`EV : ${evs}`] : []),
    `Nature : ${findNature(variant.natureId)?.nom ?? variant.natureId}`,
    ...(ivs ? [`IV : ${ivs}`] : []),
    ...variant.attaquesIds.filter((id): id is string => Boolean(id)).map(id => `- ${moveName(id)}`),
  ].join('\n')
}

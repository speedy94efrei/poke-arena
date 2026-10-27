import type { Attaque, Categorie, Pokemon, Stats, TypePokemon } from '#data/types/roster'

export const STAT_KEYS: [keyof Omit<Stats, 'total'>, string][] = [
  ['pv', 'PV'], ['atq', 'Attaque'], ['def', 'Défense'], ['atqSpe', 'Atq. Spé.'], ['defSpe', 'Déf. Spé.'], ['vit', 'Vitesse'],
]

export const ALL_TYPES = Object.keys(TYPE_COLORS) as TypePokemon[]

export interface ArchetypeInfo {
  nom: string
  couleur: string
  attaque?: string
  motCle?: string
}

export const ARCHETYPES: ArchetypeInfo[] = [
  { nom: 'Pluie', couleur: '#3d6fc8', attaque: 'raindance', motCle: 'pluie' },
  { nom: 'Soleil', couleur: '#c8641c', attaque: 'sunnyday', motCle: 'soleil' },
  { nom: 'Sable', couleur: '#9a7e34', attaque: 'sandstorm', motCle: 'sable' },
  { nom: 'Neige', couleur: '#3f8fa3', attaque: 'snowscape', motCle: 'neige' },
  { nom: 'Distorsion', couleur: '#8a3f88', attaque: 'trickroom', motCle: 'distorsion' },
  { nom: 'Volt-Turn', couleur: '#a8861a' },
  { nom: 'Hyper offense', couleur: '#b0322a' },
  { nom: 'Stall', couleur: '#4e5d6e' },
  { nom: 'Balance', couleur: '#3d7a5c' },
  { nom: 'Champ Électrifié', couleur: '#a8901a', attaque: 'electricterrain', motCle: 'champ electrifie' },
  { nom: 'Champ Herbu', couleur: '#4f8a32', attaque: 'grassyterrain', motCle: 'champ herbu' },
  { nom: 'Champ Psychique', couleur: '#b0406a', attaque: 'psychicterrain', motCle: 'champ psychique' },
  { nom: 'Champ Brumeux', couleur: '#a65a8a', attaque: 'mistyterrain', motCle: 'champ brumeux' },
]

export function plainText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export const CATEGORY_LABELS: Record<Categorie, string> = { physique: 'Physique', spécial: 'Spécial', statut: 'Statut' }

export function categoryShape(categorie: Categorie | undefined) {
  if (categorie === 'physique') return { background: '#e8603a', borderRadius: '0', transform: 'rotate(45deg)' }
  if (categorie === 'spécial') return { background: '#5a8ae8', borderRadius: '50%', transform: 'none' }
  return { background: '#c0c6d0', borderRadius: '3px', transform: 'none' }
}

export function powerText(move: Attaque, hits?: number | null): string {
  if (!move.puissance) return '—'
  return hits && hits > 1 ? `${move.puissance}×${hits}` : String(move.puissance)
}

export function accuracyText(precision: number | null): string {
  return precision === null ? 'Jamais raté' : `${precision} %`
}

export function priorityText(priorite: number): string {
  return priorite > 0 ? `+${priorite}` : priorite < 0 ? `−${-priorite}` : '0'
}

export function ppText(pp: number | null): string {
  return pp === null ? 'à définir' : String(pp)
}

export function moveProperties(move: Attaque): { icone: string, label: string }[] {
  const properties: [boolean | null, string, string][] = [
    [move.contact, '✋', 'Contact'], [move.son, '♪', 'Son'], [move.morsure, '⌒', 'Morsure'],
    [move.danse, '✦', 'Danse'], [move.coupsMultiples, '×', 'Plusieurs coups'],
  ]
  return properties.filter(([present]) => present).map(([, icone, label]) => ({ icone, label }))
}

export function isStab(pokemon: Pokemon, move: Attaque): boolean {
  return move.categorie !== 'statut' && pokemon.types.includes(move.type)
}

export function multiplierLabel(multiplier: number): string {
  if (multiplier === 0) return '×0'
  if (multiplier === 0.25) return '×¼'
  if (multiplier === 0.5) return '×½'
  return `×${multiplier}`
}

export function statColor(value: number): string {
  return value >= 120 ? '#48c070' : value >= 90 ? '#a8c838' : value >= 60 ? 'var(--uA)' : '#e8704a'
}

export function setText(pokemon: Pokemon): string {
  const set = pokemon.setParDefaut
  return [
    `${pokemon.nom} @ ${set.objet}`,
    `Talent : ${pokemon.talent.nom}`,
    `Nature : ${set.nature}`,
    ...set.attaquesIds.map(id => `- ${moveName(id)}`),
  ].join('\n')
}

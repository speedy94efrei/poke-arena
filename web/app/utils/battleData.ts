import type { TypePokemon } from '#data/types/roster'

export interface MoveView {
  nom: string
  type: TypePokemon
  category: 'Physique' | 'Spéciale' | 'Statut'
  power: number | null
  accuracy: number | null
  priority: number
  text: string
  flags: string[]
}

export interface SpeciesView {
  types: TypePokemon[]
  abilities: string[]
  signature: string | null
}

const CATEGORIES = { physique: 'Physique', spécial: 'Spéciale', statut: 'Statut' } as const

/**
 * Données d'une attaque pour l'écran de combat : celles de la fiche PokéDraft dans un combat PokéDraft,
 * celles du Pokédex officiel ailleurs.
 */
export function moveView(id: string, pokedraft: boolean): MoveView | null {
  if (pokedraft) {
    const data = findMove(id)
    if (data) {
      return {
        nom: data.nom,
        type: data.type,
        category: CATEGORIES[data.categorie],
        power: data.puissance ?? null,
        accuracy: data.precision ?? null,
        priority: data.priorite ?? 0,
        text: data.effet ?? '',
        flags: [data.contact && 'Contact', data.son && 'Son', data.morsure && 'Morsure', data.danse && 'Danse', data.coupsMultiples && 'Plusieurs coups'].filter((flag): flag is string => Boolean(flag)),
      }
    }
  }
  const move = currentPokedex()?.moves[toId(id)]
  if (!move) return null
  return {
    nom: move.nom,
    type: move.type,
    category: move.category,
    power: move.power || null,
    accuracy: move.accuracy,
    priority: move.priority,
    text: move.description,
    flags: [],
  }
}

export function speciesView(id: string, pokedraft: boolean): SpeciesView {
  if (pokedraft) {
    const fiche = findPokemon(id)
    if (fiche) return { types: fiche.types, abilities: [fiche.talent.nom], signature: fiche.signature?.nom ?? null }
  }
  const species = currentPokedex()?.pokemon[toId(id)]
  return {
    types: species?.types ?? [],
    abilities: (species?.abilities ?? []).map(ability => abilityName(ability)),
    signature: null,
  }
}

import type { Attaque, Pokemon, Roster } from '#data/types/roster'
import rosterJson from '#data/rosters/roster-saison-1.json'
import { currentPokedex, dexSprite } from '~/utils/dex'

export const roster = rosterJson as Roster

const pokemonById = new Map(roster.pokemon.map(p => [p.id, p]))
const abilityNames = new Map(roster.pokemon.map(p => [p.talent.id, p.talent.nom]))
const itemNames = new Map(roster.pokemon.map(p => [p.setParDefaut.objetId, p.setParDefaut.objet]))
const EXTRA_MOVES: Record<string, string> = { struggle: 'Lutte', recharge: 'Récupération' }

export function findPokemon(speciesId: string): Pokemon | undefined {
  return pokemonById.get(speciesId) ?? pokemonById.get(speciesId.replace(/(mega|gmax|tera).*$/, ''))
}

export function findMove(nameOrId: string): Attaque | undefined {
  return roster.attaques[toId(nameOrId)]
}

/* Les noms viennent d'abord du roster PokéDraft, puis du Pokédex complet s'il est chargé. */
export function speciesName(speciesId: string, fallback = speciesId): string {
  return findPokemon(speciesId)?.nom ?? currentPokedex()?.pokemon[toId(speciesId)]?.nom ?? fallback
}

export function moveName(nameOrId: string): string {
  const id = toId(nameOrId)
  return findMove(id)?.nom ?? currentPokedex()?.moves[id]?.nom ?? EXTRA_MOVES[id] ?? nameOrId.normalize('NFC')
}

export function abilityName(nameOrId: string): string {
  const id = toId(nameOrId)
  return abilityNames.get(id) ?? currentPokedex()?.abilities[id]?.nom ?? nameOrId.normalize('NFC')
}

export function itemName(nameOrId: string): string {
  const id = toId(nameOrId)
  return itemNames.get(id) ?? currentPokedex()?.items[id]?.nom ?? nameOrId.normalize('NFC')
}

export function spriteUrl(speciesId: string, kind: 'icone' | 'face' | 'dos' = 'icone'): string {
  const fiche = findPokemon(speciesId)
  if (!fiche) return dexSprite(currentPokedex()?.pokemon[toId(speciesId)], speciesId, kind)
  const base = fiche.sprite
  if (kind === 'icone') return base
  return base.replace('/sprites/gen5/', kind === 'face' ? '/sprites/ani/' : '/sprites/ani-back/').replace(/\.png$/, '.gif')
}

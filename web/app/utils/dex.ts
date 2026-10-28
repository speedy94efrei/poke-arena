import { shallowRef } from 'vue'
import type { TypePokemon } from '#data/types/roster'

export interface DexPokemon {
  name: string
  nom: string
  num: number
  sprite: string
  types: TypePokemon[]
  stats: { hp: number, atk: number, def: number, spa: number, spd: number, spe: number }
  abilities: string[]
  tier: string
  natDexTier: string
  gen: number
  baseSpecies?: string
  forme?: string
  nonstandard?: string
  weight: number
}

export interface DexMove {
  name: string
  nom: string
  type: TypePokemon
  category: 'Physique' | 'Spéciale' | 'Statut'
  power: number
  accuracy: number | null
  pp: number
  priority: number
  description: string
  nonstandard?: string
}

export interface DexEntry {
  name: string
  nom: string
  description: string
  sprite?: number
  nonstandard?: string
}

export interface PokedexData {
  pokemon: Record<string, DexPokemon>
  moves: Record<string, DexMove>
  abilities: Record<string, DexEntry>
  items: Record<string, DexEntry>
}

const SHOWDOWN_SPRITES = 'https://play.pokemonshowdown.com/sprites'
const TYPE_NAMES: Record<string, TypePokemon> = {
  Normal: 'Normal', Fire: 'Feu', Water: 'Eau', Grass: 'Plante', Electric: 'Électrik', Ice: 'Glace', Fighting: 'Combat',
  Poison: 'Poison', Ground: 'Sol', Flying: 'Vol', Psychic: 'Psy', Bug: 'Insecte', Rock: 'Roche', Ghost: 'Spectre',
  Dragon: 'Dragon', Dark: 'Ténèbres', Steel: 'Acier', Fairy: 'Fée',
}

/** Type en français, à partir du nom anglais du protocole de combat (Téracristal notamment). */
export function frenchType(type: string): TypePokemon {
  return TYPE_NAMES[type] ?? (type === 'Stellar' ? 'Stellaire' : type) as TypePokemon
}

let loading: Promise<PokedexData> | null = null
const loaded = shallowRef<PokedexData | null>(null)

/** Pokédex complet (Showdown et noms français de PokéAPI), chargé à la première demande seulement. */
export function loadPokedex(): Promise<PokedexData> {
  loading ??= import('#data/references/dex.json').then((module) => {
    loaded.value = module.default as unknown as PokedexData
    return loaded.value
  })
  return loading
}

/** Le Pokédex s'il est déjà chargé ; la lecture est réactive, l'affichage se met à jour à son arrivée. */
export function currentPokedex(): PokedexData | null {
  return loaded.value
}

export function dexSprite(pokemon: DexPokemon | undefined, id: string, kind: 'icone' | 'face' | 'dos' = 'icone'): string {
  const name = pokemon?.sprite ?? id
  if (kind === 'icone') return `${SHOWDOWN_SPRITES}/gen5/${name}.png`
  return `${SHOWDOWN_SPRITES}/${kind === 'face' ? 'ani' : 'ani-back'}/${name}.gif`
}

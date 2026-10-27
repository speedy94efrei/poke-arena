import type { Pokemon } from '#data/types/roster'
import type { Variante } from '~/utils/atelier'

const STORAGE_KEY = 'pokedraft-atelier'
export const MAX_VARIANTES = 3

function withFavorite(list: Variante[]): Variante[] {
  if (!list.length || list.some(variant => variant.favorite)) return list
  return list.map((variant, index) => ({ ...variant, favorite: index === 0 }))
}

function load(): Record<string, Variante[]> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    const store: Record<string, Variante[]> = {}
    for (const [id, list] of Object.entries(raw)) {
      const pokemon = findPokemon(id)
      if (!pokemon || !Array.isArray(list) || !list.length) continue
      store[id] = withFavorite(list.slice(0, MAX_VARIANTES).map((variant, index) => normalizeVariant(pokemon, variant, index)))
    }
    return store
  } catch {
    return {}
  }
}

export function useAtelier() {
  const store = useState<Record<string, Variante[]>>('atelier-variantes', load)

  const write = (id: string, list: Variante[]) => {
    const next = { ...store.value }
    if (list.length) next[id] = withFavorite(list)
    else delete next[id]
    store.value = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      return
    }
  }

  const variants = (id: string): Variante[] => store.value[id] ?? []

  const append = (pokemon: Pokemon, variant: Variante): number | null => {
    const current = variants(pokemon.id)
    if (current.length >= MAX_VARIANTES) return null
    write(pokemon.id, [...current, { ...variant, nom: `Variante ${current.length + 1}`, favorite: false }])
    return current.length
  }

  const copyDefaultSet = (pokemon: Pokemon): number | null => {
    const index = append(pokemon, defaultVariant(pokemon))
    return index === null ? null : index + 1
  }

  const duplicate = (pokemon: Pokemon, variant: Variante) => append(pokemon, {
    ...variant,
    attaquesIds: [...variant.attaquesIds],
    evs: { ...variant.evs },
  })

  const update = (pokemon: Pokemon, index: number, patch: Partial<Variante>) => {
    const current = variants(pokemon.id)
    const list = current.length ? [...current] : [{ ...defaultVariant(pokemon), favorite: true }]
    const target = Math.min(index, list.length - 1)
    list[target] = { ...list[target]!, ...patch }
    write(pokemon.id, list)
  }

  const remove = (id: string, index: number) => {
    write(id, variants(id).filter((_, other) => other !== index))
  }

  const setFavorite = (id: string, index: number) => {
    write(id, variants(id).map((variant, other) => ({ ...variant, favorite: other === index })))
  }

  const favoriteIndex = (id: string) => variants(id).findIndex(variant => variant.favorite)

  return {
    store,
    variants,
    copyDefaultSet,
    addVariant: (pokemon: Pokemon) => append(pokemon, defaultVariant(pokemon)),
    duplicate,
    update,
    remove,
    setFavorite,
    favoriteIndex,
    hasVariant: (id: string) => variants(id).length > 0,
  }
}

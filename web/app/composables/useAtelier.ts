import type { Pokemon, SetParDefaut } from '#data/types/roster'

const STORAGE_KEY = 'pokedraft-atelier'
export const MAX_VARIANTES = 3

export interface Variante extends SetParDefaut {
  favorite: boolean
}

export function useAtelier() {
  const variantes = useState<Record<string, Variante[]>>('atelier-variantes', () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Variante[]>
    } catch {
      return {}
    }
  })

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(variantes.value))
    } catch {
      return
    }
  }

  const copyDefaultSet = (pokemon: Pokemon): number | null => {
    const current = variantes.value[pokemon.id] ?? []
    if (current.length >= MAX_VARIANTES) return null
    variantes.value = { ...variantes.value, [pokemon.id]: [...current, { ...pokemon.setParDefaut, favorite: current.length === 0 }] }
    save()
    return current.length + 1
  }

  return { variantes, copyDefaultSet, hasVariant: (id: string) => Boolean(variantes.value[id]?.length) }
}

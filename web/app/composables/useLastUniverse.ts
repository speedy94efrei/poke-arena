import type { Universe } from '~/utils/navigation'

const STORAGE_KEY = 'arene-univers'

export function lastUniverse(): Universe | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'classique' || value === 'pokedraft' ? value : null
  } catch {
    return null
  }
}

/**
 * Retient le dernier univers visité, que le Hub propose de rouvrir.
 */
export function useLastUniverse() {
  const route = useRoute()
  watch(() => universeOf(route.path), (universe) => {
    if (!universe) return
    try {
      localStorage.setItem(STORAGE_KEY, universe)
    } catch {
      return
    }
  }, { immediate: true })
}

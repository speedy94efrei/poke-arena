const STORAGE_KEY = 'arene-univers'

/** Les deux univers que le Hub rouvre tout seul ; les modes à part ne sont pas retenus. */
export type MainUniverse = 'classique' | 'pokedraft'

export function lastUniverse(): MainUniverse | null {
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
    if (universe !== 'classique' && universe !== 'pokedraft') return
    try {
      localStorage.setItem(STORAGE_KEY, universe)
    } catch {
      return
    }
  }, { immediate: true })
}

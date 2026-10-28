/**
 * Pokédex complet de l'univers Classique : noms français, types, stats, attaques, talents et objets.
 * Il se charge à la première utilisation ; les helpers renvoient l'identifiant tant qu'il n'est pas prêt.
 */
export function usePokedex() {
  if (import.meta.client) loadPokedex()

  const dex = computed(() => currentPokedex())
  const species = (id: string) => dex.value?.pokemon[toId(id)]
  return {
    dex,
    species,
    sprite: (id: string, kind: 'icone' | 'face' | 'dos' = 'icone') => dexSprite(species(id), toId(id), kind),
  }
}

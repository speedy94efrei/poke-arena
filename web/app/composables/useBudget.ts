import type { BudgetReply } from '~/utils/budget'

/**
 * Coûts du Combat à budget : ceux du serveur de combat (ajustés chaque mois), ou à défaut ceux du tier de chaque
 * Pokémon dans le Pokédex du site. Le serveur reste seul juge au lancement d'un combat.
 */
export function useBudget() {
  const { store, onGlobal, command } = useShowdown()
  const { dex } = usePokedex()
  const reply = useState<BudgetReply | null>('budget-costs', () => null)

  onGlobal('budget', (payload) => {
    try {
      reply.value = JSON.parse(payload) as BudgetReply
    } catch {
      reply.value = null
    }
  })

  watch(() => store.status, (status) => {
    if (status === 'connecte' && !reply.value) command('/budget')
  }, { immediate: true })

  const fromServer = computed(() => new Map((reply.value?.pokemon ?? []).map(([id, tier, base, cost]) => [id, { tier, base, cost }])))

  /** Coût d'un Pokémon, ou `null` s'il est interdit. */
  const costOf = (speciesId: string): number | null => {
    if (reply.value) return fromServer.value.get(speciesId)?.cost ?? null
    const tier = dex.value?.pokemon[speciesId]?.tier
    return tier ? tierCost(tier) : null
  }

  const teamCost = (species: string[]) => species.reduce((total, id) => total + (costOf(id) ?? 0), 0)

  /** Tous les Pokémon autorisés avec leur coût, du serveur ou du Pokédex. */
  const list = computed(() => {
    if (reply.value) return reply.value.pokemon.map(([id, tier, base, cost]) => ({ id, tier, base, cost }))
    return Object.entries(dex.value?.pokemon ?? {}).flatMap(([id, entry]) => {
      const cost = entry.tier ? tierCost(entry.tier) : null
      return cost === null || entry.num <= 0 ? [] : [{ id, tier: entry.tier ?? '', base: cost, cost }]
    })
  })

  return {
    budget: computed(() => reply.value?.budget ?? BUDGET_POINTS),
    month: computed(() => reply.value?.month ?? ''),
    live: computed(() => Boolean(reply.value)),
    costOf,
    teamCost,
    list,
  }
}

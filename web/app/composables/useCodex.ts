import type { Pokemon } from '#data/types/roster'

type SortKey = 'nom' | 'pv' | 'atq' | 'def' | 'atqSpe' | 'defSpe' | 'vit'

interface CodexFilters {
  q: string
  type: string
  role: string
  archetype: string
  generation: string
  sort: SortKey
}

const EMPTY_FILTERS: CodexFilters = { q: '', type: '', role: '', archetype: '', generation: '', sort: 'nom' }

export function useCodex() {
  const route = useRoute()
  const router = useRouter()
  const filters = useState<CodexFilters>('codex-filters', () => ({ ...EMPTY_FILTERS }))
  const view = useState<'gen' | 'arch'>('codex-view', () => 'gen')
  const comite = useState('codex-comite', () => false)
  const comparePick = useState('codex-compare-pick', () => false)

  const selected = computed(() => typeof route.query.id === 'string' && findPokemon(route.query.id) ? route.query.id : null)
  const compared = computed(() => typeof route.query.cmp === 'string' && findPokemon(route.query.cmp) ? route.query.cmp : null)

  const setFiches = (id: string | null, cmp: string | null) => {
    router.replace({ query: { ...(id ? { id } : {}), ...(cmp ? { cmp } : {}) } })
  }

  const open = (id: string) => {
    if (comparePick.value && selected.value && id !== selected.value) {
      comparePick.value = false
      setFiches(selected.value, id)
      return
    }
    comparePick.value = false
    setFiches(id, null)
  }

  const close = (id: string) => {
    if (compared.value) setFiches(id === compared.value ? selected.value : compared.value, null)
    else setFiches(null, null)
    comparePick.value = false
  }

  const toggleCompare = (id: string) => {
    if (compared.value) setFiches(id, null)
    else comparePick.value = true
  }

  const options = computed(() => {
    const unique = (values: (string | number)[]) => [...new Set(values.map(String))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
    return {
      types: unique(roster.pokemon.flatMap(p => p.types)),
      roles: unique(roster.pokemon.flatMap(p => p.roles)),
      archetypes: unique(roster.pokemon.flatMap(p => p.archetypes)),
      generations: unique(roster.pokemon.map(p => p.generation)),
    }
  })

  const list = computed(() => {
    const f = filters.value
    const query = plainText(f.q)
    const result = roster.pokemon.filter(p =>
      (!f.type || p.types.includes(f.type as Pokemon['types'][number]))
      && (!f.role || p.roles.includes(f.role))
      && (!f.archetype || p.archetypes.includes(f.archetype as Pokemon['archetypes'][number]))
      && (!f.generation || String(p.generation) === f.generation)
      && (!query || plainText([p.nom, p.talent.nom, p.signature.nom, ...p.ajoutsMovepoolIds.map(moveName), ...p.setParDefaut.attaquesIds.map(moveName)].join('|')).includes(query)))
    return f.sort === 'nom'
      ? result.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
      : result.sort((a, b) => b.stats[f.sort as Exclude<SortKey, 'nom'>] - a.stats[f.sort as Exclude<SortKey, 'nom'>])
  })

  const groups = computed(() => {
    const sort = filters.value.sort
    if (sort !== 'nom') return [{ label: `Tri : ${STAT_KEYS.find(([key]) => key === sort)?.[1]}`, pokemon: list.value }]
    const generations = [...new Set(list.value.map(p => p.generation))].sort((a, b) => a - b)
    return generations.map(generation => ({ label: `Génération ${generation}`, pokemon: list.value.filter(p => p.generation === generation) }))
  })

  const archetypes = computed(() => ARCHETYPES.filter(a => !filters.value.archetype || a.nom === filters.value.archetype).map((archetype) => {
    const membres = list.value.filter(p => p.archetypes.includes(archetype.nom as Pokemon['archetypes'][number]))
    const motCle = archetype.motCle
    const lanceurs = motCle
      ? membres.filter(p => p.roles.some(role => role.startsWith('Lanceur'))).flatMap((p) => {
          const signature = roster.attaques[p.signatureId]
          if (plainText(p.talent.effet).includes(motCle)) return [{ pokemon: p, source: p.talent.nom, effet: p.talent.effet }]
          if (signature && plainText(signature.effet).includes(motCle)) return [{ pokemon: p, source: signature.nom, effet: signature.effet }]
          return []
        })
      : []
    const lanceurIds = new Set(lanceurs.map(l => l.pokemon.id))
    const planB = archetype.attaque ? roster.pokemon.filter(p => !lanceurIds.has(p.id) && p.movepool.includes(archetype.attaque!)) : []
    const compte = new Map<string, number>()
    for (const membre of membres) {
      for (const id of membre.contresIds) {
        if (!membres.some(m => m.id === id)) compte.set(id, (compte.get(id) ?? 0) + 1)
      }
    }
    const contres = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, fois]) => ({ pokemon: findPokemon(id)!, fois }))
    return { ...archetype, membres, lanceurs, planB, contres }
  }))

  const resetFilters = () => {
    filters.value = { ...EMPTY_FILTERS }
  }

  return { filters, view, comite, comparePick, selected, compared, options, list, groups, archetypes, open, close, toggleCompare, resetFilters }
}

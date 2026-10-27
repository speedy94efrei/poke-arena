const STORAGE_KEY = 'arene-equipe'
export const TEAM_SIZE = 6

export function useTeamPicker() {
  const selected = useState<string[]>('team-picker', () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
      return saved.filter(id => findPokemon(id)).slice(0, TEAM_SIZE)
    } catch {
      return []
    }
  })

  watch(selected, (ids) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      return
    }
  }, { deep: true })

  const toggle = (id: string) => {
    if (selected.value.includes(id)) selected.value = selected.value.filter(other => other !== id)
    else if (selected.value.length < TEAM_SIZE) selected.value = [...selected.value, id]
  }

  const randomize = () => {
    const pool = roster.pokemon.map(p => p.id)
    selected.value = Array.from({ length: TEAM_SIZE }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!)
  }

  const makeLead = (id: string) => {
    selected.value = [id, ...selected.value.filter(other => other !== id)]
  }

  const team = computed(() => selected.value.map(id => findPokemon(id)!).filter(Boolean))
  const sets = computed(() => team.value.map(defaultSet))
  const complete = computed(() => selected.value.length === TEAM_SIZE)

  return { selected, team, sets, complete, toggle, randomize, makeLead, clear: () => { selected.value = [] } }
}

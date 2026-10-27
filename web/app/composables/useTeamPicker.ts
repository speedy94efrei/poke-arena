import type { Pokemon } from '#data/types/roster'

const STORAGE_KEY = 'arene-equipe'
const CHOICES_KEY = 'arene-equipe-variantes'
export const TEAM_SIZE = 6
export const DEFAULT_SET = -1

function loadJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T ?? fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

export function useTeamPicker() {
  const { variants, favoriteIndex } = useAtelier()
  const selected = useState<string[]>('team-picker', () => loadJson<string[]>(STORAGE_KEY, []).filter(id => findPokemon(id)).slice(0, TEAM_SIZE))
  const choices = useState<Record<string, number>>('team-variants', () => loadJson<Record<string, number>>(CHOICES_KEY, {}))

  watch(selected, ids => saveJson(STORAGE_KEY, ids), { deep: true })
  watch(choices, value => saveJson(CHOICES_KEY, value), { deep: true })

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

  const choiceFor = (id: string): number => {
    const chosen = choices.value[id]
    if (chosen !== undefined && (chosen === DEFAULT_SET || variants(id)[chosen])) return chosen
    return favoriteIndex(id)
  }

  const chooseVariant = (id: string, index: number) => {
    choices.value = { ...choices.value, [id]: index }
  }

  const variantFor = (pokemon: Pokemon) => variants(pokemon.id)[choiceFor(pokemon.id)] ?? defaultVariant(pokemon)

  const team = computed(() => selected.value.map(id => findPokemon(id)!).filter(Boolean))
  const entries = computed(() => team.value.map((pokemon) => {
    const variant = variantFor(pokemon)
    return { pokemon, variant, choice: choiceFor(pokemon.id), warnings: variantWarnings(pokemon, variant) }
  }))
  const sets = computed(() => entries.value.map(entry => variantToSet(entry.pokemon, entry.variant)))
  const complete = computed(() => selected.value.length === TEAM_SIZE)
  const playable = computed(() => complete.value && sets.value.every(set => set.moves.length > 0))

  return { selected, team, entries, sets, complete, playable, toggle, randomize, makeLead, chooseVariant, clear: () => { selected.value = [] } }
}

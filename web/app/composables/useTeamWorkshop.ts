import type { ClassicSet, ClassicTeam } from '~/utils/classicTeam'
import type { UsageData } from '~/utils/usage'

const TEAM_SIZE = 6

/**
 * État de l'Atelier Classique : l'équipe ouverte, l'emplacement choisi, les statistiques Smogon et les attaques
 * apprises de son format. Chaque modification est enregistrée dans « Mes équipes ».
 */
export function useTeamWorkshop() {
  const { teams, save, remove } = useClassicTeams()
  const { dex } = usePokedex()
  const { store } = useShowdown()
  const currentId = useState('workshop-team', () => '')
  const slot = useState('workshop-slot', () => 0)
  const usage = shallowRef<UsageData | null>(null)
  const learnsets = shallowRef<Awaited<ReturnType<typeof loadLearnsets>> | null>(null)

  const team = computed(() => teams.value.find(entry => entry.id === currentId.value) ?? teams.value[0])
  const formats = computed(() => store.formats.flatMap(section => section.formats))
  const formatName = computed(() => {
    const format = formats.value.find(entry => entry.id === team.value?.format)
    return format ? formatLabel(format.name) : team.value ? formatIdLabel(team.value.format) : ''
  })
  const levelOf = (formatId: string) => levelFor(formatId, Boolean(formats.value.find(entry => entry.id === formatId)?.level50))
  const index = computed(() => Math.min(slot.value, team.value?.sets.length ?? 0, TEAM_SIZE - 1))
  const set = computed(() => team.value?.sets[index.value])

  /** Attaques que le Pokémon ouvert peut apprendre dans le format de l'équipe. */
  const pool = computed(() => {
    if (!set.value || !team.value) return []
    const base = dex.value?.pokemon[set.value.species]?.baseSpecies
    return learnableMoves(learnsets.value, set.value.species, base ? toId(base) : undefined, team.value.format)
  })

  watch(() => team.value?.format, async (id) => {
    usage.value = id ? await loadUsage(id) : null
  }, { immediate: true })

  onMounted(async () => {
    learnsets.value = await loadLearnsets()
  })

  const write = (sets: ClassicSet[], patch: Partial<ClassicTeam> = {}) => {
    if (!team.value) return
    currentId.value = save({ ...team.value, ...patch, sets }).id
  }

  const fromUsage = (species: string) => setFromUsage(species, usageOf(usage.value, species), dex.value, levelOf(team.value?.format ?? ''))

  return {
    teams,
    team,
    formatName,
    levelOf,
    index,
    set,
    pool,
    usage,
    size: TEAM_SIZE,
    select: (id: string) => {
      currentId.value = id
      slot.value = 0
    },
    selectSlot: (value: number) => {
      slot.value = value
    },
    setSpecies: (species: string) => {
      if (!team.value) return
      const sets = [...team.value.sets]
      sets[index.value] = fromUsage(species)
      write(sets)
    },
    updateSet: (patch: Partial<ClassicSet>) => {
      if (!team.value || !set.value) return
      const sets = [...team.value.sets]
      sets[index.value] = { ...set.value, ...patch }
      write(sets)
    },
    removeSlot: (value: number) => {
      if (!team.value) return
      write(team.value.sets.filter((_, other) => other !== value))
      if (slot.value > value) slot.value--
    },
    applyTeam: (species: string[]) => {
      write(species.slice(0, TEAM_SIZE).map(fromUsage))
      slot.value = 0
    },
    /** Change le format de l'équipe ; le niveau des Pokémon suit (50 en VGC, 5 en Little Cup). */
    setFormat: (formatId: string) => {
      if (!team.value || !formatId || formatId === team.value.format) return
      const level = levelOf(formatId)
      write(team.value.sets.map(entry => ({ ...entry, level })), { format: formatId })
    },
    rename: (name: string) => {
      if (team.value && name.trim()) write(team.value.sets, { name: name.trim() })
    },
    create: (name: string, formatId: string, sets: ClassicSet[] = []) => {
      currentId.value = save({ name, format: formatId, sets: sets.slice(0, TEAM_SIZE) }).id
      slot.value = 0
    },
    duplicate: () => {
      if (!team.value) return
      const copy = save({ name: `${team.value.name} (copie)`, format: team.value.format, sets: team.value.sets.map(entry => ({ ...entry, moves: [...entry.moves] })) })
      currentId.value = copy.id
    },
    removeTeam: () => {
      if (!team.value) return
      remove(team.value.id)
      currentId.value = teams.value[0]?.id ?? ''
      slot.value = 0
    },
  }
}

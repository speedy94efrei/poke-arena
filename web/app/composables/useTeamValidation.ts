import type { ClassicTeam } from '~/utils/classicTeam'

export type CheckState = 'ok' | 'warn' | 'error'

export interface TeamCheck {
  label: string
  detail: string
  state: CheckState
}

export interface ServerCheck {
  state: 'offline' | 'checking' | 'ok' | 'error'
  errors: string[]
}

const TEAM_SIZE = 6
const DEBOUNCE = 800

/**
 * Validité d'une équipe Classique : les règles de base vérifiées ici (taille, attaques, objets, clauses),
 * puis le validateur du serveur de combat, celui qui fait foi, rappelé après chaque modification.
 */
export function useTeamValidation(team: Ref<ClassicTeam | undefined>, formatName: Ref<string>) {
  const { store, validateTeam } = useShowdown()
  const { dex } = usePokedex()
  const server = ref<ServerCheck>({ state: 'offline', errors: [] })

  const checks = computed<TeamCheck[]>(() => {
    const sets = team.value?.sets ?? []
    const format = team.value?.format ?? ''
    const missingMoves = sets.filter(set => set.moves.filter(Boolean).length < MOVE_SLOTS)
    const noMoves = sets.some(set => !set.moves.length)
    const missingGear = sets.filter(set => !set.item || !set.ability)
    const base = sets.map(set => toId(dex.value?.pokemon[set.species]?.baseSpecies ?? set.species))
    const doubles = base.filter((id, index) => base.indexOf(id) !== index)
    const items = sets.map(set => set.item).filter(Boolean)
    const itemDoubles = items.filter((id, index) => items.indexOf(id) !== index)
    const list: TeamCheck[] = [
      { label: `${sets.length} Pokémon`, detail: `${sets.length} / ${TEAM_SIZE}`, state: !sets.length ? 'error' : sets.length < TEAM_SIZE ? 'warn' : 'ok' },
      { label: `${MOVE_SLOTS} attaques par Pokémon`, detail: missingMoves.length ? `${missingMoves.length} incomplet${missingMoves.length > 1 ? 's' : ''}` : 'OK', state: noMoves ? 'error' : missingMoves.length ? 'warn' : 'ok' },
      { label: 'Objet et talent choisis', detail: missingGear.length ? `${missingGear.length} à compléter` : 'OK', state: missingGear.length ? 'warn' : 'ok' },
      { label: 'Clause Espèce', detail: doubles.length ? 'Pokémon en double' : 'aucun doublon', state: doubles.length ? 'error' : 'ok' },
    ]
    if (/vgc|battlestadium|bss/.test(format)) {
      list.push({ label: 'Clause Objet', detail: itemDoubles.length ? 'objet en double' : 'aucun doublon', state: itemDoubles.length ? 'error' : 'ok' })
    }
    return list
  })

  const local = computed<CheckState>(() => checks.value.some(check => check.state === 'error') ? 'error' : checks.value.some(check => check.state === 'warn') ? 'warn' : 'ok')
  const verdict = computed<CheckState | 'checking' | 'unknown'>(() => {
    if (local.value === 'error' || server.value.state === 'error') return 'error'
    if (server.value.state === 'checking') return 'checking'
    if (server.value.state === 'offline') return 'unknown'
    return local.value
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  let request = 0

  const check = async () => {
    const current = team.value
    if (!current?.sets.length || store.status !== 'connecte') {
      server.value = { state: 'offline', errors: [] }
      return
    }
    const id = ++request
    server.value = { state: 'checking', errors: [] }
    const errors = await validateTeam(packClassicTeam(current.sets), current.format)
    if (id !== request) return
    server.value = errors === null ? { state: 'offline', errors: [] } : { state: errors.length ? 'error' : 'ok', errors }
  }

  watch([() => team.value && packClassicTeam(team.value.sets), () => team.value?.format, () => store.status], () => {
    clearTimeout(timer)
    timer = setTimeout(check, DEBOUNCE)
  }, { immediate: true })

  onBeforeUnmount(() => clearTimeout(timer))

  return { checks, server, verdict, title: computed(() => `Validité · ${formatName.value}`) }
}

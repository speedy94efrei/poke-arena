import type { BattleState } from '~/utils/battleTracker'
import type { Replay } from '~/utils/replay'

/**
 * Lecteur de replay : rejoue le journal d'un combat terminé ligne à ligne, au rythme d'un vrai combat (vitesse réglable).
 * Revenir en arrière ou sauter à un tour reconstruit l'état depuis le début, sans animation.
 */
export function useReplay(id: MaybeRefOrGetter<string>) {
  const base = useRuntimeConfig().public.apiUrl as string
  const replay = shallowRef<Replay | null>(null)
  const battle = ref<BattleState | null>(null)
  const error = ref('')
  const loading = ref(true)
  const position = ref(0)
  const playing = ref(false)
  const speed = ref(1)
  const lines = shallowRef<string[]>([])
  const starts = shallowRef<number[]>([0])
  let timer: ReturnType<typeof setTimeout> | undefined

  const turns = computed(() => starts.value.length - 1)
  const finished = computed(() => position.value >= lines.value.length)

  const stop = () => {
    clearTimeout(timer)
    timer = undefined
  }

  const step = () => {
    timer = undefined
    const state = battle.value
    if (!playing.value || !state) return
    while (position.value < lines.value.length) {
      const line = lines.value[position.value]!
      applyLine(state, line)
      position.value++
      const delay = lineDelay(line)
      if (delay) {
        timer = setTimeout(step, delay / speed.value)
        return
      }
    }
    playing.value = false
  }

  /** Reconstruit le combat jusqu'à la ligne `target` (exclue), d'un coup. */
  const seek = (target: number) => {
    stop()
    const end = Math.max(0, Math.min(target, lines.value.length))
    const state = createBattle(`replay-${toValue(id)}`)
    for (const line of lines.value.slice(0, end)) applyLine(state, line)
    battle.value = state
    position.value = end
    if (playing.value) timer = setTimeout(step, 400 / speed.value)
  }

  const play = () => {
    if (finished.value) seek(0)
    playing.value = true
    if (!timer) step()
  }

  const pause = () => {
    playing.value = false
    stop()
  }

  const toggle = () => (playing.value ? pause() : play())
  const turnStart = (turn: number) => starts.value[Math.max(0, Math.min(turn, turns.value))]!
  const goToTurn = (turn: number) => seek(turnStart(turn))
  const nextTurn = () => (battle.value && battle.value.turn < turns.value ? goToTurn(battle.value.turn + 1) : seek(lines.value.length))
  /** Au milieu d'un tour, revient à son début ; déjà au début, au tour d'avant. */
  const previousTurn = () => {
    const turn = battle.value?.turn ?? 0
    goToTurn(position.value > turnStart(turn) ? turn : turn - 1)
  }

  const load = async () => {
    loading.value = true
    error.value = ''
    pause()
    try {
      const response = await $fetch<{ data: Replay }>(`/replays/${encodeURIComponent(toValue(id))}`, { baseURL: base, headers: { Accept: 'application/json' } })
      replay.value = response.data
      lines.value = replayLines(response.data.log)
      starts.value = turnStarts(lines.value)
      seek(0)
      play()
    } catch (failure) {
      replay.value = null
      battle.value = null
      error.value = (failure as { statusCode?: number }).statusCode === 404 ? 'Ce replay n\'existe pas, ou le combat n\'a pas été gardé.' : apiErrorMessage(failure)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
  watch(() => toValue(id), load)
  onBeforeUnmount(stop)

  return { replay, battle, error, loading, position, lines, playing, speed, turns, finished, play, pause, toggle, seek, goToTurn, nextTurn, previousTurn, reload: load }
}

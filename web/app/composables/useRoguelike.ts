import type { RoguelikeState } from '~/utils/roguelike'

/**
 * Roguelike à étages : l'état de ta run, tenu par le serveur de combat, et tes choix. Le serveur répond à chaque
 * action par l'état complet ; quand un combat démarre, il envoie sa salle et le site l'ouvre.
 */
export function useRoguelike() {
  const { store, onGlobal, command } = useShowdown()
  const state = useState<RoguelikeState | null>('roguelike', () => null)
  const error = useState('roguelike-error', () => '')
  const pending = useState('roguelike-pending', () => false)

  onGlobal('roguelike', (payload) => {
    let data: RoguelikeState | { type: 'battle', roomid: string }
    try {
      data = JSON.parse(payload)
    } catch {
      return
    }
    pending.value = false
    if (data.type === 'battle') {
      void navigateTo(`/roguelike/combat/${data.roomid}`)
      return
    }
    state.value = data
    error.value = data.error ?? ''
  })

  watch(() => store.status, (status) => {
    if (status === 'connecte') command('/roguelike')
  }, { immediate: true })

  const act = (action: Record<string, unknown>) => {
    error.value = ''
    pending.value = true
    command(`/roguelike action ${JSON.stringify(action)}`)
  }

  return {
    state,
    run: computed(() => state.value?.run ?? null),
    me: computed(() => state.value?.run ? state.value.run.players[state.value.run.me] ?? null : null),
    error,
    pending,
    act,
    refresh: () => command('/roguelike'),
  }
}

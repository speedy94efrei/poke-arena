import type { RouteState } from '~/utils/routeLigues'

/**
 * Route des Ligues : ta progression, tenue par le serveur de combat, et tes choix. Le serveur répond à chaque action
 * par l'état complet ; quand un combat contre un Champion démarre, il envoie sa salle et le site l'ouvre.
 */
export function useRouteLigues() {
  const { store, onGlobal, command } = useShowdown()
  const state = useState<RouteState | null>('route-ligues', () => null)
  const error = useState('route-ligues-error', () => '')
  const pending = useState('route-ligues-pending', () => false)

  onGlobal('route', (payload) => {
    let data: RouteState | { type: 'battle', roomid: string }
    try {
      data = JSON.parse(payload)
    } catch {
      return
    }
    pending.value = false
    if (data.type === 'battle') {
      void navigateTo(`/route-des-ligues/combat/${data.roomid}`)
      return
    }
    state.value = data
    error.value = data.error ?? ''
  })

  watch(() => store.status, (status) => {
    if (status === 'connecte') command('/route')
  }, { immediate: true })

  const act = (action: Record<string, unknown>) => {
    error.value = ''
    pending.value = true
    command(`/route action ${JSON.stringify(action)}`)
  }

  return {
    state,
    run: computed(() => state.value?.run ?? null),
    error,
    pending,
    act,
    connected: computed(() => store.status === 'connecte'),
  }
}

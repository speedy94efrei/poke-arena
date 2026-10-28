import type { ArenaCalendar, ArenaEvent, ArenaProposal } from '~/utils/tournaments'

type ProposalReply = { type: 'erreur', message: string } | { type: 'propose', event: ArenaEvent }

const REFRESH = 15_000
const ROOM_WAIT = 4_000
let proposalWaiter: ((reply: ProposalReply) => void) | null = null

/**
 * Tournois de l'Arène, lus sur le serveur de combat : calendrier (réguliers et proposés par les joueurs), tournois
 * ouverts avec leur tableau, derniers résultats. Rafraîchi tant qu'une page l'utilise.
 */
export function useArenaTournaments() {
  const { store, onGlobal, command, join, tournament } = useShowdown()
  const calendar = useState<ArenaCalendar | null>('arena-calendar', () => null)
  const connected = computed(() => store.status === 'connecte')

  onGlobal('arenetournois', (payload) => {
    const data = JSON.parse(payload) as ArenaCalendar & { type: string } | ProposalReply
    if (data.type === 'calendrier') calendar.value = data as ArenaCalendar
    else proposalWaiter?.(data as ProposalReply)
  })

  const refresh = () => {
    if (connected.value) command('/arenetournois')
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    timer = setInterval(refresh, REFRESH)
  })
  onBeforeUnmount(() => clearInterval(timer))
  watch(connected, refresh, { immediate: true })

  /** Rejoint le salon d'un tournoi et attend qu'il soit chargé. */
  const enter = async (roomid: string) => {
    if (store.rooms[roomid]) return true
    join(roomid)
    const started = Date.now()
    while (!store.rooms[roomid] && Date.now() - started < ROOM_WAIT) await new Promise(resolve => setTimeout(resolve, 100))
    return Boolean(store.rooms[roomid])
  }

  return {
    calendar,
    connected,
    refresh,
    enter,
    /** Inscription ou désinscription, puis relecture du calendrier. */
    register: async (event: ArenaEvent, joining: boolean) => {
      if (!event.roomid || !(await enter(event.roomid))) return
      tournament(event.roomid, joining ? 'join' : 'leave')
      setTimeout(refresh, 500)
    },
    propose: (proposal: ArenaProposal) => new Promise<ProposalReply>((resolve) => {
      const timeout = setTimeout(() => resolve({ type: 'erreur', message: 'Le serveur de combat ne répond pas.' }), 6000)
      proposalWaiter = (reply) => {
        clearTimeout(timeout)
        proposalWaiter = null
        resolve(reply)
        refresh()
      }
      command(`/arenetournois proposer ${JSON.stringify(proposal)}`)
    }),
  }
}

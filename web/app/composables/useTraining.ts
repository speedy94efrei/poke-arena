export interface TrainingBot {
  key: string
  name: string
  level: 1 | 2 | 3 | 4 | 5
  theme?: string
  online: boolean
  battles: number
}

export interface CoachOption {
  kind: 'move' | 'switch'
  id: string
  tera: boolean
  score: number
}

export interface CoachAdvice {
  room: string
  turn?: number
  /** Choix du coach dans les numéros de la requête (« move 2 », « switch 3 »). */
  choice?: string
  options?: CoachOption[]
  simulations?: number
  error?: string
}

export interface TrainingPreparation {
  bot: string
  format: string
  /** Équipe du bot au format compact, vide pour un format à équipes générées. */
  team: string
  /** Ton équipe au format compact, pour que le coach rejoue tes options avec tes vrais sets. */
  mine: string
  coach: boolean
}

type Reply = { type: 'bots', enabled: boolean, bots: TrainingBot[] }
  | { type: 'pret' }
  | { type: 'erreur', message: string }
  | ({ type: 'coach' } & CoachAdvice)

const TIMEOUT = 15_000
let prepareWaiter: ((error: string | null) => void) | null = null
const coachWaiters = new Map<string, (advice: CoachAdvice) => void>()

/**
 * Entraînement contre les bots du serveur de combat : leur liste, la préparation d'un combat Classique (équipes et
 * coach) avant le défi, et les conseils du coach pendant le combat.
 */
export function useTraining() {
  const { store, onGlobal, command } = useShowdown()
  const bots = useState<TrainingBot[]>('training-bots', () => [])
  const enabled = useState('training-enabled', () => false)

  onGlobal('entrainement', (payload) => {
    const reply = JSON.parse(payload) as Reply
    if (reply.type === 'bots') {
      bots.value = reply.bots
      enabled.value = reply.enabled
    } else if (reply.type === 'pret' || reply.type === 'erreur') {
      prepareWaiter?.(reply.type === 'erreur' ? reply.message : null)
      prepareWaiter = null
    } else if (reply.type === 'coach') {
      coachWaiters.get(reply.room)?.(reply)
      coachWaiters.delete(reply.room)
    }
  })

  const refresh = () => {
    if (store.status === 'connecte') command('/entrainement')
  }

  return {
    bots,
    enabled,
    refresh,
    /** Prépare le combat : le bot acceptera ensuite ton défi dans ce format. `null` si tout va bien, sinon l'erreur. */
    prepare: (preparation: TrainingPreparation) => new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve('Le serveur de combat ne répond pas.'), TIMEOUT)
      prepareWaiter = (error) => {
        clearTimeout(timer)
        resolve(error)
      }
      command(`/entrainement preparer ${JSON.stringify(preparation)}`)
    }),
    advice: (room: string) => new Promise<CoachAdvice>((resolve) => {
      const timer = setTimeout(() => resolve({ room, error: 'Le coach met trop de temps à répondre.' }), TIMEOUT)
      coachWaiters.set(room, (advice) => {
        clearTimeout(timer)
        resolve(advice)
      })
      command(`/entrainement coach ${room}`)
    }),
  }
}

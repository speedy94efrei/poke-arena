import type { TrainingBot } from '~/utils/training'

interface TrainingStore {
  enabled: boolean | null
  bots: TrainingBot[]
}

const store = reactive<TrainingStore>({ enabled: null, bots: [] })

/**
 * Bots d'entraînement du serveur de combat : leur état, demandé par /entrainement.
 */
export function useTraining() {
  const { store: showdown, command, onGlobal } = useShowdown()

  onGlobal('entrainement', (payload) => {
    const message = JSON.parse(payload) as { type: string, enabled: boolean, bots: TrainingBot[] }
    if (message.type !== 'bots') return
    store.enabled = message.enabled
    store.bots = message.bots
  })

  const refresh = () => {
    if (showdown.status === 'connecte') command('/entrainement')
  }

  return {
    store,
    refresh,
    bot: (key: string) => store.bots.find(bot => bot.key === key),
    botNamed: (name: string) => store.bots.find(bot => toId(bot.name) === toId(name)),
  }
}

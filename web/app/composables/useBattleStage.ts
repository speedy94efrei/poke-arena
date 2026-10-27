const STORAGE_KEY = 'arene-decor'

export function useBattleStage(roomid: MaybeRefOrGetter<string>) {
  const choice = useState<string>('battle-stage', () => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? 'auto'
    } catch {
      return 'auto'
    }
  })

  watch(choice, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      return
    }
  })

  const options = computed(() => [{ id: 'auto', nom: 'Au hasard' }, ...stages().map(({ id, nom }) => ({ id, nom }))])
  const stage = computed(() => stageFor(toValue(roomid), choice.value))

  return { choice, options, stage }
}

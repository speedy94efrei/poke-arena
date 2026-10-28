import type { Pokemon } from '#data/types/roster'
import type { ApiVariant, Variante } from '~/utils/atelier'

const STORAGE_KEY = 'pokedraft-atelier'
const SAVE_DELAY = 600
export const MAX_VARIANTES = 3

type AtelierStore = Record<string, Variante[]>

interface AtelierResponse {
  data: Record<string, ApiVariant[]>
  imported?: string[]
}

/**
 * Où sont les variantes : dans le navigateur (sans compte), ou sur le compte et dans quel état.
 */
export type AtelierSync = 'navigateur' | 'chargement' | 'enregistre' | 'enregistrement' | 'erreur' | 'hors-ligne'

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const queues = new Map<string, Promise<void>>()

function withFavorite(list: Variante[]): Variante[] {
  if (!list.length || list.some(variant => variant.favorite)) return list
  return list.map((variant, index) => ({ ...variant, favorite: index === 0 }))
}

function normalizeStore(raw: Record<string, unknown>): AtelierStore {
  const store: AtelierStore = {}
  for (const [id, list] of Object.entries(raw)) {
    const pokemon = findPokemon(id)
    if (!pokemon || !Array.isArray(list) || !list.length) continue
    store[id] = withFavorite(list.slice(0, MAX_VARIANTES).map((variant, index) => normalizeVariant(pokemon, variant, index)))
  }
  return store
}

function loadLocal(): AtelierStore {
  try {
    return normalizeStore(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>)
  } catch {
    return {}
  }
}

function saveLocal(store: AtelierStore | null) {
  try {
    if (store) localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    return
  }
}

function fromApi(data: Record<string, ApiVariant[]>): AtelierStore {
  return normalizeStore(Object.fromEntries(Object.entries(data).map(([id, list]) => [id, list.map(fromApiVariant)])))
}

function toApi(store: AtelierStore): Record<string, ApiVariant[]> {
  return Object.fromEntries(Object.entries(store).map(([id, list]) => [id, list.map(toApiVariant)]))
}

function useAtelierState() {
  return {
    store: useState<AtelierStore>('atelier-variantes', loadLocal),
    sync: useState<AtelierSync>('atelier-sync', () => 'navigateur'),
    linked: useState('atelier-compte', () => false),
    unsaved: useState<string[]>('atelier-non-enregistres', () => []),
    notice: useState('atelier-notice', () => ''),
  }
}

export function useAtelier() {
  const { request } = useAccount()
  const { store, sync, linked, unsaved, notice } = useAtelierState()

  const settle = () => {
    if (timers.size || queues.size) return
    sync.value = unsaved.value.length ? 'erreur' : 'enregistre'
  }

  const push = async (id: string) => {
    try {
      await request(`/me/atelier-variants/${id}`, { method: 'PUT', body: { variants: (store.value[id] ?? []).map(toApiVariant) } })
      unsaved.value = unsaved.value.filter(other => other !== id)
    } catch {
      if (!unsaved.value.includes(id)) unsaved.value = [...unsaved.value, id]
    }
  }

  const enqueue = (id: string) => {
    const next = (queues.get(id) ?? Promise.resolve()).then(() => push(id))
    queues.set(id, next)
    next.finally(() => {
      if (queues.get(id) === next) queues.delete(id)
      settle()
    })
  }

  const schedule = (id: string) => {
    clearTimeout(timers.get(id))
    sync.value = 'enregistrement'
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      enqueue(id)
    }, SAVE_DELAY))
  }

  const write = (id: string, list: Variante[]) => {
    const next = { ...store.value }
    if (list.length) next[id] = withFavorite(list)
    else delete next[id]
    store.value = next
    if (linked.value) schedule(id)
    else saveLocal(next)
  }

  const variants = (id: string): Variante[] => store.value[id] ?? []

  const append = (pokemon: Pokemon, variant: Variante): number | null => {
    const current = variants(pokemon.id)
    if (current.length >= MAX_VARIANTES) return null
    write(pokemon.id, [...current, { ...variant, nom: `Variante ${current.length + 1}`, favorite: false }])
    return current.length
  }

  const copyDefaultSet = (pokemon: Pokemon): number | null => {
    const index = append(pokemon, defaultVariant(pokemon))
    return index === null ? null : index + 1
  }

  const duplicate = (pokemon: Pokemon, variant: Variante) => append(pokemon, {
    ...variant,
    attaquesIds: [...variant.attaquesIds],
    evs: { ...variant.evs },
  })

  const update = (pokemon: Pokemon, index: number, patch: Partial<Variante>) => {
    const current = variants(pokemon.id)
    const list = current.length ? [...current] : [{ ...defaultVariant(pokemon), favorite: true }]
    const target = Math.min(index, list.length - 1)
    list[target] = { ...list[target]!, ...patch }
    write(pokemon.id, list)
  }

  const remove = (id: string, index: number) => {
    write(id, variants(id).filter((_, other) => other !== index))
  }

  const setFavorite = (id: string, index: number) => {
    write(id, variants(id).map((variant, other) => ({ ...variant, favorite: other === index })))
  }

  const favoriteIndex = (id: string) => variants(id).findIndex(variant => variant.favorite)

  /**
   * Charge les variantes du compte, après y avoir ajouté celles gardées dans ce navigateur.
   */
  const connect = async () => {
    linked.value = false
    sync.value = 'chargement'
    const local = loadLocal()
    const localIds = Object.keys(local)
    try {
      const response = localIds.length
        ? await request<AtelierResponse>('/me/atelier-variants/import', { method: 'POST', body: { variants: toApi(local) } })
        : await request<AtelierResponse>('/me/atelier-variants')
      if (localIds.length) {
        saveLocal(null)
        notice.value = importNotice(localIds.length, response.imported?.length ?? 0)
      }
      store.value = fromApi(response.data)
      unsaved.value = []
      linked.value = true
      sync.value = 'enregistre'
    } catch {
      store.value = local
      sync.value = 'hors-ligne'
    }
  }

  const disconnect = () => {
    timers.forEach(clearTimeout)
    timers.clear()
    linked.value = false
    unsaved.value = []
    notice.value = ''
    store.value = loadLocal()
    sync.value = 'navigateur'
  }

  const retry = () => {
    if (!linked.value) return connect()
    sync.value = 'enregistrement'
    unsaved.value.forEach(enqueue)
  }

  return {
    store,
    sync,
    notice,
    variants,
    copyDefaultSet,
    addVariant: (pokemon: Pokemon) => append(pokemon, defaultVariant(pokemon)),
    duplicate,
    update,
    remove,
    setFavorite,
    favoriteIndex,
    hasVariant: (id: string) => variants(id).length > 0,
    connect,
    disconnect,
    retry,
  }
}

function importNotice(local: number, imported: number): string {
  const kept = local - imported
  const parts: string[] = []
  if (imported) parts.push(`${imported} Pokémon réglé${imported > 1 ? 's' : ''} dans ce navigateur ${imported > 1 ? 'ont' : 'a'} rejoint ton compte.`)
  if (kept) parts.push(`${kept} ${kept > 1 ? 'étaient' : 'était'} déjà réglé${kept > 1 ? 's' : ''} sur ton compte : la version du compte est gardée.`)
  return parts.join(' ')
}

/**
 * Branche l'Atelier sur le compte : à la connexion, à la déconnexion et au lancement du site.
 */
export function useAtelierAccount() {
  const { session } = useAccount()
  const { connect, disconnect } = useAtelier()

  watch(() => session.value.token, (token) => {
    if (token) connect()
    else disconnect()
  }, { immediate: true })
}

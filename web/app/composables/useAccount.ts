import type { Profile } from '~/utils/ranked'

const STORAGE_KEY = 'arene-compte'

interface AccountSession {
  token: string | null
  name: string | null
}

function loadSession(): AccountSession {
  try {
    return { token: null, name: null, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return { token: null, name: null }
  }
}

export function apiErrorMessage(error: unknown): string {
  const data = (error as { data?: { errors?: Record<string, string[]>, message?: string } }).data
  const first = data?.errors ? Object.values(data.errors).flat()[0] : undefined
  if (first) return first
  if (data?.message) return data.message
  return "L'API du classement ne répond pas. Est-elle lancée ?"
}

export function useAccount() {
  const base = useRuntimeConfig().public.apiUrl as string
  const session = useState<AccountSession>('account-session', loadSession)
  const profile = useState<Profile | null>('account-profile', () => null)
  const dialog = useState<'login' | 'register' | null>('account-dialog', () => null)

  const request = <T>(path: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown> } = {}) =>
    $fetch<T>(path, {
      baseURL: base,
      method: options.method ?? 'GET',
      body: options.body,
      headers: session.value.token ? { Authorization: `Bearer ${session.value.token}`, Accept: 'application/json' } : { Accept: 'application/json' },
    })

  const store = (next: AccountSession) => {
    session.value = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      return
    }
  }

  const refresh = async () => {
    if (!session.value.token) {
      profile.value = null
      return
    }
    try {
      profile.value = (await request<{ data: Profile }>('/me')).data
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 401) store({ token: null, name: null })
      profile.value = null
    }
  }

  const authenticate = async (path: '/session' | '/players', name: string, password: string) => {
    const result = await request<{ token: string, name: string }>(path, { method: 'POST', body: { name, password } })
    store({ token: result.token, name: result.name })
    await refresh()
  }

  return {
    session,
    profile,
    dialog,
    loggedIn: computed(() => Boolean(session.value.token)),
    request,
    refresh,
    login: (name: string, password: string) => authenticate('/session', name, password),
    register: (name: string, password: string) => authenticate('/players', name, password),
    logout: async () => {
      await request('/session', { method: 'DELETE' }).catch(() => null)
      store({ token: null, name: null })
      profile.value = null
    },
    equipBanner: async (banner: string) => {
      await request('/me/banner', { method: 'PUT', body: { banner } })
      await refresh()
    },
    showdownToken: async () => (await request<{ token: string }>('/me/showdown-tokens', { method: 'POST' })).token,
  }
}

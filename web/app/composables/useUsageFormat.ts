import type { UsageData } from '~/utils/usage'

/**
 * Format lu par le Pokédex, la Méta et le Guide : le même d'une page à l'autre, avec ses statistiques Smogon.
 * `?format=` dans l'adresse le choisit à l'arrivée.
 */
export function useUsageFormat() {
  const route = useRoute()
  const format = useState('usage-format', () => 'gen9ou')
  const usage = shallowRef<UsageData | null>(null)
  const loading = ref(true)

  if (typeof route.query.format === 'string' && usageFormat(route.query.format)) format.value = route.query.format

  watch(format, async (id) => {
    loading.value = true
    usage.value = await loadUsage(id)
    loading.value = false
  }, { immediate: true })

  return {
    format,
    usage,
    loading,
    formatName: computed(() => formatIdLabel(format.value)),
  }
}

<template>
  <div class="picker">
    <div class="picker__bar">
      <input ref="search" v-model="query" class="field picker__search" placeholder="Nom français ou anglais" aria-label="Chercher un Pokémon">
      <button v-if="closable" type="button" class="btn btn--small" @click="emit('close')">Annuler</button>
    </div>
    <div v-if="budgetMode" class="picker__sorts" role="radiogroup" aria-label="Trier les Pokémon">
      <button v-for="option in SORTS" :key="option.id" type="button" role="radio" class="picker__sort" :class="{ 'picker__sort--on': sort === option.id }" :aria-checked="sort === option.id" @click="sort = option.id">
        {{ option.label }}
      </button>
      <span v-if="budgetLeft !== undefined && budgetLeft !== null" class="picker__left" :class="{ 'picker__left--over': budgetLeft < 0 }">Il te reste {{ budgetLeft }} points</span>
    </div>
    <span class="picker__hint">{{ query ? `${rows.length} résultat${rows.length > 1 ? 's' : ''}` : budgetMode && sort !== 'usage' ? 'Tous les Pokémon autorisés' : usage ? `Les plus joués en ${budgetMode ? 'OU · Gen 9 (statistiques Smogon)' : formatName}` : 'Pokémon du Pokédex' }}</span>
    <div class="picker__list" role="listbox" aria-label="Pokémon">
      <button v-for="row in rows" :key="row.id" type="button" role="option" class="row" :class="{ 'row--over': row.over }" :aria-selected="false" @click="emit('pick', row.id)">
        <span class="row__icon" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
        <span class="row__name"><b>{{ row.nom }}</b><span v-if="row.name !== row.nom">{{ row.name }}</span></span>
        <span class="row__types">
          <span v-for="type in row.types" :key="type" class="row__type" :style="{ background: TYPE_COLORS[type] }">{{ type }}</span>
        </span>
        <span v-if="row.cost !== null" class="row__cost" :title="`Tier ${row.tier}`">{{ row.cost }} pts</span>
        <span v-else class="row__tier">{{ row.tier }}</span>
        <span class="row__usage">{{ row.usage ? percent(row.usage, 1) : '' }}</span>
      </button>
      <p v-if="!rows.length" class="picker__none">Aucun Pokémon ne correspond.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UsageData } from '~/utils/usage'

const props = defineProps<{ format: string, formatName: string, usage: UsageData | null, closable: boolean, budgetLeft?: number | null }>()
const emit = defineEmits<{ pick: [species: string], close: [] }>()
const { dex, sprite } = usePokedex()
const { costOf } = useBudget()

const LIMIT = 60
const SORTS = [{ id: 'usage', label: 'Les plus joués' }, { id: 'cheap', label: 'Moins chers' }, { id: 'expensive', label: 'Plus chers' }] as const
const query = ref('')
const sort = ref<'usage' | 'cheap' | 'expensive'>('usage')
const budgetMode = computed(() => props.format === BUDGET_FORMAT)
const search = ref<HTMLInputElement | null>(null)

/** Hors Pokédex national, les formats de la 9e génération n'ont que les Pokémon d'Écarlate et Violet. */
const allowed = computed(() => {
  const wide = props.format.includes('nationaldex') || !props.format.startsWith('gen9')
  return (nonstandard: string | undefined) => !nonstandard || (wide && nonstandard === 'Past')
})

const rows = computed(() => {
  const pokedex = dex.value
  if (!pokedex) return []
  const shares = new Map((props.usage?.pokemon ?? []).map(entry => [entry.id, entry.usage]))
  const words = plainText(query.value)
  const budget = budgetMode.value
  const byCost = budget && sort.value !== 'usage'
  let ids = words || byCost
    ? Object.keys(pokedex.pokemon).filter((id) => {
        const entry = pokedex.pokemon[id]!
        return allowed.value(entry.nonstandard) && (!words || plainText(entry.nom).includes(words) || plainText(entry.name).includes(words))
      }).sort((a, b) => (shares.get(b) ?? 0) - (shares.get(a) ?? 0) || pokedex.pokemon[a]!.num - pokedex.pokemon[b]!.num)
    : shares.size ? [...shares.keys()] : Object.keys(pokedex.pokemon).filter(id => allowed.value(pokedex.pokemon[id]!.nonstandard))
  if (budget) {
    ids = ids.filter(id => costOf(id) !== null)
    if (byCost) ids.sort((a, b) => (sort.value === 'cheap' ? 1 : -1) * ((costOf(a) ?? 0) - (costOf(b) ?? 0)))
  }
  return ids.slice(0, LIMIT).filter(id => pokedex.pokemon[id]).map((id) => {
    const entry = pokedex.pokemon[id]!
    const cost = budget ? costOf(id) : null
    const over = cost !== null && props.budgetLeft !== undefined && props.budgetLeft !== null && cost > props.budgetLeft
    return { id, nom: entry.nom, name: entry.name, types: entry.types, tier: props.format.includes('nationaldex') ? entry.natDexTier : entry.tier, usage: shares.get(id), cost, over }
  })
})

onMounted(() => search.value?.focus())
</script>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 6px; }
.picker__bar { display: flex; gap: 6px; }
.picker__search { flex: 1; }
.picker__hint { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.picker__list { display: flex; flex-direction: column; gap: 2px; max-height: 380px; overflow: auto; }

.row {
  border: 0;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 132px 56px 56px;
  gap: 8px;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--tx);
}

.row:hover, .row:focus-visible { background: var(--chip); }
.row__icon { width: 40px; height: 32px; background: center / 40px no-repeat; image-rendering: pixelated; }
.row__name { display: flex; flex-direction: column; min-width: 0; font: 400 11px 'Nunito', sans-serif; color: var(--mu); }
.row__name b { font-size: 14px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row__types { display: flex; gap: 3px; }

.row__type {
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.row__tier { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.row__cost { font: 600 14px 'Pixelify Sans', sans-serif; color: var(--good); }
.row--over { opacity: .6; }
.row--over .row__cost { color: var(--bad); }
.picker__sorts { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.picker__sort { border: 0; cursor: pointer; height: 28px; padding: 0 10px; border-radius: 6px; background: var(--chip); color: var(--tx); font: 700 12px 'Nunito', sans-serif; }
.picker__sort--on { background: #2fc8b8; color: #061a18; }
.picker__left { margin-left: auto; font: 700 12px 'Nunito', sans-serif; color: var(--good); }
.picker__left--over { color: var(--bad); }
.row__usage { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }
.picker__none { margin: 0; padding: 14px; text-align: center; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 640px) {
  .row { grid-template-columns: 40px minmax(0, 1fr) 56px; }
  .row__types, .row__tier, .row__cost { display: none; }
}
</style>

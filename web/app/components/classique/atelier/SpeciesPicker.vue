<template>
  <div class="picker">
    <div class="picker__bar">
      <input ref="search" v-model="query" class="field picker__search" placeholder="Nom français ou anglais" aria-label="Chercher un Pokémon">
      <button v-if="closable" type="button" class="btn btn--small" @click="emit('close')">Annuler</button>
    </div>
    <span class="picker__hint">{{ query ? `${rows.length} résultat${rows.length > 1 ? 's' : ''}` : usage ? `Les plus joués en ${formatName}` : 'Pokémon du Pokédex' }}</span>
    <div class="picker__list" role="listbox" aria-label="Pokémon">
      <button v-for="row in rows" :key="row.id" type="button" role="option" class="row" :aria-selected="false" @click="emit('pick', row.id)">
        <span class="row__icon" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
        <span class="row__name"><b>{{ row.nom }}</b><span v-if="row.name !== row.nom">{{ row.name }}</span></span>
        <span class="row__types">
          <span v-for="type in row.types" :key="type" class="row__type" :style="{ background: TYPE_COLORS[type] }">{{ type }}</span>
        </span>
        <span class="row__tier">{{ row.tier }}</span>
        <span class="row__usage">{{ row.usage ? percent(row.usage, 1) : '' }}</span>
      </button>
      <p v-if="!rows.length" class="picker__none">Aucun Pokémon ne correspond.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UsageData } from '~/utils/usage'

const props = defineProps<{ format: string, formatName: string, usage: UsageData | null, closable: boolean }>()
const emit = defineEmits<{ pick: [species: string], close: [] }>()
const { dex, sprite } = usePokedex()

const LIMIT = 60
const query = ref('')
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
  const ids = words
    ? Object.keys(pokedex.pokemon).filter((id) => {
        const entry = pokedex.pokemon[id]!
        return allowed.value(entry.nonstandard) && (plainText(entry.nom).includes(words) || plainText(entry.name).includes(words))
      }).sort((a, b) => (shares.get(b) ?? 0) - (shares.get(a) ?? 0) || pokedex.pokemon[a]!.num - pokedex.pokemon[b]!.num)
    : shares.size ? [...shares.keys()] : Object.keys(pokedex.pokemon).filter(id => allowed.value(pokedex.pokemon[id]!.nonstandard))
  return ids.slice(0, LIMIT).filter(id => pokedex.pokemon[id]).map((id) => {
    const entry = pokedex.pokemon[id]!
    return { id, nom: entry.nom, name: entry.name, types: entry.types, tier: props.format.includes('nationaldex') ? entry.natDexTier : entry.tier, usage: shares.get(id) }
  })
})

onMounted(() => search.value?.focus())
</script>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 6px; }
.picker__bar { display: flex; gap: 6px; }
.picker__search { flex: 1; }
.picker__hint { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
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
.row__name { display: flex; flex-direction: column; min-width: 0; font: 400 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.row__name b { font-size: 14px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row__types { display: flex; gap: 3px; }

.row__type {
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.row__tier { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.row__usage { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }
.picker__none { margin: 0; padding: 14px; text-align: center; font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 640px) {
  .row { grid-template-columns: 40px minmax(0, 1fr) 56px; }
  .row__types, .row__tier { display: none; }
}
</style>

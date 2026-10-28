<template>
  <section class="list" aria-label="Pokémon">
    <div class="list__search">
      <input v-model="query" class="field list__input" placeholder="Chercher (FR ou EN)…" aria-label="Chercher un Pokémon">
      <span class="list__hint">{{ query ? `${rows.length}${rows.length >= LIMIT ? '+' : ''} résultat${rows.length > 1 ? 's' : ''}` : usage ? `Top ${rows.length} ${shortFormat} · ou tape un nom` : 'Tape un nom pour chercher' }}</span>
    </div>
    <div class="list__rows">
      <NuxtLink
        v-for="(row, index) in rows"
        :key="row.id"
        :to="{ query: { ...route.query, id: row.id } }"
        class="row"
        :class="{ 'row--on': row.id === selected }"
        :aria-current="row.id === selected ? 'true' : undefined"
      >
        <span class="row__rank">{{ query ? '' : index + 1 }}</span>
        <span class="row__icon" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
        <span class="row__name">{{ row.nom }}</span>
        <span class="row__usage">{{ row.usage ? percent(row.usage, 1) : '' }}</span>
      </NuxtLink>
      <p v-if="!rows.length" class="list__none">Aucun Pokémon ne correspond.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UsageData } from '~/utils/usage'

const props = defineProps<{ formatName: string, usage: UsageData | null, selected: string }>()
const route = useRoute()
const { dex, sprite } = usePokedex()

const LIMIT = 80
const query = ref('')
const shortFormat = computed(() => props.formatName.split(' · ')[0])

/** Sans recherche, les Pokémon du format par usage ; avec, tout le Pokédex (les plus joués d'abord). */
const rows = computed(() => {
  const pokedex = dex.value
  if (!pokedex) return []
  const shares = new Map((props.usage?.pokemon ?? []).map(entry => [entry.id, entry.usage]))
  const words = plainText(query.value)
  const ids = words
    ? Object.keys(pokedex.pokemon)
        .filter(id => plainText(pokedex.pokemon[id]!.nom).includes(words) || plainText(pokedex.pokemon[id]!.name).includes(words))
        .sort((a, b) => (shares.get(b) ?? 0) - (shares.get(a) ?? 0) || pokedex.pokemon[a]!.num - pokedex.pokemon[b]!.num)
        .slice(0, LIMIT)
    : [...shares.keys()]
  return ids.filter(id => pokedex.pokemon[id]).map(id => ({ id, nom: pokedex.pokemon[id]!.nom, usage: shares.get(id) }))
})
</script>

<style scoped>
.list {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 140px);
  position: sticky;
  top: 12px;
}

.list__search { padding: 10px; display: flex; flex-direction: column; gap: 4px; background: var(--hd); }
.list__input { height: 34px; }
.list__hint { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--hdTx); opacity: .85; }
.list__rows { overflow: auto; padding: 6px; display: flex; flex-direction: column; gap: 1px; }

.row {
  display: grid;
  grid-template-columns: 22px 40px minmax(0, 1fr) 48px;
  gap: 6px;
  align-items: center;
  padding: 1px 6px;
  border-radius: 6px;
  color: var(--tx);
  text-decoration: none;
}

.row:hover { background: var(--chip); text-decoration: none; }
.row--on { background: color-mix(in srgb, var(--uA) 22%, var(--in)); box-shadow: inset 0 0 0 2px var(--uA); }
.row__rank { font: 600 12px 'Pixelify Sans', sans-serif; color: var(--mu); text-align: right; }
.row__icon { width: 40px; height: 30px; background: center / 40px no-repeat; image-rendering: pixelated; }
.row__name { font: 700 13px 'Atkinson Hyperlegible', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row__usage { font: 600 12px 'Pixelify Sans', sans-serif; text-align: right; }
.list__none { margin: 0; padding: 14px; text-align: center; font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 980px) {
  .list { position: static; max-height: 320px; }
}
</style>

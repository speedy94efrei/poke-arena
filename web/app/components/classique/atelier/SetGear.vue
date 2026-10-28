<template>
  <div class="gear">
    <section class="gear__block" aria-label="Objet">
      <span class="gear__title">Objet</span>
      <button
        v-for="row in items"
        :key="row.id"
        type="button"
        class="option"
        :class="{ 'option--on': row.id === set.item }"
        :aria-pressed="row.id === set.item"
        :title="row.description"
        @click="emit('update', { item: row.id === set.item ? '' : row.id })"
      >
        <span class="option__icon"><span v-if="row.sprite !== undefined" :style="itemIconStyle(row.sprite, 24)" /></span>
        <span class="option__name">{{ row.nom }}</span>
        <span class="option__share">{{ shareText(row.share) }}</span>
      </button>
      <select class="field gear__select" :value="set.item" aria-label="Autre objet" @change="event => emit('update', { item: (event.target as HTMLSelectElement).value })">
        <option value="">Aucun objet</option>
        <option v-for="row in allItems" :key="row.id" :value="row.id">{{ row.nom }}</option>
      </select>
    </section>

    <div class="gear__side">
      <section class="gear__block" aria-label="Talent">
        <span class="gear__title">Talent</span>
        <button
          v-for="row in abilities"
          :key="row.id"
          type="button"
          class="option"
          :class="{ 'option--on': row.id === set.ability }"
          :aria-pressed="row.id === set.ability"
          :title="row.description"
          @click="emit('update', { ability: row.id })"
        >
          <span class="option__name">{{ row.nom }}</span>
          <span class="option__share">{{ shareText(row.share) }}</span>
        </button>
        <span v-if="current" class="gear__desc">{{ current }}</span>
      </section>

      <section v-if="tera" class="gear__block" aria-label="Type Téra">
        <span class="gear__title">Type Téra</span>
        <div class="tera">
          <button
            v-for="row in teraChips"
            :key="row.id"
            type="button"
            class="tera__chip"
            :class="{ 'tera__chip--on': row.id === set.teraType }"
            :style="{ '--type': TYPE_COLORS[row.type] ?? '#7a7a7a' }"
            :aria-pressed="row.id === set.teraType"
            @click="emit('update', { teraType: row.id })"
          >
            ◆ {{ row.type }}<span v-if="row.share"> {{ percent(row.share) }}</span>
          </button>
        </div>
        <select class="field gear__select" :value="set.teraType" aria-label="Autre type Téra" @change="event => emit('update', { teraType: (event.target as HTMLSelectElement).value })">
          <option value="">Type Téra par défaut</option>
          <option v-for="type in TERA_TYPES" :key="type" :value="type">{{ frenchType(type) }}</option>
        </select>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TypePokemon } from '#data/types/roster'
import type { ClassicSet } from '~/utils/classicTeam'
import type { UsagePokemon } from '~/utils/usage'

const props = defineProps<{ set: ClassicSet, usage: UsagePokemon | undefined, format: string }>()
const emit = defineEmits<{ update: [patch: Partial<ClassicSet>] }>()
const { dex } = usePokedex()

const TERA_TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar']
const USAGE_ITEMS = 6

const tera = computed(() => props.format.startsWith('gen9'))
const shareText = (share: number) => !share ? '' : share < 0.005 ? '<1 %' : percent(share)
const wide = computed(() => props.format.includes('nationaldex') || !props.format.startsWith('gen9'))

/** Les objets les plus joués sur ce Pokémon, puis celui choisi s'il n'en fait pas partie. */
const items = computed(() => {
  const rows: { id: string, share: number }[] = (props.usage?.items ?? []).filter(([id]) => id && id !== 'nothing').slice(0, USAGE_ITEMS).map(([id, share]) => ({ id, share }))
  if (props.set.item && !rows.some(row => row.id === props.set.item)) rows.push({ id: props.set.item, share: 0 })
  return rows.map((row) => {
    const item = dex.value?.items[row.id]
    return { ...row, nom: item?.nom ?? row.id, sprite: item?.sprite, description: item?.description }
  })
})

const allItems = computed(() => Object.entries(dex.value?.items ?? {})
  .filter(([, item]) => !item.nonstandard || (wide.value && item.nonstandard === 'Past'))
  .map(([id, item]) => ({ id, nom: item.nom }))
  .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))

const abilities = computed(() => {
  const shares = new Map(props.usage?.abilities ?? [])
  const ids = (dex.value?.pokemon[props.set.species]?.abilities ?? []).map(toId)
  return ids.map((id) => {
    const ability = dex.value?.abilities[id]
    return { id, nom: ability?.nom ?? id, description: ability?.description, share: shares.get(id) ?? 0 }
  }).sort((a, b) => b.share - a.share)
})

const current = computed(() => dex.value?.abilities[props.set.ability]?.description ?? '')

const teraChips = computed(() => {
  const rows = (props.usage?.tera ?? []).slice(0, 5).map(([id, share]) => ({ id, share }))
  if (props.set.teraType && !rows.some(row => row.id === props.set.teraType)) rows.push({ id: props.set.teraType, share: 0 })
  return rows.map(row => ({ ...row, type: frenchType(row.id) as TypePokemon }))
})
</script>

<style scoped>
.gear { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.gear__side { display: flex; flex-direction: column; gap: 12px; }
.gear__block { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.gear__title { font: 600 15px 'Pixelify Sans', sans-serif; margin-bottom: 2px; }
.gear__select { height: 32px; font-size: 13px; margin-top: 2px; }
.gear__desc { font: 400 12px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.option {
  border: 0;
  cursor: pointer;
  text-align: left;
  min-height: 34px;
  padding: 0 10px 0 6px;
  border-radius: 7px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  display: flex;
  align-items: center;
  gap: 8px;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.option--on { background: color-mix(in srgb, var(--uA) 18%, var(--in)); box-shadow: inset 0 0 0 2px var(--uA); }
.option__icon { flex: none; width: 24px; height: 24px; }
.option__icon > span { display: block; }
.option__name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 4px; }
.option__share { font: 600 13px 'Pixelify Sans', sans-serif; color: var(--mu); }
.tera { display: flex; flex-wrap: wrap; gap: 5px; }

.tera__chip {
  border: 0;
  cursor: pointer;
  height: 28px;
  padding: 0 9px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--type) 70%, #0b0f16);
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  box-shadow: 0 0 0 2px var(--bd);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
}

.tera__chip--on { box-shadow: inset 0 0 0 2px #fff, 0 0 0 2px var(--uA); }

@media (max-width: 760px) {
  .gear { grid-template-columns: minmax(0, 1fr); }
}
</style>

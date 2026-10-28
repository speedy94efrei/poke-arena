<template>
  <section class="community" aria-label="Ce que joue la communauté">
    <header class="community__head">Ce que joue la communauté · {{ formatName }}<span class="community__aside">% des équipes qui jouent {{ name }}</span></header>
    <p v-if="!usage" class="community__empty">{{ name }} n'apparaît pas dans les statistiques Smogon de {{ formatName }} : trop peu joué, ou interdit dans ce format.</p>
    <div v-else class="community__body">
      <div class="column">
        <span class="column__title">Attaques</span>
        <div v-for="row in moves" :key="row.id" class="bar">
          <span class="bar__name" :title="row.type">{{ row.nom }}</span>
          <span class="bar__track"><span class="bar__fill" :style="{ width: `${row.share * 100}%`, background: TYPE_COLORS[row.type] }" /></span>
          <span class="bar__pct">{{ percent(row.share, 1) }}</span>
        </div>
      </div>

      <div class="column">
        <span class="column__title">Objets</span>
        <div v-for="row in items" :key="row.id" class="item">
          <span class="item__icon"><span v-if="row.sprite !== undefined" :style="itemIconStyle(row.sprite, 24)" /></span>
          <span class="item__name">{{ row.nom }}</span>
          <span class="bar__pct">{{ percent(row.share, 1) }}</span>
        </div>
        <template v-if="tera.length">
          <span class="column__title">Types Téra</span>
          <span class="chips">
            <span v-for="row in tera" :key="row.type" class="chip" :style="{ background: TYPE_COLORS[row.type] ?? '#7a7a7a' }">◆ {{ row.type }} {{ percent(row.share, 1) }}</span>
          </span>
        </template>
      </div>

      <div class="column">
        <span class="column__title">Répartitions (nature · EV)</span>
        <div v-for="row in spreads" :key="row.key" class="spread">
          <span class="spread__head"><b>{{ row.nature }}</b><span>{{ percent(row.share, 1) }}</span></span>
          <span class="spread__evs">{{ row.evs }}</span>
        </div>
        <template v-if="mates.length">
          <span class="column__title">Coéquipiers fréquents</span>
          <span class="mons">
            <NuxtLink v-for="row in mates" :key="row.id" :to="{ query: { ...route.query, id: row.id } }" class="mon" :title="`${row.nom} · ${percent(row.share)}`" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
          </span>
        </template>
        <template v-if="counters.length">
          <span class="column__title">Ses contres</span>
          <span class="mons">
            <NuxtLink v-for="row in counters" :key="row.id" :to="{ query: { ...route.query, id: row.id } }" class="mon" :title="row.nom" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
          </span>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TypePokemon } from '#data/types/roster'
import type { UsagePokemon } from '~/utils/usage'

const props = defineProps<{ usage: UsagePokemon | undefined, name: string, formatName: string }>()
const route = useRoute()
const { dex, sprite } = usePokedex()

const moves = computed(() => (props.usage?.moves ?? []).filter(([id]) => id && id !== 'nothing').map(([id, share]) => {
  const move = dex.value?.moves[id]
  return { id, share, nom: move?.nom ?? id, type: (move?.type ?? 'Normal') as TypePokemon }
}))

const items = computed(() => (props.usage?.items ?? []).filter(([id]) => id && id !== 'nothing').map(([id, share]) => {
  const item = dex.value?.items[id]
  return { id, share, nom: item?.nom ?? id, sprite: item?.sprite }
}))

const tera = computed(() => (props.usage?.tera ?? []).map(([type, share]) => ({ type: frenchType(type), share })))

const spreads = computed(() => (props.usage?.spreads ?? []).map(([key, share]) => {
  const { nature, evs } = parseSpread(key)
  const info = findNature(nature)
  return {
    key,
    share,
    nature: info ? natureLabel(info) : nature,
    evs: STATS.filter(stat => evs[stat.id]).map(stat => `${evs[stat.id]} ${stat.label}`).join(' / '),
  }
}))

const named = (rows: [string, number][]) => rows.filter(([id]) => dex.value?.pokemon[id]).map(([id, share]) => ({ id, share, nom: dex.value!.pokemon[id]!.nom }))
const mates = computed(() => named(props.usage?.teammates ?? []))
const counters = computed(() => named(props.usage?.counters ?? []))
</script>

<style scoped>
.community { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.community__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 10px;
}

.community__aside { margin-left: auto; font: 700 11px 'Nunito', sans-serif; text-shadow: none; }
.community__empty { margin: 0; padding: 14px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.community__body { padding: 10px 12px 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.column { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.column__title { font: 700 11px 'Nunito', sans-serif; color: var(--mu); text-transform: uppercase; letter-spacing: .04em; margin-top: 4px; }
.bar { display: grid; grid-template-columns: minmax(0, 1fr) 70px 46px; gap: 6px; align-items: center; }
.bar__name { font: 700 12px 'Nunito', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar__track { height: 8px; border-radius: 3px; background: var(--in); overflow: hidden; }
.bar__fill { display: block; height: 100%; border-radius: 3px; }
.bar__pct { font: 600 12px 'Pixelify Sans', sans-serif; text-align: right; }
.item { display: grid; grid-template-columns: 24px minmax(0, 1fr) 46px; gap: 6px; align-items: center; }
.item__icon { width: 24px; height: 24px; }
.item__icon > span { display: block; }
.item__name { font: 700 12px 'Nunito', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }

.chip {
  height: 22px;
  padding: 0 7px;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 11px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.spread { padding: 6px 8px; border-radius: 7px; background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); display: flex; flex-direction: column; gap: 2px; }
.spread__head { display: flex; gap: 6px; font: 700 12px 'Nunito', sans-serif; }
.spread__head b { flex: 1; }
.spread__head span { font: 600 12px 'Pixelify Sans', sans-serif; }
.spread__evs { font: 400 11px 'Nunito', sans-serif; color: var(--mu); }
.mons { display: flex; flex-wrap: wrap; gap: 3px; }
.mon { width: 44px; height: 36px; border-radius: 6px; background: var(--in) center / 40px no-repeat; image-rendering: pixelated; box-shadow: inset 0 0 0 2px var(--chip); }
.mon:hover { box-shadow: inset 0 0 0 2px var(--uA); }

@media (max-width: 1100px) {
  .community__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

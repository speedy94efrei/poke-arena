<template>
  <div class="spread">
    <span class="spread__title">Nature et EV <span>{{ spreads.length ? 'les plus joués, ou à la main' : 'à la main' }}</span></span>
    <div v-if="spreads.length" class="presets">
      <button
        v-for="row in spreads"
        :key="row.key"
        type="button"
        class="preset"
        :class="{ 'preset--on': row.on }"
        :aria-pressed="row.on"
        @click="emit('update', { nature: row.nature, evs: row.evs })"
      >
        <span class="preset__head"><b>{{ row.natureLabel }}</b><span>{{ percent(row.share) }}</span></span>
        <span class="preset__evs">{{ row.evsLabel }}</span>
      </button>
    </div>

    <label class="nature">
      <span>Nature</span>
      <select class="field nature__select" :value="set.nature || NEUTRAL_NATURE" @change="event => emit('update', { nature: (event.target as HTMLSelectElement).value })">
        <option v-for="nature in NATURES" :key="nature.id" :value="nature.id">{{ natureLabel(nature) }}</option>
      </select>
    </label>

    <div class="stats">
      <div class="stats__head">
        <span>Stat</span><span>Base</span><span class="stats__ev">EV</span><span>IV</span><span>Niv. {{ set.level }}</span>
      </div>
      <div v-for="row in rows" :key="row.id" class="stat" :class="`stat--${row.mark}`">
        <span class="stat__label">{{ row.label }}<b v-if="row.mark !== 'neutral'">{{ row.mark === 'plus' ? '+' : '−' }}</b></span>
        <span class="stat__base">{{ row.base }}</span>
        <input class="stat__range" type="range" min="0" :max="MAX_EV" step="4" :value="row.ev" :aria-label="`EV ${row.label}`" @input="event => setEv(row.id, Number((event.target as HTMLInputElement).value))">
        <input class="stat__number" type="number" min="0" :max="MAX_EV" step="4" :value="row.ev" :aria-label="`EV ${row.label} (nombre)`" @change="event => setEv(row.id, Number((event.target as HTMLInputElement).value))">
        <input class="stat__number" type="number" min="0" :max="MAX_IV" :value="row.iv" :aria-label="`IV ${row.label}`" @change="event => setIv(row.id, Number((event.target as HTMLInputElement).value))">
        <span class="stat__value">{{ row.value }}</span>
      </div>
      <span class="stats__total" :class="{ 'stats__total--over': total > MAX_EV_TOTAL }">{{ total }} / {{ MAX_EV_TOTAL }} EV<template v-if="total < MAX_EV_TOTAL"> · {{ MAX_EV_TOTAL - total }} à placer</template></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClassicSet } from '~/utils/classicTeam'
import type { StatId } from '~/utils/showdownTeam'
import type { UsagePokemon } from '~/utils/usage'

const props = defineProps<{ set: ClassicSet, usage: UsagePokemon | undefined }>()
const emit = defineEmits<{ update: [patch: Partial<ClassicSet>] }>()
const { dex } = usePokedex()

const SPREADS = 3

const evsText = (evs: Partial<Record<StatId, number>>) => STATS.filter(stat => evs[stat.id]).map(stat => `${evs[stat.id]} ${stat.label}`).join(' / ') || 'Aucun EV'

const spreads = computed(() => (props.usage?.spreads ?? []).slice(0, SPREADS).map(([key, share]) => {
  const { nature, evs } = parseSpread(key)
  const info = findNature(nature)
  const on = props.set.nature === nature && STATS.every(stat => (props.set.evs[stat.id] ?? 0) === (evs[stat.id] ?? 0))
  return { key, share, nature, evs, on, natureLabel: info ? natureLabel(info) : nature, evsLabel: evsText(evs) }
}))

const total = computed(() => STATS.reduce((sum, stat) => sum + (props.set.evs[stat.id] ?? 0), 0))

/** Stat finale au niveau du set : formule officielle, nature comprise. */
const rows = computed(() => {
  const base = dex.value?.pokemon[props.set.species]?.stats
  const nature = findNature(props.set.nature)
  return STATS.map((stat) => {
    const ev = props.set.evs[stat.id] ?? 0
    const iv = props.set.ivs[stat.id] ?? MAX_IV
    const value = base?.[stat.id] ?? 0
    const core = Math.floor((2 * value + iv + Math.floor(ev / 4)) * props.set.level / 100)
    const mark = nature?.plus === stat.id && nature.moins !== stat.id ? 'plus' : nature?.moins === stat.id && nature.plus !== stat.id ? 'minus' : 'neutral'
    const final = stat.id === 'hp' ? core + props.set.level + 10 : Math.floor((core + 5) * (mark === 'plus' ? 1.1 : mark === 'minus' ? 0.9 : 1))
    return { id: stat.id, label: stat.label, base: value, ev, iv, mark, value: value ? final : '—' }
  })
})

const setEv = (stat: StatId, value: number) => {
  const others = total.value - (props.set.evs[stat] ?? 0)
  const clamped = Math.max(0, Math.min(MAX_EV, MAX_EV_TOTAL - others, Math.floor((value || 0) / 4) * 4))
  emit('update', { evs: { ...props.set.evs, [stat]: clamped } })
}

const setIv = (stat: StatId, value: number) => {
  const ivs = { ...props.set.ivs, [stat]: Math.max(0, Math.min(MAX_IV, Math.round(value || 0))) }
  if (ivs[stat] === MAX_IV) delete ivs[stat]
  emit('update', { ivs })
}
</script>

<style scoped>
.spread { display: flex; flex-direction: column; gap: 8px; }
.spread__title { font: 600 15px 'Pixelify Sans', sans-serif; }
.spread__title span { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); margin-left: 6px; }
.presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }

.preset {
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preset--on { background: color-mix(in srgb, var(--uA) 18%, var(--in)); box-shadow: inset 0 0 0 2px var(--uA); }
.preset__head { display: flex; gap: 6px; font: 700 12px 'Atkinson Hyperlegible', sans-serif; }
.preset__head b { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.preset__head span { font: 600 13px 'Pixelify Sans', sans-serif; }
.preset__evs { font: 400 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.nature { display: flex; align-items: center; gap: 8px; font: 700 13px 'Atkinson Hyperlegible', sans-serif; }
.nature__select { flex: 1; max-width: 320px; height: 32px; font-size: 13px; }
.stats { display: flex; flex-direction: column; gap: 3px; }

.stats__head, .stat {
  display: grid;
  grid-template-columns: 74px 36px minmax(0, 1fr) 54px 44px 44px;
  gap: 8px;
  align-items: center;
}

.stats__head { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.stat__label { font: 700 13px 'Atkinson Hyperlegible', sans-serif; }
.stat__label b { margin-left: 3px; }
.stat--plus .stat__label { color: #ff9a7a; }
.stat--minus .stat__label { color: #8ab4ff; }
.stat__base { font: 600 13px 'Pixelify Sans', sans-serif; color: var(--mu); text-align: right; }
.stat__range { width: 100%; accent-color: var(--uA); }

.stat__number {
  width: 100%;
  height: 26px;
  border: 0;
  border-radius: 5px;
  padding: 0 4px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  text-align: right;
}

.stat__value { font: 600 15px 'Pixelify Sans', sans-serif; text-align: right; }
.stats__total { align-self: flex-end; font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.stats__total--over { color: #ff8a70; }

.stats__ev { grid-column: span 2; }

@media (max-width: 760px) {
  .presets { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 560px) {
  .stats__head, .stat { grid-template-columns: 70px 34px 60px 48px minmax(0, 1fr); }
  .stats__ev { grid-column: span 1; }
  .stat__range { display: none; }
}
</style>

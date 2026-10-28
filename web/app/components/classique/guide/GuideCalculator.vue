<template>
  <section class="calc" aria-label="Calculateur de statistiques">
    <header class="calc__head">Calculateur · {{ pokemon?.nom ?? species }} · niveau {{ level }}</header>
    <div class="calc__body">
      <label class="calc__row">
        <span>Pokémon</span>
        <select v-model="species" class="field calc__select">
          <option v-for="option in options" :key="option.id" :value="option.id">{{ option.nom }}</option>
        </select>
      </label>
      <div class="tabs" role="radiogroup" aria-label="Statistique">
        <button v-for="entry in STATS" :key="entry.id" type="button" role="radio" class="tab" :class="{ 'tab--on': stat === entry.id }" :aria-checked="stat === entry.id" @click="stat = entry.id">{{ entry.label }}</button>
      </div>
      <label class="calc__row">
        <span>EV</span>
        <input v-model.number="ev" type="range" min="0" :max="MAX_EV" step="4" class="calc__range">
        <b>{{ ev }}</b>
      </label>
      <label class="calc__row">
        <span>IV</span>
        <input v-model.number="iv" type="range" min="0" :max="MAX_IV" step="1" class="calc__range">
        <b>{{ iv }}</b>
      </label>
      <div v-if="stat !== 'hp'" class="tabs" role="radiogroup" aria-label="Effet de la nature">
        <button v-for="option in NATURE_EFFECTS" :key="option.value" type="button" role="radio" class="tab" :class="{ 'tab--on': nature === option.value }" :aria-checked="nature === option.value" @click="nature = option.value">{{ option.label }}</button>
      </div>
      <div class="result">
        <span class="result__value"><span>{{ statLabel(stat) }} finale</span><b>{{ value }}</b></span>
        <span class="result__detail">Base {{ base }} · min {{ minimum }} · max {{ maximum }}<br>{{ stat === 'hp' ? '(2 × base + IV + EV/4) × niveau/100 + niveau + 10' : '((2 × base + IV + EV/4) × niveau/100 + 5) × nature' }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { StatId } from '~/utils/showdownTeam'
import type { UsageData } from '~/utils/usage'

const props = defineProps<{ usage: UsageData | null }>()
const { dex } = usePokedex()

const NATURE_EFFECTS = [{ value: 1.1, label: 'Nature +' }, { value: 1, label: 'Neutre' }, { value: 0.9, label: 'Nature −' }]
const level = 100

const species = ref('greattusk')
const stat = ref<StatId>('atk')
const ev = ref(252)
const iv = ref(MAX_IV)
const nature = ref(1.1)

const options = computed(() => (props.usage?.pokemon ?? []).slice(0, 40).map(entry => ({ id: entry.id, nom: dex.value?.pokemon[entry.id]?.nom ?? entry.id })))
const pokemon = computed(() => dex.value?.pokemon[species.value])
const base = computed(() => pokemon.value?.stats[stat.value] ?? 0)

watch(options, (list) => {
  if (list.length && !list.some(option => option.id === species.value)) species.value = list[0]!.id
}, { immediate: true })

const compute = (evs: number, ivs: number, factor: number) => {
  const core = Math.floor((2 * base.value + ivs + Math.floor(evs / 4)) * level / 100)
  return stat.value === 'hp' ? core + level + 10 : Math.floor((core + 5) * factor)
}

const value = computed(() => compute(ev.value, iv.value, stat.value === 'hp' ? 1 : nature.value))
const minimum = computed(() => compute(0, 0, stat.value === 'hp' ? 1 : 0.9))
const maximum = computed(() => compute(MAX_EV, MAX_IV, stat.value === 'hp' ? 1 : 1.1))
</script>

<style scoped>
.calc { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.calc__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
}

.calc__body { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.calc__row { display: grid; grid-template-columns: 70px minmax(0, 1fr) 40px; gap: 8px; align-items: center; font: 700 13px 'Nunito', sans-serif; }
.calc__row b { font: 600 15px 'Pixelify Sans', sans-serif; text-align: right; }
.calc__select { grid-column: span 2; height: 32px; font-size: 13px; }
.calc__range { width: 100%; accent-color: var(--uA); }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; }

.tab {
  border: 0;
  cursor: pointer;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Nunito', sans-serif;
}

.tab--on { background: var(--hd); color: var(--hdTx); }
.result { display: flex; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 8px; background: var(--dk); --tx: var(--dkTx); --mu: var(--dkMu); --chip: var(--dkChip); color: var(--tx); flex-wrap: wrap; }
.result__value { display: flex; flex-direction: column; font: 700 11px 'Nunito', sans-serif; color: var(--mu); text-transform: uppercase; }
.result__value b { font: 700 34px/1 'Pixelify Sans', sans-serif; color: var(--uT); }
.result__detail { flex: 1; min-width: 180px; font: 700 12px/1.5 'Nunito', sans-serif; color: var(--mu); }
</style>

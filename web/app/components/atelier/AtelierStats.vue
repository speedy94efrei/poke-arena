<template>
  <CodexBlock title="Nature, EV et IV">
    <template #aside>Niveau <b class="num">100</b> · stats PokéDraft</template>
    <div class="presets">
      <span class="presets__label">Départ rapide</span>
      <button
        v-for="preset in EV_PRESETS"
        :key="preset.id"
        type="button"
        class="chip"
        :class="{ 'chip--on': variant.preset === preset.id }"
        :aria-pressed="variant.preset === preset.id"
        :title="preset.detail"
        @click="emit('update', presetPatch(pokemon, preset.id, variant))"
      >
        {{ preset.label }}
      </button>
    </div>
    <div class="summary">
      <span class="summary__label">Nature</span>
      <span class="summary__nature">{{ natureText }}</span>
      <span v-if="!draft.plus || !draft.moins" class="summary__hint">· choisis un ▲ et un ▼</span>
      <span class="summary__spacer" />
      <span class="summary__label">EV <b class="num" :style="{ color: total === MAX_EV_TOTAL ? 'var(--good)' : 'var(--uT)' }">{{ total }}/{{ MAX_EV_TOTAL }}</b></span>
    </div>
    <div class="row row--head">
      <span>Stat</span><span>Nature</span><span>EV</span><span /><span>IV</span><span class="row__final">Finale</span>
    </div>
    <div v-for="stat in rows" :key="stat.id" class="row">
      <span class="row__label" :class="{ up: stat.up, down: stat.down }">{{ stat.label }}</span>
      <span class="row__nature">
        <template v-if="stat.id !== 'hp'">
          <button type="button" class="chip" :class="{ 'chip--on': stat.up }" :aria-pressed="stat.up" :aria-label="`Nature : monter ${stat.label}`" @click="toggle('plus', stat.id)">▲</button>
          <button type="button" class="chip" :class="{ 'chip--on': stat.down }" :aria-pressed="stat.down" :aria-label="`Nature : baisser ${stat.label}`" @click="toggle('moins', stat.id)">▼</button>
        </template>
        <span v-else class="row__none">—</span>
      </span>
      <input
        type="range"
        class="row__range"
        min="0"
        :max="MAX_EV"
        step="4"
        :value="stat.ev"
        :aria-label="`EV ${stat.label}`"
        @input="event => setEv(stat.id, Number((event.target as HTMLInputElement).value))"
      >
      <input
        type="number"
        class="row__ev"
        min="0"
        :max="MAX_EV"
        step="4"
        :value="stat.ev"
        :aria-label="`EV ${stat.label}, valeur`"
        @change="event => setEv(stat.id, Number((event.target as HTMLInputElement).value))"
      >
      <span class="row__ivs">
        <button type="button" class="chip" :class="{ 'chip--on': stat.iv === MAX_IV }" :aria-pressed="stat.iv === MAX_IV" :aria-label="`IV ${stat.label} à 31`" @click="setIv(stat.id, MAX_IV)">31</button>
        <button type="button" class="chip" :class="{ 'chip--on': stat.iv === 0 }" :aria-pressed="stat.iv === 0" :aria-label="`IV ${stat.label} à 0`" @click="setIv(stat.id, 0)">0</button>
      </span>
      <span class="row__final" :class="{ up: stat.up, down: stat.down }">{{ stat.final }}</span>
    </div>
    <span class="hint">IV à 0 : en Vitesse pour la Distorsion, en Attaque pour réduire les dégâts de la confusion sur un attaquant spécial.</span>
  </CodexBlock>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { StatId } from '~/utils/showdownTeam'
import type { Variante } from '~/utils/atelier'

const props = defineProps<{ pokemon: Pokemon, variant: Variante }>()
const emit = defineEmits<{ update: [patch: Partial<Variante>] }>()

const fromNature = () => {
  const nature = findNature(props.variant.natureId)
  return { plus: nature?.plus ?? null, moins: nature?.moins ?? null }
}

const draft = ref<{ plus: StatId | null, moins: StatId | null }>(fromNature())

watch(() => props.variant.natureId, () => {
  const synced = fromNature()
  if (synced.plus || (draft.value.plus && draft.value.moins)) draft.value = synced
})

const total = computed(() => evTotal(props.variant.evs))
const natureText = computed(() => {
  const nature = findNature(props.variant.natureId)
  return nature?.plus ? natureLabel(nature) : 'Neutre'
})

const rows = computed(() => STATS.map(stat => ({
  ...stat,
  ev: props.variant.evs[stat.id],
  iv: props.variant.ivs[stat.id],
  final: finalStat(props.pokemon, props.variant, stat.id),
  up: draft.value.plus === stat.id,
  down: draft.value.moins === stat.id,
})))

const toggle = (side: 'plus' | 'moins', stat: StatId) => {
  const other = side === 'plus' ? 'moins' : 'plus'
  const next = { ...draft.value }
  next[side] = next[side] === stat ? null : stat
  if (next[other] === stat) next[other] = null
  draft.value = next
  emit('update', { natureId: natureFor(next.plus, next.moins) })
}

const setEv = (stat: StatId, value: number) => {
  const others = total.value - props.variant.evs[stat]
  const ev = Math.max(0, Math.min(Number.isFinite(value) ? value : 0, MAX_EV, MAX_EV_TOTAL - others))
  emit('update', { evs: { ...props.variant.evs, [stat]: ev - (ev % 4) }, preset: null })
}

const setIv = (stat: StatId, value: number) => {
  emit('update', { ivs: { ...props.variant.ivs, [stat]: value }, preset: null })
}
</script>

<style scoped>
.num { font: 600 14px 'Pixelify Sans', sans-serif; }

.presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.presets__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); margin-right: 2px; }

.chip {
  border: 0;
  cursor: pointer;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Nunito', sans-serif;
  padding: 4px 8px;
}

.chip--on { background: var(--uA); color: var(--uAtx); }

.summary {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 2px solid var(--chip);
}

.summary__label, .summary__hint { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.summary__nature { font: 700 15px 'Nunito', sans-serif; }
.summary__spacer { flex: 1; }

.row {
  display: grid;
  grid-template-columns: 62px 58px minmax(0, 1fr) 50px 66px 42px;
  gap: 6px;
  align-items: center;
}

.row--head { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.row__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.row__nature, .row__ivs { display: flex; gap: 3px; }
.row__nature .chip, .row__ivs .chip { padding: 4px 7px; }
.row__none { font: 700 12px 'Nunito', sans-serif; color: var(--mu); padding-left: 6px; }
.row__range { width: 100%; accent-color: var(--uA); }

.row__ev {
  width: 100%;
  box-sizing: border-box;
  height: 26px;
  border: 0;
  border-radius: 5px;
  padding: 0 4px;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--chip);
  color: var(--tx);
  font: 600 13px 'Pixelify Sans', sans-serif;
  text-align: right;
}

.row__final { font: 600 17px 'Pixelify Sans', sans-serif; text-align: right; }
.row--head .row__final { font: inherit; }
.up { color: var(--good); }
.down { color: var(--bad); }
.hint { font: 700 11px/1.4 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 640px) {
  .row { grid-template-columns: 52px 54px minmax(0, 1fr) 44px 60px 38px; gap: 4px; }
}
</style>

<template>
  <CodexBlock title="Objet et nature">
    <div class="pair">
      <label class="pair__field">
        <span class="pair__label">Objet</span>
        <select class="pair__select" :value="variant.objetId" @change="event => emit('update', { objetId: (event.target as HTMLSelectElement).value })">
          <option v-if="!findObjet(variant.objetId)" :value="variant.objetId">{{ itemName(variant.objetId) }}</option>
          <optgroup v-for="group in objetGroups" :key="group.label" :label="group.label">
            <option v-for="objet in group.objets" :key="objet.id" :value="objet.id">{{ objet.nom }}</option>
          </optgroup>
        </select>
      </label>
      <label class="pair__field">
        <span class="pair__label">Nature</span>
        <select class="pair__select" :value="variant.natureId" @change="event => emit('update', { natureId: (event.target as HTMLSelectElement).value })">
          <option v-for="nature in NATURES" :key="nature.id" :value="nature.id">{{ natureLabel(nature) }}</option>
        </select>
      </label>
    </div>
    <span v-if="findObjet(variant.objetId)?.description" class="description">{{ findObjet(variant.objetId)!.description }}</span>
  </CodexBlock>

  <CodexBlock title="EV, IV et stats finales">
    <template #aside>Niveau <b class="num">100</b> · stats PokéDraft</template>
    <div class="modes">
      <button v-for="tab in MODES" :key="tab.value" type="button" class="modes__tab" :class="{ 'modes__tab--active': mode === tab.value }" :aria-pressed="mode === tab.value" @click="mode = tab.value">
        {{ tab.label }}
      </button>
    </div>
    <div v-if="mode === 'simple'" class="presets">
      <button
        v-for="preset in EV_PRESETS"
        :key="preset.id"
        type="button"
        class="preset"
        :class="{ 'preset--active': variant.preset === preset.id }"
        :aria-pressed="variant.preset === preset.id"
        @click="emit('update', presetPatch(pokemon, preset.id, variant))"
      >
        <span class="preset__dot" />
        <span class="preset__text">
          <span class="preset__label">{{ preset.label }}</span>
          <span class="preset__detail">{{ preset.detail }}</span>
        </span>
      </button>
    </div>
    <div class="stats">
      <div v-for="stat in stats" :key="stat.id" class="stat">
        <span class="stat__label" :style="{ color: stat.color }">{{ stat.label }} {{ stat.arrow }}</span>
        <input
          v-if="mode === 'avance'"
          type="range"
          class="stat__range"
          min="0"
          :max="MAX_EV"
          step="4"
          :value="stat.ev"
          :aria-label="`EV ${stat.label}`"
          @input="event => setEv(stat.id, Number((event.target as HTMLInputElement).value))"
        >
        <div v-else class="stat__track"><div class="stat__fill" :style="{ width: `${stat.ev / MAX_EV * 100}%` }" /></div>
        <span class="stat__ev">{{ stat.ev }}</span>
        <span class="stat__final">{{ stat.final }}</span>
      </div>
      <div class="total">
        <span class="total__label">EV utilisés</span>
        <div class="total__track"><div class="total__fill" :style="{ width: `${total / MAX_EV_TOTAL * 100}%`, background: totalColor }" /></div>
        <span class="total__value" :style="{ color: totalColor }">{{ total }}/{{ MAX_EV_TOTAL }}</span>
      </div>
    </div>
    <div class="ivs">
      <span class="ivs__title">IV à 31 partout, sauf :</span>
      <label class="iv">
        <input type="checkbox" :checked="variant.ivVit0" @change="emit('update', { ivVit0: !variant.ivVit0 })">
        Vitesse minimale <span class="iv__detail">IV Vit 0 · pour la Distorsion</span>
      </label>
      <label class="iv">
        <input type="checkbox" :checked="variant.ivAtq0" @change="emit('update', { ivAtq0: !variant.ivAtq0 })">
        Attaque minimale <span class="iv__detail">IV Atq 0 · réduit les dégâts de la confusion</span>
      </label>
    </div>
  </CodexBlock>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { StatId } from '~/utils/showdownTeam'
import type { Variante } from '~/utils/atelier'

const MODES = [{ value: 'simple', label: 'Simple' }, { value: 'avance', label: 'Avancé' }] as const

const props = defineProps<{ pokemon: Pokemon, variant: Variante }>()
const emit = defineEmits<{ update: [patch: Partial<Variante>] }>()
const mode = ref<'simple' | 'avance'>('simple')

const objetGroups = computed(() => [...new Set(OBJETS.map(objet => objet.groupe))]
  .map(label => ({ label, objets: OBJETS.filter(objet => objet.groupe === label) })))

const total = computed(() => evTotal(props.variant.evs))
const totalColor = computed(() => total.value === MAX_EV_TOTAL ? '#58d080' : 'var(--uA)')

const stats = computed(() => {
  const nature = findNature(props.variant.natureId)
  return STATS.map((stat) => {
    const up = nature?.plus === stat.id
    const down = nature?.moins === stat.id
    return {
      ...stat,
      ev: props.variant.evs[stat.id],
      final: finalStat(props.pokemon, props.variant, stat.id),
      arrow: up ? '▲' : down ? '▼' : '',
      color: up ? '#58d080' : down ? '#ff8a7a' : 'var(--mu)',
    }
  })
})

const setEv = (stat: StatId, value: number) => {
  const others = total.value - props.variant.evs[stat]
  const ev = Math.max(0, Math.min(value, MAX_EV, MAX_EV_TOTAL - others))
  emit('update', { evs: { ...props.variant.evs, [stat]: ev - (ev % 4) }, preset: null })
}
</script>

<style scoped>
.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pair__field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.pair__label { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.pair__select {
  height: 36px;
  min-width: 0;
  border: 0;
  border-radius: 7px;
  padding: 0 8px;
  font-weight: 700;
  font-size: 13px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
}

.description { font: 400 13px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.num { font: 600 13px 'Pixelify Sans', sans-serif; }

.modes {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 9px;
  background: var(--dk);
  align-self: flex-start;
}

.modes__tab {
  border: 0;
  cursor: pointer;
  height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  background: transparent;
  color: var(--mu);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.modes__tab--active { background: var(--uA); color: var(--uAtx); }

.presets {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset {
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  box-shadow: inset 0 0 0 2px var(--chip);
  color: var(--tx);
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset--active { background: var(--in); box-shadow: inset 0 0 0 2px var(--uA); }

.preset__dot {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px var(--mu);
}

.preset--active .preset__dot { background: var(--uA); }

.preset__text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preset__label { font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.preset__detail { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) 38px 44px;
  gap: 8px;
  align-items: center;
}

.stat__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; }
.stat__range { width: 100%; accent-color: var(--uA); }

.stat__track {
  height: 10px;
  border-radius: 2px;
  background: var(--in);
  overflow: hidden;
}

.stat__fill { height: 100%; background: var(--uA); }
.stat__ev { font: 600 13px 'Pixelify Sans', sans-serif; color: var(--mu); text-align: right; }
.stat__final { font: 600 17px 'Pixelify Sans', sans-serif; text-align: right; }

.total {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

.total__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.total__track {
  flex: 1;
  height: 8px;
  border-radius: 2px;
  background: var(--in);
  overflow: hidden;
}

.total__fill { height: 100%; }
.total__value { font: 600 14px 'Pixelify Sans', sans-serif; }

.ivs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 2px solid var(--chip);
}

.ivs__title { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.iv {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
}

.iv input { width: 18px; height: 18px; accent-color: var(--uA); }
.iv__detail { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
</style>

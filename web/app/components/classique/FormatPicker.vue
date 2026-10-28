<template>
  <div class="picker">
    <div v-if="!compact" class="picker__chips" role="radiogroup" aria-label="Formats courants">
      <button
        v-for="format in popular"
        :key="format.id"
        type="button"
        role="radio"
        class="chip"
        :class="{ 'chip--on': format.id === modelValue }"
        :aria-checked="format.id === modelValue"
        @click="emit('update:modelValue', format.id)"
      >
        {{ formatLabel(format.name) }}
      </button>
    </div>
    <label class="picker__all">
      <span class="picker__label" :class="{ 'picker__label--hidden': compact }">{{ compact ? 'Format' : 'Tous les formats' }}</span>
      <select class="field picker__select" :value="modelValue" @change="event => emit('update:modelValue', (event.target as HTMLSelectElement).value)">
        <option v-if="!sections.length" value="" disabled>Connecte-toi au serveur de combat pour voir les formats</option>
        <option v-if="compact && !selected" :value="modelValue">{{ formatIdLabel(modelValue) }}</option>
        <optgroup v-for="section in sections" :key="section.name" :label="sectionLabel(section.name)">
          <option v-for="format in section.formats" :key="format.id" :value="format.id">{{ format.name }}</option>
        </optgroup>
      </select>
    </label>
    <span v-if="selected && !compact" class="picker__info">
      {{ gameTypeLabel(selected.gameType) }} · {{ selected.generatedTeam ? 'équipe fournie par le serveur' : 'avec ton équipe' }}<template v-if="selected.level50"> · niveau 50</template><template v-if="selected.bestOf"> · au meilleur des 3 possible</template>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { BattleFormat, FormatSection } from '~/utils/formats'

/** `compact` : la liste seule, sans raccourcis, et sans remplacer un format absent du serveur (celui d'une équipe déjà faite). */
const props = defineProps<{ modelValue: string, usage: 'ladder' | 'challenge' | 'team' | 'tournament', compact?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [format: string] }>()

/** Formats proposés en raccourci, s'ils existent sur le serveur ; le VGC prend le règlement en cours. */
const POPULAR = ['gen9randombattle', 'gen9ou', 'gen9ubers', 'gen9uu', 'gen9doublesou', 'gen9vgc', 'gen9monotype', 'gen9nationaldex', 'gen9randomdoublesbattle', 'gen9lc']

const { store } = useShowdown()

/** Formats jouables selon l'usage ; pour préparer une équipe, ceux où elle n'est pas fournie par le serveur. */
const usable = (format: BattleFormat) => {
  if (props.usage === 'team') return format.challenge && !format.generatedTeam
  if (props.usage === 'tournament') return format.tournament
  return props.usage === 'ladder' ? format.ladder : format.challenge
}

/** Sans serveur de combat, l'Atelier propose les formats dont on a les statistiques Smogon, rangés par génération. */
const offline = computed<FormatSection[]>(() => {
  if (props.usage !== 'team' || store.formats.length) return []
  const byGen = new Map<string, BattleFormat[]>()
  for (const id of usageFormatIds()) {
    const section = `Gen ${/^gen(\d)/.exec(id)?.[1] ?? '?'}`
    const doubles = /doubles|vgc|battlestadium/.test(id)
    const format: BattleFormat = {
      id, name: formatIdLabel(id), section, generatedTeam: false, ladder: false, challenge: true, tournament: false,
      level50: /vgc|battlestadium/.test(id), bestOf: false, gameType: doubles ? 'doubles' : 'singles',
    }
    byGen.set(section, [...(byGen.get(section) ?? []), format])
  }
  return [...byGen].sort(([a], [b]) => b.localeCompare(a)).map(([name, formats]) => ({ name, column: 1, formats }))
})

const sections = computed(() => (store.formats.length ? store.formats : offline.value)
  .map(section => ({ ...section, formats: section.formats.filter(usable) }))
  .filter(section => section.formats.length))
const all = computed(() => sections.value.flatMap(section => section.formats))
const latestVgc = computed(() => all.value.filter(format => /^gen9vgc\d/.test(format.id)).sort((a, b) => b.id.localeCompare(a.id))[0])
const popular = computed(() => POPULAR
  .map(id => all.value.find(format => format.id === id) ?? (id === 'gen9vgc' ? latestVgc.value : undefined))
  .filter((format): format is BattleFormat => Boolean(format)))
const selected = computed(() => all.value.find(format => format.id === props.modelValue))

watch(all, (formats) => {
  if (props.compact) return
  if (formats.length && !formats.some(format => format.id === props.modelValue)) emit('update:modelValue', popular.value[0]?.id ?? formats[0]!.id)
}, { immediate: true })
</script>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.picker__chips { display: flex; flex-wrap: wrap; gap: 6px; }

.chip {
  border: 0;
  cursor: pointer;
  height: 34px;
  padding: 0 12px;
  border-radius: 7px;
  background: var(--chip);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--bd);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.chip--on { background: var(--hd); color: var(--hdTx); }
.picker__all { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.picker__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.picker__label--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.picker__select { flex: 1; min-width: 220px; }
.picker__info { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
</style>

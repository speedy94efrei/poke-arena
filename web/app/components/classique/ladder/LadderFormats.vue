<template>
  <section class="formats" aria-label="Formats classés">
    <div v-for="group in groups" :key="group.label" class="formats__group">
      <span class="formats__label">{{ group.label }}</span>
      <div class="formats__chips" role="radiogroup" :aria-label="group.label">
        <button
          v-for="format in group.formats"
          :key="format.id"
          type="button"
          role="radio"
          class="chip"
          :class="{ 'chip--on': format.id === modelValue }"
          :aria-checked="format.id === modelValue"
          @click="emit('update:modelValue', format.id)"
        >
          {{ short(format) }}<span v-if="ratings[format.id]" class="chip__elo">{{ Math.round(ratings[format.id]!.elo) }}</span>
        </button>
      </div>
    </div>
    <div class="formats__group">
      <span class="formats__label">Tous les ladders</span>
      <ClassiqueFormatPicker class="formats__all" :model-value="modelValue" usage="ladder" compact @update:model-value="value => emit('update:modelValue', value)" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BattleFormat } from '~/utils/formats'
import type { EloRow } from '~/utils/ladder'

defineProps<{ modelValue: string, ratings: Record<string, EloRow> }>()
const emit = defineEmits<{ 'update:modelValue': [format: string] }>()
const { store } = useShowdown()

const GROUPS = [
  { label: 'Gen 9 · simples', ids: ['gen9ou', 'gen9uu', 'gen9ru', 'gen9nu', 'gen9pu', 'gen9zu', 'gen9ubers', 'gen9lc', 'gen9monotype', 'gen9nationaldex', 'gen9randombattle'] },
  { label: 'Gen 9 · doubles', ids: ['gen9vgc', 'gen9doublesou', 'gen9randomdoublesbattle'] },
  { label: 'Anciennes gens', ids: ['gen8ou', 'gen7ou', 'gen6ou', 'gen5ou', 'gen4ou', 'gen3ou', 'gen2ou', 'gen1ou'] },
]

const ladders = computed(() => store.formats.flatMap(section => section.formats).filter(format => format.ladder))

/** Raccourcis des ladders les plus joués qui existent sur le serveur ; le VGC prend le règlement en cours. */
const groups = computed(() => GROUPS.map(group => ({
  label: group.label,
  formats: group.ids
    .map(id => id === 'gen9vgc'
      ? ladders.value.filter(format => /^gen9vgc\d/.test(format.id)).sort((a, b) => b.id.localeCompare(a.id))[0]
      : ladders.value.find(format => format.id === id))
    .filter((format): format is BattleFormat => Boolean(format)),
})).filter(group => group.formats.length))

const short = (format: BattleFormat) => {
  const label = formatLabel(format.name)
  return format.id.startsWith('gen9') ? label.split(' · ')[0] : label.replace(/^(.+) · Gen (\d+).*$/, 'Gen $2 $1')
}
</script>

<style scoped>
.formats { padding: 10px 12px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 8px; }
.formats__group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.formats__label { width: 110px; flex: none; font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.formats__chips { flex: 1; display: flex; flex-wrap: wrap; gap: 5px; }
.formats__all { flex: 1; max-width: 420px; }

.chip {
  border: 0;
  cursor: pointer;
  height: 30px;
  padding: 0 10px;
  border-radius: 15px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chip--on { background: var(--sel); color: var(--selTx); }
.chip__elo { font: 600 11px 'Pixelify Sans', sans-serif; opacity: .8; }

@media (max-width: 640px) {
  .formats__label { width: 100%; }
}
</style>

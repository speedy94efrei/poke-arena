<template>
  <label class="usage-format">
    <span class="usage-format__label">Format</span>
    <select class="field usage-format__select" :value="modelValue" @change="event => emit('update:modelValue', (event.target as HTMLSelectElement).value)">
      <optgroup v-for="group in groups" :key="group.gen" :label="`Génération ${group.gen}`">
        <option v-for="id in group.ids" :key="id" :value="id">{{ formatIdLabel(id) }}</option>
      </optgroup>
    </select>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [format: string] }>()

/** Formats dont on a les statistiques Smogon, de la génération la plus récente à la plus ancienne. */
const groups = computed(() => {
  const byGen = new Map<string, string[]>()
  for (const id of usageFormatIds().sort()) {
    const gen = /^gen(\d)/.exec(id)?.[1] ?? '?'
    byGen.set(gen, [...(byGen.get(gen) ?? []), id])
  }
  return [...byGen].sort(([a], [b]) => b.localeCompare(a)).map(([gen, ids]) => ({ gen, ids }))
})
</script>

<style scoped>
.usage-format { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
.usage-format__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.usage-format__select { flex: 1; height: 34px; width: 240px; min-width: 0; max-width: 100%; }
</style>

<template>
  <div class="tabs" role="tablist" aria-label="Mes équipes">
    <button
      v-for="team in teams"
      :key="team.id"
      type="button"
      role="tab"
      class="tab"
      :class="{ 'tab--on': team.id === currentId }"
      :aria-selected="team.id === currentId"
      @click="emit('select', team.id)"
    >
      <span class="tab__head">
        <span class="tab__name">{{ team.name }}</span>
        <span class="tab__format">{{ shortFormat(team.format) }}</span>
      </span>
      <span class="tab__icons">
        <span v-for="index in 6" :key="index" class="tab__icon" :style="team.sets[index - 1] ? { backgroundImage: `url(${sprite(team.sets[index - 1]!.species)})` } : undefined" />
      </span>
    </button>
    <button type="button" class="tab tab--new" :aria-pressed="creating" @click="emit('create')">+ Nouvelle équipe</button>
  </div>
</template>

<script setup lang="ts">
import type { ClassicTeam } from '~/utils/classicTeam'

defineProps<{ teams: ClassicTeam[], currentId: string, creating: boolean }>()
const emit = defineEmits<{ select: [id: string], create: [] }>()
const { sprite } = usePokedex()

const shortFormat = (id: string) => formatIdLabel(id).split(' · ')[0]
</script>

<style scoped>
.tabs { display: flex; gap: 8px; overflow-x: auto; padding: 3px 3px 6px; }

.tab {
  flex: none;
  width: 196px;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--r);
  background: var(--pn);
  color: var(--tx);
  box-shadow: var(--pnS);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tab--on { box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 3px var(--bd); }
.tab__head { display: flex; align-items: center; gap: 6px; min-width: 0; }

.tab__name {
  flex: 1;
  min-width: 0;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab__format {
  flex: none;
  max-width: 80px;
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--hd);
  color: var(--hdTx);
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
}

.tab__icons { display: flex; gap: 1px; height: 28px; padding: 0 2px; border-radius: 6px; background: var(--dk); }
.tab__icon { flex: 1; background: center / 36px no-repeat; image-rendering: pixelated; }

.tab--new {
  width: auto;
  min-width: 150px;
  justify-content: center;
  align-items: center;
  background: var(--sel);
  color: var(--selTx);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
}
</style>

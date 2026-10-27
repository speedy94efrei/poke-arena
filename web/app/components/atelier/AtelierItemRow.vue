<template>
  <button
    type="button"
    class="row"
    :class="{ 'row--selected': selected }"
    :aria-pressed="selected"
    :title="objet.description ?? undefined"
    @click="emit('pick', objet.id)"
  >
    <ItemIcon :id="objet.id" :size="28" />
    <span class="row__name">{{ objet.nom }}</span>
    <span class="row__description">{{ objet.description }}</span>
    <span v-if="formats" class="row__smogon">★ {{ formats.join(' · ') }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Objet } from '~/utils/atelier'

defineProps<{ objet: Objet, selected: boolean, formats?: string[] }>()
const emit = defineEmits<{ pick: [id: string] }>()
</script>

<style scoped>
.row {
  flex: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: 28px 130px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--tx);
}

.row:hover, .row:focus-visible { background: var(--chip); }
.row--selected, .row--selected:hover { background: var(--in); box-shadow: inset 0 0 0 2px var(--uA); }
.row__name { font: 700 13px 'Atkinson Hyperlegible', sans-serif; }

.row__description {
  font: 400 12px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row__smogon {
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  background: #2f74a3;
  color: #fff;
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .row { grid-template-columns: 28px minmax(0, 1fr) auto; }
  .row__description { display: none; }
}
</style>

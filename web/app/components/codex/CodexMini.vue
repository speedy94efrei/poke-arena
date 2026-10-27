<template>
  <button type="button" class="mini" :class="`mini--${tone}`" :title="pokemon.nom" @click="emit('open', pokemon.id)">
    <img class="mini__sprite" :src="pokemon.sprite" alt="" loading="lazy">
    <span v-if="!iconOnly" class="mini__name">{{ pokemon.nom }}</span>
    <span v-if="count" class="mini__count">×{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'

withDefaults(defineProps<{ pokemon: Pokemon, tone?: 'neutre' | 'cadre' | 'danger' | 'piege', count?: number, iconOnly?: boolean }>(), { tone: 'neutre', count: 0, iconOnly: false })
const emit = defineEmits<{ open: [id: string] }>()
</script>

<style scoped>
.mini {
  border: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 10px 0 0;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.mini--cadre { background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); }
.mini--danger { background: rgba(200, 54, 42, .22); box-shadow: inset 0 0 0 2px #c8362a; }
.mini--piege { width: 48px; height: 48px; padding: 0; justify-content: center; background: var(--in); box-shadow: inset 0 0 0 2px #705746; }

.mini__sprite {
  width: 36px;
  height: 36px;
  object-fit: contain;
  image-rendering: pixelated;
  flex: none;
}

.mini--piege .mini__sprite { width: 48px; height: 48px; }

.mini__count {
  font: 600 12px 'Pixelify Sans', sans-serif;
  color: var(--mu);
}
</style>

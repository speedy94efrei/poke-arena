<template>
  <span class="type-badge" :class="{ 'type-badge--small': small }" :style="{ background: TYPE_COLORS[type], color: typeTextColor(type) }">
    {{ type }}
  </span>
</template>

<script setup lang="ts">
import type { TypePokemon } from '#data/types/roster'

defineProps<{ type: TypePokemon, small?: boolean }>()
</script>

<style scoped>
.type-badge {
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
}

.type-badge--small {
  height: 18px;
  padding: 0 6px;
}
</style>

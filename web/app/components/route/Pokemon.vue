<template>
  <component :is="selectable ? 'button' : 'div'" :type="selectable ? 'button' : undefined" class="mon" :class="{ 'mon--on': selected, 'mon--dim': dim }" :aria-pressed="selectable ? selected : undefined">
    <span class="mon__art" :style="{ background: habitatBackground(types[0]) }">
      <span v-if="starter" class="mon__tag">Starter</span>
      <span v-if="selected" class="mon__check" aria-hidden="true">✓</span>
      <span class="mon__sprite" :style="{ backgroundImage: `url(${sprite(species, 'face')})` }" />
    </span>
    <span class="mon__body">
      <span class="mon__name">{{ speciesName(species) }}<small v-if="level"> N.{{ level }}</small></span>
      <span class="mon__types"><TypeBadge v-for="type in types" :key="type" :type="type" small /></span>
      <span v-if="text" class="mon__text">{{ text }}</span>
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
const props = defineProps<{ species: string, level?: number, text?: string, selected?: boolean, selectable?: boolean, starter?: boolean, dim?: boolean }>()
const { species: dexSpecies, sprite } = usePokedex()
const types = computed(() => dexSpecies(props.species)?.types ?? [])
</script>

<style scoped>
.mon { padding: 0; border: 0; border-radius: 12px; overflow: hidden; background: var(--pn); box-shadow: var(--pnS), inset 0 0 0 2px var(--bd); color: var(--tx); text-align: left; display: flex; flex-direction: column; font: inherit; }
button.mon { cursor: pointer; }
button.mon:hover, button.mon:focus-visible { box-shadow: var(--pnS), inset 0 0 0 2px var(--sel); }
.mon--on, .mon--on:hover { box-shadow: var(--pnS), inset 0 0 0 3px var(--good) !important; }
.mon--dim { opacity: .55; }
.mon__art { position: relative; height: 92px; display: block; image-rendering: pixelated; }
.mon__sprite { position: absolute; inset: 6px 0 0; background: center bottom / contain no-repeat; image-rendering: pixelated; }
.mon__tag { position: absolute; top: 6px; left: 6px; z-index: 1; padding: 2px 6px; border-radius: 4px; background: #f0b93a; color: #3a2400; font: 800 10px 'Nunito', sans-serif; text-transform: uppercase; }
.mon__check { position: absolute; top: 6px; right: 6px; z-index: 1; width: 22px; height: 22px; border-radius: 50%; background: var(--good); color: #fff; display: grid; place-items: center; font: 800 13px 'Nunito', sans-serif; }
.mon__body { padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 4px; }
.mon__name { font: 600 16px 'Pixelify Sans', sans-serif; }
.mon__name small { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.mon__types { display: flex; gap: 4px; flex-wrap: wrap; }
.mon__text { font: 700 11px/1.35 'Nunito', sans-serif; color: var(--mu); }
</style>

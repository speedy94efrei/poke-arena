<template>
  <span v-if="run" class="chip" :title="`Tentative ${run.attempt}`">
    {{ run.name }} · <b>{{ run.badges }}</b>/8 badges · <b>{{ money(run.money) }}</b>
  </span>
</template>

<script setup lang="ts">
const { run } = useRouteLigues()
</script>

<style scoped>
.chip { height: 34px; padding: 0 12px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); display: flex; align-items: center; gap: 4px; font: 700 13px 'Nunito', sans-serif; white-space: nowrap; }
.chip b { font: 600 16px 'Pixelify Sans', sans-serif; color: var(--good); }
</style>

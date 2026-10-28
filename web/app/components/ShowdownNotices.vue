<template>
  <div class="notices" aria-live="polite">
    <div v-for="notice in store.notices" :key="notice.id" class="notice">{{ notice.text }}</div>
  </div>
</template>

<script setup lang="ts">
const { store } = useShowdown()
</script>

<style scoped>
.notices { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 100; max-width: min(420px, calc(100vw - 40px)); }

.notice {
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--pn2);
  box-shadow: var(--pnS), 0 12px 30px rgba(0, 0, 0, .45);
  font: 700 14px/1.4 'Atkinson Hyperlegible', sans-serif;
  white-space: pre-line;
  animation: pop .2s both;
}
</style>

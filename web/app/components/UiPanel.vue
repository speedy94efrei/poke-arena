<template>
  <section class="panel">
    <header v-if="title" class="panel__head">
      <h2 class="panel__title">{{ title }}</h2>
      <span class="panel__aside"><slot name="aside" /></span>
    </header>
    <div class="panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<style scoped>
.panel {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  min-width: 0;
}

.panel__head {
  height: 34px;
  padding: 0 12px;
  background: var(--hd);
  border-radius: var(--r) var(--r) 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--hdTx);
}

.panel__title {
  margin: 0;
  flex: 1;
  font: 700 16px 'Pixelify Sans', sans-serif;
}

.panel__aside { font: 700 12px 'Nunito', sans-serif; }

.panel__body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>

<template>
  <section class="block">
    <header class="block__head">
      <span class="block__title">{{ title }}</span>
      <span class="block__aside"><slot name="aside" /></span>
    </header>
    <div class="block__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped>
.block {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  overflow: hidden;
}

.block__head {
  min-height: 30px;
  padding: 4px 12px;
  box-sizing: border-box;
  background: var(--hd);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 8px;
  color: var(--hdTx);
}

.block__title {
  flex: 1 0 auto;
  white-space: nowrap;
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
}

.block__aside {
  display: flex;
  align-items: center;
  gap: 6px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
}

.block__aside :deep(.tag) {
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  background: rgba(0, 0, 0, .3);
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.block__body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>

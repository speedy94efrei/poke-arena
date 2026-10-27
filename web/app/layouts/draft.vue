<template>
  <div class="draft-layout">
    <slot />
  </div>
</template>

<style scoped>
.draft-layout {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 12px;
  background: var(--pg);
  color: var(--tx);
}
</style>

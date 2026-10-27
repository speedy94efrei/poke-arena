<template>
  <div class="battle-layout">
    <slot />
  </div>
</template>

<style scoped>
.battle-layout {
  height: 100vh;
  min-height: 680px;
  min-width: 1180px;
  box-sizing: border-box;
  padding: 10px;
  background: var(--pg);
  color: var(--tx);
  overflow: hidden;
}
</style>

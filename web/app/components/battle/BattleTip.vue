<template>
  <div class="tip" :class="[`tip--${placement}`, `tip--${align}`]" role="tooltip">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ placement?: 'above' | 'right' | 'below', align?: 'start' | 'end' }>(), { placement: 'above', align: 'start' })
</script>

<style scoped>
.tip {
  position: absolute;
  z-index: 60;
  width: max-content;
  max-width: 340px;
  min-width: 220px;
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--pn2);
  color: var(--tx);
  box-shadow: var(--pnS), 0 16px 30px rgba(0, 0, 0, .5);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font: 700 12px/1.4 'Nunito', sans-serif;
  text-align: left;
  white-space: normal;
  animation: pop .15s both;
  pointer-events: none;
  cursor: default;
}

.tip--above { bottom: calc(100% + 10px); }
.tip--below { top: calc(100% + 8px); }
.tip--right { left: calc(100% + 10px); top: -10px; }
.tip--above.tip--start, .tip--below.tip--start { left: 0; }
.tip--above.tip--end, .tip--below.tip--end { right: 0; }
</style>

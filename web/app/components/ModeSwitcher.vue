<template>
  <nav aria-label="Changer de mode" class="modes">
    <NuxtLink
      v-for="mode in MODES"
      :key="mode.id"
      :to="mode.to"
      class="modes__link"
      :class="{ 'modes__link--active': mode.id === current }"
      :style="{ '--dot': mode.dot }"
      :aria-current="mode.id === current ? 'page' : undefined"
      :title="mode.soon ? `${mode.name} · bientôt` : mode.name"
    >
      <span class="modes__dot" />{{ mode.short }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const current = computed(() => universeOf(route.path))
</script>

<style scoped>
.modes {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--r);
  background: var(--in);
  box-shadow: var(--pnS);
  overflow-x: auto;
}

.modes__link {
  flex: none;
  height: 38px;
  padding: 0 11px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--mu);
  font: 700 14px 'Nunito', sans-serif;
  white-space: nowrap;
}

.modes__link:hover { background: var(--chip); color: var(--tx); text-decoration: none; }
.modes__link--active, .modes__link--active:hover { background: var(--dot); color: #0a0e14; }
.modes__dot { width: 9px; height: 9px; border-radius: 50%; background: var(--dot); }
.modes__link--active .modes__dot { background: #0a0e14; }
</style>

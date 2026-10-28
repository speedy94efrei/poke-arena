<template>
  <nav :aria-label="`Menu ${mode?.name ?? ''}`" class="tabs" :style="{ '--dot': mode?.dot }">
    <template v-for="item in items" :key="item.label">
      <NuxtLink
        v-if="item.to"
        :to="item.to"
        class="tabs__link"
        :class="{ 'tabs__link--active': item.to === active }"
        :aria-current="item.to === active ? 'page' : undefined"
      >
        {{ item.label }}
      </NuxtLink>
      <span v-else class="tabs__link tabs__link--soon" title="Bientôt">{{ item.label }}<small>bientôt</small></span>
    </template>
    <span class="tabs__spacer" />
    <slot />
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const universe = computed(() => universeOf(route.path) ?? 'budget')
const mode = computed(() => modeOf(universe.value))
const items = computed(() => NAVIGATION[universe.value])
/** L'onglet le plus précis qui correspond à la page. */
const active = computed(() => items.value.map(item => item.to).filter(to => to && (route.path === to || route.path.startsWith(`${to}/`))).sort((a, b) => b!.length - a!.length)[0])
</script>

<style scoped>
.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  overflow-x: auto;
}

.tabs__link {
  flex: none;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--tx);
  font: 700 14px 'Nunito', sans-serif;
  white-space: nowrap;
}

.tabs__link:hover { background: var(--chip); text-decoration: none; }
.tabs__link--active, .tabs__link--active:hover { background: var(--dot); color: #0a0e14; }
.tabs__link--soon { opacity: .55; cursor: default; }
.tabs__link--soon:hover { background: none; }
.tabs__link small { font: 700 10px 'Nunito', sans-serif; color: var(--mu); text-transform: uppercase; }
.tabs__spacer { flex: 1; }
</style>

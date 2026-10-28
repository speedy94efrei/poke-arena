<template>
  <header class="topbar">
    <AppLogo />
    <nav aria-label="Univers" class="topbar__universes">
      <NuxtLink to="/classique" class="topbar__universe" :class="{ 'topbar__universe--active': universe === 'classique' }" :aria-current="universe === 'classique' ? 'page' : undefined">
        <span class="topbar__dot topbar__dot--classique" />Classique · Smogon
      </NuxtLink>
      <NuxtLink to="/pokedraft" class="topbar__universe" :class="{ 'topbar__universe--active': universe === 'pokedraft' }" :aria-current="universe === 'pokedraft' ? 'page' : undefined">
        <span class="topbar__dot topbar__dot--pokedraft" />PokéDraft · Saison {{ roster.saison }}
      </NuxtLink>
    </nav>
    <span class="topbar__spacer" />
    <AccountMenu />
  </header>
</template>

<script setup lang="ts">
const route = useRoute()
const universe = computed(() => universeOf(route.path))
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 52px;
}

.topbar__universes {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--r);
  background: var(--dk);
  box-shadow: var(--pnS);
}

.topbar__universe {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--mu);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
}

.topbar__universe:hover { color: var(--tx); }

.topbar__universe--active {
  background: var(--uA);
  color: var(--uAtx);
}

.topbar__dot {
  width: 10px;
  height: 10px;
}

.topbar__dot--classique {
  border-radius: 2px;
  background: #2f74a3;
  box-shadow: 0 0 0 2px #0b0f16;
}

.topbar__dot--pokedraft {
  transform: rotate(45deg);
  background: var(--uAtx);
}

.topbar__spacer { flex: 1; }

</style>

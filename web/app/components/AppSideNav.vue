<template>
  <nav aria-label="Menu PokéDraft" class="sidenav">
    <component
      :is="item.to ? NuxtLink : 'span'"
      v-for="item in items"
      :key="item.label"
      :to="item.to"
      class="sidenav__item"
      :class="{ 'sidenav__item--active': item.to && route.path.startsWith(item.to), 'sidenav__item--soon': !item.to }"
      :title="item.to ? undefined : 'Bientôt'"
    >
      <span class="sidenav__icon" :style="{ background: item.color }">{{ item.icon }}</span>
      <span class="sidenav__label">{{ item.label }}</span>
      <span v-if="!item.to" class="sidenav__soon">bientôt</span>
    </component>
    <div class="sidenav__gen">
      <span class="sidenav__gen-title">Style de l'interface</span>
      <div class="sidenav__gen-tabs">
        <button
          v-for="value in (['4', '5'] as const)"
          :key="value"
          type="button"
          class="sidenav__gen-tab"
          :class="{ 'sidenav__gen-tab--active': gen === value }"
          :aria-pressed="gen === value"
          @click="setGen(value)"
        >
          Gen {{ value }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'

const route = useRoute()
const { gen, setGen } = useGenStyle()

const items = [
  { icon: '◆', label: 'Accueil de saison', color: 'var(--hd)' },
  { icon: 'C', label: 'Codex', color: 'var(--hd)', to: '/pokedraft/codex' },
  { icon: 'A', label: 'Atelier PokéDraft', color: '#5a8a3a' },
  { icon: 'D', label: 'Classé · Draft', color: '#c8362a' },
  { icon: '⚔', label: 'Combat libre et défis', color: '#3d6fc8', to: '/pokedraft/combat' },
  { icon: 'E', label: 'Entraînement', color: '#7a5ab0' },
  { icon: '★', label: 'Classement et saison', color: '#3f8fa3' },
]
</script>

<style scoped>
.sidenav {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidenav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--tx);
  font: 700 15px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
}

.sidenav__item:hover { text-decoration: none; }

.sidenav__item--active {
  background: var(--uA);
  color: var(--uAtx);
}

.sidenav__item--soon { opacity: .55; }

.sidenav__icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: #fff;
  display: grid;
  place-items: center;
  font: 600 14px 'Pixelify Sans', sans-serif;
  flex: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, .25);
}

.sidenav__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidenav__soon {
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
  text-transform: uppercase;
}

.sidenav__gen {
  margin-top: 8px;
  padding: 8px 4px 2px;
  border-top: 2px solid var(--chip);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidenav__gen-title {
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.sidenav__gen-tabs {
  display: flex;
  gap: 4px;
}

.sidenav__gen-tab {
  flex: 1;
  border: 0;
  cursor: pointer;
  height: 30px;
  border-radius: 6px;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  background: var(--chip);
  color: var(--tx);
}

.sidenav__gen-tab--active {
  background: var(--uA);
  color: var(--uAtx);
}
</style>

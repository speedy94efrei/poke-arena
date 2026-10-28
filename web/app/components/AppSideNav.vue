<template>
  <nav :aria-label="universe === 'classique' ? 'Menu Classique' : 'Menu PokéDraft'" class="sidenav">
    <template v-for="item in items" :key="item.label">
      <component
        :is="item.to ? NuxtLink : 'span'"
        :to="item.to"
        class="sidenav__item"
        :class="{ 'sidenav__item--active': !item.children && isActive(item.to), 'sidenav__item--open': item.children && isOpen(item), 'sidenav__item--soon': !item.to }"
        :title="item.to ? undefined : 'Bientôt'"
      >
        <span class="sidenav__icon" :style="{ background: item.color }">{{ item.icon }}</span>
        <span class="sidenav__label">{{ item.label }}</span>
        <span v-if="!item.to" class="sidenav__soon">bientôt</span>
      </component>
      <div v-if="item.children && isOpen(item)" class="sidenav__children">
        <component
          :is="child.to ? NuxtLink : 'span'"
          v-for="child in item.children"
          :key="child.label"
          :to="child.to"
          class="sidenav__child"
          :class="{ 'sidenav__child--active': isActive(child.to), 'sidenav__item--soon': !child.to }"
        >
          {{ child.label }}<span v-if="!child.to" class="sidenav__soon">bientôt</span>
        </component>
      </div>
    </template>
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
import type { NavItem } from '~/utils/navigation'

const route = useRoute()
const { gen, setGen } = useGenStyle()

const universe = computed(() => universeOf(route.path) ?? 'pokedraft')
const items = computed(() => NAVIGATION[universe.value])
const roots = ['/pokedraft', '/classique']

const isActive = (to?: string) => Boolean(to) && (route.path === to || (!roots.includes(to!) && route.path.startsWith(`${to}/`)))
const isOpen = (item: NavItem) => Boolean(item.children?.some(child => isActive(child.to))) || isActive(item.to)
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
.sidenav__item--open { background: var(--in); }

.sidenav__children {
  margin: -2px 0 4px 26px;
  padding-left: 10px;
  border-left: 2px solid var(--chip);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidenav__child {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--tx);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.sidenav__child--active { background: var(--uA); color: var(--uAtx); }

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

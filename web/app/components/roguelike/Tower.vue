<template>
  <section class="tower" aria-label="La tour">
    <header class="tower__head">La tour</header>
    <ol class="tower__list">
      <li v-for="floor in floors" :key="floor.floor" class="floor" :class="[`floor--${floor.state}`, `floor--${floor.kind}`]">
        <span class="floor__num">{{ floor.floor }}</span>
        <span class="floor__icon">{{ floor.state === 'gagne' ? '✓' : floor.kind === 'grosboss' ? '♛' : floor.kind === 'boss' ? '☠' : '⚔' }}</span>
        <span class="floor__text">
          <b>{{ floor.state === 'en-cours' ? 'Étage en cours' : floorTitle(floor) }}</b>
          <span>{{ detail(floor) }}</span>
        </span>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import type { TowerFloor } from '~/utils/roguelike'

const props = defineProps<{ tower: TowerFloor[] }>()

const floors = computed(() => [...props.tower].reverse())

const detail = (floor: TowerFloor) => {
  if (floor.state === 'gagne') {
    const names = floor.species.slice(0, 3).map(species => speciesName(species)).join(', ')
    return floor.kind === 'combat' ? 'Gagné' : `Battu · ${names}${floor.species.length > 3 ? '…' : ''}`
  }
  if (floor.state === 'en-cours') return floorTitle(floor)
  if (floor.rule) return BOSS_RULES[floor.rule]
  return floor.kind === 'combat' ? 'Équipe générée' : 'Équipe complète à thème'
}
</script>

<style scoped>
.tower { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.tower__head {
  height: 32px;
  padding: 0 12px;
  background: #5a34a8;
  color: #fff;
  font: 600 16px 'Pixelify Sans', sans-serif;
  text-shadow: 1px 1px 0 #120a2a;
  display: flex;
  align-items: center;
}

.tower__list { margin: 0; padding: 8px; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.floor { display: grid; grid-template-columns: 26px 26px minmax(0, 1fr); gap: 8px; align-items: center; padding: 6px 8px; border-radius: 8px; background: var(--in); }
.floor--a-venir { opacity: .8; }
.floor--en-cours { background: color-mix(in srgb, #a77bff 25%, var(--in)); box-shadow: inset 0 0 0 2px #a77bff; }
.floor__num { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--mu); text-align: right; }
.floor__icon { width: 24px; height: 24px; border-radius: 6px; background: var(--chip); display: grid; place-items: center; font: 700 13px 'Nunito', sans-serif; }
.floor--gagne .floor__icon { background: var(--good); color: #fff; }
.floor--boss .floor__icon { background: #c8862a; color: #fff; }
.floor--grosboss .floor__icon { background: #c8362a; color: #fff; }
.floor--en-cours .floor__icon { background: #a77bff; color: #120a2a; }
.floor__text { display: flex; flex-direction: column; min-width: 0; font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.floor__text b { font: 700 13px 'Nunito', sans-serif; color: var(--tx); }
.floor__text span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>

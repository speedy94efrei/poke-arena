<template>
  <section class="strip" :aria-label="title">
    <header class="strip__head">
      <span>{{ title }}</span>
      <span class="strip__count">{{ team.length }} / {{ max }}</span>
    </header>
    <div class="strip__list">
      <div v-for="member in team" :key="member.species" class="mon" :style="{ background: card(member.species) }">
        <span class="mon__sprite" :style="{ backgroundImage: `url(${spriteUrl(member.species)})` }" />
        <span class="mon__name">{{ speciesName(member.species) }}</span>
        <span v-if="statusLabel(member.status)" class="mon__status" :style="{ background: STATUS_LABELS[member.status]?.couleur }">{{ statusLabel(member.status) }}</span>
        <ItemIcon v-if="member.item" class="mon__item" :id="member.item" :size="22" :title="itemName(member.item)" />
        <span class="mon__hp">
          <span class="mon__track"><span class="mon__bar" :style="{ width: `${member.hp}%`, background: hpColor(member.hp) }" /></span>
          <span class="mon__pct">{{ member.hp }} %</span>
        </span>
      </div>
      <span v-for="index in Math.max(0, max - team.length)" :key="`vide-${index}`" class="mon mon--empty">Libre</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RogueMember } from '~/utils/roguelike'

defineProps<{ team: RogueMember[], max: number, title: string }>()

const card = (species: string) => `linear-gradient(90deg, rgba(0, 0, 0, .6), rgba(0, 0, 0, .1) 75%), ${habitatBackground(speciesView(species, true).types[0])}`
</script>

<style scoped>
.strip { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.strip__head {
  height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  text-shadow: var(--hdSh);
  font: 600 16px 'Pixelify Sans', sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.strip__count { font: 700 12px 'Nunito', sans-serif; text-shadow: none; }
.strip__list { padding: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }

.mon {
  position: relative;
  height: 74px;
  border-radius: 10px;
  box-shadow: 0 0 0 2px var(--bd);
  color: #fff;
  text-shadow: 1px 1px 0 #000;
  overflow: hidden;
}

.mon--empty { display: grid; place-items: center; background: repeating-linear-gradient(135deg, var(--chip) 0 6px, var(--in) 6px 12px); color: var(--mu); text-shadow: none; font: 700 12px 'Nunito', sans-serif; }
.mon__sprite { position: absolute; right: -2px; top: -6px; width: 60px; height: 60px; background: center / contain no-repeat; image-rendering: pixelated; }
.mon__name { position: absolute; left: 8px; top: 7px; right: 50px; font: 600 14px 'Pixelify Sans', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mon__status { position: absolute; left: 8px; top: 27px; height: 16px; padding: 0 5px; border-radius: 3px; font: 600 10px 'Pixelify Sans', sans-serif; display: flex; align-items: center; }
.mon__item { position: absolute; right: 6px; bottom: 26px; }
.mon__hp { position: absolute; left: 8px; right: 8px; bottom: 8px; display: flex; align-items: center; gap: 6px; }
.mon__track { flex: 1; height: 7px; border-radius: 4px; background: rgba(0, 0, 0, .55); overflow: hidden; }
.mon__bar { display: block; height: 100%; }
.mon__pct { font: 600 12px 'Pixelify Sans', sans-serif; }
</style>

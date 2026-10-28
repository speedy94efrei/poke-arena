<template>
  <section class="doors" aria-label="Choisis ta porte">
    <h2 class="doors__title">Étage {{ run.floor - 1 }} terminé · choisis ta porte</h2>
    <p class="doors__note">Les PV et les statuts restent d'un combat à l'autre. Seul le Centre Pokémon soigne toute l'équipe.</p>
    <div class="doors__list">
      <button v-for="(kind, index) in run.doors ?? []" :key="kind" type="button" class="door" :disabled="pending" @click="act({ type: 'porte', index })">
        <span class="door__arch" :style="{ '--door': DOORS[kind].color }">
          <span class="door__icon">{{ DOORS[kind].icon }}</span>
          <span class="door__tag">{{ DOORS[kind].tag }}</span>
        </span>
        <span class="door__name">{{ DOORS[kind].title }}</span>
        <span class="door__text">{{ DOORS[kind].text }}</span>
      </button>
    </div>
    <p v-if="run.duo" class="doors__note">En coop, le premier de vous deux qui choisit ouvre la porte pour les deux.</p>
  </section>
</template>

<script setup lang="ts">
import type { RoguelikeRun } from '~/utils/roguelike'

defineProps<{ run: RoguelikeRun }>()
const { act, pending } = useRoguelike()
</script>

<style scoped>
.doors { padding: 16px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 10px; }
.doors__title { margin: 0; font: 700 24px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.doors__note { margin: 0; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.doors__list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.door { border: 0; cursor: pointer; padding: 0 0 12px; border-radius: 14px; background: var(--in); color: var(--tx); box-shadow: 0 0 0 2px var(--chip); text-align: left; display: flex; flex-direction: column; gap: 6px; overflow: hidden; transition: transform .12s; }
.door:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 0 0 3px #a77bff; }

.door__arch {
  position: relative;
  height: 170px;
  margin: 12px 12px 4px;
  border-radius: 90px 90px 8px 8px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--door) 85%, #fff), color-mix(in srgb, var(--door) 70%, #000));
  box-shadow: inset 0 0 0 4px rgba(255, 255, 255, .25), 0 0 0 3px var(--bd);
  display: grid;
  place-items: center;
}

.door__icon { font: 700 56px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 3px 3px 0 rgba(0, 0, 0, .35); }
.door__tag { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); height: 22px; padding: 0 10px; border-radius: 5px; background: rgba(0, 0, 0, .55); color: #fff; font: 700 12px 'Nunito', sans-serif; white-space: nowrap; display: flex; align-items: center; }
.door__name { padding: 0 14px; font: 600 20px 'Pixelify Sans', sans-serif; }
.door__text { padding: 0 14px; font: 700 13px/1.4 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 760px) {
  .doors__list { grid-template-columns: minmax(0, 1fr); }
}
</style>

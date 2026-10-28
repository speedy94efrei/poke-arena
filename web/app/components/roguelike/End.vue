<template>
  <section class="end" aria-label="Fin de run">
    <span class="end__kicker">Run terminée · {{ run.duo ? 'coop' : run.mode === 'semaine' ? `défi ${run.seed}` : 'run libre' }}</span>
    <h2 class="end__title">Étage {{ run.floor }}</h2>
    <p class="end__result">{{ run.result?.text }}<template v-if="rank"> · #{{ rank }} du défi de la semaine</template></p>
    <div class="end__stats">
      <span class="stat"><small>Étages</small><b>{{ run.floor }}</b></span>
      <span class="stat"><small>Combats gagnés</small><b>{{ run.wins }}</b></span>
      <span class="stat"><small>Recrutés</small><b>{{ run.players.reduce((sum, player) => sum + player.recruited, 0) }}</b></span>
      <span class="stat"><small>Perdus</small><b>{{ run.players.reduce((sum, player) => sum + player.lost.length, 0) }}</b></span>
      <span class="stat"><small>Tours</small><b>{{ run.turns }}</b></span>
    </div>
    <ol class="timeline">
      <li v-for="(event, index) in run.history" :key="index" class="event">
        <span class="event__icon">{{ event.icon }}</span>
        <span class="event__floor">Ét. {{ event.floor }}</span>
        <span class="event__text">{{ event.text }}</span>
      </li>
    </ol>
    <div class="end__actions">
      <button v-if="run.mode === 'semaine' && !run.duo" type="button" class="btn btn--primary" :disabled="pending" @click="act({ type: 'nouvelle', mode: 'semaine' })">Retenter le défi</button>
      <button type="button" class="btn" :disabled="pending" @click="act({ type: 'nouvelle', mode: 'libre' })">Nouvelle run libre</button>
      <NuxtLink to="/roguelike" class="btn">Accueil du mode</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RoguelikeRun } from '~/utils/roguelike'

const props = defineProps<{ run: RoguelikeRun }>()
const { act, pending, state } = useRoguelike()

const rank = computed(() => {
  const weekly = state.value?.weekly
  if (props.run.mode !== 'semaine' || !weekly || weekly.seed !== props.run.seed) return null
  return (props.run.duo ? weekly.duo : weekly.solo).mine?.rank ?? null
})
</script>

<style scoped>
.end { padding: 18px 20px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 10px; }
.end__kicker { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.end__title { margin: 0; font: 700 40px/1 'Pixelify Sans', sans-serif; color: #7a52c8; text-shadow: var(--sh); }
.end__result { margin: 0; font: 700 15px 'Nunito', sans-serif; }
.end__stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.stat { padding: 8px 10px; border-radius: 8px; background: var(--in); display: flex; flex-direction: column; }
.stat small { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.stat b { font: 600 22px 'Pixelify Sans', sans-serif; }
.timeline { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow: auto; }
.event { display: grid; grid-template-columns: 26px 54px minmax(0, 1fr); gap: 8px; align-items: center; padding: 5px 8px; border-radius: 6px; background: var(--in); font: 700 13px 'Nunito', sans-serif; }
.event__icon { width: 24px; height: 24px; border-radius: 6px; background: var(--chip); display: grid; place-items: center; }
.event__floor { color: var(--mu); }
.end__actions { display: flex; gap: 8px; flex-wrap: wrap; }

@media (max-width: 760px) {
  .end__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>

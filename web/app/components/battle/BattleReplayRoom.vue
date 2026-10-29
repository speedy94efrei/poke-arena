<template>
  <div v-if="battle" class="battle">
    <BattleHeader :battle="battle" replay @leave="emit('leave')" />

    <div class="battle__main">
      <aside class="battle__left" aria-label="Terrain et équipes">
        <BattleField :battle="battle" />
        <div class="battle__left-scroll">
          <BattleOpponentTeam :battle="battle" side="p2" :title="`Équipe de ${battle.sides.p2.name || '…'}`" />
          <BattleOpponentTeam :battle="battle" side="p1" :title="`Équipe de ${battle.sides.p1.name || '…'}`" />
        </div>
      </aside>

      <div class="battle__center">
        <div class="battle__stage">
          <BattleEnd v-if="battle.ended" :battle="battle" :stage="stage" me="" replay />
          <BattleScene :battle="battle" :stage="stage" />
        </div>
        <BattleReplayControls
          v-model:speed="speed"
          :playing="playing"
          :finished="finished"
          :turn="battle.turn"
          :turns="turns"
          @toggle="toggle"
          @previous="previousTurn"
          @next="nextTurn"
          @restart="goToTurn(0)"
          @end="seek(Infinity)"
          @turn="goToTurn"
        />
      </div>

      <BattleLog :battle="battle" />
    </div>
  </div>

  <div v-else class="missing">
    <span class="missing__title">{{ loading ? 'Chargement du replay…' : 'Replay introuvable' }}</span>
    <span v-if="error" class="missing__text">{{ error }}</span>
    <div v-if="!loading" class="missing__actions">
      <button type="button" class="btn" @click="reload">Réessayer</button>
      <NuxtLink to="/replays" class="btn btn--primary">Chercher un replay</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ id: string }>()
const emit = defineEmits<{ leave: [] }>()

const { replay, battle, error, loading, playing, speed, turns, finished, toggle, seek, goToTurn, nextTurn, previousTurn, reload } = useReplay(() => props.id)
const { stage } = useBattleStage(() => `replay-${props.id}`)

provide(BATTLE_CALC, useBattleCalc(computed(() => battle.value ?? undefined)))

useHead({ title: () => replay.value ? `Replay · ${replayTitle(replay.value.players)}` : 'Replay' })
</script>

<style scoped>
.battle {
  height: 100%;
  display: grid;
  grid-template-rows: 52px minmax(0, 1fr);
  gap: 12px;
}

.battle__main {
  display: grid;
  grid-template-columns: 296px minmax(0, 1fr) 336px;
  gap: 12px;
  min-height: 0;
}

.battle__left { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.battle__left-scroll { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 3px; margin: -3px; }
.battle__center { display: flex; flex-direction: column; gap: 12px; min-height: 0; min-width: 0; }
.battle__stage { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; }

.missing { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.missing__title { font: 700 32px 'Pixelify Sans', sans-serif; }
.missing__text { font: 400 15px 'Nunito', sans-serif; color: var(--mu); }
.missing__actions { display: flex; gap: 8px; }

@media (max-width: 1500px) {
  .battle__main { grid-template-columns: 262px minmax(0, 1fr) 290px; }
}
</style>

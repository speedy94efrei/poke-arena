<template>
  <div v-if="battle" class="battle">
    <BattleHeader :battle="battle" @forfeit="forfeit(roomid)" @leave="leaveBattle" />

    <div class="battle__main">
      <aside class="battle__left" aria-label="Terrain et adversaire">
        <BattleField :battle="battle" />
        <BattleOpponentTeam :battle="battle" :side="oppSide" />
        <div class="battle__left-scroll">
          <BattleFoeSet :battle="battle" :side="oppSide" />
          <BattleCoach v-if="coached" :battle="battle" />
        </div>
      </aside>

      <div class="battle__center">
        <div class="battle__stage">
          <BattleEnd v-if="battle.ended" :battle="battle" :stage="stage" :me="store.name" @leave="leaveBattle" />
          <BattleScene :battle="battle" :stage="stage" />
          <BattleTeamPreview v-if="battle.request?.teamPreview" :battle="battle" @choose="choice => choose(roomid, choice)" />
        </div>
        <BattleActions v-if="!battle.ended && battle.mySide" :battle="battle" @choose="choice => choose(roomid, choice)" />
        <div v-else-if="!battle.ended" class="battle__spectator">Tu regardes ce combat en spectateur.</div>
      </div>

      <BattleLog :battle="battle" />
    </div>
  </div>

  <div v-else class="missing">
    <span class="missing__title">Combat introuvable</span>
    <span class="missing__text">La connexion a été perdue (page rechargée ?) ou ce combat est terminé.</span>
    <NuxtLink :to="lobby" class="btn btn--primary">Retour au salon</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { SideId } from '~/utils/battleTracker'

const props = defineProps<{ roomid: string, lobby: string }>()

const { store, choose, forfeit, leave } = useShowdown()
const roomid = computed(() => props.roomid)
const battle = computed(() => store.battles[roomid.value])
const oppSide = computed<SideId>(() => battle.value?.mySide === 'p2' ? 'p1' : 'p2')
/** Combat d'entraînement Classique contre un bot : le coach suit tes décisions. */
const coached = computed(() => Boolean(battle.value?.mySide) && !isPokedraft(battle.value!) && toId(battle.value!.sides[oppSide.value].name).startsWith('botniveau'))
const { stage } = useBattleStage(roomid)

provide(BATTLE_CALC, useBattleCalc(battle))

useHead({ title: () => battle.value ? `Combat · ${battle.value.sides.p1.name} contre ${battle.value.sides.p2.name}` : 'Combat' })
const { record, rate } = useBattleHistory()

watch(() => battle.value?.ended, (ended) => {
  if (ended && battle.value) record(battle.value)
})

watch(() => battle.value && Object.keys(battle.value.ratings).length, () => {
  if (battle.value) rate(battle.value)
})

const leaveBattle = async () => {
  leave(roomid.value)
  await navigateTo(props.lobby)
}
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

.battle__spectator {
  padding: 14px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
  text-align: center;
}

.missing { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.missing__title { font: 700 32px 'Pixelify Sans', sans-serif; }
.missing__text { font: 400 15px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 1500px) {
  .battle__main { grid-template-columns: 262px minmax(0, 1fr) 290px; }
}
</style>

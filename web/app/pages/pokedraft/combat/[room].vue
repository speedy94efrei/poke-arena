<template>
  <div v-if="battle" class="battle">
    <BattleHeader :battle="battle" @forfeit="forfeit(roomid)" @leave="leaveBattle" />

    <div class="battle__main">
      <div class="battle__stage">
        <BattleEnd v-if="battle.ended" :battle="battle" :stage="stage" :me="store.name" @leave="leaveBattle" @replay="replay" />
        <BattleScene :battle="battle" :stage="stage" />
        <BattleTeamPreview v-if="battle.request?.teamPreview" :battle="battle" @choose="choice => choose(roomid, choice)" />
        <div class="battle__turns">
          <span class="battle__turns-label">Tours</span>
          <div class="battle__chips">
            <a v-for="turn in battle.turn" :key="turn" :href="`#tour-${turn}`" class="battle__chip" :class="{ 'battle__chip--now': turn === battle.turn }">{{ turn }}</a>
          </div>
        </div>
      </div>
      <div class="battle__side">
        <BattleOpponentTeam :battle="battle" :side="oppSide" />
        <BattleLog :battle="battle" />
      </div>
    </div>

    <BattleActions v-if="!battle.ended" :battle="battle" @choose="choice => choose(roomid, choice)" />
  </div>

  <div v-else class="missing">
    <span class="missing__title">Combat introuvable</span>
    <span class="missing__text">La connexion a été perdue (page rechargée ?) ou ce combat est terminé.</span>
    <NuxtLink to="/pokedraft/combat" class="btn btn--primary">Retour au salon</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { SideId } from '~/utils/battleTracker'

definePageMeta({ layout: 'battle' })

const route = useRoute()
const roomid = computed(() => String(route.params.room))
const { store, choose, forfeit, leave } = useShowdown()
const battle = computed(() => store.battles[roomid.value])
const oppSide = computed<SideId>(() => battle.value?.mySide === 'p2' ? 'p1' : 'p2')
const { stage } = useBattleStage(roomid)

useHead({ title: () => battle.value ? `Combat · ${battle.value.sides.p1.name} contre ${battle.value.sides.p2.name}` : 'Combat' })

const leaveBattle = async () => {
  leave(roomid.value)
  await navigateTo('/pokedraft/combat')
}

const replay = async (bot: string) => {
  leave(roomid.value)
  await navigateTo(`/pokedraft/entrainement?bot=${bot}`)
}
</script>

<style scoped>
.battle {
  height: 100%;
  display: grid;
  grid-template-rows: 52px minmax(0, 1fr) auto;
  gap: 10px;
}

.battle__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 316px;
  gap: 10px;
  min-height: 0;
}

.battle__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
}

.battle__turns {
  flex: none;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
}

.battle__turns-label {
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.battle__chips {
  flex: 1;
  display: flex;
  gap: 3px;
  overflow-x: auto;
}

.battle__chip {
  flex: none;
  min-width: 30px;
  height: 30px;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  display: grid;
  place-items: center;
  font: 700 13px 'Pixelify Sans', sans-serif;
}

.battle__chip:hover { text-decoration: none; background: var(--pn2); }

.battle__chip--now {
  background: var(--sel);
  color: var(--selTx);
}

.battle__side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 3px;
}

.missing {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.missing__title { font: 700 32px 'Pixelify Sans', sans-serif; }
.missing__text { font: 400 15px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
</style>

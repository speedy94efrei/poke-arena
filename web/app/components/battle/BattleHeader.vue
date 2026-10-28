<template>
  <header class="header">
    <AppLogo header />
    <div class="header__box">
      <span class="header__pair"><span class="header__label">FORMAT</span><span class="header__value">PokéDraft · Saison {{ roster.saison }}</span></span>
      <span class="header__sep" />
      <span class="header__pair"><span class="header__label">TOUR</span><span class="header__turn">{{ battle.turn || '—' }}</span></span>
    </div>
    <div class="header__box">
      <span class="header__mode">{{ mode }}</span>
      <span class="header__players">{{ battle.sides.p1.name || '…' }} contre {{ battle.sides.p2.name || '…' }}</span>
    </div>
    <span class="header__spacer" />
    <label class="header__box header__decor">
      <span class="header__label">DÉCOR</span>
      <select v-model="choice" class="header__select">
        <option v-for="option in options" :key="option.id" :value="option.id">{{ option.nom }}</option>
      </select>
    </label>
    <button v-if="!battle.ended && battle.mySide" type="button" class="btn btn--danger" @click="emit('forfeit')">Abandonner</button>
    <button v-else type="button" class="btn" @click="emit('leave')">Retour au salon</button>
  </header>
</template>

<script setup lang="ts">
import type { BattleState } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState }>()
const { store: draftStore } = useDraft()
const { botNamed } = useTraining()

const mode = computed(() => {
  const roomid = props.battle.roomid
  const training = [props.battle.sides.p1.name, props.battle.sides.p2.name].some(name => botNamed(name))
  if (draftStore.rankedBattles.includes(roomid)) return 'Classé · Draft'
  if (draftStore.battles.includes(roomid)) return training ? 'Entraînement · Draft' : 'Draft amical'
  return training ? 'Entraînement' : 'Combat libre'
})
const emit = defineEmits<{ forfeit: [], leave: [] }>()
const { choice, options } = useBattleStage(() => props.battle.roomid)
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header__box {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 14px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  flex: none;
}

.header__pair {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}

.header__label {
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.header__value { font: 700 15px 'Atkinson Hyperlegible', sans-serif; }
.header__turn { font: 700 20px 'Pixelify Sans', sans-serif; }

.header__sep {
  width: 2px;
  height: 28px;
  background: var(--chip);
}

.header__mode {
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  background: #3d6fc8;
  color: #fff;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.header__players { font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.header__spacer { flex: 1; }
.header__decor { gap: 8px; }

.header__select {
  height: 32px;
  border: 0;
  border-radius: 7px;
  padding: 0 8px;
  font-weight: 700;
  font-size: 13px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  outline: none;
  max-width: 200px;
}
</style>

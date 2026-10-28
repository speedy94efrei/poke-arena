<template>
  <div class="end" :style="{ backgroundImage: `linear-gradient(90deg, rgba(8, 12, 20, .9), rgba(8, 12, 20, .35)), url(${stage.decor}), url(${FALLBACK_DECOR})` }">
    <div class="end__text">
      <span class="end__title">{{ title }}</span>
      <span class="end__sub">{{ subtitle }}</span>
      <span v-if="ranked" class="end__ranked" :class="ranked.points_delta >= 0 ? 'end__ranked--up' : 'end__ranked--down'">
        Classé : {{ ranked.points_delta >= 0 ? '+' : '−' }}{{ Math.abs(ranked.points_delta) }} PL<template v-if="ranked.note"> · {{ ranked.note }}</template>
      </span>
      <div class="end__buttons">
        <button type="button" class="btn btn--primary" @click="emit('leave')">Retour au salon</button>
        <button v-if="opponentBot" type="button" class="btn" @click="emit('replay', opponentBot.key)">↻ Rejouer contre ce bot</button>
      </div>
    </div>
    <div class="end__team">
      <span v-for="member in survivors" :key="member.name" class="end__sprite" :style="{ backgroundImage: `url(${spriteUrl(member.speciesId)})` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattleState } from '~/utils/battleTracker'
import type { Stage } from '~/utils/stages'

const props = defineProps<{ battle: BattleState, stage: Stage, me: string }>()
const emit = defineEmits<{ leave: [], replay: [bot: string] }>()
const { store: draft } = useDraft()
const { refresh } = useAccount()
const { botNamed } = useTraining()

const opponentBot = computed(() => botNamed(props.battle.sides[props.battle.mySide === 'p2' ? 'p1' : 'p2'].name))

const ranked = computed(() => draft.results[props.battle.roomid])
watch(ranked, (result) => {
  if (result) refresh()
}, { immediate: true })

const won = computed(() => toId(props.battle.winner) === toId(props.me))
const winnerSide = computed(() => (['p1', 'p2'] as const).find(side => toId(props.battle.sides[side].name) === toId(props.battle.winner)))
const survivors = computed(() => winnerSide.value ? props.battle.sides[winnerSide.value].team.filter(p => !p.fainted) : [])
const title = computed(() => !props.battle.winner ? 'Égalité' : won.value ? 'Victoire !' : 'Défaite…')
const subtitle = computed(() => {
  const remaining = survivors.value.length
  return `${props.battle.winner || 'Personne'} gagne en ${props.battle.turn} tour${props.battle.turn > 1 ? 's' : ''} ·${remaining} Pokémon debout`
})
</script>

<style scoped>
.end__ranked {
  align-self: flex-start;
  height: 26px;
  padding: 0 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  animation: pop .3s both;
}

.end__ranked--up { background: #2f6a48; color: #e8fff0; }
.end__ranked--down { background: #8a2a1c; color: #ffe8e0; }

.end {
  position: relative;
  flex: none;
  border-radius: var(--r);
  overflow: hidden;
  background-position: center;
  background-size: cover;
  image-rendering: pixelated;
  box-shadow: var(--pnS);
  padding: 22px 26px;
  display: flex;
  align-items: flex-end;
  gap: 20px;
  color: #fff;
  animation: pop .4s both;
}

.end__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.end__title { font: 700 44px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 #000; }
.end__sub { font: 700 15px 'Atkinson Hyperlegible', sans-serif; }

.end__buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.end__team {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.end__sprite {
  width: 92px;
  height: 92px;
  background: center/contain no-repeat;
  image-rendering: pixelated;
}
</style>

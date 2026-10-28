<template>
  <div class="banner">
    <div aria-label="Tes bans" class="bans">
      <div v-for="slot in mySlots" :key="slot.key" class="ban" :class="`ban--${slot.state}`" :title="slot.title">
        <img v-if="slot.sprite" class="ban__sprite" :src="slot.sprite" alt="">
        <span class="ban__label">{{ slot.label }}</span>
      </div>
    </div>
    <div class="center">
      <div v-if="draft.phase !== 'done'" class="timer" :class="{ 'timer--urgent': urgent }" aria-label="Chrono">
        <span class="timer__label">{{ timerLabel }}</span>
        <span class="timer__value">{{ draft.phase === 'reveal' ? '…' : clock(seconds) }}</span>
      </div>
      <div v-if="draft.phase !== 'done'" class="bar" :class="{ 'bar--urgent': urgent }"><div class="bar__fill" :style="{ width: `${barWidth}%` }" /></div>
      <span class="center__title">{{ title }}</span>
      <span class="center__sub">{{ sub }}</span>
    </div>
    <div aria-label="Bans adverses" class="bans bans--theirs">
      <div v-for="slot in theirSlots" :key="slot.key" class="ban" :class="`ban--${slot.state}`" :title="slot.title">
        <img v-if="slot.sprite" class="ban__sprite" :src="slot.sprite" alt="">
        <span class="ban__label">{{ slot.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DraftView } from '~/utils/draft'

const props = defineProps<{ draft: DraftView, seconds: number }>()

const revealed = computed(() => props.draft.phase !== 'ban')
const urgent = computed(() => props.seconds <= 10 && ['ban', 'pick', 'prep'].includes(props.draft.phase))
const myTurn = computed(() => Boolean(props.draft.turn?.mine))

const slots = (ids: string[], lost: number, mine: boolean) => Array.from({ length: DRAFT.bans }, (_, index) => {
  const id = ids[index]
  const pokemon = id ? findPokemon(id) : undefined
  if (pokemon && (mine || revealed.value)) {
    return { key: index, state: revealed.value ? 'banned' : 'chosen', sprite: pokemon.sprite, label: revealed.value ? 'BANNI' : `BAN ${index + 1}`, title: `${pokemon.nom} ${revealed.value ? 'banni' : 'sélectionné'}` }
  }
  if (!mine && !revealed.value) {
    return { key: index, state: 'hidden', sprite: '', label: props.draft.locked.theirs ? '✓' : '?', title: props.draft.locked.theirs ? 'Bans adverses verrouillés' : 'Ban caché' }
  }
  if (revealed.value && index >= DRAFT.bans - lost) return { key: index, state: 'lost', sprite: '', label: 'Ban perdu', title: 'Ban non utilisé' }
  return { key: index, state: 'free', sprite: '', label: `Ban ${index + 1}`, title: 'Ban libre' }
})

const mySlots = computed(() => slots(props.draft.bans.mine, props.draft.lostBans.mine, true))
const theirSlots = computed(() => slots(props.draft.bans.theirs, props.draft.lostBans.theirs, false))

const timerLabel = computed(() => ({ ban: 'Bans', reveal: 'Révélation', pick: myTurn.value ? 'Ton tour' : 'Adversaire', prep: 'Préparation', done: '', cancelled: '' })[props.draft.phase])

const barWidth = computed(() => {
  if (props.draft.phase === 'reveal') return 100
  const max = props.draft.phase === 'prep' ? DRAFT.seconds.prep : DRAFT.seconds.pick
  return Math.max(0, Math.min(100, props.seconds / max * 100))
})

const title = computed(() => {
  const draft = props.draft
  if (draft.phase === 'ban') return draft.locked.mine ? 'Bans verrouillés · en attente de l\'adversaire' : `Bans · choisis jusqu'à ${DRAFT.bans} Pokémon`
  if (draft.phase === 'reveal') return 'Révélation des bans'
  if (draft.phase === 'pick') return myTurn.value ? `À toi · choisis ${draft.turn!.count - draft.turn!.done} Pokémon` : 'Tour de l\'adversaire…'
  if (draft.phase === 'prep') return 'Préparation'
  return 'Draft terminé'
})

const sub = computed(() => {
  const draft = props.draft
  if (draft.phase === 'ban') return 'Bans simultanés et cachés, révélés ensemble. Un ban non choisi à la fin du chrono est perdu.'
  if (draft.phase === 'reveal') return 'Les deux joueurs ont banni en même temps.'
  if (draft.phase === 'pick') return `Pick ${Math.min(DRAFT.team * 2, draft.picks.length + 1)}/${DRAFT.team * 2} · ordre en serpent 1-2-2-2-2-2-1. Chrono écoulé : ta présélection est verrouillée, sinon pick aléatoire.`
  if (draft.phase === 'prep') return 'Choisis un de tes sets ou modifie-le : objet, nature, EV et attaques.'
  return 'Le combat se lance : les sets adverses restent cachés jusque-là.'
})
</script>

<style scoped>
.banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
}

.bans { display: flex; gap: 6px; }
.bans--theirs { justify-content: flex-end; }

.ban {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--chip);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.ban--chosen { box-shadow: inset 0 0 0 3px #e8604a; }
.ban--banned { box-shadow: inset 0 0 0 2px #c8362a; animation: flip .4s both; }
.ban--lost { box-shadow: inset 0 0 0 2px #e8604a; background: repeating-linear-gradient(135deg, rgba(232, 96, 74, .18) 0 4px, transparent 4px 8px); }

.ban__sprite {
  width: 60px;
  height: 60px;
  object-fit: contain;
  image-rendering: pixelated;
}

.ban--banned .ban__sprite { filter: grayscale(1) brightness(.8); }

.ban__label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  font: 700 10px/1.1 'Nunito', sans-serif;
  color: var(--mu);
}

.ban--banned .ban__label { background: rgba(200, 54, 42, .45); color: #fff; }
.ban--chosen .ban__label { align-items: end; padding-bottom: 3px; color: #fff; text-shadow: 1px 1px 0 #000; }
.ban--lost .ban__label { color: #ff9a8a; }
.ban--hidden .ban__label { font: 600 20px 'Pixelify Sans', sans-serif; }

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  min-width: 0;
}

.timer {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--uT);
}

.timer--urgent { color: #ff6a5a; }
.timer__label { font: 700 12px 'Nunito', sans-serif; }
.timer__value { font: 700 46px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.timer--urgent .timer__value { animation: pulse .5s steps(2) infinite; }

.bar {
  width: min(360px, 100%);
  height: 8px;
  border-radius: 3px;
  background: var(--in);
  overflow: hidden;
}

.bar__fill { height: 100%; background: var(--uA); transition: width .25s linear; }
.bar--urgent .bar__fill { background: #ff6a5a; }
.center__title { font: 700 20px/1.15 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.center__sub { font: 700 12px/1.35 'Nunito', sans-serif; color: var(--mu); max-width: 560px; }

@keyframes flip { 0% { transform: rotateY(90deg); } 100% { transform: none; } }

@media (max-width: 1100px) {
  .banner { grid-template-columns: minmax(0, 1fr); }
  .bans, .bans--theirs { justify-content: center; }
}
</style>

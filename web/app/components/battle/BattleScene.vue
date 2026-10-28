<template>
  <div ref="wrapper" class="scene-wrap">
    <div class="scene" :class="{ 'scene--quake': quaking }" :style="{ transform: `scale(${scale})`, backgroundImage: `url(${stage.decor}), url(${FALLBACK_DECOR})` }">
      <div v-if="weatherClass" class="scene__weather" :class="weatherClass" />

      <div v-if="fieldLabel" class="scene__field">{{ fieldLabel }}</div>

      <div class="scene__platform scene__platform--opp">
        <img v-if="stage.plateforme" :src="`${stage.plateforme}-adverse.png`" alt="" @error="hide">
      </div>
      <div
        v-for="(pokemon, index) in theirs"
        :key="`opp-${pokemon.position}-${anims[oppSide].key}`"
        class="scene__sprite scene__sprite--opp"
        :class="{ 'scene__sprite--fainted': pokemon.fainted, 'scene__sprite--small': theirs.length > 1 }"
        :style="{ animation: anims[oppSide].name, ...spot('opp', index, theirs.length) }"
      >
        <img :alt="speciesName(pokemon.speciesId)" class="scene__img" :src="spriteUrl(pokemon.speciesId, 'face')">
      </div>
      <div class="scene__hazards scene__hazards--opp">
        <span v-for="hazard in hazards(oppSide)" :key="hazard.id" class="hazard" :style="{ boxShadow: `0 0 0 2px ${hazard.couleur}` }">
          <span class="hazard__icon" :style="{ background: hazard.couleur }">{{ hazard.icone }}</span>{{ hazard.label }}
        </span>
      </div>

      <div class="scene__platform scene__platform--me">
        <img v-if="stage.plateforme" :src="`${stage.plateforme}-joueur.png`" alt="" @error="hide">
      </div>
      <div
        v-for="(pokemon, index) in mine"
        :key="`me-${pokemon.position}-${anims[meSide].key}`"
        class="scene__sprite scene__sprite--me"
        :class="{ 'scene__sprite--fainted': pokemon.fainted, 'scene__sprite--small': mine.length > 1 }"
        :style="{ animation: anims[meSide].name, ...spot('me', index, mine.length) }"
      >
        <img :alt="speciesName(pokemon.speciesId)" class="scene__img" :src="spriteUrl(pokemon.speciesId, meSide === battle.mySide ? 'dos' : 'face')">
      </div>
      <div class="scene__hazards scene__hazards--me">
        <span v-for="hazard in hazards(meSide)" :key="hazard.id" class="hazard" :style="{ boxShadow: `0 0 0 2px ${hazard.couleur}` }">
          <span class="hazard__icon" :style="{ background: hazard.couleur }">{{ hazard.icone }}</span>{{ hazard.label }}
        </span>
      </div>

      <BattleHpCard v-for="(pokemon, index) in theirs" :key="`card-opp-${pokemon.position}`" class="scene__card scene__card--opp" :style="card('opp', index, theirs.length)" :battle="battle" :side="oppSide" :pokemon="pokemon" />
      <BattleHpCard v-for="(pokemon, index) in mine" :key="`card-me-${pokemon.position}`" class="scene__card scene__card--me" :style="card('me', index, mine.length)" :battle="battle" :side="meSide" :pokemon="pokemon" />

      <span
        v-for="item in battle.floats"
        :key="item.id"
        class="scene__float"
        :class="item.side === meSide ? 'scene__float--me' : 'scene__float--opp'"
        :style="{ color: item.color }"
      >{{ item.text }}</span>

      <BattleFx v-for="effect in effects" :key="effect.id" :effect="effect" :from="center(effect.from ?? effect.to)" :to="center(effect.to ?? effect.from)" :origin="origin(effect.to)" />

      <div class="scene__message">
        <span aria-live="polite" class="scene__text">{{ battle.message }}</span>
        <span v-if="waiting" class="scene__cursor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattleState, SideId } from '~/utils/battleTracker'
import type { Stage } from '~/utils/stages'

const props = defineProps<{ battle: BattleState, stage: Stage }>()

const wrapper = ref<HTMLElement>()
const scale = ref(1)
const meSide = computed<SideId>(() => props.battle.mySide ?? 'p1')
const oppSide = computed<SideId>(() => meSide.value === 'p1' ? 'p2' : 'p1')
const mine = computed(() => activePokemons(props.battle, meSide.value))
const theirs = computed(() => activePokemons(props.battle, oppSide.value))
const anims = computed(() => props.battle.anims)
const waiting = computed(() => Boolean(props.battle.request) && !props.battle.choiceSent)

const weatherClass = computed(() => {
  const weather = props.battle.weather
  if (['raindance', 'primordialsea'].includes(weather)) return 'scene__weather--rain'
  if (['snow', 'snowscape', 'hail'].includes(weather)) return 'scene__weather--snow'
  if (['sunnyday', 'desolateland'].includes(weather)) return 'scene__weather--sun'
  if (weather === 'sandstorm') return 'scene__weather--sand'
  return ''
})

const fieldLabel = computed(() => [
  WEATHERS[props.battle.weather]?.nom,
  ...props.battle.fieldEffects.map(effect => FIELD_EFFECTS[effect] ?? effect),
].filter(Boolean).join(' · '))

const hazards = (side: SideId) => Object.entries(props.battle.sides[side].conditions).map(([id, layers]) => {
  const info = SIDE_CONDITIONS[id] ?? { nom: id, couleur: '#5a6478', icone: '•' }
  return { id, ...info, label: layers > 1 ? `${info.nom} ×${layers}` : info.nom }
})

/** Places des sprites et des cartes de PV quand plusieurs Pokémon sont actifs par camp (doubles, triples). */
const box = (side: 'me' | 'opp', index: number, count: number) => {
  if (count < 2) return null
  const width = side === 'opp' ? 150 : 190
  const left = side === 'opp' ? 450 - (count - 2) * 60 + index * (count > 2 ? 110 : 150) : 20 + index * (count > 2 ? 130 : 190)
  return side === 'opp' ? { left, width, top: 40, height: 176 } : { left, width, top: 170, height: 190 }
}

const spot = (side: 'me' | 'opp', index: number, count: number) => {
  const place = box(side, index, count)
  return place ? { left: `${place.left}px`, width: `${place.width}px`, top: `${place.top}px`, height: `${place.height}px` } : {}
}

/** Centre d'un Pokémon actif, que visent les effets visuels. */
const center = (target?: { side: SideId, position: number }) => {
  if (!target) return { x: 410, y: 210 }
  const opp = target.side === oppSide.value
  const list = opp ? theirs.value : mine.value
  const place = box(opp ? 'opp' : 'me', Math.max(0, list.findIndex(pokemon => pokemon.position === target.position)), list.length)
  if (!place) return opp ? { x: 610, y: 170 } : { x: 200, y: 296 }
  return { x: place.left + place.width / 2, y: place.top + place.height - (opp ? 52 : 62) }
}

/** Coin d'où le dresseur lance sa Poké Ball. */
const origin = (target?: { side: SideId, position: number }) => target?.side === oppSide.value ? { x: 840, y: 10 } : { x: -20, y: 400 }

/** Les effets déjà joués avant l'ouverture de la scène ne sont pas rejoués. */
const shownAfter = ref(Number.POSITIVE_INFINITY)
const effects = computed(() => props.battle.fx.filter(effect => effect.kind !== 'shake' && effect.id > shownAfter.value))
const lastShake = computed(() => props.battle.fx.filter(effect => effect.kind === 'shake' && effect.id > shownAfter.value).at(-1)?.id)
const quaking = ref(false)
let quakeTimer: ReturnType<typeof setTimeout> | undefined
watch(lastShake, (id) => {
  if (!id) return
  quaking.value = false
  requestAnimationFrame(() => {
    quaking.value = true
    clearTimeout(quakeTimer)
    quakeTimer = setTimeout(() => (quaking.value = false), 650)
  })
})

const card = (side: 'me' | 'opp', index: number, count: number) => {
  if (count < 2) return {}
  return side === 'opp' ? { top: `${22 + index * 72}px` } : { top: `${296 - (count - 1 - index) * 72}px` }
}

const hide = (event: Event) => {
  (event.target as HTMLImageElement).style.display = 'none'
}

let observer: ResizeObserver | undefined
onMounted(() => {
  shownAfter.value = props.battle.fx.at(-1)?.id ?? 0
  observer = new ResizeObserver(() => {
    const element = wrapper.value
    if (element) scale.value = Math.max(.45, Math.min(1.35, element.clientWidth / 820, element.clientHeight / 470))
  })
  if (wrapper.value) observer.observe(wrapper.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(quakeTimer)
})
</script>

<style scoped>
.scene-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.scene {
  position: relative;
  width: 820px;
  height: 470px;
  flex: none;
  transform-origin: 50% 50%;
  border-radius: var(--r);
  overflow: hidden;
  background-color: #88b0c8;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  box-shadow: var(--pnS);
}

.scene--quake { animation: quake .6s linear; }

@keyframes quake {
  0%, 100% { translate: 0 0; }
  10%, 50%, 90% { translate: -10px 3px; }
  30%, 70% { translate: 10px -3px; }
}

@media (prefers-reduced-motion: reduce) {
  .scene--quake { animation: none; }
}

.scene__weather {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.scene__weather--rain {
  background: rgba(30, 50, 90, .22) repeating-linear-gradient(105deg, rgba(220, 235, 255, 0) 0 14px, rgba(220, 235, 255, .28) 14px 15px, rgba(220, 235, 255, 0) 15px 40px);
  background-size: 40px 120px;
  animation: rain .5s linear infinite;
}

.scene__weather--snow {
  background: rgba(220, 235, 255, .12) radial-gradient(circle, rgba(255, 255, 255, .9) 0 2px, transparent 3px);
  background-size: 34px 40px;
  animation: snow 3s linear infinite;
}

.scene__weather--sun { background: radial-gradient(circle at 85% 0, rgba(255, 220, 120, .55), rgba(255, 160, 60, .12) 60%, transparent); }
.scene__weather--sand { background: rgba(196, 160, 90, .35) repeating-linear-gradient(170deg, rgba(240, 210, 150, 0) 0 22px, rgba(240, 210, 150, .3) 22px 24px); background-size: 120px 60px; animation: rain .9s linear infinite; }

.scene__field {
  position: absolute;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  background: rgba(10, 30, 70, .85);
  color: #fff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, .55);
  display: flex;
  align-items: center;
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
  z-index: 6;
}

.scene__platform {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 40%, rgba(255, 255, 255, .35), rgba(60, 90, 60, .55) 60%, rgba(0, 0, 0, .25) 72%, transparent 73%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.scene__platform img {
  width: 100%;
  image-rendering: pixelated;
}

.scene__platform--opp { left: 480px; top: 200px; width: 260px; height: 44px; }
.scene__platform--me { left: 30px; top: 330px; width: 340px; height: 58px; }

.scene__sprite {
  position: absolute;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2;
}

.scene__sprite--opp { left: 520px; top: 28px; width: 180px; height: 196px; }
.scene__sprite--me { left: 80px; top: 150px; width: 240px; height: 210px; }
.scene__sprite--fainted { opacity: 0; transition: opacity .2s .7s; }
.scene__sprite--small .scene__img { transform: scale(1); }

.scene__img {
  display: block;
  max-width: none;
  image-rendering: pixelated;
  transform: scale(1.35);
  transform-origin: 50% 100%;
}

.scene__sprite--opp .scene__img { transform: scale(1.15); }

.scene__hazards {
  position: absolute;
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  z-index: 4;
}

.scene__hazards--opp { left: 470px; top: 250px; width: 280px; }
.scene__hazards--me { left: 30px; top: 380px; width: 340px; }

.hazard {
  height: 24px;
  padding: 0 8px 0 3px;
  border-radius: 6px;
  background: rgba(12, 16, 24, .82);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 5px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
}

.hazard__icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: #fff;
  display: grid;
  place-items: center;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
}

.scene__card { position: absolute; z-index: 5; }
.scene__card--opp { left: 22px; top: 22px; }
.scene__card--me { left: 508px; top: 296px; }

.scene__float {
  position: absolute;
  z-index: 7;
  font: 700 26px 'Pixelify Sans', sans-serif;
  text-shadow: 2px 2px 0 #000, 0 0 6px #000;
  animation: floatUp 1.3s ease-out both;
  pointer-events: none;
}

.scene__float--opp { left: 580px; top: 70px; }
.scene__float--me { left: 170px; top: 200px; }

.scene__message {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  height: 50px;
  border-radius: 10px;
  background: var(--tb);
  box-shadow: inset 0 0 0 3px var(--tbB), inset 0 0 0 5px rgba(255, 255, 255, .55), 0 3px 0 rgba(0, 0, 0, .25);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 10px;
  z-index: 8;
}

.scene__text {
  flex: 1;
  font: 700 18px 'Atkinson Hyperlegible', sans-serif;
  color: var(--tbTx);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene__cursor {
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid var(--tbB);
  animation: cursor .6s steps(2) infinite;
}
</style>

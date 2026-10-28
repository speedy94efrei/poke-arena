<template>
  <div class="fx" :style="vars" aria-hidden="true">
    <template v-if="effect.kind === 'shot' || effect.kind === 'throw'">
      <img v-for="index in count" :key="index" :src="effect.image" alt="" class="fx__item" :class="effect.kind === 'throw' ? 'fx__throw' : 'fx__shot'" :style="{ animationDelay: `${delay + (index - 1) * 90}ms` }">
    </template>
    <img v-else-if="effect.kind === 'burst'" :src="effect.image" alt="" class="fx__item fx__burst" :style="{ animationDelay: `${delay}ms` }">
    <template v-else-if="effect.kind === 'drop'">
      <img v-for="index in count" :key="index" :src="effect.image" alt="" class="fx__item fx__drop" :style="{ animationDelay: `${delay + (index - 1) * 110}ms`, marginLeft: `${(index - (count + 1) / 2) * 34 - 18}px` }">
    </template>
    <template v-else-if="effect.kind === 'orbit'">
      <img v-for="index in count" :key="index" :src="effect.image" alt="" class="fx__item fx__orbit" :style="{ animationDelay: `${-(index - 1) * 240}ms` }">
    </template>
    <template v-else-if="effect.kind === 'rise'">
      <img v-for="index in count" :key="index" :src="effect.image" alt="" class="fx__item fx__rise" :style="{ animationDelay: `${delay + (index - 1) * 110}ms`, marginLeft: `${((index * 37) % 90) - 60}px` }">
    </template>
    <span v-else-if="effect.kind === 'shield'" class="fx__item fx__shield" />
    <template v-else-if="effect.kind === 'arrows'">
      <span v-for="index in count" :key="index" class="fx__item fx__arrow" :class="effect.label === 'down' ? 'fx__arrow--down' : 'fx__arrow--up'" :style="{ animationDelay: `${(index - 1) * 120}ms`, marginLeft: `${(index - (count + 1) / 2) * 26 - 10}px` }">{{ effect.label === 'down' ? '▼' : '▲' }}</span>
    </template>
    <template v-else-if="effect.kind === 'puff'">
      <span class="fx__item fx__puff" :style="{ animationDelay: `${delay}ms` }" />
      <span v-if="effect.label" class="fx__item fx__label" :style="{ animationDelay: `${delay}ms` }">{{ effect.label }}</span>
    </template>
    <template v-else-if="effect.kind === 'bite'">
      <img :src="fxImage('topbite')" alt="" class="fx__item fx__bite fx__bite--top">
      <img :src="fxImage('bottombite')" alt="" class="fx__item fx__bite fx__bite--bottom">
    </template>
    <img v-else-if="effect.kind === 'slash'" :src="effect.image" alt="" class="fx__item fx__slash">
    <span v-else-if="effect.kind === 'flash'" class="fx__flash" :style="{ animationDelay: `${delay}ms` }" />
    <template v-else-if="effect.kind === 'ball'">
      <img :src="fxImage('pokeball')" alt="" class="fx__item fx__ball">
      <img :src="fxImage('shine')" alt="" class="fx__item fx__ball-burst">
    </template>
    <template v-else-if="effect.kind === 'crystal'">
      <span class="fx__item fx__crystal" />
      <img v-for="index in 5" :key="index" :src="fxImage('shine')" alt="" class="fx__item fx__rise" :style="{ animationDelay: `${(index - 1) * 90}ms`, marginLeft: `${((index * 37) % 90) - 60}px` }">
    </template>
  </div>
</template>

<script setup lang="ts">
import { type FxEvent, fxImage } from '~/utils/battleAnims'

const props = defineProps<{ effect: FxEvent, from: { x: number, y: number }, to: { x: number, y: number }, origin: { x: number, y: number } }>()

const count = computed(() => Math.max(1, props.effect.count ?? 1))
const delay = computed(() => props.effect.delay ?? 0)
const vars = computed(() => ({
  '--x1': `${props.from.x}px`, '--y1': `${props.from.y}px`, '--x2': `${props.to.x}px`, '--y2': `${props.to.y}px`,
  '--x0': `${props.origin.x}px`, '--y0': `${props.origin.y}px`, '--glow': props.effect.color ?? '#ffffff',
}))
</script>

<style scoped>
.fx { position: absolute; inset: 0; pointer-events: none; z-index: 7; }
.fx__item { position: absolute; left: 0; top: 0; opacity: 0; image-rendering: pixelated; filter: drop-shadow(0 0 6px var(--glow)); }
.fx__shot { width: 54px; margin: -27px 0 0 -27px; animation: shot .42s ease-in both; }
.fx__throw { width: 58px; margin: -29px 0 0 -29px; animation: throw .4s ease-out both; }
.fx__burst { width: 130px; margin: -65px 0 0 -65px; left: var(--x2); top: var(--y2); animation: burst .45s ease-out both; }
.fx__drop { width: 36px; margin-top: -18px; left: var(--x2); top: var(--y2); animation: drop .55s ease-in both; }
.fx__orbit { width: 40px; margin: -20px 0 0 -20px; animation: orbit .72s linear 1 both; }
.fx__rise { width: 26px; margin-top: 10px; left: var(--x2); top: var(--y2); animation: rise .8s ease-out both; }
.fx__shield { width: 170px; height: 170px; margin: -85px 0 0 -85px; border-radius: 50%; left: var(--x2); top: var(--y2); background: radial-gradient(circle, transparent 55%, color-mix(in srgb, var(--glow) 55%, transparent) 70%, transparent 72%); box-shadow: 0 0 18px var(--glow), inset 0 0 22px var(--glow); animation: shield .8s ease-out both; filter: none; }
.fx__arrow { font: 700 26px 'Pixelify Sans', sans-serif; color: var(--glow); text-shadow: 2px 2px 0 #000; margin-top: -20px; left: var(--x2); top: var(--y2); }
.fx__arrow--up { animation: arrowUp .8s ease-out both; }
.fx__arrow--down { animation: arrowDown .8s ease-out both; }
.fx__puff { width: 140px; height: 110px; margin: -55px 0 0 -70px; border-radius: 50%; left: var(--x2); top: var(--y2); background: radial-gradient(circle, color-mix(in srgb, var(--glow) 75%, transparent), transparent 70%); animation: puff .7s ease-out both; filter: none; }
.fx__label { margin: -60px 0 0 -26px; padding: 2px 8px; border-radius: 5px; background: var(--glow); color: #fff; font: 700 16px 'Pixelify Sans', sans-serif; text-shadow: 1px 1px 0 #000; left: var(--x2); top: var(--y2); animation: label .9s ease-out both; filter: none; }
.fx__bite { width: 110px; margin-left: -55px; }
.fx__bite--top { margin-top: -80px; animation: biteTop .45s ease-in both; }
.fx__bite--bottom { margin-top: 0; animation: biteBottom .45s ease-in both; }
.fx__slash { width: 120px; margin: -60px 0 0 -60px; animation: slash .4s ease-out both; }
.fx__flash { position: absolute; inset: 0; background: var(--glow); opacity: 0; animation: flash .45s ease-out both; }
.fx__ball { width: 28px; margin: -14px 0 0 -14px; animation: ball .36s ease-out both; }
.fx__ball-burst { width: 90px; margin: -45px 0 0 -45px; left: var(--x2); top: var(--y2); animation: burst .4s .32s ease-out both; filter: drop-shadow(0 0 10px #fff); }
.fx__crystal { width: 160px; height: 160px; margin: -80px 0 0 -80px; left: var(--x2); top: var(--y2); background: linear-gradient(135deg, rgba(255, 255, 255, .9), color-mix(in srgb, var(--glow) 70%, transparent)); clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); animation: crystal .7s ease-out both; filter: drop-shadow(0 0 14px var(--glow)); }

@media (prefers-reduced-motion: reduce) {
  .fx { display: none; }
}

@keyframes shot {
  0% { opacity: 0; transform: translate(var(--x1), var(--y1)) scale(.5); }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--x2), var(--y2)) scale(1.15); }
}

@keyframes throw {
  0% { opacity: 0; transform: translate(var(--x1), var(--y1)) scale(.6) rotate(-20deg); }
  15% { opacity: 1; }
  75% { opacity: 1; transform: translate(var(--x2), var(--y2)) scale(1.15) rotate(0); }
  100% { opacity: 0; transform: translate(calc(var(--x2) + 10px), calc(var(--y2) - 6px)) scale(1.3); }
}

@keyframes burst {
  0% { opacity: 0; scale: .4; }
  30% { opacity: 1; scale: 1.15; }
  100% { opacity: 0; scale: 1.6; }
}

@keyframes drop {
  0% { opacity: 0; translate: 0 -170px; rotate: 0deg; }
  60% { opacity: 1; translate: 0 0; rotate: 160deg; }
  85% { opacity: 1; }
  100% { opacity: 0; translate: 0 8px; rotate: 200deg; }
}

@keyframes orbit {
  0% { opacity: 1; transform: translate(var(--x2), var(--y2)) rotate(0deg) translateX(70px) rotate(0deg); }
  100% { opacity: 0; transform: translate(var(--x2), var(--y2)) rotate(360deg) translateX(70px) rotate(-360deg); }
}

@keyframes rise {
  0% { opacity: 0; translate: 0 30px; scale: .5; }
  30% { opacity: 1; }
  100% { opacity: 0; translate: 0 -70px; scale: 1.1; }
}

@keyframes shield {
  0% { opacity: 0; scale: .5; }
  35% { opacity: 1; scale: 1.05; }
  80% { opacity: .9; scale: 1; }
  100% { opacity: 0; scale: 1.1; }
}

@keyframes arrowUp {
  0% { opacity: 0; translate: 0 40px; }
  25% { opacity: 1; }
  100% { opacity: 0; translate: 0 -50px; }
}

@keyframes arrowDown {
  0% { opacity: 0; translate: 0 -60px; }
  25% { opacity: 1; }
  100% { opacity: 0; translate: 0 30px; }
}

@keyframes puff {
  0% { opacity: 0; scale: .3; }
  35% { opacity: .95; scale: 1; }
  100% { opacity: 0; scale: 1.35; }
}

@keyframes label {
  0% { opacity: 0; translate: 0 10px; }
  25% { opacity: 1; translate: 0 0; }
  80% { opacity: 1; }
  100% { opacity: 0; translate: 0 -16px; }
}

@keyframes biteTop {
  0% { opacity: 0; transform: translate(var(--x2), calc(var(--y2) - 30px)); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--x2), var(--y2)); }
}

@keyframes biteBottom {
  0% { opacity: 0; transform: translate(var(--x2), calc(var(--y2) + 30px)); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--x2), var(--y2)); }
}

@keyframes slash {
  0% { opacity: 0; transform: translate(calc(var(--x2) + 40px), calc(var(--y2) - 40px)); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--x2) - 30px), calc(var(--y2) + 30px)); }
}

@keyframes flash {
  0%, 100% { opacity: 0; }
  30% { opacity: .45; }
}

@keyframes ball {
  0% { opacity: 1; transform: translate(var(--x0), var(--y0)) rotate(0deg); }
  60% { opacity: 1; transform: translate(calc((var(--x0) + var(--x2)) / 2), calc(var(--y2) - 90px)) rotate(360deg); }
  100% { opacity: 0; transform: translate(var(--x2), var(--y2)) rotate(540deg); }
}

@keyframes crystal {
  0% { opacity: 0; scale: .2; }
  40% { opacity: .95; scale: 1.1; }
  100% { opacity: 0; scale: 1.5; }
}
</style>

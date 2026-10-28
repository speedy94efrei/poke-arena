<template>
  <div
    v-if="mode"
    role="status"
    aria-live="polite"
    class="transition"
    :class="`transition--${phase}`"
    :style="{ '--x': `${origin.x}px`, '--y': `${origin.y}px`, '--light': mode.light, '--dark': mode.dark, '--accent': mode.accent }"
  >
    <div class="transition__box">
      <span class="transition__ball" />
      <span class="transition__name">{{ mode.name }}</span>
      <span class="transition__tagline">{{ mode.tagline }}</span>
      <span class="transition__bar"><span class="transition__fill" /></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameMode } from '~/utils/modes'

const IN_DELAY = 650
const OUT_DELAY = 600

const router = useRouter()
const mode = shallowRef<GameMode | null>(null)
const phase = ref<'in' | 'out'>('in')
const origin = ref({ x: 0, y: 0 })
let pointer = { x: 0, y: 0 }
let hideTimer: ReturnType<typeof setTimeout> | undefined

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const remember = (event: PointerEvent) => {
  pointer = { x: event.clientX, y: event.clientY }
}

/** En changeant de mode (Classique, PokéDraft, Roguelike…), un écran de transition s'ouvre depuis le clic, puis se referme. */
const stopBefore = router.beforeEach(async (to, from) => {
  const next = universeOf(to.path)
  if (!from.matched.length || !next || next === universeOf(from.path)) return
  const target = modeOf(next)
  if (!target) return
  clearTimeout(hideTimer)
  origin.value = pointer.x || pointer.y ? pointer : { x: innerWidth / 2, y: innerHeight / 2 }
  phase.value = 'in'
  mode.value = target
  await new Promise(resolve => setTimeout(resolve, reducedMotion() ? 120 : IN_DELAY))
})

const stopAfter = router.afterEach(() => {
  if (!mode.value || phase.value === 'out') return
  phase.value = 'out'
  hideTimer = setTimeout(() => (mode.value = null), reducedMotion() ? 50 : OUT_DELAY)
})

onMounted(() => document.addEventListener('pointerdown', remember, true))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', remember, true)
  stopBefore()
  stopAfter()
  clearTimeout(hideTimer)
})
</script>

<style scoped>
.transition {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  color: #fff;
  background:
    repeating-linear-gradient(115deg, rgba(255, 255, 255, .06) 0 14px, transparent 14px 40px),
    radial-gradient(circle at 50% 45%, var(--light), var(--dark) 75%);
  background-size: 120px 100%, 100% 100%;
  animation: stripe .8s linear infinite;
}

.transition--in { animation: stripe .8s linear infinite, open .55s cubic-bezier(.6, 0, .3, 1) both; }
.transition--out { animation: stripe .8s linear infinite, close .5s .1s cubic-bezier(.6, 0, .3, 1) both; }
.transition__box { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; }

.transition__ball {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 11px, #383838 11px 15px, transparent 15px), linear-gradient(180deg, var(--accent) 0 47%, #383838 47% 53%, #fff 53%);
  box-shadow: 0 0 0 4px #383838, 0 10px 30px rgba(0, 0, 0, .4);
  animation: ball .6s .15s both;
}

.transition__name { font: 700 clamp(36px, 6vw, 72px)/1 'Pixelify Sans', sans-serif; text-shadow: 4px 4px 0 rgba(0, 0, 0, .45); animation: rise .4s .25s both; }
.transition__tagline { font: 700 16px 'Nunito', sans-serif; color: var(--accent); animation: rise .4s .35s both; }
.transition__bar { width: 200px; height: 8px; border-radius: 3px; background: rgba(0, 0, 0, .4); overflow: hidden; }
.transition__fill { display: block; height: 100%; background: var(--accent); animation: fill .6s .1s steps(10) both; }
.transition--out .transition__fill { animation: none; width: 100%; }

@keyframes stripe { to { background-position: 120px 0, 0 0; } }
@keyframes open { from { clip-path: circle(0% at var(--x) var(--y)); } to { clip-path: circle(150% at var(--x) var(--y)); } }
@keyframes close { from { clip-path: circle(150% at 50% 50%); } to { clip-path: circle(0% at 50% 50%); } }
@keyframes ball { 0% { transform: rotate(-200deg) scale(.4); opacity: 0; } 60% { transform: rotate(15deg) scale(1.08); opacity: 1; } 100% { transform: none; } }
@keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes fill { from { width: 0; } to { width: 100%; } }

@media (prefers-reduced-motion: reduce) {
  .transition, .transition--in, .transition--out, .transition__ball, .transition__name, .transition__tagline, .transition__fill { animation: none; }
}
</style>

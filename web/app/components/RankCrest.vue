<template>
  <span class="crest" :class="{ 'crest--big': big, 'crest--champion': style.level >= 6 }" :style="crestStyle" role="img" :aria-label="label">
    <span v-if="big && style.level >= 5" class="crest__rays" />
    <span v-if="big && style.level >= 4" class="crest__aura" />
    <template v-if="big && style.level >= 2">
      <span class="crest__wing crest__wing--left" />
      <span class="crest__wing crest__wing--right" />
    </template>
    <span v-if="big && style.level >= 3" class="crest__ring" />
    <img class="crest__ball" :src="ballSprite(tier)" alt="" :style="{ filter: glow }">
    <template v-if="big && style.level >= 5">
      <span v-for="([x, y], index) in SPARKS" :key="index" class="crest__spark" :style="{ left: `${x * 100}%`, top: `${y * 100}%`, animationDelay: `${index * .35}s` }" />
    </template>
    <span v-if="big && style.level >= 6" class="crest__crown" />
    <span v-if="big && division" class="crest__division" :class="{ 'crest__division--gold': style.level >= 3 }">{{ division }}</span>
  </span>
</template>

<script setup lang="ts">
import type { TierKey } from '~/utils/ranked'

const SPARKS: [number, number][] = [[-.15, .1], [1.05, .2], [.9, -.12], [-.05, .85]]

const props = withDefaults(defineProps<{ tier: TierKey, division?: string | null, size?: number, label?: string }>(), { division: null, size: 30, label: undefined })

const style = computed(() => tierStyle(props.tier))
const big = computed(() => props.size >= 44)
const crestStyle = computed(() => ({ '--size': `${props.size}px`, '--ink': style.value.ink }))
const glow = computed(() => {
  const blur = Math.max(1, props.size * .04)
  const shadow = `drop-shadow(0 ${Math.max(1, props.size * .05)}px 0 rgba(0, 0, 0, .45))`
  return style.value.level >= 1 ? `drop-shadow(0 0 ${blur}px ${style.value.ink}) drop-shadow(0 0 ${blur}px ${style.value.ink}) ${shadow}` : shadow
})
</script>

<style scoped>
.crest {
  position: relative;
  flex: none;
  display: inline-block;
  width: var(--size);
  height: var(--size);
}

.crest--big { margin: calc(var(--size) * .2) calc(var(--size) * .34) calc(var(--size) * .3); }
.crest--champion { animation: bob 3s ease-in-out infinite; }

.crest__ball {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.crest__rays, .crest__aura, .crest__ring, .crest__wing, .crest__spark, .crest__crown, .crest__division { position: absolute; }

.crest__rays {
  left: 50%;
  top: 50%;
  width: calc(var(--size) * 2.1);
  height: calc(var(--size) * 2.1);
  margin: calc(var(--size) * -1.05);
  border-radius: 50%;
  background: repeating-conic-gradient(color-mix(in srgb, var(--ink) 35%, transparent) 0 6deg, transparent 6deg 20deg);
  mask-image: radial-gradient(circle, #000 30%, transparent 70%);
  animation: spin 14s linear infinite;
}

.crest__aura {
  left: 50%;
  top: 50%;
  width: calc(var(--size) * 1.6);
  height: calc(var(--size) * 1.6);
  margin: calc(var(--size) * -.8);
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--ink) 55%, transparent) 0, color-mix(in srgb, var(--ink) 15%, transparent) 45%, transparent 70%);
  animation: pulse 2.6s ease-in-out infinite;
}

.crest__wing {
  top: 18%;
  width: calc(var(--size) * .55);
  height: calc(var(--size) * .62);
  background: linear-gradient(180deg, var(--ink), color-mix(in srgb, var(--ink) 40%, transparent));
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, .4));
}

.crest__wing--left { left: calc(var(--size) * -.34); clip-path: polygon(100% 10%, 0 0, 30% 40%, 0 55%, 40% 75%, 20% 100%, 100% 80%); }
.crest__wing--right { right: calc(var(--size) * -.34); clip-path: polygon(0 10%, 100% 0, 70% 40%, 100% 55%, 60% 75%, 80% 100%, 0 80%); }

.crest__ring {
  left: -10%;
  top: -10%;
  width: 120%;
  height: 120%;
  border-radius: 50%;
  background: repeating-conic-gradient(var(--ink) 0 7deg, transparent 7deg 15deg);
  mask-image: radial-gradient(circle, transparent 60%, #000 62%, #000 70%, transparent 72%);
}

.crest__spark {
  width: calc(var(--size) * .12);
  height: calc(var(--size) * .12);
  background: #fff;
  box-shadow: 0 0 8px var(--ink);
  animation: pulse 1.6s ease-in-out infinite;
}

.crest__crown {
  left: 50%;
  top: calc(var(--size) * -.42);
  width: calc(var(--size) * .6);
  height: calc(var(--size) * .36);
  margin-left: calc(var(--size) * -.3);
  background: linear-gradient(180deg, #fff3b0, #e8a820);
  clip-path: polygon(0 100%, 0 20%, 25% 60%, 50% 0, 75% 60%, 100% 20%, 100% 100%);
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, .5));
}

.crest__division {
  left: 50%;
  bottom: calc(var(--size) * -.26);
  transform: translateX(-50%);
  height: calc(var(--size) * .3);
  min-width: calc(var(--size) * .5);
  padding: 0 calc(var(--size) * .08);
  box-sizing: border-box;
  border-radius: calc(var(--size) * .08);
  background: #222;
  color: #fff;
  box-shadow: 0 0 0 2px #111;
  display: grid;
  place-items: center;
  font: 700 calc(var(--size) * .2) 'Pixelify Sans', sans-serif;
}

.crest__division--gold { background: linear-gradient(180deg, #fff3b0, #d49a1e); color: #2a1d00; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>

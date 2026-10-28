<template>
  <div class="soon" :style="{ '--light': mode?.light, '--dark': mode?.dark, '--accent': mode?.accent, '--dot': mode?.dot }">
    <section class="hero">
      <span class="hero__badge">Bientôt · en préparation</span>
      <h1 class="hero__title">{{ title }}</h1>
      <p class="hero__pitch">{{ pitch }}</p>
      <ul class="hero__chips">
        <li v-for="chip in chips" :key="chip" class="hero__chip">{{ chip }}</li>
      </ul>
    </section>
    <section class="steps" :aria-label="stepsTitle">
      <h2 class="steps__title">{{ stepsTitle }}</h2>
      <ol class="steps__list">
        <li v-for="(step, index) in steps" :key="step.title" class="step">
          <span class="step__num">{{ index + 1 }}</span>
          <span class="step__body"><b>{{ step.title }}</b>{{ step.text }}</span>
        </li>
      </ol>
    </section>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string, pitch: string, chips: string[], stepsTitle: string, steps: { title: string, text: string }[] }>()

const route = useRoute()
const mode = computed(() => modeOf(universeOf(route.path)))
</script>

<style scoped>
.soon { display: flex; flex-direction: column; gap: 12px; }

.hero {
  padding: 22px 24px;
  border-radius: calc(var(--r) + 4px);
  background: repeating-linear-gradient(115deg, rgba(255, 255, 255, .05) 0 14px, transparent 14px 40px), linear-gradient(140deg, var(--light), var(--dark));
  box-shadow: inset 0 0 0 3px var(--dot), 0 0 0 3px var(--bd);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero__badge { align-self: flex-start; height: 24px; padding: 0 10px; border-radius: 5px; background: var(--accent); color: #0a0e14; font: 700 13px 'Nunito', sans-serif; display: flex; align-items: center; }
.hero__title { margin: 0; font: 700 40px/1.05 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .45); }
.hero__pitch { margin: 0; max-width: 720px; font: 700 15px/1.5 'Nunito', sans-serif; color: #e8e4f4; }
.hero__chips { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.hero__chip { height: 26px; padding: 0 10px; border-radius: 13px; background: rgba(0, 0, 0, .35); box-shadow: inset 0 0 0 1px var(--accent); font: 700 12px 'Nunito', sans-serif; display: flex; align-items: center; }

.steps {
  padding: 14px 16px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.steps__title { margin: 0; font: 600 20px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.steps__list { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 8px; }
.step { display: flex; gap: 10px; padding: 10px; border-radius: 10px; background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); }
.step__num { flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--dot); color: #0a0e14; font: 700 15px 'Pixelify Sans', sans-serif; display: grid; place-items: center; }
.step__body { display: flex; flex-direction: column; gap: 2px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.step__body b { font: 600 16px 'Pixelify Sans', sans-serif; color: var(--tx); }

@media (max-width: 600px) {
  .hero__title { font-size: 30px; }
}
</style>

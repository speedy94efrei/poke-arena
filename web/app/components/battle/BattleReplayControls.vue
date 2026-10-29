<template>
  <div class="controls" role="group" aria-label="Lecture du replay">
    <div class="controls__buttons">
      <button type="button" class="btn btn--small controls__icon" title="Revenir au début" aria-label="Revenir au début" @click="emit('restart')">⏮</button>
      <button type="button" class="btn btn--small controls__icon" title="Tour précédent" aria-label="Tour précédent" @click="emit('previous')">◀</button>
      <button type="button" class="btn btn--primary controls__play" @click="emit('toggle')">{{ playing ? '❚❚ Pause' : finished ? '↺ Revoir' : '▶ Lecture' }}</button>
      <button type="button" class="btn btn--small controls__icon" title="Tour suivant" aria-label="Tour suivant" @click="emit('next')">▶</button>
      <button type="button" class="btn btn--small controls__icon" title="Aller à la fin" aria-label="Aller à la fin" @click="emit('end')">⏭</button>
    </div>
    <label class="controls__turn">
      <span class="controls__label">TOUR</span>
      <input type="range" class="controls__range" min="0" :max="turns" :value="turn" :aria-valuetext="`Tour ${turn} sur ${turns}`" @input="event => emit('turn', Number((event.target as HTMLInputElement).value))">
      <span class="controls__count">{{ turn }}/{{ turns }}</span>
    </label>
    <div class="controls__speeds" role="radiogroup" aria-label="Vitesse">
      <button v-for="option in SPEEDS" :key="option" type="button" role="radio" class="controls__speed" :class="{ 'controls__speed--on': option === speed }" :aria-checked="option === speed" @click="emit('update:speed', option)">×{{ option }}</button>
    </div>
    <button type="button" class="btn btn--small" @click="copy">{{ copied ? 'Lien copié' : 'Copier le lien' }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ playing: boolean, finished: boolean, turn: number, turns: number, speed: number }>()
const emit = defineEmits<{ 'toggle': [], 'previous': [], 'next': [], 'restart': [], 'end': [], 'turn': [turn: number], 'update:speed': [speed: number] }>()

const SPEEDS = [0.5, 1, 2, 4]
const copied = ref(false)

const copy = async () => {
  try {
    await navigator.clipboard.writeText(location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}
</script>

<style scoped>
.controls {
  flex: none;
  padding: 10px 12px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.controls__buttons { display: flex; align-items: center; gap: 6px; }
.controls__icon { min-width: 38px; font-size: 15px; }
.controls__play { min-width: 118px; height: 40px; font-size: 15px; }
.controls__turn { flex: 1 1 200px; display: flex; align-items: center; gap: 8px; }
.controls__label { font: 700 11px 'Nunito', sans-serif; color: var(--mu); letter-spacing: .06em; }
.controls__range { flex: 1; accent-color: var(--ac); }
.controls__count { min-width: 52px; font: 600 16px 'Pixelify Sans', sans-serif; text-align: right; }
.controls__speeds { display: flex; border-radius: 8px; overflow: hidden; box-shadow: inset 0 0 0 2px var(--in); }
.controls__speed { height: 32px; padding: 0 10px; border: 0; background: transparent; color: var(--tx); font: 700 13px 'Nunito', sans-serif; cursor: pointer; }
.controls__speed--on { background: var(--sel); color: var(--selTx); }
</style>

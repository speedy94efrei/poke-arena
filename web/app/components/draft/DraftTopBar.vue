<template>
  <div class="top">
    <div class="top__title">
      <span class="top__diamond" />
      <span class="top__name">{{ modeName }}</span>
      <span class="top__season">Saison {{ roster.saison }} · {{ draft.you }} contre {{ draft.opponent }}</span>
    </div>
    <ol aria-label="Étapes" class="steps">
      <li v-for="(label, index) in DRAFT.steps" :key="label" class="step" :class="{ 'step--now': index === step, 'step--done': index < step }" :aria-current="index === step ? 'step' : undefined">
        <span class="step__number">{{ index < step ? '✓' : index + 1 }}</span>{{ label }}
      </li>
    </ol>
    <span class="top__spacer" />
    <div class="top__max" title="Temps maximal restant avant le début du combat">
      <span class="top__max-label">Combat dans au plus</span>
      <span class="top__max-value">{{ clock(maxSecondsLeft(draft, seconds)) }}</span>
    </div>
    <button type="button" class="top__quit" @click="emit('quit')">Quitter</button>
  </div>
</template>

<script setup lang="ts">
import type { DraftView } from '~/utils/draft'

const props = defineProps<{ draft: DraftView, seconds: number }>()
const modeName = computed(() => props.draft.ranked ? 'Classé PokéDraft' : 'Draft amical')
const emit = defineEmits<{ quit: [] }>()
const step = computed(() => draftStep(props.draft.phase))
</script>

<style scoped>
.top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.top__title, .top__max {
  height: 40px;
  padding: 0 12px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  display: flex;
  align-items: center;
  gap: 8px;
}

.top__diamond { width: 10px; height: 10px; transform: rotate(45deg); background: var(--uA); }
.top__name { font: 700 17px 'Pixelify Sans', sans-serif; }
.top__season { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

.steps {
  list-style: none;
  margin: 0;
  padding: 3px;
  display: flex;
  gap: 3px;
  border-radius: var(--r);
  background: var(--dk);
  --tx: var(--dkTx);
  --mu: var(--dkMu);
  --chip: var(--dkChip);
  color: var(--tx);
  box-shadow: var(--pnS);
}

.step {
  height: 32px;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--mu);
  font: 700 13px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.step--done { color: var(--tx); }
.step--now { background: var(--uA); color: var(--uAtx); }
.step__number { font: 600 13px 'Pixelify Sans', sans-serif; }
.top__spacer { flex: 1; }
.top__max-label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.top__max-value { font: 600 19px 'Pixelify Sans', sans-serif; color: var(--uT); }

.top__quit {
  border: 0;
  cursor: pointer;
  height: 40px;
  padding: 0 14px;
  border-radius: var(--r);
  background: transparent;
  box-shadow: inset 0 0 0 2px #e8604a;
  color: #ff9a8a;
  font: 700 14px 'Nunito', sans-serif;
}
</style>

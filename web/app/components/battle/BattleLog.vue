<template>
  <section class="log">
    <header class="log__head">
      <span class="log__title">Journal</span>
      <span class="log__live">{{ battle.ended ? 'terminé' : '● en direct' }}</span>
    </header>
    <div ref="scroller" class="log__body">
      <div v-for="section in sections" :id="`tour-${section.turn}`" :key="section.turn" class="log__section">
        <span class="log__turn">{{ section.turn ? `Tour ${section.turn}` : 'Début du combat' }}</span>
        <div v-for="(line, index) in section.lines" :key="index" class="log__line">
          <span class="log__icon" :style="{ background: KINDS[line.kind].color }">{{ KINDS[line.kind].icon }}</span>
          <span class="log__text" :class="{ 'log__text--strong': line.kind === 'faint' || line.kind === 'win' }">{{ line.text }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BattleState, LogKind } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState }>()
const scroller = ref<HTMLElement>()

const KINDS: Record<LogKind, { icon: string, color: string }> = {
  move: { icon: '»', color: '#3d6fc8' },
  damage: { icon: '−', color: '#c8463a' },
  heal: { icon: '+', color: '#2f8a4a' },
  switch: { icon: '⇄', color: '#7a5ab0' },
  faint: { icon: '✕', color: '#1d1d1d' },
  status: { icon: '!', color: '#e0702c' },
  boost: { icon: '▲', color: '#2f8a8a' },
  unboost: { icon: '▼', color: '#a8583a' },
  field: { icon: '☂', color: '#3f8fa3' },
  info: { icon: 'i', color: '#5a6478' },
  win: { icon: '★', color: '#d89a10' },
}

const sections = computed(() => props.battle.log.filter(section => section.lines.length || section.turn === props.battle.turn))
const lineCount = computed(() => props.battle.log.reduce((total, section) => total + section.lines.length, 0))

watch(lineCount, async () => {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
})
</script>

<style scoped>
.log {
  flex: 1;
  min-height: 200px;
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log__head {
  flex: none;
  height: 34px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  display: flex;
  align-items: center;
  gap: 8px;
}

.log__title { flex: 1; font: 700 16px 'Pixelify Sans', sans-serif; }
.log__live { font: 700 12px 'Atkinson Hyperlegible', sans-serif; }

.log__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log__section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.log__turn {
  align-self: flex-start;
  height: 20px;
  padding: 0 8px;
  border-radius: 4px;
  background: var(--chip);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.log__line {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 7px;
  align-items: start;
  animation: pop .2s both;
}

.log__icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: #fff;
  display: grid;
  place-items: center;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
}

.log__text { font: 400 13px/1.4 'Atkinson Hyperlegible', sans-serif; }
.log__text--strong { font-weight: 700; }
</style>

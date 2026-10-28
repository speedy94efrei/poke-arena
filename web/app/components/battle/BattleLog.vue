<template>
  <section class="log" aria-label="Journal du combat">
    <header class="log__head">
      <span class="log__title">Journal</span>
      <span class="log__live">{{ battle.ended ? 'Combat terminé' : focus ? `Tour ${focus}` : '● En direct' }}</span>
    </header>
    <div class="log__tools">
      <div class="filters" role="radiogroup" aria-label="Filtrer le journal">
        <button v-for="entry in FILTERS" :key="entry.id" type="button" role="radio" class="filter" :class="{ 'filter--on': filter === entry.id }" :aria-checked="filter === entry.id" @click="filter = entry.id">{{ entry.label }}</button>
      </div>
      <div v-if="battle.turn" class="chips">
        <button
          v-for="chip in chips"
          :key="chip.turn"
          type="button"
          class="chip"
          :class="{ 'chip--on': chip.turn === (focus || battle.turn) }"
          :title="chip.title"
          @click="goTo(chip.turn)"
        >
          {{ chip.turn }}<span class="chip__dot" :style="{ background: chip.dot }" />
        </button>
      </div>
    </div>
    <div ref="scroller" class="log__body">
      <div v-for="section in sections" :key="section.turn" :data-turn="section.turn" class="section" :class="{ 'section--focus': section.turn === focus }">
        <div class="section__head">
          <span class="section__turn" :class="{ 'section__turn--now': section.turn === battle.turn && !battle.ended }">{{ section.turn ? `Tour ${section.turn}` : 'Début' }}</span>
          <span class="section__rule" />
        </div>
        <div v-for="(line, index) in section.lines" :key="index" class="line">
          <span class="line__icon" :style="{ background: KINDS[line.kind].color }">{{ KINDS[line.kind].icon }}</span>
          <span class="line__text" :class="{ 'line__text--strong': STRONG.includes(line.kind) }">{{ line.text }}</span>
        </div>
      </div>
      <p v-if="!sections.length" class="log__empty">Rien à afficher pour ce filtre.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BattleState, LogKind } from '~/utils/battleTracker'

type Filter = 'tout' | 'attaques' | 'changements' | 'terrain' | 'ko'

const props = defineProps<{ battle: BattleState }>()
const scroller = ref<HTMLElement>()
const filter = ref<Filter>('tout')
const focus = ref(0)

const KINDS: Record<LogKind, { icon: string, color: string }> = {
  move: { icon: '⚔', color: '#7058c0' },
  damage: { icon: '−', color: '#e0334a' },
  heal: { icon: '+', color: '#2f9a58' },
  switch: { icon: '⇄', color: '#5c86ff' },
  faint: { icon: '✕', color: '#1d1846' },
  status: { icon: '!', color: '#e0702c' },
  boost: { icon: '▲', color: '#2f8a8a' },
  unboost: { icon: '▼', color: '#a8583a' },
  field: { icon: '☂', color: '#2980ef' },
  hazard: { icon: '▲', color: '#a08a5a' },
  crit: { icon: '!!', color: '#f5b400' },
  item: { icon: '◎', color: '#ff8000' },
  info: { icon: 'i', color: '#5a6478' },
  win: { icon: '★', color: '#d89a10' },
}
const FILTERS: { id: Filter, label: string }[] = [
  { id: 'tout', label: 'Tout' }, { id: 'attaques', label: 'Attaques' }, { id: 'changements', label: 'Changements' },
  { id: 'terrain', label: 'Terrain' }, { id: 'ko', label: 'K.O.' },
]
const KEEP: Record<Filter, LogKind[] | null> = {
  tout: null,
  attaques: ['move', 'damage', 'crit', 'heal', 'item', 'status', 'boost', 'unboost'],
  changements: ['switch'],
  terrain: ['field', 'hazard'],
  ko: ['faint', 'win'],
}
const STRONG: LogKind[] = ['faint', 'win', 'crit']
/** Point de couleur des tours marquants, du plus important au moins important. */
const MARKS: [LogKind, string][] = [['faint', '#1d1846'], ['crit', '#ffd000'], ['hazard', '#a08a5a'], ['switch', '#5c86ff'], ['field', '#2980ef']]

const sections = computed(() => {
  const keep = KEEP[filter.value]
  return props.battle.log
    .map(section => ({ turn: section.turn, lines: keep ? section.lines.filter(line => keep.includes(line.kind)) : section.lines }))
    .filter(section => section.lines.length || (!keep && section.turn === props.battle.turn))
})

const chips = computed(() => props.battle.log.filter(section => section.turn > 0).map((section) => {
  const mark = MARKS.find(([kind]) => section.lines.some(line => line.kind === kind))
  const ko = section.lines.filter(line => line.kind === 'faint').length
  return { turn: section.turn, dot: mark?.[1] ?? 'transparent', title: `Tour ${section.turn}${ko ? ` · ${ko} K.O.` : ''}` }
}))

const lineCount = computed(() => props.battle.log.reduce((total, section) => total + section.lines.length, 0))

const goTo = async (turn: number) => {
  focus.value = turn === props.battle.turn ? 0 : turn
  filter.value = 'tout'
  await nextTick()
  const target = scroller.value?.querySelector<HTMLElement>(`[data-turn="${turn}"]`)
  if (target && scroller.value) scroller.value.scrollTo({ top: target.offsetTop - scroller.value.offsetTop - 6, behavior: 'smooth' })
}

watch(lineCount, async () => {
  if (focus.value) return
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
})
</script>

<style scoped>
.log { min-height: 0; background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); display: flex; flex-direction: column; overflow: hidden; }

.log__head {
  flex: none;
  height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log__title { font: 600 16px 'Pixelify Sans', sans-serif; text-shadow: var(--hdSh, none); }
.log__live { font: 700 11px 'Nunito', sans-serif; }
.log__tools { flex: none; padding: 10px 12px 8px; display: flex; flex-direction: column; gap: 8px; }
.filters { display: flex; flex-wrap: wrap; gap: 4px; }

.filter {
  border: 0;
  cursor: pointer;
  height: 26px;
  padding: 0 9px;
  border-radius: 5px;
  background: var(--chip);
  color: var(--tx);
  font: 600 13px 'Pixelify Sans', sans-serif;
}

.filter--on { background: var(--hd); color: var(--hdTx); }
.chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(24px, 1fr)); gap: 3px; max-height: 70px; overflow-y: auto; }

.chip {
  border: 0;
  cursor: pointer;
  height: 32px;
  padding: 0;
  border-radius: 5px;
  background: var(--chip);
  color: var(--tx);
  font: 600 12px 'Pixelify Sans', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.chip--on { background: var(--sel); color: var(--selTx); }
.chip__dot { width: 6px; height: 6px; }
.log__body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 12px; display: flex; flex-direction: column; gap: 10px; }
.section { display: flex; flex-direction: column; gap: 5px; border-radius: 8px; }
.section--focus { padding: 8px; background: color-mix(in srgb, var(--sel) 22%, transparent); }
.section__head { display: flex; align-items: center; gap: 8px; }
.section__turn { height: 20px; padding: 0 8px; border-radius: 4px; background: var(--chip); color: var(--mu); font: 600 12px 'Pixelify Sans', sans-serif; display: flex; align-items: center; }
.section__turn--now { background: var(--sel); color: var(--selTx); }
.section__rule { flex: 1; height: 2px; background: var(--chip); }
.line { display: grid; grid-template-columns: 22px 1fr; gap: 8px; align-items: start; animation: pop .25s both; }
.line__icon { width: 22px; height: 22px; border-radius: 5px; color: #fff; display: grid; place-items: center; font: 600 11px 'Pixelify Sans', sans-serif; }
.line__text { font: 400 13px/1.4 'Nunito', sans-serif; }
.line__text--strong { font-weight: 800; }
.log__empty { margin: 0; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
</style>

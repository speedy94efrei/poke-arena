<template>
  <section class="terrain" aria-label="État du terrain">
    <header class="terrain__head">État du terrain</header>
    <div class="terrain__body">
      <div v-for="row in globals" :key="row.label" class="global" :class="{ 'global--off': row.off }">
        <span class="global__icon" :style="{ background: row.color }">{{ row.icon }}</span>
        <span class="global__text"><b>{{ row.label }}</b><span>{{ row.detail }}</span></span>
        <span v-if="row.pips" class="global__pips">
          <span v-for="index in row.pips.total" :key="index" class="global__pip" :style="{ background: index <= row.pips.left ? row.color : 'var(--chip)' }" />
        </span>
      </div>
      <div v-for="box in sides" :key="box.label" class="side" :style="{ borderColor: box.color }">
        <div class="side__head"><span :style="{ color: box.color }">{{ box.label }}</span><span>{{ box.cost }}</span></div>
        <div v-for="item in box.items" :key="item.label" class="side__item">
          <span class="side__icon" :style="{ background: item.color }">{{ item.icon }}</span>
          <span class="side__name">{{ item.label }}</span>
          <span class="side__value">{{ item.value }}</span>
        </div>
        <span v-if="!box.items.length" class="side__none">Rien de posé</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BattleState, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState }>()

const WEATHER_INFO: Record<string, { icon: string, color: string, effect: string }> = {
  raindance: { icon: '☂', color: '#2980ef', effect: 'Eau ×1,5, Feu ×0,5' },
  primordialsea: { icon: '☂', color: '#2060c0', effect: 'Eau ×1,5, attaques Feu annulées' },
  sunnyday: { icon: '☀', color: '#e8a020', effect: 'Feu ×1,5, Eau ×0,5' },
  desolateland: { icon: '☀', color: '#e06010', effect: 'Feu ×1,5, attaques Eau annulées' },
  sandstorm: { icon: '≋', color: '#b8a070', effect: 'Roche : Déf. Spé. ×1,5 · 1/16 des PV par tour' },
  snow: { icon: '❄', color: '#60c8e8', effect: 'Glace : Déf ×1,5' },
  snowscape: { icon: '❄', color: '#60c8e8', effect: 'Glace : Déf ×1,5' },
  hail: { icon: '❄', color: '#60c8e8', effect: '1/16 des PV par tour sauf Glace' },
  deltastream: { icon: '≈', color: '#7aa0c0', effect: 'Le type Vol ne craint plus rien' },
}
const FIELD_INFO: Record<string, { icon: string, color: string, effect: string, turns: number }> = {
  electricterrain: { icon: 'ϟ', color: '#e0a800', effect: 'Électrik ×1,3 · pas de sommeil au sol', turns: 5 },
  grassyterrain: { icon: '♣', color: '#3fa129', effect: 'Plante ×1,3 · soin 1/16 par tour au sol', turns: 5 },
  psychicterrain: { icon: '✺', color: '#ef4179', effect: 'Psy ×1,3 · pas de priorité au sol', turns: 5 },
  mistyterrain: { icon: '✿', color: '#ef70ef', effect: 'Dragon ×0,5 · pas de statut au sol', turns: 5 },
  trickroom: { icon: '⇅', color: '#9050c0', effect: 'Les plus lents agissent en premier', turns: 5 },
  gravity: { icon: '⬇', color: '#706080', effect: 'Plus de lévitation, précision augmentée', turns: 5 },
  magicroom: { icon: '◇', color: '#a070c0', effect: 'Les objets ne font plus rien', turns: 5 },
  wonderroom: { icon: '◇', color: '#a070c0', effect: 'Déf et Déf. Spé. échangées', turns: 5 },
}
const SCREENS: Record<string, number> = { reflect: 5, lightscreen: 5, auroraveil: 5, tailwind: 4, safeguard: 5, mist: 5, luckychant: 5 }
const SPIKES = [0, 12, 17, 25]

const turnsLeft = (since: number, total: number) => Math.max(1, total - (props.battle.turn - since))

const globals = computed(() => {
  const rows: { label: string, detail: string, icon: string, color: string, off?: boolean, pips?: { left: number, total: number } }[] = []
  const weather = props.battle.weather
  if (weather) {
    const info = WEATHER_INFO[weather] ?? { icon: '☁', color: '#7a8aa0', effect: '' }
    const total = props.battle.weatherTurns
    const left = total ? turnsLeft(props.battle.weatherSince, total) : null
    const remaining = left ? `${left} tour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}` : total === null && ['primordialsea', 'desolateland', 'deltastream'].includes(weather) ? 'tant que le poseur reste' : `${turnsLeft(props.battle.weatherSince, 5)} à ${turnsLeft(props.battle.weatherSince, 8)} tours restants`
    rows.push({ label: WEATHERS[weather]?.nom ?? weather, detail: `${remaining} · ${info.effect}`, icon: info.icon, color: info.color, pips: left && total ? { left, total } : undefined })
  } else {
    rows.push({ label: 'Pas de météo', detail: 'Aucun bonus de type', icon: '☁', color: '#7a8aa0', off: true })
  }
  const fields = props.battle.fieldEffects.filter(effect => FIELD_INFO[effect])
  for (const effect of fields) {
    const info = FIELD_INFO[effect]!
    const left = turnsLeft(props.battle.fieldSince[effect] ?? props.battle.turn, info.turns)
    rows.push({ label: FIELD_EFFECTS[effect] ?? effect, detail: `${left} tour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''} · ${info.effect}`, icon: info.icon, color: info.color, pips: { left, total: info.turns } })
  }
  if (!fields.length) rows.push({ label: 'Champ · Distorsion', detail: 'Aucun champ · Distorsion inactive', icon: '◇', color: '#7a8aa0', off: true })
  return rows
})

const box = (side: SideId, label: string, color: string) => {
  const data = props.battle.sides[side]
  let cost = 0
  const items = Object.entries(data.conditions).map(([id, layers]) => {
    const info = SIDE_CONDITIONS[id] ?? { nom: effectName(id), couleur: '#5a6478', icone: '•' }
    const name = layers > 1 ? `${info.nom} ×${layers}` : info.nom
    let value = ''
    if (id === 'stealthrock') {
      cost += 12
      value = '−12 %'
    } else if (id === 'spikes') {
      cost += SPIKES[Math.min(3, layers)]!
      value = `−${SPIKES[Math.min(3, layers)]} %`
    } else if (id === 'toxicspikes') {
      value = layers > 1 ? 'Poison grave' : 'Poison'
    } else if (id === 'stickyweb') {
      value = 'Vit −1'
    } else if (SCREENS[id]) {
      const left = turnsLeft(data.since[id] ?? props.battle.turn, SCREENS[id]!)
      value = `${left} tour${left > 1 ? 's' : ''}`
    }
    return { label: name, value, icon: info.icone, color: info.couleur }
  })
  return { label, color, items, cost: cost ? `Entrée : −${cost} %` : '' }
}

const sides = computed(() => {
  const mine: SideId = props.battle.mySide ?? 'p1'
  const theirs: SideId = mine === 'p1' ? 'p2' : 'p1'
  return [box(theirs, props.battle.mySide ? 'Côté adverse' : props.battle.sides[theirs].name, '#d84838'), box(mine, props.battle.mySide ? 'Ton côté' : props.battle.sides[mine].name, '#3a7fd0')]
})
</script>

<style scoped>
.terrain { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; flex: none; }

.terrain__head {
  height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 16px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
}

.terrain__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 7px; }
.global { display: flex; align-items: center; gap: 10px; }
.global--off { opacity: .55; }
.global__icon { flex: none; width: 28px; height: 28px; border-radius: 7px; color: #fff; display: grid; place-items: center; font: 700 15px 'Pixelify Sans', sans-serif; }
.global__text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.15; font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.global__text b { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--tx); text-shadow: var(--sh); }
.global__pips { display: flex; gap: 3px; }
.global__pip { width: 7px; height: 14px; border-radius: 2px; }
.side { border-left: 5px solid; border-radius: 8px; background: var(--chip); padding: 7px 9px; display: flex; flex-direction: column; gap: 4px; }
.side__head { display: flex; justify-content: space-between; font: 600 14px 'Pixelify Sans', sans-serif; }
.side__head span:last-child { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.side__item { display: flex; align-items: center; gap: 8px; }
.side__icon { flex: none; width: 22px; height: 22px; border-radius: 5px; color: #fff; display: grid; place-items: center; font: 700 12px 'Pixelify Sans', sans-serif; }
.side__name { flex: 1; font: 700 13px 'Atkinson Hyperlegible', sans-serif; }
.side__value { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.side__none { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
</style>

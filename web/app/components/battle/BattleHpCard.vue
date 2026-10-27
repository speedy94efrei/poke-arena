<template>
  <div class="card">
    <div class="card__row">
      <span class="card__name">{{ speciesName(pokemon.speciesId, pokemon.name) }}</span>
      <TypeBadge v-for="type in types" :key="type" :type="type" small />
      <span class="card__spacer" />
      <span class="card__level">N.100</span>
    </div>
    <div class="card__row">
      <span class="card__label">PV</span>
      <div class="card__track">
        <div class="card__bar" :style="{ width: `${percent}%`, background: hpColor(percent) }" />
      </div>
      <span class="card__pct">{{ own ? `${pokemon.hp}/${pokemon.maxHp}` : `${percent} %` }}</span>
    </div>
    <div class="card__row card__row--chips">
      <span v-if="status" class="card__chip" :style="{ background: status.couleur }">{{ status.court }}</span>
      <span v-for="boost in boosts" :key="boost.stat" class="card__chip" :style="{ background: boost.value > 0 ? '#2f8a4a' : '#b8302a' }">
        {{ STAT_SHORT[boost.stat] ?? boost.stat }} {{ boost.value > 0 ? '+' : '' }}{{ boost.value }}
      </span>
    </div>
    <div class="card__info">
      <span>Objet : <b>{{ item }}</b></span>
      <span>Talent : <b>{{ ability }}</b></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattlePokemon, BattleState, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState, side: SideId, pokemon: BattlePokemon }>()

const own = computed(() => props.side === props.battle.mySide)
const fiche = computed(() => findPokemon(props.pokemon.speciesId))
const types = computed(() => fiche.value?.types ?? [])
const percent = computed(() => hpPercent(props.pokemon))
const status = computed(() => STATUS_LABELS[props.pokemon.status])
const boosts = computed(() => Object.entries(props.pokemon.boosts).filter(([, value]) => value).map(([stat, value]) => ({ stat, value })))
const item = computed(() => props.pokemon.item ? itemName(props.pokemon.item) : own.value ? 'aucun' : '?')
const ability = computed(() => props.pokemon.ability ? abilityName(props.pokemon.ability) : fiche.value?.talent.nom ?? '?')
</script>

<style scoped>
.card {
  width: 290px;
  box-sizing: border-box;
  padding: 7px 12px 8px;
  border-radius: var(--r);
  clip-path: var(--cut);
  background: var(--hpB);
  color: var(--hpTx);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .45), 0 0 0 3px var(--bd);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card__row--chips {
  flex-wrap: wrap;
  min-height: 18px;
  gap: 4px;
}

.card__name {
  font: 700 18px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hpSh);
  white-space: nowrap;
}

.card__spacer { flex: 1; }
.card__level { font: 700 14px 'Pixelify Sans', sans-serif; }

.card__label {
  height: 12px;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--hpLb);
  color: #2a2a2a;
  font: 700 10px/12px 'Atkinson Hyperlegible', sans-serif;
}

.card__track {
  position: relative;
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: var(--hpTr);
  overflow: hidden;
  box-shadow: 0 0 0 2px var(--hpTr);
}

.card__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  transition: width .7s steps(14), background .3s;
}

.card__pct {
  font: 700 16px 'Pixelify Sans', sans-serif;
  min-width: 48px;
  text-align: right;
  white-space: nowrap;
}

.card__chip {
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  color: #fff;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.card__info {
  display: flex;
  gap: 10px;
  font: 400 12px 'Atkinson Hyperlegible', sans-serif;
  opacity: .92;
  white-space: nowrap;
  overflow: hidden;
}
</style>

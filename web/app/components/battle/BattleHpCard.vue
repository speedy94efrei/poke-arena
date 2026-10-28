<template>
  <div class="card">
    <div class="card__row">
      <span class="card__name">{{ speciesName(pokemon.speciesId, pokemon.name) }}</span>
      <span class="card__spacer" />
      <span class="card__level">N.{{ pokemon.level }}</span>
    </div>
    <div class="card__row">
      <TypeBadge v-for="type in types" :key="type" :type="type" small />
      <span class="card__spacer" />
      <div class="card__hp">
        <span class="card__label">PV</span>
        <div class="card__track"><div class="card__bar" :style="{ width: `${percent}%`, background: hpColor(percent) }" /></div>
      </div>
    </div>
    <div class="card__row card__row--chips">
      <span class="card__numbers">{{ hpText }} <span>· {{ percent }} %</span></span>
      <span v-if="status" class="card__chip" :style="{ background: status.couleur }">{{ status.court }}</span>
      <span v-for="boost in boosts" :key="boost.stat" class="card__chip" :style="{ background: boost.value > 0 ? '#2f8a4a' : '#b8302a' }">
        {{ boost.value > 0 ? '▲+' : '▼' }}{{ boost.value }} {{ STAT_SHORT[boost.stat] ?? boost.stat }}
      </span>
      <span v-if="tera" class="card__chip card__chip--tera" :style="{ background: tera.color }">◆ {{ tera.label }}</span>
    </div>
    <div class="card__info">
      <span class="card__detail" tabindex="0" @mouseenter="tip = 'item'" @mouseleave="tip = ''" @focus="tip = 'item'" @blur="tip = ''">
        Objet : <b>{{ item.name }}</b>
        <BattleTip v-if="tip === 'item' && item.text" :placement="own ? 'above' : 'below'" :align="own ? 'end' : 'start'">
          <b class="tip-title">{{ item.name }}</b>
          <span>{{ item.text }}</span>
        </BattleTip>
      </span>
      <span class="card__detail" tabindex="0" @mouseenter="tip = 'ability'" @mouseleave="tip = ''" @focus="tip = 'ability'" @blur="tip = ''">
        Talent : <b>{{ ability.name }}</b>
        <BattleTip v-if="tip === 'ability' && ability.text" :placement="own ? 'above' : 'below'" :align="own ? 'end' : 'start'">
          <b class="tip-title">{{ ability.name }}</b>
          <span>{{ ability.text }}</span>
        </BattleTip>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattlePokemon, BattleState, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState, side: SideId, pokemon: BattlePokemon }>()
const calc = inject(BATTLE_CALC)
const tip = ref<'' | 'item' | 'ability'>('')

const pokedraft = computed(() => isPokedraft(props.battle))
const own = computed(() => props.side === props.battle.mySide)
const species = computed(() => speciesView(props.pokemon.speciesId, pokedraft.value))
const types = computed(() => props.pokemon.tera ? [frenchType(props.pokemon.tera)] : species.value.types)
const percent = computed(() => hpPercent(props.pokemon))
const status = computed(() => STATUS_LABELS[props.pokemon.status])
const boosts = computed(() => Object.entries(props.pokemon.boosts).filter(([, value]) => value).map(([stat, value]) => ({ stat, value })))
const set = computed(() => own.value ? null : calc?.setOf(props.pokemon))

const hpText = computed(() => {
  if (props.pokemon.fainted) return 'K.O.'
  if (own.value) return `${props.pokemon.hp}/${props.pokemon.maxHp}`
  const estimate = calc?.estimate(props.pokemon)
  return estimate ? `≈${estimate.hp}/${estimate.max}` : `${percent.value} %`
})

/** Téra : actif, encore possible pour ton Pokémon, ou inconnu pour l'adversaire (9e génération seulement). */
const tera = computed(() => {
  if (props.pokemon.tera) return { label: `Téra ${frenchType(props.pokemon.tera)}`, color: TYPE_COLORS[frenchType(props.pokemon.tera)] ?? '#60a1b8' }
  if (!props.battle.format.startsWith('gen9')) return null
  if (own.value) {
    const index = props.battle.request?.side.pokemon.findIndex(member => member.active && toId(member.details.split(',')[0] ?? '') === props.pokemon.speciesId) ?? -1
    const type = index >= 0 ? props.battle.request?.active?.[index]?.canTerastallize : undefined
    return type ? { label: `Téra ${frenchType(type)} dispo`, color: '#60a1b8' } : null
  }
  return { label: 'Téra ?', color: '#7a8292' }
})

/** Description d'un objet ou d'un talent : fiche PokéDraft, sinon Pokédex. */
const describe = (kind: 'items' | 'abilities', id: string) => {
  if (pokedraft.value && kind === 'abilities') {
    const fiche = findPokemon(props.pokemon.speciesId)
    if (fiche && toId(fiche.talent.id) === id) return fiche.talent.effet
  }
  return currentPokedex()?.[kind][id]?.description ?? ''
}

const item = computed(() => {
  const id = props.pokemon.item || set.value?.item || ''
  if (!id) return { name: own.value ? 'aucun' : '?', text: own.value ? '' : "Pas encore révélé : il apparaîtra quand l'objet servira." }
  const name = itemName(id)
  if (!props.pokemon.item) return { name: `${name} ?`, text: `Probable d'après ${pokedraft.value ? 'sa fiche' : 'les statistiques du format'}. ${describe('items', id)}` }
  return { name, text: describe('items', id) }
})

const ability = computed(() => {
  const id = props.pokemon.ability || ''
  if (id) return { name: abilityName(id), text: describe('abilities', id) }
  if (species.value.abilities.length === 1) return { name: species.value.abilities[0]!, text: describe('abilities', toId(species.value.abilities[0]!)) }
  const probable = set.value?.ability
  if (probable) return { name: `${abilityName(probable)} ?`, text: `Probable, pas encore révélé. Possibles : ${species.value.abilities.join(', ')}. ${describe('abilities', probable)}` }
  return { name: '?', text: species.value.abilities.length ? `Possibles : ${species.value.abilities.join(', ')}.` : '' }
})
</script>

<style scoped>
.card {
  width: 300px;
  box-sizing: border-box;
  padding: 7px 14px 8px;
  border-radius: var(--r);
  clip-path: var(--cut);
  background: var(--hpB);
  color: var(--hpTx);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .45), 0 0 0 3px var(--bd);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.card:has(.card__detail:hover), .card:has(.card__detail:focus) { clip-path: none; }
.card__row { display: flex; align-items: center; gap: 6px; }
.card__row--chips { flex-wrap: wrap; gap: 4px; }
.card__name { font: 700 19px 'Pixelify Sans', sans-serif; text-shadow: var(--hpSh); white-space: nowrap; }
.card__spacer { flex: 1; }
.card__level { font: 700 14px 'Pixelify Sans', sans-serif; }
.card__hp { width: 170px; height: 14px; border-radius: 7px; background: var(--hpTr); padding: 2px 3px 2px 2px; box-sizing: border-box; display: flex; align-items: center; gap: 4px; }
.card__label { height: 10px; padding: 0 4px; border-radius: 5px; background: var(--hpLb); color: #2a2a2a; font: 700 9px/10px 'Pixelify Sans', sans-serif; }
.card__track { position: relative; flex: 1; height: 7px; border-radius: 4px; background: #5a5a5a; overflow: hidden; }
.card__bar { position: absolute; left: 0; top: 0; bottom: 0; transition: width .7s steps(14), background .3s; box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .18); }
.card__numbers { margin-right: auto; font: 600 15px 'Pixelify Sans', sans-serif; text-shadow: var(--hpSh); white-space: nowrap; }
.card__numbers span { opacity: .7; }

.card__chip {
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  color: #fff;
  font: 600 11px 'Pixelify Sans', sans-serif;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.card__info { display: flex; gap: 10px; font: 700 11px 'Nunito', sans-serif; opacity: .9; white-space: nowrap; }
.card__detail { position: relative; cursor: help; outline: none; border-bottom: 1px dotted currentColor; }
.tip-title { font: 600 16px 'Pixelify Sans', sans-serif; }
</style>

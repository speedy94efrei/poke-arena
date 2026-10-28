<template>
  <section v-if="foe" class="set" :aria-label="`Set probable de ${name}`">
    <header class="set__head"><span>Set probable · {{ name }}</span><span class="set__source">{{ source }}</span></header>
    <div class="set__body">
      <div v-for="row in rows" :key="row.label" class="row" :class="{ 'row--seen': row.seen }">
        <span class="row__mark">{{ row.seen ? '✓' : '◇' }}</span>
        <span class="row__label">{{ row.label }}</span>
        <span class="row__track"><span class="row__fill" :style="{ width: `${row.share * 100}%`, background: row.seen ? '#58d080' : 'var(--sel)' }" /></span>
        <span class="row__value">{{ row.seen ? 'vu' : row.share ? percent(row.share) : '' }}</span>
      </div>
      <span class="set__note">✓ révélé pendant le combat · % = part des sets joués {{ formatShort }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BattleState, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState, side: SideId }>()
const calc = inject(BATTLE_CALC)

const foe = computed(() => activePokemons(props.battle, props.side).find(pokemon => !pokemon.fainted))
const name = computed(() => foe.value ? speciesName(foe.value.speciesId, foe.value.name) : '')
const entry = computed(() => foe.value ? calc?.usage.value?.pokemon.find(candidate => candidate.id === foe.value!.speciesId) : undefined)
/** Format des statistiques : celui du combat, ou celui dont il les emprunte (l'OU pour le Combat à budget). */
const usageName = computed(() => {
  const source = usageFormat(props.battle.format)
  return source && source !== props.battle.format ? formatIdLabel(source).split(' · ')[0] : formatLabel(props.battle.formatName).split(' · ')[0]
})
const formatShort = computed(() => props.battle.formatName ? `en ${usageName.value}` : '')
const source = computed(() => isPokedraft(props.battle) ? 'fiche PokéDraft' : entry.value ? `usage ${usageName.value}, estimé` : 'set inconnu')

const rows = computed(() => {
  const pokemon = foe.value
  if (!pokemon) return []
  const set = calc?.setOf(pokemon)
  const moveShares = new Map(entry.value?.moves ?? [])
  const moveRows = [...new Set([...pokemon.moves, ...(entry.value?.moves ?? []).map(([id]) => id).filter(id => id && id !== 'nothing')])]
    .slice(0, Math.max(4, pokemon.moves.length))
    .map(id => ({ label: moveName(id), share: moveShares.get(id) ?? (pokemon.moves.includes(id) ? 1 : 0), seen: pokemon.moves.includes(id) }))
  const ability = pokemon.ability || set?.ability
  const abilityShare = entry.value?.abilities.find(([id]) => id === ability)?.[1] ?? 0
  const item = pokemon.item || set?.item
  const itemShare = entry.value?.items.find(([id]) => id === item)?.[1] ?? 0
  const extra = [
    ability ? { label: `${abilityName(ability)} (talent)`, share: pokemon.ability ? 1 : abilityShare, seen: Boolean(pokemon.ability) } : null,
    item ? { label: `${itemName(item)} (objet)`, share: pokemon.item ? 1 : itemShare, seen: Boolean(pokemon.item) } : null,
    entry.value?.tera[0] && !pokemon.tera ? { label: `Téra ${frenchType(entry.value.tera[0][0])}`, share: entry.value.tera[0][1], seen: false } : null,
    pokemon.tera ? { label: `Téra ${frenchType(pokemon.tera)}`, share: 1, seen: true } : null,
  ].filter((row): row is { label: string, share: number, seen: boolean } => Boolean(row))
  return [...moveRows, ...extra]
})
</script>

<style scoped>
.set { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; flex: none; }

.set__head {
  min-height: 32px;
  padding: 4px 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 8px;
}

.set__head span:first-child { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.set__source { flex: none; font: 700 10px 'Nunito', sans-serif; text-shadow: none; opacity: .9; }
.set__body { padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 4px; }
.row { display: grid; grid-template-columns: 14px minmax(0, 1fr) 54px 34px; gap: 6px; align-items: center; font: 700 12px 'Nunito', sans-serif; }
.row__mark { color: var(--mu); }
.row--seen .row__mark { color: var(--good); }
.row__label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row__track { height: 6px; border-radius: 3px; background: var(--in); overflow: hidden; }
.row__fill { display: block; height: 100%; }
.row__value { font: 600 11px 'Pixelify Sans', sans-serif; text-align: right; color: var(--mu); }
.set__note { font: 700 10px 'Nunito', sans-serif; color: var(--mu); }
</style>

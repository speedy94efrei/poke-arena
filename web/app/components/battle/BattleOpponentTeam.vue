<template>
  <section class="opp" aria-label="Équipe adverse">
    <header class="opp__head"><span>Équipe adverse</span><span class="opp__summary">{{ summary }}</span></header>
    <div class="opp__grid">
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        tabindex="0"
        class="tile"
        @mouseenter="hovered = index"
        @mouseleave="hovered = -1"
        @focus="hovered = index"
        @blur="hovered = -1"
      >
        <div class="tile__bg" :style="{ background: tile.background, filter: tile.fainted ? 'grayscale(1) brightness(.7)' : 'none', boxShadow: tile.active ? '0 0 0 3px var(--sel)' : '0 0 0 2px var(--bd)' }" />
        <span v-if="tile.speciesId" class="tile__sprite" :style="{ backgroundImage: `url(${spriteUrl(tile.speciesId)})`, filter: tile.fainted ? 'grayscale(1)' : 'none' }" />
        <span class="tile__tag" :style="{ background: tile.tag.bg, color: tile.tag.fg }">{{ tile.tag.label }}</span>
        <span class="tile__name">{{ tile.name }}</span>
        <BattleTip v-if="hovered === index" placement="right">
          <div class="tip-head"><b>{{ tile.name }}</b><span>{{ tile.tag.label }}</span></div>
          <div v-if="tile.types.length" class="tip-types">
            <TypeBadge v-for="type in tile.types" :key="type" :type="type" small />
          </div>
          <div v-for="row in tile.rows" :key="row.k" class="tip-row"><span>{{ row.k }}</span><span>{{ row.v }}</span></div>
        </BattleTip>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BattlePokemon, BattleState, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState, side: SideId }>()
const calc = inject(BATTLE_CALC)
const hovered = ref(-1)

const TAGS = {
  ko: { label: 'K.O.', bg: '#e04838', fg: '#fff' },
  active: { label: '● Actif', bg: '#f8d030', fg: '#383838' },
  seen: { label: 'Vu', bg: '#fff', fg: '#383838' },
  preview: { label: 'Aperçu', bg: 'rgba(255,255,255,.75)', fg: '#383838' },
  unknown: { label: '?', bg: '#fff', fg: '#6a6a6a' },
}

const pokedraft = computed(() => isPokedraft(props.battle))
const team = computed(() => props.battle.sides[props.side].team)
/** Taille de l'équipe : le serveur ne l'envoie qu'au début du combat ; pendant l'aperçu, ce sont les Pokémon montrés. */
const size = computed(() => Math.max(props.battle.sides[props.side].size ?? (team.value.length || 6), team.value.length))

const rowsOf = (member: BattlePokemon) => {
  const set = calc?.setOf(member)
  const estimate = calc?.estimate(member)
  const seen = member.moves.map(moveName)
  const probable = (calc?.usage.value?.pokemon.find(entry => entry.id === member.speciesId)?.moves ?? [])
    .filter(([id]) => id && id !== 'nothing' && !member.moves.includes(id)).slice(0, 4 - Math.min(4, member.moves.length))
    .map(([id, share]) => `${moveName(id)} ${percent(share)}`)
  const rows = [
    { k: 'PV', v: member.fainted ? 'K.O.' : `${hpPercent(member)} %${estimate ? ` · ≈ ${estimate.hp}/${estimate.max}` : ''}` },
    { k: 'Objet', v: member.item ? itemName(member.item) : set?.item ? `${itemName(set.item)} ? (probable)` : 'pas encore vu' },
    { k: 'Talent', v: member.ability ? abilityName(member.ability) : set?.ability ? `${abilityName(set.ability)} ? (probable)` : '?' },
    { k: 'Attaques', v: seen.length ? seen.join(', ') : 'aucune révélée' },
  ]
  if (probable.length) rows.push({ k: 'Probables', v: probable.join(', ') })
  if (member.status) rows.push({ k: 'Statut', v: STATUS_LABELS[member.status]?.inflige ?? member.status })
  if (member.tera) rows.push({ k: 'Téra', v: frenchType(member.tera) })
  return rows
}

const tiles = computed(() => Array.from({ length: size.value }, (_, index) => {
  const member = team.value[index]
  if (!member) return { name: 'Non révélé', speciesId: '', tag: TAGS.unknown, types: [], rows: [{ k: 'Révélé', v: "Rien pour l'instant" }], background: 'repeating-linear-gradient(135deg, var(--chip) 0 6px, var(--in) 6px 12px)', fainted: false, active: false }
  const types = speciesView(member.speciesId, pokedraft.value).types
  const tag = member.fainted ? TAGS.ko : member.active ? TAGS.active : member.revealed ? TAGS.seen : TAGS.preview
  const color = TYPE_COLORS[types[0] ?? 'Normal'] ?? '#555'
  return {
    name: speciesName(member.speciesId, member.name), speciesId: member.speciesId, tag, types, rows: rowsOf(member),
    background: `linear-gradient(180deg, rgba(0, 0, 0, .05), rgba(0, 0, 0, .5)), ${habitatBackground(types[0]) || color}`, fainted: member.fainted, active: member.active,
  }
}))

const summary = computed(() => {
  const alive = team.value.filter(member => !member.fainted).length + Math.max(0, size.value - team.value.length)
  const unknown = Math.max(0, size.value - team.value.filter(member => member.revealed || member.speciesId).length)
  return `${alive} / ${size.value} en jeu${unknown ? ` · ${unknown} inconnu${unknown > 1 ? 's' : ''}` : ''}`
})
</script>

<style scoped>
.opp { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); flex: none; position: relative; z-index: 5; }

.opp__head {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--r) var(--r) 0 0;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 16px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.opp__summary { font: 700 11px 'Nunito', sans-serif; text-shadow: none; }
.opp__grid { padding: 10px 12px 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.tile { position: relative; height: 60px; outline: none; cursor: default; }
.tile__bg { position: absolute; inset: 0; border-radius: 8px; }
.tile__sprite { position: absolute; right: 0; top: -6px; width: 52px; height: 52px; background: center / contain no-repeat; image-rendering: pixelated; }
.tile__tag { position: absolute; left: 4px; top: 4px; height: 16px; padding: 0 5px; border-radius: 4px; font: 600 11px 'Pixelify Sans', sans-serif; display: flex; align-items: center; }
.tile__name { position: absolute; left: 5px; right: 4px; bottom: 3px; font: 600 12px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 1px 1px 0 #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tip-head { display: flex; align-items: center; gap: 8px; }
.tip-head b { flex: 1; font: 600 18px 'Pixelify Sans', sans-serif; }
.tip-head span { font-size: 11px; color: var(--mu); }
.tip-types { display: flex; gap: 4px; }
.tip-row { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 8px; }
.tip-row span:first-child { color: var(--mu); }
</style>

<template>
  <CodexBlock title="Attaques">
    <div class="slots">
      <div
        v-for="(slot, index) in slots"
        :key="index"
        class="slot"
        :class="{ 'slot--active': index === activeSlot }"
      >
        <button
          type="button"
          class="slot__pick"
          :aria-pressed="index === activeSlot"
          @click="activeSlot = index"
          @mouseenter="event => slot.move && show(event, slot.move.id, pokemon.id)"
          @mouseleave="hide"
        >
          <span class="slot__number">{{ index + 1 }}</span>
          <span class="slot__text">
            <span class="slot__name">{{ slot.move?.nom ?? (slot.id ? moveName(slot.id) : 'Vide') }}</span>
            <span class="slot__sub">{{ slot.sub }}</span>
          </span>
          <span v-if="slot.move" class="slot__type" :style="{ background: TYPE_COLORS[slot.move.type] }" />
        </button>
        <button v-if="slot.id" type="button" class="slot__clear" :aria-label="`Vider l'emplacement ${index + 1}`" @click="clear(index)">✕</button>
      </div>
    </div>
    <span class="hint">Emplacement {{ activeSlot + 1 }} sélectionné : choisis une attaque ci-dessous.</span>
    <div class="filters">
      <input v-model="query" class="filters__search" placeholder="Chercher" aria-label="Chercher une attaque">
      <select v-model="type" class="filters__select" aria-label="Type">
        <option value="">Type</option>
        <option v-for="value in types" :key="value" :value="value">{{ value }}</option>
      </select>
      <select v-model="categorie" class="filters__select" aria-label="Catégorie">
        <option value="">Catégorie</option>
        <option v-for="(label, value) in CATEGORY_LABELS" :key="value" :value="value">{{ label }}</option>
      </select>
    </div>
    <div class="pool">
      <button
        v-for="row in pool"
        :key="row.move.id"
        type="button"
        class="move"
        :class="{ 'move--used': row.used || row.ban, 'move--signature': row.signature }"
        :aria-disabled="row.used || Boolean(row.ban)"
        :title="row.ban"
        @click="pick(row.move.id, row.used || Boolean(row.ban))"
        @mouseenter="event => show(event, row.move.id, pokemon.id)"
        @mouseleave="hide"
        @focus="event => show(event, row.move.id, pokemon.id)"
        @blur="hide"
      >
        <span class="move__name">
          <span class="move__label" :class="{ 'move__label--stab': row.stab }">{{ row.move.nom }}</span>
          <span v-for="badge in row.badges" :key="badge.label" class="move__badge" :style="{ background: badge.bg, color: badge.fg }">{{ badge.label }}</span>
        </span>
        <span class="move__type" :style="{ background: TYPE_COLORS[row.move.type] }">{{ row.move.type }}</span>
        <span class="move__cat" :title="CATEGORY_LABELS[row.move.categorie]" :style="categoryShape(row.move.categorie)" />
        <span class="move__num">{{ powerText(row.move, row.signature ? pokemon.signature.coups : null) }}</span>
        <span class="move__num">{{ row.move.precision ?? '∞' }}</span>
        <span class="move__num move__num--muted">{{ row.move.pp ?? '?' }}</span>
      </button>
      <p v-if="!pool.length" class="none">Aucune attaque ne correspond.</p>
    </div>
  </CodexBlock>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { Variante } from '~/utils/atelier'

const props = defineProps<{ pokemon: Pokemon, variant: Variante }>()
const emit = defineEmits<{ update: [patch: Partial<Variante>] }>()
const { show, hide } = useMoveTip()

const activeSlot = ref(0)
const query = ref('')
const type = ref('')
const categorie = ref('')

const slots = computed(() => props.variant.attaquesIds.map((id) => {
  const move = id ? roster.attaques[id] : undefined
  let sub = 'Choisis une attaque'
  if (move) sub = `${move.type} · ${CATEGORY_LABELS[move.categorie]} · PP ${ppText(move.pp)}${move.id === props.pokemon.signatureId ? ' · signature' : ''}`
  if (id && !props.pokemon.movepool.includes(id)) sub = 'Hors movepool : remplace-la'
  else if (id && banReason(props.pokemon.id, id)) sub = 'Interdite dans le format : remplace-la'
  return { id, move, sub }
}))

const moves = computed(() => {
  const signature = props.pokemon.signatureId
  const ids = [signature, ...props.pokemon.movepool.filter(id => id !== signature)]
  return ids.map(id => roster.attaques[id]).filter(move => move !== undefined)
})

const types = computed(() => [...new Set(moves.value.map(move => move.type))].sort((a, b) => a.localeCompare(b, 'fr')))

const pool = computed(() => {
  const words = plainText(query.value)
  return moves.value
    .filter(move => (!words || plainText(move.nom).includes(words)) && (!type.value || move.type === type.value)
      && (!categorie.value || move.categorie === categorie.value))
    .map((move) => {
      const signature = move.id === props.pokemon.signatureId
      const badges = []
      if (signature) badges.push({ label: 'SIGNATURE · optionnelle', bg: 'var(--uA)', fg: 'var(--uAtx)' })
      if (props.pokemon.ajoutsMovepoolIds.includes(move.id)) badges.push({ label: '+ AJOUT', bg: '#48c070', fg: '#062010' })
      if (move.origine === 'officielle modifiée') badges.push({ label: '✎', bg: '#e8704a', fg: '#1a0a00' })
      const ban = banReason(props.pokemon.id, move.id)
      if (ban) badges.push({ label: '⛔ INTERDITE', bg: '#c8362a', fg: '#fff' })
      return { move, signature, badges, ban, stab: isStab(props.pokemon, move), used: props.variant.attaquesIds.includes(move.id) }
    })
})

const pick = (id: string, used: boolean) => {
  if (used) return
  const attaquesIds = [...props.variant.attaquesIds]
  attaquesIds[activeSlot.value] = id
  emit('update', { attaquesIds })
  activeSlot.value = Math.min(MOVE_SLOTS - 1, activeSlot.value + 1)
}

const clear = (index: number) => {
  const attaquesIds = [...props.variant.attaquesIds]
  attaquesIds[index] = null
  emit('update', { attaquesIds })
  activeSlot.value = index
}
</script>

<style scoped>
.slots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.slot {
  position: relative;
  min-width: 0;
}

.slot__pick {
  width: 100%;
  border: 0;
  cursor: pointer;
  text-align: left;
  height: 48px;
  padding: 0 30px 0 10px;
  border-radius: 8px;
  background: var(--chip);
  color: var(--tx);
  display: flex;
  align-items: center;
  gap: 8px;
}

.slot--active .slot__pick { background: var(--in); box-shadow: inset 0 0 0 2px var(--uA); }
.slot__number { font: 600 14px 'Pixelify Sans', sans-serif; color: var(--mu); }

.slot__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.slot__name {
  font: 700 14px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot__sub {
  font: 700 11px 'Nunito', sans-serif;
  color: var(--mu);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot__type { flex: none; width: 10px; height: 28px; border-radius: 3px; }

.slot__clear {
  position: absolute;
  top: 4px;
  right: 4px;
  border: 0;
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: rgba(0, 0, 0, .35);
  color: var(--tx);
  font: 700 11px 'Nunito', sans-serif;
}

.hint { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filters__search {
  flex: 1 1 120px;
  min-width: 0;
  height: 32px;
  border: 0;
  border-radius: 7px;
  padding: 0 10px;
  font-weight: 700;
  font-size: 13px;
  background: #fff;
  color: #22252b;
  outline: none;
}

.filters__select {
  height: 32px;
  border: 0;
  border-radius: 7px;
  padding: 0 6px;
  font-weight: 700;
  font-size: 12px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
}

.pool {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow: auto;
}

.move {
  border: 0;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 14px 40px 36px 30px;
  gap: 6px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--tx);
}

.move:hover, .move:focus-visible { background: var(--chip); }
.move--signature { background: rgba(240, 185, 58, .1); }
.move--used { opacity: .45; cursor: default; }

.move__name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px 5px;
  min-width: 0;
}

.move__label {
  font: 400 13px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.move__label--stab { font-weight: 700; }

.move__badge {
  flex: none;
  height: 16px;
  padding: 0 4px;
  border-radius: 3px;
  font: 700 9px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.move__type {
  height: 18px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Nunito', sans-serif;
  display: grid;
  place-items: center;
  white-space: nowrap;
  overflow: hidden;
}

.move__cat { width: 10px; height: 10px; box-shadow: 0 0 0 2px rgba(0, 0, 0, .45); }
.move__num { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }
.move__num--muted { color: var(--mu); }

@media (max-width: 640px) {
  .move { grid-template-columns: minmax(0, 1fr) 56px 12px 32px 30px; }
  .move > :nth-child(6) { display: none; }
}

.none {
  margin: 0;
  padding: 14px;
  text-align: center;
  font: 700 13px 'Nunito', sans-serif;
  color: var(--mu);
}
</style>

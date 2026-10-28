<template>
  <div class="grid-wrap">
    <div class="filters">
      <input v-model="query" class="filters__search" placeholder="Chercher un Pokémon" aria-label="Chercher un Pokémon">
      <select v-model="type" class="filters__select" aria-label="Type">
        <option value="">Type</option>
        <option v-for="value in types" :key="value" :value="value">{{ value }}</option>
      </select>
      <label class="filters__hide"><input v-model="hideOut" type="checkbox">Masquer indisponibles</label>
    </div>
    <div role="radiogroup" aria-label="Rôle" class="roles">
      <button
        v-for="option in ['', ...DRAFT.roles]"
        :key="option"
        type="button"
        role="radio"
        class="role"
        :class="{ 'role--on': role === option }"
        :aria-checked="role === option"
        @click="role = option"
      >
        {{ option || 'Tous' }}
      </button>
    </div>
    <div role="grid" aria-label="Roster de la saison" class="grid">
      <button
        v-for="card in cards"
        :key="card.pokemon.id"
        type="button"
        class="card"
        :class="{ 'card--out': card.out, 'card--banned': card.banned, 'card--disabled': card.disabled }"
        :style="{ boxShadow: card.ring }"
        :aria-disabled="card.disabled"
        :aria-label="card.tag ? `${card.pokemon.nom} · ${card.tag.label}` : card.pokemon.nom"
        @click="choose(card)"
        @dblclick="lock(card)"
        @mouseenter="event => show(event, card.pokemon.id)"
        @mouseleave="hide"
      >
        <img class="card__sprite" :src="card.pokemon.sprite" alt="" loading="lazy">
        <span class="card__name">{{ card.pokemon.nom }}</span>
        <span class="card__types">
          <span v-for="value in card.pokemon.types" :key="value" class="card__type" :style="{ background: TYPE_COLORS[value] }" />
        </span>
        <span v-if="card.tag" class="card__tag" :style="{ background: card.tag.background, color: card.tag.color }">{{ card.tag.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { DraftView } from '~/utils/draft'

const props = defineProps<{ draft: DraftView }>()
const emit = defineEmits<{ bans: [ids: string[]], preselect: [id: string], pick: [id: string] }>()
const { show, hide } = useDraftHover()

const query = ref('')
const type = ref('')
const role = ref('')
const hideOut = ref(false)

const types = [...new Set(roster.pokemon.flatMap(p => p.types))].sort((a, b) => a.localeCompare(b, 'fr'))
const myTurn = computed(() => props.draft.phase === 'pick' && Boolean(props.draft.turn?.mine))

const cards = computed(() => {
  const draft = props.draft
  const words = plainText(query.value)
  const revealedBans = draft.phase === 'ban' ? new Set<string>() : new Set([...draft.bans.mine, ...draft.bans.theirs])
  return roster.pokemon
    .filter(p => (!words || plainText(p.nom).includes(words)) && (!type.value || p.types.includes(type.value as Pokemon['types'][number]))
      && (!role.value || p.roles.some(r => r.includes(role.value))))
    .map((pokemon) => {
      const pick = draft.picks.find(p => p.id === pokemon.id)
      const myBan = draft.bans.mine.indexOf(pokemon.id)
      const banned = revealedBans.has(pokemon.id)
      let tag: { label: string, background: string, color: string } | null = null
      let ring = 'inset 0 0 0 2px transparent'
      if (pick) {
        tag = pick.mine ? { label: 'TOI', background: '#5aa0e0', color: '#06121e' } : { label: 'ADV.', background: '#e8704a', color: '#1a0500' }
        ring = `inset 0 0 0 2px ${pick.mine ? '#5aa0e0' : '#e8704a'}`
      } else if (banned) {
        tag = { label: 'BANNI', background: '#c8362a', color: '#fff' }
      } else if (draft.phase === 'ban' && myBan >= 0) {
        tag = { label: `BAN ${myBan + 1}`, background: '#e8604a', color: '#1a0500' }
        ring = 'inset 0 0 0 3px #e8604a'
      } else if (draft.preselection === pokemon.id) {
        tag = { label: 'CHOIX', background: 'var(--uA)', color: 'var(--uAtx)' }
        ring = 'inset 0 0 0 3px var(--uA)'
      }
      const out = Boolean(pick) || banned
      const disabled = out || draft.phase === 'reveal' || (draft.phase === 'pick' && !myTurn.value) || (draft.phase === 'ban' && draft.locked.mine)
      return { pokemon, tag, ring, out, banned, disabled }
    })
    .filter(card => !(hideOut.value && card.out))
})

const choose = (card: { pokemon: Pokemon, disabled: boolean }) => {
  if (card.disabled) return
  const draft = props.draft
  if (draft.phase === 'ban') {
    const bans = draft.bans.mine
    if (bans.includes(card.pokemon.id)) emit('bans', bans.filter(id => id !== card.pokemon.id))
    else if (bans.length < DRAFT.bans) emit('bans', [...bans, card.pokemon.id])
  } else if (myTurn.value) {
    emit('preselect', card.pokemon.id)
  }
}

const lock = (card: { pokemon: Pokemon, disabled: boolean }) => {
  if (!card.disabled && myTurn.value) emit('pick', card.pokemon.id)
}
</script>

<style scoped>
.grid-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filters {
  flex: none;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.filters__search {
  flex: 1 1 160px;
  min-width: 0;
  height: 34px;
  border: 0;
  border-radius: 7px;
  padding: 0 10px;
  font: 700 13px 'Nunito', sans-serif;
  background: #fff;
  color: #22252b;
  outline: none;
}

.filters__select {
  height: 34px;
  border: 0;
  border-radius: 7px;
  padding: 0 6px;
  font: 700 13px 'Nunito', sans-serif;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
}

.filters__hide {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font: 700 12px 'Nunito', sans-serif;
  color: var(--mu);
}

.filters__hide input { accent-color: var(--uA); }

.roles {
  flex: none;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.role {
  border: 0;
  cursor: pointer;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Nunito', sans-serif;
}

.role--on { background: var(--uA); color: var(--uAtx); }

.grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--chip) transparent;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
  grid-auto-rows: max-content;
  gap: 6px;
  align-content: start;
  padding: 2px;
}

.card {
  position: relative;
  border: 0;
  cursor: pointer;
  padding: 2px 2px 5px;
  border-radius: 9px;
  background: var(--in);
  color: var(--tx);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  overflow: hidden;
  transition: transform .1s;
}

.card:hover:not(.card--disabled) { background: var(--chip); transform: translateY(-2px); }
.card--disabled { cursor: default; }
.card--out { opacity: .55; }
.card__sprite { width: 64px; height: 64px; object-fit: contain; image-rendering: pixelated; }
.card--banned .card__sprite { filter: grayscale(1) brightness(.6); }

.card__name {
  max-width: 100%;
  font: 700 11px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__types { display: flex; gap: 2px; }
.card__type { width: 20px; height: 5px; border-radius: 2px; }

.card__tag {
  position: absolute;
  top: 3px;
  left: 3px;
  height: 17px;
  padding: 0 4px;
  border-radius: 3px;
  font: 700 9px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}
</style>

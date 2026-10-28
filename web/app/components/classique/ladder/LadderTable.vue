<template>
  <section class="ladder" aria-label="Classement">
    <header class="ladder__head">
      Ladder · {{ formatName }}
      <span class="ladder__count">{{ rows.length.toLocaleString('fr-FR') }} joueur{{ rows.length > 1 ? 's' : '' }} classé{{ rows.length > 1 ? 's' : '' }}</span>
      <input v-model="query" class="field ladder__search" placeholder="Chercher un joueur…" aria-label="Chercher un joueur">
    </header>
    <div class="table" role="table">
      <div class="table__row table__row--head" role="row">
        <span role="columnheader">#</span><span role="columnheader">Joueur</span><span role="columnheader">Elo</span>
        <span role="columnheader">Palier</span><span role="columnheader">V / D</span><span role="columnheader">Victoires</span>
      </div>
      <p v-if="!rows.length" class="ladder__empty">{{ loading ? 'Chargement du classement…' : 'Personne n\'est encore classé dans ce format : le premier combat classé ouvre le ladder.' }}</p>
      <button
        v-for="row in shown"
        :key="row.name"
        type="button"
        role="row"
        class="table__row"
        :class="{ 'table__row--me': isMe(row), 'table__row--on': row.name === selected }"
        @click="emit('select', row.name)"
      >
        <span class="table__rank" role="cell" :style="{ color: row.rank <= 3 ? MEDALS[row.rank - 1] : undefined }">{{ row.rank }}</span>
        <span class="table__player" role="cell">
          <span class="table__avatar" :style="{ background: avatarColor(row.name) }">{{ row.name.charAt(0).toUpperCase() }}</span>
          {{ row.name }}<span v-if="isMe(row)" class="table__me">TOI</span>
        </span>
        <span class="table__elo" role="cell">{{ Math.round(row.elo) }}</span>
        <span role="cell"><span class="table__tier" :style="{ color: eloTier(row.elo).color }">{{ eloTier(row.elo).name }}</span></span>
        <span class="table__num" role="cell">{{ row.wins }} / {{ row.losses }}</span>
        <span class="table__num" role="cell">{{ winRate(row) }}</span>
      </button>
      <button v-if="pinned" type="button" role="row" class="table__row table__row--me table__row--pinned" @click="emit('select', pinned.name)">
        <span class="table__rank" role="cell">{{ pinned.rank }}</span>
        <span class="table__player" role="cell"><span class="table__avatar" :style="{ background: avatarColor(pinned.name) }">{{ pinned.name.charAt(0).toUpperCase() }}</span>{{ pinned.name }}<span class="table__me">TOI</span></span>
        <span class="table__elo" role="cell">{{ Math.round(pinned.elo) }}</span>
        <span role="cell"><span class="table__tier" :style="{ color: eloTier(pinned.elo).color }">{{ eloTier(pinned.elo).name }}</span></span>
        <span class="table__num" role="cell">{{ pinned.wins }} / {{ pinned.losses }}</span>
        <span class="table__num" role="cell">{{ winRate(pinned) }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { EloRow } from '~/utils/ladder'

const props = defineProps<{ rows: EloRow[], formatName: string, me: string, selected: string, loading: boolean }>()
const emit = defineEmits<{ select: [name: string] }>()

const LIMIT = 100
const MEDALS = ['#f8c830', '#c8d0dc', '#d88a48']
const query = ref('')

const isMe = (row: EloRow) => Boolean(props.me) && toId(row.name) === toId(props.me)
const winRate = (row: EloRow) => row.wins + row.losses ? percent(row.wins / (row.wins + row.losses)) : '—'

/** Couleur stable par pseudo, pour l'avatar à l'initiale. */
const avatarColor = (name: string) => `hsl(${[...toId(name)].reduce((hash, char) => hash * 31 + char.charCodeAt(0), 7) % 360}, 45%, 42%)`

const shown = computed(() => {
  const words = toId(query.value)
  return (words ? props.rows.filter(row => toId(row.name).includes(words)) : props.rows).slice(0, LIMIT)
})

/** Ta ligne, épinglée en bas quand tu es hors du top affiché. */
const pinned = computed(() => {
  const mine = props.rows.find(isMe)
  return mine && !shown.value.includes(mine) && !query.value ? mine : undefined
})
</script>

<style scoped>
.ladder { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; min-width: 0; }

.ladder__head {
  min-height: 40px;
  padding: 4px 8px 4px 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.ladder__count { font: 700 12px 'Nunito', sans-serif; text-shadow: none; opacity: .9; }
.ladder__search { margin-left: auto; height: 30px; width: 200px; font-size: 13px; }
.ladder__empty { margin: 0; padding: 16px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.table { padding: 6px; display: flex; flex-direction: column; gap: 1px; }

.table__row {
  border: 0;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 70px 100px 80px 70px;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 0 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--tx);
  font: 700 13px 'Nunito', sans-serif;
}

.table__row:hover:not(.table__row--head) { background: var(--chip); }
.table__row--head { cursor: default; min-height: 26px; font-size: 11px; color: var(--mu); }
.table__row--me { background: color-mix(in srgb, var(--uA) 14%, transparent); }
.table__row--on { box-shadow: inset 0 0 0 2px var(--uA); }
.table__row--pinned { margin-top: 6px; }
.table__rank { font: 600 14px 'Pixelify Sans', sans-serif; text-align: right; padding-right: 6px; }
.table__player { display: flex; align-items: center; gap: 8px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.table__avatar {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
  font: 600 13px 'Pixelify Sans', sans-serif;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px var(--bd);
}

.table__me { padding: 1px 5px; border-radius: 3px; background: var(--uA); color: var(--uAtx); font-size: 9px; }
.table__elo { font: 600 15px 'Pixelify Sans', sans-serif; text-align: right; }
.table__tier { font-size: 12px; }
.table__num { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }

@media (max-width: 640px) {
  .table__row { grid-template-columns: 30px minmax(0, 1fr) 54px 64px; }
  .table__row > :nth-child(4), .table__row > :nth-child(6) { display: none; }
  .ladder__search { width: 100%; }
}
</style>

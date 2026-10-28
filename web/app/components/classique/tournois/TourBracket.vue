<template>
  <section class="bracket" :aria-label="`Tableau · ${title}`">
    <header class="bracket__head">Tableau · {{ title }}<span v-if="winner" class="bracket__winner">🏆 {{ winner }}</span></header>
    <div class="bracket__body">
      <template v-if="bracket?.type === 'tree'">
        <div v-if="bracket.rootNode" class="bracket__tree">
          <ClassiqueTournoisTourBracketNode :node="bracket.rootNode" :me="me" />
        </div>
        <template v-else>
          <p class="bracket__note">{{ players.length ? `${players.length} inscrit${players.length > 1 ? 's' : ''} : le tableau sera tiré au sort au départ.` : 'Personne n\'est encore inscrit.' }}</p>
          <div class="bracket__players">
            <span v-for="player in players" :key="player" class="bracket__player" :class="{ 'bracket__player--me': toId(player) === toId(me) }">{{ player }}</span>
          </div>
        </template>
      </template>

      <table v-else-if="bracket?.type === 'table' && bracket.tableHeaders" class="table">
        <thead>
          <tr>
            <th />
            <th v-for="col in bracket.tableHeaders.cols" :key="col" scope="col">{{ col }}</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in bracket.tableHeaders.rows" :key="row">
            <th scope="row">{{ row }}</th>
            <td v-for="(cell, colIndex) in bracket.tableContents?.[rowIndex] ?? []" :key="colIndex" :class="cell ? `table__cell--${cell.result ?? cell.state}` : 'table__cell--none'">
              {{ cell?.score ? cell.score.join('-') : cell?.state === 'inprogress' ? '…' : '' }}
            </td>
            <td class="table__points">{{ bracket.scores?.[rowIndex] ?? 0 }}</td>
          </tr>
        </tbody>
      </table>

      <p v-else class="bracket__note">Le tableau apparaîtra à l'ouverture des inscriptions.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BracketData } from '~/utils/chatRooms'

const props = defineProps<{ bracket: BracketData | null, title: string, me: string, winner: string | null, players: string[] }>()
const players = computed(() => props.bracket?.users ?? props.players)
</script>

<style scoped>
.bracket { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; min-width: 0; }

.bracket__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  gap: 8px;
}

.bracket__winner { margin-left: auto; font: 700 12px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; }
.bracket__body { padding: 12px; overflow-x: auto; }
.bracket__tree { display: flex; justify-content: flex-start; min-width: max-content; }
.bracket__note { margin: 0 0 8px; font: 700 13px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.bracket__players { display: flex; flex-wrap: wrap; gap: 5px; }
.bracket__player { height: 26px; padding: 0 10px; border-radius: 13px; background: var(--chip); font: 700 12px 'Atkinson Hyperlegible', sans-serif; display: flex; align-items: center; }
.bracket__player--me { background: var(--sel); color: var(--selTx); }
.table { border-collapse: separate; border-spacing: 3px; font: 700 12px 'Atkinson Hyperlegible', sans-serif; }
.table th { color: var(--mu); padding: 2px 6px; white-space: nowrap; }
.table td { min-width: 44px; height: 26px; border-radius: 4px; text-align: center; background: var(--in); }
.table__cell--none { background: transparent !important; }
.table__cell--win { background: #2f9a58 !important; color: #fff; }
.table__cell--loss { background: #c8362a !important; color: #fff; }
.table__cell--inprogress { box-shadow: inset 0 0 0 2px #58d080; }
.table__points { font: 600 14px 'Pixelify Sans', sans-serif; }
</style>

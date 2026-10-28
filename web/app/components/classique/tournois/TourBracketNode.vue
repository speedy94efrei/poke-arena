<template>
  <div class="node">
    <div v-if="branches.length" class="node__branches">
      <ClassiqueTournoisTourBracketNode v-for="(child, index) in branches" :key="index" :node="child" :me="me" />
    </div>
    <div class="match" :class="{ 'match--live': node.state === 'inprogress', 'match--ready': node.state === 'available' }">
      <div v-for="(side, index) in sides" :key="index" class="side" :class="{ 'side--winner': side.winner, 'side--me': side.me }">
        <span class="side__name">{{ side.name || '…' }}</span>
        <span class="side__score">{{ side.score }}</span>
      </div>
      <NuxtLink v-if="node.room" :to="`/classique/combat/${node.room}`" class="match__watch">Regarder</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BracketNode } from '~/utils/chatRooms'

const props = defineProps<{ node: BracketNode, me: string }>()

/** Les branches à dessiner : seules celles qui sont elles-mêmes des matchs ; un joueur seul apparaît dans ce match. */
const branches = computed(() => (props.node.children ?? []).filter(child => child.children?.length))

const sides = computed(() => (props.node.children ?? []).map((child, index) => {
  const finished = props.node.state === 'finished'
  const won = finished && ((props.node.result === 'win') === (index === 0))
  const name = child.team && !child.team.startsWith('(') ? child.team : ''
  return { name, winner: won, me: Boolean(name) && toId(name) === toId(props.me), score: finished && props.node.score ? props.node.score[index] : '' }
}))
</script>

<style scoped>
.node { display: flex; align-items: center; gap: 18px; }
.node__branches { display: flex; flex-direction: column; gap: 10px; position: relative; }

.match {
  position: relative;
  width: 150px;
  flex: none;
  border-radius: 7px;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--chip);
  overflow: hidden;
}

.node__branches + .match::before {
  content: '';
  position: absolute;
  left: -18px;
  top: 50%;
  width: 18px;
  border-top: 2px solid var(--chip);
}

.match--live { box-shadow: inset 0 0 0 2px #58d080; }
.match--ready { box-shadow: inset 0 0 0 2px var(--hd); }
.side { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.side + .side { border-top: 1px solid var(--chip); }
.side--winner { background: var(--sel); color: var(--selTx); }
.side--me .side__name { text-decoration: underline; }
.side__name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.side__score { font: 600 13px 'Pixelify Sans', sans-serif; }
.match__watch { display: block; padding: 2px 8px; background: #2f9a58; color: #fff; font: 700 10px 'Nunito', sans-serif; text-align: center; }
</style>

<template>
  <UiPanel title="Équipe adverse">
    <template #aside>{{ summary }}</template>
    <div class="team">
      <div
        v-for="(member, index) in slots"
        :key="index"
        tabindex="0"
        class="tile"
        @mouseenter="hovered = index"
        @mouseleave="hovered = -1"
        @focus="hovered = index"
        @blur="hovered = -1"
      >
        <div class="tile__bg" :class="{ 'tile__bg--fainted': member?.fainted, 'tile__bg--active': member?.active }" />
        <template v-if="member">
          <span class="tile__sprite" :class="{ 'tile__sprite--fainted': member.fainted }" :style="{ backgroundImage: `url(${spriteUrl(member.speciesId)})` }" />
          <span class="tile__tag" :style="{ background: member.fainted ? '#1d1d1d' : hpColor(hpPercent(member)), color: member.fainted ? '#fff' : '#1d1d1d' }">
            {{ member.fainted ? 'K.O.' : `${hpPercent(member)} %` }}
          </span>
          <span class="tile__name">{{ speciesName(member.speciesId, member.name) }}</span>
          <div v-if="hovered === index" class="info">
            <div class="info__head">
              <span class="info__name">{{ speciesName(member.speciesId, member.name) }}</span>
              <TypeBadge v-for="type in findPokemon(member.speciesId)?.types ?? []" :key="type" :type="type" small />
            </div>
            <div class="info__line"><span>Talent</span><b>{{ findPokemon(member.speciesId)?.talent.nom ?? '?' }}</b></div>
            <div class="info__line"><span>Objet</span><b>{{ member.item ? itemName(member.item) : 'pas encore vu' }}</b></div>
            <div class="info__line"><span>Statut</span><b>{{ STATUS_LABELS[member.status]?.court ?? 'aucun' }}</b></div>
            <div class="info__line"><span>Attaques</span><b>{{ member.moves.length ? member.moves.map(moveName).join(', ') : 'aucune révélée' }}</b></div>
            <div class="info__line"><span>Signature</span><b>{{ findPokemon(member.speciesId)?.signature.nom ?? '?' }}</b></div>
          </div>
        </template>
        <span v-else class="tile__unknown">?</span>
      </div>
    </div>
  </UiPanel>
</template>

<script setup lang="ts">
import type { BattlePokemon, BattleState, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState, side: SideId }>()
const hovered = ref(-1)

const team = computed(() => props.battle.sides[props.side].team)
const slots = computed<(BattlePokemon | undefined)[]>(() => Array.from({ length: 6 }, (_, index) => team.value[index]))
const summary = computed(() => {
  const alive = team.value.filter(p => !p.fainted).length
  return `${props.battle.sides[props.side].name || '…'} · ${alive} debout`
})
</script>

<style scoped>
.team {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.tile {
  position: relative;
  height: 58px;
  outline: none;
}

.tile__bg {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: var(--chip);
}

.tile__bg--active { box-shadow: 0 0 0 2px var(--sel); }
.tile__bg--fainted { background: var(--dk); }

.tile__sprite {
  position: absolute;
  right: 0;
  top: -4px;
  width: 52px;
  height: 52px;
  background: center/contain no-repeat;
  image-rendering: pixelated;
}

.tile__sprite--fainted { filter: grayscale(1) brightness(.5); }

.tile__tag {
  position: absolute;
  left: 4px;
  top: 4px;
  height: 17px;
  padding: 0 5px;
  border-radius: 4px;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.tile__name {
  position: absolute;
  left: 5px;
  right: 4px;
  bottom: 3px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  color: #fff;
  text-shadow: 1px 1px 0 #000, 0 0 3px #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile__unknown {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 600 20px 'Pixelify Sans', sans-serif;
  color: var(--mu);
}

.info {
  position: absolute;
  right: calc(100% + 10px);
  top: -8px;
  width: 280px;
  z-index: 50;
  padding: 12px;
  border-radius: var(--r);
  background: var(--pn2);
  box-shadow: var(--pnS), 0 16px 30px rgba(0, 0, 0, .45);
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: pop .15s both;
}

.info__head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info__name { flex: 1; font: 700 18px 'Pixelify Sans', sans-serif; }

.info__line {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 8px;
  font: 400 13px/1.35 'Atkinson Hyperlegible', sans-serif;
}

.info__line span { color: var(--mu); }
</style>

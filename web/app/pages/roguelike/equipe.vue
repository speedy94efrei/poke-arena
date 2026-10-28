<template>
  <div class="team">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="!run || !me" class="empty">
      <span>Pas de run en cours.</span>
      <NuxtLink to="/roguelike" class="btn btn--primary">Lancer une run</NuxtLink>
    </div>
    <template v-else>
      <div class="head">
        <h1 class="head__title">Équipe · {{ me.team.length }}/{{ run.maxTeam }}</h1>
        <span class="head__note">Les objets et les attaques se changent librement hors combat : choisis un objet du sac, puis le Pokémon qui le tient.</span>
      </div>
      <div class="grid">
        <article v-for="member in me.team" :key="member.species" class="mon">
          <header class="mon__head" :style="{ background: `linear-gradient(90deg, rgba(0, 0, 0, .6), rgba(0, 0, 0, .05) 75%), ${habitatBackground(findPokemon(member.species)?.types[0])}` }">
            <span class="mon__name">{{ speciesName(member.species) }}</span>
            <span class="mon__hp">{{ member.hp }} %<template v-if="statusLabel(member.status)"> · {{ statusLabel(member.status) }}</template></span>
            <span class="mon__sprite" :style="{ backgroundImage: `url(${spriteUrl(member.species, 'face')})` }" />
          </header>
          <div class="mon__body">
            <span class="mon__line">Talent · {{ findPokemon(member.species)?.talent.nom ?? member.ability }} · {{ findNature(member.nature)?.nom ?? member.nature }}</span>
            <label class="mon__field">Objet
              <select class="field" :value="member.item" :disabled="locked" @change="event => act({ type: 'objet', species: member.species, item: (event.target as HTMLSelectElement).value })">
                <option value="">Aucun</option>
                <option v-if="member.item" :value="member.item">{{ itemName(member.item) }}</option>
                <option v-for="item in [...new Set(me.bag)]" :key="item" :value="item">{{ itemName(item) }} (sac)</option>
              </select>
            </label>
            <div class="mon__moves">
              <select v-for="slot in 4" :key="slot" class="field" :value="member.moves[slot - 1] ?? ''" :disabled="locked" :aria-label="`Attaque ${slot}`" @change="event => setMove(member.species, member.moves, slot - 1, (event.target as HTMLSelectElement).value)">
                <option value="">—</option>
                <option v-for="move in known(member)" :key="move" :value="move">{{ moveName(move) }}</option>
              </select>
            </div>
            <span v-if="member.learned.length" class="mon__line">En réserve : {{ member.learned.map(move => moveName(move)).join(', ') }}</span>
          </div>
        </article>
      </div>
      <div class="side">
        <UiPanel title="Sac de la run">
          <div v-if="me.bag.length" class="bag">
            <span v-for="(item, index) in me.bag" :key="index" class="bag__item"><ItemIcon :id="item" :size="24" />{{ itemName(item) }}</span>
          </div>
          <p v-else class="note">Vide.</p>
        </UiPanel>
        <UiPanel title="Perdus pendant la run">
          <div v-if="me.lost.length" class="bag">
            <span v-for="entry in me.lost" :key="entry.species" class="bag__item bag__item--lost">
              <span class="bag__icon" :style="{ backgroundImage: `url(${spriteUrl(entry.species)})` }" />{{ speciesName(entry.species) }} · K.O. étage {{ entry.floor }}
            </span>
          </div>
          <p class="note">Un Pokémon K.O. est perdu pour toute la run.</p>
        </UiPanel>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { RogueMember } from '~/utils/roguelike'

definePageMeta({ layout: 'mode' })
useHead({ title: 'Équipe · Roguelike' })

const { store } = useShowdown()
const { run, me, error, act } = useRoguelike()

const connected = computed(() => store.status === 'connecte')
const locked = computed(() => !run.value || Boolean(run.value.battle) || run.value.phase === 'fin')
const known = (member: RogueMember) => [...new Set([...member.moves, ...member.learned])]

const setMove = (species: string, current: string[], slot: number, move: string) => {
  const next = [...current]
  next[slot] = move
  act({ type: 'attaques', species, moves: next.filter(Boolean) })
}
</script>

<style scoped>
.team { display: flex; flex-direction: column; gap: 12px; }
.error { margin: 0; padding: 10px 14px; border-radius: 10px; background: color-mix(in srgb, var(--bad) 18%, var(--pn)); box-shadow: inset 0 0 0 2px var(--bad); font: 700 14px 'Nunito', sans-serif; }
.empty { padding: 30px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; align-items: center; gap: 12px; font: 700 16px 'Nunito', sans-serif; }
.head { display: flex; flex-direction: column; gap: 2px; }
.head__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.head__note { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.mon { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }
.mon__head { position: relative; height: 84px; padding: 10px 12px; color: #fff; text-shadow: 1px 1px 0 #000; display: flex; flex-direction: column; }
.mon__name { font: 600 20px 'Pixelify Sans', sans-serif; }
.mon__hp { font: 700 13px 'Nunito', sans-serif; }
.mon__sprite { position: absolute; right: 6px; bottom: 0; width: 80px; height: 80px; background: center bottom / contain no-repeat; image-rendering: pixelated; }
.mon__body { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.mon__line { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.mon__field { display: flex; flex-direction: column; gap: 4px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.mon__moves { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.side { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.bag { display: flex; flex-wrap: wrap; gap: 6px; }
.bag__item { height: 32px; padding: 0 10px 0 4px; border-radius: 8px; background: var(--in); display: flex; align-items: center; gap: 6px; font: 700 13px 'Nunito', sans-serif; }
.bag__item--lost { opacity: .8; }
.bag__icon { width: 30px; height: 26px; background: center / 30px no-repeat; image-rendering: pixelated; }
.note { margin: 6px 0 0; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 900px) {
  .side { grid-template-columns: minmax(0, 1fr); }
}
</style>

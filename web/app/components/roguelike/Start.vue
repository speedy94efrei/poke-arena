<template>
  <UiPanel title="Tirage de départ">
    <p class="note">3 Pokémon tirés dans le roster PokéDraft. Garde-en un, puis choisis son set.</p>
    <p v-if="me.team.length" class="wait">
      Tu pars avec <b>{{ speciesName(me.team[0]!.species) }}</b>.<template v-if="waitingFor"> En attente de {{ waitingFor }}…</template>
    </p>
    <template v-else>
      <div class="draws" role="radiogroup" aria-label="Pokémon de départ">
        <button
          v-for="draw in me.draw"
          :key="draw.species"
          type="button"
          role="radio"
          class="draw"
          :class="{ 'draw--on': picked === draw.species }"
          :aria-checked="picked === draw.species"
          @click="pick(draw.species)"
        >
          <span class="draw__art" :style="{ background: habitatBackground(fiche(draw.species)?.types[0]) }">
            <span class="draw__sprite" :style="{ backgroundImage: `url(${spriteUrl(draw.species, 'face')})` }" />
          </span>
          <span class="draw__body">
            <span class="draw__name">{{ speciesName(draw.species) }}</span>
            <span class="draw__types"><TypeBadge v-for="type in fiche(draw.species)?.types ?? []" :key="type" :type="type" small /></span>
            <span class="draw__line"><b>Talent · {{ fiche(draw.species)?.talent.nom }}</b> — {{ fiche(draw.species)?.talent.effet }}</span>
            <span class="draw__line"><b>Signature · {{ fiche(draw.species)?.signature?.nom ?? '—' }}</b></span>
          </span>
        </button>
      </div>
      <div v-if="current" class="sets" role="radiogroup" aria-label="Set">
        <button
          v-for="(set, index) in current.sets"
          :key="set.label"
          type="button"
          role="radio"
          class="set"
          :class="{ 'set--on': setIndex === index }"
          :aria-checked="setIndex === index"
          @click="setIndex = index"
        >
          <span class="set__label">{{ set.label }}</span>
          <span class="set__meta">
            <ItemIcon v-if="set.item" :id="set.item" :size="22" />{{ set.item ? itemName(set.item) : 'Sans objet' }} · {{ findNature(set.nature)?.nom ?? set.nature }}
          </span>
          <span class="set__moves">{{ set.moves.map(move => moveName(move)).join(' · ') }}</span>
        </button>
      </div>
      <button type="button" class="btn btn--primary" :disabled="!current || pending" @click="keep">
        {{ current ? `Garder ${speciesName(current.species)}` : 'Choisis un Pokémon' }}
      </button>
    </template>
  </UiPanel>
</template>

<script setup lang="ts">
import type { RoguePlayer, RoguelikeRun } from '~/utils/roguelike'

const props = defineProps<{ run: RoguelikeRun, me: RoguePlayer }>()
const { act, pending } = useRoguelike()

const picked = ref('')
const setIndex = ref(0)
const fiche = (species: string) => findPokemon(species)
const current = computed(() => props.me.draw.find(draw => draw.species === picked.value))
const waitingFor = computed(() => props.run.players.filter(player => !player.team.length).map(player => player.name).join(' et '))

const pick = (species: string) => {
  picked.value = species
  setIndex.value = 0
}

const keep = () => {
  if (current.value) act({ type: 'depart', species: current.value.species, set: setIndex.value })
}
</script>

<style scoped>
.note { margin: 0 0 10px; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.wait { margin: 0; font: 700 15px 'Nunito', sans-serif; }
.draws { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }

.draw {
  border: 0;
  cursor: pointer;
  padding: 0;
  border-radius: 12px;
  background: var(--in);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--chip);
  overflow: hidden;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.draw--on { box-shadow: 0 0 0 3px #a77bff; }
.draw__art { position: relative; height: 110px; display: flex; align-items: flex-end; justify-content: center; }
.draw__sprite { width: 110px; height: 110px; background: center bottom / contain no-repeat; image-rendering: pixelated; }
.draw__body { padding: 10px; display: flex; flex-direction: column; gap: 5px; }
.draw__name { font: 600 20px 'Pixelify Sans', sans-serif; }
.draw__types { display: flex; gap: 4px; }
.draw__line { font: 400 12px/1.4 'Nunito', sans-serif; color: var(--mu); }
.draw__line b { color: var(--tx); }
.sets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.set { border: 0; cursor: pointer; padding: 10px 12px; border-radius: 10px; background: var(--in); color: var(--tx); box-shadow: inset 0 0 0 2px var(--chip); text-align: left; display: flex; flex-direction: column; gap: 4px; }
.set--on { box-shadow: inset 0 0 0 3px #a77bff; }
.set__label { font: 600 16px 'Pixelify Sans', sans-serif; }
.set__meta { display: flex; align-items: center; gap: 6px; font: 700 13px 'Nunito', sans-serif; }
.set__moves { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 900px) {
  .draws, .sets { grid-template-columns: minmax(0, 1fr); }
}
</style>

<template>
  <div class="dex">
    <div class="dex__head">
      <div class="dex__heading">
        <h1 class="dex__title">Pokédex</h1>
        <span class="dex__subtitle">Fiche complète et ce que joue la communauté{{ usage ? ` · ${usage.battles.toLocaleString('fr-FR')} combats analysés` : '' }}</span>
      </div>
      <ClassiqueUsageFormatSelect v-model="format" />
    </div>

    <div class="dex__body">
      <ClassiqueDexList :format-name="formatName" :usage="usage" :selected="id" />
      <div v-if="pokemon" class="dex__main">
        <ClassiqueDexSheet :id="id" :pokemon="pokemon" :usage="entry" :format-name="formatName" :format="format" @add="add" />
        <ClassiqueDexCommunity :usage="entry" :name="pokemon.nom" :format-name="formatName" />
        <ClassiqueDexMoves :id="id" :key="`${id}-${format}`" :base-species="pokemon.baseSpecies" :format="format" />
      </div>
      <p v-else class="dex__loading">{{ dex ? 'Ce Pokémon n\'est pas dans le Pokédex.' : 'Chargement du Pokédex…' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { dex } = usePokedex()
const { format, usage, formatName } = useUsageFormat()
const { teams, save } = useClassicTeams()
const workshopTeam = useState('workshop-team', () => '')
const workshopSlot = useState('workshop-slot', () => 0)

const TEAM_SIZE = 6

const id = computed(() => (typeof route.query.id === 'string' && toId(route.query.id)) || usage.value?.pokemon[0]?.id || 'greattusk')
const pokemon = computed(() => dex.value?.pokemon[id.value])
const entry = computed(() => usageOf(usage.value, id.value))

useHead(() => ({ title: pokemon.value ? `${pokemon.value.nom} · Pokédex` : 'Pokédex · Classique' }))

/** Ajoute le Pokémon, avec son set le plus joué, à l'équipe ouverte dans l'Atelier si elle est du même format et pas pleine ; sinon dans une nouvelle équipe. */
const add = async () => {
  const set = setFromUsage(id.value, entry.value, dex.value, levelFor(format.value, false))
  const open = teams.value.find(team => team.id === workshopTeam.value) ?? teams.value.find(team => team.format === format.value)
  const team = open && open.format === format.value && open.sets.length < TEAM_SIZE
    ? save({ ...open, sets: [...open.sets, set] })
    : save({ name: `Équipe ${pokemon.value?.nom ?? id.value}`, format: format.value, sets: [set] })
  workshopTeam.value = team.id
  workshopSlot.value = team.sets.length - 1
  await navigateTo('/classique/equipes')
}
</script>

<style scoped>
.dex { display: flex; flex-direction: column; gap: 12px; }
.dex__head { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.dex__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.dex__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.dex__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.dex__body { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 12px; align-items: start; }
.dex__main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dex__loading { margin: 0; padding: 20px; font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 980px) {
  .dex__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

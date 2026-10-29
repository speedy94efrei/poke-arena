<template>
  <div class="page">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="banner" role="alert">{{ error }}</p>
    <RouteNoRun v-if="!run" />
    <template v-else>
      <header class="head">
        <div>
          <h1 class="head__title">Tirage du banc · {{ run.name }}</h1>
          <p class="head__text">{{ run.draw.length }} Pokémon à leur premier stade. Garde-en 6 : ce sera ton équipe pour toute la région.</p>
        </div>
        <span class="head__count"><b>{{ chosen.length }}</b>/6 gardés</span>
      </header>
      <ul class="rules" aria-label="Règles du tirage">
        <li>✓ Au moins 1 starter</li>
        <li>✓ Pas de légendaire ni de fabuleux</li>
        <li>✓ 2 Pokémon max par type principal</li>
        <li>✓ Seulement des Pokémon qui évoluent, ou assez forts</li>
      </ul>

      <p v-if="run.phase !== 'tirage'" class="banner">
        Ton équipe est déjà choisie pour cette tentative.
        <NuxtLink to="/route-des-ligues/carte" class="btn btn--small">Voir la carte</NuxtLink>
      </p>
      <template v-else>
        <div class="grid">
          <RoutePokemon
            v-for="card in run.draw"
            :key="card.species"
            :species="card.species"
            :starter="card.starter"
            :selected="chosen.includes(card.species)"
            :dim="chosen.length >= 6 && !chosen.includes(card.species)"
            :text="evolutionText(card.evolutions, speciesName, itemName)"
            selectable
            @click="toggle(card.species)"
          />
        </div>
        <div class="actions">
          <span class="actions__note">Les Pokémon qui évoluent avant le niveau {{ run.level }} arrivent déjà évolués.</span>
          <button type="button" class="btn btn--primary actions__go" :disabled="chosen.length !== 6 || pending" @click="keep">Valider mon équipe et partir ▸</button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Tirage du banc · Route des Ligues' })

const { run, error, pending, act, connected } = useRouteLigues()
const chosen = ref<string[]>([])

watch(() => run.value?.attempt, () => {
  chosen.value = []
})

const toggle = (species: string) => {
  if (chosen.value.includes(species)) {
    chosen.value = chosen.value.filter(id => id !== species)
  } else if (chosen.value.length < 6) {
    chosen.value = [...chosen.value, species]
  }
}

const keep = () => {
  act({ type: 'garder', species: chosen.value })
  void navigateTo('/route-des-ligues/carte')
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.banner { margin: 0; padding: 10px 14px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font: 700 14px 'Nunito', sans-serif; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.head__title { margin: 0; font: 700 28px/1.1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.head__text { margin: 4px 0 0; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.head__count { flex: none; padding: 8px 14px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); font: 700 13px 'Nunito', sans-serif; }
.head__count b { font: 700 22px 'Pixelify Sans', sans-serif; color: var(--good); }
.rules { margin: 0; padding: 0; list-style: none; display: flex; gap: 6px; flex-wrap: wrap; }
.rules li { padding: 5px 10px; border-radius: 8px; background: var(--pn); box-shadow: var(--pnS); font: 700 12px 'Nunito', sans-serif; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); gap: 10px; }
.actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.actions__note { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.actions__go { height: 44px; font-size: 16px; }
</style>

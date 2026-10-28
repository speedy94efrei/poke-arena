<template>
  <div class="run">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div v-if="!run" class="empty">
      <span>Tu n'as pas de run en cours.</span>
      <NuxtLink to="/roguelike" class="btn btn--primary">Lancer une run</NuxtLink>
    </div>

    <template v-else-if="me">
      <header class="head">
        <div class="head__title">
          <h1>Étage {{ run.floor }}</h1>
          <span>{{ run.duo ? `Coop avec ${partner?.name}` : run.mode === 'semaine' ? 'Défi de la semaine' : 'Run libre' }} · seed {{ run.seed }}</span>
        </div>
        <span class="head__chip">◎ {{ run.tokens }} jetons</span>
        <span class="head__chip">{{ run.wins }} victoire{{ run.wins > 1 ? 's' : '' }} · {{ run.turns }} tours</span>
        <button v-if="run.phase !== 'fin'" type="button" class="btn btn--small" :class="{ 'btn--danger': confirming }" @click="abandon">{{ confirming ? 'Confirmer l\'abandon ?' : 'Abandonner la run' }}</button>
      </header>

      <div class="body">
        <RoguelikeTower v-if="run.phase !== 'depart'" class="body__tower" :tower="run.tower" />
        <div class="body__main">
          <RoguelikeStart v-if="run.phase === 'depart'" :run="run" :me="me" />
          <RoguelikeFloor v-else-if="run.phase === 'combat'" :run="run" :me="me" />
          <RoguelikeRewards v-else-if="run.phase === 'recompense'" :run="run" :me="me" />
          <RoguelikeDoors v-else-if="run.phase === 'porte'" :run="run" />
          <RoguelikeStop v-else-if="['boutique', 'pension', 'mystere'].includes(run.phase)" :key="run.phase" :run="run" :me="me" />
          <RoguelikeEnd v-else :run="run" />
          <RoguelikeTeamStrip v-if="me.team.length" :team="me.team" :max="run.maxTeam" :title="run.duo ? 'Ton équipe' : 'Équipe'" />
          <RoguelikeTeamStrip v-if="partner?.team.length" :team="partner.team" :max="run.maxTeam" :title="`Équipe de ${partner.name}`" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Ma run · Roguelike' })

const { store } = useShowdown()
const { run, me, error, act } = useRoguelike()
const confirming = ref(false)

const connected = computed(() => store.status === 'connecte')
const partner = computed(() => run.value?.duo ? run.value.players.find(player => player.id !== me.value?.id) : undefined)

const abandon = () => {
  if (!confirming.value) {
    confirming.value = true
    return
  }
  confirming.value = false
  act({ type: 'abandonner' })
}
</script>

<style scoped>
.run { display: flex; flex-direction: column; gap: 12px; }
.error { margin: 0; padding: 10px 14px; border-radius: 10px; background: color-mix(in srgb, var(--bad) 18%, var(--pn)); box-shadow: inset 0 0 0 2px var(--bad); font: 700 14px 'Nunito', sans-serif; }
.empty { padding: 30px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; align-items: center; gap: 12px; font: 700 16px 'Nunito', sans-serif; }
.head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head__title { flex: 1 1 260px; display: flex; flex-direction: column; }
.head__title h1 { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.head__title span { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.head__chip { height: 32px; padding: 0 12px; border-radius: 8px; background: var(--pn); box-shadow: var(--pnS); display: flex; align-items: center; font: 700 13px 'Nunito', sans-serif; }
.body { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 12px; align-items: start; }
.body__main { display: flex; flex-direction: column; gap: 12px; min-width: 0; grid-column: 2; }
.body__tower { grid-column: 1; }
.body:not(:has(.body__tower)) .body__main { grid-column: 1 / -1; }

@media (max-width: 1000px) {
  .body { grid-template-columns: minmax(0, 1fr); }
  .body__main, .body__tower { grid-column: 1; }
}
</style>

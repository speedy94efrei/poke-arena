<template>
  <div class="lobby">
    <div class="lobby__head">
      <h1 class="lobby__title">Combat libre</h1>
      <span class="lobby__subtitle">PokéDraft · Saison {{ roster.saison }} · serveur de combat local</span>
    </div>
    <div class="lobby__grid">
      <div class="lobby__column">
        <LobbyConnection />
        <LobbyTeam />
      </div>
      <div class="lobby__column">
        <LobbyChallenges />
      </div>
    </div>
    <div class="lobby__notices" aria-live="polite">
      <div v-for="notice in store.notices" :key="notice.id" class="lobby__notice">{{ notice.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { store } = useShowdown()

watch(() => store.latestBattle, (roomid) => {
  if (roomid) navigateTo(`/pokedraft/combat/${roomid}`)
})
</script>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lobby__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lobby__title {
  margin: 0;
  font: 700 30px/1 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
}

.lobby__subtitle {
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.lobby__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  gap: 12px;
  align-items: start;
}

.lobby__column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.lobby__notices {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
  max-width: 420px;
}

.lobby__notice {
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--pn2);
  box-shadow: var(--pnS), 0 12px 30px rgba(0, 0, 0, .45);
  font: 700 14px/1.4 'Atkinson Hyperlegible', sans-serif;
  white-space: pre-line;
  animation: pop .2s both;
}

@media (max-width: 1100px) {
  .lobby__grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

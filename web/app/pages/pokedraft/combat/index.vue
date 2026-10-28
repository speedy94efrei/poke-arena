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
  font: 700 14px 'Nunito', sans-serif;
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

@media (max-width: 1100px) {
  .lobby__grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

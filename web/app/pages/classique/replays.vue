<template>
  <UiPanel title="Replays">
    <p class="intro">Chaque combat terminé est gardé : cherche un pseudo pour revoir ses combats tour par tour, et partage le lien d'un replay.</p>
    <ReplayList />
  </UiPanel>
</template>

<script setup lang="ts">
useHead({ title: 'Replays · Classique' })
</script>

<style scoped>
.intro { margin: 0 0 12px; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
</style>

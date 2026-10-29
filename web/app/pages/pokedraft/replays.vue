<template>
  <UiPanel title="Replays PokéDraft">
    <p class="intro">Les combats PokéDraft (drafts classés, combats libres, runs du Roguelike) se revoient tour par tour : cherche un pseudo, puis partage le lien d'un replay.</p>
    <ReplayList format="gen9pokedraft" />
  </UiPanel>
</template>

<script setup lang="ts">
useHead({ title: 'Replays · PokéDraft' })
</script>

<style scoped>
.intro { margin: 0 0 12px; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
</style>

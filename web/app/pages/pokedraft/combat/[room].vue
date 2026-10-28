<template>
  <BattleRoom :roomid="String(route.params.room)" lobby="/pokedraft/combat" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'battle' })

const route = useRoute()
</script>

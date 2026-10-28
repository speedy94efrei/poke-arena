<template>
  <BattleRoom :roomid="String(route.params.room)" lobby="/classique/en-ligne" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'battle' })

const route = useRoute()
</script>

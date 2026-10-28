<template>
  <BattleRoom :roomid="String(route.params.room)" lobby="/budget" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'battle' })

const route = useRoute()
</script>

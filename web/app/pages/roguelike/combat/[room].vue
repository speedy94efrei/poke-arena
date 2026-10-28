<template>
  <BattleRoom :roomid="roomid" lobby="/roguelike/run" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'battle' })

const route = useRoute()
const roomid = computed(() => String(route.params.room))
const { store, join } = useShowdown()
useRoguelike()

/** Page rechargée pendant un combat de la run : le site rejoint la salle, et Showdown renvoie l'historique et la demande en cours. */
watch(() => store.status, (status) => {
  if (status === 'connecte' && !store.battles[roomid.value]) join(roomid.value)
}, { immediate: true })
</script>

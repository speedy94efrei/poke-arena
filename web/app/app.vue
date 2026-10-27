<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { gen } = useGenStyle()
const { refresh } = useAccount()

useHead({ htmlAttrs: { 'data-gen': gen } })
useRankedLink()
onMounted(refresh)
</script>

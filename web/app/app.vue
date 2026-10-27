<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { gen } = useGenStyle()

useHead({ htmlAttrs: { 'data-gen': gen } })
</script>

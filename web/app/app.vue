<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ModeTransition />
</template>

<script setup lang="ts">
const { gen } = useGenStyle()
const { menuColor } = useMenuColor()
const { refresh } = useAccount()

useHead({ htmlAttrs: { 'data-gen': gen, 'style': () => menuColorStyle(menuColor.value, gen.value) } })
useRankedLink()
useLastUniverse()
useAtelierAccount()
onMounted(refresh)
</script>

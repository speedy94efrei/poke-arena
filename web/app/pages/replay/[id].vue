<template>
  <BattleReplayRoom :id="id" @leave="leave" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'battle' })

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))

const leave = () => (window.history.state?.back ? router.back() : navigateTo('/classique/replays'))
</script>

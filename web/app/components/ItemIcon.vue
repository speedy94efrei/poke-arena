<template>
  <span v-if="objet" class="item-icon" :style="itemIconStyle(objet.sprite, size)" role="img" :aria-label="objet.nom" />
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ id: string, size?: number }>(), { size: 24 })
const objet = computed(() => findObjet(props.id))
</script>

<style scoped>
.item-icon {
  flex: none;
  display: inline-block;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}
</style>

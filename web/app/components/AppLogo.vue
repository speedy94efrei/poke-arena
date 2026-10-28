<template>
  <NuxtLink to="/" class="logo" title="Hub Arène" :class="{ 'logo--header': header }">
    <span class="logo__ball" aria-hidden="true" />
    <span class="logo__name">ARÈNE</span>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{ header?: boolean }>()
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px 0 8px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  color: var(--tx);
  flex: none;
}

.logo:hover { text-decoration: none; }
.logo--header { background: var(--hd); }

.logo__ball {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 5px, #383838 5px 7px, transparent 7px), linear-gradient(180deg, #c8362a 0 47%, #383838 47% 53%, #fff 53%);
  box-shadow: 0 0 0 2px #383838;
}

.logo__name {
  font: 700 21px 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
}

.logo--header .logo__name { color: #fff; }
</style>

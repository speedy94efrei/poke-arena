<template>
  <div class="empty">
    <span>Tu n'as pas encore de région en cours.</span>
    <NuxtLink to="/route-des-ligues" class="btn btn--primary">Choisir une région</NuxtLink>
  </div>
</template>

<style scoped>
.empty { padding: 30px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; align-items: center; gap: 12px; font: 700 16px 'Nunito', sans-serif; }
</style>

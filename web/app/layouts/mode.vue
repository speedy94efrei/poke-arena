<template>
  <div class="shell">
    <div class="shell__frame">
      <AppTopBar />
      <ModeTabs>
        <RouteStatusChip v-if="onRoute" />
      </ModeTabs>
      <main class="shell__main">
        <slot />
      </main>
    </div>
    <ShowdownNotices />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const onRoute = computed(() => route.path.startsWith('/route-des-ligues'))
</script>

<style scoped>
.shell {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px 12px 40px;
  background: var(--pg);
  background-image:
    linear-gradient(45deg, var(--pgB) 25%, transparent 25%, transparent 75%, var(--pgB) 75%),
    linear-gradient(45deg, var(--pgB) 25%, transparent 25%, transparent 75%, var(--pgB) 75%);
  background-size: 32px 32px;
  background-position: 0 0, 16px 16px;
  animation: check 6s linear infinite;
}

.shell__frame {
  max-width: 1440px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 20px;
  background: var(--fr);
  box-shadow: 0 0 0 4px var(--bd), 0 30px 80px rgba(0, 0, 0, .45);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shell__main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
</style>

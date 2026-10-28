<template>
  <header class="topbar">
    <AppLogo />
    <ModeSwitcher />
    <span class="topbar__spacer" />
    <AccountMenu />
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 52px;
}

.topbar__spacer { flex: 1; }
</style>

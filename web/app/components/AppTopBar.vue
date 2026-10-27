<template>
  <header class="topbar">
    <AppLogo />
    <div role="tablist" aria-label="Univers" class="topbar__universes">
      <span class="topbar__universe" title="Bientôt">
        <span class="topbar__dot topbar__dot--classique" />Classique · Smogon
      </span>
      <span aria-selected="true" class="topbar__universe topbar__universe--active">
        <span class="topbar__dot topbar__dot--pokedraft" />PokéDraft · Saison {{ roster.saison }}
      </span>
    </div>
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

.topbar__universes {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--r);
  background: var(--dk);
  box-shadow: var(--pnS);
}

.topbar__universe {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--mu);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
}

.topbar__universe--active {
  background: var(--uA);
  color: var(--uAtx);
}

.topbar__dot {
  width: 10px;
  height: 10px;
}

.topbar__dot--classique {
  border-radius: 2px;
  background: #2f74a3;
  box-shadow: 0 0 0 2px #0b0f16;
}

.topbar__dot--pokedraft {
  transform: rotate(45deg);
  background: var(--uAtx);
}

.topbar__spacer { flex: 1; }

</style>

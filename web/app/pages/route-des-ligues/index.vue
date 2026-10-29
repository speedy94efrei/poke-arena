<template>
  <div class="page">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="banner banner--bad" role="alert">{{ error }}</p>
    <p v-if="state?.defeat" class="banner banner--bad">
      Défaite contre {{ state.defeat.against }} : {{ regionName(state.defeat.region) }} recommence avec un nouveau banc.
      <button type="button" class="btn btn--small" @click="act({ type: 'oublier-defaite' })">Compris</button>
    </p>

    <section class="hero" aria-label="Route des Ligues">
      <div class="hero__text">
        <h1 class="hero__title">De Kanto à Paldea</h1>
        <p class="hero__pitch">Affronte les 8 Champions, le Conseil 4 et le Maître de chaque région, avec des équipes refaites en vrais sets. Ton banc est tiré au hasard dans le Pokédex régional. Une défaite fait recommencer la région avec un nouveau tirage.</p>
      </div>
      <div class="current">
        <template v-if="run">
          <span class="current__kicker">{{ run.phase === 'fin' ? 'Région terminée' : 'Région en cours' }} · tentative {{ run.attempt }}</span>
          <span class="current__title">{{ run.name }} · {{ run.phase === 'fin' ? 'Maître battu' : run.next ? stageLabel(run.next.stage) : '' }}</span>
          <span class="current__badges" :aria-label="`${run.badges} badges sur 8`">
            <span v-for="badge in 8" :key="badge" class="current__badge" :class="{ 'current__badge--on': badge <= run.badges }">{{ badge <= run.badges ? '★' : badge }}</span>
          </span>
          <NuxtLink :to="continueLink" class="btn btn--primary current__go">▶ {{ run.phase === 'fin' ? `Revoir ${run.name}` : `Continuer à ${run.name}` }}</NuxtLink>
        </template>
        <template v-else>
          <span class="current__kicker">Ta route commence</span>
          <span class="current__title">Kanto · Arène 1</span>
          <button type="button" class="btn btn--primary current__go" :disabled="!connected || pending" @click="go('kanto')">▶ Partir à Kanto</button>
        </template>
      </div>
    </section>

    <ol class="regions" aria-label="Régions">
      <li v-for="(region, index) in regions" :key="region.id">
        <button type="button" class="region" :class="`region--${status(region).kind}`" :disabled="!canStart(region)" @click="go(region.id)">
          <span class="region__head">
            <span class="region__name"><small>{{ String(index + 1).padStart(2, '0') }}</small> {{ region.name }}</span>
            <span class="region__status">{{ status(region).label }}</span>
          </span>
          <span class="region__mechanic">{{ region.mechanic }}</span>
          <span class="region__note">{{ region.note }}<template v-if="region.attempts"> · {{ region.attempts }} tentative{{ region.attempts > 1 ? 's' : '' }}</template></span>
          <span class="region__bar" aria-hidden="true">
            <span v-for="badge in 8" :key="badge" class="region__seg" :class="{ 'region__seg--on': region.completed || (run?.region === region.id && badge <= run.badges) }" />
          </span>
        </button>
      </li>
    </ol>
    <p class="note">
      <template v-if="state?.bonus">Prime du Maître gardée pour la région suivante : <b>{{ money(state.bonus) }}</b>. </template>
      Kanto d'abord ; les autres régions arrivent au rythme des saisons.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { RouteRegion } from '~/utils/routeLigues'

definePageMeta({ layout: 'mode' })
useHead({ title: 'Route des Ligues' })

const { state, run, error, pending, act, connected } = useRouteLigues()

const FALLBACK: RouteRegion[] = [
  'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unys', 'Kalos', 'Alola', 'Galar', 'Paldea',
].map((name, index) => ({ id: name.toLowerCase(), name, mechanic: '', note: '', open: index === 0, completed: false, unlocked: index === 0, attempts: 0 }))

const regions = computed(() => state.value?.regions ?? FALLBACK)
const regionName = (id: string) => regions.value.find(region => region.id === id)?.name ?? id

const status = (region: RouteRegion) => {
  if (run.value?.region === region.id && run.value.phase !== 'fin') return { kind: 'current', label: 'En cours' }
  if (region.completed) return { kind: 'done', label: 'Terminée' }
  if (!region.open) return { kind: 'soon', label: 'Bientôt' }
  if (!region.unlocked) return { kind: 'locked', label: 'Verrouillée' }
  return { kind: 'open', label: 'Ouverte' }
}

const canStart = (region: RouteRegion) => connected.value && region.open && region.unlocked

const continueLink = computed(() => {
  const phase = run.value?.phase
  if (phase === 'tirage') return '/route-des-ligues/tirage'
  if (phase === 'evolution') return '/route-des-ligues/evolution'
  return '/route-des-ligues/carte'
})

const go = (region: string) => {
  if (run.value?.region === region && run.value.phase !== 'fin') {
    void navigateTo(continueLink.value)
    return
  }
  act({ type: 'region', region })
  void navigateTo('/route-des-ligues/tirage')
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.banner { margin: 0; padding: 10px 14px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font: 700 14px 'Nunito', sans-serif; }
.banner--bad { box-shadow: var(--pnS), inset 0 0 0 2px var(--bad); }
.hero { padding: 22px 24px; border-radius: var(--r); background: linear-gradient(120deg, #1d6a36, #0a2a16); box-shadow: inset 0 0 0 3px #4cc46a, var(--pnS); color: #fff; display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 330px); gap: 20px; align-items: center; }
.hero__title { margin: 0 0 8px; font: 700 40px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .4); }
.hero__pitch { margin: 0; max-width: 560px; font: 700 14px/1.5 'Nunito', sans-serif; opacity: .92; }
.current { padding: 14px; border-radius: 14px; background: rgba(0, 0, 0, .35); box-shadow: inset 0 0 0 2px #4cc46a; display: flex; flex-direction: column; gap: 8px; }
.current__kicker { font: 700 12px 'Nunito', sans-serif; color: #9ae8ae; }
.current__title { font: 700 24px 'Pixelify Sans', sans-serif; }
.current__badges { display: flex; gap: 5px; }
.current__badge { width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, .08); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .2); display: grid; place-items: center; font: 800 11px 'Nunito', sans-serif; color: rgba(255, 255, 255, .6); }
.current__badge--on { background: #f0b93a; box-shadow: none; color: #3a2400; }
.current__go { height: 42px; font-size: 16px; justify-content: center; }
.regions { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 10px; }
.region { width: 100%; min-height: 96px; padding: 10px 12px; border: 0; border-radius: 12px; background: var(--pn); box-shadow: var(--pnS); color: var(--tx); text-align: left; display: flex; flex-direction: column; gap: 4px; font: inherit; cursor: pointer; }
.region:disabled { cursor: default; }
.region--current { box-shadow: var(--pnS), inset 0 0 0 2px #4cc46a; }
.region--done { box-shadow: var(--pnS), inset 0 0 0 2px #f0b93a; }
.region--soon, .region--locked { opacity: .7; }
.region__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.region__name { font: 600 19px 'Pixelify Sans', sans-serif; }
.region__name small { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.region__status { padding: 2px 8px; border-radius: 6px; background: var(--in); font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.region--current .region__status { background: #4cc46a; color: #06210f; }
.region--done .region__status { background: #f0b93a; color: #3a2400; }
.region__mechanic { font: 700 12px 'Nunito', sans-serif; color: #4cc46a; }
.region__note { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.region__bar { display: flex; gap: 3px; margin-top: auto; }
.region__seg { flex: 1; height: 5px; border-radius: 3px; background: var(--in); }
.region__seg--on { background: #f0b93a; }
.note { margin: 0; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 760px) {
  .hero { grid-template-columns: minmax(0, 1fr); }
}
</style>

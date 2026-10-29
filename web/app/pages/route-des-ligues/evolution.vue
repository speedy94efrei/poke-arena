<template>
  <div class="page">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="banner" role="alert">{{ error }}</p>
    <RouteNoRun v-if="!run" />
    <template v-else>
      <section v-if="current" class="evolve" aria-live="polite">
        <span class="evolve__kicker">{{ run.badges }} badge{{ run.badges > 1 ? 's' : '' }} · ton équipe passe au niveau {{ run.level }}</span>
        <h1 class="evolve__title">Quoi ? {{ speciesName(from) }} évolue !</h1>
        <div class="evolve__stage">
          <img :key="`${from}-a`" class="evolve__sprite evolve__sprite--from" :src="sprite(from, 'face')" :alt="speciesName(from)">
          <img :key="`${current.to}-b`" class="evolve__sprite evolve__sprite--to" :src="sprite(current.to, 'face')" :alt="speciesName(current.to)">
        </div>
        <div class="evolve__chips">
          <span v-for="entry in run.evolutions" :key="entry.index" class="chip" :class="{ 'chip--on': entry === current }">
            {{ speciesName(run.team[entry.index]!.species) }} → {{ speciesName(entry.to) }}
          </span>
        </div>
        <p class="evolve__text">{{ speciesName(from) }} peut devenir {{ speciesName(current.to) }}. Refuser garde ce stade : l'évolution revient au badge suivant.</p>
        <div class="evolve__actions">
          <button type="button" class="btn btn--primary" :disabled="pending" @click="act({ type: 'evoluer', index: current.index, accepter: true })">Évoluer</button>
          <button type="button" class="btn" :disabled="pending" @click="act({ type: 'evoluer', index: current.index, accepter: false })">Refuser</button>
        </div>
      </section>
      <p v-else class="banner">
        Aucune évolution n'attend : elles arrivent après les badges.
        <NuxtLink to="/route-des-ligues/arene" class="btn btn--small btn--primary">Préparer le prochain combat</NuxtLink>
      </p>

      <UiPanel v-if="stoneOptions.length" title="Pierres d'évolution">
        <div class="stones">
          <button v-for="option in stoneOptions" :key="`${option.index}-${option.stone}`" type="button" class="stone" :disabled="pending || run.phase !== 'carte'" @click="act({ type: 'pierre', index: option.index, stone: option.stone })">
            <ItemIcon :id="option.stone" :size="28" />
            <span>{{ itemName(option.stone) }} sur <b>{{ speciesName(option.from) }}</b> → {{ speciesName(option.to) }}</span>
          </button>
        </div>
      </UiPanel>

      <UiPanel title="Prochaines évolutions">
        <ul class="upcoming">
          <li v-for="member in run.team" :key="member.species">
            <img :src="sprite(member.species)" :alt="speciesName(member.species)">
            <b>{{ speciesName(member.species) }}</b>
            <span>{{ evolutionText(member.evolutions, speciesName, itemName) }}</span>
          </li>
        </ul>
      </UiPanel>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Évolution · Route des Ligues' })

const { run, error, pending, act, connected } = useRouteLigues()
const { sprite } = usePokedex()

const current = computed(() => run.value?.phase === 'evolution' ? run.value.evolutions[0] ?? null : null)
const from = computed(() => (current.value && run.value?.team[current.value.index]?.species) || '')

/** Pierres du sac qu'un Pokémon de l'équipe peut utiliser maintenant. */
const stoneOptions = computed(() => {
  const team = run.value?.team ?? []
  const stones = new Set(run.value?.stones ?? [])
  return team.flatMap((member, index) => member.evolutions
    .filter(evolution => evolution.by === 'stone' && stones.has(evolution.stone!))
    .map(evolution => ({ index, from: member.species, to: evolution.to, stone: evolution.stone! })))
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.banner { margin: 0; padding: 10px 14px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font: 700 14px 'Nunito', sans-serif; }
.evolve { padding: 22px; border-radius: var(--r); background: radial-gradient(circle at 50% 45%, #2a8a4a, #0a2214 70%); box-shadow: inset 0 0 0 3px #4cc46a, var(--pnS); color: #fff; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.evolve__kicker { font: 700 13px 'Nunito', sans-serif; color: #9ae8ae; }
.evolve__title { margin: 0; font: 700 32px 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .4); }
.evolve__stage { position: relative; width: 160px; height: 140px; }
.evolve__sprite { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; filter: brightness(0) invert(1); }
.evolve__sprite--from { animation: from 2.4s ease-in-out infinite; }
.evolve__sprite--to { animation: to 2.4s ease-in-out infinite; }
.evolve__chips { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.chip { padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, .12); font: 700 12px 'Nunito', sans-serif; }
.chip--on { background: #4cc46a; color: #06210f; }
.evolve__text { margin: 0; font: 700 13px 'Nunito', sans-serif; opacity: .9; }
.evolve__actions { display: flex; gap: 10px; }
.stones { display: flex; flex-direction: column; gap: 6px; }
.stone { padding: 8px 10px; border: 0; border-radius: 8px; background: var(--in); color: var(--tx); display: flex; align-items: center; gap: 10px; font: 700 13px 'Nunito', sans-serif; text-align: left; cursor: pointer; }
.upcoming { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.upcoming li { display: flex; align-items: center; gap: 8px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.upcoming img { width: 40px; height: 32px; object-fit: contain; image-rendering: pixelated; }
.upcoming b { min-width: 110px; color: var(--tx); font-size: 14px; }

@keyframes from { 0%, 40% { opacity: 1; } 50%, 90% { opacity: 0; } 100% { opacity: 1; } }
@keyframes to { 0%, 40% { opacity: 0; } 50%, 90% { opacity: 1; } 100% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .evolve__sprite--from { animation: none; opacity: 0; }
  .evolve__sprite--to { animation: none; }
}
</style>

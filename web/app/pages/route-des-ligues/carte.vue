<template>
  <div class="page">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="banner" role="alert">{{ error }}</p>
    <RouteNoRun v-if="!run" />
    <p v-else-if="run.phase === 'tirage'" class="banner">
      Choisis d'abord ton équipe dans le banc.
      <NuxtLink to="/route-des-ligues/tirage" class="btn btn--small btn--primary">Tirage du banc</NuxtLink>
    </p>
    <div v-else class="layout">
      <section class="map" aria-label="Carte de la région">
        <h1 class="map__title">{{ run.name }} · 8 arènes puis la Ligue</h1>
        <p v-if="run.phase === 'fin'" class="victory">🏆 {{ run.name }} est terminée : le Maître {{ run.champion.name }} est battu ! La région est validée pour de bon.</p>
        <p v-else-if="run.phase === 'evolution'" class="banner">
          Des Pokémon évoluent après ton badge.
          <NuxtLink to="/route-des-ligues/evolution" class="btn btn--small btn--primary">Voir l'évolution</NuxtLink>
        </p>
        <div class="gyms">
          <div v-for="(gym, index) in run.gyms" :key="gym.id" class="gym" :class="{ 'gym--done': gym.done, 'gym--current': gym.current, 'gym--locked': !gym.done && !gym.current }">
            <span class="gym__label">Arène {{ index + 1 }}</span>
            <span v-if="gym.done" class="gym__check" aria-label="Badge obtenu">✓</span>
            <img class="gym__sprite" :src="trainerSprite(gym.sprite)" :alt="gym.name">
            <span class="gym__name">{{ gym.name }}</span>
            <span class="gym__meta"><TypeBadge :type="frenchType(gym.type)" small /> N.{{ gym.level }}</span>
            <NuxtLink v-if="gym.current" to="/route-des-ligues/arene" class="gym__go">Préparer ▸</NuxtLink>
          </div>
        </div>
        <div class="league" aria-label="La Ligue">
          <div v-for="member in [...run.elite, run.champion]" :key="member.id" class="elite" :class="{ 'gym--done': member.done, 'gym--current': member.current, 'gym--locked': !member.done && !member.current }">
            <img class="elite__sprite" :src="trainerSprite(member.sprite)" :alt="member.name">
            <span class="gym__name">{{ member.name }}</span>
            <span class="elite__meta">{{ member.type === 'Champion' ? 'Maître' : typeLabel(member.type) }} · N.{{ member.level }}</span>
            <NuxtLink v-if="member.current" to="/route-des-ligues/arene" class="gym__go">Préparer ▸</NuxtLink>
          </div>
        </div>
        <p class="map__note">Conseil 4 à la suite, sans soin entre deux combats, puis le Maître. Une défaite contre un Champion, le Conseil ou le Maître fait recommencer {{ run.name }} avec un nouveau banc (le Maître laisse un dernier essai).</p>
      </section>

      <aside class="side">
        <UiPanel :title="`Ton équipe · niveau ${run.level}`">
          <ul class="team">
            <li v-for="member in run.team" :key="member.species" class="team__row">
              <img class="team__icon" :src="sprite(member.species)" :alt="speciesName(member.species)">
              <span class="team__text">
                <b>{{ speciesName(member.species) }}</b>
                <span>{{ typesOf(member.species) }}<template v-if="member.evolutions.length"> · {{ evolutionText(member.evolutions, speciesName, itemName) }}</template></span>
              </span>
              <span class="team__hp" :class="{ 'team__hp--low': member.hp < 50 }">{{ member.hp === 0 ? 'K.O.' : member.hp < 100 ? `${member.hp} %` : `N.${run.level}` }}</span>
            </li>
          </ul>
        </UiPanel>
        <UiPanel title="Débloqué">
          <div class="chips">
            <span v-for="tm in run.tms" :key="tm" class="chip"><b>CT</b> {{ moveName(tm) }}</span>
            <span v-for="(stone, index) in run.stones" :key="`${stone}-${index}`" class="chip">◆ {{ itemName(stone) }}</span>
            <span v-for="(item, index) in run.held" :key="`${item}-${index}`" class="chip">● {{ itemName(item) }}</span>
            <span class="chip">⇄ {{ run.trades }} échange{{ run.trades > 1 ? 's' : '' }} restant{{ run.trades > 1 ? 's' : '' }}</span>
          </div>
        </UiPanel>
        <UiPanel title="Journal de la région">
          <ul class="history">
            <li v-for="entry in run.history.slice(0, 8)" :key="entry.at + entry.text">{{ historyText(entry.text, speciesName) }}</li>
          </ul>
        </UiPanel>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Carte de la région · Route des Ligues' })

const { run, error, connected } = useRouteLigues()
const { species, sprite } = usePokedex()

const typeLabel = (type: string) => frenchType(type)
const typesOf = (id: string) => species(id)?.types.join(' / ') ?? ''
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.banner { margin: 0; padding: 10px 14px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font: 700 14px 'Nunito', sans-serif; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 12px; align-items: start; }
.map { padding: 14px 16px; border-radius: var(--r); background: linear-gradient(160deg, #1b4a2a, #0b2215); box-shadow: inset 0 0 0 3px #2f7a45, var(--pnS); color: #fff; display: flex; flex-direction: column; gap: 12px; }
.map__title { margin: 0; font: 700 24px 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 rgba(0, 0, 0, .4); }
.map__note { margin: 0; font: 700 12px/1.4 'Nunito', sans-serif; opacity: .85; }
.victory { margin: 0; padding: 12px 14px; border-radius: 10px; background: rgba(240, 185, 58, .18); box-shadow: inset 0 0 0 2px #f0b93a; font: 700 15px 'Nunito', sans-serif; }
.gyms { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.gym, .elite { position: relative; padding: 8px; border-radius: 12px; background: rgba(0, 0, 0, .3); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .12); color: #fff; text-decoration: none; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.gym--done { box-shadow: inset 0 0 0 2px #f0b93a; }
.gym--current { box-shadow: inset 0 0 0 3px #4cc46a; background: rgba(76, 196, 106, .16); }
.gym--locked { opacity: .45; }
.gym__go { margin-top: 2px; padding: 3px 10px; border-radius: 6px; background: #4cc46a; color: #06210f; font: 800 12px 'Nunito', sans-serif; text-decoration: none; }
.gym__label { font: 700 11px 'Nunito', sans-serif; opacity: .8; }
.gym__check { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; background: #f0b93a; color: #3a2400; display: grid; place-items: center; font: 800 12px 'Nunito', sans-serif; }
.gym__sprite { width: 64px; height: 64px; object-fit: contain; image-rendering: pixelated; }
.gym__name { font: 600 15px 'Pixelify Sans', sans-serif; }
.gym__meta { display: flex; align-items: center; gap: 4px; font: 700 11px 'Nunito', sans-serif; }
.league { padding: 8px; border-radius: 12px; background: rgba(0, 0, 0, .25); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .1); display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.elite__sprite { width: 52px; height: 52px; object-fit: contain; image-rendering: pixelated; }
.elite__meta { font: 700 11px 'Nunito', sans-serif; opacity: .85; }
.side { display: flex; flex-direction: column; gap: 12px; }
.team { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.team__row { padding: 4px 8px; border-radius: 8px; background: var(--in); display: flex; align-items: center; gap: 8px; }
.team__icon { width: 40px; height: 32px; object-fit: contain; image-rendering: pixelated; }
.team__text { flex: 1; min-width: 0; display: flex; flex-direction: column; font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.team__text b { font: 700 14px 'Nunito', sans-serif; color: var(--tx); }
.team__hp { font: 600 14px 'Pixelify Sans', sans-serif; }
.team__hp--low { color: var(--bad); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 4px 8px; border-radius: 7px; background: var(--in); font: 700 12px 'Nunito', sans-serif; }
.chip b { color: var(--good); }
.history { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 3px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 1100px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .gyms { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .league { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>

<template>
  <div class="player">
    <NuxtLink to="/pokedraft/classement" class="player__back">← Classement de la saison</NuxtLink>

    <div v-if="failed" class="notice">{{ failed }}</div>
    <section v-else-if="missing" class="panel">
      <header class="panel__head">Joueur introuvable</header>
      <p class="empty">Aucun joueur ne s'appelle « {{ route.params.id }} ». Vérifie le pseudo ou retrouve-le dans le classement.</p>
    </section>

    <template v-else-if="player">
      <section aria-label="Rang du joueur" class="hero" :style="{ background: BANNER_BACKGROUNDS[player.banner] ?? BANNER_BACKGROUNDS.depart }">
        <span class="hero__veil" />
        <div class="hero__crest"><RankCrest :tier="player.rank.tier" :division="player.rank.division" :size="120" :label="player.rank.label" /></div>
        <div class="hero__main">
          <span class="hero__kicker">
            Saison {{ player.season }} · bannière {{ bannerName }}
            <span v-if="isMe" class="hero__me">C'EST TOI</span>
          </span>
          <h1 class="hero__name">{{ player.name }}</h1>
          <span class="hero__rank" :style="{ color: tierStyle(player.rank.tier).ink }">{{ player.rank.placed ? player.rank.label : 'En placement' }}</span>
          <span v-if="player.rank.placed" class="hero__points">
            <b>{{ player.rank.points }}</b>{{ player.rank.division ? ' / 100 PL' : ' PL' }} · #<b>{{ player.position }}</b> sur {{ player.players }}<template v-if="player.top_percent !== null"> · top {{ percent(player.top_percent) }}</template>
          </span>
          <span v-else class="hero__points">Placement : <b>{{ player.placement.played }}</b> / {{ player.placement.needed }} drafts classés</span>
          <span v-if="player.peak" class="hero__peak">Meilleur rang de la saison : {{ player.peak }}</span>
          <NuxtLink v-if="isMe" to="/pokedraft/classement" class="hero__link">Points, pénalités et bannières : mon classement →</NuxtLink>
        </div>
        <div class="stats">
          <div v-for="tile in tiles" :key="tile.key" class="stats__tile">
            <span class="stats__key">{{ tile.key }}</span>
            <span class="stats__value" :style="{ color: tile.color }">{{ tile.value }}</span>
            <span class="stats__detail">{{ tile.detail }}</span>
          </div>
        </div>
      </section>

      <div class="columns">
        <section aria-label="Pokémon signature" class="panel">
          <header class="panel__head">Pokémon signature<span class="panel__aside">Les plus draftés cette saison</span></header>
          <div v-if="signature.length" class="picks">
            <div v-for="pick in signature" :key="pick.id" class="pick">
              <img class="pick__sprite" :src="pick.sprite" alt="" loading="lazy">
              <span class="pick__text"><b>{{ pick.name }}</b><span>{{ pick.picks }} draft{{ pick.picks > 1 ? 's' : '' }}</span></span>
              <span class="pick__rate">
                <span class="pick__value">{{ pick.win_rate === null ? '—' : percent(pick.win_rate) }}</span>
                <span class="pick__bar"><span class="pick__fill" :style="{ width: `${(pick.win_rate ?? 0) * 100}%` }" /></span>
                <span class="pick__label">victoires</span>
              </span>
            </div>
          </div>
          <p v-else class="empty">Pas encore de draft classé cette saison.</p>
        </section>

        <section aria-label="Bans favoris" class="panel">
          <header class="panel__head">Bans favoris<span class="panel__aside">Les plus bannis cette saison</span></header>
          <div v-if="bans.length" class="picks">
            <div v-for="ban in bans" :key="ban.id" class="pick pick--ban">
              <img class="pick__sprite" :src="ban.sprite" alt="" loading="lazy">
              <span class="pick__text"><b>{{ ban.name }}</b><span>banni {{ ban.bans }} fois</span></span>
            </div>
          </div>
          <p v-else class="empty">Aucun ban pour l'instant.</p>
        </section>
      </div>

      <section aria-label="Derniers drafts classés" class="panel">
        <header class="panel__head">Derniers drafts classés<span v-if="player.drafts.length" class="panel__aside">{{ draftsSummary }}</span></header>
        <div v-if="drafts.length" class="drafts">
          <div v-for="(draft, index) in drafts" :key="index" class="draft" :style="{ boxShadow: `inset 3px 0 0 ${draft.color}` }">
            <span class="draft__result" :style="{ color: draft.color }">{{ draft.label }}</span>
            <span class="draft__who">
              <span>contre <NuxtLink :to="playerPath(draft.opponent.showdown_id)" class="draft__opponent">{{ draft.opponent.name }}</NuxtLink></span>
              <span class="draft__when">{{ relativeDate(draft.at) }} · {{ draft.turns }} tour{{ draft.turns > 1 ? 's' : '' }}<template v-if="draft.note"> · {{ draft.note }}</template> · <NuxtLink :to="replayLink(draft.room_id)" class="draft__replay">▶ Revoir</NuxtLink></span>
            </span>
            <span class="draft__teams">
              <span class="draft__team">
                <img v-for="mon in draft.team" :key="mon.id" class="draft__sprite" :src="mon.sprite" :alt="mon.name" :title="mon.name" loading="lazy">
              </span>
              <span class="draft__versus">VS</span>
              <span class="draft__team draft__team--opponent">
                <img v-for="mon in draft.opponentTeam" :key="mon.id" class="draft__sprite" :src="mon.sprite" :alt="mon.name" :title="mon.name" loading="lazy">
              </span>
            </span>
            <span class="draft__delta" :style="{ color: draft.color }">{{ draft.points_delta ? `${signed(draft.points_delta)} PL` : '' }}</span>
          </div>
        </div>
        <p v-else class="empty">{{ player.name }} n'a pas encore joué de draft classé cette saison.</p>
      </section>

      <div class="columns">
        <section aria-label="Bannières" class="panel">
          <header class="panel__head">Bannières<span class="panel__aside">{{ unlocked.length }}/{{ player.banners.length }} débloquées</span></header>
          <div class="banners">
            <div v-for="banner in unlocked" :key="banner.key" class="banner" :class="{ 'banner--on': banner.equipped }" :style="{ background: BANNER_BACKGROUNDS[banner.key] }">
              <span class="banner__name">{{ banner.name }}</span>
              <span v-if="banner.equipped" class="banner__tag">ÉQUIPÉE</span>
            </div>
          </div>
        </section>

        <section aria-label="Saisons passées" class="panel">
          <header class="panel__head">Saisons passées</header>
          <div class="seasons">
            <div v-for="past in player.past_seasons" :key="past.number" class="season">
              <span class="season__rate">{{ past.wins + past.losses ? percent(past.wins / (past.wins + past.losses)) : '—' }}</span>
              <span class="season__text"><b>{{ past.name }}</b><span>Rang final {{ past.rank }} · {{ past.wins + past.losses }} parties</span></span>
            </div>
            <p v-if="!player.past_seasons.length" class="empty">Première saison pour {{ player.name }}.</p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PublicProfile } from '~/utils/ranked'

const RESULTS = {
  victoire: { label: 'V', color: '#58d080' },
  defaite: { label: 'D', color: '#ff8a7a' },
  egalite: { label: '=', color: '#c8d0dc' },
}

const route = useRoute()
const { request, profile } = useAccount()

const player = ref<PublicProfile | null>(null)
const missing = ref(false)
const failed = ref('')

useHead({ title: computed(() => `${player.value?.name ?? 'Joueur'} · PokéDraft`) })

const isMe = computed(() => Boolean(player.value && profile.value?.showdown_id === player.value.showdown_id))
const bannerName = computed(() => player.value?.banners.find(banner => banner.equipped)?.name ?? 'Départ')
const unlocked = computed(() => player.value?.banners.filter(banner => banner.unlocked) ?? [])

const mon = (id: string) => {
  const pokemon = findPokemon(id)
  return { id, name: pokemon?.nom ?? id, sprite: pokemon?.sprite ?? '' }
}

const signature = computed(() => (player.value?.signature ?? []).map(pick => ({ ...pick, ...mon(pick.pokemon) })))
const bans = computed(() => (player.value?.bans ?? []).map(ban => ({ ...ban, ...mon(ban.pokemon) })))

const drafts = computed(() => (player.value?.drafts ?? []).map(draft => ({
  ...draft,
  ...RESULTS[draft.result],
  team: draft.team.map(mon),
  opponentTeam: draft.opponent_team.map(mon),
})))

const draftsSummary = computed(() => {
  const list = player.value?.drafts ?? []
  const wins = list.filter(draft => draft.result === 'victoire').length
  const total = list.reduce((sum, draft) => sum + (draft.points_delta ?? 0), 0)
  return `${wins} V · ${list.length - wins} D sur les ${list.length} derniers · ${signed(total)} PL`
})

const tiles = computed(() => {
  const current = player.value!
  const { wins, losses, ties } = current.record
  const games = wins + losses + ties
  return [
    { key: 'Drafts classés', value: String(games), color: '#fff', detail: `${wins} V · ${losses} D${ties ? ` · ${ties} nul${ties > 1 ? 's' : ''}` : ''}` },
    { key: 'Victoires', value: games ? percent(wins / games) : '—', color: '#58d080', detail: games ? 'sur la saison' : 'aucun draft joué' },
    { key: 'Série en cours', value: current.streak ? `${current.streak} V` : '—', color: '#ffd23a', detail: current.streak >= 2 ? "victoires d'affilée, bonus de PL actif" : 'pas de série' },
    { key: 'Prochain palier', value: current.next?.label ?? '—', color: '#9fd0ff', detail: current.next ? `encore ${current.next.points_needed} PL` : current.rank.placed ? 'au sommet des divisions' : 'après les placements' },
  ]
})

const load = async (id: string) => {
  missing.value = false
  failed.value = ''
  player.value = null
  try {
    player.value = (await request<{ data: PublicProfile }>(`/players/${encodeURIComponent(id)}`)).data
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) missing.value = true
    else failed.value = apiErrorMessage(error)
  }
}

watch(() => String(route.params.id), load, { immediate: true })
</script>

<style scoped>
.player { display: flex; flex-direction: column; gap: 12px; }
.player__back { align-self: flex-start; font: 700 13px 'Nunito', sans-serif; color: var(--mu); text-decoration: none; }
.player__back:hover { color: var(--tx); }

.notice {
  padding: 10px 14px;
  border-radius: var(--r);
  background: #3a2216;
  box-shadow: inset 0 0 0 2px #e8704a, 0 0 0 2px var(--bd);
  font: 700 14px 'Nunito', sans-serif;
  color: #ffd9c8;
}

.hero {
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--r) + 4px);
  box-shadow: var(--pnS);
  min-height: 240px;
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) minmax(0, 340px);
  gap: 18px;
  align-items: center;
  padding: 18px 22px;
  color: #fff;
}

.hero__veil { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8, 10, 16, .15), rgba(8, 10, 16, .82) 55%); }
.hero__crest, .hero__main, .stats { position: relative; }
.hero__crest { display: flex; justify-content: center; }
.hero__main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.hero__kicker { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font: 700 12px 'Nunito', sans-serif; color: #e8eefc; }

.hero__me {
  height: 18px;
  padding: 0 7px;
  border-radius: 9px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 10px 'Nunito', sans-serif;
  display: inline-flex;
  align-items: center;
}

.hero__name { margin: 0; font: 700 44px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .6); overflow-wrap: anywhere; }
.hero__rank { font: 700 24px/1 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); }
.hero__points { font: 700 14px/1.45 'Nunito', sans-serif; }
.hero__points b { font: 600 18px 'Pixelify Sans', sans-serif; }
.hero__peak { font: 700 12px 'Nunito', sans-serif; color: #d8e0f0; }
.hero__link { align-self: flex-start; font: 700 12px 'Nunito', sans-serif; color: #ffd23a; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }

.stats__tile {
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(0, 0, 0, .5);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14);
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stats__key { font: 700 11px 'Nunito', sans-serif; color: #c8d0dc; }
.stats__value { font: 600 22px/1.1 'Pixelify Sans', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stats__detail { font: 400 11px/1.3 'Nunito', sans-serif; color: #d8dce6; }

.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; min-width: 0; }

.panel__head {
  min-height: 34px;
  padding: 0 12px;
  background: var(--hd);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font: 600 16px 'Pixelify Sans', sans-serif;
  color: var(--hdTx);
  text-shadow: var(--hdSh);
}

.panel__aside { margin-left: auto; font: 700 12px 'Nunito', sans-serif; text-shadow: none; }
.columns { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.picks { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }

.pick {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) minmax(0, 150px);
  gap: 10px;
  align-items: center;
  padding: 4px 10px 4px 4px;
  border-radius: 8px;
  background: var(--in);
}

.pick--ban { grid-template-columns: 44px minmax(0, 1fr); }
.pick--ban .pick__sprite { filter: grayscale(.7); }
.pick__sprite { width: 44px; height: 44px; object-fit: contain; image-rendering: pixelated; }
.pick__text { display: flex; flex-direction: column; min-width: 0; font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.pick__text b { font: 700 14px 'Nunito', sans-serif; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pick__rate { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 8px; align-items: center; }
.pick__value { grid-row: span 2; font: 600 17px 'Pixelify Sans', sans-serif; color: var(--good); }
.pick__bar { height: 7px; border-radius: 4px; background: rgba(0, 0, 0, .35); overflow: hidden; }
.pick__fill { display: block; height: 100%; background: linear-gradient(90deg, #2f9a58, #58d080); }
.pick__label { font: 700 10px 'Nunito', sans-serif; color: var(--mu); }
.drafts { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }

.draft {
  display: grid;
  grid-template-columns: 30px minmax(0, 170px) minmax(0, 1fr) 64px;
  gap: 10px;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--in);
}

.draft__result { font: 700 20px 'Pixelify Sans', sans-serif; text-align: center; }
.draft__who { display: flex; flex-direction: column; min-width: 0; font: 700 13px 'Nunito', sans-serif; }
.draft__opponent { color: var(--tx); }
.draft__when { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.draft__replay { color: var(--ac); }
.draft__teams { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }
.draft__team { flex: none; display: flex; gap: 2px; }
.draft__team--opponent { opacity: .75; }
.draft__versus { font: 600 12px 'Pixelify Sans', sans-serif; color: var(--mu); }
.draft__sprite { width: 34px; height: 34px; object-fit: contain; image-rendering: pixelated; }
.draft__delta { font: 600 16px 'Pixelify Sans', sans-serif; text-align: right; white-space: nowrap; }
.banners { padding: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.banner { position: relative; height: 62px; border-radius: 9px; overflow: hidden; }
.banner--on { box-shadow: inset 0 0 0 2px var(--uA); }
.banner__name { position: absolute; left: 9px; bottom: 7px; font: 700 14px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); }

.banner__tag {
  position: absolute;
  right: 7px;
  top: 7px;
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 10px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.seasons { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }

.season {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 5px 8px;
  border-radius: 7px;
  background: var(--in);
}

.season__rate { font: 600 17px 'Pixelify Sans', sans-serif; }
.season__text { display: flex; flex-direction: column; min-width: 0; font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.season__text b { font: 700 13px 'Nunito', sans-serif; color: var(--tx); }
.empty { margin: 0; padding: 14px 12px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 1100px) {
  .hero, .columns { grid-template-columns: minmax(0, 1fr); }
  .hero__crest { justify-content: flex-start; }
}

@media (max-width: 700px) {
  .draft { grid-template-columns: 26px minmax(0, 1fr) auto; }
  .draft__teams { grid-column: 1 / -1; grid-row: 2; flex-direction: column; align-items: flex-start; gap: 2px; }
  .draft__sprite { width: 28px; height: 28px; }
  .pick { grid-template-columns: 44px minmax(0, 1fr); }
  .pick__rate { grid-column: 2; }
}
</style>

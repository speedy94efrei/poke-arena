<template>
  <div class="home">
    <section aria-label="Saison en cours" class="hero">
      <span class="hero__shine" />
      <div class="hero__left">
        <span class="hero__patch">Patch {{ season?.patch ?? '…' }} · {{ roster.pokemon.length }} Pokémon</span>
        <h1 class="hero__title">Saison {{ season?.number ?? roster.saison }}</h1>
        <span class="hero__dates">
          <template v-if="season">Du {{ day(season.starts_at) }} au {{ day(season.ends_at) }}. À la fin, ton rang est figé et tu gagnes l'écusson de saison.</template>
          <template v-else-if="failed">{{ failed }}</template>
          <template v-else>Chargement de la saison…</template>
        </span>
        <div v-if="season" class="countdown">
          <div v-for="part in countdown" :key="part.label" class="countdown__part">
            <span class="countdown__value">{{ part.value }}</span>
            <span class="countdown__label">{{ part.label }}</span>
          </div>
        </div>
      </div>
      <div class="hero__right">
        <NuxtLink to="/pokedraft/draft" class="hero__play">▶ Jouer en classé</NuxtLink>
        <div class="me">
          <template v-if="profile">
            <RankCrest :tier="profile.rank.tier" :size="40" />
            <div class="me__text">
              <span class="me__rank">
                <template v-if="profile.rank.placed">{{ profile.rank.label }} · <b>{{ profile.rank.points }}</b> PL</template>
                <template v-else>Placements · <b>{{ profile.placement.played }}</b>/{{ profile.placement.needed }}</template>
              </span>
              <div class="me__bar"><div class="me__fill" :style="{ width: `${progress}%` }" /></div>
            </div>
          </template>
          <template v-else>
            <span class="me__invite">Connecte-toi pour suivre ton rang et tes points.</span>
            <button type="button" class="btn btn--small btn--primary" @click="dialog = 'login'">Se connecter</button>
          </template>
        </div>
        <span class="hero__drafts"><b>{{ stats?.drafts_today ?? 0 }}</b> drafts classés en 24 h · <b>{{ stats?.drafts ?? 0 }}</b> cette saison</span>
      </div>
    </section>

    <div class="body">
      <section aria-label="Méta de la saison" class="panel">
        <header class="panel__head">Méta de la saison<span class="panel__aside"><b>{{ drafts }}</b> drafts classés</span></header>
        <div class="meta__tools">
          <button v-for="tab in SORTS" :key="tab.key" type="button" class="chip" :class="{ 'chip--on': sort === tab.key }" :aria-pressed="sort === tab.key" @click="sort = tab.key">{{ tab.label }}</button>
          <span class="meta__hint">Présence = part des drafts où il est pické ou banni</span>
        </div>
        <div v-if="!meta.length" class="empty">
          <span class="empty__title">Pas encore de méta</span>
          <span class="empty__text">Les statistiques apparaissent après les premiers drafts classés de la saison.</span>
        </div>
        <div v-else role="table" class="meta">
          <div role="row" class="meta__row meta__row--head"><span>#</span><span>Pokémon</span><span>Présence</span><span class="meta__num">Ban</span><span class="meta__num">Victoire</span></div>
          <NuxtLink v-for="(row, index) in meta" :key="row.pokemon.id" role="row" class="meta__row" :to="`/pokedraft/codex?id=${row.pokemon.id}`">
            <span class="meta__rank">{{ index + 1 }}</span>
            <span class="meta__name">
              <img class="meta__sprite" :src="row.pokemon.sprite" alt="" loading="lazy">
              <span class="meta__label">{{ row.pokemon.nom }}</span>
              <span v-if="row.pokemon.correction" class="meta__fix" title="Corrigé au patch">✎</span>
            </span>
            <span class="meta__presence">
              <span class="meta__bar"><span class="meta__pick" :style="{ width: `${row.pickShare * 100}%` }" /><span class="meta__ban" :style="{ width: `${row.ban_rate * 100}%` }" /></span>
              <b>{{ percent(row.presence) }}</b>
            </span>
            <span class="meta__num meta__num--ban">{{ percent(row.ban_rate) }}</span>
            <span class="meta__num" :class="row.win_rate === null ? '' : row.win_rate >= .5 ? 'up' : 'down'">
              {{ row.win_rate === null ? '—' : `${row.win_rate >= .5 ? '▲' : '▼'} ${percent(row.win_rate, 1)}` }}
            </span>
          </NuxtLink>
          <div class="meta__legend"><span><i class="meta__key" />Pické</span><span><i class="meta__key meta__key--ban" />Banni</span><span>Victoire ▲ au-dessus de 50 %, ▼ en dessous</span></div>
        </div>
      </section>

      <div class="side">
        <section aria-label="Notes de patch" class="panel">
          <header class="panel__head panel__head--patch">✎ Notes du patch {{ season?.patch ?? '' }}<span class="panel__aside"><b>{{ corrections.length }}</b></span></header>
          <div class="notes">
            <NuxtLink v-for="pokemon in corrections" :key="pokemon.id" :to="`/pokedraft/codex?id=${pokemon.id}`" class="note">
              <img class="note__sprite" :src="pokemon.sprite" alt="" loading="lazy">
              <span class="note__text"><b>{{ pokemon.nom }}</b><span>{{ pokemon.correction }}</span></span>
            </NuxtLink>
            <span v-if="!corrections.length" class="empty__text">Aucune correction dans ce patch.</span>
          </div>
        </section>
        <section aria-label="Duos fréquents" class="panel">
          <header class="panel__head">Duos fréquents</header>
          <div class="duos">
            <div v-for="duo in duos" :key="duo.key" class="duo">
              <img class="duo__sprite" :src="duo.first.sprite" :alt="duo.first.nom">
              <span class="duo__plus">+</span>
              <img class="duo__sprite" :src="duo.second.sprite" :alt="duo.second.nom">
              <span class="duo__text"><b>{{ duo.first.nom }} + {{ duo.second.nom }}</b><span>{{ duo.why }}</span></span>
              <span class="duo__share"><b>{{ percent(duo.share) }}</b><span>des équipes</span></span>
            </div>
            <span v-if="!duos.length" class="empty__text">Les duos apparaissent après les premiers drafts classés.</span>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { Duo, PokemonStat, SeasonInfo } from '~/utils/ranked'

const SORTS = [{ key: 'presence', label: 'Présence' }, { key: 'ban_rate', label: 'Taux de ban' }, { key: 'win_rate', label: 'Victoire' }] as const

const { request, profile, dialog } = useAccount()
useHead({ title: 'Accueil de saison · PokéDraft' })

const season = ref<SeasonInfo | null>(null)
const stats = ref<{ drafts: number, drafts_today: number } | null>(null)
const pokemonStats = ref<PokemonStat[]>([])
const duoStats = ref<Duo[]>([])
const drafts = ref(0)
const failed = ref('')
const sort = ref<(typeof SORTS)[number]['key']>('presence')
const now = ref(Date.now())

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

const countdown = computed(() => {
  const left = Math.max(0, new Date(season.value?.ends_at ?? 0).getTime() - now.value)
  return [
    { value: Math.floor(left / 864e5), label: 'jours' },
    { value: String(Math.floor(left % 864e5 / 36e5)).padStart(2, '0'), label: 'heures' },
    { value: String(Math.floor(left % 36e5 / 6e4)).padStart(2, '0'), label: 'minutes' },
  ]
})

const progress = computed(() => {
  const current = profile.value
  if (!current) return 0
  if (!current.rank.placed) return current.placement.played / current.placement.needed * 100
  return current.rank.division ? current.rank.points : 100
})

const meta = computed(() => pokemonStats.value
  .map(stat => ({ ...stat, pokemon: findPokemon(stat.pokemon), pickShare: Math.max(0, stat.presence - stat.ban_rate) }))
  .filter((row): row is typeof row & { pokemon: Pokemon } => Boolean(row.pokemon))
  .sort((a, b) => (b[sort.value] ?? -1) - (a[sort.value] ?? -1)))

const corrections = computed(() => roster.pokemon.filter(pokemon => pokemon.correction))

const duos = computed(() => duoStats.value.map((duo) => {
  const first = findPokemon(duo.pokemon[0])
  const second = findPokemon(duo.pokemon[1])
  if (!first || !second) return null
  const shared = first.archetypes.find(archetype => second.archetypes.includes(archetype))
  return { key: duo.pokemon.join('-'), first, second, share: duo.share, why: shared ? `Archétype ${shared}` : `${duo.teams} équipes` }
}).filter(duo => duo !== null))

let timer: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 30000)
  try {
    const [current, pokemon, pairs] = await Promise.all([
      request<{ data: SeasonInfo, stats: { drafts: number, drafts_today: number } }>('/seasons/current'),
      request<{ data: PokemonStat[], drafts: number }>('/seasons/current/pokemon-stats'),
      request<{ data: Duo[] }>('/seasons/current/duos'),
    ])
    season.value = current.data
    stats.value = current.stats
    pokemonStats.value = pokemon.data
    drafts.value = pokemon.drafts
    duoStats.value = pairs.data
  } catch (error) {
    failed.value = apiErrorMessage(error)
  }
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.home { display: flex; flex-direction: column; gap: 12px; }

.hero {
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--r) + 4px);
  background: linear-gradient(120deg, var(--hd) 0%, var(--uB) 50%, var(--dk) 100%);
  box-shadow: inset 0 0 0 3px var(--uA), 0 0 0 2px var(--bd);
  padding: 20px 22px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 1fr);
  gap: 18px;
  align-items: center;
  color: #fff;
}

.hero__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 0, rgba(255, 236, 170, .18) 50%, transparent 100%) no-repeat;
  background-size: 200px 100%;
  animation: shine 5s linear infinite;
}

.hero__left, .hero__right { position: relative; display: flex; flex-direction: column; gap: 8px; }
.hero__right { align-items: stretch; gap: 10px; }

.hero__patch {
  height: 24px;
  align-self: flex-start;
  padding: 0 10px;
  border-radius: 5px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.hero__title { margin: 0; font: 700 52px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 var(--uAtx); }
.hero__dates { font: 700 15px/1.45 'Atkinson Hyperlegible', sans-serif; color: #fbe8c0; }
.countdown { display: flex; gap: 8px; margin-top: 4px; }

.countdown__part {
  min-width: 64px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(32, 20, 2, .7);
  box-shadow: inset 0 0 0 2px rgba(240, 185, 58, .45);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.countdown__value { font: 700 30px/1 'Pixelify Sans', sans-serif; color: var(--uA); }
.countdown__label { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: #fbe8c0; }

.hero__play {
  height: 72px;
  border-radius: 14px;
  background: var(--uA);
  color: var(--uAtx);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 700 28px 'Pixelify Sans', sans-serif;
  box-shadow: inset 0 -6px 0 rgba(0, 0, 0, .22), 0 0 0 3px var(--uAtx), 0 6px 0 3px rgba(0, 0, 0, .35);
}

.hero__play:hover { text-decoration: none; filter: brightness(1.08); }

.me {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(32, 20, 2, .7);
}

.me__text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.me__rank { font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.me__rank b { font: 600 16px 'Pixelify Sans', sans-serif; }
.me__bar { height: 8px; border-radius: 2px; background: rgba(0, 0, 0, .45); overflow: hidden; }
.me__fill { height: 100%; background: var(--uA); animation: grow .7s steps(12) both; }
.me__invite { flex: 1; font: 700 13px/1.4 'Atkinson Hyperlegible', sans-serif; color: #fbe8c0; }
.hero__drafts { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: #fbe8c0; text-align: center; }
.hero__drafts b { font: 600 14px 'Pixelify Sans', sans-serif; }

.body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.panel {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  overflow: hidden;
  min-width: 0;
}

.panel__head {
  height: 34px;
  padding: 0 12px;
  background: var(--hd);
  display: flex;
  align-items: center;
  gap: 8px;
  font: 600 16px 'Pixelify Sans', sans-serif;
  color: var(--hdTx);
  text-shadow: var(--hdSh);
}

.panel__head--patch { background: #a8481e; text-shadow: 2px 2px 0 #4a1a06; }
.panel__aside { margin-left: auto; font: 700 12px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; }
.panel__aside b { font: 600 14px 'Pixelify Sans', sans-serif; }

.meta__tools {
  padding: 8px 12px 4px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.chip {
  border: 0;
  cursor: pointer;
  height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--chip);
  color: var(--tx);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.chip--on { background: var(--uA); color: var(--uAtx); }
.meta__hint { margin-left: auto; font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.meta { padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 2px; }

.meta__row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1.3fr) 58px 70px;
  gap: 8px;
  align-items: center;
  padding: 3px 6px;
  border-radius: 6px;
  color: var(--tx);
}

.meta__row:hover { background: var(--chip); text-decoration: none; }
.meta__row--head { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); border-bottom: 2px solid var(--chip); border-radius: 0; }
.meta__row--head:hover { background: transparent; }
.meta__rank { font: 600 14px 'Pixelify Sans', sans-serif; color: var(--mu); }
.meta__name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.meta__sprite { width: 36px; height: 36px; object-fit: contain; image-rendering: pixelated; flex: none; }
.meta__label { font: 700 14px 'Atkinson Hyperlegible', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.meta__fix {
  flex: none;
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  background: #e8704a;
  color: #1a0a00;
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.meta__presence { display: flex; align-items: center; gap: 6px; }
.meta__presence b { width: 44px; text-align: right; font: 600 14px 'Pixelify Sans', sans-serif; }
.meta__bar { flex: 1; height: 12px; border-radius: 2px; background: var(--in); overflow: hidden; display: flex; }
.meta__pick { height: 100%; background: var(--uA); }
.meta__ban { height: 100%; background: repeating-linear-gradient(135deg, #c8362a 0 3px, #8a241c 3px 6px); }
.meta__num { text-align: right; font: 600 14px 'Pixelify Sans', sans-serif; }
.meta__row--head .meta__num { font: inherit; }
.meta__num--ban { color: #ff8a7a; }
.up { color: #58d080; }
.down { color: #ff8a7a; }

.meta__legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  padding: 8px 6px 0;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.meta__legend span { display: flex; align-items: center; gap: 5px; }
.meta__key { width: 14px; height: 8px; background: var(--uA); }
.meta__key--ban { background: repeating-linear-gradient(135deg, #c8362a 0 3px, #8a241c 3px 6px); }

.empty { padding: 24px 12px; display: flex; flex-direction: column; gap: 6px; align-items: center; text-align: center; }
.empty__title { font: 700 20px 'Pixelify Sans', sans-serif; }
.empty__text { font: 700 13px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.notes, .duos { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }

.note {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 8px;
  border-radius: 8px;
  background: var(--in);
  color: var(--tx);
}

.note:hover { background: var(--chip); text-decoration: none; }
.note__sprite { width: 44px; height: 44px; object-fit: contain; image-rendering: pixelated; }
.note__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; font: 400 13px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.note__text b { font: 700 15px 'Atkinson Hyperlegible', sans-serif; color: var(--tx); }

.duo {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 4px;
  border-radius: 8px;
  background: var(--in);
}

.duo__sprite { width: 40px; height: 40px; object-fit: contain; image-rendering: pixelated; flex: none; }
.duo__plus { font: 600 14px 'Pixelify Sans', sans-serif; color: var(--uA); }
.duo__text { flex: 1; min-width: 0; display: flex; flex-direction: column; font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.duo__text b { font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.duo__share { display: flex; flex-direction: column; align-items: flex-end; font: 700 10px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.duo__share b { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--tx); }

@keyframes shine { from { background-position: -200px 0; } to { background-position: calc(100% + 200px) 0; } }
@keyframes grow { from { width: 0; } }

@media (max-width: 980px) {
  .hero, .body { grid-template-columns: minmax(0, 1fr); }
}
</style>

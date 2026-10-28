<template>
  <div class="ranking">
    <div class="ranking__head">
      <h1 class="ranking__title">Classement et saison</h1>
      <span class="ranking__subtitle">Saison {{ season?.number ?? roster.saison }}<template v-if="season"> · fin dans {{ daysLeft }} jour{{ daysLeft > 1 ? 's' : '' }}</template> · de Poké Ball à Master Ball</span>
    </div>

    <div v-if="failed" class="notice">{{ failed }}</div>

    <section v-if="profile" aria-label="Ton rang" class="me" :style="{ background: BANNER_BACKGROUNDS[profile.banner] ?? BANNER_BACKGROUNDS.depart }">
      <span class="me__veil" />
      <div class="me__crest"><RankCrest :tier="profile.rank.tier" :division="profile.rank.division" :size="110" :label="profile.rank.label" /></div>
      <div class="me__main">
        <span class="me__banner">Bannière : {{ equippedName }}</span>
        <span class="me__rank" :style="{ color: tierStyle(profile.rank.tier).ink }">{{ profile.rank.placed ? profile.rank.label : 'En placement' }}</span>
        <template v-if="profile.rank.placed">
          <span class="me__points"><b>{{ profile.rank.points }}</b>{{ profile.rank.division ? ' / 100 PL' : ' PL' }}<template v-if="profile.next"> · encore {{ profile.next.points_needed }} PL avant {{ profile.next.label }}</template></span>
          <div role="progressbar" aria-label="Points de ligue" :aria-valuenow="profile.rank.points" aria-valuemin="0" aria-valuemax="100" class="me__bar">
            <div class="me__fill" :style="{ width: `${profile.rank.division ? profile.rank.points : 100}%` }"><span class="me__sweep" /></div>
          </div>
          <span class="me__position">#<b>{{ profile.position }}</b> sur {{ profile.players }} joueur{{ profile.players > 1 ? 's' : '' }}<template v-if="profile.top_percent !== null"> · top {{ percent(profile.top_percent) }}</template> · <NuxtLink :to="playerPath(profile.showdown_id)" class="me__public">ma fiche publique</NuxtLink></span>
        </template>
        <span v-else class="me__points">Encore <b>{{ profile.placement.needed - profile.placement.played }}</b> draft{{ profile.placement.needed - profile.placement.played > 1 ? 's' : '' }} classé{{ profile.placement.needed - profile.placement.played > 1 ? 's' : '' }} avant ton premier rang.</span>
      </div>
      <div class="status">
        <div v-for="card in statusCards" :key="card.key" class="status__card" :style="{ boxShadow: `inset 0 0 0 2px ${card.ring}` }">
          <span class="status__key" :style="{ color: card.color }"><b>{{ card.icon }}</b>{{ card.key }}</span>
          <span class="status__value">{{ card.value }}</span>
          <span class="status__detail">{{ card.detail }}</span>
        </div>
      </div>
    </section>
    <section v-else aria-label="Ton rang" class="me me--guest">
      <div class="me__main">
        <span class="me__rank">Ton rang t'attend</span>
        <span class="me__points">Crée un compte ou connecte-toi pour suivre tes points, ton historique et débloquer des bannières.</span>
        <div class="me__actions">
          <button type="button" class="btn btn--primary" @click="dialog = 'register'">Créer un compte</button>
          <button type="button" class="btn" @click="dialog = 'login'">Se connecter</button>
        </div>
      </div>
    </section>

    <section aria-label="Échelle des rangs" class="panel">
      <header class="panel__head">Échelle des rangs<span class="panel__aside">Plus tu montes, plus ton écusson s'enrichit</span></header>
      <div class="tiers">
        <div v-for="tier in tiers" :key="tier.key" class="tier" :class="{ 'tier--me': tier.mine }">
          <div class="tier__crest" :style="{ height: `${tier.size * 1.6}px` }"><RankCrest :tier="tier.key" :division="tier.level < 5 ? 'I' : null" :size="tier.size" /></div>
          <span class="tier__name" :style="{ color: tier.ink }">{{ tier.name }}</span>
          <span class="tier__divisions">{{ tier.divisions }}</span>
          <span class="tier__share">{{ tier.share }}</span>
          <span v-if="tier.mine" class="tier__me">TOI</span>
        </div>
      </div>
    </section>

    <section v-if="profile" aria-label="Bannières" class="panel">
      <header class="panel__head">Bannières<span class="panel__aside">{{ unlockedCount }}/{{ profile.banners.length }} débloquées · visibles sur ton profil et dans le classement</span></header>
      <div class="banners">
        <div v-for="banner in profile.banners" :key="banner.key" class="banner" :class="{ 'banner--on': banner.equipped }">
          <div class="banner__art" :class="{ 'banner__art--locked': !banner.unlocked }" :style="{ background: BANNER_BACKGROUNDS[banner.key] }">
            <span class="banner__name">{{ banner.name }}</span>
            <span v-if="!banner.unlocked" class="banner__tag">🔒 VERROUILLÉE</span>
            <span v-else-if="banner.equipped" class="banner__tag banner__tag--on">ÉQUIPÉE</span>
          </div>
          <div class="banner__foot">
            <span class="banner__condition">{{ banner.condition }}</span>
            <button v-if="banner.unlocked && !banner.equipped" type="button" class="btn btn--small" :disabled="equipping" @click="equip(banner.key)">Équiper</button>
          </div>
        </div>
      </div>
    </section>

    <div class="bottom">
      <section aria-label="Classement de la saison" class="panel">
        <header class="panel__head">Classement de la saison<span class="panel__aside">Champion = top 10 des Master Ball</span></header>
        <div v-if="!ladder.length" class="empty">Personne n'est encore placé : il faut 5 drafts classés pour apparaître ici.</div>
        <div v-else role="table" class="ladder">
          <div
            v-for="row in ladder"
            :key="row.showdown_id"
            role="row"
            class="ladder__row"
            :class="{ 'ladder__row--me': row.showdown_id === profile?.showdown_id, 'ladder__row--champion': row.rank.tier === 'champion' }"
            :style="{ background: BANNER_BACKGROUNDS[row.banner] ?? BANNER_BACKGROUNDS.depart }"
            @click="navigateTo(playerPath(row.showdown_id))"
          >
            <span class="ladder__veil" />
            <span class="ladder__position">{{ row.position }}</span>
            <span class="ladder__crest"><RankCrest :tier="row.rank.tier" :size="30" /></span>
            <NuxtLink :to="playerPath(row.showdown_id)" class="ladder__name">{{ row.name }}</NuxtLink>
            <span class="ladder__tier" :style="{ color: tierStyle(row.rank.tier).ink }">{{ row.rank.label }}</span>
            <span class="ladder__points">{{ row.rank.points }}</span>
            <span class="ladder__record">{{ row.wins }} / {{ row.losses }}</span>
          </div>
        </div>
      </section>
      <div class="bottom__side">
        <section v-if="profile" aria-label="Historique récent" class="panel">
          <header class="panel__head">Historique récent<span class="panel__aside">{{ historySummary }}</span></header>
          <div class="history">
            <div v-for="(event, index) in profile.history" :key="index" class="event" :style="{ boxShadow: `inset 3px 0 0 ${eventColor(event.points_delta)}` }">
              <span class="event__delta" :style="{ color: eventColor(event.points_delta) }">{{ signed(event.points_delta) }}</span>
              <span class="event__text">
                <b>{{ eventLabel(event.type) }}<template v-if="event.opponent"> contre <NuxtLink :to="playerPath(event.opponent_id!)" class="event__opponent">{{ event.opponent }}</NuxtLink></template></b>
                <span>{{ relativeDate(event.at) }}<template v-if="event.note"> · {{ event.note }}</template></span>
              </span>
            </div>
            <span v-if="!profile.history.length" class="empty">Aucun draft classé pour l'instant.</span>
          </div>
        </section>
        <section v-if="profile" aria-label="Saisons passées" class="panel">
          <header class="panel__head">Saisons passées</header>
          <div class="history">
            <div v-for="past in profile.past_seasons" :key="past.number" class="event">
              <span class="event__delta">{{ past.wins + past.losses ? percent(past.wins / (past.wins + past.losses)) : '—' }}</span>
              <span class="event__text"><b>{{ past.name }}</b><span>Rang final {{ past.rank }} · {{ past.wins + past.losses }} parties</span></span>
            </div>
            <span v-if="!profile.past_seasons.length" class="empty">C'est ta première saison.</span>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LadderRow, SeasonInfo, TierShare } from '~/utils/ranked'

const { request, profile, dialog, refresh, equipBanner } = useAccount()
useHead({ title: 'Classement · PokéDraft' })

const season = ref<SeasonInfo | null>(null)
const ladder = ref<LadderRow[]>([])
const distribution = ref<TierShare[]>([])
const failed = ref('')
const equipping = ref(false)

const daysLeft = computed(() => season.value ? Math.max(0, Math.ceil((new Date(season.value.ends_at).getTime() - Date.now()) / 864e5)) : 0)
const equippedName = computed(() => profile.value?.banners.find(banner => banner.equipped)?.name ?? 'Départ')
const unlockedCount = computed(() => profile.value?.banners.filter(banner => banner.unlocked).length ?? 0)

const tiers = computed(() => TIERS.map((tier) => {
  const share = distribution.value.find(entry => entry.tier === tier.key)
  return {
    ...tier,
    name: share?.name ?? tier.key,
    size: 34 + tier.level * 7,
    share: tier.key === 'champion' ? `${share?.players ?? 0} joueur${(share?.players ?? 0) > 1 ? 's' : ''}` : percent(share?.share ?? 0, 1),
    mine: profile.value?.rank.placed && profile.value.rank.tier === tier.key,
  }
}))

const statusCards = computed(() => {
  const current = profile.value!
  const placed = current.rank.placed
  return [
    {
      key: 'Placements', icon: placed ? '✓' : '…', color: '#58d080', ring: 'rgba(88, 208, 128, .5)',
      value: `${current.placement.played}/${current.placement.needed}${placed ? ' terminés' : ''}`,
      detail: placed ? `${current.record.wins} victoires, ${current.record.losses} défaites cette saison.` : 'Ton premier rang dépend de tes victoires en placement.',
    },
    {
      key: 'Bouclier', icon: '◈', color: '#9fd0ff', ring: 'rgba(159, 208, 255, .5)',
      value: current.shield_games ? `Actif · ${current.shield_games} match${current.shield_games > 1 ? 's' : ''}` : 'Inactif',
      detail: 'Après une montée, pas de descente pendant 3 matchs.',
    },
    {
      key: 'Pénalités', icon: '!', color: '#ffb070', ring: 'rgba(255, 176, 112, .5)',
      value: current.abandons.wait_seconds ? `Attente · ${Math.ceil(current.abandons.wait_seconds / 60)} min` : `${current.abandons.abandons} abandon${current.abandons.abandons > 1 ? 's' : ''} · 24 h`,
      detail: '3 abandons en 24 h : 15 min d\'attente. Quitter un draft : −5 PL.',
    },
    {
      key: 'Inactivité', icon: '◷', color: '#c8d0dc', ring: 'rgba(200, 208, 220, .3)',
      value: current.decay.concerned ? `Concerné · ${current.decay.idle_days ?? 0} j sans partie` : 'Pas concerné',
      detail: 'À partir de Luxe Ball : −25 PL par jour après 7 jours.',
    },
  ]
})

const historySummary = computed(() => {
  const events = profile.value?.history ?? []
  const count = (type: string) => events.filter(event => event.type === type).length
  const total = events.reduce((sum, event) => sum + event.points_delta, 0)
  return `${count('victoire')} V · ${count('defaite')} D · ${count('abandon')} abandon${count('abandon') > 1 ? 's' : ''} · ${signed(total)} PL`
})

const eventColor = (delta: number) => delta > 0 ? 'var(--good)' : delta < 0 ? 'var(--bad)' : 'var(--mu)'

const loadLadder = async () => {
  const standings = await request<{ data: LadderRow[], distribution: TierShare[] }>('/seasons/current/ladder')
  ladder.value = standings.data
  distribution.value = standings.distribution
}

const equip = async (key: string) => {
  equipping.value = true
  try {
    await equipBanner(key)
    await loadLadder()
  } catch (error) {
    failed.value = apiErrorMessage(error)
  } finally {
    equipping.value = false
  }
}

onMounted(async () => {
  try {
    const [current] = await Promise.all([request<{ data: SeasonInfo }>('/seasons/current'), loadLadder(), refresh()])
    season.value = current.data
  } catch (error) {
    failed.value = apiErrorMessage(error)
  }
})
</script>

<style scoped>
.ranking { display: flex; flex-direction: column; gap: 12px; }
.ranking__head { display: flex; flex-direction: column; gap: 2px; }
.ranking__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.ranking__subtitle { font: 700 14px 'Nunito', sans-serif; color: var(--mu); }

.notice {
  padding: 10px 14px;
  border-radius: var(--r);
  background: #3a2216;
  box-shadow: inset 0 0 0 2px #e8704a, 0 0 0 2px var(--bd);
  font: 700 14px 'Nunito', sans-serif;
  color: #ffd9c8;
}

.me {
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

.me--guest { grid-template-columns: minmax(0, 1fr); min-height: 0; background: linear-gradient(120deg, var(--hd), var(--dk)); }
.me__veil { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8, 10, 16, .15), rgba(8, 10, 16, .82) 55%); }
.me__crest, .me__main, .status { position: relative; }
.me__crest { display: flex; justify-content: center; }
.me__main { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.me__banner { font: 700 12px 'Nunito', sans-serif; color: #e8eefc; }
.me__rank { font: 700 40px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .6); }
.me__points { font: 700 14px/1.45 'Nunito', sans-serif; }
.me__points b { font: 600 20px 'Pixelify Sans', sans-serif; }
.me__actions { display: flex; gap: 8px; }

.me__bar {
  position: relative;
  height: 18px;
  border-radius: 5px;
  background: rgba(0, 0, 0, .55);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18);
}

.me__fill { position: relative; height: 100%; background: linear-gradient(90deg, #b88a10, #ffd23a); overflow: hidden; animation: grow .8s steps(14) both; }
.me__sweep { position: absolute; top: 0; bottom: 0; width: 30%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .55), transparent); animation: sweep 2.6s 1s ease-in-out infinite; }
.me__position { font: 700 12px 'Nunito', sans-serif; color: #d8e0f0; }
.me__position b { font: 600 14px 'Pixelify Sans', sans-serif; }
.me__public { color: #ffd23a; }
.status { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }

.status__card {
  padding: 7px 9px;
  border-radius: 9px;
  background: rgba(0, 0, 0, .5);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.status__key { display: flex; align-items: center; gap: 5px; font: 700 11px 'Nunito', sans-serif; }
.status__key b { font: 600 13px 'Pixelify Sans', sans-serif; }
.status__value { font: 700 13px 'Nunito', sans-serif; }
.status__detail { font: 400 11px/1.3 'Nunito', sans-serif; color: #d8dce6; }

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

.tiers {
  padding: 16px 12px 12px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
}

.tier {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  padding: 10px 4px 8px;
  border-radius: 12px;
  background: var(--in);
}

.tier--me { background: rgba(255, 210, 58, .1); box-shadow: inset 0 0 0 2px var(--uA); }
.tier__crest { display: flex; align-items: flex-end; justify-content: center; }
.tier__name { font: 700 15px 'Pixelify Sans', sans-serif; filter: var(--inkFilter, none); }
.tier__divisions { font: 700 10px/1.3 'Nunito', sans-serif; color: var(--mu); }
.tier__share { font: 600 13px 'Pixelify Sans', sans-serif; }

.tier__me {
  position: absolute;
  top: 6px;
  right: 6px;
  height: 18px;
  padding: 0 7px;
  border-radius: 9px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 10px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.banners { padding: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.banner { border-radius: 10px; overflow: hidden; background: var(--in); display: flex; flex-direction: column; }
.banner--on { box-shadow: inset 0 0 0 2px var(--uA); }
.banner__art { position: relative; height: 78px; }
.banner__art--locked { filter: grayscale(.85) brightness(.6); }
.banner__name { position: absolute; left: 10px; bottom: 8px; font: 700 16px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); }

.banner__tag {
  position: absolute;
  right: 8px;
  top: 8px;
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  background: rgba(0, 0, 0, .65);
  color: #fff;
  font: 700 10px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.banner__tag--on { background: var(--uA); color: var(--uAtx); }
.banner__foot { padding: 7px 10px 9px; display: flex; align-items: center; gap: 8px; }
.banner__condition { flex: 1; font: 700 11px/1.3 'Nunito', sans-serif; color: var(--mu); }

.bottom { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.bottom__side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ladder { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 4px; }

.ladder__row {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 44px 40px minmax(0, 1.4fr) minmax(0, 1fr) 52px 70px;
  gap: 8px;
  align-items: center;
  height: 48px;
  padding: 0 10px;
  border-radius: 8px;
  cursor: pointer;
}

.ladder__row--me { box-shadow: inset 0 0 0 2px var(--uA); }
.ladder__row--champion { box-shadow: inset 0 0 0 1px rgba(255, 217, 112, .5); }
.ladder__veil { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(10, 12, 18, .55), rgba(10, 12, 18, .88) 45%); }
.ladder__row > :not(.ladder__veil) { position: relative; }
.ladder__position { font: 600 16px 'Pixelify Sans', sans-serif; color: var(--mu); }
.ladder__row--champion .ladder__position { color: #ffd970; }
.ladder__crest { display: flex; justify-content: center; }
.ladder__name { font: 700 14px 'Nunito', sans-serif; color: var(--tx); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ladder__row:hover .ladder__veil { background: linear-gradient(90deg, rgba(10, 12, 18, .35), rgba(10, 12, 18, .78) 45%); }
.ladder__row:hover .ladder__name { text-decoration: underline; }
.ladder__tier { font: 700 12px 'Nunito', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ladder__points { font: 600 15px 'Pixelify Sans', sans-serif; text-align: right; }
.ladder__record { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; color: var(--mu); }
.history { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }

.event {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 5px 8px;
  border-radius: 7px;
  background: var(--in);
}

.event__delta { font: 600 17px 'Pixelify Sans', sans-serif; }
.event__text { display: flex; flex-direction: column; min-width: 0; font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.event__text b { font: 700 13px 'Nunito', sans-serif; color: var(--tx); }
.event__opponent { color: inherit; }
.empty { padding: 14px 12px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }

@keyframes grow { from { width: 0; } }
@keyframes sweep { from { left: -30%; } to { left: 100%; } }

@media (max-width: 1100px) {
  .me, .bottom { grid-template-columns: minmax(0, 1fr); }
  .tiers { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
}
</style>

<template>
  <div class="home">
    <div class="home__head">
      <h1 class="home__title">Accueil</h1>
      <span class="home__subtitle">{{ greeting }}</span>
    </div>

    <NuxtLink to="/classique/classe" class="hero">
      <span class="hero__sprite" :style="{ backgroundImage: `url(${sprite('greattusk', 'face')})` }" />
      <span class="hero__kicker">Ladder · {{ formatName }}</span>
      <span class="hero__title">Combat classé</span>
      <span class="hero__text">Gagne de l'Elo dans le format de ton choix : {{ formatCount ? `${formatCount} formats avec ladder` : 'tous les formats Smogon' }}.</span>
    </NuxtLink>

    <div class="modes">
      <component :is="mode.to ? NuxtLink : 'span'" v-for="mode in MODES" :key="mode.title" :to="mode.to" class="mode" :class="{ 'mode--soon': !mode.to }" :style="{ background: mode.color }">
        <span class="mode__sprite" :style="{ backgroundImage: `url(${sprite(mode.sprite)})` }" />
        <span class="mode__title">{{ mode.title }}</span>
        <span class="mode__text">{{ mode.to ? mode.text : 'Bientôt' }}</span>
      </component>
    </div>

    <div class="grid">
      <section aria-label="Ton classement" class="panel">
        <header class="panel__head">Ton classement<NuxtLink to="/classique/classe" class="panel__link">Ladder ▸</NuxtLink></header>
        <div class="panel__body">
          <template v-if="mine">
            <div class="rank">
              <span class="rank__elo" :style="{ color: eloTier(mine.elo).color }">{{ Math.round(mine.elo) }}</span>
              <span class="rank__text">{{ eloTier(mine.elo).name }} · #{{ mine.rank }} · {{ formatName }}</span>
            </div>
            <div class="rank__bar"><span class="rank__fill" :style="{ width: `${tierProgress}%` }" /></div>
            <span class="rank__text">{{ mine.wins }} victoires, {{ mine.losses }} défaites</span>
          </template>
          <p v-else class="empty">{{ connected ? `Pas encore classé en ${formatName}. Lance un combat classé pour entrer au ladder.` : 'Connecte-toi au serveur de combat pour voir ton Elo.' }}</p>
        </div>
      </section>

      <section aria-label="Les plus utilisés" class="panel">
        <header class="panel__head">Les plus utilisés<span class="panel__aside">{{ usageLabel }}</span></header>
        <div class="panel__body">
          <p v-if="!top.length" class="empty">Pas de statistiques Smogon pour ce format.</p>
          <div v-for="(entry, index) in top" :key="entry.id" class="use">
            <span class="use__rank">{{ index + 1 }}</span>
            <span class="use__sprite" :style="{ backgroundImage: `url(${sprite(entry.id)})` }" />
            <span class="use__name">{{ speciesName(entry.id) }}</span>
            <span class="use__bar"><span class="use__fill" :style="{ width: `${entry.usage / top[0]!.usage * 100}%` }" /></span>
            <span class="use__pct">{{ percent(entry.usage, 1) }}</span>
          </div>
        </div>
      </section>

      <section aria-label="Styles d'équipe" class="panel">
        <header class="panel__head">Styles joués<span class="panel__aside">tags officiels Smogon</span></header>
        <div class="panel__body">
          <p v-if="!styles.length" class="empty">Pas de répartition des styles pour ce format.</p>
          <div v-for="[tag, share] in styles" :key="tag" class="style">
            <span class="style__name">{{ styleLabel(tag) }}</span>
            <span class="style__bar"><span class="style__fill" :style="{ width: `${share * 100}%` }" /></span>
            <span class="style__pct">{{ percent(share) }}</span>
          </div>
        </div>
      </section>

      <section aria-label="Derniers combats" class="panel">
        <header class="panel__head">Derniers combats</header>
        <div class="panel__body">
          <p v-if="!history.length" class="empty">Tes combats Classique apparaîtront ici.</p>
          <div v-for="entry in history.slice(0, 5)" :key="entry.roomid" class="played">
            <span class="played__result" :class="`played__result--${entry.result}`">{{ RESULTS[entry.result] }}</span>
            <span class="played__text"><b>contre {{ entry.opponent }}</b><span>{{ formatLabel(entry.formatName) }} · {{ relativeDate(entry.at) }} · {{ entry.turns }} tour{{ entry.turns > 1 ? 's' : '' }}</span></span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import type { EloRow } from '~/utils/ladder'
import type { UsageData } from '~/utils/usage'

useHead({ title: 'Accueil · Classique' })

const MODES = [
  { title: 'Combat classé', text: "Gagne de l'Elo sur le ladder", color: '#d84838', sprite: 'greattusk', to: '/classique/classe' },
  { title: "S'entraîner", text: 'Apprendre un style, puis à le contrer', color: '#48a860', sprite: 'garganacl', to: '/classique/entrainement' },
  { title: 'Défier un ami', text: 'Dans le format de ton choix', color: '#3a8fd6', sprite: 'dragapult', to: '/classique/en-ligne' },
]
const RESULTS = { victoire: 'Victoire', defaite: 'Défaite', egalite: 'Égalité' }

const { store, query } = useShowdown()
const { sprite } = usePokedex()
const { history } = useBattleHistory()
const { session } = useAccount()
const format = useState('classic-format', () => 'gen9ou')
const usage = ref<UsageData | null>(null)
const rows = ref<EloRow[]>([])
const players = ref<number | null>(null)

const connected = computed(() => store.status === 'connecte')
const selected = computed(() => store.formats.flatMap(section => section.formats).find(entry => entry.id === format.value))
const formatName = computed(() => selected.value ? formatLabel(selected.value.name) : formatIdLabel(format.value))
const formatCount = computed(() => store.formats.reduce((sum, section) => sum + section.formats.filter(entry => entry.ladder).length, 0))
const mine = computed(() => rows.value.find(row => toId(row.name) === toId(store.name)))
const top = computed(() => usage.value?.pokemon.slice(0, 5) ?? [])
const styles = computed(() => (usage.value?.styles ?? []).filter(([tag]) => tag !== 'weatherless').slice(0, 6))
const usageLabel = computed(() => usage.value ? `${formatIdLabel(usage.value.format)} · ${usage.value.battles.toLocaleString('fr-FR')} combats` : '')
const greeting = computed(() => {
  const name = store.name || session.value.name
  const hello = name ? `Bon retour, ${name}.` : 'Bienvenue dans le Classique.'
  return players.value ? `${hello} ${players.value} joueur${players.value > 1 ? 's' : ''} connecté${players.value > 1 ? 's' : ''}.` : hello
})
const tierProgress = computed(() => {
  if (!mine.value) return 0
  const tier = eloTier(mine.value.elo)
  const next = ELO_TIERS[ELO_TIERS.indexOf(tier) + 1]
  return next ? Math.min(100, (mine.value.elo - tier.min) / (next.min - tier.min) * 100) : 100
})

watch(format, async (value) => {
  usage.value = await loadUsage(value)
}, { immediate: true })

watch([format, connected], async () => {
  if (!connected.value) return
  const [ladder, rooms] = await Promise.all([
    query<[string, string]>('laddertop', format.value),
    query<{ userCount?: number }>('rooms', ''),
  ])
  rows.value = ladder ? parseLadderTop(ladder[1]) : []
  players.value = rooms?.userCount ?? null
}, { immediate: true })
</script>

<style scoped>
.home { display: flex; flex-direction: column; gap: 12px; }
.home__head { display: flex; flex-direction: column; gap: 2px; }
.home__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.home__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.hero {
  position: relative;
  overflow: hidden;
  min-height: 150px;
  padding: 18px 22px;
  border-radius: calc(var(--r) + 4px);
  background: linear-gradient(120deg, #d84838, #8a1c12);
  box-shadow: var(--pnS);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
}

.hero__sprite { position: absolute; right: 30px; bottom: 0; width: 170px; height: 150px; background: center bottom / contain no-repeat; image-rendering: pixelated; animation: bob 2.6s ease-in-out infinite; }
.hero__kicker { font: 700 12px 'Atkinson Hyperlegible', sans-serif; opacity: .85; }
.hero__title { font: 700 36px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .35); }
.hero__text { max-width: 520px; font: 700 14px/1.4 'Atkinson Hyperlegible', sans-serif; }
.modes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }

.mode {
  position: relative;
  overflow: hidden;
  min-height: 96px;
  padding: 12px 14px;
  border-radius: var(--r);
  box-shadow: var(--pnS);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
}

.mode--soon { opacity: .6; }
.mode__sprite { position: absolute; right: 8px; top: 6px; width: 72px; height: 72px; background: center / contain no-repeat; image-rendering: pixelated; }
.mode__title { font: 700 20px 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 rgba(0, 0, 0, .3); }
.mode__text { font: 700 12px 'Atkinson Hyperlegible', sans-serif; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }
.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; min-width: 0; }

.panel__head {
  min-height: 34px;
  padding: 0 12px;
  background: var(--hd);
  display: flex;
  align-items: center;
  gap: 8px;
  font: 600 16px 'Pixelify Sans', sans-serif;
  color: var(--hdTx);
  text-shadow: var(--hdSh);
}

.panel__aside, .panel__link { margin-left: auto; font: 700 12px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; color: inherit; }
.panel__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.rank { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rank__elo { font: 700 34px/1 'Pixelify Sans', sans-serif; }
.rank__text { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.rank__bar, .use__bar, .style__bar { height: 8px; border-radius: 4px; background: var(--in); overflow: hidden; }
.rank__fill { display: block; height: 100%; background: linear-gradient(90deg, #b88a10, #ffd23a); }
.use { display: grid; grid-template-columns: 18px 36px minmax(0, 1fr) minmax(0, 120px) 54px; gap: 8px; align-items: center; }
.use__rank { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--mu); }
.use__sprite { width: 36px; height: 36px; background: center / contain no-repeat; image-rendering: pixelated; }
.use__name { font: 700 14px 'Atkinson Hyperlegible', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.use__fill { display: block; height: 100%; background: var(--hd); }
.use__pct, .style__pct { font: 600 14px 'Pixelify Sans', sans-serif; text-align: right; }
.style { display: grid; grid-template-columns: minmax(0, 150px) minmax(0, 1fr) 46px; gap: 8px; align-items: center; }
.style__name { font: 700 13px 'Atkinson Hyperlegible', sans-serif; }
.style__fill { display: block; height: 100%; background: #48a860; }
.played { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 8px; align-items: center; padding: 6px 8px; border-radius: 7px; background: var(--in); }
.played__result { padding: 3px 6px; border-radius: 5px; color: #fff; text-align: center; font: 700 12px 'Atkinson Hyperlegible', sans-serif; }
.played__result--victoire { background: #48a860; }
.played__result--defaite { background: #e04838; }
.played__result--egalite { background: #6a7080; }
.played__text { display: flex; flex-direction: column; min-width: 0; font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.played__text b { font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--tx); }
.empty { margin: 0; font: 700 13px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 1000px) {
  .grid, .modes { grid-template-columns: minmax(0, 1fr); }
}
</style>

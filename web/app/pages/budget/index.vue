<template>
  <div class="budget">
    <section class="hero">
      <div class="hero__text">
        <h1 class="hero__title">{{ budget }} points. Ton équipe.</h1>
        <p class="hero__pitch">Chaque Pokémon coûte des points selon son tier Smogon. Deux stars et des petits, ou six Pokémon moyens : à toi de choisir. Le budget est vérifié par le serveur au lancement du combat.</p>
        <ul class="hero__chips">
          <li v-for="chip in CHIPS" :key="chip" class="hero__chip">{{ chip }}</li>
        </ul>
      </div>
      <NuxtLink to="/budget/constructeur" class="btn btn--primary hero__build">✎ Construire une équipe</NuxtLink>
    </section>

    <LobbyConnection v-if="!connected" />

    <div class="grid">
      <section class="panel" aria-label="Combat classé">
        <header class="panel__head">Combat classé<span class="panel__aside">[Gen 9] Combat à budget</span></header>
        <div class="panel__body">
          <ClassiqueTeamSelect v-model="teamId" :format="BUDGET_FORMAT" :generated="false" />
          <div v-if="team" class="cost" :class="`cost--${tone}`">
            <span class="cost__total">{{ total }}</span><span class="cost__max">/ {{ budget }} points</span>
            <NuxtLink to="/budget/constructeur" class="cost__edit">Modifier</NuxtLink>
          </div>
          <button type="button" class="search" :class="{ 'search--on': searching }" :disabled="!canSearch" @click="toggleSearch">
            <span class="search__ball" />{{ searching ? 'Annuler la recherche' : 'Jouer en classé' }}
          </button>
          <span v-if="searching" class="panel__status">Recherche d'un adversaire… <b>{{ elapsed }}</b></span>
          <span v-else-if="blocked && connected" class="panel__status">{{ blocked }}</span>
        </div>
      </section>

      <section class="panel" aria-label="Coûts du mois">
        <header class="panel__head">Coûts {{ monthLabel }}<NuxtLink to="/budget/bareme" class="panel__aside panel__link">Barème ▸</NuxtLink></header>
        <div class="panel__body">
          <template v-if="changes.length">
            <div v-for="change in changes" :key="change.id" class="change">
              <span class="change__icon" :style="{ backgroundImage: `url(${sprite(change.id)})` }" />
              <span class="change__name">{{ change.name }}</span>
              <span class="change__delta" :class="change.cost > change.base ? 'change__delta--up' : 'change__delta--down'">{{ change.cost > change.base ? '+' : '−' }}{{ Math.abs(change.cost - change.base) }}</span>
              <span class="change__values">{{ change.base }} → {{ change.cost }}</span>
            </div>
          </template>
          <p v-else class="panel__note">
            Les coûts suivent pour l'instant les tiers Smogon. Après un mois de combats classés, ils s'ajusteront le 1er de chaque mois selon l'usage dans ce ladder : un Pokémon très joué coûtera plus cher, un oublié moins cher.
          </p>
          <div class="examples">
            <span class="examples__title">Exemples de composition</span>
            <div v-for="example in EXAMPLES" :key="example.name" class="example">
              <span class="example__name">{{ example.name }}</span>
              <span class="example__team">{{ example.team }}</span>
              <span class="example__total">{{ example.total }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="panel" aria-label="Ladder du Combat à budget">
        <header class="panel__head">Ladder<span class="panel__aside">{{ mine ? `Toi : ${Math.round(mine.elo)} · #${mine.rank}` : '' }}</span></header>
        <div class="panel__body">
          <div v-if="loadingLadder" class="panel__note">Chargement du classement…</div>
          <div v-else-if="!rows.length" class="panel__note">Personne n'a encore joué de combat classé à budget sur ce serveur.</div>
          <div v-else role="table" class="ladder">
            <div v-for="row in rows.slice(0, 10)" :key="row.name" role="row" class="ladder__row" :class="{ 'ladder__row--me': toId(row.name) === toId(store.name) }">
              <span class="ladder__rank">{{ row.rank }}</span>
              <span class="ladder__name">{{ row.name }}</span>
              <span class="ladder__elo" :style="{ color: eloTier(row.elo).color }">{{ Math.round(row.elo) }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EloRow } from '~/utils/ladder'

definePageMeta({ layout: 'mode' })
useHead({ title: 'Combat à budget' })

const CHIPS = ['1 à 6 Pokémon', 'Ubers et AG interdits', 'Clauses de l\'OU', 'Objets et attaques libres', 'Coûts mis à jour chaque mois']
const EXAMPLES = [
  { name: 'Deux stars', team: '2 OU + 1 NU + 1 PU + 2 ZU', total: 90 },
  { name: 'La star et ses soutiens', team: '1 OU + 1 UU + 1 RU + 1 NU + 1 PU + 1 ZU', total: 93 },
  { name: 'Équipe équilibrée', team: '6 RU', total: 96 },
  { name: 'Trois gros', team: '3 OU + 3 non classés', total: 99 },
]

const { store, search, cancelSearch, query } = useShowdown()
const { teams, packed } = useClassicTeams()
const { dex, sprite } = usePokedex()
const { budget, month, list, teamCost } = useBudget()

const teamId = ref('')
const rows = ref<EloRow[]>([])
const loadingLadder = ref(false)
const pending = ref(false)
const startedAt = ref(0)
const now = ref(Date.now())

const connected = computed(() => store.status === 'connecte')
const team = computed(() => teams.value.find(entry => entry.id === teamId.value))
const total = computed(() => team.value ? teamCost(team.value.sets.map(set => set.species)) : 0)
const tone = computed(() => budgetTone(total.value, budget.value))
const searching = computed(() => store.searchingFormats.includes(BUDGET_FORMAT))
const mine = computed(() => rows.value.find(row => toId(row.name) === toId(store.name)))
const monthLabel = computed(() => month.value ? `de ${new Date(`${month.value}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` : 'de départ')
const elapsed = computed(() => {
  const seconds = Math.max(0, Math.floor((now.value - startedAt.value) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

/** Les plus gros ajustements du mois, à la hausse comme à la baisse. */
const changes = computed(() => list.value
  .filter(entry => entry.cost !== entry.base)
  .sort((a, b) => Math.abs(b.cost - b.base) - Math.abs(a.cost - a.base))
  .slice(0, 6)
  .map(entry => ({ ...entry, name: dex.value?.pokemon[entry.id]?.nom ?? entry.id })))

const blocked = computed(() => {
  if (!team.value) return 'Choisis une équipe, ou construis-en une à 100 points.'
  if (total.value > budget.value) return `Ton équipe coûte ${total.value} points : retire ${total.value - budget.value} points pour pouvoir jouer.`
  return ''
})
const canSearch = computed(() => connected.value && (searching.value || !blocked.value))

const loadLadder = async () => {
  loadingLadder.value = true
  const response = await query<[string, string]>('laddertop', BUDGET_FORMAT)
  rows.value = response ? parseLadderTop(response[1]) : []
  loadingLadder.value = false
}

const toggleSearch = () => {
  if (searching.value) {
    cancelSearch()
    pending.value = false
    return
  }
  pending.value = true
  startedAt.value = Date.now()
  search(packed(team.value!), BUDGET_FORMAT)
}

watch(() => store.latestBattle, (roomid) => {
  if (roomid && pending.value) {
    pending.value = false
    navigateTo(`/budget/combat/${roomid}`)
  }
})

watch(connected, (value) => {
  if (value) loadLadder()
}, { immediate: true })

watch(teams, (list) => {
  if (!teamId.value) teamId.value = list.find(entry => entry.format === BUDGET_FORMAT)?.id ?? ''
}, { immediate: true })

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.budget { display: flex; flex-direction: column; gap: 12px; }

.hero {
  padding: 22px 24px;
  border-radius: calc(var(--r) + 4px);
  background: repeating-linear-gradient(115deg, rgba(255, 255, 255, .05) 0 14px, transparent 14px 40px), linear-gradient(140deg, #16756c, #061a18);
  box-shadow: inset 0 0 0 3px #2fc8b8, 0 0 0 3px var(--bd);
  color: #fff;
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.hero__text { flex: 1 1 420px; display: flex; flex-direction: column; gap: 10px; }
.hero__title { margin: 0; font: 700 40px/1.05 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .45); }
.hero__pitch { margin: 0; max-width: 680px; font: 700 15px/1.5 'Nunito', sans-serif; color: #d8f4f0; }
.hero__chips { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.hero__chip { height: 26px; padding: 0 10px; border-radius: 13px; background: rgba(0, 0, 0, .35); box-shadow: inset 0 0 0 1px #7af0e2; font: 700 12px 'Nunito', sans-serif; display: flex; align-items: center; }
.hero__build { background: #2fc8b8; color: #061a18; }

.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.panel__head {
  height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 16px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel__aside { font: 700 12px 'Nunito', sans-serif; text-shadow: none; opacity: .9; }
.panel__link { color: inherit; }
.panel__body { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.panel__note, .panel__status { margin: 0; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.panel__status b { font: 600 16px 'Pixelify Sans', sans-serif; color: var(--tx); }

.cost { --tone: var(--good); display: flex; align-items: baseline; gap: 6px; padding: 8px 10px; border-radius: 8px; background: var(--in); box-shadow: inset 0 0 0 2px var(--tone); }
.cost--full { --tone: #d89a1a; }
.cost--over { --tone: var(--bad); }
.cost__total { font: 700 28px/1 'Pixelify Sans', sans-serif; color: var(--tone); }
.cost__max { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.cost__edit { margin-left: auto; font: 700 13px 'Nunito', sans-serif; }

.search {
  border: 0;
  cursor: pointer;
  height: 46px;
  border-radius: 10px;
  background: #2fc8b8;
  color: #061a18;
  font: 700 17px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .2);
}

.search:disabled { cursor: not-allowed; filter: grayscale(.8) brightness(.8); }
.search--on { background: #6a7080; color: #fff; }
.search__ball { width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(180deg, #e84838 0 46%, #262626 46% 54%, #fff 54%); box-shadow: 0 0 0 2px #262626; }

.change { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto auto; gap: 8px; align-items: center; }
.change__icon { width: 36px; height: 28px; background: center / 36px no-repeat; image-rendering: pixelated; }
.change__name { font: 700 14px 'Nunito', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.change__delta { font: 600 15px 'Pixelify Sans', sans-serif; }
.change__delta--up { color: var(--bad); }
.change__delta--down { color: var(--good); }
.change__values { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

.examples { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; border-top: 2px solid var(--chip); }
.examples__title { font: 700 12px 'Nunito', sans-serif; color: var(--mu); text-transform: uppercase; }
.example { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 8px; }
.example__name { font: 700 13px 'Nunito', sans-serif; }
.example__team { grid-column: 1; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.example__total { grid-column: 2; grid-row: 1 / span 2; align-self: center; font: 600 18px 'Pixelify Sans', sans-serif; color: var(--good); }

.ladder { display: flex; flex-direction: column; gap: 2px; }
.ladder__row { display: grid; grid-template-columns: 32px minmax(0, 1fr) 56px; gap: 8px; align-items: center; height: 30px; padding: 0 8px; border-radius: 6px; }
.ladder__row--me { background: color-mix(in srgb, #2fc8b8 22%, transparent); box-shadow: inset 0 0 0 2px #2fc8b8; }
.ladder__rank { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--mu); }
.ladder__name { font: 700 14px 'Nunito', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ladder__elo { font: 600 16px 'Pixelify Sans', sans-serif; text-align: right; }

@media (max-width: 1180px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

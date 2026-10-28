<template>
  <div class="ranked">
    <div class="ranked__head">
      <h1 class="ranked__title">Combat classé</h1>
      <span class="ranked__subtitle">Grimpe le ladder de chaque format : un Elo par format, comme sur Showdown.</span>
    </div>

    <LobbyConnection v-if="!connected" />

    <div class="top">
      <section aria-label="Lancer un combat classé" class="panel launch">
        <header class="panel__head">Combat classé</header>
        <div class="launch__body">
          <span class="launch__label">FORMAT</span>
          <ClassiqueFormatPicker v-model="format" usage="ladder" />
          <span class="launch__label">ÉQUIPE</span>
          <ClassiqueTeamSelect v-model="teamId" :format="format" :generated="Boolean(selected?.generatedTeam)" />
          <button type="button" class="search" :class="{ 'search--on': searching }" :disabled="!canSearch" @click="toggleSearch">
            <span class="search__ball" />{{ searching ? 'Annuler la recherche' : 'Rechercher un combat' }}
          </button>
          <span v-if="searching" class="launch__status">Recherche d'un adversaire en {{ selected ? formatLabel(selected.name) : formatIdLabel(format) }}… <b>{{ elapsed }}</b></span>
          <span v-else-if="!canSearch && connected" class="launch__status">{{ blocked }}</span>
        </div>
      </section>

      <section aria-label="Paliers d'Elo" class="panel tiers">
        <header class="panel__head">Paliers</header>
        <div class="tiers__body">
          <span class="tiers__note">Chaque combat classé fait gagner ou perdre de l'Elo ; tout le monde démarre à 1 000.</span>
          <div v-for="tier in tierRows" :key="tier.name" class="tier" :class="{ 'tier--me': tier.mine }">
            <span class="tier__dot" :style="{ background: tier.color }" />
            <span class="tier__name">{{ tier.name }}</span>
            <span class="tier__range">{{ tier.range }}</span>
          </div>
        </div>
      </section>
    </div>

    <div class="bottom">
      <section aria-label="Classement du format" class="panel">
        <header class="panel__head">Classement · {{ selected ? formatLabel(selected.name) : formatIdLabel(format) }}<span class="panel__aside">{{ rows.length ? 'Clique un joueur' : '' }}</span></header>
        <div v-if="loadingLadder" class="empty">Chargement du classement…</div>
        <div v-else-if="!rows.length" class="empty">Personne n'a encore joué de combat classé dans ce format sur ce serveur.</div>
        <div v-else role="table" class="ladder">
          <div role="row" class="ladder__row ladder__row--head">
            <span>#</span><span>Joueur</span><span>Elo</span><span>V / D</span>
          </div>
          <button
            v-for="row in rows"
            :key="row.name"
            type="button"
            role="row"
            class="ladder__row"
            :class="{ 'ladder__row--on': picked?.name === row.name, 'ladder__row--me': toId(row.name) === toId(store.name) }"
            @click="pickedName = row.name"
          >
            <span class="ladder__rank" :style="{ color: row.rank <= 3 ? ['#d89a20', '#8a9aa8', '#b8703a'][row.rank - 1] : undefined }">{{ row.rank }}</span>
            <span class="ladder__name">{{ row.name }}</span>
            <span class="ladder__elo" :style="{ color: eloTier(row.elo).color }">{{ Math.round(row.elo) }}</span>
            <span class="ladder__record">{{ row.wins }} / {{ row.losses }}</span>
          </button>
        </div>
      </section>

      <section v-if="picked" aria-label="Joueur" class="panel player">
        <header class="panel__head">#{{ picked.rank }} · {{ eloTier(picked.elo).name }}</header>
        <div class="player__body">
          <span class="player__name">{{ picked.name }}</span>
          <div class="player__stats">
            <div class="player__stat"><b>{{ Math.round(picked.elo) }}</b><span>Elo</span></div>
            <div class="player__stat"><b>{{ picked.wins + picked.losses + picked.ties }}</b><span>Combats</span></div>
            <div class="player__stat"><b>{{ picked.wins + picked.losses ? percent(picked.wins / (picked.wins + picked.losses)) : '—' }}</b><span>Victoires</span></div>
          </div>
          <NuxtLink v-if="toId(picked.name) !== toId(store.name)" :to="{ path: '/classique/en-ligne', query: { defier: picked.name, format } }" class="btn btn--primary">Défier en {{ selected ? formatLabel(selected.name) : formatIdLabel(format) }}</NuxtLink>
          <span v-else class="player__me">C'est toi.</span>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { EloRow } from '~/utils/ladder'

useHead({ title: 'Combat classé · Classique' })

const { store, search, cancelSearch, query } = useShowdown()
const { teams, packed } = useClassicTeams()
usePokedex()

const format = useState('classic-format', () => 'gen9ou')
const teamId = ref('')
const rows = ref<EloRow[]>([])
const loadingLadder = ref(false)
const pickedName = ref('')
const pending = ref(false)
const startedAt = ref(0)
const now = ref(Date.now())

const connected = computed(() => store.status === 'connecte')
const selected = computed(() => store.formats.flatMap(section => section.formats).find(entry => entry.id === format.value))
const team = computed(() => teams.value.find(entry => entry.id === teamId.value))
const searching = computed(() => store.searchingFormats.includes(format.value))
const picked = computed(() => rows.value.find(row => row.name === pickedName.value) ?? rows.value.find(row => toId(row.name) === toId(store.name)) ?? rows.value[0])
const mine = computed(() => rows.value.find(row => toId(row.name) === toId(store.name)))
const elapsed = computed(() => {
  const seconds = Math.max(0, Math.floor((now.value - startedAt.value) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

const blocked = computed(() => {
  if (!selected.value) return 'Choisis un format.'
  if (!selected.value.generatedTeam && !team.value) return 'Choisis ou colle une équipe pour ce format.'
  return ''
})
const canSearch = computed(() => connected.value && (searching.value || !blocked.value))

const tierRows = computed(() => ELO_TIERS.map((tier, index) => {
  const next = ELO_TIERS[index + 1]
  return {
    ...tier,
    range: next ? `${tier.min.toLocaleString('fr-FR')} – ${(next.min - 1).toLocaleString('fr-FR')}` : `${tier.min.toLocaleString('fr-FR')} +`,
    mine: Boolean(mine.value) && eloTier(mine.value!.elo).name === tier.name,
  }
}))

const loadLadder = async () => {
  loadingLadder.value = true
  const response = await query<[string, string]>('laddertop', format.value)
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
  search(selected.value?.generatedTeam ? '' : packed(team.value!), format.value)
}

watch(() => store.latestBattle, (roomid) => {
  if (roomid && pending.value) {
    pending.value = false
    navigateTo(`/classique/combat/${roomid}`)
  }
})

watch([format, connected], () => {
  pickedName.value = ''
  if (connected.value) loadLadder()
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
.ranked { display: flex; flex-direction: column; gap: 12px; }
.ranked__head { display: flex; flex-direction: column; gap: 2px; }
.ranked__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.ranked__subtitle { font: 700 14px 'Nunito', sans-serif; color: var(--mu); }
.top, .bottom { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 12px; align-items: start; }
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

.panel__aside { margin-left: auto; font: 700 12px 'Nunito', sans-serif; text-shadow: none; }
.launch__body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 8px; }
.launch__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); letter-spacing: .04em; }
.launch__status { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.launch__status b { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--tx); }

.search {
  margin-top: 6px;
  border: 0;
  cursor: pointer;
  height: 52px;
  border-radius: 10px;
  background: #d84838;
  color: #fff;
  font: 700 20px 'Pixelify Sans', sans-serif;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .3);
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, .45), 0 0 0 3px var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.search:disabled { cursor: not-allowed; filter: grayscale(.8) brightness(.8); }
.search--on { background: #6a7080; }

.search__ball {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(#e83a30 0 46%, #222 46% 54%, #fff 54%);
  box-shadow: 0 0 0 2px #222;
}

.search--on .search__ball { animation: wobble .8s ease-in-out infinite; }
.tiers__body { padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.tiers__note { font: 700 12px/1.4 'Nunito', sans-serif; color: var(--mu); }
.tier { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 7px; background: var(--in); }
.tier--me { box-shadow: inset 0 0 0 2px var(--uA); }
.tier__dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 2px #222; }
.tier__name { font: 600 15px 'Pixelify Sans', sans-serif; }
.tier__range { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.ladder { padding: 8px 10px 12px; display: flex; flex-direction: column; gap: 3px; }

.ladder__row {
  border: 0;
  cursor: pointer;
  width: 100%;
  text-align: left;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 70px 90px;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--in);
  color: var(--tx);
  font: 700 14px 'Nunito', sans-serif;
}

.ladder__row--head { cursor: default; background: none; color: var(--mu); font-size: 12px; min-height: 24px; }
.ladder__row--on { box-shadow: inset 0 0 0 2px var(--uA); }
.ladder__row--me { background: rgba(255, 210, 58, .12); }
.ladder__rank { font: 600 16px 'Pixelify Sans', sans-serif; color: var(--mu); }
.ladder__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ladder__elo { font: 600 16px 'Pixelify Sans', sans-serif; }
.ladder__record { color: var(--mu); }
.player__body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.player__name { font: 700 24px 'Pixelify Sans', sans-serif; }
.player__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.player__stat { padding: 8px; border-radius: 8px; background: var(--in); display: flex; flex-direction: column; align-items: center; }
.player__stat b { font: 600 20px 'Pixelify Sans', sans-serif; }
.player__stat span { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.player__me { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.empty { padding: 14px 12px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
@keyframes wobble { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-18deg); } 75% { transform: rotate(18deg); } }

@media (max-width: 1100px) {
  .top, .bottom { grid-template-columns: minmax(0, 1fr); }
}
</style>

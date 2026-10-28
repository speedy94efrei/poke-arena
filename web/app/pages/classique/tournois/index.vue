<template>
  <div class="tours">
    <div class="tours__head">
      <div class="tours__heading">
        <h1 class="tours__title">Tournois et événements</h1>
        <span class="tours__subtitle">Réguliers chaque semaine, ou proposés par les joueurs</span>
      </div>
      <NuxtLink to="/classique/tournois/creer" class="btn btn--primary">+ Créer un tournoi</NuxtLink>
    </div>

    <LobbyConnection v-if="!connected" />
    <p v-else-if="!calendar" class="tours__loading">Lecture du calendrier sur le serveur de combat…</p>
    <div v-else class="tours__body">
      <div class="tours__main">
        <ClassiqueTournoisTourCalendar :events="calendar.events" :selected="selected?.id ?? ''" :now="now" @select="select" />
        <ClassiqueTournoisTourBracket
          v-if="selected"
          :bracket="live?.bracket ?? selected.bracket"
          :title="selected.name"
          :me="store.name"
          :winner="live?.results[0]?.[0] ?? selected.winner"
          :players="selected.players"
        />
      </div>
      <div class="tours__side">
        <ClassiqueTournoisTourCard
          v-if="selected"
          :event="selected"
          :live="live"
          :me="store.name"
          :connected="connected"
          :registration="calendar.registration"
          :now="now"
          @register="joining => register(selected!, joining)"
          @ready="team => selected?.roomid && tournament(selected.roomid, 'ready', team)"
          @cancel-ready="selected?.roomid && tournament(selected.roomid, 'cancelready')"
        />
        <section class="news" aria-label="Annonces">
          <header class="news__head">Annonces</header>
          <div class="news__body">
            <div v-for="result in calendar.results.slice(0, 4)" :key="result.id" class="news__item">
              <b>🏆 {{ result.winner }} remporte « {{ result.name }} »</b>
              <span>{{ formatIdLabel(result.format) }} · {{ result.players }} joueurs{{ result.finalist ? ` · finale contre ${result.finalist}` : '' }} · {{ relativeDate(new Date(result.at).toISOString()) }}</span>
            </div>
            <div class="news__item">
              <b>Crée ton propre tournoi</b>
              <span>Choisis le format, les règles et l'heure : il apparaît dans ce calendrier et s'ouvre un quart d'heure avant le départ.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Tournois · Classique' })

const route = useRoute()
const router = useRouter()
const { store, tournament } = useShowdown()
const { calendar, connected, enter, register } = useArenaTournaments()

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

/** Le tournoi demandé, sinon celui qui se joue, sinon le prochain. */
const selected = computed(() => {
  const events = calendar.value?.events ?? []
  return events.find(event => event.id === route.query.id)
    ?? events.find(event => event.status === 'open' || event.status === 'started')
    ?? events.find(event => event.startsAt > now.value)
    ?? events[0]
})

const live = computed(() => selected.value?.roomid ? store.rooms[selected.value.roomid]?.tournament ?? null : null)

const select = (id: string) => router.replace({ query: { ...route.query, id } })

watch(() => selected.value?.roomid, (roomid) => {
  if (roomid && connected.value) enter(roomid)
}, { immediate: true })

/** Un match de tournoi qui démarre ouvre l'écran de combat. */
watch(() => store.latestBattle, (roomid, previous) => {
  if (roomid && roomid !== previous) navigateTo(`/classique/combat/${roomid}`)
})

onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 15_000)
})
onBeforeUnmount(() => clearInterval(clock))
</script>

<style scoped>
.tours { display: flex; flex-direction: column; gap: 12px; }
.tours__head { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.tours__head a { text-decoration: none; }
.tours__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.tours__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.tours__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.tours__loading { margin: 0; font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.tours__body { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 12px; align-items: start; }
.tours__main, .tours__side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.news { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.news__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
}

.news__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.news__item { padding: 7px 9px; border-radius: 7px; background: var(--in); display: flex; flex-direction: column; gap: 2px; font: 400 11px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.news__item b { font-size: 13px; color: var(--tx); }

@media (max-width: 1100px) {
  .tours__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

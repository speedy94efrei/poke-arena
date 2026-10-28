<template>
  <div class="online">
    <div class="online__head">
      <h1 class="online__title">Combat en ligne</h1>
      <span class="online__subtitle">Défie un joueur dans n'importe quel format, regarde un combat en cours ou rejoins un salon. Rien n'est classé.</span>
    </div>

    <LobbyConnection v-if="!connected" />

    <div class="grid">
      <section aria-label="Défier un joueur" class="panel">
        <header class="panel__head">Défier un joueur</header>
        <form class="panel__body" @submit.prevent="sendChallenge">
          <input v-model="opponent" class="field" maxlength="18" placeholder="Pseudo du joueur" aria-label="Pseudo du joueur à défier">
          <ClassiqueFormatPicker v-model="format" usage="challenge" />
          <ClassiqueTeamSelect v-model="teamId" :format="format" :generated="Boolean(selected?.generatedTeam)" />
          <div v-if="store.challengeTo" class="pending">
            <span>Défi envoyé à <b>{{ store.challengeTo.to }}</b> en {{ labelOf(store.challengeTo.format) }}…</span>
            <button type="button" class="btn btn--small" @click="cancelChallenge">Annuler</button>
          </div>
          <button v-else type="submit" class="btn btn--primary" :disabled="!canChallenge">Défier</button>
        </form>
      </section>

      <section aria-label="Défis reçus" class="panel">
        <header class="panel__head">Défis reçus<span class="panel__aside">{{ incoming.length }}</span></header>
        <div class="panel__body">
          <p v-if="!incoming.length" class="empty">Aucun défi pour l'instant. Donne ton pseudo à un ami : <b>{{ store.name || '…' }}</b>.</p>
          <div v-for="challenge in incoming" :key="challenge.from" class="challenge">
            <span class="challenge__who"><b>{{ challenge.from }}</b> te défie en {{ labelOf(challenge.format) }}</span>
            <ClassiqueTeamSelect v-if="!challenge.generated" :model-value="answers[toId(challenge.from)] ?? ''" @update:model-value="value => answers[toId(challenge.from)] = value" :format="challenge.format" :generated="false" />
            <div class="challenge__actions">
              <button type="button" class="btn btn--small btn--primary" :disabled="!challenge.generated && !answers[toId(challenge.from)]" @click="acceptChallenge(challenge)">Accepter</button>
              <button type="button" class="btn btn--small" @click="reject(challenge.from)">Refuser</button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Combats en cours" class="panel">
        <header class="panel__head">Combats en cours · à regarder<button type="button" class="panel__refresh" title="Actualiser" @click="loadBattles">↻</button></header>
        <div class="panel__body">
          <p v-if="!battles.length" class="empty">{{ connected ? 'Aucun combat en cours sur le serveur.' : 'Connecte-toi pour voir les combats en cours.' }}</p>
          <button v-for="battle in battles" :key="battle.roomid" type="button" class="live" @click="watchBattle(battle.roomid)">
            <span class="live__players">{{ battle.p1 }} <span class="live__vs">contre</span> {{ battle.p2 }}</span>
            <span class="live__meta">{{ labelOf(battle.format) }}<template v-if="battle.minElo"> · Elo {{ battle.minElo }}+</template> · Regarder ▸</span>
          </button>
        </div>
      </section>

      <section aria-label="Salons" class="panel">
        <header class="panel__head">Salons du serveur</header>
        <div class="panel__body">
          <p v-if="!rooms.length" class="empty">{{ connected ? 'Aucun salon public.' : 'Connecte-toi pour voir les salons.' }}</p>
          <NuxtLink v-for="room in rooms" :key="room.title" :to="{ path: '/classique/chat', query: { salon: serverRoomId(room.title) } }" class="room">
            <span class="room__name"># {{ room.title }}</span>
            <span class="room__count">{{ room.userCount }} en ligne</span>
          </NuxtLink>
          <span v-if="serverCounts" class="room__total">{{ serverCounts }}</span>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Combat en ligne · Classique' })

const BATTLES_EVERY = 15_000

const route = useRoute()
const { store, challenge, cancelChallenge, accept, reject, query, join } = useShowdown()
const { teams, packed } = useClassicTeams()
usePokedex()

const format = useState('classic-format', () => 'gen9ou')
const opponent = ref(typeof route.query.defier === 'string' ? route.query.defier : '')
if (typeof route.query.format === 'string') format.value = route.query.format
const teamId = ref('')
const answers = reactive<Record<string, string>>({})
const battles = ref<{ roomid: string, p1: string, p2: string, format: string, minElo?: number }[]>([])
const rooms = ref<{ title: string, userCount: number, privacy?: string }[]>([])
const serverCounts = ref('')
const pending = ref(false)
const watching = ref('')

const connected = computed(() => store.status === 'connecte')
const allFormats = computed(() => store.formats.flatMap(section => section.formats))
const selected = computed(() => allFormats.value.find(entry => entry.id === format.value))
const team = computed(() => teams.value.find(entry => entry.id === teamId.value))
const canChallenge = computed(() => connected.value && Boolean(opponent.value.trim()) && Boolean(selected.value) && (selected.value!.generatedTeam || Boolean(team.value)))
const labelOf = (id: string) => {
  const entry = allFormats.value.find(candidate => candidate.id === toId(id))
  return entry ? formatLabel(entry.name) : formatIdLabel(toId(id))
}

const incoming = computed(() => Object.values(store.challengesFrom).filter(entry => !toId(entry.format).endsWith('pokedraft')).map(entry => ({
  ...entry,
  generated: Boolean(allFormats.value.find(candidate => candidate.id === toId(entry.format))?.generatedTeam),
})))

const sendChallenge = () => {
  if (!canChallenge.value) return
  pending.value = true
  challenge(opponent.value.trim(), selected.value!.generatedTeam ? '' : packed(team.value!), format.value)
}

const acceptChallenge = (entry: { from: string, format: string, generated: boolean }) => {
  const chosen = teams.value.find(candidate => candidate.id === answers[toId(entry.from)])
  pending.value = true
  accept(entry.from, entry.generated || !chosen ? '' : packed(chosen))
}

const loadBattles = async () => {
  const response = await query<{ rooms: Record<string, { p1: string, p2: string, minElo?: number }> }>('roomlist', '')
  battles.value = Object.entries(response?.rooms ?? {}).map(([roomid, room]) => ({
    roomid, p1: room.p1, p2: room.p2, minElo: room.minElo, format: roomid.split('-')[1] ?? '',
  })).filter(battle => !battle.format.endsWith('pokedraft'))
}

const loadRooms = async () => {
  const response = await query<{ official?: { title: string, userCount: number, privacy?: string }[], chat?: { title: string, userCount: number, privacy?: string }[], userCount?: number, battleCount?: number }>('rooms', '')
  rooms.value = [...(response?.official ?? []), ...(response?.chat ?? [])].filter(room => !room.privacy)
  serverCounts.value = response ? `${response.userCount ?? 0} joueurs connectés · ${response.battleCount ?? 0} combats en cours` : ''
}

const watchBattle = (roomid: string) => {
  watching.value = roomid
  join(roomid)
}

watch(() => store.latestBattle, (roomid) => {
  if (roomid && (pending.value || roomid === watching.value)) {
    pending.value = false
    navigateTo(`/classique/combat/${roomid}`)
  }
})

watch(connected, (value) => {
  if (!value) return
  loadBattles()
  loadRooms()
}, { immediate: true })

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (connected.value) loadBattles()
  }, BATTLES_EVERY)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.online { display: flex; flex-direction: column; gap: 12px; }
.online__head { display: flex; flex-direction: column; gap: 2px; }
.online__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.online__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
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

.panel__aside { margin-left: auto; font: 700 12px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; }
.panel__refresh { margin-left: auto; border: 0; cursor: pointer; background: none; color: inherit; font-size: 18px; }
.panel__body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.pending { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font: 700 13px 'Atkinson Hyperlegible', sans-serif; }
.challenge { padding: 10px; border-radius: 8px; background: var(--in); display: flex; flex-direction: column; gap: 8px; }
.challenge__who { font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.challenge__actions { display: flex; gap: 6px; }

.live {
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--in);
  color: var(--tx);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.live:hover { box-shadow: inset 0 0 0 2px var(--uA); }
.live__players { font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.live__vs { color: var(--mu); font-weight: 400; }
.live__meta { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.room { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 8px; background: var(--in); color: var(--tx); text-decoration: none; font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.room:hover { background: var(--chip); text-decoration: none; }
.room__count, .room__total { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.empty { margin: 0; font: 700 13px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
@media (max-width: 1100px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

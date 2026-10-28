<template>
  <div class="chat">
    <div class="chat__head">
      <div class="chat__heading">
        <h1 class="chat__title">Chat et social</h1>
        <span class="chat__subtitle">Salons publics et messages privés du serveur de combat</span>
      </div>
    </div>

    <LobbyConnection v-if="!connected" />
    <div v-else class="chat__body">
      <aside class="lists" aria-label="Salons et conversations">
        <section class="list">
          <header class="list__head">Salons</header>
          <button
            v-for="room in rooms"
            :key="room.id"
            type="button"
            class="list__row"
            :class="{ 'list__row--on': active.kind === 'room' && active.id === room.id }"
            :title="room.desc"
            @click="openRoom(room.id)"
          >
            <span class="list__hash">#</span><span class="list__name">{{ room.title }}</span><span class="list__count">{{ room.userCount }}</span>
          </button>
          <p v-if="!rooms.length" class="list__empty">Lecture des salons…</p>
        </section>
        <section class="list">
          <header class="list__head">Messages privés</header>
          <button
            v-for="chat in privateChats"
            :key="chat.id"
            type="button"
            class="list__row"
            :class="{ 'list__row--on': active.kind === 'pm' && active.id === chat.id }"
            @click="openPm(chat.id)"
          >
            <span class="list__avatar">{{ chat.name.charAt(0).toUpperCase() }}</span>
            <span class="list__text"><b>{{ chat.name }}</b><span>{{ chat.last }}</span></span>
            <span v-if="chat.unread" class="list__badge">{{ chat.unread }}</span>
          </button>
          <p class="list__hint">Réservés aux comptes Arène reliés au serveur de combat, des deux côtés.</p>
          <form class="list__new" @submit.prevent="startPm">
            <input v-model="pmTarget" class="field list__input" maxlength="18" placeholder="Écrire à un joueur…" aria-label="Pseudo du joueur">
            <button type="submit" class="btn btn--small" :disabled="!pmTarget.trim()">Ouvrir</button>
          </form>
        </section>
      </aside>

      <ClassiqueChatThread
        v-if="active.kind === 'room'"
        :title="`# ${room?.title ?? active.id}`"
        :subtitle="roomInfo?.desc || (room ? `${room.users.length} en ligne` : 'Connexion au salon…')"
        :lines="room?.log ?? []"
        :placeholder="`Écrire dans #${room?.title ?? active.id}…`"
        empty="Pas encore de message : lance la conversation !"
        :disabled="!room"
        @send="text => say(active.id, text)"
      />
      <ClassiqueChatThread
        v-else
        :title="`Avec ${pm?.name ?? active.id}`"
        subtitle="Message privé"
        :lines="pmLines"
        :placeholder="`Écrire à ${pm?.name ?? active.id}…`"
        :empty="`Ta conversation avec ${pm?.name ?? active.id} commence ici.`"
        @send="text => sendPm(pm?.name ?? active.id, text)"
      />

      <aside class="people" aria-label="Joueurs">
        <header class="list__head">{{ active.kind === 'room' ? `En ligne · ${users.length}` : 'Actions' }}</header>
        <template v-if="active.kind === 'room'">
          <div v-for="user in users" :key="user.id" class="person">
            <span class="person__rank" :title="user.rank ? 'Rang dans le salon' : ''">{{ user.rank }}</span>
            <span class="person__name">{{ user.name }}</span>
            <template v-if="user.id !== myId">
              <button type="button" class="person__action" :aria-label="`Écrire à ${user.name}`" @click="openPm(user.id, user.name)">✉</button>
              <NuxtLink :to="{ path: '/classique/en-ligne', query: { defier: user.name } }" class="person__action" :aria-label="`Défier ${user.name}`">⚔</NuxtLink>
            </template>
          </div>
        </template>
        <div v-else class="people__actions">
          <NuxtLink :to="{ path: '/classique/en-ligne', query: { defier: pm?.name ?? active.id } }" class="btn btn--primary btn--small">⚔ Défier {{ pm?.name ?? active.id }}</NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatLine } from '~/utils/chatRooms'

interface RoomInfo {
  id: string
  title: string
  desc: string
  userCount: number
}

useHead({ title: 'Chat · Classique' })

const RANKS = '~&#@%*+ '
const route = useRoute()
const router = useRouter()
const { store, query, join, say, sendPm, readPm } = useShowdown()

const connected = computed(() => store.status === 'connecte')
const myId = computed(() => toId(store.name))
const rooms = ref<RoomInfo[]>([])
const pmTarget = ref('')
const pmNames = reactive<Record<string, string>>({})

const active = computed(() => typeof route.query.mp === 'string'
  ? { kind: 'pm' as const, id: toId(route.query.mp) }
  : { kind: 'room' as const, id: typeof route.query.salon === 'string' ? route.query.salon : 'lobby' })

const room = computed(() => active.value.kind === 'room' ? store.rooms[active.value.id] : undefined)
const roomInfo = computed(() => rooms.value.find(entry => entry.id === active.value.id))
const pm = computed(() => active.value.kind === 'pm' ? store.pms[active.value.id] ?? { name: pmNames[active.value.id] ?? active.value.id, messages: [], unread: 0 } : undefined)
const pmLines = computed<ChatLine[]>(() => (pm.value?.messages ?? []).map(message => ({ id: message.id, kind: 'chat', user: message.from, text: message.text, at: message.at })))

const privateChats = computed(() => Object.entries(store.pms)
  .map(([id, chat]) => ({ id, name: chat.name, unread: chat.unread, last: chat.messages[chat.messages.length - 1]?.text ?? '', at: chat.messages[chat.messages.length - 1]?.at ?? 0 }))
  .sort((a, b) => b.at - a.at))

/** Joueurs du salon, le staff d'abord, puis par ordre alphabétique. */
const users = computed(() => (room.value?.users ?? [])
  .map((raw) => {
    const rank = RANKS.includes(raw.charAt(0)) ? raw.charAt(0).trim() : ''
    const name = bareName(raw)
    return { id: toId(name), name, rank, order: rank ? RANKS.indexOf(rank) : RANKS.length }
  })
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr')))

const loadRooms = async () => {
  const data = await query<{ chat: { title: string, desc: string, userCount: number, privacy?: string }[] }>('rooms')
  rooms.value = (data?.chat ?? []).filter(entry => !entry.privacy).map(entry => ({ id: serverRoomId(entry.title), title: entry.title, desc: entry.desc, userCount: entry.userCount }))
}

const openRoom = (id: string) => router.replace({ query: { salon: id } })
const openPm = (id: string, name?: string) => {
  if (name) pmNames[id] = name
  router.replace({ query: { mp: id } })
}

const startPm = () => {
  const name = pmTarget.value.trim()
  if (!name) return
  pmTarget.value = ''
  openPm(toId(name), name)
}

watch([active, connected], () => {
  if (!connected.value) return
  if (active.value.kind === 'room' && !store.rooms[active.value.id]) join(active.value.id)
  if (active.value.kind === 'pm') readPm(active.value.id)
}, { immediate: true })

watch(() => pm.value?.messages.length, () => {
  if (active.value.kind === 'pm') readPm(active.value.id)
})

/** Un match qui démarre (défi accepté, tournoi) ouvre l'écran de combat. */
watch(() => store.latestBattle, (roomid, previous) => {
  if (roomid && roomid !== previous) navigateTo(`/classique/combat/${roomid}`)
})

let timer: ReturnType<typeof setInterval> | undefined
watch(connected, (online) => {
  if (online) loadRooms()
}, { immediate: true })
onMounted(() => {
  timer = setInterval(() => connected.value && loadRooms(), 30_000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.chat { display: flex; flex-direction: column; gap: 12px; }
.chat__heading { display: flex; flex-direction: column; gap: 2px; }
.chat__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.chat__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.chat__body { display: grid; grid-template-columns: 230px minmax(0, 1fr) 220px; gap: 12px; height: min(680px, calc(100vh - 170px)); min-height: 440px; }
.lists { display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: auto; }
.list, .people { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; display: flex; flex-direction: column; }
.people { overflow: auto; }

.list__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 14px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  flex: none;
}

.list__row {
  border: 0;
  cursor: pointer;
  text-align: left;
  margin: 2px 6px;
  padding: 6px 8px;
  border-radius: 7px;
  background: transparent;
  color: var(--tx);
  display: flex;
  align-items: center;
  gap: 6px;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.list__row:first-of-type { margin-top: 6px; }
.list__row:hover { background: var(--chip); }
.list__row--on { background: color-mix(in srgb, var(--uA) 20%, var(--in)); box-shadow: inset 0 0 0 2px var(--uA); }
.list__hash { color: var(--mu); }
.list__name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list__count { font: 600 12px 'Pixelify Sans', sans-serif; color: var(--mu); }
.list__avatar { flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--chip); font: 600 13px 'Pixelify Sans', sans-serif; display: grid; place-items: center; }
.list__text { flex: 1; min-width: 0; display: flex; flex-direction: column; font: 400 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.list__text b { font-size: 13px; color: var(--tx); }
.list__text span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list__badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #c8362a; color: #fff; font: 700 11px 'Atkinson Hyperlegible', sans-serif; display: grid; place-items: center; }
.list__empty { margin: 8px 12px; font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.list__hint { margin: 6px 12px 0; font: 700 11px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.list__new { display: flex; gap: 5px; padding: 8px; }
.list__input { flex: 1; height: 30px; font-size: 12px; }
.person { display: flex; align-items: center; gap: 6px; padding: 4px 10px; font: 700 13px 'Atkinson Hyperlegible', sans-serif; }
.person__rank { width: 12px; color: var(--uA); }
.person__name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.person__action {
  border: 0;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background: var(--chip);
  color: var(--tx);
  font-size: 12px;
  display: grid;
  place-items: center;
  text-decoration: none;
}

.person__action:hover { background: var(--hd); text-decoration: none; }
.people__actions { padding: 10px; }
.people__actions a { text-decoration: none; width: 100%; }

@media (max-width: 1100px) {
  .chat__body { grid-template-columns: 200px minmax(0, 1fr); }
  .people { display: none; }
}

@media (max-width: 760px) {
  .chat__body { grid-template-columns: minmax(0, 1fr); height: auto; }
  .lists { max-height: 260px; }
  .chat__body > :nth-child(2) { height: 520px; }
}
</style>

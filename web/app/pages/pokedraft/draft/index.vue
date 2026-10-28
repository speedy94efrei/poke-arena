<template>
  <div class="salon">
    <div class="salon__head">
      <h1 class="salon__title">Classé · Draft</h1>
      <span class="salon__subtitle">PokéDraft · Saison {{ roster.saison }} · 3 bans, 6 picks en serpent, 90 s de préparation, puis le combat</span>
    </div>

    <div v-if="store.cancelled" class="notice">{{ store.cancelled }}</div>
    <div v-if="store.event?.tone === 'alerte' && !store.draft" class="notice">{{ store.event.text }}</div>

    <div class="salon__grid">
      <div class="salon__column">
        <LobbyConnection />
        <UiPanel title="Partie classée">
          <template #aside>Saison {{ roster.saison }}</template>
          <div v-if="store.account.ranked" class="ranked" :class="{ 'ranked--ok': store.account.verified }">
            <template v-if="store.account.verified">✓ Compte <b>{{ store.account.name }}</b> vérifié : tes drafts de la file comptent pour le classement.</template>
            <template v-else-if="!loggedIn">Connecte-toi à ton compte Arène pour jouer en classé. <button type="button" class="btn btn--small" @click="dialog = 'login'">Se connecter</button></template>
            <template v-else-if="connected">Connecte-toi au serveur de combat sous le pseudo <b>{{ session.name }}</b> pour jouer en classé.</template>
            <template v-else>Connecte-toi au serveur de combat sous le pseudo <b>{{ session.name }}</b>.</template>
          </div>
          <button v-if="!store.searching" type="button" class="btn btn--primary salon__play" :disabled="!canSearch" @click="search">▶ Chercher un adversaire</button>
          <div v-else class="pending">
            <span class="pending__pulse">Recherche d'un adversaire…</span>
            <button type="button" class="btn btn--small" @click="cancelSearch">Annuler</button>
          </div>
          <p class="hint">
            Deux joueurs qui cherchent en même temps lancent un draft.
            {{ store.account.ranked ? 'Victoire +20 PL (plus un bonus de série), défaite −18 PL, abandon du draft −5 PL. Les défis entre joueurs restent amicaux.' : "Le classement n'est pas branché sur ce serveur : la partie n'est pas comptée." }}
          </p>
        </UiPanel>
      </div>

      <div class="salon__column">
        <UiPanel title="Défier un joueur">
          <form class="row" @submit.prevent="sendChallenge">
            <input v-model="opponent" class="field row__input" maxlength="18" placeholder="Pseudo de l'adversaire" aria-label="Pseudo de l'adversaire">
            <button class="btn btn--primary" type="submit" :disabled="!connected || !opponent.trim() || !!store.challengeTo">Défier</button>
          </form>
          <div v-if="store.challengeTo" class="pending">
            <span>Draft proposé à <b>{{ store.challengeTo }}</b>…</span>
            <button type="button" class="btn btn--small" @click="cancelChallenge">Annuler</button>
          </div>
          <p v-if="!connected" class="hint">Connecte-toi pour jouer.</p>
        </UiPanel>

        <UiPanel title="Défis reçus">
          <template #aside>{{ store.challengedBy.length }}</template>
          <p v-if="!store.challengedBy.length" class="hint">Aucun défi pour l'instant.</p>
          <div v-for="name in store.challengedBy" :key="name" class="incoming">
            <span class="incoming__who"><b>{{ name }}</b> te propose un draft</span>
            <button type="button" class="btn btn--small btn--primary" @click="accept(name)">Accepter</button>
            <button type="button" class="btn btn--small" @click="reject(name)">Refuser</button>
          </div>
        </UiPanel>

        <UiPanel title="Tester seul">
          <p class="hint">
            Lance le bot de test (<code>npm run bot</code> dans <code>web/</code>), puis défie <b>Bot Test</b> : il bannit, picke et joue au hasard.
            Tu peux aussi ouvrir une deuxième fenêtre en navigation privée et te défier toi-même.
          </p>
        </UiPanel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { store: showdown } = useShowdown()
const { store, refresh, search, cancelSearch, challenge, cancelChallenge, accept, reject } = useDraft()
const { session, loggedIn, dialog } = useAccount()
const opponent = ref('')

useHead({ title: 'Classé · Draft · PokéDraft' })

const connected = computed(() => showdown.status === 'connecte')
const canSearch = computed(() => connected.value && (!store.account.ranked || store.account.verified))

const sendChallenge = () => challenge(opponent.value.trim())

watch(connected, (value) => {
  if (value) refresh()
}, { immediate: true })

watch(() => store.draft?.id, (id) => {
  if (id) navigateTo(`/pokedraft/draft/${id}`)
}, { immediate: true })
</script>

<style scoped>
.salon {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.salon__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.salon__title {
  margin: 0;
  font: 700 30px/1 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
}

.salon__subtitle { font: 700 14px 'Nunito', sans-serif; color: var(--mu); }

.salon__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.salon__column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.salon__play { height: 48px; font: 700 18px 'Pixelify Sans', sans-serif; }

.ranked {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--in);
  box-shadow: inset 0 0 0 2px #e8704a;
  font: 700 13px/1.45 'Nunito', sans-serif;
  color: #ffd9c8;
}

.ranked--ok { box-shadow: inset 0 0 0 2px #58d080; color: #c8f0d8; }

.notice {
  padding: 10px 14px;
  border-radius: var(--r);
  background: #3a2216;
  box-shadow: inset 0 0 0 2px #e8704a, 0 0 0 2px var(--bd);
  font: 700 14px 'Nunito', sans-serif;
  color: #ffd9c8;
}

.row {
  display: flex;
  gap: 8px;
}

.row__input { flex: 1; }

.pending {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  font: 700 14px 'Nunito', sans-serif;
}

.pending__pulse { animation: pulse 1.2s ease-in-out infinite; }

.hint {
  margin: 0;
  font: 400 13px/1.45 'Nunito', sans-serif;
  color: var(--mu);
}

.incoming {
  display: flex;
  align-items: center;
  gap: 6px;
}

.incoming__who {
  flex: 1;
  font: 400 14px 'Nunito', sans-serif;
}

@media (max-width: 900px) {
  .salon__grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

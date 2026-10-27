<template>
  <UiPanel title="Défier un joueur">
    <form class="row" @submit.prevent="sendChallenge">
      <input v-model="opponent" class="field row__input" maxlength="18" placeholder="Pseudo de l'adversaire" aria-label="Pseudo de l'adversaire">
      <button class="btn btn--primary" type="submit" :disabled="!canPlay || !opponent.trim() || !!store.challengeTo">Défier</button>
    </form>
    <div v-if="store.challengeTo" class="pending">
      <span>Défi envoyé à <b>{{ store.challengeTo.to }}</b>…</span>
      <button type="button" class="btn btn--small" @click="cancelChallenge">Annuler</button>
    </div>
    <p v-if="!canPlay" class="hint">{{ blocker }}</p>
  </UiPanel>

  <UiPanel title="Chercher un adversaire">
    <template #aside>PokéDraft · Saison {{ roster.saison }}</template>
    <button v-if="!store.searching" type="button" class="btn btn--primary" :disabled="!canPlay" @click="search(sets)">
      ⚔ Lancer la recherche
    </button>
    <div v-else class="pending">
      <span class="pending__pulse">Recherche en cours…</span>
      <button type="button" class="btn btn--small" @click="cancelSearch">Annuler</button>
    </div>
    <p class="hint">Deux joueurs qui cherchent en même temps sont mis face à face.</p>
  </UiPanel>

  <UiPanel title="Défis reçus">
    <template #aside>{{ incoming.length }}</template>
    <p v-if="!incoming.length" class="hint">Aucun défi pour l'instant.</p>
    <div v-for="challenge in incoming" :key="challenge.from" class="incoming">
      <span class="incoming__who"><b>{{ challenge.from }}</b> te défie</span>
      <button type="button" class="btn btn--small btn--primary" :disabled="!canPlay" @click="accept(challenge.from, sets)">Accepter</button>
      <button type="button" class="btn btn--small" @click="reject(challenge.from)">Refuser</button>
    </div>
  </UiPanel>

  <UiPanel title="Tester seul">
    <p class="hint">
      Ouvre une deuxième fenêtre (en navigation privée), connecte-toi avec un autre pseudo et défie-toi.
      Chaque fenêtre garde sa propre équipe.
    </p>
  </UiPanel>
</template>

<script setup lang="ts">
const { store, challenge, cancelChallenge, accept, reject, search, cancelSearch } = useShowdown()
const { sets, complete } = useTeamPicker()
const opponent = ref('')

const canPlay = computed(() => store.status === 'connecte' && complete.value)
const blocker = computed(() => store.status !== 'connecte' ? 'Connecte-toi pour jouer.' : `Choisis ${TEAM_SIZE} Pokémon.`)
const incoming = computed(() => Object.values(store.challengesFrom))

const sendChallenge = () => challenge(opponent.value.trim(), sets.value)
</script>

<style scoped>
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
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
}

.pending__pulse { animation: pulse 1.2s ease-in-out infinite; }

.hint {
  margin: 0;
  font: 400 13px/1.4 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.incoming {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: var(--dk);
  animation: pop .25s both;
}

.incoming__who {
  flex: 1;
  font: 400 14px 'Atkinson Hyperlegible', sans-serif;
}
</style>

<template>
  <UiPanel title="Connexion">
    <template #aside>{{ statusText }}</template>
    <form v-if="store.status !== 'connecte'" class="connection" @submit.prevent="connect(name)">
      <input v-model="name" class="field connection__input" maxlength="18" placeholder="Ton pseudo" aria-label="Pseudo">
      <button class="btn btn--primary" type="submit" :disabled="!name.trim() || store.status === 'connexion'">
        {{ store.status === 'connexion' ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>
    <p v-else class="connection__done">
      Connecté en tant que <b>{{ store.name }}</b>
    </p>
    <p class="connection__hint">
      <template v-if="loggedIn">Avec le pseudo de ton compte, tu te connectes au compte : ta progression et ton classement lui restent attachés.</template>
      <template v-else>Le pseudo d'un compte Arène est réservé à son propriétaire. Sans compte, un pseudo libre suffit, mais il n'est pas protégé : crée un compte pour garder ta progression.</template>
      Serveur de combat : <code>{{ serverUrl }}</code>.
    </p>
  </UiPanel>
</template>

<script setup lang="ts">
const { store, serverUrl, connect } = useShowdown()
const { session, loggedIn } = useAccount()
const name = useState('lobby-name', () => session.value.name ?? '')

watch(() => session.value.name, (account) => {
  if (account && !name.value) name.value = account
})

const statusText = computed(() => ({ connecte: '● en ligne', connexion: '◌ connexion…', deconnecte: '○ hors ligne' })[store.status])
</script>

<style scoped>
.connection {
  display: flex;
  gap: 8px;
}

.connection__input { flex: 1; }

.connection__done {
  margin: 0;
  font: 700 15px 'Nunito', sans-serif;
}

.connection__hint {
  margin: 0;
  font: 400 13px/1.4 'Nunito', sans-serif;
  color: var(--mu);
}
</style>

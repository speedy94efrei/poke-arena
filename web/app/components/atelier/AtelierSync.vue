<template>
  <span class="sync" :class="`sync--${state.tone}`" role="status" :title="state.title">
    <span class="sync__dot" />{{ state.label }}
    <button v-if="state.action" type="button" class="sync__action" @click="state.action.run">{{ state.action.label }}</button>
  </span>
</template>

<script setup lang="ts">
const { sync, retry } = useAtelier()
const { dialog } = useAccount()

const state = computed(() => {
  switch (sync.value) {
    case 'chargement':
      return { tone: 'busy', label: 'Chargement de ton compte…', title: 'Récupération des variantes enregistrées sur ton compte.' }
    case 'enregistrement':
      return { tone: 'busy', label: 'Enregistrement…', title: 'Envoi des dernières modifications à ton compte.' }
    case 'enregistre':
      return { tone: 'ok', label: 'Enregistré sur ton compte', title: 'Tes variantes te suivent sur tous tes appareils.' }
    case 'erreur':
      return { tone: 'error', label: 'Non enregistré', title: 'L\'API ne répond pas : tes dernières modifications ne sont pas encore sur ton compte.', action: { label: 'Réessayer', run: retry } }
    case 'hors-ligne':
      return { tone: 'error', label: 'Compte injoignable', title: 'Impossible de charger tes variantes : tes modifications restent dans ce navigateur en attendant.', action: { label: 'Réessayer', run: retry } }
    default:
      return { tone: 'local', label: 'Dans ce navigateur', title: 'Sans compte, tes variantes ne sont gardées que dans ce navigateur.', action: { label: 'Se connecter', run: () => { dialog.value = 'login' } } }
  }
})
</script>

<style scoped>
.sync {
  height: 32px;
  padding: 0 6px 0 12px;
  border-radius: 8px;
  background: var(--dk);
  --tx: var(--dkTx);
  --mu: var(--dkMu);
  --chip: var(--dkChip);
  color: var(--tx);
  box-shadow: var(--pnS);
  font: 700 13px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 7px;
}

.sync__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--mu); flex: none; }
.sync--ok .sync__dot { background: #58d080; }
.sync--busy .sync__dot { background: #ffd23a; animation: pulse 1s steps(2) infinite; }
.sync--error { color: #ffb4a6; }
.sync--error .sync__dot { background: #ff8a7a; }

.sync__action {
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: var(--in);
  color: var(--tx);
  font: 700 12px 'Nunito', sans-serif;
  cursor: pointer;
}

.sync__action:hover { background: var(--hd); color: var(--hdTx); }

@keyframes pulse { 50% { opacity: .35; } }
</style>

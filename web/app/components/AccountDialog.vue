<template>
  <div v-if="dialog" role="dialog" aria-modal="true" :aria-label="dialog === 'login' ? 'Connexion' : 'Créer un compte'" class="overlay" @click.self="dialog = null">
    <form class="box" @submit.prevent="submit">
      <div class="tabs">
        <button type="button" class="tab" :class="{ 'tab--on': dialog === 'login' }" @click="dialog = 'login'">Connexion</button>
        <button type="button" class="tab" :class="{ 'tab--on': dialog === 'register' }" @click="dialog = 'register'">Créer un compte</button>
      </div>
      <span class="intro">
        {{ dialog === 'login' ? 'Ton compte Arène garde ton rang, tes points et ton historique.' : 'Ton pseudo sera aussi ton nom sur le serveur de combat : c\'est sous ce nom que tes drafts classés comptent.' }}
      </span>
      <label class="field-row">
        <span class="field-row__label">Pseudo</span>
        <input v-model="name" class="field" maxlength="18" autocomplete="username" required>
      </label>
      <label class="field-row">
        <span class="field-row__label">Mot de passe</span>
        <input v-model="password" class="field" type="password" :minlength="dialog === 'register' ? 8 : undefined" :autocomplete="dialog === 'login' ? 'current-password' : 'new-password'" required>
      </label>
      <span v-if="error" role="alert" class="error">{{ error }}</span>
      <div class="actions">
        <button type="button" class="btn" @click="dialog = null">Annuler</button>
        <button type="submit" class="btn btn--primary" :disabled="busy">{{ dialog === 'login' ? 'Se connecter' : 'Créer mon compte' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const { dialog, login, register } = useAccount()
const { store: showdown } = useShowdown()

const name = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

watch(dialog, () => {
  error.value = ''
  password.value = ''
  if (!name.value && showdown.status === 'connecte') name.value = showdown.name
})

const submit = async () => {
  busy.value = true
  error.value = ''
  try {
    await (dialog.value === 'login' ? login : register)(name.value.trim(), password.value)
    dialog.value = null
  } catch (failure) {
    error.value = apiErrorMessage(failure)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(6, 8, 12, .75);
  display: grid;
  place-items: center;
  padding: 16px;
}

.box {
  width: min(420px, 100%);
  border-radius: 16px;
  background: var(--pn);
  box-shadow: inset 0 0 0 3px var(--uA), 0 0 0 2px var(--bd);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: pop .2s both;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--dk);
  --tx: var(--dkTx);
  --mu: var(--dkMu);
  --chip: var(--dkChip);
  color: var(--tx);
}

.tab {
  flex: 1;
  border: 0;
  cursor: pointer;
  height: 34px;
  border-radius: 7px;
  background: transparent;
  color: var(--mu);
  font: 700 14px 'Nunito', sans-serif;
}

.tab--on { background: var(--uA); color: var(--uAtx); }
.intro { font: 400 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.field-row { display: flex; flex-direction: column; gap: 4px; }
.field-row__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.error { font: 700 13px/1.4 'Nunito', sans-serif; color: var(--bad); }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
</style>

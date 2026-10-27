<template>
  <div class="account">
    <template v-if="loggedIn">
      <NuxtLink to="/pokedraft/classement" class="account__card" title="Mon classement">
        <RankCrest :tier="rank?.tier ?? 'placement'" :size="34" />
        <span class="account__who">
          <span class="account__name">{{ session.name }}</span>
          <span class="account__rank">{{ rankText }}</span>
        </span>
      </NuxtLink>
      <button type="button" class="account__logout" title="Se déconnecter" @click="leave">Déconnexion</button>
    </template>
    <template v-else>
      <button type="button" class="btn btn--small" @click="dialog = 'login'">Se connecter</button>
      <button type="button" class="btn btn--small btn--primary" @click="dialog = 'register'">Créer un compte</button>
    </template>
    <span class="account__server" :class="`account__server--${showdown.status}`" :title="serverTitle">
      <span class="account__dot" />{{ serverLabel }}
    </span>
    <AccountDialog />
  </div>
</template>

<script setup lang="ts">
const { session, profile, dialog, loggedIn, logout } = useAccount()
const { store: showdown } = useShowdown()
const { store: draft } = useDraft()

const rank = computed(() => profile.value?.rank)
const rankText = computed(() => {
  const current = profile.value
  if (!current) return 'Profil indisponible'
  if (!current.rank.placed) return `En placement · ${current.placement.played}/${current.placement.needed}`
  return `◆ ${current.rank.label} · ${current.rank.points} PL`
})

const serverLabel = computed(() => {
  if (showdown.status !== 'connecte') return showdown.status === 'connexion' ? 'Connexion…' : 'Hors ligne'
  return draft.account.verified ? `${showdown.name} · classé` : showdown.name
})

const serverTitle = computed(() => {
  if (showdown.status !== 'connecte') return 'Serveur de combat'
  if (draft.account.verified) return 'Compte vérifié sur le serveur de combat : tes drafts de la file comptent pour le classement.'
  if (loggedIn.value) return `Connecte-toi au serveur de combat sous le pseudo ${session.value.name} pour jouer en classé.`
  return 'Serveur de combat'
})

const leave = async () => {
  await logout()
}
</script>

<style scoped>
.account {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.account__card {
  height: 44px;
  padding: 0 14px 0 6px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--tx);
  text-decoration: none;
}

.account__card:hover { text-decoration: none; background: var(--pn2); }
.account__who { display: flex; flex-direction: column; line-height: 1.15; }
.account__name { font: 700 15px 'Atkinson Hyperlegible', sans-serif; }
.account__rank { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--uA); }

.account__logout {
  border: 0;
  cursor: pointer;
  background: transparent;
  color: var(--mu);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
}

.account__logout:hover { color: var(--tx); }

.account__server {
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  background: var(--dk);
  display: flex;
  align-items: center;
  gap: 6px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.account__dot { width: 8px; height: 8px; border-radius: 50%; background: #6a7280; }
.account__server--connecte .account__dot { background: #58d080; }
.account__server--connexion .account__dot { background: var(--uA); }
</style>

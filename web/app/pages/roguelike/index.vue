<template>
  <div class="rogue">
    <section class="hero">
      <div class="hero__text">
        <h1 class="hero__title">Monte le plus haut possible</h1>
        <p class="hero__pitch">Tu pars avec un seul Pokémon, tu recrutes en chemin, et tu perds tout quand ton équipe tombe. Runs de 30 à 45 minutes, au niveau 50, avec le roster PokéDraft de la saison.</p>
        <ul class="hero__chips">
          <li class="hero__chip">♥ PV et statuts conservés</li>
          <li class="hero__chip">✕ K.O. = perdu pour la run</li>
          <li class="hero__chip">6 Pokémon max, sans doublon</li>
          <li class="hero__chip">Niveau 50 fixe</li>
        </ul>
      </div>
      <div class="current">
        <template v-if="active">
          <span class="current__kicker">Run en cours · {{ active.duo ? 'coop' : active.mode === 'semaine' ? 'défi de la semaine' : 'run libre' }}</span>
          <span class="current__floor">Étage {{ active.floor }}</span>
          <span class="current__note">{{ PHASES[active.phase] }} · sauvegardée après chaque étape</span>
          <NuxtLink to="/roguelike/run" class="btn btn--primary current__go">▶ Reprendre la run</NuxtLink>
        </template>
        <template v-else-if="run?.phase === 'fin'">
          <span class="current__kicker">Dernière run</span>
          <span class="current__floor">Étage {{ run.floor }}</span>
          <span class="current__note">{{ run.result?.text }}</span>
          <NuxtLink to="/roguelike/run" class="btn current__go">Voir le bilan</NuxtLink>
        </template>
        <template v-else>
          <span class="current__kicker">Aucune run en cours</span>
          <span class="current__note">Lance une run libre ou le défi de la semaine.</span>
        </template>
      </div>
    </section>

    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="connected && state && !state.bots" class="error">Les bots ne sont pas connectés : les combats ne pourront pas démarrer.</p>

    <div class="grid">
      <div class="modes">
        <UiPanel title="∞ Run libre">
          <p class="note">Une seed au hasard à chaque run. Seul ton record personnel compte.</p>
          <div class="stats">
            <span class="stat"><small>Record</small><b>{{ records.libre ? `Étage ${records.libre}` : '—' }}</b></span>
            <span class="stat"><small>Runs jouées</small><b>{{ records.runs }}</b></span>
          </div>
          <button type="button" class="btn" :disabled="!connected || Boolean(active) || pending" @click="act({ type: 'nouvelle', mode: 'libre' })">Nouvelle run libre</button>
        </UiPanel>

        <UiPanel title="W Défi de la semaine">
          <p class="note">La même seed pour tout le monde du lundi au dimanche : mêmes tirages, mêmes ennemis, seuls tes choix changent.</p>
          <div class="stats">
            <span class="stat"><small>Ton meilleur</small><b>{{ weekly?.solo.mine ? `Étage ${weekly.solo.mine.floor}` : '—' }}</b></span>
            <span class="stat"><small>Ta place</small><b>{{ weekly?.solo.mine ? `#${weekly.solo.mine.rank}` : '—' }}</b></span>
          </div>
          <button type="button" class="btn btn--primary" :disabled="!connected || Boolean(active) || pending" @click="act({ type: 'nouvelle', mode: 'semaine' })">Lancer le défi</button>
        </UiPanel>

        <UiPanel title="⚭ Coop à deux">
          <p class="note">Deux joueurs, 3 Pokémon chacun, en combat double contre deux IA. Chacun choisit ses récompenses ; si l'un de vous n'a plus de Pokémon, la run s'arrête.</p>
          <div v-if="state?.invite" class="invite">
            <span><b>{{ state.invite.from }}</b> t'invite en coop ({{ state.invite.mode === 'semaine' ? 'défi de la semaine' : 'run libre' }}).</span>
            <span class="invite__actions">
              <button type="button" class="btn btn--primary btn--small" :disabled="Boolean(active)" @click="act({ type: 'accepter' })">Accepter</button>
              <button type="button" class="btn btn--small" @click="act({ type: 'refuser' })">Refuser</button>
            </span>
          </div>
          <div v-else-if="state?.sent" class="invite">
            <span>Invitation envoyée à <b>{{ state.sent.to }}</b>…</span>
            <button type="button" class="btn btn--small" @click="act({ type: 'annuler' })">Annuler</button>
          </div>
          <form v-else class="coop" @submit.prevent="act({ type: 'inviter', pseudo: partner.trim(), mode: coopMode })">
            <input v-model="partner" class="field" maxlength="18" placeholder="Pseudo de ton partenaire" aria-label="Pseudo du partenaire">
            <select v-model="coopMode" class="field" aria-label="Mode de la run en coop">
              <option value="libre">Run libre</option>
              <option value="semaine">Défi de la semaine</option>
            </select>
            <button type="submit" class="btn" :disabled="!connected || Boolean(active) || !partner.trim()">Inviter</button>
          </form>
          <span class="note">Record en coop : {{ records.duo ? `étage ${records.duo}` : '—' }}</span>
        </UiPanel>
      </div>

      <UiPanel title="Défi de la semaine">
        <template #aside>{{ weekly ? `${weekly.seed} · fin dans ${daysLeft} j` : '' }}</template>
        <div class="board__tabs" role="tablist" aria-label="Classement">
          <button v-for="tab in TABS" :key="tab.id" type="button" role="tab" class="board__tab" :class="{ 'board__tab--on': board === tab.id }" :aria-selected="board === tab.id" @click="board = tab.id">{{ tab.label }}</button>
        </div>
        <div v-if="!scores?.top.length" class="note">Personne n'a encore terminé le défi cette semaine.</div>
        <div v-else role="table" class="board">
          <div role="row" class="board__row board__row--head"><span>#</span><span>{{ board === 'duo' ? 'Duo' : 'Joueur' }}</span><span>Étage</span><span>Tours</span></div>
          <div v-for="score in scores.top" :key="score.rank" role="row" class="board__row" :class="{ 'board__row--me': score.mine }">
            <span>{{ score.rank }}</span><span class="board__name">{{ score.names.join(' & ') }}</span><span>{{ score.floor }}</span><span>{{ score.turns }}</span>
          </div>
          <div v-if="scores.mine && scores.mine.rank > scores.top.length" role="row" class="board__row board__row--me">
            <span>{{ scores.mine.rank }}</span><span class="board__name">{{ scores.mine.names.join(' & ') }}</span><span>{{ scores.mine.floor }}</span><span>{{ scores.mine.turns }}</span>
          </div>
        </div>
        <p class="note">Classement : meilleur étage, puis nombre de tours. Seul ton meilleur essai compte.</p>
      </UiPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Roguelike' })

const PHASES: Record<string, string> = {
  depart: 'Tirage de départ', combat: 'Combat à lancer', recompense: 'Récompense à choisir', porte: 'Porte à choisir',
  boutique: 'Boutique', pension: 'Pension', mystere: 'Événement mystère', fin: 'Terminée',
}
const TABS = [{ id: 'solo', label: 'Solo' }, { id: 'duo', label: 'Coop' }] as const

const { store } = useShowdown()
const { state, run, error, pending, act } = useRoguelike()
const partner = ref('')
const coopMode = ref<'libre' | 'semaine'>('libre')
const board = ref<'solo' | 'duo'>('solo')

const connected = computed(() => store.status === 'connecte')
const active = computed(() => run.value && run.value.phase !== 'fin' ? run.value : null)
const records = computed(() => state.value?.records ?? { libre: 0, runs: 0, semaine: 0, duo: 0 })
const weekly = computed(() => state.value?.weekly ?? null)
const scores = computed(() => weekly.value?.[board.value] ?? null)
const daysLeft = computed(() => weekly.value ? Math.max(0, Math.ceil((weekly.value.endsAt - Date.now()) / 864e5)) : 0)

watch(() => run.value?.id, (id, previous) => {
  if (id && id !== previous && run.value?.phase === 'depart') void navigateTo('/roguelike/run')
})
</script>

<style scoped>
.rogue { display: flex; flex-direction: column; gap: 12px; }

.hero {
  padding: 20px 22px;
  border-radius: calc(var(--r) + 4px);
  background: repeating-linear-gradient(115deg, rgba(255, 255, 255, .05) 0 14px, transparent 14px 40px), linear-gradient(140deg, #5a34a8, #120a2a);
  box-shadow: inset 0 0 0 3px #a77bff, 0 0 0 3px var(--bd);
  color: #fff;
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.hero__text { flex: 1 1 420px; display: flex; flex-direction: column; gap: 10px; }
.hero__title { margin: 0; font: 700 40px/1.05 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .45); }
.hero__pitch { margin: 0; max-width: 620px; font: 700 15px/1.5 'Nunito', sans-serif; color: #e8e0ff; }
.hero__chips { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.hero__chip { height: 26px; padding: 0 10px; border-radius: 13px; background: rgba(0, 0, 0, .35); box-shadow: inset 0 0 0 1px #c8a8ff; font: 700 12px 'Nunito', sans-serif; display: flex; align-items: center; }

.current {
  flex: 0 1 320px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(10, 4, 30, .6);
  box-shadow: inset 0 0 0 2px #a77bff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.current__kicker { font: 700 12px 'Nunito', sans-serif; color: #c8a8ff; }
.current__floor { font: 700 32px/1 'Pixelify Sans', sans-serif; }
.current__note { font: 700 13px/1.4 'Nunito', sans-serif; opacity: .85; }
.current__go { margin-top: auto; }
.error { margin: 0; padding: 10px 14px; border-radius: 10px; background: color-mix(in srgb, var(--bad) 18%, var(--pn)); box-shadow: inset 0 0 0 2px var(--bad); font: 700 14px 'Nunito', sans-serif; }
.grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.modes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.modes > :last-child { grid-column: 1 / -1; }
.note { margin: 0; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 10px 0; }
.stat { padding: 8px 10px; border-radius: 8px; background: var(--in); display: flex; flex-direction: column; }
.stat small { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.stat b { font: 600 18px 'Pixelify Sans', sans-serif; }
.invite { margin: 10px 0; padding: 10px; border-radius: 8px; background: var(--in); box-shadow: inset 0 0 0 2px #a77bff; display: flex; flex-direction: column; gap: 8px; font: 700 14px 'Nunito', sans-serif; }
.invite__actions { display: flex; gap: 6px; }
.coop { margin: 10px 0; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px; }
.board__tabs { display: flex; gap: 4px; margin-bottom: 8px; }
.board__tab { border: 0; cursor: pointer; height: 30px; padding: 0 12px; border-radius: 6px; background: var(--chip); color: var(--tx); font: 700 13px 'Nunito', sans-serif; }
.board__tab--on { background: #a77bff; color: #120a2a; }
.board { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.board__row { display: grid; grid-template-columns: 34px minmax(0, 1fr) 56px 56px; gap: 8px; align-items: center; height: 32px; padding: 0 8px; border-radius: 6px; font: 700 14px 'Nunito', sans-serif; }
.board__row--head { height: 24px; font-size: 11px; color: var(--mu); }
.board__row--me { background: color-mix(in srgb, #a77bff 22%, transparent); box-shadow: inset 0 0 0 2px #a77bff; }
.board__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 1100px) {
  .grid, .modes { grid-template-columns: minmax(0, 1fr); }
}
</style>

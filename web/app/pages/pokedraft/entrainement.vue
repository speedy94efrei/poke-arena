<template>
  <div class="training">
    <div class="training__head">
      <h1 class="training__title">Entraînement</h1>
      <span class="training__subtitle">Contre un bot, sans enjeu : ni points ni classement. Choisis le type de combat, puis le niveau ou le thème du bot.</span>
    </div>

    <LobbyConnection v-if="!connected" />
    <div v-else-if="training.enabled === false" role="alert" class="notice">Les bots d'entraînement sont désactivés sur ce serveur de combat.</div>

    <section aria-label="Type de combat" class="bar">
      <span class="step">1 · Type de combat</span>
      <div role="radiogroup" aria-label="Type de combat" class="modes">
        <button
          v-for="option in MODES"
          :key="option.key"
          type="button"
          role="radio"
          class="mode"
          :class="{ 'mode--on': mode === option.key }"
          :aria-checked="mode === option.key"
          @click="mode = option.key"
        >
          <b>{{ option.label }}</b><span>{{ option.detail }}</span>
        </button>
      </div>
      <span class="bar__spacer" />
      <span class="bar__chip" title="Les combats d'entraînement ne comptent ni pour le classement ni pour les statistiques de la saison.">Sans enjeu</span>
      <button type="button" class="launch" :disabled="Boolean(blocked)" @click="launch">Lancer · {{ selectedLabel }} ▶</button>
    </section>
    <p v-if="connected && blocked" class="blocked">{{ blocked }}</p>

    <section aria-label="Niveau du bot" class="block">
      <span class="step">2 · Niveau du bot</span>
      <div class="levels">
        <button
          v-for="level in TRAINING.levels"
          :key="level.key"
          type="button"
          class="level"
          :class="{ 'level--on': selected === level.key }"
          :style="selected === level.key ? { boxShadow: `inset 0 0 0 2px #fff, 0 0 0 4px ${level.color}` } : undefined"
          :aria-pressed="selected === level.key"
          @click="selected = level.key"
        >
          <span class="level__top">
            <span class="level__number" :style="{ color: level.color }">{{ level.level }}</span>
            <span class="level__stars" :aria-label="`${level.level} sur 5`">
              <span v-for="star in 5" :key="star" class="level__star" :style="{ background: star <= level.level ? level.color : 'var(--in)' }" />
            </span>
          </span>
          <span class="level__name">{{ level.label }}</span>
          <span class="level__description">{{ level.description }}</span>
          <span class="level__status" :class="`level__status--${statusOf(level.key).tone}`">{{ statusOf(level.key).text }}</span>
        </button>
      </div>
    </section>

    <div class="lower">
      <section aria-label="Bots à thème" class="block">
        <span class="step">Ou un bot à thème <small>niveau {{ TRAINING.levels[TRAINING.themeLevel - 1]!.label }}</small></span>
        <div class="themes">
          <button
            v-for="theme in TRAINING.themes"
            :key="theme.key"
            type="button"
            class="theme"
            :class="{ 'theme--on': selected === theme.key }"
            :style="{ background: theme.background }"
            :aria-pressed="selected === theme.key"
            @click="selected = theme.key"
          >
            <span class="theme__veil" />
            <span class="theme__mons">
              <img v-for="id in theme.pokemon" :key="id" class="theme__sprite" :src="findPokemon(id)?.sprite" :alt="findPokemon(id)?.nom">
            </span>
            <span class="theme__text"><b>{{ theme.label }}</b><span>{{ theme.description }}</span></span>
          </button>
        </div>
      </section>

      <aside aria-label="Ton adversaire" class="opponent">
        <span class="opponent__title">Ton adversaire</span>
        <span class="opponent__name">{{ bot?.name ?? selectedLabel }}</span>
        <span class="opponent__status" :class="`opponent__status--${statusOf(selected).tone}`">{{ statusOf(selected).text }}</span>
        <p class="opponent__text">{{ explanation }}</p>
        <NuxtLink v-if="draft.draft" :to="`/pokedraft/draft/${draft.draft.id}`" class="opponent__link">Reprendre ton draft en cours ▸</NuxtLink>
      </aside>
    </div>

    <LobbyTeam v-if="connected && mode === 'libre'" />

    <div class="training__notices" aria-live="polite">
      <div v-for="notice in showdown.notices" :key="notice.id" class="training__notice">{{ notice.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TrainingMode } from '~/utils/training'

const MODES: { key: TrainingMode, label: string, detail: string }[] = [
  { key: 'libre', label: 'Combat libre', detail: 'ton équipe de l\'Atelier' },
  { key: 'draft', label: 'Draft complet', detail: 'bans et picks contre le bot' },
]
const REFRESH_EVERY = 10_000
const PENDING_FOR = 6_000

const route = useRoute()
const { store: showdown, challenge } = useShowdown()
const { store: training, refresh, bot: botFor } = useTraining()
const { store: draft, challenge: challengeDraft } = useDraft()
const { sets, complete, playable } = useTeamPicker()

useHead({ title: 'Entraînement · PokéDraft' })

const mode = useState<TrainingMode>('training-mode', () => 'libre')
const selected = useState('training-bot', () => TRAINING.defaultBot)
const pending = ref(false)

const known = (key: unknown): key is string => typeof key === 'string' && [...TRAINING.levels, ...TRAINING.themes].some(entry => entry.key === key)
if (known(route.query.bot)) selected.value = route.query.bot

const connected = computed(() => showdown.status === 'connecte')
const bot = computed(() => botFor(selected.value))
const level = computed(() => TRAINING.levels.find(entry => entry.key === selected.value))
const theme = computed(() => TRAINING.themes.find(entry => entry.key === selected.value))
const selectedLabel = computed(() => level.value ? `Niveau ${level.value.level} · ${level.value.label}` : `Bot ${theme.value?.label ?? ''}`)

const statusOf = (key: string): { text: string, tone: 'ok' | 'busy' | 'off' } => {
  const entry = botFor(key)
  if (!entry) return { text: connected.value ? 'Recherche…' : 'Hors ligne', tone: 'off' }
  if (!entry.online) return { text: 'Hors ligne', tone: 'off' }
  if (entry.drafting) return { text: 'En plein draft', tone: 'busy' }
  if (entry.battles) return { text: `En ligne · ${entry.battles} combat${entry.battles > 1 ? 's' : ''}`, tone: 'ok' }
  return { text: 'En ligne', tone: 'ok' }
}

const explanation = computed(() => {
  const who = theme.value ? `Il joue au niveau ${TRAINING.levels[TRAINING.themeLevel - 1]!.label} et pioche d'abord dans l'archétype ${theme.value.label}.` : level.value?.description ?? ''
  if (mode.value === 'libre') return `Tu joues ton équipe de 6, avec tes sets de l'Atelier ; le bot compose la sienne dans le roster. ${who}`
  return `Bans cachés, picks en serpent puis préparation, comme en classé : le bot bannit et pique à son niveau. ${who}`
})

const blocked = computed(() => {
  if (!connected.value) return 'Connecte-toi au serveur de combat.'
  if (training.enabled === false) return 'Les bots d\'entraînement sont désactivés.'
  if (!bot.value) return 'Recherche des bots…'
  if (!bot.value.online) return `${bot.value.name} n'est pas connecté au serveur de combat.`
  if (pending.value) return `Défi envoyé à ${bot.value.name}…`
  if (mode.value === 'libre' && !complete.value) return 'Choisis 6 Pokémon pour ton équipe, plus bas.'
  if (mode.value === 'libre' && !playable.value) return 'Un Pokémon de ton équipe n\'a aucune attaque : corrige-le dans l\'Atelier.'
  if (mode.value === 'draft' && draft.draft) return 'Tu es déjà dans un draft.'
  if (mode.value === 'draft' && bot.value.drafting) return `${bot.value.name} est déjà en plein draft : réessaie dans un instant, ou choisis un autre bot.`
  return ''
})

let pendingTimer: ReturnType<typeof setTimeout> | undefined
const launch = () => {
  if (blocked.value || !bot.value) return
  pending.value = true
  if (mode.value === 'libre') challenge(bot.value.name, sets.value)
  else challengeDraft(bot.value.name)
  clearTimeout(pendingTimer)
  pendingTimer = setTimeout(() => {
    pending.value = false
    refresh()
  }, PENDING_FOR)
}

watch(() => showdown.latestBattle, (roomid) => {
  if (roomid && pending.value) navigateTo(`/pokedraft/combat/${roomid}`)
})

watch(() => draft.draft?.id, (id) => {
  if (id && pending.value) navigateTo(`/pokedraft/draft/${id}`)
})

watch(connected, (value) => {
  if (value) refresh()
}, { immediate: true })

let refreshTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  refreshTimer = setInterval(refresh, REFRESH_EVERY)
})
onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  clearTimeout(pendingTimer)
})
</script>

<style scoped>
.training { display: flex; flex-direction: column; gap: 12px; }
.training__head { display: flex; flex-direction: column; gap: 2px; }
.training__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.training__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.notice {
  padding: 10px 14px;
  border-radius: var(--r);
  background: #3a2216;
  box-shadow: inset 0 0 0 2px #e8704a, 0 0 0 2px var(--bd);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  color: #ffd9c8;
}

.bar {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.step { font: 600 17px 'Pixelify Sans', sans-serif; color: var(--tx); text-shadow: var(--sh); }
.step small { margin-left: 6px; font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); text-shadow: none; }
.modes { display: flex; gap: 6px; flex-wrap: wrap; }

.mode {
  border: 0;
  cursor: pointer;
  min-height: 40px;
  padding: 4px 14px;
  border-radius: 7px;
  background: var(--in);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--bd);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
}

.mode b { font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.mode span { color: var(--mu); }
.mode--on { background: var(--hd); color: var(--hdTx); }
.mode--on span { color: inherit; opacity: .85; }
.bar__spacer { flex: 1; }

.bar__chip {
  height: 32px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--in);
  display: flex;
  align-items: center;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.launch {
  border: 0;
  cursor: pointer;
  height: 44px;
  padding: 0 20px;
  border-radius: 9px;
  background: #48a860;
  color: #fff;
  font: 700 18px 'Pixelify Sans', sans-serif;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .3);
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, .5), 0 0 0 3px var(--bd);
}

.launch:disabled { cursor: not-allowed; filter: grayscale(.8) brightness(.8); }
.blocked { margin: -4px 0 0; align-self: flex-end; font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.block { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.levels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }

.level {
  border: 0;
  cursor: pointer;
  text-align: left;
  color: var(--tx);
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform .12s;
}

.level:hover { transform: translateY(-3px); }
.level__top { display: flex; align-items: center; justify-content: space-between; }
.level__number { font: 700 28px 'Pixelify Sans', sans-serif; }
.level__stars { display: flex; gap: 3px; }
.level__star { width: 9px; height: 9px; transform: rotate(45deg); }
.level__name { font: 600 17px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.level__description { flex: 1; font: 700 12px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.level__status, .opponent__status { font: 700 11px 'Atkinson Hyperlegible', sans-serif; }
.level__status--ok, .opponent__status--ok { color: #58d080; }
.level__status--busy, .opponent__status--busy { color: #ffd23a; }
.level__status--off, .opponent__status--off { color: var(--mu); }
.lower { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
.themes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }

.theme {
  position: relative;
  border: 0;
  cursor: pointer;
  height: 170px;
  border-radius: var(--r);
  overflow: hidden;
  box-shadow: 0 0 0 3px var(--bd);
  transition: transform .12s;
  text-align: left;
}

.theme:hover { transform: translateY(-3px); }
.theme--on { box-shadow: 0 0 0 4px var(--uA), 0 5px 0 4px rgba(0, 0, 0, .25); }
.theme__veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, .78)); }
.theme__mons { position: absolute; left: 6px; right: 6px; top: 8px; display: flex; justify-content: center; }
.theme__sprite { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; margin: 0 -6px; }
.theme__text { position: absolute; left: 12px; right: 12px; bottom: 10px; color: #fff; display: flex; flex-direction: column; gap: 2px; font: 700 11px/1.35 'Atkinson Hyperlegible', sans-serif; }
.theme__text b { font: 700 20px 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 #000; }

.opponent {
  margin-top: 29px;
  background: var(--dk);
  color: var(--dkTx);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.opponent__title { font: 700 12px 'Atkinson Hyperlegible', sans-serif; opacity: .75; }
.opponent__name { font: 600 22px 'Pixelify Sans', sans-serif; }
.opponent__text { margin: 4px 0 0; font: 700 13px/1.45 'Atkinson Hyperlegible', sans-serif; }
.opponent__link { font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: #ffd23a; }

.training__notices {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
  max-width: 420px;
}

.training__notice {
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--pn2);
  box-shadow: var(--pnS), 0 12px 30px rgba(0, 0, 0, .45);
  font: 700 14px/1.4 'Atkinson Hyperlegible', sans-serif;
  white-space: pre-line;
  animation: pop .2s both;
}

@media (max-width: 1100px) {
  .levels { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  .lower { grid-template-columns: minmax(0, 1fr); }
  .themes { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
  .opponent { margin-top: 0; }
}
</style>

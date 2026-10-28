<template>
  <div class="create">
    <div class="create__head">
      <div class="create__heading">
        <h1 class="create__title">Créer un tournoi</h1>
        <span class="create__subtitle">Ouvert à toute la communauté : il apparaît dans le calendrier dès sa publication</span>
      </div>
      <NuxtLink to="/classique/tournois" class="btn btn--small">◂ Retour au calendrier</NuxtLink>
    </div>

    <LobbyConnection v-if="!connected" />
    <div v-else class="create__body">
      <form class="form" aria-label="Nouveau tournoi" @submit.prevent="publish">
        <header class="form__head">Nouveau tournoi</header>
        <div class="form__body">
          <label class="field-group">
            <span class="field-group__label">Nom</span>
            <input v-model="name" class="field" maxlength="40" :placeholder="`Coupe de ${store.name || 'la communauté'}`">
          </label>

          <div class="field-group">
            <span class="field-group__label">Format</span>
            <ClassiqueFormatPicker v-model="format" usage="tournament" />
          </div>

          <div class="field-group">
            <span class="field-group__label">Type</span>
            <div class="segments" role="radiogroup" aria-label="Type de tournoi">
              <button v-for="option in TYPES" :key="option" type="button" role="radio" class="segment" :class="{ 'segment--on': type === option }" :aria-checked="type === option" @click="type = option">{{ tourTypeLabel(option) }}</button>
            </div>
          </div>

          <div class="field-group">
            <span class="field-group__label">Places</span>
            <div class="segments" role="radiogroup" aria-label="Nombre de places">
              <button v-for="option in caps" :key="option" type="button" role="radio" class="segment" :class="{ 'segment--on': cap === option }" :aria-checked="cap === option" @click="cap = option">{{ option }}</button>
            </div>
          </div>

          <div class="form__row">
            <label class="field-group">
              <span class="field-group__label">Date</span>
              <input v-model="day" type="date" class="field" :min="today">
            </label>
            <label class="field-group">
              <span class="field-group__label">Heure</span>
              <input v-model="hour" type="time" class="field" step="300">
            </label>
          </div>

          <div class="field-group">
            <span class="field-group__label">Règles · par défaut celles du format</span>
            <div v-for="clause in clauses" :key="clause" class="rule">
              <span class="rule__name">{{ clauseLabel(clause) }}</span>
              <div class="segments segments--small" role="radiogroup" :aria-label="clauseLabel(clause)">
                <button v-for="option in RULE_CHOICES" :key="option.value" type="button" role="radio" class="segment" :class="{ 'segment--on': (rules[clause] ?? 'format') === option.value }" :aria-checked="(rules[clause] ?? 'format') === option.value" @click="rules[clause] = option.value">{{ option.label }}</button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div class="preview">
        <span class="preview__label">Aperçu de l'annonce</span>
        <ClassiqueTournoisTourCard :event="preview" :live="null" :me="store.name" :connected="false" :registration="registration" :now="Date.now()" />
        <button type="button" class="btn btn--danger preview__publish" :disabled="publishing || !format || !startsAt" @click="publish">{{ publishing ? 'Publication…' : 'Publier le tournoi' }}</button>
        <p v-if="error" class="preview__error" role="alert">{{ error }}</p>
        <p class="preview__note">Les inscriptions ouvrent un quart d'heure avant le départ et le tournoi démarre seul à l'heure prévue. Trois tournois à venir au plus par joueur.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArenaEvent, TourType } from '~/utils/tournaments'

type RuleChoice = 'format' | 'on' | 'off'

useHead({ title: 'Créer un tournoi · Classique' })

const TYPES: TourType[] = ['elimination', 'double', 'roundrobin']
const RULE_CHOICES: { value: RuleChoice, label: string }[] = [{ value: 'format', label: 'Format' }, { value: 'on', label: 'Oui' }, { value: 'off', label: 'Non' }]
const DEFAULT_CLAUSES = ['Sleep Clause Mod', 'Species Clause', 'Evasion Moves Clause', 'OHKO Clause', 'Team Preview', 'Item Clause']
const HOUR = 3600 * 1000

const { store } = useShowdown()
const { calendar, connected, propose } = useArenaTournaments()

const pad = (value: number) => String(value).padStart(2, '0')
const localDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const firstStart = new Date(Math.ceil((Date.now() + HOUR) / HOUR) * HOUR)

const name = ref('')
const format = ref('gen9ou')
const type = ref<TourType>('elimination')
const cap = ref(16)
const day = ref(localDay(firstStart))
const hour = ref(`${pad(firstStart.getHours())}:00`)
const rules = reactive<Record<string, RuleChoice>>({})
const publishing = ref(false)
const error = ref('')

const today = localDay(new Date())
const caps = computed(() => calendar.value?.caps ?? [4, 8, 16, 32, 64])
const clauses = computed(() => calendar.value?.clauses ?? DEFAULT_CLAUSES)
const registration = computed(() => calendar.value?.registration ?? 15 * 60 * 1000)
const startsAt = computed(() => {
  const time = new Date(`${day.value}T${hour.value}`).getTime()
  return Number.isFinite(time) ? time : 0
})
const formatName = computed(() => store.formats.flatMap(section => section.formats).find(entry => entry.id === format.value)?.name ?? formatIdLabel(format.value))
const chosenRules = computed(() => Object.fromEntries(Object.entries(rules).filter(([, choice]) => choice !== 'format').map(([clause, choice]) => [clause, choice === 'on'])))

const preview = computed<ArenaEvent>(() => ({
  id: 'apercu', name: name.value.trim() || `Coupe de ${store.name || 'la communauté'}`, format: format.value, formatName: formatName.value,
  type: type.value, cap: cap.value, startsAt: startsAt.value, author: store.name || 'toi', regular: false, roomid: null,
  status: 'planned', players: [], count: 0, joined: false, bracket: null, winner: null,
  rules: Object.entries(chosenRules.value).map(([clause, on]) => on ? clause : `!${clause}`),
}))

const publish = async () => {
  error.value = ''
  publishing.value = true
  const reply = await propose({ name: preview.value.name, format: format.value, type: type.value, cap: cap.value, startsAt: startsAt.value, rules: chosenRules.value })
  publishing.value = false
  if (reply.type === 'erreur') {
    error.value = reply.message
    return
  }
  await navigateTo({ path: '/classique/tournois', query: { id: reply.event.id } })
}
</script>

<style scoped>
.create { display: flex; flex-direction: column; gap: 12px; }
.create__head { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.create__head a { text-decoration: none; }
.create__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.create__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.create__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.create__body { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 12px; align-items: start; }
.form { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.form__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
}

.form__body { padding: 12px; display: flex; flex-direction: column; gap: 14px; }
.form__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field-group__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); text-transform: uppercase; letter-spacing: .04em; }
.segments { display: flex; flex-wrap: wrap; gap: 5px; }

.segment {
  border: 0;
  cursor: pointer;
  height: 32px;
  padding: 0 12px;
  border-radius: 7px;
  background: var(--chip);
  color: var(--tx);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.segment--on { background: var(--hd); color: var(--hdTx); }
.segments--small .segment { height: 26px; padding: 0 9px; font-size: 12px; }
.rule { display: flex; align-items: center; gap: 10px; padding: 5px 8px; border-radius: 7px; background: var(--in); flex-wrap: wrap; }
.rule__name { flex: 1; min-width: 140px; font: 700 13px 'Atkinson Hyperlegible', sans-serif; }
.preview { display: flex; flex-direction: column; gap: 10px; }
.preview__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.preview__publish { width: 100%; height: 44px; font-size: 15px; }
.preview__error { margin: 0; font: 700 13px/1.4 'Atkinson Hyperlegible', sans-serif; color: #ffb070; }
.preview__note { margin: 0; font: 700 12px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 1000px) {
  .create__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

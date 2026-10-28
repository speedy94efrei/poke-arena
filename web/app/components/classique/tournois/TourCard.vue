<template>
  <section class="card" :aria-label="event.name">
    <header class="card__hero" :class="event.regular ? 'card__hero--regular' : 'card__hero--community'">
      <span class="card__badge">{{ event.regular ? '◆ Régulier' : '★ Communauté' }}</span>
      <span class="card__sprite" :style="{ backgroundImage: `url(${sprite(heroSprite, 'face')})` }" />
      <h2 class="card__name">{{ event.name }}</h2>
      <span class="card__status" :class="`card__status--${event.status}`">{{ tourStatusLabel(event.status) }}</span>
    </header>
    <dl class="facts">
      <dt>Quand</dt><dd>{{ tourDate(event.startsAt) }}</dd>
      <dt>Format</dt><dd>{{ formatLabel(event.formatName) }} · {{ tourTypeLabel(event.type) }}</dd>
      <dt>Règles</dt><dd>{{ event.rules.length ? event.rules.map(ruleLabel).join(', ') : 'celles du format' }}</dd>
      <dt>Organisé par</dt><dd>{{ event.author ?? 'l\'Arène' }}</dd>
    </dl>
    <div class="places">
      <span class="places__label">{{ event.status === 'ended' ? 'Joueurs' : 'Inscrits' }} <b>{{ count }} / {{ event.cap }}</b></span>
      <span class="places__track"><span class="places__fill" :style="{ width: `${Math.min(100, count / event.cap * 100)}%` }" /></span>
    </div>

    <div class="card__actions">
      <template v-if="event.status === 'planned'">
        <button type="button" class="btn btn--small" disabled>Inscriptions à {{ opensAt }}</button>
        <span class="card__hint">Elles ouvrent un quart d'heure avant le départ.</span>
      </template>
      <template v-else-if="event.status === 'open'">
        <button v-if="!joined" type="button" class="btn btn--danger" :disabled="!connected" @click="emit('register', true)">S'inscrire</button>
        <button v-else type="button" class="btn" @click="emit('register', false)">Se désinscrire</button>
        <span class="card__hint">{{ joined ? `Tu es inscrit : le tournoi démarre ${startsIn}.` : `Départ ${startsIn}.` }}</span>
      </template>
      <template v-else-if="event.status === 'started'">
        <template v-if="live?.challenged">
          <span class="card__hint card__hint--strong">Ton prochain match : {{ opponent(live.challenged) }}.</span>
          <ClassiqueTeamSelect v-model="teamId" :format="event.format" :generated="generated" />
          <button type="button" class="btn btn--primary" :disabled="!generated && !team" @click="emit('ready', generated ? '' : packed)">Je suis prêt</button>
        </template>
        <template v-else-if="live?.challenging">
          <span class="card__hint card__hint--strong">Prêt : en attente de {{ opponent(live.challenging) }}…</span>
          <button type="button" class="btn btn--small" @click="emit('cancelReady')">Annuler</button>
        </template>
        <span v-else class="card__hint">{{ joined ? 'Ton match se lance dès que ton adversaire est libre.' : 'Le tournoi est en cours : suis le tableau ou regarde les matchs.' }}</span>
      </template>
      <span v-else-if="event.winner" class="card__hint card__hint--strong">🏆 {{ event.winner }} remporte le tournoi.</span>
      <span v-else class="card__hint">Tournoi passé.</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TournamentState } from '~/utils/chatRooms'
import type { ArenaEvent } from '~/utils/tournaments'

const props = defineProps<{ event: ArenaEvent, live: TournamentState | null, me: string, connected: boolean, registration: number, now: number }>()
const emit = defineEmits<{ register: [joining: boolean], ready: [team: string], cancelReady: [] }>()
const { store } = useShowdown()
const { teams, packed: packTeam } = useClassicTeams()
const { sprite } = usePokedex()

const HEROES: Record<string, string> = { gen9ou: 'kingambit', gen9randombattle: 'zoroark', gen9doublesou: 'incineroar', gen9monotype: 'garganacl', gen9nationaldex: 'zygarde' }

const teamId = ref('')
const heroSprite = computed(() => HEROES[props.event.format] ?? 'greattusk')
const players = computed(() => props.live?.players.length ? props.live.players : props.event.players)
const count = computed(() => Math.max(players.value.length, props.event.count ?? 0))
const joined = computed(() => props.live ? props.live.joined || players.value.some(player => toId(player) === toId(props.me)) : props.event.joined)
const generated = computed(() => Boolean(store.formats.flatMap(section => section.formats).find(format => format.id === props.event.format)?.generatedTeam))
const team = computed(() => teams.value.find(entry => entry.id === teamId.value))
const packed = computed(() => team.value ? packTeam(team.value) : '')

const clock = (time: number) => {
  const date = new Date(time)
  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`
}

const opensAt = computed(() => clock(props.event.startsAt - props.registration))

const startsIn = computed(() => {
  const minutes = Math.max(0, Math.ceil((props.event.startsAt - props.now) / 60000))
  return minutes <= 1 ? "dans moins d'une minute" : `dans ${minutes} min`
})

const opponent = (name: string) => name === '(next available player)' ? 'le prochain joueur libre' : name
</script>

<style scoped>
.card { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; display: flex; flex-direction: column; }

.card__hero {
  position: relative;
  min-height: 130px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  color: #fff;
}

.card__hero--regular { background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .05) 0 12px, transparent 12px 24px), linear-gradient(160deg, #3d6fc8, #10203a); }
.card__hero--community { background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .05) 0 12px, transparent 12px 24px), linear-gradient(160deg, #8a4ac8, #24103a); }
.card__badge { position: absolute; top: 10px; left: 12px; padding: 2px 7px; border-radius: 4px; background: rgba(0, 0, 0, .4); font: 700 11px 'Nunito', sans-serif; }
.card__sprite { position: absolute; right: 8px; bottom: 4px; width: 110px; height: 110px; background: center bottom / contain no-repeat; image-rendering: pixelated; }
.card__name { position: relative; margin: 0; font: 700 22px 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); max-width: 70%; }
.card__status { position: relative; align-self: flex-start; padding: 2px 7px; border-radius: 4px; background: rgba(0, 0, 0, .4); font: 700 11px 'Nunito', sans-serif; }
.card__status--open { background: #2f9a58; }
.card__status--started { background: #c8362a; }
.facts { margin: 0; padding: 10px 12px 0; display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 6px 10px; font: 700 12px/1.4 'Nunito', sans-serif; }
.facts dt { color: var(--mu); }
.facts dd { margin: 0; }
.places { padding: 10px 12px 0; display: flex; flex-direction: column; gap: 4px; }
.places__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.places__label b { color: var(--tx); }
.places__track { height: 8px; border-radius: 4px; background: var(--in); overflow: hidden; }
.places__fill { display: block; height: 100%; background: #58d080; }
.card__actions { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.card__actions .btn { width: 100%; }
.card__hint { font: 700 12px/1.4 'Nunito', sans-serif; color: var(--mu); }
.card__hint--strong { color: var(--tx); font-size: 13px; }
</style>

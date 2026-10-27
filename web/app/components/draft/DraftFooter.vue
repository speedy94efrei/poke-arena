<template>
  <div class="foot">
    <div aria-label="Aide au pick" class="help">
      <span class="help__title">Aide</span>
      <span v-for="archetype in archetypes" :key="archetype.nom" class="help__chip" :class="{ 'help__chip--solid': archetype.solid }">
        {{ archetype.icon }} {{ archetype.nom }} <b>×{{ archetype.count }}</b>
      </span>
      <span v-for="alert in alerts" :key="alert.text" class="help__alert" :class="`help__alert--${alert.tone}`" :title="alert.text">
        <b>{{ alert.icon }}</b>{{ alert.text }}
      </span>
      <span v-if="!archetypes.length && !alerts.length" class="help__empty">Survole un Pokémon pour sa mini-fiche. Les alertes apparaissent dès les premiers picks.</span>
    </div>
    <div class="action">
      <button type="button" class="action__button" :class="{ 'action__button--ban': draft.phase === 'ban' }" :disabled="!enabled" @click="emit('lock')">{{ label }}</button>
      <span v-if="event" :key="event.id" role="status" class="action__event" :class="`action__event--${event.tone}`">{{ event.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DraftView } from '~/utils/draft'

const props = defineProps<{ draft: DraftView, event: { id: number, text: string, tone: string } | null }>()
const emit = defineEmits<{ lock: [] }>()

const mine = computed(() => props.draft.picks.filter(pick => pick.mine).map(pick => findPokemon(pick.id)!).filter(Boolean))
const theirs = computed(() => props.draft.picks.filter(pick => !pick.mine).map(pick => findPokemon(pick.id)!).filter(Boolean))
const unavailable = computed(() => new Set([
  ...(props.draft.phase === 'ban' ? [] : [...props.draft.bans.mine, ...props.draft.bans.theirs]),
  ...props.draft.picks.filter(pick => !pick.mine).map(pick => pick.id),
]))

const archetypes = computed(() => draftArchetypes(mine.value))
const alerts = computed(() => draftAlerts(mine.value, theirs.value, unavailable.value, props.draft.phase))

const label = computed(() => {
  const draft = props.draft
  if (draft.phase === 'ban') return draft.locked.mine ? 'Bans verrouillés' : `Valider mes bans (${draft.bans.mine.length}/${DRAFT.bans})`
  if (draft.phase === 'reveal') return 'Révélation…'
  if (draft.phase === 'pick') {
    if (!draft.turn?.mine) return 'Tour adverse…'
    return draft.preselection ? `Verrouiller ${speciesName(draft.preselection)}` : 'Choisis un Pokémon'
  }
  if (draft.phase === 'prep') return draft.ready.mine ? 'En attente de l\'adversaire…' : 'Je suis prêt'
  return 'Lancement du combat…'
})

const enabled = computed(() => {
  const draft = props.draft
  if (draft.phase === 'ban') return !draft.locked.mine
  if (draft.phase === 'pick') return Boolean(draft.turn?.mine && draft.preselection)
  if (draft.phase === 'prep') return !draft.ready.mine
  return false
})
</script>

<style scoped>
.foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.help {
  min-width: 0;
  min-height: 46px;
  box-sizing: border-box;
  display: flex;
  gap: 6px;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--chip) transparent;
  padding: 8px 10px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
}

.help__title { flex: none; font: 600 14px 'Pixelify Sans', sans-serif; color: var(--uA); }

.help__chip, .help__alert {
  flex: none;
  height: 26px;
  padding: 0 8px;
  border-radius: 5px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.help__chip { background: var(--chip); }
.help__chip--solid { background: #2f6a48; }
.help__chip b { font: 600 13px 'Pixelify Sans', sans-serif; }
.help__alert { max-width: 360px; overflow: hidden; text-overflow: ellipsis; }
.help__alert b { font: 600 13px 'Pixelify Sans', sans-serif; }
.help__alert--danger { background: rgba(232, 96, 74, .14); }
.help__alert--danger b { color: #ff9a8a; }
.help__alert--menace { background: rgba(255, 176, 32, .12); }
.help__alert--menace b { color: #ffb020; }
.help__alert--info { background: var(--in); }
.help__alert--info b { color: var(--uA); }
.help__empty { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.action__button {
  border: 0;
  cursor: pointer;
  min-width: 240px;
  height: 52px;
  padding: 0 24px;
  border-radius: 12px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 20px 'Pixelify Sans', sans-serif;
  box-shadow: inset 0 -5px 0 rgba(0, 0, 0, .22), 0 0 0 2px var(--bd);
  white-space: nowrap;
}

.action__button--ban { background: #e8604a; color: #1a0500; }
.action__button:disabled { opacity: .5; cursor: default; }

.action__event {
  max-width: 420px;
  padding: 3px 10px;
  border-radius: 6px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  text-align: center;
  animation: pop .25s both;
}

.action__event--alerte { background: #e8604a; color: #1a0500; }
.action__event--adverse { background: #e8704a; color: #1a0500; }

@media (max-width: 1100px) {
  .foot { grid-template-columns: minmax(0, 1fr); }
}
</style>

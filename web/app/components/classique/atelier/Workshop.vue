<template>
  <div class="workshop">
    <div class="workshop__head">
      <div class="workshop__heading">
        <h1 class="workshop__title">{{ budget ? 'Constructeur à 100 points' : "Atelier d'équipe" }}</h1>
        <span class="workshop__subtitle">{{ budget ? 'Chaque Pokémon coûte selon son tier Smogon : le compteur passe au rouge au-dessus du budget' : "Construis, ajuste avec l'assistant, exporte vers Showdown" }}</span>
      </div>
      <template v-if="team">
        <input :key="team.id" class="field workshop__name" maxlength="40" :value="team.name" aria-label="Nom de l'équipe" @change="event => rename((event.target as HTMLInputElement).value)">
        <ClassiqueFormatPicker v-if="!budget" class="workshop__format" :model-value="team.format" usage="team" compact @update:model-value="setFormat" />
        <button type="button" class="btn btn--small" @click="duplicate">⧉ Dupliquer</button>
        <button type="button" class="btn btn--small" :class="{ 'btn--danger': confirming }" @click="removeCurrent">{{ confirming ? 'Confirmer ?' : '🗑 Supprimer' }}</button>
        <span class="verdict" :class="`verdict--${verdict}`" role="status">{{ VERDICTS[verdict] }}</span>
      </template>
    </div>

    <ClassiqueAtelierTeamTabs v-if="teams.length" :teams="teams" :current-id="team?.id ?? ''" :creating="creating" @select="selectTeam" @create="creating = !creating" />
    <ClassiqueAtelierTeamCreate v-if="creating || !teams.length" :closable="teams.length > 0" :error="createError" :count="teams.length" :fixed-format="budget ? BUDGET_FORMAT : undefined" @create="createTeam" @close="creating = false" />

    <template v-if="team">
      <ClassiqueAtelierTeamSlots :sets="team.sets" :current="index" :size="size" @select="selectSlot" @remove="removeSlot" />
      <BudgetMeter v-if="budget" :species="team.sets.map(entry => entry.species)" :current="index" @select="selectSlot" />

      <div class="workshop__body">
        <div class="workshop__main">
          <ClassiqueAtelierSetEditor
            :set="set"
            :index="index"
            :size="size"
            :format="team.format"
            :format-name="formatName"
            :usage="usage"
            :pool="pool"
            :budget-left="budgetLeft"
            @update="updateSet"
            @species="setSpecies"
            @reset="set && setSpecies(set.species)"
          />
          <ClassiqueAtelierTeamWeaknesses :sets="team.sets" />
        </div>
        <div class="workshop__side">
          <ClassiqueAtelierTeamAssistant v-if="!budget" :key="team.format" :usage="usage" :format-name="formatName" :has-pokemon="team.sets.length > 0" @apply="applyTeam" />
          <LobbyConnection v-if="store.status !== 'connecte'" />
          <ClassiqueAtelierTeamPanels :team="team" :format-name="formatName" :checks="checks" :server="server" />
        </div>
      </div>
    </template>

    <div v-if="toast" role="status" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import type { ClassicSet } from '~/utils/classicTeam'
import type { TeamStart } from '~/utils/teamBuilder'

/** `budget` : le constructeur du Combat à budget, avec seulement ses équipes et le compteur de points. */
const props = defineProps<{ budget?: boolean }>()

const VERDICTS = { ok: '✓ Équipe valide', warn: '! À compléter', error: '✕ À corriger', checking: '… Vérification', unknown: 'Non vérifiée' }

const { dex } = usePokedex()
const { store } = useShowdown()
const {
  teams, team, formatName, levelOf, index, set, pool, usage, size,
  select, selectSlot, setSpecies, updateSet, removeSlot, applyTeam, setFormat, rename, create, duplicate, removeTeam,
} = useTeamWorkshop(props.budget ? BUDGET_FORMAT : '')
const { checks, server, verdict } = useTeamValidation(team, formatName)
const { costOf, budget: points } = useBudget()

/** Points encore libres pour l'emplacement ouvert : le budget moins le coût des autres Pokémon. */
const budgetLeft = computed(() => {
  if (!props.budget || !team.value) return null
  const others = team.value.sets.filter((_, slot) => slot !== index.value)
  return points.value - others.reduce((total, entry) => total + (costOf(entry.species) ?? 0), 0)
})

const creating = ref(false)
const createError = ref('')
const confirming = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const say = (text: string) => {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 4000)
}

watch(() => team.value?.id, () => {
  confirming.value = false
})

const selectTeam = (id: string) => {
  creating.value = false
  select(id)
}

/** Nouvelle équipe : vide, importée du texte de Showdown, ou proposée par l'assistant d'après les statistiques du format. */
const createTeam = async (name: string, format: string, start: TeamStart, text: string) => {
  createError.value = ''
  let sets: ClassicSet[] = []
  if (start === 'import') {
    sets = importTeam(text)
    if (!sets.length) {
      createError.value = "Aucun Pokémon reconnu : vérifie que c'est bien l'export texte de Showdown."
      return
    }
  }
  if (start === 'assistant') {
    const stats = await loadUsage(format)
    const reply = assistantReply(text, stats, dex.value, formatIdLabel(format))
    if (!reply.team) {
      createError.value = reply.text
      return
    }
    sets = reply.team.map(id => setFromUsage(id, usageOf(stats, id), dex.value, levelOf(format)))
    say(reply.text)
  }
  create(name, format, sets)
  creating.value = false
}

const removeCurrent = () => {
  if (!confirming.value) {
    confirming.value = true
    return
  }
  const name = team.value?.name
  removeTeam()
  confirming.value = false
  say(`Équipe « ${name} » supprimée.`)
}

onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<style scoped>
.workshop { display: flex; flex-direction: column; gap: 12px; }
.workshop__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.workshop__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.workshop__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.workshop__subtitle { font: 700 14px 'Nunito', sans-serif; color: var(--mu); }
.workshop__name { width: 220px; height: 34px; }

.workshop__format { width: 220px; }
.workshop__format :deep(.picker__select) { min-width: 0; height: 34px; font-size: 13px; }

.verdict {
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--chip);
  font: 700 13px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.verdict--ok { background: #2f9a58; color: #fff; }
.verdict--warn { background: #e8a33a; color: #1a1000; }
.verdict--error { background: #c8362a; color: #fff; }
.workshop__body { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 12px; align-items: start; }
.workshop__main, .workshop__side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 50;
  max-width: min(560px, calc(100vw - 32px));
  padding: 12px 18px;
  border-radius: 10px;
  background: var(--dk);
  --tx: var(--dkTx);
  --mu: var(--dkMu);
  --chip: var(--dkChip);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--uA), 0 10px 30px rgba(0, 0, 0, .5);
  font: 700 14px/1.4 'Nunito', sans-serif;
  animation: pop .2s both;
}

@media (max-width: 1180px) {
  .workshop__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

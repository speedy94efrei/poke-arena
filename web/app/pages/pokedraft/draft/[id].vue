<template>
  <div v-if="draft" class="draft">
    <DraftTopBar :draft="draft" :seconds="seconds" @quit="confirmQuit = true" />
    <DraftBanner :draft="draft" :seconds="seconds" />

    <div class="draft__main">
      <DraftTeam :draft="draft" mine :labels="labels" />
      <section aria-label="Sélection" class="draft__center">
        <DraftGrid v-if="['ban', 'reveal', 'pick'].includes(draft.phase)" :draft="draft" @bans="setBans" @preselect="preselect" @pick="pick" />
        <div v-else-if="draft.phase === 'prep'" class="prep">
          <div class="prep__head">
            <span class="prep__title">Prépare ton équipe</span>
            <span class="prep__hint">Choisis un de tes sets, ou modifie-le pour ce match.</span>
            <span class="prep__spacer" />
            <span class="prep__count"><b>{{ modifiedCount }}</b>/{{ DRAFT.team }} modifiés</span>
          </div>
          <div class="prep__grid">
            <DraftPrepCard
              v-for="pokemon in myTeam"
              :key="pokemon.id"
              :pokemon="pokemon"
              :choice="choices[pokemon.id]"
              @choose="source => choose(pokemon.id, source)"
              @edit="editing = pokemon.id"
              @undo="undo(pokemon.id)"
            />
          </div>
          <span class="prep__note">Chrono écoulé : les sets affichés sont envoyés. Les sets adverses restent cachés jusqu'au combat.</span>
        </div>
        <div v-else class="launch">
          <span class="launch__title">Lancement du combat…</span>
          <span class="launch__text">Les deux équipes sont prêtes.</span>
        </div>
      </section>
      <DraftTeam :draft="draft" :mine="false" />
    </div>

    <DraftFooter :draft="draft" :event="store.event" @lock="lock" />
    <DraftMini />
    <CodexMoveTip />

    <DraftEditor
      v-if="editingPokemon"
      :key="editingPokemon.id"
      :pokemon="editingPokemon"
      :variant="resolvePrep(editingPokemon, choices[editingPokemon.id], variants(editingPokemon.id)).variant"
      :initial-save="choices[editingPokemon.id]?.save ?? variants(editingPokemon.id).length < MAX_VARIANTES"
      :seconds="seconds"
      @close="editing = null"
      @reset="undo(editingPokemon.id)"
      @validate="(variant, save) => validate(editingPokemon!.id, variant, save)"
    />

    <div v-if="confirmQuit" role="dialog" aria-modal="true" aria-label="Quitter le draft" class="quit">
      <div class="quit__box">
        <span class="quit__title">Quitter le draft ?</span>
        <span class="quit__text">Le draft sera annulé pour vous deux. Quand le classement existera, quitter fera perdre des points.</span>
        <div class="quit__actions">
          <button type="button" class="btn btn--primary" @click="confirmQuit = false">Continuer le draft</button>
          <button type="button" class="btn btn--danger" @click="leave">Quitter quand même</button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="none">
    <span class="none__title">Aucun draft en cours</span>
    <span class="none__text">{{ store.cancelled || 'Ce draft est terminé, ou la connexion a été perdue (page rechargée ?).' }}</span>
    <NuxtLink to="/pokedraft/draft" class="btn btn--primary">Retour au salon</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { Variante } from '~/utils/atelier'
import type { PrepChoice } from '~/utils/draft'

definePageMeta({ layout: 'draft' })

const route = useRoute()
const { store, setBans, lockBans, preselect, pick, submitTeam, quit, clearBattle } = useDraft()
const { variants, duplicate } = useAtelier()

useHead({ title: 'Draft · PokéDraft' })

const draft = computed(() => store.draft && store.draft.id === route.params.id ? store.draft : null)
const now = ref(Date.now())
const seconds = computed(() => Math.max(0, (store.deadline - now.value) / 1000))
const confirmQuit = ref(false)
const editing = ref<string | null>(null)
const choices = ref<Record<string, PrepChoice>>({})
const sent = ref(false)

const myTeam = computed(() => (draft.value?.picks ?? []).filter(pick => pick.mine).map(pick => findPokemon(pick.id)!).filter(Boolean))
const editingPokemon = computed(() => editing.value ? findPokemon(editing.value) : undefined)
const resolved = computed(() => myTeam.value.map(pokemon => ({ pokemon, ...resolvePrep(pokemon, choices.value[pokemon.id], variants(pokemon.id)) })))
const modifiedCount = computed(() => resolved.value.filter(entry => entry.modified).length)
const labels = computed(() => draft.value && ['prep', 'done'].includes(draft.value.phase)
  ? Object.fromEntries(resolved.value.map(entry => [entry.pokemon.id, entry.label]))
  : {})

const choose = (id: string, source: 'def' | number) => {
  choices.value = { ...choices.value, [id]: { source, edited: null, save: false } }
}

const undo = (id: string) => {
  const current = choices.value[id]
  choices.value = { ...choices.value, [id]: { source: current?.source ?? 'auto', edited: null, save: false } }
  editing.value = null
}

const validate = (id: string, variant: Variante, save: boolean) => {
  const current = choices.value[id]
  choices.value = { ...choices.value, [id]: { source: current?.source ?? 'auto', edited: variant, save } }
  editing.value = null
}

const sendTeam = () => {
  if (sent.value) return
  sent.value = true
  for (const entry of resolved.value) {
    if (entry.modified && choices.value[entry.pokemon.id]?.save) duplicate(entry.pokemon, entry.variant)
  }
  submitTeam(resolved.value.map(entry => variantToSet(entry.pokemon, entry.variant)))
}

const lock = () => {
  const current = draft.value
  if (!current) return
  if (current.phase === 'ban') lockBans()
  else if (current.phase === 'pick' && current.preselection) pick(current.preselection)
  else if (current.phase === 'prep') sendTeam()
}

const leave = () => {
  quit()
  confirmQuit.value = false
  navigateTo('/pokedraft/draft')
}

watch(() => draft.value?.phase, (phase) => {
  if (phase !== 'prep') sent.value = false
})

watch(seconds, (value) => {
  if (draft.value?.phase === 'prep' && !draft.value.ready.mine && value <= 2) sendTeam()
})

watch(() => store.battle, (roomid) => {
  if (!roomid) return
  clearBattle()
  navigateTo(`/pokedraft/combat/${roomid}`)
}, { immediate: true })

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 250)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.draft {
  height: calc(100vh - 24px);
  min-height: 640px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.draft__main {
  flex: 1 1 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 260px;
  gap: 12px;
}

.draft__center {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
}

.prep {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prep__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.prep__title { font: 600 18px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.prep__hint { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.prep__spacer { flex: 1; }

.prep__count {
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  background: var(--in);
  font: 700 12px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.prep__count b { font: 600 14px 'Pixelify Sans', sans-serif; color: var(--uT); }

.prep__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.prep__note { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }

.launch, .none {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.launch__title, .none__title { font: 700 26px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.launch__title { animation: pulse 1.2s ease-in-out infinite; }
.launch__text, .none__text { font: 700 14px 'Nunito', sans-serif; color: var(--mu); }
.none { min-height: 60vh; }

.quit {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(6, 8, 12, .75);
  display: grid;
  place-items: center;
  padding: 16px;
}

.quit__box {
  max-width: 420px;
  width: 100%;
  border-radius: 16px;
  background: var(--pn);
  box-shadow: inset 0 0 0 3px #e8604a, 0 0 0 2px var(--bd);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: pop .2s both;
}

.quit__title { font: 700 24px 'Pixelify Sans', sans-serif; }
.quit__text { font: 700 15px/1.45 'Nunito', sans-serif; color: #ffb0a0; }
.quit__actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }

@media (max-width: 1100px) {
  .draft { height: auto; min-height: 0; }
  .draft__main { flex: none; grid-template-columns: minmax(0, 1fr); }
  .draft__center { order: -1; min-height: 520px; }
}
</style>

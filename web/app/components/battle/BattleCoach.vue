<template>
  <section class="coach" aria-label="Coach">
    <header class="coach__head">
      <span class="coach__badge">COACH</span>
      <span class="coach__title">Mode entraînement</span>
      <span class="coach__turn">{{ advice?.turn ? `Tour ${advice.turn}` : '' }}</span>
      <button type="button" class="coach__fold" :aria-expanded="open" @click="open = !open">{{ open ? 'Replier' : 'Déplier' }}</button>
    </header>
    <div v-if="open" class="coach__body">
      <p v-if="!advice && !loading" class="coach__note">Le coach analyse chaque décision : essaie d'abord seul, puis compare.</p>
      <p v-else-if="loading" class="coach__note">Le coach rejoue tes options dans le simulateur…</p>
      <p v-else-if="advice?.error" class="coach__note">{{ advice.error }}</p>
      <template v-else-if="advice">
        <button v-if="!shown" type="button" class="btn btn--small coach__reveal" @click="revealed = true">Voir le conseil</button>
        <template v-else>
          <p class="coach__pick">Le coach jouerait : <b>{{ coachLabel }}</b></p>
          <div v-if="ranked.length" class="coach__options">
            <div v-for="option in ranked" :key="option.key" class="option" :class="{ 'option--mine': option.mine, 'option--best': option.best }">
              <span class="option__label">{{ option.label }}</span>
              <span class="option__track"><span class="option__fill" :style="{ width: `${option.width}%` }" /></span>
            </div>
          </div>
          <p v-if="verdict" class="coach__verdict" :class="`coach__verdict--${verdict.tone}`">{{ verdict.text }}</p>
          <span v-if="advice.simulations" class="coach__meta">{{ advice.simulations }} tours simulés</span>
        </template>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BattleState, ShowdownRequest } from '~/utils/battleTracker'
import type { CoachAdvice, CoachOption } from '~/composables/useTraining'

const props = defineProps<{ battle: BattleState }>()
const { advice: askAdvice } = useTraining()

const advice = ref<CoachAdvice | null>(null)
const adviceRequest = ref<ShowdownRequest | null>(null)
const loading = ref(false)
const revealed = ref(false)
const open = ref(true)
const shown = computed(() => revealed.value || props.battle.choiceSent)

/** Nom d'un choix de la requête : « move 2 terastallize » donne l'attaque, « switch 3 » le Pokémon. */
const choiceName = (choice: string, request: ShowdownRequest | null) => {
  const [kind, number, extra] = choice.split(' ')
  if (kind === 'switch') return `Changer pour ${speciesName(toId(request?.side.pokemon[Number(number) - 1]?.details.split(',')[0] ?? ''))}`
  const move = request?.active?.[0]?.moves[Number(number) - 1]
  return `${move ? moveName(move.move) : 'Attaque'}${extra === 'terastallize' ? ' + Téracristal' : ''}`
}

const optionName = (option: CoachOption) => option.kind === 'switch'
  ? `Changer pour ${speciesName(option.id)}`
  : `${moveName(option.id)}${option.tera ? ' + Téracristal' : ''}`

/** L'option du moteur qui correspond à un choix de la requête. */
const optionOf = (choice: string, request: ShowdownRequest | null) => {
  const [kind, number, extra] = choice.split(' ')
  if (kind === 'switch') {
    const species = toId(request?.side.pokemon[Number(number) - 1]?.details.split(',')[0] ?? '')
    return advice.value?.options?.find(option => option.kind === 'switch' && option.id === species)
  }
  const id = request?.active?.[0]?.moves[Number(number) - 1]?.id
  return advice.value?.options?.find(option => option.kind === 'move' && option.id === id && option.tera === (extra === 'terastallize'))
}

const coachLabel = computed(() => advice.value?.choice ? choiceName(advice.value.choice, adviceRequest.value) : '')

const ranked = computed(() => {
  const options = [...(advice.value?.options ?? [])].sort((a, b) => b.score - a.score).slice(0, 4)
  if (!options.length) return []
  const high = options[0]!.score
  const low = Math.min(...options.map(option => option.score))
  const mine = props.battle.choiceSent ? optionOf(props.battle.lastChoice, adviceRequest.value) : undefined
  return options.map((option, index) => ({
    key: `${option.kind}-${option.id}-${option.tera}`,
    label: optionName(option),
    width: high === low ? 100 : 25 + (option.score - low) / (high - low) * 75,
    best: index === 0,
    mine: option === mine,
  }))
})

const verdict = computed(() => {
  if (!props.battle.choiceSent || !advice.value?.choice) return null
  const mine = props.battle.lastChoice
  if (mine === advice.value.choice) return { tone: 'good', text: 'Même choix que le coach. Bien joué !' }
  const options = advice.value.options ?? []
  const best = options.reduce((top, option) => option.score > top ? option.score : top, -Infinity)
  const played = optionOf(mine, adviceRequest.value)
  const gap = played && Number.isFinite(best) ? best - played.score : null
  const text = `Tu as joué ${choiceName(mine, adviceRequest.value)}.`
  if (gap !== null && gap < 0.05) return { tone: 'good', text: `${text} Presque aussi bien noté que le choix du coach.` }
  return { tone: 'warn', text: `${text} Le coach préférait ${coachLabel.value}.` }
})

/** À chaque nouvelle décision (pas l'aperçu des équipes), le coach analyse la position. */
watch(() => props.battle.request, async (request) => {
  if (!request || request.wait || request.teamPreview || props.battle.ended) return
  adviceRequest.value = request
  advice.value = null
  revealed.value = false
  loading.value = true
  const reply = await askAdvice(props.battle.roomid)
  if (adviceRequest.value !== request) return
  advice.value = reply
  loading.value = false
}, { immediate: true })
</script>

<style scoped>
.coach { flex: none; background: var(--dk); --tx: var(--dkTx); --mu: var(--dkMu); --chip: var(--dkChip); color: #fff; border-radius: var(--r); box-shadow: var(--pnS); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.coach__head { display: flex; align-items: center; gap: 8px; }
.coach__badge { height: 22px; padding: 0 8px; border-radius: 5px; background: var(--sel); color: #383838; font: 600 12px 'Pixelify Sans', sans-serif; display: grid; place-items: center; }
.coach__title { flex: 1; min-width: 0; font: 600 15px/1.1 'Pixelify Sans', sans-serif; }
.coach__turn { flex: none; white-space: nowrap; font: 700 11px 'Nunito', sans-serif; opacity: .7; }
.coach__fold { flex: none; border: 0; cursor: pointer; height: 26px; padding: 0 10px; border-radius: 6px; background: rgba(255, 255, 255, .14); color: #fff; font: 600 13px 'Pixelify Sans', sans-serif; }
.coach__body { display: flex; flex-direction: column; gap: 8px; }
.coach__note { margin: 0; font: 700 12px/1.45 'Nunito', sans-serif; opacity: .75; }
.coach__reveal { align-self: flex-start; }
.coach__pick { margin: 0; font: 800 13px/1.4 'Nunito', sans-serif; }
.coach__pick b { color: var(--sel); }
.coach__options { display: flex; flex-direction: column; gap: 4px; }
.option { display: grid; grid-template-columns: minmax(0, 1fr) 80px; gap: 8px; align-items: center; padding: 3px 6px; border-radius: 6px; font: 700 12px 'Nunito', sans-serif; }
.option--best { background: rgba(248, 208, 48, .16); }
.option--mine { box-shadow: inset 0 0 0 2px #4a8fe0; }
.option__label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.option__track { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, .12); overflow: hidden; }
.option__fill { display: block; height: 100%; background: var(--sel); }
.coach__verdict { margin: 0; padding: 6px 8px; border-radius: 7px; font: 700 12px/1.45 'Nunito', sans-serif; }
.coach__verdict--good { background: #16301f; color: #c8f0d4; }
.coach__verdict--warn { background: #3a2216; color: #ffd9c8; }
.coach__meta { font: 700 11px 'Nunito', sans-serif; opacity: .6; }
</style>

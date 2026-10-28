<template>
  <div class="preview" role="dialog" aria-label="Aperçu des équipes">
    <div class="preview__box">
      <h2 class="preview__title">Aperçu des équipes</h2>
      <p class="preview__hint">{{ hint }}</p>
      <div class="preview__side">
        <span class="preview__label">{{ opponentName }}</span>
        <div class="preview__row">
          <span v-for="member in opponents" :key="member.speciesId" class="preview__mon preview__mon--opp" :style="{ '--habitat': habitat(member.speciesId) }">
            <span class="preview__sprite" :style="{ backgroundImage: `url(${spriteUrl(member.speciesId)})` }" />
            <span class="preview__name">{{ speciesName(member.speciesId) }}</span>
          </span>
        </div>
      </div>
      <div class="preview__side">
        <span class="preview__label">Ton équipe</span>
        <div class="preview__row">
          <button
            v-for="(member, index) in mine"
            :key="member.ident"
            type="button"
            class="preview__mon"
            :class="{ 'preview__mon--picked': picked.includes(index) }"
            :disabled="battle.choiceSent"
            :style="{ '--habitat': habitat(member.speciesId) }"
            @click="pick(index)"
          >
            <span v-if="picked.includes(index)" class="preview__rank">{{ picked.indexOf(index) + 1 }}</span>
            <span class="preview__sprite" :style="{ backgroundImage: `url(${spriteUrl(member.speciesId)})` }" />
            <span class="preview__name">{{ member.name }}</span>
          </button>
        </div>
      </div>
      <button v-if="choosing && !battle.choiceSent" type="button" class="btn btn--primary preview__confirm" :disabled="picked.length < needed" @click="confirm">
        Valider ({{ picked.length }}/{{ needed }})
      </button>
      <p v-if="battle.choiceSent" class="preview__wait">En attente de l'adversaire…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattleState } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState }>()
const emit = defineEmits<{ choose: [choice: string] }>()

const oppSide = computed(() => props.battle.mySide === 'p2' ? 'p1' : 'p2')
const opponentName = computed(() => props.battle.sides[oppSide.value].name || 'Adversaire')
const opponents = computed(() => props.battle.sides[oppSide.value].team)
const mine = computed(() => (props.battle.request?.side.pokemon ?? []).map((member) => {
  const speciesId = toId(member.details.split(',')[0] ?? '')
  return { ident: member.ident, speciesId, name: speciesName(speciesId) }
}))

const habitat = (speciesId: string) => habitatBackground(speciesView(speciesId, isPokedraft(props.battle)).types[0])
const picked = ref<number[]>([])
const size = computed(() => Math.min(props.battle.request?.maxChosenTeamSize ?? mine.value.length, mine.value.length))
const leads = computed(() => activeCount(props.battle))
/** Formats où l'on choisit plusieurs Pokémon dans l'ordre : VGC (4 sur 6), doubles et triples. */
const choosing = computed(() => size.value < mine.value.length || leads.value > 1)
const needed = computed(() => size.value < mine.value.length ? size.value : leads.value)

const hint = computed(() => {
  if (!choosing.value) return 'Clique sur le Pokémon qui commence le combat. Les autres gardent leur ordre.'
  if (size.value < mine.value.length) return `Choisis ${size.value} Pokémon dans l'ordre : les ${leads.value} premiers commencent le combat.`
  return `Choisis les ${leads.value} Pokémon qui commencent le combat ; les autres gardent leur ordre.`
})

const send = (order: number[]) => {
  const rest = size.value < mine.value.length ? [] : mine.value.map((_, index) => index).filter(index => !order.includes(index))
  emit('choose', `team ${[...order, ...rest].map(index => index + 1).join('')}`)
}

const pick = (index: number) => {
  if (!choosing.value) return send([index])
  picked.value = picked.value.includes(index) ? picked.value.filter(other => other !== index) : picked.value.length < needed.value ? [...picked.value, index] : picked.value
}

const confirm = () => send(picked.value)
</script>

<style scoped>
.preview {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(6, 8, 12, .72);
  animation: pop .25s both;
}

.preview__box {
  width: min(760px, 92%);
  padding: 18px 20px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS), 0 30px 60px rgba(0, 0, 0, .5);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview__title { margin: 0; font: 700 26px 'Pixelify Sans', sans-serif; }
.preview__hint, .preview__wait { margin: 0; font: 400 14px 'Nunito', sans-serif; color: var(--mu); }

.preview__side {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview__label { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }

.preview__row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.preview__mon {
  border: 0;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(0, 0, 0, .1), rgba(0, 0, 0, .55)), var(--habitat, var(--chip));
  color: #fff;
  text-shadow: 1px 1px 0 #000;
  box-shadow: 0 0 0 2px var(--bd);
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  transition: transform .12s;
}

.preview__mon:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 0 0 2px var(--sel); }
.preview__mon--opp { cursor: default; }

.preview__sprite {
  width: 64px;
  height: 64px;
  background: center/contain no-repeat;
  image-rendering: pixelated;
}

.preview__name {
  font: 700 12px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.preview__mon { position: relative; }
.preview__mon--picked { box-shadow: inset 0 0 0 3px var(--uA); }

.preview__rank {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 12px 'Nunito', sans-serif;
  display: grid;
  place-items: center;
}

.preview__confirm { align-self: center; }
</style>

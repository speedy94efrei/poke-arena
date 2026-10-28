<template>
  <UiPanel :title="`Victoire · étage ${run.floor}`">
    <template v-if="me.rewards">
      <p class="note">{{ me.rewards.picks > 1 ? `Choisis ${me.rewards.picks} récompenses parmi ${me.rewards.options.length}.` : `Choisis 1 récompense parmi ${me.rewards.options.length}.` }}</p>
      <div class="options">
        <button
          v-for="(option, index) in me.rewards.options"
          :key="index"
          type="button"
          class="option"
          :class="{ 'option--on': chosen.includes(index) }"
          :aria-pressed="chosen.includes(index)"
          @click="toggle(index)"
        >
          <span class="option__art" :style="{ background: art(option) }">
            <span class="option__tag">{{ TAGS[option.kind] }}</span>
            <span v-if="option.kind === 'recrue'" class="option__sprite" :style="{ backgroundImage: `url(${spriteUrl(option.species, 'face')})` }" />
            <ItemIcon v-else-if="option.kind === 'objet'" :id="option.item" :size="48" />
            <span v-else class="option__glyph">{{ option.kind === 'ct' ? 'CT' : '◎' }}</span>
          </span>
          <span class="option__body">
            <b>{{ title(option) }}</b>
            <span>{{ text(option) }}</span>
          </span>
        </button>
      </div>

      <div v-for="index in chosen" :key="`reglage-${index}`" class="details">
        <template v-if="me.rewards.options[index]?.kind === 'recrue' && me.team.length >= run.maxTeam">
          <label class="detail">Équipe complète : Pokémon à relâcher
            <select v-model="release" class="field">
              <option value="" disabled>Choisir</option>
              <option v-for="member in me.team" :key="member.species" :value="member.species">{{ speciesName(member.species) }}</option>
            </select>
          </label>
        </template>
        <template v-if="tm(index)">
          <label class="detail">Pokémon qui apprend {{ moveName(tm(index)!.move) }}
            <select v-model="learner" class="field">
              <option value="" disabled>Choisir</option>
              <option v-for="species in tm(index)!.members" :key="species" :value="species">{{ speciesName(species) }}</option>
            </select>
          </label>
          <label v-if="learnerMember && learnerMember.moves.length >= 4" class="detail">Attaque remplacée
            <select v-model="replace" class="field">
              <option value="">Aucune : la garder en réserve</option>
              <option v-for="move in learnerMember.moves" :key="move" :value="move">{{ moveName(move) }}</option>
            </select>
          </label>
        </template>
      </div>

      <button type="button" class="btn btn--primary" :disabled="!complete || pending" @click="confirm">Valider et monter à l'étage {{ run.floor + 1 }} ▸</button>
    </template>
    <p v-else class="note">Récompense choisie. En attente de {{ waiting }}…</p>
  </UiPanel>
</template>

<script setup lang="ts">
import type { RewardOption, RoguePlayer, RoguelikeRun } from '~/utils/roguelike'

const props = defineProps<{ run: RoguelikeRun, me: RoguePlayer }>()
const { act, pending } = useRoguelike()

const TAGS: Record<RewardOption['kind'], string> = { recrue: 'Recruter', objet: 'Objet', ct: 'CT', jetons: 'Jetons' }
const chosen = ref<number[]>([])
const release = ref('')
const learner = ref('')
const replace = ref('')

const waiting = computed(() => props.run.players.filter(player => player.rewards).map(player => player.name).join(' et '))
const tm = (index: number) => {
  const option = props.me.rewards?.options[index]
  return option?.kind === 'ct' ? option : null
}
const learnerMember = computed(() => props.me.team.find(member => member.species === learner.value))
const complete = computed(() => {
  const rewards = props.me.rewards
  if (!rewards || chosen.value.length !== Math.min(rewards.picks, rewards.options.length)) return false
  const recruits = chosen.value.some(index => rewards.options[index]?.kind === 'recrue')
  if (recruits && props.me.team.length >= props.run.maxTeam && !release.value) return false
  return !chosen.value.some(index => tm(index)) || Boolean(learner.value)
})

const toggle = (index: number) => {
  const picks = props.me.rewards?.picks ?? 1
  if (chosen.value.includes(index)) chosen.value = chosen.value.filter(other => other !== index)
  else chosen.value = picks === 1 ? [index] : [...chosen.value, index].slice(-picks)
}

const art = (option: RewardOption) => {
  if (option.kind === 'recrue') return habitatBackground(findPokemon(option.species)?.types[0])
  return option.kind === 'objet' ? 'linear-gradient(140deg, #7a2a2a, #3a1010)' : option.kind === 'ct' ? 'linear-gradient(140deg, #8a6a1a, #3a2a06)' : 'linear-gradient(140deg, #2a5a3a, #0a2414)'
}

const title = (option: RewardOption) => {
  if (option.kind === 'recrue') return speciesName(option.species)
  if (option.kind === 'objet') return itemName(option.item)
  if (option.kind === 'ct') return `CT ${moveName(option.move)}`
  return `${option.amount} jetons`
}

const text = (option: RewardOption) => {
  if (option.kind === 'recrue') return `Pokémon de l'équipe battue, avec son set : ${option.set.moves.map(move => moveName(move)).join(', ')}`
  if (option.kind === 'objet') return findObjet(option.item)?.description ?? ''
  if (option.kind === 'ct') return `Ajoute ${moveName(option.move)} à un Pokémon compatible : ${option.members.map(species => speciesName(species)).join(', ')}.`
  return 'À dépenser à la Boutique.'
}

const confirm = () => {
  act({
    type: 'recompense',
    choix: chosen.value.map(index => ({ index, release: release.value || undefined, member: tm(index) ? learner.value : undefined, replace: tm(index) ? replace.value || undefined : undefined })),
  })
  chosen.value = []
}

watch(() => props.run.floor, () => {
  chosen.value = []
  release.value = ''
  learner.value = ''
  replace.value = ''
})
</script>

<style scoped>
.note { margin: 0 0 10px; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 10px; }
.option { border: 0; cursor: pointer; padding: 0; border-radius: 12px; background: var(--in); color: var(--tx); box-shadow: 0 0 0 2px var(--chip); overflow: hidden; text-align: left; display: flex; flex-direction: column; }
.option--on { box-shadow: 0 0 0 3px #a77bff; }
.option__art { position: relative; height: 120px; display: grid; place-items: center; }
.option__tag { position: absolute; left: 8px; top: 8px; height: 22px; padding: 0 8px; border-radius: 5px; background: rgba(0, 0, 0, .55); color: #fff; font: 700 12px 'Nunito', sans-serif; display: flex; align-items: center; }
.option__sprite { width: 110px; height: 110px; background: center bottom / contain no-repeat; image-rendering: pixelated; align-self: end; }
.option__glyph { font: 700 40px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 3px 3px 0 rgba(0, 0, 0, .4); }
.option__body { padding: 10px; display: flex; flex-direction: column; gap: 4px; font: 400 12px/1.4 'Nunito', sans-serif; color: var(--mu); }
.option__body b { font: 600 17px 'Pixelify Sans', sans-serif; color: var(--tx); }
.details { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.detail { display: flex; flex-direction: column; gap: 4px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 900px) {
  .options { grid-template-columns: minmax(0, 1fr); }
}
</style>

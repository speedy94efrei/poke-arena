<template>
  <UiPanel :title="TITLES[run.phase] ?? ''">
    <template #aside>{{ run.tokens }} jetons</template>

    <template v-if="run.phase === 'boutique' && run.shop">
      <p class="note">Les objets vont dans ton sac ; une CT s'apprend tout de suite. Les jetons sont communs en coop.</p>
      <div class="offers">
        <div v-for="(offer, index) in run.shop.offers" :key="`${offer.kind}-${offer.id}`" class="offer" :class="{ 'offer--sold': run.shop.bought.includes(index) }">
          <ItemIcon v-if="offer.kind === 'objet'" :id="offer.id" :size="40" />
          <span v-else class="offer__tm">CT</span>
          <span class="offer__body">
            <b>{{ offer.kind === 'objet' ? itemName(offer.id) : `CT ${moveName(offer.id)}` }}</b>
            <span>{{ offer.kind === 'objet' ? findObjet(offer.id)?.description : `Pour ${(offer.members ?? []).map(species => speciesName(species)).join(', ')}` }}</span>
          </span>
          <select v-if="offer.kind === 'ct' && !run.shop.bought.includes(index)" v-model="learner" class="field offer__select" aria-label="Pokémon qui apprend la CT">
            <option value="">Qui l'apprend ?</option>
            <option v-for="species in (offer.members ?? []).filter(owned)" :key="species" :value="species">{{ speciesName(species) }}</option>
          </select>
          <button type="button" class="btn btn--small" :disabled="pending || run.shop.bought.includes(index) || run.tokens < offer.price || (offer.kind === 'ct' && !learner)" @click="act({ type: 'acheter', index, member: offer.kind === 'ct' ? learner : undefined })">
            {{ run.shop.bought.includes(index) ? 'Acheté' : `${offer.price} jetons` }}
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="run.phase === 'pension'">
      <p class="note">{{ me.pensionUsed ? 'Ton Pokémon est réglé.' : "Règle un de tes Pokémon : sa nature et ses attaques, parmi tout son movepool. Son talent reste celui de sa fiche." }}</p>
      <div v-if="!me.pensionUsed" class="pension">
        <label class="field-label">Pokémon
          <select v-model="species" class="field">
            <option v-for="member in me.team" :key="member.species" :value="member.species">{{ speciesName(member.species) }}</option>
          </select>
        </label>
        <label class="field-label">Nature
          <select v-model="nature" class="field">
            <option v-for="entry in NATURES" :key="entry.id" :value="entry.id">{{ natureLabel(entry) }}</option>
          </select>
        </label>
        <label v-for="slot in 4" :key="slot" class="field-label">Attaque {{ slot }}
          <select v-model="moves[slot - 1]" class="field">
            <option value="">—</option>
            <option v-for="move in movepool" :key="move" :value="move">{{ moveName(move) }}</option>
          </select>
        </label>
        <button type="button" class="btn btn--primary" :disabled="pending || !moves.some(Boolean)" @click="act({ type: 'pension', species, nature, moves: moves.filter(Boolean) })">Valider</button>
      </div>
    </template>

    <template v-else-if="run.phase === 'mystere' && run.mystery">
      <div class="mystery">
        <template v-if="run.mystery.kind === 'recrue'">
          <span class="mystery__sprite" :style="{ backgroundImage: `url(${spriteUrl(run.mystery.species, 'face')})` }" />
          <p><b>Un {{ speciesName(run.mystery.species) }} rare</b> veut rejoindre ton équipe, avec un set optimisé.</p>
          <template v-if="!me.mysteryDone">
            <select v-if="me.team.length >= run.maxTeam" v-model="release" class="field" aria-label="Pokémon à relâcher">
              <option value="">Équipe complète : qui relâcher ?</option>
              <option v-for="member in me.team" :key="member.species" :value="member.species">{{ speciesName(member.species) }}</option>
            </select>
            <span class="mystery__actions">
              <button type="button" class="btn btn--primary" :disabled="pending || (me.team.length >= run.maxTeam && !release)" @click="act({ type: 'mystere', accepter: true, release: release || undefined })">Le recruter</button>
              <button type="button" class="btn" :disabled="pending" @click="act({ type: 'mystere', accepter: false })">Passer</button>
            </span>
          </template>
        </template>
        <p v-else-if="run.mystery.kind === 'maudit'"><b>Objet maudit :</b> {{ itemName(run.mystery.item) }} rejoint ton sac. {{ findObjet(run.mystery.item)?.description }}</p>
        <p v-else><b>Un piège !</b> Chaque Pokémon de l'équipe perd {{ run.mystery.damage }} % de ses PV (jamais en dessous de 1 %).</p>
      </div>
    </template>

    <div class="foot">
      <button type="button" class="btn btn--primary" :disabled="pending || me.ready || (run.phase === 'mystere' && run.mystery?.kind === 'recrue' && !me.mysteryDone)" @click="act({ type: 'terminer' })">
        {{ me.ready ? 'En attente de ton partenaire…' : `Continuer vers l'étage ${run.floor} ▸` }}
      </button>
    </div>
  </UiPanel>
</template>

<script setup lang="ts">
import type { RoguePlayer, RoguelikeRun } from '~/utils/roguelike'

const props = defineProps<{ run: RoguelikeRun, me: RoguePlayer }>()
const { act, pending } = useRoguelike()

const TITLES: Record<string, string> = { boutique: 'Boutique', pension: 'Pension', mystere: 'Événement mystère' }
const learner = ref('')
const release = ref('')
const species = ref(props.me.team[0]?.species ?? '')
const nature = ref('')
const moves = ref<string[]>(['', '', '', ''])

const owned = (id: string) => props.me.team.some(member => member.species === id)
const member = computed(() => props.me.team.find(entry => entry.species === species.value))
const movepool = computed(() => [...new Set([...(findPokemon(species.value)?.movepool ?? []), ...(member.value?.learned ?? []), ...(member.value?.moves ?? [])])]
  .sort((a, b) => moveName(a).localeCompare(moveName(b), 'fr')))

watch(member, (current) => {
  nature.value = current?.nature ?? 'serious'
  moves.value = [0, 1, 2, 3].map(index => current?.moves[index] ?? '')
}, { immediate: true })
</script>

<style scoped>
.note { margin: 0 0 10px; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.offers { display: flex; flex-direction: column; gap: 6px; }
.offer { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; background: var(--in); }
.offer--sold { opacity: .55; }
.offer__tm { width: 40px; height: 40px; border-radius: 8px; background: #c8862a; color: #fff; display: grid; place-items: center; font: 700 15px 'Pixelify Sans', sans-serif; }
.offer__body { display: flex; flex-direction: column; font: 700 12px/1.35 'Nunito', sans-serif; color: var(--mu); }
.offer__body b { font: 700 15px 'Nunito', sans-serif; color: var(--tx); }
.offer__select { width: 170px; }
.pension { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; align-items: end; }
.field-label { display: flex; flex-direction: column; gap: 4px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.mystery { display: flex; flex-direction: column; gap: 8px; font: 700 14px/1.45 'Nunito', sans-serif; }
.mystery p { margin: 0; }
.mystery__sprite { width: 110px; height: 110px; background: center / contain no-repeat; image-rendering: pixelated; }
.mystery__actions { display: flex; gap: 8px; }
.foot { margin-top: 12px; display: flex; justify-content: flex-end; }

@media (max-width: 900px) {
  .pension { grid-template-columns: minmax(0, 1fr); }
  .offer { grid-template-columns: 44px minmax(0, 1fr); }
}
</style>

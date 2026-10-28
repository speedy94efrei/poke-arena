<template>
  <section class="floor" :class="`floor--${next?.kind ?? 'combat'}`" aria-label="Étage à combattre">
    <span class="floor__kicker">{{ kicker }}</span>
    <h2 class="floor__title">{{ title }}</h2>
    <ul v-if="next" class="floor__facts">
      <li>{{ teamText }}</li>
      <li>{{ poolText }}</li>
      <li>IA : {{ AI[next.level] }}</li>
      <li v-if="next.rule" class="floor__rule">Règle spéciale : {{ BOSS_RULES[next.rule] }}</li>
      <li v-if="next.bonus" class="floor__rule">+{{ next.bonus }} % à toutes les stats ennemies</li>
    </ul>
    <p class="floor__note">Les PV et les statuts restent d'un combat à l'autre. Un Pokémon K.O. est perdu pour la run.</p>
    <div class="floor__actions">
      <button v-if="run.battle" type="button" class="btn btn--primary floor__go" @click="resume(run.battle)">▶ Reprendre le combat</button>
      <template v-else>
        <button type="button" class="btn btn--primary floor__go" :disabled="pending || (run.duo && me.ready)" @click="act({ type: 'combattre' })">
          {{ run.duo ? (me.ready ? 'Prêt · en attente' : 'Je suis prêt') : 'Combattre ▶' }}
        </button>
        <span v-if="partner" class="floor__partner">{{ partner.name }} : {{ partner.ready ? 'prêt' : 'pas encore prêt' }}</span>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RoguePlayer, RoguelikeRun } from '~/utils/roguelike'

const props = defineProps<{ run: RoguelikeRun, me: RoguePlayer }>()
const { act, pending } = useRoguelike()
const { join } = useShowdown()

/** Combat en cours (page rechargée, ou retour plus tard) : le site rejoint la salle, et Showdown renvoie son historique. */
const resume = (roomid: string) => {
  join(roomid)
  void navigateTo(`/roguelike/combat/${roomid}`)
}

const AI: Record<number, string> = {
  2: "elle choisit l'attaque qui fait le plus de dégâts", 3: 'elle change de Pokémon quand il est menacé',
  4: 'elle joue sa stratégie (pièges, boosts, météo)', 5: 'IA complète',
}

const next = computed(() => props.run.next)
const partner = computed(() => props.run.duo ? props.run.players.find(player => player.id !== props.me.id) : undefined)
const kicker = computed(() => next.value?.elite ? "Combat d'élite · 2 récompenses" : next.value?.kind === 'grosboss' ? 'Gros boss · 2 récompenses' : next.value?.kind === 'boss' ? 'Boss · 2 récompenses' : 'Combat')
const title = computed(() => {
  const floor = `Étage ${props.run.floor}`
  if (!next.value || next.value.kind === 'combat') return floor
  return `${floor} · ${themeLabel(next.value.theme, next.value.type)}`
})
const teamText = computed(() => {
  const sizes = next.value?.sizes ?? []
  return sizes.length > 1 ? `Deux équipes de ${sizes.join(' et ')} Pokémon` : `Une équipe de ${sizes[0] ?? 1} Pokémon`
})
const poolText = computed(() => {
  const floor = props.run.floor
  if (next.value && next.value.kind !== 'combat') return 'Équipe à thème tirée dans tout le roster'
  if (floor < 10) return 'Pokémon ZU et PU du roster, sets simples sans objet'
  if (floor < 20) return "Pokémon jusqu'au NU, sets des fiches"
  if (floor < 30) return 'Tout le roster, sets optimisés avec objets'
  return 'Tout le roster, équipe construite autour d\'un archétype'
})
</script>

<style scoped>
.floor {
  padding: 18px 20px;
  border-radius: var(--r);
  background: linear-gradient(140deg, #3c2470, #120a2a);
  box-shadow: inset 0 0 0 3px #a77bff, var(--pnS);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.floor--boss { background: linear-gradient(140deg, #7a4a10, #241404); box-shadow: inset 0 0 0 3px #f0b93a, var(--pnS); }
.floor--grosboss { background: linear-gradient(140deg, #7a1a14, #200606); box-shadow: inset 0 0 0 3px #ff8a7a, var(--pnS); }
.floor__kicker { align-self: flex-start; height: 24px; padding: 0 10px; border-radius: 5px; background: rgba(0, 0, 0, .4); font: 700 12px 'Nunito', sans-serif; display: flex; align-items: center; }
.floor__title { margin: 0; font: 700 34px/1.05 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .45); }
.floor__facts { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; font: 700 14px/1.4 'Nunito', sans-serif; }
.floor__rule { color: #ffd0c0; }
.floor__note { margin: 0; font: 700 12px 'Nunito', sans-serif; opacity: .8; }
.floor__actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
.floor__go { height: 46px; padding: 0 22px; font-size: 17px; }
.floor__partner { font: 700 13px 'Nunito', sans-serif; opacity: .9; }
</style>

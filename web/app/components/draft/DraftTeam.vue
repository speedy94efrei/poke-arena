<template>
  <aside :aria-label="mine ? 'Ton équipe' : 'Équipe adverse'" class="team" :class="{ 'team--theirs': !mine, 'team--active': active }">
    <div class="team__head">
      <span class="team__name">{{ mine ? `Toi · ${draft.you}` : draft.opponent }}</span>
      <span class="team__state">{{ state }}</span>
    </div>
    <div
      v-for="slot in slots"
      :key="slot.index"
      class="slot"
      :class="{ 'slot--filled': slot.pokemon, 'slot--active': slot.active }"
      :style="slot.pokemon ? { background: slot.background } : undefined"
      @mouseenter="event => slot.pokemon && show(event, slot.pokemon.id)"
      @mouseleave="hide"
    >
      <img v-if="slot.sprite" class="slot__sprite" :class="{ 'slot__sprite--preview': !slot.pokemon }" :src="slot.sprite" alt="">
      <span class="slot__text">
        <span class="slot__number">{{ slot.index + 1 }}</span>
        <span class="slot__name">{{ slot.name }}</span>
        <span class="slot__sub" :class="{ 'slot__sub--random': slot.random }">{{ slot.sub }}</span>
      </span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { DraftView } from '~/utils/draft'

const props = defineProps<{ draft: DraftView, mine: boolean, labels?: Record<string, string> }>()
const { show, hide } = useDraftHover()

const active = computed(() => props.draft.phase === 'pick' && props.draft.turn?.mine === props.mine)
const state = computed(() => {
  if (props.draft.phase === 'ban') return (props.mine ? props.draft.locked.mine : props.draft.locked.theirs) ? 'bans verrouillés' : 'bannit…'
  if (props.draft.phase === 'prep') return (props.mine ? props.draft.ready.mine : props.draft.ready.theirs) ? 'prêt ✓' : 'se prépare…'
  return active.value ? 'choisit…' : ''
})

const slots = computed(() => {
  const picks = props.draft.picks.filter(pick => pick.mine === props.mine)
  const turn = props.draft.turn
  const pending = active.value && turn ? turn.count - turn.done : 0
  const preview = props.mine && props.draft.preselection ? findPokemon(props.draft.preselection) : undefined
  return Array.from({ length: DRAFT.team }, (_, index) => {
    const pick = picks[index]
    const pokemon = pick ? findPokemon(pick.id) : undefined
    if (pokemon) {
      const [first, second = first] = pokemon.types.map(type => TYPE_COLORS[type])
      let sub = pokemon.roles[0] ?? ''
      if (pick!.random) sub = '⚄ Pick aléatoire'
      else if (props.mine && props.labels?.[pokemon.id]) sub = props.labels[pokemon.id]!
      else if (!props.mine && ['prep', 'done'].includes(props.draft.phase)) sub = 'Set caché'
      return {
        index, pokemon, sprite: pokemon.sprite, name: pokemon.nom, sub, random: pick!.random, active: false,
        background: `linear-gradient(${props.mine ? 100 : 260}deg, ${first}cc, ${second}55 70%, rgba(0, 0, 0, .2))`,
      }
    }
    const isActive = index >= picks.length && index < picks.length + pending
    const showPreview = isActive && index === picks.length && preview
    return {
      index,
      pokemon: undefined,
      sprite: showPreview ? preview.sprite : '',
      name: showPreview ? preview.nom : isActive ? (props.mine ? 'À toi…' : 'Choix adverse…') : '—',
      sub: showPreview ? 'Présélection · verrouille' : isActive ? 'Choix en cours' : '',
      random: false,
      active: isActive,
      background: '',
    }
  })
})
</script>

<style scoped>
.team {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  min-width: 0;
}

.team__head {
  flex: none;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  background: #1f5f8f;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--pnS);
  color: #fff;
}

.team--theirs .team__head { background: #8a2a1c; }
.team--active .team__head { box-shadow: inset 0 0 0 3px var(--uA), 0 0 0 2px var(--bd); }

.team__name {
  flex: 1;
  min-width: 0;
  font: 600 16px 'Pixelify Sans', sans-serif;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team__state { font: 700 11px 'Nunito', sans-serif; }

.slot {
  position: relative;
  flex: 1 1 0;
  min-height: 64px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--chip);
  display: flex;
  align-items: center;
  padding: 0 10px;
}

.slot--filled { box-shadow: inset 0 0 0 2px #5aa0e0; animation: pop .25s both; }
.team--theirs .slot--filled { box-shadow: inset 0 0 0 2px #e8704a; }
.slot--active { background: linear-gradient(100deg, rgba(240, 185, 58, .16), transparent); box-shadow: inset 0 0 0 3px var(--uA); animation: pulse 1.2s ease-in-out infinite; }

.slot__sprite {
  position: absolute;
  right: 6px;
  bottom: -6px;
  width: 92px;
  height: 92px;
  object-fit: contain;
  object-position: bottom;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, .35));
}

.team--theirs .slot__sprite { right: auto; left: 6px; transform: scaleX(-1); }
.slot__sprite--preview { opacity: .55; }

.slot__text {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.team--theirs .slot__text { text-align: right; }
.slot__number { font: 600 12px 'Pixelify Sans', sans-serif; color: var(--mu); }

.slot__name {
  font: 700 18px 'Pixelify Sans', sans-serif;
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot__sub { font: 700 11px 'Nunito', sans-serif; color: #e6ecf5; text-shadow: 1px 1px 0 rgba(0, 0, 0, .6); }
.slot--active .slot__sub { color: var(--uT); }
.slot__sub--random { color: #ff9a8a; }

@media (max-width: 1100px) {
  .team { flex-direction: row; overflow-x: auto; }
  .team__head { display: none; }
  .slot { flex: 0 0 150px; height: 64px; }
  .slot__sprite { width: 56px; height: 56px; }
  .slot__name { font-size: 13px; }
}
</style>

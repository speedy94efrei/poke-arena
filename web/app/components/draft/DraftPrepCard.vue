<template>
  <article :aria-label="pokemon.nom" class="prep" :class="{ 'prep--modified': resolved.modified }">
    <div class="prep__hero" :style="{ background: hero }">
      <span class="prep__veil" />
      <img class="prep__sprite" :src="pokemon.sprite" alt="">
      <span class="prep__title">
        <span class="prep__name">{{ pokemon.nom }}</span>
        <span class="prep__talent">{{ pokemon.talent.nom }}</span>
      </span>
      <span v-if="resolved.modified" class="prep__badge">✎ MODIFIÉ</span>
    </div>
    <div class="prep__body">
      <span class="prep__label">{{ variants.length ? `Tes sets de l'Atelier (${variants.length}/${MAX_VARIANTES})` : 'Aucun set enregistré : set par défaut' }}</span>
      <div role="tablist" aria-label="Set" class="tabs">
        <button type="button" role="tab" class="tab" :class="{ 'tab--on': !resolved.modified && resolved.selected < 0 }" :aria-selected="resolved.selected < 0" @click="emit('choose', 'def')">Défaut</button>
        <button
          v-for="(variant, index) in variants"
          :key="index"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'tab--on': !resolved.modified && resolved.selected === index }"
          :aria-selected="resolved.selected === index"
          :title="variantText(pokemon, variant)"
          @click="emit('choose', index)"
        >
          {{ variant.favorite ? '★ ' : '' }}{{ variant.nom }}
        </button>
      </div>
      <div class="pair">
        <button type="button" class="pair__item" title="Changer l'objet" @click="emit('edit')">
          <ItemIcon :id="resolved.variant.objetId" />
          <span class="pair__text">{{ findObjet(resolved.variant.objetId)?.nom ?? itemName(resolved.variant.objetId) }}</span>
        </button>
        <button type="button" class="pair__nature" title="Changer la nature" @click="emit('edit')">
          <span class="pair__nature-name">{{ nature?.nom }}</span>
          <span class="pair__nature-effect">{{ nature?.plus ? `+${statLabel(nature.plus)} −${statLabel(nature.moins!)}` : 'neutre' }}</span>
        </button>
      </div>
      <div class="moves">
        <button v-for="move in moves" :key="move.key" type="button" class="move" title="Changer cette attaque" @click="emit('edit')">
          <span class="move__type" :style="{ background: move.data ? TYPE_COLORS[move.data.type] : 'var(--chip)' }">{{ move.data?.type ?? '—' }}</span>
          <span class="move__name" :class="{ 'move__name--stab': move.stab }">{{ move.data?.nom ?? 'Vide' }}<span v-if="move.stab" class="move__stab">STAB</span></span>
          <span class="move__cat" :style="categoryShape(move.data?.categorie)" />
          <span class="move__power">{{ move.data ? powerText(move.data) : '' }}</span>
          <span class="move__pp">{{ move.data ? `PP ${move.data.pp ?? '?'}` : '' }}</span>
        </button>
      </div>
      <div class="foot">
        <span class="foot__text" :class="{ 'foot__text--modified': resolved.modified }">{{ footText }}</span>
        <button v-if="resolved.modified" type="button" class="foot__undo" @click="emit('undo')">Annuler</button>
        <button type="button" class="foot__edit" @click="emit('edit')">✎ Modifier</button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { PrepChoice } from '~/utils/draft'

const props = defineProps<{ pokemon: Pokemon, choice?: PrepChoice }>()
const emit = defineEmits<{ choose: [source: 'def' | number], edit: [], undo: [] }>()
const { variants: atelierVariants } = useAtelier()

const variants = computed(() => atelierVariants(props.pokemon.id))
const resolved = computed(() => resolvePrep(props.pokemon, props.choice, variants.value))
const nature = computed(() => findNature(resolved.value.variant.natureId))

const hero = computed(() => {
  const [first, second = first] = props.pokemon.types.map(type => TYPE_COLORS[type])
  return `linear-gradient(110deg, ${first}, ${second}88)`
})

const moves = computed(() => resolved.value.variant.attaquesIds.map((id, index) => {
  const data = id ? roster.attaques[id] : undefined
  return { key: `${index}-${id}`, data, stab: data ? isStab(props.pokemon, data) : false }
}))

const footText = computed(() => {
  if (resolved.value.modified) return props.choice?.save ? 'Set modifié · sera ajouté à l\'Atelier' : 'Set modifié pour ce match'
  return props.choice?.source === undefined || props.choice.source === 'auto' ? 'Set favori sélectionné automatiquement' : 'Set choisi, sans modification'
})
</script>

<style scoped>
.prep {
  border-radius: 12px;
  overflow: hidden;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--chip), 0 0 0 2px var(--bd);
  display: flex;
  flex-direction: column;
  animation: pop .25s both;
}

.prep--modified { box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 2px var(--bd); }

.prep__hero {
  position: relative;
  height: 84px;
  display: flex;
  align-items: flex-end;
  padding: 8px 10px;
  overflow: hidden;
}

.prep__veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, 0) 25%, rgba(8, 10, 16, .78)); }

.prep__sprite {
  position: absolute;
  right: 2px;
  bottom: -12px;
  width: 104px;
  height: 104px;
  object-fit: contain;
  object-position: bottom;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, .35));
}

.prep__title {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 65%;
}

.prep__name { font: 700 20px/1 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); }
.prep__talent { font: 700 11px 'Nunito', sans-serif; color: #fff; text-shadow: 1px 1px 0 #000; }

.prep__badge {
  position: absolute;
  top: 6px;
  left: 8px;
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 10px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.prep__body {
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
}

.prep__label { font: 700 10px 'Nunito', sans-serif; color: var(--mu); }
.tabs { display: flex; gap: 3px; flex-wrap: wrap; }

.tab {
  border: 0;
  cursor: pointer;
  height: 28px;
  max-width: 140px;
  padding: 0 9px;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab--on { background: var(--uA); color: var(--uAtx); }

.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
}

.pair__item, .pair__nature, .move {
  border: 0;
  cursor: pointer;
  border-radius: 7px;
  background: var(--pn);
  color: var(--tx);
  text-align: left;
}

.pair__item:hover, .pair__nature:hover, .move:hover { background: var(--chip); }

.pair__item {
  height: 34px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.pair__text {
  flex: 1;
  min-width: 0;
  font: 700 13px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pair__nature {
  height: 34px;
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.1;
}

.pair__nature-name { font: 700 12px 'Nunito', sans-serif; }
.pair__nature-effect { font: 700 9px 'Nunito', sans-serif; color: var(--mu); }
.moves { display: flex; flex-direction: column; gap: 3px; }

.move {
  height: 30px;
  padding: 0 8px 0 0;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 12px 30px 40px;
  gap: 6px;
  align-items: center;
  overflow: hidden;
}

.move__type {
  height: 100%;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Nunito', sans-serif;
  display: grid;
  place-items: center;
}

.move__name {
  font: 400 12px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.move__name--stab { font-weight: 700; }
.move__stab { font: 700 9px 'Nunito', sans-serif; color: var(--info); margin-left: 4px; }
.move__cat { width: 10px; height: 10px; box-shadow: 0 0 0 2px rgba(0, 0, 0, .45); }
.move__power { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }
.move__pp { font: 700 9px 'Nunito', sans-serif; color: var(--mu); text-align: right; }

.foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.foot__text { flex: 1; min-width: 0; font: 700 11px/1.3 'Nunito', sans-serif; color: var(--mu); }
.foot__text--modified { color: var(--uT); }

.foot__undo, .foot__edit {
  border: 0;
  cursor: pointer;
  height: 26px;
  padding: 0 9px;
  border-radius: 5px;
  font: 700 11px 'Nunito', sans-serif;
}

.foot__undo { background: var(--chip); color: var(--tx); }
.foot__edit { background: var(--uA); color: var(--uAtx); }
</style>

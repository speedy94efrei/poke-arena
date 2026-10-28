<template>
  <div class="slots" role="tablist" aria-label="Pokémon de l'équipe">
    <div v-for="(entry, index) in cards" :key="index" class="slot" :class="{ 'slot--on': index === current, 'slot--empty': !entry }" :style="entry ? { '--type': TYPE_COLORS[entry.types[0]!], '--habitat': habitatBackground(entry.types[0]) } : undefined">
      <button type="button" role="tab" class="slot__pick" :aria-selected="index === current" @click="emit('select', index)">
        <template v-if="entry">
          <span class="slot__item">
            <span v-if="entry.itemSprite !== null" :style="itemIconStyle(entry.itemSprite, 24)" />
          </span>
          <span class="slot__sprite" :style="{ backgroundImage: `url(${sprite(entry.species, 'face')})` }" />
          <span class="slot__name">{{ entry.name }}</span>
          <span class="slot__foot">
            <span v-for="type in entry.types" :key="type" class="slot__type" :style="{ background: TYPE_COLORS[type] }">{{ type }}</span>
            <span class="slot__moves" :class="{ 'slot__moves--short': entry.moves < 4 }">{{ entry.moves }}/4</span>
          </span>
        </template>
        <span v-else class="slot__add">+<span>Ajouter</span></span>
      </button>
      <button v-if="entry" type="button" class="slot__remove" :aria-label="`Retirer ${entry.name}`" @click="emit('remove', index)">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TypePokemon } from '#data/types/roster'
import type { ClassicSet } from '~/utils/classicTeam'

const props = defineProps<{ sets: ClassicSet[], current: number, size: number }>()
const emit = defineEmits<{ select: [index: number], remove: [index: number] }>()
const { dex, sprite } = usePokedex()

/** Une carte par emplacement ; les emplacements libres après la fin de l'équipe restent vides. */
const cards = computed(() => Array.from({ length: props.size }, (_, index) => {
  const set = props.sets[index]
  if (!set) return null
  const species = dex.value?.pokemon[set.species]
  const item = set.item ? dex.value?.items[set.item] : undefined
  return {
    species: set.species,
    name: set.nickname || species?.nom || set.species,
    types: (species?.types ?? ['Normal']) as TypePokemon[],
    moves: set.moves.filter(Boolean).length,
    itemSprite: item?.sprite ?? null,
  }
}))
</script>

<style scoped>
.slots { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
.slot { position: relative; min-width: 0; }

.slot__pick {
  width: 100%;
  height: 128px;
  border: 0;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--r);
  color: #fff;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, .15), rgba(0, 0, 0, .6)),
    var(--habitat, linear-gradient(160deg, var(--chip), color-mix(in srgb, var(--chip) 45%, #0b0f16)));
  box-shadow: var(--pnS);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.slot--on .slot__pick { box-shadow: inset 0 0 0 3px var(--uA), 0 0 0 3px var(--bd); }
.slot--empty .slot__pick { background: var(--in); color: var(--mu); box-shadow: inset 0 0 0 2px var(--chip); }
.slot--empty.slot--on .slot__pick { box-shadow: inset 0 0 0 3px var(--uA); }
.slot__item { position: absolute; top: 6px; left: 6px; width: 24px; height: 24px; border-radius: 5px; background: rgba(0, 0, 0, .3); }
.slot__item > span { display: block; }

.slot__sprite {
  flex: 1;
  background: center bottom / contain no-repeat;
  image-rendering: pixelated;
  filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, .35));
}

.slot__name {
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot__foot { display: flex; gap: 3px; align-items: center; }

.slot__type {
  height: 16px;
  padding: 0 5px;
  border-radius: 3px;
  font: 700 10px 'Nunito', sans-serif;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  display: flex;
  align-items: center;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .35);
}

.slot__moves { margin-left: auto; font: 700 11px 'Nunito', sans-serif; color: #b8f0c8; }
.slot__moves--short { color: #ffd0a0; }
.slot__add { margin: auto; display: flex; flex-direction: column; align-items: center; font: 600 28px/1 'Pixelify Sans', sans-serif; }
.slot__add span { font: 700 12px 'Nunito', sans-serif; }

.slot__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  background: rgba(0, 0, 0, .45);
  color: #fff;
  font: 700 11px 'Nunito', sans-serif;
}

@media (max-width: 1100px) {
  .slots { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .slots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>

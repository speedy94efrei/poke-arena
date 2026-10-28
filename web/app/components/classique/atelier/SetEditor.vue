<template>
  <section class="editor" aria-label="Pokémon sélectionné">
    <header class="hero" :style="{ '--type': species ? TYPE_COLORS[species.types[0]!] : 'var(--chip)', '--habitat': species ? habitatBackground(species.types[0]) : undefined }">
      <div class="hero__text">
        <span class="hero__slot">Emplacement {{ index + 1 }} / {{ size }}</span>
        <h2 class="hero__name">{{ set ? (species?.nom ?? set.species) : 'Emplacement libre' }}</h2>
        <span v-if="species" class="hero__types">
          <span v-for="type in species.types" :key="type" class="hero__type" :style="{ background: TYPE_COLORS[type] }">{{ type }}</span>
        </span>
        <span class="hero__actions">
          <button v-if="set" type="button" class="btn btn--primary btn--small" :aria-expanded="picking" @click="picking = !picking">⇄ Changer de Pokémon</button>
          <NuxtLink v-if="set" :to="{ path: '/classique/pokedex', query: { id: set.species } }" class="btn btn--small">Fiche Pokédex</NuxtLink>
          <span v-if="share" class="hero__usage">Usage {{ shortFormat }} {{ percent(share, 1) }}</span>
          <span v-if="cost !== null" class="hero__usage">Coût {{ cost }} pts</span>
        </span>
      </div>
      <span v-if="set" class="hero__sprite" :style="{ backgroundImage: `url(${sprite(set.species, 'face')})` }" />
    </header>

    <div class="editor__body">
      <ClassiqueAtelierSpeciesPicker
        v-if="!set || picking"
        :format="format"
        :format-name="formatName"
        :usage="usage"
        :closable="Boolean(set)"
        :budget-left="budgetLeft"
        @pick="pick"
        @close="picking = false"
      />
      <template v-else>
        <label class="nickname">
          <span>Surnom</span>
          <input class="field nickname__input" maxlength="18" :value="set.nickname" :placeholder="species?.nom" @change="event => emit('update', { nickname: (event.target as HTMLInputElement).value.trim() })">
        </label>
        <ClassiqueAtelierSetMoves :key="`${index}-${set.species}`" :set="set" :usage="setUsage" :pool="pool" @update="patch => emit('update', patch)" />
        <ClassiqueAtelierSetGear :set="set" :usage="setUsage" :format="format" @update="patch => emit('update', patch)" />
        <ClassiqueAtelierSetSpread :set="set" :usage="setUsage" @update="patch => emit('update', patch)" />
        <div class="editor__foot">
          <button type="button" class="btn btn--small" :disabled="!setUsage" @click="emit('reset')">Reprendre le set le plus joué</button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ClassicSet } from '~/utils/classicTeam'
import type { UsageData } from '~/utils/usage'

const props = defineProps<{
  set: ClassicSet | undefined
  index: number
  size: number
  format: string
  formatName: string
  usage: UsageData | null
  pool: string[]
  /** Points restants pour cet emplacement, en Combat à budget. */
  budgetLeft?: number | null
}>()
const emit = defineEmits<{ update: [patch: Partial<ClassicSet>], species: [species: string], reset: [] }>()
const { dex, sprite } = usePokedex()
const { costOf } = useBudget()

const picking = ref(false)
const species = computed(() => props.set ? dex.value?.pokemon[props.set.species] : undefined)
const setUsage = computed(() => props.set ? usageOf(props.usage, props.set.species) : undefined)
const share = computed(() => setUsage.value?.usage ?? 0)
/** Le Combat à budget n'a pas de statistiques Smogon : il prend celles de l'OU. */
const shortFormat = computed(() => props.format === BUDGET_FORMAT ? 'OU' : props.formatName.split(' · ')[0])
const cost = computed(() => props.set && props.format === BUDGET_FORMAT ? costOf(props.set.species) : null)

watch(() => props.index, () => {
  picking.value = false
})

const pick = (id: string) => {
  picking.value = false
  emit('species', id)
}
</script>

<style scoped>
.editor { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; min-width: 0; }

.hero {
  position: relative;
  min-height: 120px;
  padding: 12px 14px;
  background:
    linear-gradient(110deg, rgba(0, 0, 0, .65), rgba(0, 0, 0, .05) 75%),
    var(--habitat, linear-gradient(110deg, color-mix(in srgb, var(--type) 35%, #0b0f16), var(--type)));
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.hero__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.hero__slot { font: 700 12px 'Nunito', sans-serif; opacity: .85; }
.hero__name { margin: 0; font: 700 28px/1 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); }
.hero__types { display: flex; gap: 4px; }

.hero__type {
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  font: 700 11px 'Nunito', sans-serif;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .4);
  display: flex;
  align-items: center;
}

.hero__actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.hero__actions a { text-decoration: none; }

.hero__usage {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, .4);
  font: 700 12px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.hero__sprite {
  flex: none;
  width: 130px;
  height: 110px;
  background: center bottom / contain no-repeat;
  image-rendering: pixelated;
  filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, .35));
}

.editor__body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 16px; }
.nickname { display: flex; align-items: center; gap: 8px; font: 700 13px 'Nunito', sans-serif; }
.nickname__input { width: 200px; height: 32px; font-size: 13px; }
.editor__foot { display: flex; gap: 6px; }

@media (max-width: 560px) {
  .hero__sprite { width: 80px; height: 80px; }
  .hero__name { font-size: 22px; }
}
</style>

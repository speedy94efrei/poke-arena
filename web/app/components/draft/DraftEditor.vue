<template>
  <div role="dialog" aria-modal="true" :aria-label="`Modifier le set de ${pokemon.nom}`" class="overlay" @click.self="emit('close')">
    <div class="editor">
      <div class="editor__head" :style="{ background: hero }">
        <img class="editor__sprite" :src="pokemon.sprite" alt="">
        <span class="editor__title">
          <span class="editor__name">Modifier · {{ pokemon.nom }}</span>
          <span class="editor__talent">Talent fixe : {{ pokemon.talent.nom }}</span>
        </span>
        <span class="editor__spacer" />
        <span class="editor__timer" :class="{ 'editor__timer--urgent': seconds <= 10 }">{{ clock(seconds) }}</span>
      </div>
      <div class="editor__body">
        <div class="editor__column">
          <AtelierMoves :pokemon="pokemon" :variant="local" @update="patch" />
        </div>
        <div class="editor__column">
          <AtelierItem :pokemon="pokemon" :variant="local" @update="patch" />
          <AtelierStats :pokemon="pokemon" :variant="local" @update="patch" />
        </div>
      </div>
      <div class="editor__foot">
        <label class="editor__save" :class="{ 'editor__save--off': full }">
          <input v-model="save" type="checkbox" :disabled="full">
          {{ full ? `Atelier plein (${MAX_VARIANTES}/${MAX_VARIANTES}) : ce set ne servira que pour ce match` : 'Ajouter ce set à l\'Atelier comme nouvelle variante' }}
        </label>
        <button type="button" class="btn" @click="emit('reset')">Revenir au set choisi</button>
        <button type="button" class="btn btn--primary" @click="emit('validate', local, save && !full)">Valider le set</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { Variante } from '~/utils/atelier'

const props = defineProps<{ pokemon: Pokemon, variant: Variante, initialSave: boolean, seconds: number }>()
const emit = defineEmits<{ close: [], reset: [], validate: [variant: Variante, save: boolean] }>()
const { variants } = useAtelier()

const local = ref<Variante>({ ...props.variant, attaquesIds: [...props.variant.attaquesIds], evs: { ...props.variant.evs }, ivs: { ...props.variant.ivs } })
const full = computed(() => variants(props.pokemon.id).length >= MAX_VARIANTES)
const save = ref(props.initialSave)

const hero = computed(() => {
  const [first, second = first] = props.pokemon.types.map(type => TYPE_COLORS[type])
  return `linear-gradient(110deg, ${first}, ${second})`
})

const patch = (changes: Partial<Variante>) => {
  local.value = { ...local.value, ...changes }
}

const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(6, 8, 12, .78);
  display: grid;
  place-items: center;
  padding: 12px;
}

.editor {
  width: min(1100px, 100%);
  max-height: calc(100vh - 24px);
  border-radius: 16px;
  background: var(--fr);
  box-shadow: inset 0 0 0 3px var(--uA), 0 0 0 2px var(--bd), 0 20px 60px rgba(0, 0, 0, .6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: pop .2s both;
}

.editor__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
}

.editor__sprite { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; }
.editor__title { display: flex; flex-direction: column; }
.editor__name { font: 700 22px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); }
.editor__talent { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: #fff; text-shadow: 1px 1px 0 #000; }
.editor__spacer { flex: 1; }

.editor__timer {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, .45);
  color: var(--uA);
  font: 600 20px 'Pixelify Sans', sans-serif;
}

.editor__timer--urgent { color: #ff6a5a; }

.editor__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.editor__column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.editor__foot {
  flex: none;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--pn);
  border-top: 2px solid var(--chip);
}

.editor__save {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font: 700 12px/1.35 'Atkinson Hyperlegible', sans-serif;
}

.editor__save input { accent-color: var(--uA); }
.editor__save--off { color: var(--mu); cursor: default; }

@media (max-width: 860px) {
  .editor__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

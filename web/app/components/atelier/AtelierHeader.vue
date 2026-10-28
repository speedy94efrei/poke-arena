<template>
  <div class="head">
    <div class="head__portrait" :style="{ background: portrait }">
      <img class="head__sprite" :src="pokemon.sprite" :alt="pokemon.nom">
    </div>
    <div class="head__body">
      <div class="head__title">
        <h2 class="head__name">{{ pokemon.nom }}</h2>
        <TypeBadge v-for="type in pokemon.types" :key="type" :type="type" />
        <NuxtLink class="head__link" :to="`/pokedraft/codex?id=${pokemon.id}`">Voir la fiche ▸</NuxtLink>
      </div>
      <div role="tablist" aria-label="Variantes" class="tabs">
        <button
          v-for="(variant, index) in tabs"
          :key="index"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'tab--active': index === current }"
          :aria-selected="index === current"
          @click="emit('select', index)"
        >
          <span
            role="button"
            class="tab__star"
            :class="{ 'tab__star--on': variant.favorite }"
            :aria-label="variant.favorite ? 'Variante favorite' : 'Définir comme favorite'"
            :title="variant.favorite ? 'Variante favorite' : 'Définir comme favorite'"
            @click.stop="emit('favorite', index)"
          >{{ variant.favorite ? '★' : '☆' }}</span>
          {{ variant.nom }}
          <span v-if="variantWarnings(pokemon, variant).length" class="tab__warn">À vérifier</span>
        </button>
        <template v-if="saved && count < MAX_VARIANTES">
          <button type="button" class="tab tab--ghost" @click="emit('add')">+ Nouvelle</button>
          <button type="button" class="tab tab--ghost" @click="emit('duplicate')">Dupliquer</button>
        </template>
        <span class="tabs__spacer" />
        <button v-if="saved" type="button" class="tab tab--danger" @click="emit('remove')">Supprimer</button>
      </div>
      <span class="head__note">
        {{ saved ? 'Les modifications sont enregistrées automatiquement.' : 'Set par défaut de la fiche, prérempli. Toute modification crée la variante 1.' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { Variante } from '~/utils/atelier'

const props = defineProps<{ pokemon: Pokemon, tabs: Variante[], current: number, saved: boolean }>()
const emit = defineEmits<{ select: [index: number], favorite: [index: number], add: [], duplicate: [], remove: [] }>()

const count = computed(() => props.tabs.length)
const portrait = computed(() => {
  const [first, second = first] = props.pokemon.types.map(type => TYPE_COLORS[type])
  return `linear-gradient(160deg, ${first}, ${second})`
})
</script>

<style scoped>
.head {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 12px;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.head__portrait {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, .25);
}

.head__sprite { width: 96px; height: 96px; object-fit: contain; image-rendering: pixelated; }

.head__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.head__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.head__name {
  margin: 0;
  font: 700 26px/1 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
}

.head__link { font: 700 13px 'Atkinson Hyperlegible', sans-serif; }

.tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.tabs__spacer { flex: 1; }

.tab {
  border: 0;
  cursor: pointer;
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--chip);
  color: var(--tx);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab--active { background: var(--uA); color: var(--uAtx); }
.tab--ghost { background: transparent; box-shadow: inset 0 0 0 2px var(--chip); }
.tab--danger { background: transparent; color: #ff8a7a; }
.tab__star { font-size: 15px; }
.tab__star--on { color: var(--uA); }
.tab--active .tab__star--on { color: var(--uAtx); }

.tab__warn {
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  background: #e8704a;
  color: #1a0a00;
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.head__note { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
</style>

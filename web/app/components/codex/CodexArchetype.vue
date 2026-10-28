<template>
  <article class="arch">
    <header class="arch__head" :style="{ background: archetype.couleur }">
      <span class="arch__diamond" />
      <span class="arch__name">{{ archetype.nom }}</span>
      <span class="arch__kind">{{ archetype.motCle ? 'Lanceur + effet' : 'Style de jeu' }}</span>
    </header>
    <div class="arch__body">
      <p v-if="!archetype.membres.length && !archetype.planB.length" class="arch__empty">Aucun Pokémon du roster ne joue cet archétype cette saison.</p>

      <div v-if="archetype.lanceurs.length" class="arch__block">
        <span class="arch__label">{{ archetype.lanceurs.length > 1 ? `Lanceurs (${archetype.lanceurs.length})` : 'Lanceur' }}</span>
        <button v-for="lanceur in archetype.lanceurs" :key="lanceur.pokemon.id" type="button" class="launcher" @click="emit('open', lanceur.pokemon.id)">
          <img class="launcher__sprite" :src="lanceur.pokemon.sprite" alt="" loading="lazy">
          <span class="launcher__text">
            <span class="launcher__name">{{ lanceur.pokemon.nom }} <span class="launcher__source">· {{ lanceur.source }}</span></span>
            <span class="launcher__effect">{{ lanceur.effet }}</span>
          </span>
        </button>
      </div>
      <p v-else-if="archetype.motCle && (archetype.membres.length || archetype.planB.length)" class="arch__note">
        Aucun lanceur cette saison : l'archétype dépend du plan B.
      </p>

      <div v-if="archetype.membres.length" class="arch__block">
        <span class="arch__label">Pokémon</span>
        <div class="arch__chips">
          <CodexMini v-for="pokemon in archetype.membres" :key="pokemon.id" :pokemon="pokemon" @open="id => emit('open', id)" />
        </div>
      </div>

      <div v-if="archetype.planB.length" class="arch__block">
        <span class="arch__label">Plan B si le lanceur est banni · {{ moveName(archetype.attaque!) }} ({{ archetype.planB.length }})</span>
        <div class="arch__chips">
          <CodexMini v-for="pokemon in archetype.planB" :key="pokemon.id" :pokemon="pokemon" tone="cadre" icon-only @open="id => emit('open', id)" />
        </div>
      </div>

      <div v-if="archetype.contres.length" class="arch__block">
        <span class="arch__label">Contre l'archétype</span>
        <div class="arch__chips">
          <CodexMini v-for="contre in archetype.contres" :key="contre.pokemon.id" :pokemon="contre.pokemon" tone="danger" :count="contre.fois" @open="id => emit('open', id)" />
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { ArchetypeInfo } from '~/utils/codex'

defineProps<{
  archetype: ArchetypeInfo & {
    membres: Pokemon[]
    lanceurs: { pokemon: Pokemon, source: string, effet: string }[]
    planB: Pokemon[]
    contres: { pokemon: Pokemon, fois: number }[]
  }
}>()
const emit = defineEmits<{ open: [id: string] }>()
</script>

<style scoped>
.arch {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: pop .3s both;
}

.arch__head {
  height: 38px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.arch__diamond {
  width: 14px;
  height: 14px;
  transform: rotate(45deg);
  background: #fff;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, .35);
}

.arch__name {
  flex: 1;
  font: 600 18px 'Pixelify Sans', sans-serif;
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .45);
}

.arch__kind {
  font: 700 12px 'Nunito', sans-serif;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .5);
}

.arch__body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.arch__empty { margin: 0; font: 400 14px/1.5 'Nunito', sans-serif; color: var(--mu); }

.arch__note {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--in);
  font: 700 13px/1.4 'Nunito', sans-serif;
  color: var(--mu);
}

.arch__block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.arch__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }

.arch__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.launcher {
  border: 0;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--uA);
  color: var(--tx);
}

.launcher__sprite { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; }

.launcher__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.launcher__name { font: 700 15px 'Nunito', sans-serif; }
.launcher__source { color: var(--uT); }
.launcher__effect { font: 400 13px/1.4 'Nunito', sans-serif; color: var(--mu); }
</style>

<template>
  <button type="button" class="card" :class="{ 'card--selected': selected }" :aria-label="pokemon.nom" @click="emit('open', pokemon.id)">
    <span class="card__badges">
      <span v-if="pokemon.correction" class="card__badge card__badge--corrige">✎ Corrigé</span>
      <span v-if="ready" class="card__badge card__badge--pret">✓ Prêt</span>
      <span v-if="toValidate" class="card__badge card__badge--valider">À valider</span>
    </span>
    <span class="card__stage">
      <span class="card__shadow" />
      <img class="card__sprite" :src="pokemon.sprite" alt="" loading="lazy">
      <span v-if="statValue" class="card__stat">{{ statValue }}</span>
    </span>
    <span class="card__name">{{ pokemon.nom }}</span>
    <span class="card__types">
      <TypeBadge v-for="type in pokemon.types" :key="type" :type="type" small />
    </span>
    <span class="card__roles">{{ pokemon.roles.slice(0, 2).join(' · ') }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'

const props = defineProps<{ pokemon: Pokemon, selected: boolean, statKey: string, comite: boolean, ready: boolean }>()
const emit = defineEmits<{ open: [id: string] }>()

const statValue = computed(() => props.statKey !== 'nom' ? props.pokemon.stats[props.statKey as keyof Pokemon['stats']] : null)
const toValidate = computed(() => props.comite && (props.pokemon.talent.aValider || props.pokemon.signature.aValider))
</script>

<style scoped>
.card {
  position: relative;
  text-align: left;
  border: 0;
  cursor: pointer;
  background: var(--pn);
  color: var(--tx);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform .12s;
}

.card:hover { transform: translateY(-3px); }
.card--selected { box-shadow: inset 0 0 0 3px var(--uA), 0 0 0 2px var(--bd); }

.card__badges {
  display: flex;
  gap: 4px;
  min-height: 20px;
  flex-wrap: wrap;
}

.card__badge {
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  font: 700 11px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.card__badge--corrige { background: #e8704a; color: #1a0a00; }
.card__badge--pret { background: #48c070; color: #062010; }
.card__badge--valider { color: var(--uT); box-shadow: inset 0 0 0 2px var(--uA); }

.card__stage {
  position: relative;
  height: 96px;
  border-radius: 8px;
  background: var(--in);
  box-shadow: inset 0 -14px 0 rgba(255, 255, 255, .04);
  display: grid;
  place-items: center;
}

.card__shadow {
  position: absolute;
  width: 54px;
  height: 62px;
  border-radius: 50% 50% 40% 40%;
  background: var(--chip);
  opacity: .7;
}

.card__sprite {
  position: relative;
  width: 96px;
  height: 96px;
  object-fit: contain;
  image-rendering: pixelated;
}

.card__stat {
  position: absolute;
  right: 6px;
  bottom: 4px;
  font: 600 18px 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
  color: var(--uT);
}

.card__name {
  font: 700 15px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__types {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.card__roles {
  font: 700 12px/1.3 'Nunito', sans-serif;
  color: var(--mu);
}
</style>

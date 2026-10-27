<template>
  <CodexBlock title="Objet">
    <template #aside>{{ OBJETS.length }} objets</template>
    <div class="held">
      <span class="held__icon"><ItemIcon :id="variant.objetId" :size="40" /></span>
      <span class="held__text">
        <span class="held__name">
          {{ held?.nom ?? itemName(variant.objetId) }}
          <span v-if="heldSmogon" class="smogon">★ Smogon · {{ heldSmogon.formats.join(' · ') }}</span>
        </span>
        <span class="held__description">{{ held?.description ?? 'Objet absent de la liste proposée : choisis-en un autre.' }}</span>
      </span>
    </div>
    <input v-model="query" class="search" placeholder="Chercher : choix, pièges, soin…" aria-label="Chercher un objet">
    <div class="groups">
      <button
        v-for="option in groups"
        :key="option"
        type="button"
        class="group"
        :class="{ 'group--active': group === option }"
        :aria-pressed="group === option"
        @click="group = option"
      >
        {{ option }}
      </button>
    </div>
    <div class="list">
      <template v-if="recommended.length">
        <span class="list__title list__title--smogon">★ Recommandés par Smogon pour {{ pokemon.nom }} · stats officielles</span>
        <AtelierItemRow v-for="row in recommended" :key="row.objet.id" :objet="row.objet" :formats="row.formats" :selected="row.objet.id === variant.objetId" @pick="pick" />
      </template>
      <template v-if="others.length">
        <span v-if="recommended.length" class="list__title">Tous les objets</span>
        <AtelierItemRow v-for="row in others" :key="row.objet.id" :objet="row.objet" :selected="row.objet.id === variant.objetId" @pick="pick" />
      </template>
      <p v-if="!recommended.length && !others.length" class="none">Aucun objet ne correspond.</p>
    </div>
    <span v-if="!smogon.length" class="note">Pas d'analyse Smogon pour ce Pokémon.</span>
  </CodexBlock>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'
import type { Variante } from '~/utils/atelier'

const ALL = 'Tous'
const SMOGON = '★ Smogon'

const props = defineProps<{ pokemon: Pokemon, variant: Variante }>()
const emit = defineEmits<{ update: [patch: Partial<Variante>] }>()

const query = ref('')
const group = ref(ALL)

const smogon = computed(() => smogonItems(props.pokemon.id))
const smogonById = computed(() => new Map(smogon.value.map(entry => [entry.id, entry.formats])))
const groups = computed(() => [ALL, ...(smogon.value.length ? [SMOGON] : []), ...new Set(OBJETS.map(objet => objet.groupe))])
const held = computed(() => findObjet(props.variant.objetId))
const heldSmogon = computed(() => smogon.value.find(entry => entry.id === props.variant.objetId))

const matches = computed(() => {
  const words = plainText(query.value.trim())
  return OBJETS.filter(objet => (!words || plainText(`${objet.nom} ${objet.description ?? ''}`).includes(words))
    && (group.value === ALL || group.value === SMOGON || objet.groupe === group.value))
})

const recommended = computed(() => smogon.value
  .map(entry => ({ objet: findObjet(entry.id)!, formats: entry.formats }))
  .filter(row => matches.value.includes(row.objet)))

const others = computed(() => group.value === SMOGON
  ? []
  : matches.value.filter(objet => !smogonById.value.has(objet.id)).map(objet => ({ objet })))

const pick = (id: string) => emit('update', { objetId: id })
</script>

<style scoped>
.held {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--in);
  box-shadow: inset 0 0 0 1px var(--uA);
}

.held__icon {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--pn2);
  display: grid;
  place-items: center;
}

.held__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.held__name {
  font: 700 15px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.held__description { font: 400 13px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.smogon {
  height: 18px;
  padding: 0 6px;
  border-radius: 3px;
  background: #2f74a3;
  color: #fff;
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.search {
  height: 34px;
  border: 0;
  border-radius: 7px;
  padding: 0 10px;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  background: #fff;
  color: #22252b;
  outline: none;
}

.groups {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.group {
  border: 0;
  cursor: pointer;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  padding: 4px 8px;
}

.group--active { background: var(--uA); color: var(--uAtx); }

.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--chip) transparent;
}

.list__title {
  padding: 4px 2px 2px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.list__title + .list__title, .list > :not(.list__title) + .list__title { margin-top: 4px; border-top: 2px solid var(--chip); }
.list__title--smogon { color: #9fd8ff; }

.none, .note {
  margin: 0;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.none { padding: 14px; text-align: center; }
</style>

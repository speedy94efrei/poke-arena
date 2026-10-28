<template>
  <div class="moves">
    <div class="moves__title">Attaques <span>Clique une suggestion pour l'ajouter, une attaque choisie pour la retirer.</span></div>
    <div class="chosen">
      <button
        v-for="(slot, index) in chosen"
        :key="index"
        type="button"
        class="chosen__move"
        :class="{ 'chosen__move--empty': !slot }"
        :style="slot ? { '--type': TYPE_COLORS[slot.type] } : undefined"
        :disabled="!slot"
        :aria-label="slot ? `Retirer ${slot.nom}` : `Emplacement ${index + 1} libre`"
        @click="remove(index)"
      >
        <template v-if="slot">
          <b>{{ slot.nom }}</b>
          <span>{{ slot.type }} · {{ slot.category }}{{ slot.power ? ` · ${slot.power}` : '' }}</span>
        </template>
        <span v-else>Libre</span>
      </button>
    </div>

    <div v-if="suggestions.length" class="chips">
      <button v-for="row in suggestions" :key="row.id" type="button" class="chip" :class="{ 'chip--used': row.used }" :disabled="row.used || full" @click="add(row.id)">
        <span class="chip__type" :style="{ background: TYPE_COLORS[row.type] }">{{ row.type }}</span>
        {{ row.nom }}
        <span class="chip__share">{{ percent(row.share) }}</span>
      </button>
    </div>

    <div class="search">
      <input v-model="query" class="field search__input" :placeholder="pool.length ? `Toutes ses attaques (${pool.length})` : 'Chercher une attaque'" aria-label="Chercher une attaque">
      <span v-if="full" class="search__hint">4 attaques choisies : retires-en une pour en ajouter.</span>
    </div>
    <div v-if="query" class="list">
      <button v-for="row in results" :key="row.id" type="button" class="list__row" :disabled="row.used || full" @click="add(row.id)">
        <span class="list__name">{{ row.nom }}</span>
        <span class="list__type" :style="{ background: TYPE_COLORS[row.type] }">{{ row.type }}</span>
        <span class="list__cat">{{ row.category }}</span>
        <span class="list__num">{{ row.power || '—' }}</span>
        <span class="list__num">{{ row.accuracy ?? '∞' }}</span>
      </button>
      <p v-if="!results.length" class="list__none">Aucune attaque apprise ne correspond.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClassicSet } from '~/utils/classicTeam'
import type { UsagePokemon } from '~/utils/usage'

const props = defineProps<{ set: ClassicSet, usage: UsagePokemon | undefined, pool: string[] }>()
const emit = defineEmits<{ update: [patch: Partial<ClassicSet>] }>()
const { dex } = usePokedex()

const SLOTS = 4
const SUGGESTIONS = 16
const query = ref('')

const view = (id: string) => {
  const move = dex.value?.moves[id]
  return { id, nom: move?.nom ?? id, type: move?.type ?? 'Normal', category: move?.category ?? 'Statut', power: move?.power ?? 0, accuracy: move?.accuracy }
}

const chosen = computed(() => Array.from({ length: SLOTS }, (_, index) => props.set.moves[index] ? view(props.set.moves[index]!) : null))
const full = computed(() => props.set.moves.filter(Boolean).length >= SLOTS)

const suggestions = computed(() => (props.usage?.moves ?? [])
  .filter(([id]) => id && id !== 'nothing')
  .slice(0, SUGGESTIONS)
  .map(([id, share]) => ({ ...view(id), share, used: props.set.moves.includes(id) })))

const results = computed(() => {
  const words = plainText(query.value)
  return props.pool
    .map(view)
    .filter(move => plainText(move.nom).includes(words) || plainText(dex.value?.moves[move.id]?.name ?? '').includes(words))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .slice(0, 40)
    .map(move => ({ ...move, used: props.set.moves.includes(move.id) }))
})

const add = (id: string) => {
  if (full.value || props.set.moves.includes(id)) return
  emit('update', { moves: [...props.set.moves.filter(Boolean), id] })
}

const remove = (index: number) => {
  emit('update', { moves: props.set.moves.filter((_, other) => other !== index) })
}
</script>

<style scoped>
.moves { display: flex; flex-direction: column; gap: 8px; }
.moves__title { font: 600 15px 'Pixelify Sans', sans-serif; }
.moves__title span { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); margin-left: 6px; }
.chosen { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }

.chosen__move {
  min-width: 0;
  height: 48px;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 0 10px;
  border-radius: 8px;
  background: linear-gradient(160deg, var(--type), color-mix(in srgb, var(--type) 55%, #0b0f16));
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .25), 0 0 0 2px var(--bd);
  display: flex;
  flex-direction: column;
  justify-content: center;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
}

.chosen__move b { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chosen__move span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chosen__move--empty { background: var(--in); color: var(--mu); text-shadow: none; box-shadow: inset 0 0 0 2px var(--chip); cursor: default; align-items: center; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }

.chip {
  border: 0;
  cursor: pointer;
  height: 28px;
  padding: 0 8px 0 3px;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chip:disabled { cursor: default; }
.chip--used { opacity: .4; }

.chip__type {
  height: 20px;
  padding: 0 5px;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font-size: 10px;
  display: flex;
  align-items: center;
}

.chip__share { color: var(--mu); font-weight: 400; }
.search { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.search__input { flex: 1 1 220px; height: 32px; font-size: 13px; }
.search__hint { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: #ffd0a0; }
.list { display: flex; flex-direction: column; gap: 2px; max-height: 260px; overflow: auto; }

.list__row {
  border: 0;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px 64px 36px 36px;
  gap: 6px;
  align-items: center;
  padding: 5px 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--tx);
  font: 400 13px 'Atkinson Hyperlegible', sans-serif;
}

.list__row:hover:not(:disabled) { background: var(--chip); }
.list__row:disabled { opacity: .45; cursor: default; }
.list__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }

.list__type {
  height: 18px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: grid;
  place-items: center;
}

.list__cat { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.list__num { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }
.list__none { margin: 0; padding: 10px; text-align: center; font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 760px) {
  .chosen { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>

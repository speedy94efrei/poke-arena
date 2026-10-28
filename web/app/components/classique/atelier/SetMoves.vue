<template>
  <div class="moves">
    <div class="moves__title">Attaques <span>Choisis un emplacement, puis clique une attaque de la liste.</span></div>
    <div class="chosen">
      <div v-for="(slot, index) in chosen" :key="index" class="chosen__slot" :class="{ 'chosen__slot--on': index === activeSlot }">
        <button
          type="button"
          class="chosen__move"
          :class="{ 'chosen__move--empty': !slot }"
          :style="slot ? { '--type': TYPE_COLORS[slot.type] } : undefined"
          :aria-pressed="index === activeSlot"
          :aria-label="slot ? `Emplacement ${index + 1} : ${slot.nom}` : `Emplacement ${index + 1} libre`"
          @click="activeSlot = index"
        >
          <template v-if="slot">
            <b>{{ slot.nom }}</b>
            <span>{{ slot.type }} · {{ slot.category }}{{ slot.power ? ` · ${slot.power}` : '' }}</span>
          </template>
          <span v-else>{{ index + 1 }} · libre</span>
        </button>
        <button v-if="slot" type="button" class="chosen__clear" :aria-label="`Retirer ${slot.nom}`" @click="remove(index)">✕</button>
      </div>
    </div>

    <div class="filters">
      <input v-model="query" class="field filters__search" placeholder="Filtrer par nom (facultatif)" aria-label="Filtrer les attaques">
      <select v-model="type" class="field filters__select" aria-label="Type">
        <option value="">Tous les types</option>
        <option v-for="value in types" :key="value" :value="value">{{ value }}</option>
      </select>
      <select v-model="category" class="field filters__select" aria-label="Catégorie">
        <option value="">Catégories</option>
        <option v-for="value in CATEGORIES" :key="value" :value="value">{{ value }}</option>
      </select>
    </div>

    <div class="list" role="listbox" aria-label="Attaques qu'il peut apprendre">
      <div class="list__row list__row--head" aria-hidden="true">
        <span>Attaque</span><span>Type</span><span>Cat.</span><span>Puiss.</span><span>Préc.</span><span>PP</span><span>Joué</span>
      </div>
      <template v-for="group in groups" :key="group.title">
        <span v-if="group.rows.length" class="list__group">{{ group.title }}</span>
        <button
          v-for="row in group.rows"
          :key="row.id"
          type="button"
          role="option"
          class="list__row"
          :class="{ 'list__row--used': row.used }"
          :aria-selected="row.used"
          :aria-label="`${row.nom}, ${row.type}, ${row.category}${row.power ? `, puissance ${row.power}` : ''}`"
          :title="row.description"
          @click="pick(row.id)"
        >
          <span class="list__name">
            <b>{{ row.nom }}</b>
            <span class="list__text">{{ row.description }}</span>
          </span>
          <span class="list__type" :style="{ background: TYPE_COLORS[row.type] }">{{ row.type }}</span>
          <span class="list__cat" :title="row.category" :style="categoryStyle(row.category)" />
          <span class="list__num">{{ row.power || '—' }}</span>
          <span class="list__num">{{ row.accuracy ?? '—' }}</span>
          <span class="list__num">{{ row.pp }}</span>
          <span class="list__num list__num--share">{{ row.share ? percent(row.share) : '' }}</span>
        </button>
      </template>
      <p v-if="!count" class="list__none">Aucune attaque ne correspond.</p>
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
const CATEGORIES = ['Physique', 'Spéciale', 'Statut'] as const
const query = ref('')
const type = ref('')
const category = ref('')
const activeSlot = ref(Math.min(props.set.moves.filter(Boolean).length, SLOTS - 1))

const view = (id: string) => {
  const move = dex.value?.moves[id]
  return {
    id, nom: move?.nom ?? id, name: move?.name ?? id, type: move?.type ?? 'Normal', category: move?.category ?? 'Statut',
    power: move?.power ?? 0, accuracy: move?.accuracy ?? null, pp: move?.pp ?? 0, description: move?.description ?? '',
  }
}

const chosen = computed(() => Array.from({ length: SLOTS }, (_, index) => props.set.moves[index] ? view(props.set.moves[index]!) : null))
const shares = computed(() => new Map((props.usage?.moves ?? []).filter(([id]) => id && id !== 'nothing')))

/** Toutes les attaques qu'il peut apprendre, plus celles déjà jouées par la communauté (même hors de la liste). */
const all = computed(() => [...new Set([...shares.value.keys(), ...props.pool])].map(id => ({ ...view(id), share: shares.value.get(id) ?? 0 })))
const types = computed(() => [...new Set(all.value.map(move => move.type))].sort((a, b) => a.localeCompare(b, 'fr')))

const filtered = computed(() => {
  const words = plainText(query.value)
  return all.value
    .filter(move => (!words || plainText(move.nom).includes(words) || plainText(move.name).includes(words))
      && (!type.value || move.type === type.value) && (!category.value || move.category === category.value))
    .map(move => ({ ...move, used: props.set.moves.includes(move.id) }))
})

/** Comme le teambuilder de Showdown : les attaques jouées dans le format d'abord, puis les autres par puissance. */
const groups = computed(() => [
  { title: 'Les plus jouées dans le format', rows: filtered.value.filter(move => move.share).sort((a, b) => b.share - a.share) },
  { title: 'Toutes ses autres attaques', rows: filtered.value.filter(move => !move.share).sort((a, b) => b.power - a.power || a.nom.localeCompare(b.nom, 'fr')) },
])
const count = computed(() => filtered.value.length)

const categoryStyle = (value: string) => {
  if (value === 'Physique') return { background: '#e8603a', borderRadius: '0', transform: 'rotate(45deg)' }
  if (value === 'Spéciale') return { background: '#5a8ae8', borderRadius: '50%' }
  return { background: '#c0c6d0', borderRadius: '3px' }
}

/** Met l'attaque dans l'emplacement choisi (ou la retire si elle y est déjà), puis passe au prochain emplacement libre. */
const pick = (id: string) => {
  const moves = [...props.set.moves]
  const existing = moves.indexOf(id)
  if (existing >= 0) {
    remove(existing)
    return
  }
  const index = Math.min(activeSlot.value, moves.filter(Boolean).length)
  moves[index] = id
  const next = moves.filter(Boolean)
  emit('update', { moves: next })
  activeSlot.value = Math.min(next.length, SLOTS - 1)
}

const remove = (index: number) => {
  emit('update', { moves: props.set.moves.filter((_, other) => other !== index) })
  activeSlot.value = Math.min(index, props.set.moves.length - 1)
}
</script>

<style scoped>
.moves { display: flex; flex-direction: column; gap: 8px; }
.moves__title { font: 600 15px 'Pixelify Sans', sans-serif; }
.moves__title span { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); margin-left: 6px; }
.chosen { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.chosen__slot { position: relative; min-width: 0; border-radius: 9px; }
.chosen__slot--on { box-shadow: 0 0 0 3px var(--uA); }

.chosen__move {
  width: 100%;
  height: 48px;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 0 26px 0 10px;
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
.chosen__move--empty { background: var(--in); color: var(--mu); text-shadow: none; box-shadow: inset 0 0 0 2px var(--chip); align-items: center; padding: 0 10px; }

.chosen__clear {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  background: rgba(0, 0, 0, .4);
  color: #fff;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
}

.filters { display: flex; gap: 6px; flex-wrap: wrap; }
.filters__search { flex: 1 1 200px; height: 32px; font-size: 13px; }
.filters__select { height: 32px; font-size: 13px; }
.list { display: flex; flex-direction: column; gap: 1px; max-height: 380px; overflow: auto; border-radius: 8px; background: var(--in); padding: 4px; }
.list__group { position: sticky; top: 24px; z-index: 1; padding: 6px 8px 3px; background: var(--in); font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--uA); text-transform: uppercase; letter-spacing: .04em; }

.list__row {
  border: 0;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px 14px 40px 36px 28px 44px;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--tx);
  font: 400 13px 'Atkinson Hyperlegible', sans-serif;
}

.list__row:hover { background: var(--chip); }
.list__row--used { background: color-mix(in srgb, var(--uA) 18%, transparent); box-shadow: inset 3px 0 0 var(--uA); }
.list__row--head { position: sticky; top: 0; z-index: 2; cursor: default; background: var(--in); font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.list__row--head:hover { background: var(--in); }
.list__name { display: flex; flex-direction: column; min-width: 0; }
.list__name b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list__text { font-size: 11px; color: var(--mu); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.list__type {
  height: 18px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: grid;
  place-items: center;
}

.list__cat { width: 10px; height: 10px; box-shadow: 0 0 0 2px rgba(0, 0, 0, .45); }
.list__num { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }
.list__num--share { color: var(--uA); }
.list__none { margin: 0; padding: 10px; text-align: center; font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 760px) {
  .chosen { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .list__row { grid-template-columns: minmax(0, 1fr) 62px 12px 36px 40px; }
  .list__row > :nth-child(5), .list__row > :nth-child(6) { display: none; }
}
</style>

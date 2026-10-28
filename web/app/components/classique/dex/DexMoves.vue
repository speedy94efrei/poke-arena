<template>
  <details class="moves" @toggle="event => open = (event.target as HTMLDetailsElement).open">
    <summary class="moves__head">Attaques apprises <span class="moves__count">{{ rows.length }} dans ce format</span></summary>
    <div v-if="open" class="moves__body">
      <div class="moves__filters">
        <input v-model="query" class="field moves__search" placeholder="Chercher une attaque" aria-label="Chercher une attaque">
        <select v-model="type" class="field moves__select" aria-label="Type">
          <option value="">Tous les types</option>
          <option v-for="value in TYPE_ORDER" :key="value" :value="value">{{ value }}</option>
        </select>
      </div>
      <div class="table" role="table" aria-label="Attaques apprises">
        <div class="table__row table__row--head" role="row">
          <span role="columnheader">Attaque</span><span role="columnheader">Type</span><span role="columnheader">Cat.</span>
          <span role="columnheader">Puiss.</span><span role="columnheader">Préc.</span><span role="columnheader">PP</span>
        </div>
        <div v-for="row in shown" :key="row.id" class="table__row" role="row" :title="row.description">
          <span class="table__name" role="cell">{{ row.nom }}</span>
          <span class="table__type" role="cell" :style="{ background: TYPE_COLORS[row.type] }">{{ row.type }}</span>
          <span class="table__cat" role="cell">{{ row.category }}</span>
          <span class="table__num" role="cell">{{ row.power || '—' }}</span>
          <span class="table__num" role="cell">{{ row.accuracy ?? '∞' }}</span>
          <span class="table__num" role="cell">{{ row.pp }}</span>
        </div>
        <p v-if="!shown.length" class="moves__none">Aucune attaque ne correspond.</p>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
const props = defineProps<{ id: string, baseSpecies: string | undefined, format: string }>()
const { dex } = usePokedex()

const open = ref(false)
const query = ref('')
const type = ref('')
const learnsets = shallowRef<Awaited<ReturnType<typeof loadLearnsets>> | null>(null)

onMounted(async () => {
  learnsets.value = await loadLearnsets()
})

/** Attaques que le Pokémon peut apprendre dans ce format, les plus puissantes d'abord. */
const rows = computed(() => learnableMoves(learnsets.value, props.id, props.baseSpecies ? toId(props.baseSpecies) : undefined, props.format)
  .map(id => ({ id, move: dex.value?.moves[id] }))
  .filter(row => row.move)
  .map(({ id, move }) => ({ id, ...move! }))
  .sort((a, b) => b.power - a.power || a.nom.localeCompare(b.nom, 'fr')))

const shown = computed(() => {
  const words = plainText(query.value)
  return rows.value.filter(row => (!words || plainText(row.nom).includes(words) || plainText(row.name).includes(words)) && (!type.value || row.type === type.value))
})
</script>

<style scoped>
.moves { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.moves__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
}

.moves__head::before { content: '▸'; transition: transform .15s; }
.moves[open] .moves__head::before { transform: rotate(90deg); }
.moves__count { margin-left: auto; font: 700 12px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; }
.moves__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.moves__filters { display: flex; gap: 6px; flex-wrap: wrap; }
.moves__search { flex: 1 1 200px; height: 32px; font-size: 13px; }
.moves__select { height: 32px; font-size: 13px; }
.table { display: flex; flex-direction: column; gap: 2px; max-height: 420px; overflow: auto; }

.table__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px 70px 46px 46px 34px;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font: 400 13px 'Atkinson Hyperlegible', sans-serif;
}

.table__row:not(.table__row--head):hover { background: var(--chip); }
.table__row--head { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); position: sticky; top: 0; background: var(--pn); }
.table__name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.table__type {
  height: 18px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: grid;
  place-items: center;
}

.table__cat { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.table__num { font: 600 13px 'Pixelify Sans', sans-serif; text-align: right; }
.moves__none { margin: 0; padding: 10px; text-align: center; font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 560px) {
  .table__row { grid-template-columns: minmax(0, 1fr) 70px 40px 40px; }
  .table__row > :nth-child(3), .table__row > :nth-child(6) { display: none; }
}
</style>

<template>
  <div class="natures">
    <div class="grid" role="table" aria-label="Tableau des natures">
      <span class="grid__corner" role="columnheader">+ \ −</span>
      <span v-for="stat in GRID_STATS" :key="`col-${stat}`" class="grid__minus" role="columnheader">− {{ statLabel(stat) }}</span>
      <template v-for="row in rows" :key="row.stat">
        <span class="grid__plus" role="rowheader">+ {{ statLabel(row.stat) }}</span>
        <div v-for="cell in row.cells" :key="cell.id" class="grid__cell" :class="{ 'grid__cell--neutral': cell.neutral }" role="cell">
          <b>{{ cell.nom }}</b><span>{{ cell.english }}</span>
        </div>
      </template>
    </div>
    <div class="help">
      <span class="help__title">Comment lire le tableau</span>
      <p>Une nature augmente une statistique de 10 % (sa ligne) et en baisse une autre de 10 % (sa colonne). Les cinq natures de la diagonale sont neutres.</p>
      <p>En stratégie, on baisse presque toujours la statistique d'attaque que le Pokémon n'utilise pas : Jovial ou Rigide pour un attaquant physique, Timide ou Modeste pour un attaquant spécial.</p>
      <p v-if="popular.length">Les plus jouées en {{ formatName }} : {{ popular.join(', ') }}.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatId } from '~/utils/showdownTeam'
import type { UsageData } from '~/utils/usage'

const props = defineProps<{ usage: UsageData | null, formatName: string }>()

const GRID_STATS: StatId[] = ['atk', 'def', 'spa', 'spd', 'spe']
/** Les natures neutres, chacune sur la case de la diagonale où Showdown la range. */
const NEUTRAL: Record<string, string> = { atk: 'hardy', def: 'docile', spa: 'bashful', spd: 'quirky', spe: 'serious' }

const english = (id: string) => id.charAt(0).toUpperCase() + id.slice(1)

const rows = computed(() => GRID_STATS.map(plus => ({
  stat: plus,
  cells: GRID_STATS.map((minus) => {
    const nature = plus === minus ? findNature(NEUTRAL[plus]!) : NATURES.find(entry => entry.plus === plus && entry.moins === minus)
    return { id: `${plus}-${minus}`, nom: nature?.nom ?? '', english: nature ? english(nature.id) : '', neutral: plus === minus }
  }),
})))

/** Natures les plus fréquentes dans les répartitions d'EV du format, pondérées par l'usage. */
const popular = computed(() => {
  const weights = new Map<string, number>()
  for (const entry of props.usage?.pokemon ?? []) {
    for (const [spread, share] of entry.spreads) {
      const nature = toId(spread.split(':')[0] ?? '')
      weights.set(nature, (weights.get(nature) ?? 0) + share * entry.usage)
    }
  }
  return [...weights].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => findNature(id)?.nom ?? id)
})
</script>

<style scoped>
.natures { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 12px; align-items: start; }

.grid {
  display: grid;
  grid-template-columns: 76px repeat(5, minmax(0, 1fr));
  gap: 4px;
  padding: 10px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  overflow-x: auto;
}

.grid__corner, .grid__minus, .grid__plus { font: 700 11px 'Nunito', sans-serif; display: flex; align-items: center; }
.grid__corner { color: var(--mu); }
.grid__minus { justify-content: center; color: #ff9a8a; }
.grid__plus { color: #8adca0; }

.grid__cell {
  min-height: 44px;
  padding: 4px;
  border-radius: 6px;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--chip);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font: 400 10px 'Nunito', sans-serif;
  color: var(--mu);
}

.grid__cell b { font-size: 13px; color: var(--tx); }
.grid__cell--neutral { background: var(--dk); --tx: var(--dkTx); --mu: var(--dkMu); --chip: var(--dkChip); color: var(--tx); opacity: .75; }
.help { padding: 12px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 8px; }
.help__title { font: 600 15px 'Pixelify Sans', sans-serif; }
.help p { margin: 0; font: 400 13px/1.5 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 900px) {
  .natures { grid-template-columns: minmax(0, 1fr); }
  .grid { grid-template-columns: 60px repeat(5, minmax(54px, 1fr)); }
}
</style>

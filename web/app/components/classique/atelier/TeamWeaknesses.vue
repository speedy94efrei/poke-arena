<template>
  <section class="weak" aria-label="Faiblesses de l'équipe">
    <header class="weak__head">
      Faiblesses de l'équipe
      <span v-if="shared.length" class="weak__aside">⚠ Faiblesse partagée : {{ shared.map(row => `${row.type} (${row.weak})`).join(', ') }}</span>
    </header>
    <div class="weak__body">
      <p v-if="!sets.length" class="weak__empty">Ajoute des Pokémon pour voir les faiblesses de l'équipe.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Type d'attaque</span></th>
            <th v-for="(set, index) in sets" :key="index" scope="col">
              <span class="table__mon" :title="dex?.pokemon[set.species]?.nom ?? set.species" :style="{ backgroundImage: `url(${sprite(set.species)})` }" />
            </th>
            <th scope="col" class="table__count">Faibles / Rés.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.type">
            <th scope="row"><span class="table__type" :style="{ background: TYPE_COLORS[row.type] }">{{ row.type }}</span></th>
            <td v-for="(value, index) in row.cells" :key="index" :class="cellClass(value)">{{ cellText(value) }}</td>
            <td class="table__count" :class="{ 'table__count--bad': row.weak >= 3 && row.weak > row.resist }">{{ row.weak }} / {{ row.resist }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ClassicSet } from '~/utils/classicTeam'

const props = defineProps<{ sets: ClassicSet[] }>()
const { dex, sprite } = usePokedex()

const rows = computed(() => weaknessTable(props.sets, dex.value))
const shared = computed(() => rows.value.filter(row => row.weak >= 3).sort((a, b) => b.weak - a.weak))

const cellText = (value: number) => {
  if (value === 1) return ''
  if (value === 0) return '0'
  if (value < 1) return value === 0.25 ? '¼' : '½'
  return `×${value}`
}

const cellClass = (value: number) => {
  if (value === 0) return 'cell cell--immune'
  if (value > 1) return value >= 4 ? 'cell cell--weak4' : 'cell cell--weak'
  return value < 1 ? 'cell cell--resist' : 'cell'
}
</script>

<style scoped>
.weak { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.weak__head {
  min-height: 34px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.weak__aside { margin-left: auto; font: 700 12px 'Nunito', sans-serif; text-shadow: none; }
.weak__body { padding: 10px 12px 12px; overflow-x: auto; }
.weak__empty { margin: 0; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.table { width: 100%; border-collapse: separate; border-spacing: 3px; font: 700 12px 'Nunito', sans-serif; }
.table th { font-weight: 700; }
.table__mon { display: block; width: 44px; height: 34px; margin: 0 auto; background: center / 40px no-repeat; image-rendering: pixelated; }

.table__type {
  display: flex;
  align-items: center;
  width: 78px;
  height: 22px;
  padding: 0 7px;
  box-sizing: border-box;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font-size: 11px;
}

.cell { height: 22px; min-width: 40px; border-radius: 4px; background: var(--in); text-align: center; }
.cell--weak { background: #d8573a; color: #fff; }
.cell--weak4 { background: #a8201a; color: #fff; }
.cell--resist { background: #3a9a58; color: #fff; }
.cell--immune { background: #1f2430; color: #c0c8d8; box-shadow: inset 0 0 0 2px #46566e; }
.table__count { min-width: 64px; text-align: center; color: var(--mu); font-size: 11px; }
td.table__count { background: var(--in); border-radius: 4px; color: var(--tx); font: 600 13px 'Pixelify Sans', sans-serif; }
td.table__count--bad { background: #5a1f18; color: #ffb0a0; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>

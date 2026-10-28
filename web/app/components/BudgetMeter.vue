<template>
  <section class="meter" :class="`meter--${tone}`" aria-label="Budget de l'équipe">
    <div class="meter__count" role="status">
      <span class="meter__total">{{ total }}</span><span class="meter__max">/ {{ budget }}</span>
    </div>
    <div class="meter__main">
      <div class="meter__bar" role="progressbar" :aria-valuenow="total" aria-valuemin="0" :aria-valuemax="budget" aria-label="Points dépensés">
        <span class="meter__fill" :style="{ width: `${Math.min(100, (total / budget) * 100)}%` }" />
      </div>
      <span class="meter__text">{{ message }}</span>
    </div>
    <div class="meter__team">
      <button
        v-for="(entry, slot) in rows"
        :key="`${slot}-${entry.id}`"
        type="button"
        class="meter__mon"
        :class="{ 'meter__mon--current': slot === current, 'meter__mon--banned': entry.cost === null }"
        :aria-label="`${entry.name} : ${entry.cost === null ? 'interdit' : `${entry.cost} points`}`"
        @click="emit('select', slot)"
      >
        <span class="meter__icon" :style="{ backgroundImage: `url(${sprite(entry.id)})` }" />
        <span class="meter__cost">{{ entry.cost === null ? '✕' : entry.cost }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{ species: string[], current: number }>()
const emit = defineEmits<{ select: [slot: number] }>()
const { dex, sprite } = usePokedex()
const { costOf, budget } = useBudget()

const rows = computed(() => props.species.map(id => ({ id, name: dex.value?.pokemon[id]?.nom ?? id, cost: costOf(id) })))
const total = computed(() => rows.value.reduce((sum, entry) => sum + (entry.cost ?? 0), 0))
const tone = computed(() => rows.value.some(entry => entry.cost === null) ? 'over' : budgetTone(total.value, budget.value))
const message = computed(() => {
  const banned = rows.value.find(entry => entry.cost === null)
  if (banned) return `${banned.name} est interdit en Combat à budget (Uber ou AG).`
  if (total.value > budget.value) return `${total.value - budget.value} point${total.value - budget.value > 1 ? 's' : ''} de trop : le serveur refusera l'équipe.`
  const left = budget.value - total.value
  return left ? `Il te reste ${left} point${left > 1 ? 's' : ''}${props.species.length < 6 ? ` pour ${6 - props.species.length} Pokémon de plus` : ''}.` : 'Budget dépensé au point près.'
})
</script>

<style scoped>
.meter {
  --tone: var(--good);
  padding: 10px 14px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: inset 0 0 0 2px var(--tone), var(--pnS);
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.meter--full { --tone: #d89a1a; }
.meter--over { --tone: var(--bad); }
.meter__count { display: flex; align-items: baseline; gap: 4px; }
.meter__total { font: 700 34px/1 'Pixelify Sans', sans-serif; color: var(--tone); text-shadow: var(--sh); }
.meter__max { font: 600 18px 'Pixelify Sans', sans-serif; color: var(--mu); }
.meter__main { flex: 1 1 220px; display: flex; flex-direction: column; gap: 5px; }
.meter__bar { height: 12px; border-radius: 4px; background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); overflow: hidden; }
.meter__fill { display: block; height: 100%; background: repeating-linear-gradient(90deg, var(--tone) 0 8px, color-mix(in srgb, var(--tone) 80%, #000) 8px 10px); transition: width .3s; }
.meter__text { font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
.meter__team { display: flex; gap: 5px; flex-wrap: wrap; }

.meter__mon {
  border: 0;
  cursor: pointer;
  width: 52px;
  padding: 2px 0 4px;
  border-radius: 8px;
  background: var(--in);
  box-shadow: inset 0 0 0 2px var(--chip);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--tx);
}

.meter__mon--current { box-shadow: inset 0 0 0 2px var(--uA); }
.meter__mon--banned { box-shadow: inset 0 0 0 2px var(--bad); }
.meter__icon { width: 40px; height: 30px; background: center / 40px no-repeat; image-rendering: pixelated; }
.meter__cost { font: 600 14px 'Pixelify Sans', sans-serif; }
.meter__mon--banned .meter__cost { color: var(--bad); }
</style>

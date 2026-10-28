<template>
  <div class="scale">
    <div class="scale__head">
      <h1 class="scale__title">Barème et coûts</h1>
      <span class="scale__subtitle">{{ live ? (month ? `Coûts ajustés le 1er ${monthName}` : 'Coûts de départ, d\'après les tiers Smogon Gen 9') : 'Coûts de départ calculés sur ton navigateur : connecte-toi pour ceux du serveur' }}</span>
    </div>

    <div class="grid">
      <section class="panel" aria-label="Coût par tier">
        <header class="panel__head">Coût de départ par tier</header>
        <div role="table" class="tiers">
          <div v-for="tier in tiers" :key="tier.tier" role="row" class="tier" :class="{ 'tier--banned': tier.cost === null }">
            <span class="tier__name">{{ tier.label }}</span>
            <span class="tier__count">{{ tier.count ? `${tier.count} Pokémon` : '' }}</span>
            <span class="tier__cost">{{ tier.cost === null ? 'Interdit' : `${tier.cost} pts` }}</span>
          </div>
        </div>
        <p class="panel__note">Les tiers BL (trop forts pour leur tier, pas assez pour celui du dessus) coûtent entre les deux. Avec 100 points, impossible d'aligner plus de 3 OU, et 3 OU obligent à compléter avec des Pokémon non classés.</p>
      </section>

      <section class="panel" aria-label="Coûts mensuels">
        <header class="panel__head">Les coûts bougent chaque mois</header>
        <div role="table" class="tiers">
          <div v-for="rule in ADJUSTMENTS" :key="rule.usage" role="row" class="tier">
            <span class="tier__name">{{ rule.usage }}</span>
            <span class="tier__cost" :class="rule.delta > 0 ? 'tier__cost--up' : rule.delta < 0 ? 'tier__cost--down' : ''">{{ rule.delta > 0 ? `+${rule.delta}` : rule.delta < 0 ? `−${-rule.delta}` : '=' }}</span>
          </div>
        </div>
        <ul class="rules">
          <li>Usage compté sur les combats classés au-dessus de 1 300 d'Elo, pour ne pas être faussé par les débutants.</li>
          <li>Jamais plus de 8 points d'écart avec le coût de départ, jamais moins de 2 points.</li>
          <li>Nouveaux coûts publiés le 1er de chaque mois.</li>
        </ul>
      </section>
    </div>

    <section class="panel" aria-label="Tous les coûts">
      <header class="panel__head">Tous les Pokémon autorisés<span class="panel__aside">{{ rows.length }} sur {{ list.length }}</span></header>
      <div class="filters">
        <input v-model="search" class="field filters__search" placeholder="Nom français ou anglais" aria-label="Chercher un Pokémon">
        <select v-model="order" class="field" aria-label="Trier">
          <option value="expensive">Plus chers d'abord</option>
          <option value="cheap">Moins chers d'abord</option>
          <option value="name">Par nom</option>
        </select>
      </div>
      <div class="list" role="table" aria-label="Coûts">
        <div v-for="row in rows" :key="row.id" role="row" class="row">
          <span class="row__icon" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
          <span class="row__name">{{ row.name }}</span>
          <span class="row__tier">{{ row.tier }}</span>
          <span class="row__cost">{{ row.cost }}<small v-if="row.cost !== row.base">({{ row.base }})</small></span>
        </div>
        <p v-if="!rows.length" class="panel__note">Aucun Pokémon ne correspond.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Barème · Combat à budget' })

const ADJUSTMENTS = [
  { usage: 'Plus de 25 % des équipes', delta: 3 },
  { usage: '15 à 25 %', delta: 1 },
  { usage: '2 à 15 %', delta: 0 },
  { usage: '0,5 à 2 %', delta: -1 },
  { usage: 'Moins de 0,5 %', delta: -2 },
]
const LIMIT = 120

const { dex, sprite } = usePokedex()
const { list, month, live } = useBudget()
const search = ref('')
const order = ref<'expensive' | 'cheap' | 'name'>('expensive')

const monthName = computed(() => month.value ? new Date(`${month.value}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '')
const named = computed(() => list.value.map(entry => ({ ...entry, name: dex.value?.pokemon[entry.id]?.nom ?? entry.id, english: dex.value?.pokemon[entry.id]?.name ?? entry.id })))

/** Les tiers classés ; tous les autres Pokémon autorisés (NFE, LC) sont « non classés ». */
const RANKED = BUDGET_TIERS.filter(tier => tier.tier !== 'NFE' && tier.cost !== null).map(tier => tier.tier)
const tiers = computed(() => BUDGET_TIERS.map((tier) => {
  const count = tier.cost === null ? 0 : list.value.filter(entry => tier.tier === 'NFE' ? !RANKED.includes(entry.tier) : entry.tier === tier.tier).length
  return { ...tier, count }
}))

const rows = computed(() => {
  const words = plainText(search.value)
  const filtered = named.value.filter(entry => !words || plainText(entry.name).includes(words) || plainText(entry.english).includes(words))
  const sorted = [...filtered].sort((a, b) => order.value === 'name'
    ? a.name.localeCompare(b.name, 'fr')
    : (order.value === 'cheap' ? 1 : -1) * (a.cost - b.cost) || a.name.localeCompare(b.name, 'fr'))
  return sorted.slice(0, LIMIT)
})
</script>

<style scoped>
.scale { display: flex; flex-direction: column; gap: 12px; }
.scale__head { display: flex; flex-direction: column; gap: 2px; }
.scale__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.scale__subtitle { font: 700 14px 'Nunito', sans-serif; color: var(--mu); }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }
.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; display: flex; flex-direction: column; }

.panel__head {
  height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 16px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel__aside { font: 700 12px 'Nunito', sans-serif; text-shadow: none; opacity: .9; }
.panel__note { margin: 0; padding: 0 12px 12px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.tiers { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
.tier { display: grid; grid-template-columns: minmax(0, 1fr) auto 70px; gap: 8px; align-items: center; height: 28px; padding: 0 8px; border-radius: 6px; background: var(--in); }
.tier--banned { opacity: .65; }
.tier__name { font: 700 14px 'Nunito', sans-serif; }
.tier__count { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.tier__cost { font: 600 16px 'Pixelify Sans', sans-serif; text-align: right; }
.tier__cost--up { color: var(--bad); }
.tier__cost--down { color: var(--good); }
.rules { margin: 0; padding: 0 12px 12px 30px; display: flex; flex-direction: column; gap: 4px; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.filters { padding: 10px 12px 0; display: flex; gap: 8px; }
.filters__search { flex: 1; }
.list { padding: 10px 12px 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 4px; }
.row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto 52px; gap: 6px; align-items: center; padding: 2px 8px 2px 2px; border-radius: 6px; background: var(--in); }
.row__icon { width: 36px; height: 28px; background: center / 36px no-repeat; image-rendering: pixelated; }
.row__name { font: 700 13px 'Nunito', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row__tier { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.row__cost { font: 600 16px 'Pixelify Sans', sans-serif; text-align: right; }
.row__cost small { margin-left: 3px; font: 700 10px 'Nunito', sans-serif; color: var(--mu); }

@media (max-width: 900px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

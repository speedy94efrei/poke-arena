<template>
  <div class="guide">
    <div class="guide__head">
      <div class="guide__heading">
        <h1 class="guide__title">Guide</h1>
        <span class="guide__subtitle">Objets, talents, natures, IV et EV expliqués</span>
      </div>
      <ClassiqueUsageFormatSelect v-model="format" />
    </div>

    <div class="tabs" role="tablist" aria-label="Rubriques du guide">
      <NuxtLink v-for="entry in TABS" :key="entry.id" :to="{ query: { onglet: entry.id } }" role="tab" class="tab" :class="{ 'tab--on': tab === entry.id }" :aria-selected="tab === entry.id">{{ entry.label }}</NuxtLink>
    </div>

    <div v-if="tab === 'objets' || tab === 'talents'" class="cards">
      <article v-for="card in cards" :key="card.id" class="card">
        <header class="card__head">
          <span v-if="card.sprite !== undefined" class="card__icon" :style="itemIconStyle(card.sprite, 24)" />
          <span class="card__names"><b>{{ card.nom }}</b><span>{{ card.name }}</span></span>
          <span v-if="card.share >= 0.005" class="card__share" :title="`Part du méta de ${formatName} (pondérée par l'usage) qui le joue en premier choix`">{{ percent(card.share) }} du méta</span>
        </header>
        <p class="card__text">{{ card.description }}</p>
        <p class="card__tip">{{ card.tip }}</p>
      </article>
    </div>

    <ClassiqueGuideNatures v-else-if="tab === 'natures'" :usage="usage" :format-name="formatName" />

    <div v-else class="ivs">
      <div class="ivs__text">
        <section class="explain">
          <span class="explain__title">IV · valeurs individuelles</span>
          <p>Chaque Pokémon a un IV de 0 à 31 par statistique, comme une « génétique ». En combat compétitif on considère qu'ils sont tous à 31 : sur Showdown, c'est la valeur par défaut. Exception : 0 en Attaque pour un attaquant spécial (moins de dégâts reçus par Jeu Truqué ou la confusion), 0 en Vitesse pour une équipe Distorsion.</p>
        </section>
        <section class="explain">
          <span class="explain__title">EV · points d'effort</span>
          <p>Tu as 510 EV à répartir, 252 au maximum par statistique. 4 EV donnent 1 point de statistique au niveau 100. La répartition classique est 252 / 252 / 4 : tout dans les deux statistiques utiles, le reste ailleurs.</p>
          <p v-if="example" class="explain__example">{{ example }}</p>
        </section>
      </div>
      <ClassiqueGuideCalculator :usage="usage" />
    </div>
  </div>
</template>

<script setup lang="ts">
type Tab = 'objets' | 'talents' | 'natures' | 'iv-ev'

useHead({ title: 'Guide · Classique' })

const TABS: { id: Tab, label: string }[] = [
  { id: 'objets', label: 'Objets' },
  { id: 'talents', label: 'Talents' },
  { id: 'natures', label: 'Natures' },
  { id: 'iv-ev', label: 'IV et EV' },
]

const ITEMS: [string, string][] = [
  ['leftovers', 'Le classique des Pokémon défensifs.'],
  ['heavydutyboots', "Indispensable si l'adversaire pose Piège de Roc."],
  ['rockyhelmet', 'Punit les attaques de contact comme Close Combat.'],
  ['boosterenergy', 'Active Paléosynthèse ou Charge Quantique sans soleil ni champ.'],
  ['choicescarf', 'Pour doubler les Pokémon plus rapides, au prix de la liberté.'],
  ['choiceband', 'Puissance brute pour les attaquants physiques.'],
  ['choicespecs', 'Puissance brute pour les attaquants spéciaux.'],
  ['lifeorb', 'Plus de dégâts sans être bloqué sur une attaque.'],
  ['assaultvest', 'Encaisse les attaques spéciales, mais interdit les attaques de statut.'],
  ['focussash', 'Garantit de survivre à un coup si tes PV sont pleins.'],
  ['sitrusberry', 'Un soin ponctuel quand les PV passent sous la moitié.'],
  ['toxicorb', 'Avec Soin Poison (Scorvol) : soin à chaque tour.'],
]

const ABILITIES: [string, string][] = [
  ['protosynthesis', 'Sous le soleil ou avec Énergie Booster, la meilleure statistique monte de 30 % (50 % pour la Vitesse).'],
  ['quarkdrive', 'Pareil que Paléosynthèse, mais avec le Champ Électrifié.'],
  ['supremeoverlord', '+10 % de puissance par allié K.O., jusqu\'à cinq : Scalpereur finit les combats.'],
  ['goodasgold', 'Insensible aux attaques de statut adverses : Provoc, Feu Follet, Anti-Brume…'],
  ['regenerator', 'Récupère un tiers de ses PV en quittant le terrain : parfait pour les équipes qui changent souvent.'],
  ['intimidate', "Baisse l'Attaque des adversaires d'un niveau à son entrée, encore plus fort en double."],
  ['levitate', 'Immunisé aux attaques Sol, aux Picots et à la Toile Gluante.'],
  ['magicguard', 'Ne subit que les dégâts des attaques : ni poison, ni météo, ni Orbe Vie.'],
  ['swiftswim', 'Vitesse doublée sous la pluie : le moteur des équipes pluie.'],
  ['multiscale', 'Dégâts divisés par deux quand ses PV sont pleins (Dracolosse).'],
  ['unaware', "Ignore les changements de statistiques de l'adversaire : l'arme anti-boost des équipes stall."],
  ['sturdy', 'Survit à un coup avec 1 PV si ses PV sont pleins, et ne craint pas les attaques K.O. en un coup.'],
]

const route = useRoute()
const { dex } = usePokedex()
const { format, usage, formatName } = useUsageFormat()

const tab = computed<Tab>(() => TABS.find(entry => entry.id === route.query.onglet)?.id ?? 'objets')

/** Part des Pokémon du format, pondérée par l'usage, qui jouent cet objet ou ce talent en premier choix. */
const shares = computed(() => {
  const kind = tab.value === 'objets' ? 'items' : 'abilities'
  const weights = new Map<string, number>()
  const total = (usage.value?.pokemon ?? []).reduce((sum, entry) => sum + entry.usage, 0) || 1
  for (const entry of usage.value?.pokemon ?? []) {
    const first = entry[kind][0]?.[0]
    if (first) weights.set(first, (weights.get(first) ?? 0) + entry.usage / total)
  }
  return weights
})

const cards = computed(() => (tab.value === 'objets' ? ITEMS : ABILITIES).map(([id, tip]) => {
  const entry = tab.value === 'objets' ? dex.value?.items[id] : dex.value?.abilities[id]
  return { id, tip, nom: entry?.nom ?? id, name: entry?.name ?? id, description: entry?.description ?? '', sprite: tab.value === 'objets' ? entry?.sprite : undefined, share: shares.value.get(id) ?? 0 }
}))

/** Exemple de répartition tiré du Pokémon le plus joué du format. */
const example = computed(() => {
  const first = usage.value?.pokemon[0]
  const spread = first?.spreads[0]?.[0]
  if (!first || !spread) return ''
  const { nature, evs } = parseSpread(spread)
  const evText = STATS.filter(stat => evs[stat.id]).map(stat => `${evs[stat.id]} ${stat.label}`).join(' / ')
  return `${dex.value?.pokemon[first.id]?.nom ?? first.id}, exemple ${formatName.value} : ${findNature(nature)?.nom ?? nature} · ${evText}`
})
</script>

<style scoped>
.guide { display: flex; flex-direction: column; gap: 12px; }
.guide__head { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.guide__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.guide__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.guide__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; }

.tab {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  background: var(--pn);
  color: var(--tx);
  box-shadow: var(--pnS);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  text-decoration: none;
}

.tab:hover { text-decoration: none; }
.tab--on { background: var(--hd); color: var(--hdTx); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.card { padding: 10px 12px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 6px; }
.card__head { display: flex; align-items: center; gap: 8px; }
.card__icon { flex: none; display: block; }
.card__names { flex: 1; display: flex; flex-direction: column; min-width: 0; font: 400 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.card__names b { font-size: 15px; color: var(--tx); }
.card__share { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--uA); white-space: nowrap; }
.card__text { margin: 0; font: 400 13px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.card__tip { margin: 0; padding: 6px 8px; border-radius: 6px; background: var(--in); font: 700 12px/1.45 'Atkinson Hyperlegible', sans-serif; }
.ivs { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.ivs__text { display: flex; flex-direction: column; gap: 12px; }
.explain { padding: 12px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 8px; }
.explain__title { font: 600 16px 'Pixelify Sans', sans-serif; }
.explain p { margin: 0; font: 400 13px/1.5 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.explain .explain__example { color: var(--tx); font-weight: 700; }

@media (max-width: 900px) {
  .ivs { grid-template-columns: minmax(0, 1fr); }
}
</style>

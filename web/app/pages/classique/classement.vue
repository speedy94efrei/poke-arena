<template>
  <div class="ranking">
    <div class="ranking__head">
      <div class="ranking__heading">
        <h1 class="ranking__title">Classement Elo</h1>
        <span class="ranking__subtitle">Classique · Smogon · un classement par format</span>
      </div>
    </div>

    <LobbyConnection v-if="!connected" />
    <template v-else>
      <ClassiqueLadderFormats v-model="format" :ratings="ratings" />

      <div v-if="cards.length" class="mine" aria-label="Tes classements">
        <button v-for="card in cards" :key="card.id" type="button" class="mine__card" :class="{ 'mine__card--on': card.id === format }" @click="format = card.id">
          <span class="mine__format">{{ card.label }}</span>
          <span class="mine__elo" :style="{ color: eloTier(card.row.elo).color }">{{ Math.round(card.row.elo) }}</span>
          <span class="mine__line">
            <span v-if="card.week" class="mine__trend" :class="{ 'mine__trend--down': card.week < 0 }">{{ card.week > 0 ? '▲' : '▼' }} {{ signed(card.week) }} · 7 j</span>
            #{{ card.row.rank }}
          </span>
          <span class="mine__sub">{{ card.rate }} de victoires · {{ card.row.wins + card.row.losses }} combat{{ card.row.wins + card.row.losses > 1 ? 's' : '' }}</span>
        </button>
      </div>

      <div class="ranking__body">
        <ClassiqueLadderTable :rows="rows" :format-name="formatName" :me="store.name" :selected="picked?.name ?? ''" :loading="loading" @select="name => pickedName = name" />
        <div class="ranking__side">
          <ClassiqueLadderPlayerCard v-if="picked" :row="picked" :format="format" :format-name="formatName" :mine="isMe(picked)" @play="play" />
          <section class="help" aria-label="Comment marche l'Elo">
            <span class="help__title">Comment marche l'Elo</span>
            <p>Chaque format a son propre Elo, qui part de 1 000. Gagner contre un joueur mieux classé rapporte plus de points, perdre contre un joueur moins bien classé en coûte plus.</p>
            <div class="tiers">
              <span v-for="tier in ELO_TIERS" :key="tier.name" class="tiers__item"><b :style="{ color: tier.color }">{{ tier.name }}</b>{{ tier.min.toLocaleString('fr-FR') }}+</span>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { EloRow } from '~/utils/ladder'

useHead({ title: 'Classement Elo · Classique' })

const MY_FORMATS = ['gen9ou', 'gen9uu', 'gen9ru', 'gen9nu', 'gen9pu', 'gen9zu', 'gen9ubers', 'gen9lc', 'gen9monotype', 'gen9nationaldex', 'gen9randombattle', 'gen9doublesou', 'gen9randomdoublesbattle', 'gen8ou', 'gen7ou', 'gen6ou', 'gen5ou', 'gen4ou', 'gen3ou', 'gen2ou', 'gen1ou']
const DAY = 24 * 3600 * 1000

const route = useRoute()
const { store, query } = useShowdown()
const { history } = useBattleHistory()
const format = useState('classic-format', () => 'gen9ou')
if (typeof route.query.format === 'string') format.value = route.query.format

const rows = ref<EloRow[]>([])
const ratings = ref<Record<string, EloRow>>({})
const loading = ref(false)
const pickedName = ref('')

const connected = computed(() => store.status === 'connecte')
const ladders = computed(() => store.formats.flatMap(section => section.formats).filter(entry => entry.ladder))
const formatName = computed(() => {
  const entry = ladders.value.find(candidate => candidate.id === format.value)
  return entry ? formatLabel(entry.name) : formatIdLabel(format.value)
})
const isMe = (row: EloRow) => toId(row.name) === toId(store.name)
const picked = computed(() => rows.value.find(row => row.name === pickedName.value) ?? rows.value.find(isMe) ?? rows.value[0])

const loadLadder = async () => {
  loading.value = true
  const response = await query<[string, string]>('laddertop', format.value)
  rows.value = response ? parseLadderTop(response[1]) : []
  loading.value = false
}

/** Tes cotes dans les ladders les plus joués et ceux de ton historique, une requête après l'autre. */
const loadRatings = async () => {
  const me = toId(store.name)
  if (!me) return
  const vgc = ladders.value.filter(entry => /^gen9vgc\d/.test(entry.id)).map(entry => entry.id)
  const ids = [...new Set([...MY_FORMATS, ...vgc, ...history.value.map(entry => entry.format)])].filter(id => ladders.value.some(entry => entry.id === id))
  const found: Record<string, EloRow> = {}
  for (const id of ids) {
    const response = await query<[string, string]>('laddertop', `${id}, ${me}`)
    const row = response ? parseLadderTop(response[1]).find(entry => toId(entry.name) === me) : undefined
    if (row) found[id] = row
  }
  ratings.value = found
}

const cards = computed(() => Object.entries(ratings.value).map(([id, row]) => {
  const since = Date.now() - 7 * DAY
  const week = history.value.filter(entry => entry.format === id && entry.delta !== undefined && Date.parse(entry.at) >= since).reduce((sum, entry) => sum + entry.delta!, 0)
  const entry = ladders.value.find(candidate => candidate.id === id)
  return { id, row, week, label: entry ? formatLabel(entry.name) : formatIdLabel(id), rate: row.wins + row.losses ? percent(row.wins / (row.wins + row.losses)) : '—' }
}).sort((a, b) => b.row.elo - a.row.elo))

watch([format, connected], () => {
  pickedName.value = ''
  if (connected.value) loadLadder()
}, { immediate: true })

watch([connected, () => ladders.value.length, () => store.name], () => {
  if (connected.value && ladders.value.length) loadRatings()
}, { immediate: true })

const play = () => navigateTo('/classique/classe')
</script>

<style scoped>
.ranking { display: flex; flex-direction: column; gap: 12px; }
.ranking__head { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.ranking__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.ranking__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.ranking__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.mine { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }

.mine__card {
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--r);
  background: var(--pn);
  color: var(--tx);
  box-shadow: var(--pnS);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mine__card--on { box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 3px var(--bd); }
.mine__format { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.mine__elo { font: 700 26px/1.1 'Pixelify Sans', sans-serif; }
.mine__line { display: flex; gap: 6px; align-items: center; font: 700 12px 'Atkinson Hyperlegible', sans-serif; }
.mine__trend { color: #58d080; }
.mine__trend--down { color: #ff7a6a; }
.mine__sub { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.ranking__body { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 12px; align-items: start; }
.ranking__side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.help { padding: 12px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 8px; }
.help__title { font: 600 15px 'Pixelify Sans', sans-serif; }
.help p { margin: 0; font: 400 13px/1.5 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.tiers { display: flex; flex-wrap: wrap; gap: 4px 10px; }
.tiers__item { display: flex; gap: 4px; font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 1100px) {
  .ranking__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

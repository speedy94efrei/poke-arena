<template>
  <div class="training">
    <div class="training__head">
      <div class="training__heading">
        <h1 class="training__title">Entraînement</h1>
        <span class="training__subtitle">Apprends à jouer un style d'équipe, puis à l'affronter, contre un bot et avec un coach</span>
      </div>
      <button type="button" class="btn btn--primary training__launch" :disabled="!canLaunch" @click="launch">
        {{ launching ? 'Lancement…' : `Lancer · Niveau ${level}` }} ▶
      </button>
    </div>

    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="training__error" role="alert">{{ error }}</p>

    <div class="training__body">
      <div class="training__main">
        <section class="step" aria-label="Format">
          <span class="step__title">1 · Format</span>
          <div class="chips" role="radiogroup" aria-label="Format">
            <button v-for="id in formats" :key="id" type="button" role="radio" class="chip" :class="{ 'chip--on': id === format }" :aria-checked="id === format" @click="format = id">{{ formatIdLabel(id).split(' · ')[0] }}</button>
          </div>
        </section>

        <template v-if="!random">
          <section class="step" aria-label="Objectif">
            <span class="step__title">2 · Objectif</span>
            <div class="goals" role="radiogroup" aria-label="Objectif">
              <button v-for="option in GOALS" :key="option.id" type="button" role="radio" class="goal" :class="{ 'goal--on': goal === option.id }" :aria-checked="goal === option.id" @click="goal = option.id">
                <b>{{ option.title }}</b><span>{{ option.text }}</span>
              </button>
            </div>
          </section>

          <section class="step" aria-label="Style d'équipe">
            <span class="step__title">3 · Style d'équipe <span>répartition officielle Smogon en {{ formatName }}</span></span>
            <div class="styles">
              <button v-for="card in styleCards" :key="card.id" type="button" class="style" :class="{ 'style--on': card.id === style }" :aria-pressed="card.id === style" @click="style = card.id">
                <span class="style__head"><b>{{ card.label }}</b><span v-if="card.share">{{ percent(card.share) }}</span></span>
                <span class="style__team">
                  <span v-for="id in card.team" :key="id" class="style__mon" :style="{ backgroundImage: `url(${sprite(id)})` }" />
                </span>
                <span class="style__text">{{ card.summary }}</span>
              </button>
            </div>
          </section>
        </template>

        <section class="step" aria-label="Niveau du bot">
          <span class="step__title">{{ random ? '2' : '4' }} · Niveau du bot</span>
          <div class="levels" role="radiogroup" aria-label="Niveau du bot">
            <button v-for="option in LEVELS" :key="option.level" type="button" role="radio" class="level" :class="{ 'level--on': option.level === level, 'level--off': !online(option.level) }" :aria-checked="option.level === level" @click="level = option.level">
              <span class="level__number">{{ option.level }}<span class="level__dots">{{ '◆'.repeat(option.level) }}{{ '◇'.repeat(5 - option.level) }}</span></span>
              <b>{{ option.title }}</b>
              <span>{{ option.text }}</span>
            </button>
          </div>
        </section>
      </div>

      <aside class="training__side">
        <section v-if="!random" class="panel" aria-label="Les équipes">
          <header class="panel__head">Les équipes</header>
          <div class="panel__body">
            <div class="team">
              <span class="team__label">Toi · {{ goal === 'jouer' ? lesson.label : 'ton équipe' }}</span>
              <template v-if="goal === 'jouer'">
                <span class="team__mons"><span v-for="id in styleTeam" :key="id" class="team__mon" :title="speciesName(id)" :style="{ backgroundImage: `url(${sprite(id)})` }" /></span>
                <button type="button" class="btn btn--small" :disabled="!styleTeam.length" @click="copyTeam">Copier dans l'Atelier</button>
              </template>
              <ClassiqueTeamSelect v-else v-model="teamId" :format="format" :generated="false" />
            </div>
            <div class="team">
              <span class="team__label">Bot · {{ goal === 'jouer' ? 'une équipe du méta' : lesson.label }}</span>
              <span class="team__mons"><span v-for="id in botSpecies" :key="id" class="team__mon" :title="speciesName(id)" :style="{ backgroundImage: `url(${sprite(id)})` }" /></span>
            </div>
            <label class="toggle">
              <input v-model="coach" type="checkbox">
              <span>Coach pendant le combat : après chaque décision, compare ton choix à celui du moteur.</span>
            </label>
          </div>
        </section>
        <section v-else class="panel" aria-label="Random Battle">
          <header class="panel__head">Random Battle</header>
          <div class="panel__body">
            <p class="panel__text">Six Pokémon tirés au hasard de chaque côté : idéal pour apprendre les bases avec le coach.</p>
            <label class="toggle">
              <input v-model="coach" type="checkbox">
              <span>Coach pendant le combat</span>
            </label>
          </div>
        </section>

        <section v-if="!random" class="panel" :aria-label="`Leçon · ${lesson.label}`">
          <header class="panel__head">Leçon · {{ goal === 'jouer' ? 'jouer' : 'affronter' }} {{ lesson.label.toLowerCase() }}</header>
          <div class="panel__body">
            <p class="panel__text">{{ lesson.summary }}</p>
            <ol class="lesson">
              <li v-for="tip in goal === 'jouer' ? lesson.play : lesson.face" :key="tip">{{ tip }}</li>
            </ol>
            <span v-if="keyPokemon" class="panel__text">Pokémon du style en {{ formatName }} : {{ keyPokemon }}.</span>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UsageData } from '~/utils/usage'
import type { TrainingStyle } from '~/utils/trainingStyles'

type Goal = 'jouer' | 'affronter'

useHead({ title: 'Entraînement · Classique' })

const FORMATS = ['gen9ou', 'gen9uu', 'gen9ru', 'gen9nu', 'gen9pu', 'gen9ubers', 'gen9nationaldex', 'gen9lc', 'gen9randombattle']
const GOALS: { id: Goal, title: string, text: string }[] = [
  { id: 'jouer', title: 'Jouer un style', text: 'Tu pilotes une équipe du style ; le bot joue une équipe du méta.' },
  { id: 'affronter', title: 'Affronter un style', text: 'Le bot joue le style ; tu prends une de tes équipes.' },
]
const LEVELS: { level: 1 | 2 | 3 | 4 | 5, title: string, text: string }[] = [
  { level: 1, title: 'Débutant', text: 'Attaque au hasard, ne change jamais de Pokémon.' },
  { level: 2, title: 'Facile', text: "Choisit l'attaque qui fait le plus de dégâts." },
  { level: 3, title: 'Moyen', text: 'Change de Pokémon menacé, pose les pièges, se soigne, garde la Téra pour la fin.' },
  { level: 4, title: 'Difficile', text: 'Prend les KO, se booste, inflige des statuts, joue la météo et anticipe tes changements.' },
  { level: 5, title: 'Expert', text: 'Les règles du niveau 4, puis compare chaque option avec ta meilleure riposte.' },
]
const TEAM_SIZE = 6

const { store, challenge, validateTeam } = useShowdown()
const { dex, sprite } = usePokedex()
const { teams, save, packed } = useClassicTeams()
const { bots, refresh, prepare } = useTraining()
const workshopTeam = useState('workshop-team', () => '')

const format = ref('gen9ou')
const goal = ref<Goal>('jouer')
const style = ref<TrainingStyle>('rain')
const level = ref<1 | 2 | 3 | 4 | 5>(3)
const coach = ref(true)
const teamId = ref('')
const usage = shallowRef<UsageData | null>(null)
const error = ref('')
const launching = ref(false)

const connected = computed(() => store.status === 'connecte')
const formats = computed(() => {
  const available = new Set(store.formats.flatMap(section => section.formats).map(entry => entry.id))
  return available.size ? FORMATS.filter(id => available.has(id)) : FORMATS
})
const random = computed(() => format.value.includes('random'))
const formatName = computed(() => formatIdLabel(format.value))
const lesson = computed(() => styleLesson(style.value))
const level50 = computed(() => Boolean(store.formats.flatMap(section => section.formats).find(entry => entry.id === format.value)?.level50))

watch(format, async (id) => {
  usage.value = id.includes('random') ? null : await loadUsage(id)
}, { immediate: true })

watch(connected, (online) => {
  if (online) refresh()
}, { immediate: true })

const online = (value: number) => !bots.value.length || bots.value.some(bot => bot.level === value && !bot.theme && bot.online)

/** Équipe d'un style d'après les statistiques du format, construite par l'assistant d'équipe. */
const teamFor = (target: TrainingStyle) => assistantReply(styleLesson(target).request, usage.value, dex.value, formatName.value).team ?? []

const styleCards = computed(() => TRAINING_STYLES.map((id) => {
  const info = styleLesson(id)
  const share = (usage.value?.styles ?? []).filter(([tag]) => info.tags.includes(tag)).reduce((max, [, value]) => Math.max(max, value), 0)
  return { id, label: info.label, summary: info.summary, share, team: teamFor(id) }
}).sort((a, b) => b.share - a.share))

const styleTeam = computed(() => styleCards.value.find(card => card.id === style.value)?.team ?? [])

/** L'équipe du méta : le Pokémon le plus joué et ses coéquipiers les plus fréquents. */
const metaTeam = computed(() => {
  const data = usage.value
  const first = data?.pokemon[0]
  if (!data || !first) return []
  const ids = [first.id, ...first.teammates.map(([id]) => id)].filter(id => data.pokemon.some(entry => entry.id === id))
  for (const entry of data.pokemon) if (!ids.includes(entry.id)) ids.push(entry.id)
  return [...new Set(ids)].slice(0, TEAM_SIZE)
})

const botSpecies = computed(() => goal.value === 'jouer' ? metaTeam.value : styleTeam.value)
const mineTeam = computed(() => teams.value.find(entry => entry.id === teamId.value))
const keyPokemon = computed(() => styleTeam.value.slice(0, 3).map(id => speciesName(id)).join(', '))

const packSpecies = (species: string[]) => packClassicTeam(species.map(id => setFromUsage(id, usageOf(usage.value, id), dex.value, levelFor(format.value, level50.value))))

const canLaunch = computed(() => connected.value && !launching.value && (random.value || (styleTeam.value.length > 0 && (goal.value === 'jouer' || Boolean(mineTeam.value)))))

const copyTeam = async () => {
  const sets = styleTeam.value.map(id => setFromUsage(id, usageOf(usage.value, id), dex.value, levelFor(format.value, level50.value)))
  const team = save({ name: `Entraînement ${lesson.value.label}`, format: format.value, sets })
  workshopTeam.value = team.id
  await navigateTo('/classique/equipes')
}

/** Prépare le combat sur le serveur (équipes, coach), vérifie les équipes, puis défie le bot. */
const launch = async () => {
  error.value = ''
  launching.value = true
  const bot = `Bot Niveau ${level.value}`
  const botTeam = random.value ? '' : packSpecies(botSpecies.value)
  const mine = random.value ? '' : goal.value === 'jouer' ? packSpecies(styleTeam.value) : mineTeam.value ? packed(mineTeam.value) : ''
  for (const [team, owner] of [[botTeam, "L'équipe du bot"], [mine, 'Ton équipe']] as const) {
    if (!team) continue
    const problems = await validateTeam(team, format.value)
    if (problems?.length) {
      error.value = `${owner} n'est pas valide en ${formatName.value} : ${frenchValidation(problems[0]!, dex.value)}`
      launching.value = false
      return
    }
  }
  const failure = await prepare({ bot, format: format.value, team: botTeam, mine, coach: coach.value })
  if (failure) {
    error.value = failure
    launching.value = false
    return
  }
  challenge(bot, mine, format.value)
  setTimeout(() => {
    launching.value = false
  }, 8000)
}

watch(() => store.latestBattle, (roomid, previous) => {
  if (roomid && roomid !== previous && launching.value) navigateTo(`/classique/combat/${roomid}`)
})
</script>

<style scoped>
.training { display: flex; flex-direction: column; gap: 12px; }
.training__head { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.training__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.training__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.training__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.training__launch { height: 44px; padding: 0 20px; font-size: 15px; background: #48a860; color: #fff; }
.training__error { margin: 0; padding: 10px 12px; border-radius: var(--r); background: #3a2216; color: #ffd9c8; font: 700 13px/1.45 'Atkinson Hyperlegible', sans-serif; }
.training__body { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 12px; align-items: start; }
.training__main, .training__side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.step { display: flex; flex-direction: column; gap: 8px; }
.step__title { font: 600 16px 'Pixelify Sans', sans-serif; }
.step__title span { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); margin-left: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }

.chip {
  border: 0;
  cursor: pointer;
  height: 32px;
  padding: 0 12px;
  border-radius: 7px;
  background: var(--chip);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--bd);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.chip--on { background: var(--hd); color: var(--hdTx); }
.goals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.goal, .style, .level {
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 10px 12px;
  border-radius: var(--r);
  background: var(--pn);
  color: var(--tx);
  box-shadow: var(--pnS);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font: 400 12px/1.4 'Atkinson Hyperlegible', sans-serif;
}

.goal b, .level b { font: 700 15px 'Atkinson Hyperlegible', sans-serif; }
.goal span, .level span { color: var(--mu); }
.goal--on, .style--on, .level--on { box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 3px var(--bd); }
.styles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.style__head { display: flex; gap: 6px; font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.style__head b { flex: 1; }
.style__head span { font: 600 13px 'Pixelify Sans', sans-serif; color: var(--uA); }
.style__team { display: flex; gap: 1px; min-height: 30px; }
.style__mon { width: 32px; height: 30px; background: center / 34px no-repeat; image-rendering: pixelated; }
.style__text { color: var(--mu); }
.levels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.level__number { display: flex; align-items: center; justify-content: space-between; font: 700 22px 'Pixelify Sans', sans-serif; color: var(--uA) !important; }
.level__dots { font-size: 10px; letter-spacing: 1px; }
.level--off { opacity: .5; }
.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.panel__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
}

.panel__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 10px; }
.panel__text { margin: 0; font: 700 12px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.team { display: flex; flex-direction: column; gap: 6px; }
.team__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.team__mons { display: flex; gap: 2px; flex-wrap: wrap; }
.team__mon { width: 40px; height: 34px; border-radius: 6px; background: var(--in) center / 40px no-repeat; image-rendering: pixelated; }
.toggle { display: flex; gap: 8px; align-items: flex-start; font: 700 12px/1.4 'Atkinson Hyperlegible', sans-serif; }
.toggle input { margin-top: 2px; accent-color: var(--uA); }
.lesson { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font: 400 13px/1.45 'Atkinson Hyperlegible', sans-serif; }

@media (max-width: 1100px) {
  .training__body { grid-template-columns: minmax(0, 1fr); }
  .levels { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
}

@media (max-width: 640px) {
  .goals { grid-template-columns: minmax(0, 1fr); }
}
</style>

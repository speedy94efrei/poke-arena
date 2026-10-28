<template>
  <div class="hub">
    <div v-if="countdown !== null && last" role="status" class="auto" :class="`auto--${last}`">
      <span class="auto__text">Dernier univers : {{ UNIVERSES[last].name }}. Tu y entres dans <b>{{ countdown }}</b> s.</span>
      <span class="auto__spacer" />
      <NuxtLink :to="UNIVERSES[last].to" class="btn btn--small btn--primary">Entrer maintenant</NuxtLink>
      <button type="button" class="btn btn--small" @click="stay">Rester sur le hub</button>
    </div>

    <div class="hub__head">
      <h1 class="hub__title">À quoi tu joues aujourd'hui ?</h1>
      <span class="hub__subtitle">Ton compte et le guide sont communs aux deux univers. Les équipes et les classements sont séparés.</span>
    </div>

    <div class="cards">
      <NuxtLink to="/classique" class="card card--classique" aria-label="Entrer dans Classique">
        <span class="card__scan" />
        <div class="card__top">
          <span class="card__badge">Smogon · tous les formats</span>
          <span class="card__name">Classique</span>
          <span class="card__pitch">Pokémon Showdown tel quel : stats officielles, OU, UU, Ubers, VGC, Random Battle et le reste. Classement Elo par format.</span>
        </div>
        <div class="card__sprites">
          <span v-for="(sprite, index) in CLASSIC_SPRITES" :key="sprite" class="card__sprite" :style="{ backgroundImage: `url(${gen5Sprite(sprite)})`, width: index === 1 ? '150px' : '110px', height: index === 1 ? '150px' : '110px', animationDuration: `${2.4 + index * 0.4}s` }" />
        </div>
        <div class="card__foot">
          <div class="card__stat">
            <span class="card__key">Formats</span>
            <span class="card__big">{{ formatCount ?? '—' }}</span>
            <span class="card__key">{{ formatCount ? `${ladderCount} avec ladder` : 'connecte-toi au serveur de combat' }}</span>
          </div>
          <div class="card__stat">
            <span class="card__key">Modes</span>
            <span class="card__mid">Simple, double, Random</span>
            <span class="card__key">et toutes les anciennes générations</span>
          </div>
          <span class="card__enter">Entrer ▸</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/pokedraft" class="card card--pokedraft" aria-label="Entrer dans PokéDraft">
        <span class="card__scan" />
        <div class="card__top">
          <div class="card__intro">
            <span class="card__badge">Notre jeu · draft classé</span>
            <span class="card__name">PokéDraft</span>
            <span class="card__pitch">Un roster de {{ roster.pokemon.length }} Pokémon par saison, avec des stats redistribuées, un talent unique et une attaque signature. Rangs de Poké Ball à Champion.</span>
          </div>
          <div v-if="daysLeft !== null" class="card__season">
            <span class="card__key">Fin de saison</span>
            <span class="card__big">J−{{ daysLeft }}</span>
          </div>
        </div>
        <div class="card__sprites">
          <span v-for="(pokemon, index) in draftSprites" :key="pokemon.id" class="card__sprite" :style="{ backgroundImage: `url(${pokemon.sprite})`, width: index === 1 ? '150px' : '110px', height: index === 1 ? '150px' : '110px', animationDuration: `${2.4 + index * 0.4}s` }" />
        </div>
        <div class="card__foot card__foot--rank">
          <RankCrest :tier="profile?.rank.tier ?? 'placement'" :division="profile?.rank.division ?? null" :size="46" />
          <div class="card__rank">
            <span class="card__mid">{{ rankText }}</span>
            <div v-if="profile?.rank.placed" role="progressbar" :aria-valuenow="profile.rank.points" aria-valuemin="0" aria-valuemax="100" aria-label="Points de ligue" class="card__bar">
              <span class="card__fill" :style="{ width: `${profile.rank.division ? profile.rank.points : 100}%` }" />
            </div>
            <span class="card__key">Patch {{ season?.patch ?? '…' }} · {{ corrections }} correction{{ corrections > 1 ? 's' : '' }} · {{ roster.pokemon.length }} Pokémon au roster</span>
          </div>
          <span class="card__enter">Entrer ▸</span>
        </div>
      </NuxtLink>
    </div>

    <div class="common">
      <div class="common__card">
        <span class="common__kicker">Commun · Événements</span>
        <span class="common__title">Aucun tournoi programmé</span>
        <span class="common__text">Les tournois arriveront avec la Communauté du Classique.</span>
      </div>
      <div class="common__card">
        <span class="common__kicker">Commun · Compte</span>
        <span class="common__title">{{ loggedIn ? session.name : 'Pas encore de compte' }}</span>
        <span class="common__text">{{ loggedIn ? 'Ton compte sert dans les deux univers.' : 'Crée un compte pour garder tes équipes et tes classements.' }}</span>
      </div>
      <NuxtLink to="/pokedraft/codex" class="common__card">
        <span class="common__kicker">Commun · Guide</span>
        <span class="common__title">Débuter en PokéDraft</span>
        <span class="common__text">Les 50 fiches de la saison, leurs talents et leurs attaques signatures.</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SeasonInfo } from '~/utils/ranked'
import type { Universe } from '~/utils/navigation'

definePageMeta({ layout: 'hub' })
useHead({ title: 'Arène' })

const UNIVERSES: Record<Universe, { name: string, to: string }> = {
  classique: { name: 'Classique', to: '/classique' },
  pokedraft: { name: 'PokéDraft', to: '/pokedraft' },
}
const CLASSIC_SPRITES = ['greattusk', 'gholdengo', 'kingambit']
const AUTO_ENTER_SECONDS = 3

const { request, profile, session, loggedIn } = useAccount()
const { store: showdown } = useShowdown()

const season = ref<SeasonInfo | null>(null)
const last = ref<Universe | null>(null)
const countdown = ref<number | null>(null)
const autoEnter = useState('hub-auto-enter', () => true)

const daysLeft = computed(() => season.value ? Math.max(0, Math.ceil((new Date(season.value.ends_at).getTime() - Date.now()) / 864e5)) : null)
const corrections = computed(() => roster.pokemon.filter(pokemon => pokemon.correction).length)
const draftSprites = computed(() => ['dewgong', 'onix', 'marowak'].map(id => findPokemon(id)).filter(pokemon => pokemon !== undefined))
const formatCount = computed(() => showdown.formats.length ? showdown.formats.reduce((sum, section) => sum + section.formats.length, 0) : null)
const ladderCount = computed(() => showdown.formats.reduce((sum, section) => sum + section.formats.filter(format => format.ladder).length, 0))
const rankText = computed(() => {
  const current = profile.value
  if (!current) return 'Pas encore classé'
  if (!current.rank.placed) return `Placements · ${current.placement.played}/${current.placement.needed}`
  return `${current.rank.label} · ${current.rank.points} PL`
})

const gen5Sprite = (id: string) => `https://play.pokemonshowdown.com/sprites/gen5/${id}.png`

let timer: ReturnType<typeof setInterval> | undefined
const stay = () => {
  clearInterval(timer)
  countdown.value = null
}

onMounted(async () => {
  last.value = lastUniverse()
  if (autoEnter.value && last.value) {
    countdown.value = AUTO_ENTER_SECONDS
    timer = setInterval(() => {
      if (countdown.value === null) return
      countdown.value--
      if (countdown.value <= 0) {
        stay()
        navigateTo(UNIVERSES[last.value!].to)
      }
    }, 1000)
  }
  autoEnter.value = false
  try {
    season.value = (await request<{ data: SeasonInfo }>('/seasons/current')).data
  } catch {
    season.value = null
  }
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.hub { display: flex; flex-direction: column; gap: 14px; }

.auto {
  padding: 10px 14px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: inset 0 0 0 2px #4a9ad8, var(--pnS);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font: 700 15px 'Atkinson Hyperlegible', sans-serif;
}

.auto--pokedraft { box-shadow: inset 0 0 0 2px #f0b93a, var(--pnS); }
.auto__text b { font: 600 18px 'Pixelify Sans', sans-serif; color: #4a9ad8; }
.auto--pokedraft .auto__text b { color: #f0b93a; }
.auto__spacer { flex: 1; }
.hub__head { display: flex; flex-direction: column; gap: 2px; padding: 4px 4px 0; }
.hub__title { margin: 0; font: 700 30px/1.1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.hub__subtitle { font: 700 15px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 14px; }

.card {
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--r) + 6px);
  color: #fff;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  min-height: 460px;
  animation: pop .35s both;
  transition: box-shadow .15s;
}

.card--classique { background: linear-gradient(155deg, #1f5f8f 0%, #163f63 55%, #0f2a44 100%); box-shadow: inset 0 0 0 3px #4a9ad8, 0 0 0 3px var(--bd), 0 10px 0 3px rgba(0, 0, 0, .35); }
.card--classique:hover { box-shadow: inset 0 0 0 4px #8cc8f8, 0 0 0 3px var(--bd), 0 14px 0 3px rgba(0, 0, 0, .35); }
.card--pokedraft { background: linear-gradient(155deg, #8a5f12 0%, #5a3c0a 55%, #33220a 100%); box-shadow: inset 0 0 0 3px #f0b93a, 0 0 0 3px var(--bd), 0 10px 0 3px rgba(0, 0, 0, .35); }
.card--pokedraft:hover { box-shadow: inset 0 0 0 4px #ffd970, 0 0 0 3px var(--bd), 0 14px 0 3px rgba(0, 0, 0, .35); }
.card__scan { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(255, 255, 255, .035) 0 2px, transparent 2px 6px); }
.card__top { position: relative; padding: 20px 22px 0; display: flex; align-items: flex-start; gap: 12px; }
.card__top, .card__intro { display: flex; flex-direction: column; gap: 6px; }
.card--pokedraft .card__top { flex-direction: row; }
.card__intro { flex: 1; }

.card__badge {
  height: 24px;
  align-self: flex-start;
  padding: 0 10px;
  border-radius: 5px;
  background: #4a9ad8;
  color: #06182a;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.card--pokedraft .card__badge { background: #f0b93a; color: #2a1d00; }
.card__name { font: 700 46px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 #06182a; }
.card--pokedraft .card__name { text-shadow: 3px 3px 0 #2a1d00; }
.card__pitch { font: 700 15px/1.45 'Atkinson Hyperlegible', sans-serif; color: #d4e8f8; max-width: 420px; }
.card--pokedraft .card__pitch { color: #f4e2b8; }

.card__season {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(40, 26, 0, .6);
  box-shadow: inset 0 0 0 2px rgba(240, 185, 58, .5);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card__sprites { position: relative; flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 6px; padding: 0 20px; min-height: 150px; }
.card__sprite { display: block; background: center bottom / contain no-repeat; image-rendering: pixelated; animation: bob 2.4s ease-in-out infinite; filter: drop-shadow(0 5px 0 rgba(0, 0, 0, .35)); }

.card__foot {
  position: relative;
  margin: 0 14px 14px;
  padding: 14px;
  border-radius: var(--r);
  background: rgba(6, 18, 32, .72);
  box-shadow: inset 0 0 0 2px rgba(140, 200, 248, .35);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  gap: 10px;
  align-items: center;
}

.card--pokedraft .card__foot { background: rgba(32, 20, 0, .72); box-shadow: inset 0 0 0 2px rgba(240, 185, 58, .35); }
.card__foot--rank { grid-template-columns: auto minmax(0, 1fr) auto; }
.card__stat, .card__rank { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.card__key { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: #a8cce8; }
.card--pokedraft .card__key { color: #e8cf98; }
.card__big { font: 700 32px/1 'Pixelify Sans', sans-serif; }
.card__mid { font: 700 18px/1.1 'Atkinson Hyperlegible', sans-serif; }
.card__bar { height: 8px; border-radius: 4px; background: rgba(0, 0, 0, .45); overflow: hidden; }
.card__fill { display: block; height: 100%; background: linear-gradient(90deg, #b88a10, #ffd23a); }

.card__enter {
  justify-self: end;
  height: 46px;
  padding: 0 20px;
  border-radius: 10px;
  background: #4a9ad8;
  color: #06182a;
  font: 700 17px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .2);
}

.card--pokedraft .card__enter { background: #f0b93a; color: #2a1d00; }
.common { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }

.common__card {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--tx);
}

.common__kicker { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.common__title { font: 600 18px 'Pixelify Sans', sans-serif; }
.common__text { font: 700 13px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 600px) {
  .card { min-height: 0; }
  .card__foot { grid-template-columns: minmax(0, 1fr); }
  .card__foot--rank { grid-template-columns: auto minmax(0, 1fr); }
  .card__enter { grid-column: 1 / -1; justify-self: stretch; justify-content: center; }
  .card__name { font-size: 38px; }
}
</style>

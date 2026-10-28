<template>
  <div class="sheet">
    <header class="hero" :style="{ '--type': TYPE_COLORS[pokemon.types[0]!] }">
      <span class="hero__sprite" :style="{ backgroundImage: `url(${sprite(id, 'face')})` }" />
      <div class="hero__text">
        <span class="hero__num">N° {{ pokemon.num }}</span>
        <h2 class="hero__name">{{ pokemon.nom }}</h2>
        <span class="hero__sub">{{ pokemon.name }} · {{ generation }} génération<template v-if="tier"> · tier {{ tier }}</template></span>
        <span class="hero__types">
          <span v-for="type in pokemon.types" :key="type" class="hero__type" :style="{ background: TYPE_COLORS[type] }">{{ type }}</span>
        </span>
        <span class="hero__facts">
          <span v-if="usage" class="hero__fact">Usage {{ shortFormat }} {{ percent(usage.usage, 1) }}</span>
          <span class="hero__fact">{{ weight }}</span>
        </span>
        <button type="button" class="btn btn--primary btn--small" @click="emit('add')">+ Ajouter à mon équipe</button>
      </div>
    </header>

    <div class="sheet__grid">
      <section class="panel" aria-label="Statistiques de base">
        <header class="panel__head">Statistiques de base<span class="panel__aside">Total {{ total }}</span></header>
        <div class="panel__body">
          <div v-for="stat in stats" :key="stat.id" class="stat">
            <span class="stat__label">{{ stat.label }}</span>
            <span class="stat__value">{{ stat.value }}</span>
            <span class="stat__track"><span class="stat__fill" :style="{ width: `${Math.min(100, stat.value / 2)}%`, background: `hsl(${Math.min(180, stat.value * 180 / 255)}, 75%, 45%)` }" /></span>
          </div>
        </div>
      </section>

      <section class="panel" aria-label="Faiblesses et résistances">
        <header class="panel__head">Faiblesses et résistances</header>
        <div class="panel__body">
          <div v-for="group in matchups" :key="group.label" class="matchup">
            <span class="matchup__factor" :class="`matchup__factor--${group.tone}`">{{ group.label }}</span>
            <span class="matchup__types">
              <span v-for="type in group.types" :key="type" class="matchup__type" :style="{ background: TYPE_COLORS[type] }">{{ type }}</span>
            </span>
          </div>
          <span class="panel__note">Selon les types seuls : un talent comme Lévitation ou Absorb Eau ajoute une immunité.</span>
        </div>
      </section>
    </div>

    <section class="panel" aria-label="Talents">
      <header class="panel__head">Talents</header>
      <div class="panel__body talents">
        <div v-for="ability in abilities" :key="ability.id" class="talent">
          <span class="talent__head"><b>{{ ability.nom }}</b><span v-if="ability.share">{{ percent(ability.share) }}</span></span>
          <span class="talent__text">{{ ability.description }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { TypePokemon } from '#data/types/roster'
import type { DexPokemon } from '~/utils/dex'
import type { UsagePokemon } from '~/utils/usage'

const props = defineProps<{ id: string, pokemon: DexPokemon, usage: UsagePokemon | undefined, formatName: string, format: string }>()
const emit = defineEmits<{ add: [] }>()
const { dex, sprite } = usePokedex()

const ROMAN = ['', '1re', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e']
const LABELS: Record<string, string> = { hp: 'PV', atk: 'Attaque', def: 'Défense', spa: 'Atq. Spé.', spd: 'Déf. Spé.', spe: 'Vitesse' }
const GROUPS: { factor: number, label: string, tone: string }[] = [
  { factor: 4, label: '×4', tone: 'weak' },
  { factor: 2, label: '×2', tone: 'weak' },
  { factor: 0.5, label: '×½', tone: 'resist' },
  { factor: 0.25, label: '×¼', tone: 'resist' },
  { factor: 0, label: '×0', tone: 'immune' },
]

const shortFormat = computed(() => props.formatName.split(' · ')[0])
const generation = computed(() => ROMAN[props.pokemon.gen] ?? `${props.pokemon.gen}e`)
const tier = computed(() => props.format.includes('nationaldex') ? props.pokemon.natDexTier : props.pokemon.tier)
const weight = computed(() => `${props.pokemon.weight.toLocaleString('fr-FR')} kg`)
const stats = computed(() => Object.entries(props.pokemon.stats).map(([id, value]) => ({ id, value, label: LABELS[id] ?? id })))
const total = computed(() => stats.value.reduce((sum, stat) => sum + stat.value, 0))

const matchups = computed(() => GROUPS
  .map(group => ({ ...group, types: TYPE_ORDER.filter(type => effectiveness(type, props.pokemon.types) === group.factor) as TypePokemon[] }))
  .filter(group => group.types.length))

const abilities = computed(() => {
  const shares = new Map(props.usage?.abilities ?? [])
  return props.pokemon.abilities.map((name) => {
    const id = toId(name)
    const ability = dex.value?.abilities[id]
    return { id, nom: ability?.nom ?? name, description: ability?.description ?? '', share: shares.get(id) ?? 0 }
  }).sort((a, b) => b.share - a.share)
})
</script>

<style scoped>
.sheet { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.hero {
  position: relative;
  min-height: 190px;
  padding: 16px 18px;
  border-radius: var(--r);
  box-shadow: var(--pnS);
  overflow: hidden;
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, .06) 0 14px, transparent 14px 28px),
    linear-gradient(110deg, var(--type), color-mix(in srgb, var(--type) 30%, #0b0f16));
  display: flex;
  align-items: center;
  gap: 18px;
  color: #fff;
}

.hero__sprite {
  flex: 1;
  min-width: 160px;
  height: 170px;
  background: center / contain no-repeat;
  image-rendering: pixelated;
  filter: drop-shadow(4px 4px 0 rgba(0, 0, 0, .35));
}

.hero__text { flex: 1; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; min-width: 0; }
.hero__num { font: 700 13px 'Atkinson Hyperlegible', sans-serif; opacity: .85; }
.hero__name { margin: 0; font: 700 32px/1 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); }
.hero__sub { font: 700 12px 'Atkinson Hyperlegible', sans-serif; opacity: .85; }
.hero__types, .hero__facts { display: flex; gap: 5px; flex-wrap: wrap; }

.hero__type {
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .4);
  display: flex;
  align-items: center;
}

.hero__fact {
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  background: rgba(0, 0, 0, .45);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.sheet__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; min-width: 0; }

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

.panel__aside { margin-left: auto; font: 700 12px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; }
.panel__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.panel__note { font: 700 11px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.stat { display: grid; grid-template-columns: 74px 34px minmax(0, 1fr); gap: 8px; align-items: center; }
.stat__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.stat__value { font: 600 14px 'Pixelify Sans', sans-serif; text-align: right; }
.stat__track { height: 10px; border-radius: 3px; background: var(--in); overflow: hidden; }
.stat__fill { display: block; height: 100%; border-radius: 3px; }
.matchup { display: flex; gap: 8px; align-items: flex-start; }

.matchup__factor {
  flex: none;
  width: 34px;
  height: 22px;
  border-radius: 4px;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: grid;
  place-items: center;
}

.matchup__factor--weak { background: #c8362a; color: #fff; }
.matchup__factor--resist { background: #2f9a58; color: #fff; }
.matchup__factor--immune { background: var(--dk); color: var(--tx); box-shadow: inset 0 0 0 2px var(--chip); }
.matchup__types { display: flex; flex-wrap: wrap; gap: 4px; }

.matchup__type {
  height: 22px;
  padding: 0 7px;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.talents { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.talent { padding: 8px 10px; border-radius: 8px; background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); display: flex; flex-direction: column; gap: 4px; }
.talent__head { display: flex; gap: 8px; font: 700 14px 'Atkinson Hyperlegible', sans-serif; }
.talent__head b { flex: 1; }
.talent__head span { font: 600 13px 'Pixelify Sans', sans-serif; color: var(--uA); }
.talent__text { font: 400 12px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

@media (max-width: 760px) {
  .sheet__grid { grid-template-columns: minmax(0, 1fr); }
  .hero { flex-direction: column; align-items: stretch; }
  .hero__sprite { min-width: 0; height: 130px; }
}
</style>

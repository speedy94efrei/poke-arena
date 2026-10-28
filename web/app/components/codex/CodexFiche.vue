<template>
  <article :aria-label="`Fiche ${pokemon.nom}`" class="fiche">
    <header class="hero" :style="{ background: heroBackground }">
      <span class="hero__veil" />
      <span class="hero__portrait">
        <span class="hero__shadow" />
        <img class="hero__sprite" :src="pokemon.sprite" :alt="pokemon.nom">
      </span>
      <div class="hero__text">
        <div class="hero__top">
          <h2 class="hero__name">{{ pokemon.nom }}</h2>
          <button type="button" class="hero__close" aria-label="Fermer la fiche" @click="emit('close', pokemon.id)">✕</button>
        </div>
        <div class="hero__types">
          <span v-for="type in pokemon.types" :key="type" class="hero__type" :style="{ background: TYPE_COLORS[type] }">{{ type }}</span>
        </div>
        <span class="hero__roles">{{ pokemon.roles.join(' · ') }}</span>
        <div class="hero__chips">
          <span class="hero__chip">Génération <b>{{ pokemon.generation }}</b></span>
          <span class="hero__chip hero__chip--tier" title="Tier Smogon d'origine, pour information">Tier Smogon : {{ pokemon.tierShowdownActuel }}</span>
          <button type="button" class="hero__compare" @click="emit('compare', pokemon.id)">{{ comparing ? 'Fermer la comparaison' : '⇄ Comparer' }}</button>
        </div>
      </div>
    </header>

    <div v-if="pokemon.correction" class="correction">
      <span class="correction__tag">✎ Corrigé</span>
      <div class="correction__text"><b>Ce qui a changé</b><span>{{ pokemon.correction }}</span></div>
    </div>

    <div class="conseil">
      <span class="conseil__title">◆ Conseil draft</span>
      <span class="conseil__text">{{ pokemon.conseilDraft }}</span>
    </div>

    <CodexBlock title="Statistiques PokéDraft">
      <template #aside>Total <b class="num">{{ pokemon.stats.total }}</b> · {{ pokemon.stats.total === pokemon.statsOfficielles.total ? "identique à l'officiel ✓" : `officiel ${pokemon.statsOfficielles.total}` }}</template>
      <div v-for="stat in stats" :key="stat.key" class="stat">
        <span class="stat__label">{{ stat.label }}</span>
        <span class="stat__value">{{ stat.value }}</span>
        <div class="stat__track" :title="`Officiel : ${stat.official}`">
          <div class="stat__ghost" :style="{ width: `${Math.min(100, stat.official / 2)}%` }" />
          <div class="stat__bar" :style="{ width: `${Math.min(100, stat.value / 2)}%`, background: statColor(stat.value) }" />
        </div>
        <span class="stat__delta" :style="{ color: stat.delta > 0 ? '#58d080' : stat.delta < 0 ? '#ff7a6a' : 'var(--mu)' }">
          {{ stat.delta > 0 ? `+${stat.delta} ▲` : stat.delta < 0 ? `−${-stat.delta} ▼` : '=' }}
        </span>
      </div>
      <span class="legend"><span class="legend__ghost" />Valeur officielle en fantôme · écart à droite</span>
    </CodexBlock>

    <CodexBlock title="Talent">
      <template #aside><span class="tag">Fixe · aucun choix</span></template>
      <span class="title">{{ pokemon.talent.nom }}</span>
      <span class="text">{{ pokemon.talent.effet }}</span>
      <span v-if="pokemon.talent.lore" class="lore">« {{ pokemon.talent.lore }} »</span>
      <div v-if="comite" class="comite">Comité · Origine : {{ pokemon.talent.origine }} · {{ pokemon.talent.aValider ? 'À valider' : 'Validé' }}</div>
    </CodexBlock>

    <CodexBlock v-if="signature" title="Attaque signature">
      <template #aside><span class="tag">Optionnelle</span></template>
      <div class="sig">
        <span tabindex="0" class="sig__name" @mouseenter="event => show(event, signature!.id, pokemon.id)" @mouseleave="hide" @focus="event => show(event, signature!.id, pokemon.id)" @blur="hide" @click="event => pin(event, signature!.id, pokemon.id)">{{ signature.nom }}</span>
        <span class="sig__type" :style="{ background: TYPE_COLORS[signature.type] }">{{ signature.type }}</span>
        <span class="sig__cat"><span class="sig__shape" :style="categoryShape(signature.categorie)" />{{ CATEGORY_LABELS[signature.categorie] }}</span>
      </div>
      <div class="nums">
        <div class="nums__cell"><span>Puissance</span><b>{{ powerText(signature, pokemon.signature.coups) }}</b></div>
        <div class="nums__cell"><span>Précision</span><b>{{ accuracyText(signature.precision) }}</b></div>
        <div class="nums__cell"><span>Priorité</span><b>{{ priorityText(signature.priorite) }}</b></div>
      </div>
      <span class="text">{{ signature.effet }}</span>
      <span v-if="pokemon.signature.lore" class="lore">« {{ pokemon.signature.lore }} »</span>
      <div v-if="comite" class="comite">Comité · Origine : {{ pokemon.signature.origine }} · {{ pokemon.signature.aValider ? 'À valider' : 'Validé' }}</div>
      <div v-if="pokemon.ajoutsMovepoolIds.length" class="ajouts">
        <span class="ajouts__label">Ajouts au movepool</span>
        <div class="ajouts__list">
          <span v-for="id in pokemon.ajoutsMovepoolIds" :key="id" tabindex="0" class="ajouts__move" @mouseenter="event => show(event, id, pokemon.id)" @mouseleave="hide" @focus="event => show(event, id, pokemon.id)" @blur="hide" @click="event => pin(event, id, pokemon.id)">+ {{ moveName(id) }}</span>
        </div>
      </div>
    </CodexBlock>

    <CodexMovepool :pokemon="pokemon" />

    <CodexBlock title="Set par défaut">
      <div class="set__chips">
        <span class="set__chip"><span>Objet</span><ItemIcon :id="pokemon.setParDefaut.objetId" />{{ pokemon.setParDefaut.objet }}</span>
        <span class="set__chip"><span>Nature</span>{{ pokemon.setParDefaut.nature }}</span>
      </div>
      <div class="set__moves">
        <span
          v-for="move in setMoves"
          :key="move.id"
          tabindex="0"
          class="set__move"
          :class="{ 'set__move--hors': move.hors }"
          :style="{ boxShadow: `inset 3px 0 0 ${TYPE_COLORS[move.type]}` }"
          :title="move.hors ? 'Hors movepool : à corriger dans la fiche' : undefined"
          @mouseenter="event => show(event, move.id, pokemon.id)"
          @mouseleave="hide"
          @focus="event => show(event, move.id, pokemon.id)"
          @blur="hide"
          @click="event => pin(event, move.id, pokemon.id)"
        >
          <span class="set__name">{{ move.nom }}</span>
          <span v-if="move.id === pokemon.signatureId" class="set__flag set__flag--sig">SIGNATURE</span>
          <span v-if="move.stab" class="set__flag set__flag--stab">STAB</span>
          <span v-if="move.hors" class="set__flag set__flag--hors">HORS MOVEPOOL</span>
          <span class="set__pp" :title="move.pp === null ? 'PP à définir' : undefined">PP <b>{{ move.pp ?? '?' }}</b></span>
        </span>
      </div>
      <span v-if="pokemon.setParDefaut.note" class="note">{{ pokemon.setParDefaut.note }}</span>
      <div class="set__actions">
        <button type="button" class="btn btn--primary" @click="emit('copy', pokemon)">Copier dans l'Atelier</button>
        <button type="button" class="btn" @click="emit('export', pokemon)">Exporter en texte</button>
      </div>
    </CodexBlock>

    <CodexBlock title="Faiblesses et immunités">
      <div class="chart">
        <div v-for="cell in chart" :key="cell.type" class="chart__cell" :title="`${cell.type} : ${multiplierLabel(cell.multiplier)}`" :class="{ 'chart__cell--weak': cell.multiplier >= 2 }">
          <span class="chart__type" :style="{ background: TYPE_COLORS[cell.type] }">{{ cell.type }}</span>
          <span class="chart__value" :style="{ background: cell.bg, color: cell.multiplier === 1 ? 'var(--mu)' : '#fff' }">{{ multiplierLabel(cell.multiplier) }}</span>
        </div>
      </div>
      <span class="legend">Multiplicateur reçu, calculé depuis les types. Bordure épaisse : faiblesse.</span>
    </CodexBlock>

    <CodexBlock title="Contres naturels">
      <span class="sub">Contré par</span>
      <div class="chips">
        <CodexMini v-for="contre in contres" :key="contre.id" :pokemon="contre" @open="id => emit('open', id)" />
      </div>
      <span class="text text--muted">{{ pokemon.contres }}</span>
      <template v-if="ilContre.length">
        <span class="sub sub--sep">Bon contre</span>
        <div class="chips">
          <CodexMini v-for="cible in ilContre" :key="cible.id" :pokemon="cible" tone="cadre" @open="id => emit('open', id)" />
        </div>
      </template>
      <template v-if="piegeables.length">
        <span class="sub sub--sep">⛓ Pokémon qu'il peut piéger et battre</span>
        <div class="chips">
          <CodexMini v-for="cible in piegeables" :key="cible.id" :pokemon="cible" tone="piege" icon-only @open="id => emit('open', id)" />
        </div>
      </template>
    </CodexBlock>
  </article>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'

const props = defineProps<{ pokemon: Pokemon, comparing: boolean, comite: boolean }>()
const emit = defineEmits<{ close: [id: string], compare: [id: string], open: [id: string], copy: [pokemon: Pokemon], export: [pokemon: Pokemon] }>()
const { show, hide, pin } = useMoveTip()

const signature = computed(() => roster.attaques[props.pokemon.signatureId])

const heroBackground = computed(() => {
  const [first, second = first] = props.pokemon.types.map(type => TYPE_COLORS[type])
  return `linear-gradient(160deg, ${first} 0%, ${second} 100%)`
})

const stats = computed(() => STAT_KEYS.map(([key, label]) => ({
  key, label, value: props.pokemon.stats[key], official: props.pokemon.statsOfficielles[key],
  delta: props.pokemon.stats[key] - props.pokemon.statsOfficielles[key],
})))

const setMoves = computed(() => props.pokemon.setParDefaut.attaquesIds.map(id => roster.attaques[id]).filter(move => move !== undefined).map(move => ({
  ...move, stab: isStab(props.pokemon, move), hors: props.pokemon.setParDefaut.horsMovepool.includes(move.id),
})))

const chart = computed(() => ALL_TYPES.map((type) => {
  const multiplier = effectiveness(type, props.pokemon.types)
  const bg = multiplier >= 4 ? '#b0281e' : multiplier >= 2 ? '#d8603a' : multiplier === 0 ? '#0a0c10' : multiplier < 1 ? '#2f7a50' : 'transparent'
  return { type, multiplier, bg }
}))

const byName = new Map(roster.pokemon.map(p => [plainText(p.nom), p]))
const contres = computed(() => props.pokemon.contresIds.map(id => findPokemon(id)!).filter(Boolean))
const ilContre = computed(() => props.pokemon.ilContre.map(id => findPokemon(id)!).filter(Boolean))
const piegeables = computed(() => (props.pokemon.piegeables ?? []).map(nom => byName.get(plainText(nom))).filter((p): p is Pokemon => Boolean(p)))
</script>

<style scoped>
.fiche {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  animation: slide .25s both;
}

.hero {
  position: relative;
  border-radius: var(--r);
  overflow: hidden;
  box-shadow: var(--pnS);
  padding: 14px;
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
}

.hero__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, .05), rgba(10, 12, 18, .55));
}

.hero__portrait {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, .28) 0 55%, transparent 56%);
  display: grid;
  place-items: center;
}

.hero__shadow {
  position: absolute;
  width: 62px;
  height: 74px;
  border-radius: 50% 50% 40% 40%;
  background: rgba(0, 0, 0, .35);
}

.hero__sprite {
  position: relative;
  width: 120px;
  height: 120px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, .3));
}

.hero__text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #fff;
  min-width: 0;
}

.hero__top {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.hero__name {
  flex: 1;
  margin: 0;
  font: 700 28px/1 'Pixelify Sans', sans-serif;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .6);
}

.hero__close {
  flex: none;
  border: 0;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 0, 0, .4);
  color: #fff;
  font: 700 18px 'Nunito', sans-serif;
}

.hero__types { display: flex; gap: 5px; flex-wrap: wrap; }

.hero__type {
  height: 24px;
  padding: 0 10px;
  border-radius: 5px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .55);
  font: 700 14px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .2), 0 0 0 2px rgba(255, 255, 255, .6);
}

.hero__roles { font: 700 13px/1.4 'Nunito', sans-serif; }

.hero__chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: auto;
}

.hero__chip {
  height: 24px;
  padding: 0 8px;
  border-radius: 5px;
  background: rgba(0, 0, 0, .4);
  font: 700 12px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 4px;
}

.hero__chip b { font: 600 14px 'Pixelify Sans', sans-serif; }
.hero__chip--tier { background: rgba(47, 116, 163, .85); }

.hero__compare {
  border: 0;
  cursor: pointer;
  height: 24px;
  padding: 0 10px;
  border-radius: 5px;
  background: var(--uA);
  color: var(--uAtx);
  font: 700 12px 'Nunito', sans-serif;
}

.correction {
  padding: 10px 12px;
  border-radius: var(--r);
  background: #3a2216;
  box-shadow: inset 0 0 0 2px #e8704a, 0 0 0 2px var(--bd);
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.correction__tag {
  flex: none;
  height: 22px;
  padding: 0 7px;
  border-radius: 4px;
  background: #e8704a;
  color: #1a0a00;
  font: 700 12px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.correction__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font: 400 14px/1.45 'Nunito', sans-serif;
  color: #ffd9c8;
}

.correction__text b { color: var(--tx); }

.conseil {
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--uB);
  box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 2px var(--bd);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conseil__title { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--uT); }
.conseil__text { font: 700 14px/1.45 'Nunito', sans-serif; color: #fff3d6; }

.num { font: 600 15px 'Pixelify Sans', sans-serif; }

.stat {
  display: grid;
  grid-template-columns: 62px 34px minmax(0, 1fr) 52px;
  align-items: center;
  gap: 8px;
}

.stat__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.stat__value { font: 600 16px 'Pixelify Sans', sans-serif; text-align: right; }

.stat__track {
  position: relative;
  height: 14px;
  border-radius: 3px;
  background: var(--in);
  overflow: hidden;
}

.stat__ghost {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .22) 0 3px, rgba(255, 255, 255, .08) 3px 6px);
}

.stat__bar {
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .2);
  animation: grow .5s steps(10) both;
}

.stat__delta { font: 600 14px 'Pixelify Sans', sans-serif; text-align: right; }

.legend {
  font: 700 11px 'Nunito', sans-serif;
  color: var(--mu);
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend__ghost {
  width: 18px;
  height: 8px;
  background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .4) 0 3px, rgba(255, 255, 255, .12) 3px 6px);
}

.title { font: 700 17px 'Nunito', sans-serif; }
.text { font: 400 14px/1.45 'Nunito', sans-serif; }
.text--muted { color: var(--mu); font-size: 13px; }
.lore { font: italic 400 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.note { font: 400 13px/1.4 'Nunito', sans-serif; color: var(--mu); }

.comite {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--in);
  box-shadow: inset 0 0 0 1px var(--uA);
  font: 700 12px/1.4 'Nunito', sans-serif;
  color: var(--uT);
}

.sig {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sig__name {
  cursor: help;
  font: 700 17px 'Nunito', sans-serif;
  text-decoration: underline dotted var(--mu);
  text-underline-offset: 4px;
}

.sig__type {
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .55);
  font: 700 12px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.sig__cat {
  height: 22px;
  padding: 0 8px 0 6px;
  border-radius: 4px;
  background: var(--in);
  font: 700 12px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sig__shape { width: 10px; height: 10px; box-shadow: 0 0 0 2px rgba(0, 0, 0, .4); }

.nums {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.nums__cell {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--in);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nums__cell span { font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.nums__cell b { font: 600 17px 'Pixelify Sans', sans-serif; }

.ajouts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 2px solid var(--chip);
}

.ajouts__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.ajouts__list { display: flex; gap: 4px; flex-wrap: wrap; }

.ajouts__move {
  cursor: help;
  height: 24px;
  padding: 0 8px;
  border-radius: 5px;
  background: var(--chip);
  font: 700 13px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.set__chips { display: flex; gap: 6px; flex-wrap: wrap; }

.set__chip {
  height: 26px;
  padding: 0 9px;
  border-radius: 5px;
  background: var(--in);
  font: 700 13px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.set__chip span { color: var(--mu); }

.set__moves {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.set__move {
  cursor: help;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  background: var(--chip);
  font: 700 13px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
}

.set__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.set__move--hors { opacity: .6; }
.set__move--hors .set__name { text-decoration: line-through; }
.set__flag { flex: none; font: 700 10px 'Nunito', sans-serif; }
.set__flag--sig { color: var(--uT); }
.set__flag--stab { color: var(--info); }
.set__flag--hors { color: #ffd23a; }
.set__pp { flex: none; margin-left: auto; font: 700 10px 'Nunito', sans-serif; color: var(--mu); }
.set__pp b { font: 600 12px 'Pixelify Sans', sans-serif; color: var(--tx); }
.set__actions { display: flex; gap: 6px; flex-wrap: wrap; }

.chart {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 4px;
}

.chart__cell {
  border-radius: 5px;
  overflow: hidden;
  background: var(--in);
  display: flex;
  flex-direction: column;
}

.chart__cell--weak { box-shadow: inset 0 0 0 2px #fff; }

.chart__type {
  height: 18px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Nunito', sans-serif;
  display: grid;
  place-items: center;
  white-space: nowrap;
  overflow: hidden;
}

.chart__value {
  height: 24px;
  display: grid;
  place-items: center;
  font: 600 14px 'Pixelify Sans', sans-serif;
}

.sub { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.sub--sep { padding-top: 8px; border-top: 2px solid var(--chip); }
.chips { display: flex; gap: 4px; flex-wrap: wrap; }
</style>

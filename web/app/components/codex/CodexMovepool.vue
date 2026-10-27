<template>
  <CodexBlock title="Movepool">
    <template #aside>
      <span class="count">{{ pokemon.movepool.length }}</span><span class="tag">Lecture seule</span>
    </template>
    <button v-if="!open" type="button" class="toggle" aria-expanded="false" @click="open = true">
        Voir les <b>{{ pokemon.movepool.length }}</b> attaques ▾
      </button>
      <template v-else>
        <div class="filters">
          <input v-model="query" class="filters__search" placeholder="Chercher une attaque" aria-label="Chercher dans le movepool">
          <select v-model="type" class="filters__select" aria-label="Type">
            <option value="">Type</option>
            <option v-for="value in types" :key="value" :value="value">{{ value }}</option>
          </select>
          <select v-model="categorie" class="filters__select" aria-label="Catégorie">
            <option value="">Catégorie</option>
            <option v-for="(label, value) in CATEGORY_LABELS" :key="value" :value="value">{{ label }}</option>
          </select>
          <button type="button" class="filters__sort" :class="{ 'filters__sort--on': byPower }" :aria-pressed="byPower" @click="byPower = !byPower">Puissance ↓</button>
        </div>
        <div class="legend">
          <span>✋ Contact</span><span>♪ Son</span><span>⌒ Morsure</span><span>✦ Danse</span><span>× Plusieurs coups</span>
          <span class="legend__set">● Set par défaut</span><span class="legend__stab">STAB : même type</span>
        </div>
        <div v-if="rows.length" role="table" class="table">
          <div role="row" class="row row--head">
            <span>Attaque</span><span>Type</span><span title="Catégorie">Cat.</span><span class="row__num">Pui.</span><span class="row__num">Préc.</span><span class="row__num">PP</span><span>Propr.</span>
          </div>
          <div
            v-for="row in rows"
            :key="row.move.id"
            role="row"
            tabindex="0"
            class="row"
            :class="{ 'row--stab': row.stab }"
            :style="{ boxShadow: row.stab ? `inset 3px 0 0 ${TYPE_COLORS[row.move.type]}` : undefined }"
            @mouseenter="event => show(event, row.move.id, pokemon.id)"
            @mouseleave="hide"
            @focus="event => show(event, row.move.id, pokemon.id)"
            @blur="hide"
            @click="event => pin(event, row.move.id, pokemon.id)"
          >
            <span class="row__name">
              <span class="row__title">
                <span v-if="row.inSet" class="row__set" title="Dans le set par défaut">●</span>
                <span class="row__label">{{ row.move.nom }}</span>
                <span v-if="row.stab" class="row__stab">STAB</span>
              </span>
              <span v-if="row.badges.length" class="row__badges">
                <span v-for="badge in row.badges" :key="badge.label" class="badge" :style="{ background: badge.bg, color: badge.fg }">{{ badge.label }}</span>
              </span>
            </span>
            <span class="row__type" :style="{ background: TYPE_COLORS[row.move.type] }">{{ row.move.type }}</span>
            <span class="row__cat" :title="CATEGORY_LABELS[row.move.categorie]" :style="categoryShape(row.move.categorie)" />
            <span class="row__num">{{ row.move.puissance ?? '—' }}</span>
            <span class="row__num">{{ row.move.precision ?? '∞' }}</span>
            <span class="row__num">{{ row.move.pp ?? '?' }}</span>
            <span class="row__props" :title="row.properties.map(p => p.label).join(', ') || 'Aucune'">{{ row.properties.map(p => p.icone).join(' ') || '—' }}</span>
          </div>
        </div>
        <p v-else class="none">Aucune attaque ne correspond.</p>
        <button type="button" class="toggle toggle--close" aria-expanded="true" @click="open = false">Replier ▴</button>
      </template>
  </CodexBlock>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'

const props = defineProps<{ pokemon: Pokemon }>()
const { show, hide, pin } = useMoveTip()

const open = ref(false)
const query = ref('')
const type = ref('')
const categorie = ref('')
const byPower = ref(false)

const moves = computed(() => props.pokemon.movepool.map(id => roster.attaques[id]).filter(move => move !== undefined))
const types = computed(() => [...new Set(moves.value.map(move => move.type))].sort((a, b) => a.localeCompare(b, 'fr')))

const rows = computed(() => {
  const words = plainText(query.value)
  const filtered = moves.value.filter(move => (!words || plainText(move.nom).includes(words)) && (!type.value || move.type === type.value)
    && (!categorie.value || move.categorie === categorie.value))
  filtered.sort((a, b) => {
    const signature = Number(b.id === props.pokemon.signatureId) - Number(a.id === props.pokemon.signatureId)
    if (signature) return signature
    return byPower.value ? (b.puissance ?? 0) - (a.puissance ?? 0) : a.nom.localeCompare(b.nom, 'fr')
  })
  return filtered.map((move) => {
    const badges = []
    if (move.id === props.pokemon.signatureId) badges.push({ label: '★ Signature', bg: 'var(--uA)', fg: 'var(--uAtx)' })
    if (props.pokemon.ajoutsMovepoolIds.includes(move.id)) badges.push({ label: '+ Ajout PokéDraft', bg: '#48c070', fg: '#062010' })
    if (move.origine === 'officielle modifiée') badges.push({ label: '✎ Modifiée', bg: '#e8704a', fg: '#1a0a00' })
    return {
      move,
      badges,
      stab: isStab(props.pokemon, move),
      inSet: props.pokemon.setParDefaut.attaquesIds.includes(move.id),
      properties: moveProperties(move),
    }
  })
})
</script>

<style scoped>
.count { font: 600 14px 'Pixelify Sans', sans-serif; }

.toggle {
  border: 0;
  cursor: pointer;
  height: 38px;
  border-radius: 8px;
  background: var(--chip);
  color: var(--tx);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
}

.toggle b { font: 600 16px 'Pixelify Sans', sans-serif; color: var(--uA); }

.toggle--close {
  align-self: center;
  height: 30px;
  padding: 0 12px;
  background: transparent;
  color: var(--mu);
  font-size: 12px;
}

.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.filters__search {
  flex: 1 1 140px;
  min-width: 0;
  height: 32px;
  border: 0;
  border-radius: 7px;
  padding: 0 10px;
  font-weight: 700;
  font-size: 13px;
  background: #fff;
  color: #22252b;
  outline: none;
}

.filters__select {
  height: 32px;
  border: 0;
  border-radius: 7px;
  padding: 0 6px;
  font-weight: 700;
  font-size: 12px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
}

.filters__sort {
  border: 0;
  cursor: pointer;
  height: 32px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--in);
  color: var(--tx);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
}

.filters__sort--on { background: var(--uA); color: var(--uAtx); }

.legend {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.legend__set { color: var(--uA); }
.legend__stab { color: #9fd8ff; }

.table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px 22px 36px 42px 26px 50px;
  gap: 6px;
  align-items: center;
  padding: 5px 6px;
  border-radius: 5px;
  cursor: help;
  outline: none;
}

.row:hover, .row:focus-visible { background: var(--chip); }

.row--head {
  cursor: default;
  padding: 0 6px 4px;
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
  border-bottom: 2px solid var(--chip);
}

.row--head:hover { background: transparent; }
.row--stab { background: rgba(159, 216, 255, .07); }

.row__name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row__title {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.row__set { color: var(--uA); font-size: 11px; }

.row__label {
  font: 400 13px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row--stab .row__label { font-weight: 700; }
.row__stab { flex: none; font: 700 9px 'Atkinson Hyperlegible', sans-serif; color: #9fd8ff; }

.row__badges {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.badge {
  height: 16px;
  padding: 0 5px;
  border-radius: 3px;
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.row__type {
  height: 18px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: grid;
  place-items: center;
  white-space: nowrap;
  overflow: hidden;
}

.row__cat {
  width: 11px;
  height: 11px;
  justify-self: center;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, .45);
}

.row__num {
  font: 600 13px 'Pixelify Sans', sans-serif;
  text-align: right;
}

.row--head .row__num { font: inherit; }

.row__props {
  font: 600 12px 'Pixelify Sans', sans-serif;
  color: var(--uA);
  letter-spacing: 1px;
  white-space: nowrap;
}

.none {
  margin: 0;
  padding: 14px;
  text-align: center;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

@media (max-width: 640px) {
  .row { grid-template-columns: minmax(0, 1fr) 56px 18px 30px 34px; }
  .row > :nth-child(6), .row > :nth-child(7) { display: none; }
}
</style>

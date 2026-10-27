<template>
  <UiPanel title="Ton équipe">
    <template #aside>{{ selected.length }}/{{ TEAM_SIZE }} · sets de l'Atelier ou par défaut</template>

    <div class="slots">
      <div v-for="index in TEAM_SIZE" :key="index" class="slot" :class="{ 'slot--empty': !team[index - 1] }">
        <template v-if="team[index - 1]">
          <span class="slot__sprite" :style="{ backgroundImage: `url(${team[index - 1]!.sprite})` }" />
          <span class="slot__name">{{ team[index - 1]!.nom }}</span>
          <span v-if="index === 1" class="slot__lead">Tête</span>
          <button v-else type="button" class="slot__action" title="Mettre en tête" @click="makeLead(team[index - 1]!.id)">▲</button>
          <button type="button" class="slot__remove" :aria-label="`Retirer ${team[index - 1]!.nom}`" @click="toggle(team[index - 1]!.id)">✕</button>
        </template>
        <span v-else class="slot__placeholder">{{ index }}</span>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="btn btn--small" @click="randomize">⚄ Équipe au hasard</button>
      <button type="button" class="btn btn--small" :disabled="!selected.length" @click="clear">Vider</button>
      <span class="actions__spacer" />
      <input v-model="query" class="field actions__search" placeholder="Nom, type ou talent…" aria-label="Filtrer le roster">
    </div>

    <div class="grid">
      <button
        v-for="pokemon in filtered"
        :key="pokemon.id"
        type="button"
        class="card"
        :class="{ 'card--picked': selected.includes(pokemon.id) }"
        :disabled="!selected.includes(pokemon.id) && complete"
        @click="toggle(pokemon.id)"
      >
        <span class="card__sprite" :style="{ backgroundImage: `url(${pokemon.sprite})` }" />
        <span class="card__name">{{ pokemon.nom }}</span>
        <span class="card__types">
          <TypeBadge v-for="type in pokemon.types" :key="type" :type="type" small />
        </span>
        <span v-if="selected.includes(pokemon.id)" class="card__rank">{{ selected.indexOf(pokemon.id) + 1 }}</span>
      </button>
    </div>

    <div v-if="entries.length" class="details">
      <div v-for="(entry, index) in entries" :key="entry.pokemon.id" class="detail">
        <span class="detail__name">{{ entry.pokemon.nom }}</span>
        <div class="detail__line">
          <select
            class="detail__select"
            :value="entry.choice"
            :aria-label="`Set de ${entry.pokemon.nom}`"
            @change="event => chooseVariant(entry.pokemon.id, Number((event.target as HTMLSelectElement).value))"
          >
            <option :value="DEFAULT_SET">Set par défaut</option>
            <option v-for="(variant, variantIndex) in variants(entry.pokemon.id)" :key="variantIndex" :value="variantIndex">
              {{ variant.favorite ? '★ ' : '' }}{{ variant.nom }}
            </option>
          </select>
          <ItemIcon :id="entry.variant.objetId" />
          <span class="detail__meta">{{ findObjet(entry.variant.objetId)?.nom ?? itemName(entry.variant.objetId) }} · {{ entry.pokemon.talent.nom }} · {{ findNature(entry.variant.natureId)?.nom }}</span>
          <NuxtLink class="detail__edit" :to="`/pokedraft/atelier?id=${entry.pokemon.id}`">Modifier ▸</NuxtLink>
        </div>
        <span class="detail__moves">
          <span v-for="move in sets[index]!.moves" :key="move" class="detail__move" :style="{ background: moveColor(move) }">{{ moveName(move) }}</span>
          <span v-if="entry.choice === DEFAULT_SET && entry.pokemon.setParDefaut.horsMovepool.length" class="detail__warning detail__warning--struck" :title="`Retirée${entry.pokemon.setParDefaut.horsMovepool.length > 1 ? 's' : ''} : hors movepool dans la fiche`">
            ! {{ entry.pokemon.setParDefaut.horsMovepool.map(moveName).join(', ') }}
          </span>
          <span v-for="warning in entry.warnings" :key="warning" class="detail__warning">! {{ warning }}</span>
        </span>
      </div>
    </div>
  </UiPanel>
</template>

<script setup lang="ts">
const { selected, team, entries, sets, complete, toggle, randomize, makeLead, chooseVariant, clear } = useTeamPicker()
const { variants } = useAtelier()
const query = ref('')

const filtered = computed(() => {
  const words = toId(query.value)
  if (!words) return roster.pokemon
  return roster.pokemon.filter(p => toId([p.nom, p.talent.nom, ...p.types, p.signature.nom].join(' ')).includes(words))
})

const moveColor = (moveId: string) => {
  const move = findMove(moveId)
  return move ? TYPE_COLORS[move.type] : 'var(--chip)'
}
</script>

<style scoped>
.slots {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.slot {
  position: relative;
  height: 64px;
  border-radius: 9px;
  background: var(--chip);
  box-shadow: 0 0 0 2px var(--bd);
  display: flex;
  align-items: flex-end;
  padding: 4px 6px;
  box-sizing: border-box;
  overflow: hidden;
}

.slot--empty {
  background: var(--dk);
  justify-content: center;
  align-items: center;
}

.slot__placeholder {
  font: 600 22px 'Pixelify Sans', sans-serif;
  color: var(--chip);
}

.slot__sprite {
  position: absolute;
  right: -4px;
  top: -6px;
  width: 58px;
  height: 58px;
  background: center/contain no-repeat;
  image-rendering: pixelated;
}

.slot__name {
  position: relative;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  text-shadow: 1px 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot__lead, .slot__action, .slot__remove {
  position: absolute;
  top: 4px;
  height: 18px;
  border: 0;
  border-radius: 4px;
  font: 700 10px 'Atkinson Hyperlegible', sans-serif;
  display: grid;
  place-items: center;
}

.slot__lead {
  left: 4px;
  padding: 0 5px;
  background: var(--sel);
  color: var(--selTx);
}

.slot__action, .slot__remove {
  width: 18px;
  cursor: pointer;
  background: rgba(0, 0, 0, .45);
  color: #fff;
}

.slot__action { left: 4px; }
.slot__remove { left: 26px; }

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.actions__spacer { flex: 1; }
.actions__search { flex: 0 1 240px; height: 32px; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
  padding: 3px;
}

.card {
  position: relative;
  border: 0;
  cursor: pointer;
  border-radius: 9px;
  background: var(--dk);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--bd);
  padding: 4px 6px 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  text-align: left;
  transition: transform .12s;
}

.card:hover:not(:disabled) { transform: translateY(-2px); }
.card:disabled { opacity: .4; cursor: not-allowed; }

.card--picked {
  background: var(--uA);
  color: var(--uAtx);
}

.card__sprite {
  align-self: center;
  width: 56px;
  height: 56px;
  background: center/contain no-repeat;
  image-rendering: pixelated;
}

.card__name {
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.card__types {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.card__rank {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--uAtx);
  color: var(--uA);
  display: grid;
  place-items: center;
  font: 600 13px 'Pixelify Sans', sans-serif;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 2px solid var(--chip);
  padding-top: 10px;
}

.detail {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 2px 10px;
  align-items: center;
}

.detail__name { font: 700 14px 'Pixelify Sans', sans-serif; grid-row: span 2; }

.detail__line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.detail__select {
  height: 26px;
  border: 0;
  border-radius: 6px;
  padding: 0 6px;
  font-weight: 700;
  font-size: 12px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
}

.detail__meta { flex: 1; min-width: 0; font: 400 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.detail__edit { font: 700 12px 'Atkinson Hyperlegible', sans-serif; }

.detail__moves {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.detail__move {
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .5);
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.detail__warning {
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  background: #ffd23a;
  color: #2a2410;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.detail__warning--struck { text-decoration: line-through; }
</style>

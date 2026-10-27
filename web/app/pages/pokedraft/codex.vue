<template>
  <div class="codex">
    <div class="codex__head">
      <div class="codex__heading">
        <h1 class="codex__title">Codex</h1>
        <span class="codex__subtitle">Roster de la saison {{ roster.saison }} · {{ list.length }} fiche{{ list.length > 1 ? 's' : '' }} sur {{ roster.pokemon.length }}</span>
      </div>
      <div class="codex__tabs">
        <button
          v-for="tab in VIEWS"
          :key="tab.value"
          type="button"
          class="codex__tab"
          :class="{ 'codex__tab--active': view === tab.value }"
          :aria-pressed="view === tab.value"
          @click="view = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="filters">
      <input v-model="filters.q" class="field filters__search" placeholder="Nom, talent ou attaque…" aria-label="Rechercher">
      <label v-for="select in selects" :key="select.key" class="filters__field">
        <span class="filters__label">{{ select.label }}</span>
        <select v-model="filters[select.key]" class="filters__select">
          <option v-for="option in select.options" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="filters__comite" title="Réservé au comité d'équilibrage">
        <input v-model="comite" type="checkbox">Vue comité
      </label>
    </div>

    <div v-if="comparePick && selectedPokemon" class="pick">
      <span class="pick__icon">⇄</span>
      <span class="pick__text">Choisis une deuxième fiche à comparer avec {{ selectedPokemon.nom }}.</span>
      <button type="button" class="pick__cancel" @click="comparePick = false">Annuler</button>
    </div>

    <div class="codex__body" :class="{ 'codex__body--fiche': fiches.length === 1, 'codex__body--compare': fiches.length === 2 }">
      <div class="codex__list">
        <div v-if="!list.length" class="empty">
          <span class="empty__icon">?</span>
          <span class="empty__title">Aucune fiche</span>
          <span class="empty__text">Aucun Pokémon ne correspond à ces filtres.</span>
          <button type="button" class="btn btn--primary" @click="resetFilters">Réinitialiser les filtres</button>
        </div>

        <template v-else-if="view === 'gen'">
          <section v-for="group in groups" :key="group.label" class="group">
            <div class="group__head">
              <h2 class="group__title">{{ group.label }}</h2>
              <span class="group__line" />
              <span class="group__count">{{ group.pokemon.length }}</span>
            </div>
            <div class="group__grid">
              <CodexCard
                v-for="pokemon in group.pokemon"
                :key="pokemon.id"
                :pokemon="pokemon"
                :selected="pokemon.id === selected || pokemon.id === compared"
                :stat-key="filters.sort"
                :comite="comite"
                :ready="hasVariant(pokemon.id)"
                @open="open"
              />
            </div>
          </section>
        </template>

        <div v-else class="archetypes">
          <CodexArchetype v-for="archetype in archetypes" :key="archetype.nom" :archetype="archetype" @open="open" />
        </div>
      </div>

      <div v-if="fiches.length" class="codex__fiches">
        <div class="codex__fiches-grid">
          <CodexFiche
            v-for="pokemon in fiches"
            :key="pokemon.id"
            :pokemon="pokemon"
            :comparing="fiches.length === 2"
            :comite="comite"
            @close="close"
            @compare="toggleCompare"
            @open="open"
            @copy="copy"
            @export="exportSet"
          />
        </div>
      </div>
    </div>

    <CodexMoveTip />
    <div v-if="toast" role="status" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Pokemon } from '#data/types/roster'

const VIEWS = [{ value: 'gen', label: 'Par génération' }, { value: 'arch', label: 'Par archétype' }] as const

const { filters, view, comite, comparePick, selected, compared, options, list, groups, archetypes, open, close, toggleCompare, resetFilters } = useCodex()
const { copyDefaultSet, hasVariant } = useAtelier()

useHead({ title: 'Codex · PokéDraft' })

const selectedPokemon = computed(() => selected.value ? findPokemon(selected.value) : undefined)
const fiches = computed(() => [selected.value, compared.value].filter((id): id is string => Boolean(id)).map(id => findPokemon(id)!))

const selects = computed(() => [
  { key: 'type' as const, label: 'Type', options: [{ value: '', label: 'Tous' }, ...options.value.types.map(value => ({ value, label: value }))] },
  { key: 'role' as const, label: 'Rôle', options: [{ value: '', label: 'Tous' }, ...options.value.roles.map(value => ({ value, label: value }))] },
  { key: 'archetype' as const, label: 'Archétype', options: [{ value: '', label: 'Tous' }, ...ARCHETYPES.map(({ nom }) => ({ value: nom, label: nom }))] },
  { key: 'generation' as const, label: 'Génération', options: [{ value: '', label: 'Toutes' }, ...options.value.generations.map(value => ({ value, label: `Gen ${value}` }))] },
  { key: 'sort' as const, label: 'Trier par', options: [{ value: 'nom', label: 'Nom' }, ...STAT_KEYS.map(([value, label]) => ({ value, label }))] },
])

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const say = (text: string) => {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2400)
}

const copy = (pokemon: Pokemon) => {
  const variant = copyDefaultSet(pokemon)
  say(variant === null
    ? `${pokemon.nom} a déjà ${MAX_VARIANTES} variantes dans l'Atelier.`
    : `Set de ${pokemon.nom} copié dans l'Atelier (variante ${variant}).`)
}

const exportSet = async (pokemon: Pokemon) => {
  try {
    await navigator.clipboard.writeText(variantText(pokemon, defaultVariant(pokemon)))
    say(`Set de ${pokemon.nom} copié dans le presse-papiers.`)
  } catch {
    say('Copie impossible : le navigateur refuse l\'accès au presse-papiers.')
  }
}

onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<style scoped>
.codex {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.codex__head {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.codex__heading {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.codex__title {
  margin: 0;
  font: 700 30px/1 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
}

.codex__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.codex__tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--dk);
  box-shadow: var(--pnS);
}

.codex__tab {
  border: 0;
  cursor: pointer;
  height: 34px;
  padding: 0 12px;
  border-radius: 7px;
  background: transparent;
  color: var(--mu);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
}

.codex__tab--active { background: var(--uA); color: var(--uAtx); }

.filters {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.filters__search { flex: 1 1 220px; }

.filters__field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filters__label { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.filters__select {
  height: 34px;
  max-width: 170px;
  border: 0;
  border-radius: 7px;
  padding: 0 8px;
  font-weight: 700;
  font-size: 13px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  outline: none;
}

.filters__comite {
  margin-left: auto;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  opacity: .7;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.filters__comite input { accent-color: var(--uA); }

.pick {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--r);
  background: var(--uA);
  color: var(--uAtx);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  animation: pop .25s both;
}

.pick__icon { font: 700 18px 'Pixelify Sans', sans-serif; }
.pick__text { flex: 1; }

.pick__cancel {
  border: 0;
  cursor: pointer;
  height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  background: var(--uAtx);
  color: var(--uA);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

.codex__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.codex__body--fiche { grid-template-columns: minmax(0, 1fr) 470px; }

.codex__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.codex__body--compare .codex__list { display: none; }

.codex__fiches {
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  padding: 2px 4px 4px 2px;
}

.codex__body--compare .codex__fiches {
  position: static;
  max-height: none;
  overflow: visible;
  padding: 0;
}

.codex__fiches-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.codex__body--compare .codex__fiches-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: pop .3s both;
}

.group__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group__title {
  margin: 0;
  font: 600 18px 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
}

.group__line { flex: 1; height: 2px; background: var(--chip); }
.group__count { font: 600 14px 'Pixelify Sans', sans-serif; color: var(--mu); }

.group__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.archetypes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.empty {
  padding: 30px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  text-align: center;
}

.empty__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--chip);
  display: grid;
  place-items: center;
  font: 700 28px 'Pixelify Sans', sans-serif;
  color: var(--mu);
}

.empty__title { font: 700 22px 'Pixelify Sans', sans-serif; }
.empty__text { font: 400 15px/1.5 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 50;
  padding: 12px 18px;
  border-radius: 10px;
  background: var(--dk);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--uA), 0 10px 30px rgba(0, 0, 0, .5);
  font: 700 14px 'Atkinson Hyperlegible', sans-serif;
  animation: pop .2s both;
}

@media (max-width: 1280px) {
  .codex__body--fiche { grid-template-columns: minmax(0, 1fr) 420px; }
}

@media (max-width: 980px) {
  .codex__body--fiche, .codex__body--compare { grid-template-columns: minmax(0, 1fr); }
  .codex__body--compare .codex__list { display: flex; }

  .codex__fiches, .codex__body--compare .codex__fiches {
    position: fixed;
    inset: 0;
    z-index: 40;
    max-height: none;
    overflow-y: auto;
    padding: 12px;
    background: rgba(8, 10, 14, .94);
  }

  .codex__body--compare .codex__fiches-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

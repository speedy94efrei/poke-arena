<template>
  <div class="atelier">
    <div class="atelier__head">
      <div class="atelier__heading">
        <h1 class="atelier__title">Atelier PokéDraft</h1>
        <span class="atelier__subtitle">Jusqu'à {{ MAX_VARIANTES }} variantes par Pokémon. La favorite est prise par défaut dans ton équipe de combat.</span>
      </div>
      <AtelierSync />
      <span class="atelier__ready"><span class="atelier__check">✓</span><b>{{ readyCount }}</b>/{{ roster.pokemon.length }} prêts</span>
    </div>

    <div v-if="notice" role="status" class="notice">
      <span>{{ notice }}</span>
      <button type="button" class="notice__close" aria-label="Fermer" @click="notice = ''">✕</button>
    </div>

    <div class="atelier__body">
      <AtelierRoster :selected-id="pokemon.id" @select="select" />

      <section aria-label="Éditeur" class="editor">
        <AtelierHeader
          :pokemon="pokemon"
          :tabs="tabs"
          :current="current"
          :saved="saved"
          @select="index => current = index"
          @favorite="favorite"
          @add="add"
          @duplicate="duplicateCurrent"
          @remove="removeCurrent"
        />

        <div v-if="warnings.length" role="alert" class="warning">
          <span class="warning__tag">⚠ À vérifier</span>
          <div class="warning__list">
            <span v-for="warning in warnings" :key="warning">{{ warning }}</span>
          </div>
        </div>

        <div class="editor__grid">
          <div class="editor__column">
            <CodexBlock title="Talent">
              <template #aside><span class="tag">Fixe · celui de la fiche</span></template>
              <span class="talent__name">{{ pokemon.talent.nom }}</span>
              <span class="talent__effect">{{ pokemon.talent.effet }}</span>
              <span v-if="pokemon.talent.lore" class="talent__lore">« {{ pokemon.talent.lore }} »</span>
            </CodexBlock>
            <AtelierMoves :key="`${pokemon.id}-${current}`" :pokemon="pokemon" :variant="variant" @update="update" />
          </div>
          <div class="editor__column">
            <AtelierItem :key="`objet-${pokemon.id}`" :pokemon="pokemon" :variant="variant" @update="update" />
            <AtelierStats :key="`stats-${pokemon.id}-${current}`" :pokemon="pokemon" :variant="variant" @update="update" />
            <div class="editor__actions">
              <button type="button" class="btn btn--primary" @click="exportText">Exporter en texte</button>
              <button type="button" class="btn" @click="reset">Revenir au set par défaut</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <CodexMoveTip />
    <div v-if="toast" role="status" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Variante } from '~/utils/atelier'

const route = useRoute()
const router = useRouter()
const { store, notice, variants, update: save, addVariant, duplicate, remove, setFavorite } = useAtelier()

useHead({ title: 'Atelier · PokéDraft' })

const pokemon = computed(() => (typeof route.query.id === 'string' && findPokemon(route.query.id)) || roster.pokemon[0]!)
const current = ref(0)
const saved = computed(() => variants(pokemon.value.id).length > 0)
const tabs = computed(() => saved.value ? variants(pokemon.value.id) : [{ ...defaultVariant(pokemon.value), favorite: true }])
const variant = computed(() => tabs.value[Math.min(current.value, tabs.value.length - 1)]!)
const warnings = computed(() => variantWarnings(pokemon.value, variant.value))
const readyCount = computed(() => Object.keys(store.value).length)

watch(() => pokemon.value.id, () => {
  current.value = 0
})

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const say = (text: string) => {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

const select = (id: string) => {
  router.replace({ query: { id } })
}

const update = (patch: Partial<Variante>) => {
  save(pokemon.value, current.value, patch)
}

const favorite = (index: number) => {
  if (!saved.value) save(pokemon.value, 0, {})
  setFavorite(pokemon.value.id, index)
  say('Variante favorite : prise par défaut dans ton équipe de combat.')
}

const add = () => {
  const index = addVariant(pokemon.value)
  if (index !== null) current.value = index
}

const duplicateCurrent = () => {
  const index = duplicate(pokemon.value, variant.value)
  if (index !== null) current.value = index
}

const removeCurrent = () => {
  remove(pokemon.value.id, current.value)
  current.value = 0
  say('Variante supprimée.')
}

const reset = () => {
  const { nom, favorite: isFavorite } = variant.value
  update({ ...defaultVariant(pokemon.value), nom, favorite: isFavorite })
  say('Set par défaut de la fiche rétabli.')
}

const exportText = async () => {
  try {
    await navigator.clipboard.writeText(variantText(pokemon.value, variant.value))
    say('Variante copiée en texte.')
  } catch {
    say('Copie impossible : le navigateur refuse l\'accès au presse-papiers.')
  }
}

onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<style scoped>
.atelier {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.atelier__head {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.atelier__heading {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.atelier__title {
  margin: 0;
  font: 700 30px/1 'Pixelify Sans', sans-serif;
  text-shadow: var(--sh);
}

.atelier__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.atelier__ready {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--dk);
  box-shadow: var(--pnS);
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.notice {
  padding: 8px 8px 8px 14px;
  border-radius: var(--r);
  background: #16301f;
  box-shadow: inset 0 0 0 2px #58d080, 0 0 0 2px var(--bd);
  font: 700 13px/1.4 'Atkinson Hyperlegible', sans-serif;
  color: #d8f5e0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.notice span { flex: 1; }
.notice__close { border: 0; background: none; color: inherit; font-size: 14px; cursor: pointer; padding: 4px 6px; }

.atelier__ready b { font: 600 15px 'Pixelify Sans', sans-serif; }
.atelier__check { color: #58d080; }

.atelier__body {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.editor__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.editor__column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.editor__actions { display: flex; gap: 6px; flex-wrap: wrap; }
.talent__name { font: 700 16px 'Atkinson Hyperlegible', sans-serif; }
.talent__effect { font: 400 14px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.talent__lore { font: italic 400 13px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.warning {
  padding: 10px 12px;
  border-radius: var(--r);
  background: #3a2216;
  box-shadow: inset 0 0 0 2px #e8704a, 0 0 0 2px var(--bd);
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.warning__tag {
  height: 22px;
  padding: 0 7px;
  border-radius: 4px;
  background: #e8704a;
  color: #1a0a00;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.warning__list {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font: 400 14px/1.45 'Atkinson Hyperlegible', sans-serif;
  color: #ffd9c8;
}

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

@media (max-width: 1240px) {
  .editor__grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 980px) {
  .atelier__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

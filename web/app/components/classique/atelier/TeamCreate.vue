<template>
  <form class="create" aria-label="Nouvelle équipe" @submit.prevent="submit">
    <header class="create__head">
      Nouvelle équipe
      <button v-if="closable" type="button" class="create__close" aria-label="Fermer" @click="emit('close')">✕</button>
    </header>
    <div class="create__body">
      <label class="step">
        <span class="step__label">1 · Nom</span>
        <input v-model="name" class="field step__name" maxlength="40" :placeholder="defaultName">
      </label>

      <div class="step">
        <span class="step__label">2 · Format</span>
        <ClassiqueFormatPicker v-model="format" usage="team" />
      </div>

      <div class="step">
        <span class="step__label">3 · Point de départ</span>
        <div class="starts" role="radiogroup" aria-label="Point de départ">
          <button
            v-for="option in STARTS"
            :key="option.id"
            type="button"
            role="radio"
            class="start"
            :class="{ 'start--on': start === option.id }"
            :aria-checked="start === option.id"
            @click="start = option.id"
          >
            <span class="start__icon">{{ option.icon }}</span>
            <span class="start__text"><b>{{ option.title }}</b><span>{{ option.text }}</span></span>
          </button>
        </div>
        <input v-if="start === 'assistant'" v-model="text" class="field" placeholder="Ex. « Une équipe pluie », « Construis autour de Dracolosse »" aria-label="Demande à l'assistant">
        <textarea v-if="start === 'import'" v-model="text" class="field create__paste" rows="8" placeholder="Colle ici l'export texte de Showdown (Pokémon @ Objet, Ability:, EVs:, - Attaque…)" aria-label="Équipe au format texte" />
      </div>

      <div class="create__actions">
        <button type="submit" class="btn btn--primary" :disabled="!format || (start !== 'empty' && !text.trim())">Créer l'équipe</button>
        <span v-if="error" class="create__error" role="alert">{{ error }}</span>
        <span v-else class="create__hint">Tu pourras changer le nom à tout moment.</span>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { TeamStart } from '~/utils/teamBuilder'

const props = defineProps<{ closable: boolean, error: string, count: number }>()
const emit = defineEmits<{ create: [name: string, format: string, start: TeamStart, text: string], close: [] }>()

const STARTS: { id: TeamStart, icon: string, title: string, text: string }[] = [
  { id: 'empty', icon: '○', title: 'Équipe vide', text: 'Ajoute tes Pokémon un par un.' },
  { id: 'assistant', icon: 'IA', title: "Avec l'assistant", text: "Donne un Pokémon ou un style, l'assistant complète les 6." },
  { id: 'import', icon: '⇩', title: 'Importer de Showdown', text: "Colle le texte exporté par Showdown." },
]

const name = ref('')
const format = ref('gen9ou')
const start = ref<TeamStart>('empty')
const text = ref('')
const defaultName = computed(() => `Nouvelle équipe ${props.count + 1}`)

const submit = () => {
  emit('create', name.value.trim() || defaultName.value, format.value, start.value, text.value)
}
</script>

<style scoped>
.create { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; animation: pop .2s both; }

.create__head {
  min-height: 34px;
  padding: 0 8px 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
}

.create__close { margin-left: auto; border: 0; background: rgba(0, 0, 0, .25); color: inherit; border-radius: 5px; width: 24px; height: 24px; cursor: pointer; }
.create__body { padding: 12px; display: flex; flex-direction: column; gap: 14px; }
.step { display: flex; flex-direction: column; gap: 6px; }
.step__label { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); text-transform: uppercase; letter-spacing: .04em; }
.step__name { max-width: 320px; }
.starts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }

.start {
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 10px;
  border-radius: 8px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  display: flex;
  gap: 10px;
  align-items: center;
}

.start--on { box-shadow: inset 0 0 0 2px var(--uA); background: var(--chip); }

.start__icon {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--dk);
  color: var(--uA);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: grid;
  place-items: center;
}

.start__text { display: flex; flex-direction: column; gap: 2px; font: 400 12px/1.35 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.start__text b { font-size: 14px; color: var(--tx); }
.create__paste { height: auto; min-height: 150px; font: 400 13px/1.4 ui-monospace, monospace; resize: vertical; }
.create__actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.create__hint { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.create__error { font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: #ffb070; }

@media (max-width: 760px) {
  .starts { grid-template-columns: minmax(0, 1fr); }
}
</style>

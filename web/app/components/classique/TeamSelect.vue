<template>
  <div class="teams">
    <p v-if="generated" class="teams__note">Équipe fournie par le serveur : six Pokémon tirés au hasard à chaque combat.</p>
    <template v-else>
      <div class="teams__row">
        <select class="field teams__select" :value="modelValue" aria-label="Équipe" @change="event => emit('update:modelValue', (event.target as HTMLSelectElement).value)">
          <option value="" disabled>{{ options.length ? 'Choisis une équipe' : 'Aucune équipe pour ce format' }}</option>
          <option v-for="team in options" :key="team.id" :value="team.id">{{ team.name }}{{ team.format === format ? '' : ` (${team.format})` }}</option>
        </select>
        <button type="button" class="btn btn--small" @click="pasting = !pasting">{{ pasting ? 'Fermer' : 'Coller une équipe' }}</button>
      </div>
      <div v-if="team" class="teams__preview">
        <span v-for="(set, index) in team.sets" :key="index" class="teams__mon" :title="speciesName(set.species)" :style="{ backgroundImage: `url(${spriteUrl(set.species)})` }" />
        <span v-if="team.format !== format" class="teams__warn">Équipe préparée pour {{ team.format }} : le serveur dira si elle est valide ici.</span>
      </div>
      <form v-if="pasting" class="paste" @submit.prevent="importPasted">
        <input v-model="name" class="field" maxlength="40" placeholder="Nom de l'équipe" aria-label="Nom de l'équipe">
        <textarea v-model="text" class="field paste__text" rows="8" placeholder="Colle ici l'export texte de Showdown (Pokémon @ Objet, Ability:, EVs:, - Attaque…)" aria-label="Équipe au format texte" />
        <span v-if="error" class="teams__warn">{{ error }}</span>
        <button type="submit" class="btn btn--primary btn--small" :disabled="!text.trim()">Importer dans Mes équipes</button>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: string, format: string, generated: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [teamId: string] }>()

const { teams, importText } = useClassicTeams()
const pasting = ref(false)
const name = ref('')
const text = ref('')
const error = ref('')

/** Les équipes du format d'abord, puis les autres (le serveur valide au moment du combat). */
const options = computed(() => [...teams.value].sort((a, b) => Number(b.format === props.format) - Number(a.format === props.format)))
const team = computed(() => teams.value.find(entry => entry.id === props.modelValue))

watch(() => props.format, () => {
  if (team.value?.format === props.format) return
  emit('update:modelValue', teams.value.find(entry => entry.format === props.format)?.id ?? '')
}, { immediate: true })

const importPasted = () => {
  const imported = importText(name.value, props.format, text.value)
  if (!imported) {
    error.value = "Aucun Pokémon reconnu : vérifie que c'est bien l'export texte de Showdown."
    return
  }
  error.value = ''
  text.value = ''
  name.value = ''
  pasting.value = false
  emit('update:modelValue', imported.id)
}
</script>

<style scoped>
.teams { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.teams__note { margin: 0; font: 700 13px/1.45 'Nunito', sans-serif; color: var(--mu); }
.teams__row { display: flex; gap: 8px; flex-wrap: wrap; }
.teams__select { flex: 1; min-width: 200px; }
.teams__preview { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; }
.teams__mon { width: 44px; height: 44px; background: center / contain no-repeat; image-rendering: pixelated; }
.teams__warn { font: 700 12px 'Nunito', sans-serif; color: #ffb070; }
.paste { display: flex; flex-direction: column; gap: 6px; }
.paste__text { height: auto; min-height: 150px; font: 400 13px/1.4 ui-monospace, monospace; resize: vertical; }
</style>

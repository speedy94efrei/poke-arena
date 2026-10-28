<template>
  <div class="panels">
    <section class="panel" aria-label="Ton style de jeu">
      <header class="panel__head">Ton style de jeu<span class="panel__aside">{{ profile.label }}</span></header>
      <div class="panel__body">
        <p v-if="!profile.bars.length" class="panel__empty">Ajoute des Pokémon pour voir le profil de ton équipe.</p>
        <div v-for="bar in profile.bars" :key="bar.left" class="bar">
          <span class="bar__labels"><span>{{ bar.left }}</span><span>{{ bar.right }}</span></span>
          <span class="bar__track"><span class="bar__dot" :style="{ left: `${bar.value * 100}%` }" /></span>
        </div>
        <span v-if="profile.bars.length" class="panel__note">Calculé à partir des statistiques et des attaques de ton équipe.</span>
      </div>
    </section>

    <section class="panel" aria-label="Validité">
      <header class="panel__head">Validité · {{ formatName }}</header>
      <div class="panel__body">
        <div v-for="check in checks" :key="check.label" class="check" :class="`check--${check.state}`">
          <span class="check__mark">{{ MARKS[check.state] }}</span>
          <span class="check__label">{{ check.label }}</span>
          <span class="check__detail">{{ check.detail }}</span>
        </div>
        <div class="check" :class="`check--${SERVER_STATES[server.state].state}`">
          <span class="check__mark">{{ SERVER_STATES[server.state].mark }}</span>
          <span class="check__label">{{ SERVER_STATES[server.state].label }}</span>
          <span class="check__detail">{{ server.state === 'error' ? `${server.errors.length} problème${server.errors.length > 1 ? 's' : ''}` : '' }}</span>
        </div>
        <ul v-if="server.errors.length" class="errors">
          <li v-for="error in server.errors" :key="error" :title="error">{{ frenchValidation(error, dex) }}</li>
        </ul>
      </div>
    </section>

    <section class="panel" aria-label="Export Showdown">
      <header class="panel__head">Export Showdown<button type="button" class="panel__copy" :disabled="!text" @click="copy">{{ copied ? 'Copié ✓' : 'Copier' }}</button></header>
      <div class="panel__body">
        <textarea class="export" readonly rows="12" :value="text" aria-label="Équipe au format texte de Showdown" />
        <span class="panel__note">Noms en anglais : c'est le format attendu par l'import de Showdown.</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CheckState, ServerCheck, TeamCheck } from '~/composables/useTeamValidation'
import type { ClassicTeam } from '~/utils/classicTeam'

const props = defineProps<{ team: ClassicTeam, formatName: string, checks: TeamCheck[], server: ServerCheck }>()
const { dex } = usePokedex()

const MARKS: Record<CheckState, string> = { ok: '✓', warn: '!', error: '✕' }
const SERVER_STATES: Record<ServerCheck['state'], { state: CheckState | 'idle', mark: string, label: string }> = {
  offline: { state: 'idle', mark: '…', label: 'Validateur du serveur hors ligne' },
  checking: { state: 'idle', mark: '…', label: 'Vérification par le serveur' },
  ok: { state: 'ok', mark: '✓', label: 'Tout est autorisé dans le format' },
  error: { state: 'error', mark: '✕', label: 'Refusée par le serveur' },
}

const profile = computed(() => styleProfile(props.team.sets, dex.value))

const text = computed(() => {
  if (!props.team.sets.length) return ''
  const names = (kind: 'pokemon' | 'items' | 'abilities' | 'moves', id: string) => dex.value?.[kind][id]?.name ?? id
  return `=== [${props.team.format}] ${props.team.name} ===\n\n${exportTeam(props.team.sets, names)}\n`
})

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const copy = async () => {
  try {
    await navigator.clipboard.writeText(text.value)
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    copied.value = false
  }
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.panels { display: flex; flex-direction: column; gap: 12px; }
.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.panel__head {
  min-height: 34px;
  padding: 0 10px 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel__aside { margin-left: auto; font: 700 12px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; }

.panel__copy {
  margin-left: auto;
  border: 0;
  cursor: pointer;
  height: 24px;
  padding: 0 9px;
  border-radius: 5px;
  background: #fff;
  color: #22252b;
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  text-shadow: none;
}

.panel__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.panel__empty, .panel__note { margin: 0; font: 700 12px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.bar { display: flex; flex-direction: column; gap: 3px; }
.bar__labels { display: flex; justify-content: space-between; font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.bar__track { position: relative; height: 8px; border-radius: 4px; background: linear-gradient(90deg, #3d6fc8, var(--chip) 50%, #c8362a); }

.bar__dot {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--uA);
  box-shadow: 0 0 0 2px var(--bd);
  transform: translate(-50%, -50%);
  transition: left .3s;
}

.check { display: flex; align-items: center; gap: 8px; font: 700 13px 'Atkinson Hyperlegible', sans-serif; }

.check__mark {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--chip);
  color: var(--mu);
  font-size: 12px;
  display: grid;
  place-items: center;
}

.check--ok .check__mark { background: #2f9a58; color: #fff; }
.check--warn .check__mark { background: #e8a33a; color: #1a1000; }
.check--error .check__mark { background: #c8362a; color: #fff; }
.check__label { flex: 1; min-width: 0; }
.check__detail { font-size: 11px; color: var(--mu); }

.errors {
  margin: 0;
  padding: 8px 10px 8px 26px;
  border-radius: 7px;
  background: #3a2216;
  color: #ffd9c8;
  font: 400 12px/1.45 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.export {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  border-radius: 7px;
  padding: 8px 10px;
  background: var(--dk);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  font: 400 12px/1.45 ui-monospace, monospace;
  resize: vertical;
}
</style>

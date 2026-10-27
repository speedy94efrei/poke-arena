<template>
  <div v-if="tip" role="tooltip" class="tip" :class="{ 'tip--sheet': sheet, 'tip--pinned': tip.pinned }" :style="position">
    <div class="tip__head" :style="{ background: move ? TYPE_COLORS[move.type] : 'var(--hd)' }">
      <span class="tip__name">{{ move?.nom ?? tip.moveId }}</span>
      <button v-if="tip.pinned" type="button" class="tip__close" aria-label="Fermer" @click="close">✕</button>
    </div>
    <p v-if="!move" class="tip__missing">Cette attaque n'est pas encore dans le dictionnaire du roster.</p>
    <div v-else class="tip__body">
      <div class="tip__chips">
        <span class="tip__type" :style="{ background: TYPE_COLORS[move.type] }">{{ move.type }}</span>
        <span class="tip__cat"><span class="tip__shape" :style="categoryShape(move.categorie)" />{{ CATEGORY_LABELS[move.categorie] }}</span>
        <span v-for="badge in badges" :key="badge.label" class="tip__badge" :style="{ background: badge.bg, color: badge.fg }">{{ badge.label }}</span>
      </div>
      <div class="tip__nums">
        <div v-for="num in nums" :key="num.label" class="tip__num"><span>{{ num.label }}</span><b>{{ num.value }}</b></div>
      </div>
      <span class="tip__effet">{{ move.effet }}</span>
      <div v-if="changes.length" class="tip__mods">
        <span class="tip__mods-title">Modifiée par PokéDraft</span>
        <span v-for="change in changes" :key="change.label" class="tip__mod">{{ change.label }} : <s>{{ change.before }}</s> → {{ change.after }}</span>
      </div>
      <div class="tip__props">
        <span v-for="property in properties" :key="property.label" class="tip__prop"><b>{{ property.icone }}</b>{{ property.label }}</span>
        <span v-if="!properties.length" class="tip__none">Aucune propriété utile aux talents</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Attaque } from '#data/types/roster'

const WIDTH = 330
const { tip, close } = useMoveTip()

const move = computed(() => tip.value ? roster.attaques[tip.value.moveId] : undefined)
const pokemon = computed(() => tip.value ? findPokemon(tip.value.pokemonId) : undefined)
const sheet = computed(() => Boolean(tip.value?.pinned) && window.innerWidth < 640)

const position = computed(() => {
  const current = tip.value
  if (!current || sheet.value) return {}
  const left = Math.max(8, Math.min(current.x, window.innerWidth - WIDTH - 8))
  const below = current.bottom + 300 < window.innerHeight
  return below
    ? { left: `${left}px`, top: `${current.bottom + 6}px` }
    : { left: `${left}px`, bottom: `${window.innerHeight - current.top + 6}px` }
})

const badges = computed(() => {
  const current = move.value
  if (!current) return []
  const list = []
  if (current.origine === 'signature créée') list.push({ label: '★ Signature', bg: 'var(--uA)', fg: 'var(--uAtx)' })
  if (current.origine === 'officielle modifiée') list.push({ label: '✎ Modifiée', bg: '#e8704a', fg: '#1a0a00' })
  if (pokemon.value?.ajoutsMovepoolIds.includes(current.id)) list.push({ label: '+ Ajout PokéDraft', bg: '#48c070', fg: '#062010' })
  if (pokemon.value && isStab(pokemon.value, current)) list.push({ label: 'STAB ×1,5', bg: '#2f74a3', fg: '#fff' })
  return list
})

const hits = computed(() => {
  const current = pokemon.value
  return current && move.value?.id === current.signatureId ? current.signature.coups : null
})

const nums = computed(() => move.value
  ? [
      { label: 'Puissance', value: powerText(move.value, hits.value) },
      { label: 'Précision', value: accuracyText(move.value.precision) },
      { label: 'PP', value: ppText(move.value.pp) },
      { label: 'Priorité', value: priorityText(move.value.priorite) },
    ]
  : [])

const changes = computed(() => {
  const current = move.value
  if (!current) return []
  const official: NonNullable<Attaque['officiel']> = current.officiel ?? {}
  const list: { label: string, before: string, after: string }[] = []
  const add = (label: string, before: string, after: string) => {
    if (before !== after) list.push({ label, before, after })
  }
  if (official.type !== undefined) add('Type', official.type, current.type)
  if (official.categorie !== undefined) add('Catégorie', CATEGORY_LABELS[official.categorie], CATEGORY_LABELS[current.categorie])
  if (official.puissance !== undefined) add('Puissance', String(official.puissance ?? '—'), String(current.puissance ?? '—'))
  if (official.precision !== undefined) add('Précision', accuracyText(official.precision), accuracyText(current.precision))
  if (official.priorite !== undefined) add('Priorité', priorityText(official.priorite), priorityText(current.priorite))
  if (current.effetOfficiel) add('Effet', current.effetOfficiel, current.effet)
  return list
})

const properties = computed(() => move.value ? moveProperties(move.value) : [])

const onPointerDown = (event: PointerEvent) => {
  if (!tip.value?.pinned) return
  const target = event.target as HTMLElement
  if (!target.closest('.tip') && !target.closest('[tabindex]')) close()
}

const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKey)
  close()
})
</script>

<style scoped>
.tip {
  position: fixed;
  z-index: 60;
  width: 330px;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 10px;
  background: var(--pn);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 2px var(--bd), 0 14px 34px rgba(0, 0, 0, .55);
  display: flex;
  flex-direction: column;
  pointer-events: none;
  animation: pop .15s both;
}

.tip--pinned { pointer-events: auto; }

.tip--sheet {
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  max-height: 70vh;
  border-radius: 16px 16px 0 0;
}

.tip__head {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip__name {
  flex: 1;
  font: 600 18px 'Pixelify Sans', sans-serif;
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, .55);
}

.tip__close {
  border: 0;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 0, 0, .4);
  color: #fff;
  font: 700 16px 'Atkinson Hyperlegible', sans-serif;
}

.tip__missing {
  margin: 0;
  padding: 12px;
  font: 700 13px/1.4 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.tip__body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip__chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  align-items: center;
}

.tip__type {
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .55);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, .4);
}

.tip__cat {
  height: 22px;
  padding: 0 8px 0 6px;
  border-radius: 4px;
  background: var(--in);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tip__shape { width: 10px; height: 10px; box-shadow: 0 0 0 2px rgba(0, 0, 0, .4); }

.tip__badge {
  height: 22px;
  padding: 0 7px;
  border-radius: 4px;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.tip__nums {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}

.tip__num {
  padding: 5px 6px;
  border-radius: 6px;
  background: var(--in);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tip__num span { font: 700 10px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.tip__num b { font: 600 15px 'Pixelify Sans', sans-serif; white-space: nowrap; }
.tip__effet { font: 400 14px/1.45 'Atkinson Hyperlegible', sans-serif; text-wrap: pretty; }

.tip__mods {
  padding: 6px 8px;
  border-radius: 6px;
  background: #3a2216;
  box-shadow: inset 0 0 0 1px #e8704a;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tip__mods-title { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: #ffb89a; }
.tip__mod { font: 700 12px/1.4 'Atkinson Hyperlegible', sans-serif; }
.tip__mod s { color: var(--mu); }

.tip__props {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 2px solid var(--chip);
}

.tip__prop {
  height: 22px;
  padding: 0 7px;
  border-radius: 4px;
  background: var(--chip);
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tip__prop b { font: 600 12px 'Pixelify Sans', sans-serif; color: var(--uA); }
.tip__none { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
</style>

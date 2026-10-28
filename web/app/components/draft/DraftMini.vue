<template>
  <div v-if="pokemon && hover" role="tooltip" class="mini" :style="position">
    <div class="mini__head" :style="{ background: hero }">
      <img class="mini__sprite" :src="pokemon.sprite" alt="">
      <span class="mini__name">{{ pokemon.nom }}</span>
      <span class="mini__types">{{ pokemon.types.join(' / ') }}</span>
    </div>
    <div class="mini__body">
      <div class="mini__stats">
        <div v-for="[key, label] in STAT_KEYS" :key="key" class="mini__stat">
          <span>{{ label }}</span><b>{{ pokemon.stats[key] }}</b>
        </div>
      </div>
      <span class="mini__line"><b>Talent · {{ pokemon.talent.nom }}</b> — {{ pokemon.talent.effet }}</span>
      <span class="mini__line"><b>Signature · {{ signature?.nom ?? pokemon.signature.nom }}</b> — {{ signature?.effet ?? pokemon.signature.description }}</span>
      <span class="mini__tip">◆ {{ pokemon.conseilDraft }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const WIDTH = 300
const { hover } = useDraftHover()

const pokemon = computed(() => hover.value ? findPokemon(hover.value.id) : undefined)
const signature = computed(() => pokemon.value ? roster.attaques[pokemon.value.signatureId] : undefined)

const hero = computed(() => {
  if (!pokemon.value) return ''
  const [first, second = first] = pokemon.value.types.map(type => TYPE_COLORS[type])
  return `linear-gradient(120deg, ${first}, ${second})`
})

const position = computed(() => {
  const current = hover.value!
  const fitsRight = current.right + WIDTH + 16 < window.innerWidth
  const left = fitsRight ? current.right + 8 : Math.max(8, current.left - WIDTH - 8)
  const low = current.top > window.innerHeight / 2
  return low
    ? { left: `${left}px`, bottom: `${Math.max(8, window.innerHeight - current.bottom)}px` }
    : { left: `${left}px`, top: `${Math.max(8, current.top)}px` }
})
</script>

<style scoped>
.mini {
  position: fixed;
  z-index: 60;
  width: 300px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--pn);
  box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 2px var(--bd), 0 14px 34px rgba(0, 0, 0, .55);
  pointer-events: none;
  animation: pop .12s both;
}

.mini__head {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini__sprite { width: 52px; height: 52px; object-fit: contain; image-rendering: pixelated; }
.mini__name { flex: 1; font: 700 18px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 2px 2px 0 rgba(0, 0, 0, .55); }
.mini__types { font: 700 11px 'Nunito', sans-serif; color: #fff; text-shadow: 1px 1px 0 #000; }

.mini__body {
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini__stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 3px;
}

.mini__stat {
  padding: 3px 0;
  border-radius: 4px;
  background: var(--in);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mini__stat span { font: 700 9px 'Nunito', sans-serif; color: var(--mu); white-space: nowrap; }
.mini__stat b { font: 600 14px 'Pixelify Sans', sans-serif; }
.mini__line { font: 400 12px/1.4 'Nunito', sans-serif; }
.mini__line b { color: var(--uT); }

.mini__tip {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--uB);
  font: 700 12px/1.4 'Nunito', sans-serif;
  color: #fff3d6;
}
</style>

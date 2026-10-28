<template>
  <aside aria-label="Roster" class="roster">
    <div class="roster__search">
      <input v-model="query" class="roster__input" placeholder="Chercher dans le roster" aria-label="Chercher dans le roster">
    </div>
    <div class="roster__list">
      <button
        v-for="row in rows"
        :key="row.pokemon.id"
        type="button"
        class="row"
        :class="{ 'row--active': row.pokemon.id === selectedId }"
        :aria-pressed="row.pokemon.id === selectedId"
        @click="emit('select', row.pokemon.id)"
      >
        <img class="row__sprite" :src="row.pokemon.sprite" alt="" loading="lazy">
        <span class="row__name">{{ row.pokemon.nom }}</span>
        <span v-if="row.warn" class="row__warn" title="À vérifier">!</span>
        <span class="row__count" :class="{ 'row__count--ready': row.count }" :title="row.count ? `${row.count} variante${row.count > 1 ? 's' : ''} enregistrée${row.count > 1 ? 's' : ''}` : 'Set par défaut uniquement'">
          {{ row.count ? `${row.count}/${MAX_VARIANTES}` : '—' }}
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ selectedId: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const { variants } = useAtelier()
const query = ref('')

const rows = computed(() => {
  const words = plainText(query.value)
  return roster.pokemon
    .filter(pokemon => !words || plainText(pokemon.nom).includes(words))
    .map((pokemon) => {
      const list = variants(pokemon.id)
      return { pokemon, count: list.length, warn: list.some(variant => variantWarnings(pokemon, variant).length > 0) }
    })
})
</script>

<style scoped>
.roster {
  background: var(--pn);
  border-radius: var(--r);
  box-shadow: var(--pnS);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 140px);
  position: sticky;
  top: 12px;
}

.roster__search { padding: 8px; background: var(--hd); }

.roster__input {
  width: 100%;
  box-sizing: border-box;
  height: 34px;
  border: 0;
  border-radius: 7px;
  padding: 0 10px;
  font-weight: 700;
  font-size: 13px;
  background: #fff;
  color: #22252b;
  outline: none;
}

.roster__list {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--chip) transparent;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.row {
  flex: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 8px 0 2px;
  border-radius: 7px;
  background: transparent;
  color: var(--tx);
}

.row:hover { background: var(--chip); }
.row--active, .row--active:hover { background: var(--in); box-shadow: inset 0 0 0 2px var(--uA); }
.row__sprite { flex: none; width: 42px; height: 42px; object-fit: contain; image-rendering: pixelated; }

.row__name {
  flex: 1;
  min-width: 0;
  font: 700 13px 'Nunito', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row__warn {
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  background: #e8704a;
  color: #1a0a00;
  font: 700 10px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
}

.row__count { font: 600 13px 'Pixelify Sans', sans-serif; color: var(--mu); }
.row__count--ready { color: var(--good); }

@media (max-width: 980px) {
  .roster { position: static; max-height: none; }
  .roster__list { flex-direction: row; overflow-x: auto; overflow-y: hidden; }
  .row { width: 170px; }
}
</style>

<template>
  <div class="replays">
    <form class="search" role="search" @submit.prevent="search">
      <label class="search__field">
        <span class="search__label">Pseudo</span>
        <input v-model="player" class="field" type="search" maxlength="30" placeholder="Tous les joueurs" autocomplete="off">
      </label>
      <button type="submit" class="btn btn--primary" :disabled="loading">Chercher</button>
    </form>

    <p v-if="error" class="message message--error" role="alert">{{ error }}</p>
    <p v-else-if="!loading && !replays.length" class="message">
      {{ searched ? `Aucun replay pour ${searched}.` : "Aucun replay pour l'instant : chaque combat terminé est gardé ici." }}
    </p>

    <ul v-if="replays.length" class="list">
      <li v-for="replay in replays" :key="replay.id">
        <NuxtLink :to="`/replay/${replay.id}`" class="row">
          <span class="row__format">{{ formatLabel(replay.format_name) || replay.format }}</span>
          <span class="row__text">
            <b class="row__players">{{ replayTitle(replay.players) }}</b>
            <span class="row__meta">{{ replay.winner ? `${replay.winner} gagne` : 'Égalité' }} · {{ replay.turns }} tour{{ replay.turns > 1 ? 's' : '' }} · {{ relativeDate(replay.ended_at) }}</span>
          </span>
          <span class="row__go">▶ Revoir</span>
        </NuxtLink>
      </li>
    </ul>

    <button v-if="page < lastPage" type="button" class="btn more" :disabled="loading" @click="load(page + 1)">Voir plus</button>
  </div>
</template>

<script setup lang="ts">
import type { ReplaySummary } from '~/utils/replay'

const props = defineProps<{ format?: string }>()

const base = useRuntimeConfig().public.apiUrl as string
const { store } = useShowdown()
const player = ref(store.name)
const searched = ref('')
const replays = ref<ReplaySummary[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const error = ref('')

const load = async (next = 1) => {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ data: ReplaySummary[], meta: { current_page: number, last_page: number } }>('/replays', {
      baseURL: base,
      headers: { Accept: 'application/json' },
      query: { player: searched.value || undefined, format: props.format, page: next },
    })
    replays.value = next === 1 ? response.data : [...replays.value, ...response.data]
    page.value = response.meta.current_page
    lastPage.value = response.meta.last_page
  } catch (failure) {
    error.value = apiErrorMessage(failure)
  } finally {
    loading.value = false
  }
}

const search = () => {
  searched.value = player.value.trim()
  void load()
}

onMounted(search)
</script>

<style scoped>
.replays { display: flex; flex-direction: column; gap: 12px; }
.search { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; }
.search__field { flex: 1 1 240px; display: flex; flex-direction: column; gap: 4px; }
.search__label { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.message { margin: 0; padding: 14px; border-radius: 10px; background: var(--in); font: 700 14px 'Nunito', sans-serif; color: var(--mu); }
.message--error { color: var(--tx); box-shadow: inset 0 0 0 2px var(--bad); }
.list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.row { min-height: 54px; padding: 8px 12px; border-radius: 10px; background: var(--in); color: var(--tx); text-decoration: none; display: flex; align-items: center; gap: 12px; }
.row:hover, .row:focus-visible { box-shadow: inset 0 0 0 2px var(--sel); }
.row__format { flex: none; min-width: 120px; padding: 4px 8px; border-radius: 6px; background: var(--chip); font: 700 12px 'Nunito', sans-serif; text-align: center; }
.row__text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.row__players { font: 600 16px 'Pixelify Sans', sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row__meta { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.row__go { flex: none; font: 700 13px 'Nunito', sans-serif; color: var(--ac); }
.more { align-self: center; }

@media (max-width: 640px) {
  .row { flex-wrap: wrap; }
  .row__format { min-width: 0; }
}
</style>

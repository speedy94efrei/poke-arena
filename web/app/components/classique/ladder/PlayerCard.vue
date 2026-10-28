<template>
  <section class="card" aria-label="Joueur">
    <header class="card__hero" :style="{ '--tier': tier.color }">
      <span class="card__avatar">{{ row.name.charAt(0).toUpperCase() }}</span>
      <span class="card__identity">
        <b>{{ row.name }}</b>
        <span>#{{ row.rank }} · {{ shortFormat }} · {{ tier.name }}</span>
      </span>
    </header>
    <div class="card__body">
      <div class="stats">
        <span class="stat"><span>Elo</span><b>{{ Math.round(row.elo) }}</b></span>
        <span class="stat"><span>Victoires</span><b>{{ rate }}</b></span>
        <span class="stat"><span>Gagnés</span><b>{{ row.wins }}</b></span>
        <span class="stat"><span>Perdus</span><b>{{ row.losses }}</b></span>
      </div>

      <template v-if="mine">
        <span class="card__title">Elo sur 30 jours<template v-if="curve.length"> · pic {{ peak }}</template></span>
        <div v-if="curve.length" class="curve" role="img" :aria-label="`Elo de ${curve[0]!.elo} à ${curve[curve.length - 1]!.elo}`">
          <span v-for="(point, index) in curve" :key="index" class="curve__bar" :class="{ 'curve__bar--last': index === curve.length - 1 }" :style="{ height: `${point.height}%` }" :title="`${point.elo} · ${point.date}`" />
        </div>
        <p v-else class="card__empty">Tes prochains combats classés dans ce format dessineront ta courbe ici.</p>

        <template v-if="favorite.length">
          <span class="card__title">Équipe la plus jouée</span>
          <span class="mons">
            <span v-for="(id, index) in favorite" :key="index" class="mon" :title="speciesName(id)" :style="{ backgroundImage: `url(${sprite(id)})` }" />
          </span>
        </template>

        <template v-if="recent.length">
          <span class="card__title">Derniers combats</span>
          <div v-for="entry in recent" :key="entry.roomid" class="fight">
            <span class="fight__result" :class="`fight__result--${entry.result}`">{{ entry.result === 'victoire' ? 'V' : entry.result === 'defaite' ? 'D' : 'N' }}</span>
            <span class="fight__name">contre {{ entry.opponent }}</span>
            <span v-if="entry.delta !== undefined" class="fight__delta" :class="{ 'fight__delta--down': entry.delta < 0 }">{{ signed(entry.delta) }}</span>
            <span class="fight__when">{{ relativeDate(entry.at) }}</span>
          </div>
        </template>
      </template>
      <p v-else class="card__empty">{{ row.wins + row.losses }} combat{{ row.wins + row.losses > 1 ? 's' : '' }} classé{{ row.wins + row.losses > 1 ? 's' : '' }} en {{ shortFormat }}. Défie ce joueur pour un combat amical dans ce format.</p>

      <div class="card__actions">
        <button v-if="mine" type="button" class="btn btn--primary btn--small" @click="emit('play')">Jouer en {{ shortFormat }}</button>
        <NuxtLink v-else :to="{ path: '/classique/en-ligne', query: { defier: row.name, format } }" class="btn btn--primary btn--small">Défier {{ row.name }}</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { EloRow } from '~/utils/ladder'

const props = defineProps<{ row: EloRow, format: string, formatName: string, mine: boolean }>()
const emit = defineEmits<{ play: [] }>()
const { history } = useBattleHistory()
const { sprite } = usePokedex()

const DAY = 24 * 3600 * 1000
const tier = computed(() => eloTier(props.row.elo))
const shortFormat = computed(() => props.formatName.split(' · ')[0])
const rate = computed(() => props.row.wins + props.row.losses ? percent(props.row.wins / (props.row.wins + props.row.losses)) : '—')
const played = computed(() => history.value.filter(entry => entry.format === props.format))

/** Elo après chaque combat classé des 30 derniers jours, du plus ancien au plus récent. */
const curve = computed(() => {
  const since = Date.now() - 30 * DAY
  const points = played.value.filter(entry => entry.elo !== undefined && Date.parse(entry.at) >= since).reverse()
  const values = points.map(entry => entry.elo!)
  const low = Math.min(...values) - 20
  const high = Math.max(...values)
  return points.map(entry => ({ elo: entry.elo!, date: relativeDate(entry.at), height: 15 + (entry.elo! - low) / Math.max(1, high - low) * 85 }))
})

const peak = computed(() => Math.max(...curve.value.map(point => point.elo)))
const recent = computed(() => played.value.slice(0, 4))

/** L'équipe (mêmes espèces) jouée le plus souvent dans ce format. */
const favorite = computed(() => {
  const counts = new Map<string, { team: string[], count: number }>()
  for (const entry of played.value) {
    if (!entry.team?.length) continue
    const key = [...entry.team].sort().join(',')
    counts.set(key, { team: entry.team, count: (counts.get(key)?.count ?? 0) + 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.team ?? []
})
</script>

<style scoped>
.card { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.card__hero {
  padding: 18px 14px 12px;
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, .05) 0 12px, transparent 12px 24px),
    linear-gradient(160deg, color-mix(in srgb, var(--tier) 55%, #0b0f16), #0b0f16);
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.card__avatar {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--tier);
  color: #111;
  font: 700 28px 'Pixelify Sans', sans-serif;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 3px var(--bd);
}

.card__identity { display: flex; flex-direction: column; gap: 2px; min-width: 0; font: 700 12px 'Atkinson Hyperlegible', sans-serif; opacity: .95; }
.card__identity b { font: 700 22px 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 rgba(0, 0, 0, .6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; }
.stat { padding: 6px; border-radius: 7px; background: var(--dk); display: flex; flex-direction: column; gap: 2px; font: 700 10px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.stat b { font: 600 16px 'Pixelify Sans', sans-serif; color: var(--tx); }
.card__title { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); margin-top: 4px; }
.card__empty { margin: 0; font: 700 12px/1.45 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.curve { height: 90px; padding: 6px; border-radius: 7px; background: var(--dk); display: flex; align-items: flex-end; gap: 3px; }
.curve__bar { flex: 1; min-width: 3px; max-width: 18px; border-radius: 2px 2px 0 0; background: var(--hd); }
.curve__bar--last { background: var(--uA); }
.mons { display: flex; gap: 3px; flex-wrap: wrap; }
.mon { width: 40px; height: 32px; border-radius: 6px; background: var(--in) center / 40px no-repeat; image-rendering: pixelated; }
.fight { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 6px; background: var(--in); font: 700 12px 'Atkinson Hyperlegible', sans-serif; }

.fight__result {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
  display: grid;
  place-items: center;
  background: var(--chip);
}

.fight__result--victoire { background: #2f9a58; }
.fight__result--defaite { background: #c8362a; }
.fight__name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fight__delta { font: 600 13px 'Pixelify Sans', sans-serif; color: #58d080; }
.fight__delta--down { color: #ff7a6a; }
.fight__when { font-size: 11px; color: var(--mu); }
.card__actions { display: flex; gap: 6px; margin-top: 4px; }
.card__actions a { text-decoration: none; }
</style>

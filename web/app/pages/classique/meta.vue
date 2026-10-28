<template>
  <div class="meta">
    <div class="meta__head">
      <div class="meta__heading">
        <h1 class="meta__title">Méta</h1>
        <span class="meta__subtitle">{{ usage ? `${formatName} · ${usage.battles.toLocaleString('fr-FR')} combats analysés par Smogon` : 'Ce que joue la communauté' }}</span>
      </div>
      <ClassiqueUsageFormatSelect v-model="format" />
    </div>

    <div class="meta__body">
      <section class="panel" aria-label="Pokémon les plus utilisés">
        <header class="panel__head">Pokémon les plus utilisés · {{ formatName }}<span class="panel__aside">Clique pour ouvrir la fiche</span></header>
        <div class="table" role="table">
          <div class="table__row table__row--head" role="row">
            <span role="columnheader">#</span><span role="columnheader">Pokémon</span><span role="columnheader">Usage</span>
            <span role="columnheader">Objet n°1</span><span role="columnheader">Téra n°1</span><span role="columnheader">Attaque n°1</span>
          </div>
          <p v-if="!rows.length" class="panel__empty">{{ loading ? 'Chargement des statistiques…' : 'Pas de statistiques Smogon pour ce format.' }}</p>
          <NuxtLink v-for="row in rows" :key="row.id" :to="{ path: '/classique/pokedex', query: { id: row.id, format } }" class="table__row" role="row">
            <span class="table__rank" role="cell">{{ row.rank }}</span>
            <span class="table__mon" role="cell"><span class="table__icon" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />{{ row.nom }}</span>
            <span class="table__usage" role="cell"><span class="table__track"><span class="table__fill" :style="{ width: `${row.usage / top * 100}%` }" /></span>{{ percent(row.usage, 1) }}</span>
            <span class="table__item" role="cell"><span v-if="row.item?.sprite !== undefined" :style="itemIconStyle(row.item!.sprite!, 24)" class="table__item-icon" />{{ row.item?.nom ?? '—' }}</span>
            <span role="cell"><span v-if="row.tera" class="table__tera" :style="{ background: TYPE_COLORS[row.tera] ?? '#7a7a7a' }">{{ row.tera }}</span></span>
            <span class="table__move" role="cell">{{ row.move ?? '—' }}</span>
          </NuxtLink>
        </div>
      </section>

      <div class="meta__side">
        <section class="panel" aria-label="Styles d'équipe">
          <header class="panel__head">Styles d'équipe<span class="panel__aside">tags officiels Smogon</span></header>
          <div class="panel__body">
            <p v-if="!styles.length" class="panel__empty">Pas de répartition des styles pour ce format.</p>
            <div v-for="[tag, share] in styles" :key="tag" class="style">
              <span class="style__name">{{ styleLabel(tag) }}</span>
              <span class="style__track"><span class="style__fill" :style="{ width: `${share * 100}%` }" /></span>
              <span class="style__pct">{{ percent(share) }}</span>
            </div>
          </div>
        </section>

        <section v-if="core.length" class="panel panel--feature" aria-label="Équipe type">
          <header class="panel__head">Équipe type du format</header>
          <div class="panel__body">
            <span class="panel__note">Le Pokémon le plus joué et ses coéquipiers les plus fréquents, chacun avec son set le plus joué.</span>
            <NuxtLink v-for="row in core" :key="row.id" :to="{ path: '/classique/pokedex', query: { id: row.id, format } }" class="member">
              <span class="member__icon" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
              <span class="member__text"><b>{{ row.nom }}</b><span>{{ row.detail }}</span></span>
            </NuxtLink>
            <button type="button" class="btn btn--primary btn--small" @click="copy">Copier dans l'Atelier</button>
          </div>
        </section>

        <section v-if="duos.length" class="panel" aria-label="Duos">
          <header class="panel__head">Duos les plus joués avec {{ leader }}</header>
          <div class="panel__body">
            <div v-for="row in duos" :key="row.id" class="duo">
              <span class="member__icon" :style="{ backgroundImage: `url(${sprite(usage!.pokemon[0]!.id)})` }" />
              <span class="duo__plus">+</span>
              <span class="member__icon" :style="{ backgroundImage: `url(${sprite(row.id)})` }" />
              <span class="duo__name">{{ row.nom }}</span>
              <span class="style__pct">{{ percent(row.share) }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TypePokemon } from '#data/types/roster'

useHead({ title: 'Méta · Classique' })

const TEAM_SIZE = 6
const { dex, sprite } = usePokedex()
const { format, usage, loading, formatName } = useUsageFormat()
const { save } = useClassicTeams()
const workshopTeam = useState('workshop-team', () => '')
const workshopSlot = useState('workshop-slot', () => 0)

const name = (id: string) => dex.value?.pokemon[id]?.nom ?? id
const top = computed(() => usage.value?.pokemon[0]?.usage || 1)
const leader = computed(() => usage.value?.pokemon[0] ? name(usage.value.pokemon[0].id) : '')

const rows = computed(() => (usage.value?.pokemon ?? []).slice(0, 60).map((entry, index) => {
  const itemId = entry.items.find(([id]) => id && id !== 'nothing')?.[0]
  const moveId = entry.moves.find(([id]) => id && id !== 'nothing')?.[0]
  const item = itemId ? dex.value?.items[itemId] : undefined
  return {
    id: entry.id,
    rank: index + 1,
    nom: name(entry.id),
    usage: entry.usage,
    item: item ? { nom: item.nom, sprite: item.sprite } : itemId ? { nom: itemId, sprite: undefined } : undefined,
    tera: entry.tera[0] ? frenchType(entry.tera[0][0]) as TypePokemon : undefined,
    move: moveId ? dex.value?.moves[moveId]?.nom ?? moveId : undefined,
  }
}))

const styles = computed(() => usage.value?.styles ?? [])

/** Le n°1 du format, puis ses coéquipiers les plus fréquents, complétés par les plus joués. */
const coreIds = computed(() => {
  const data = usage.value
  const first = data?.pokemon[0]
  if (!data || !first) return []
  const ids = [first.id, ...first.teammates.map(([id]) => id)].filter(id => data.pokemon.some(entry => entry.id === id))
  for (const entry of data.pokemon) if (!ids.includes(entry.id)) ids.push(entry.id)
  return [...new Set(ids)].slice(0, TEAM_SIZE)
})

const core = computed(() => coreIds.value.map((id) => {
  const entry = usageOf(usage.value, id)
  const itemId = entry?.items[0]?.[0]
  const moves = (entry?.moves ?? []).slice(0, 2).map(([move]) => dex.value?.moves[move]?.nom ?? move)
  return { id, nom: name(id), detail: [itemId ? dex.value?.items[itemId]?.nom ?? itemId : '', ...moves].filter(Boolean).join(' · ') }
}))

const duos = computed(() => (usage.value?.pokemon[0]?.teammates ?? []).slice(0, 5).map(([id, share]) => ({ id, share, nom: name(id) })))

const copy = async () => {
  const sets = coreIds.value.map(id => setFromUsage(id, usageOf(usage.value, id), dex.value, levelFor(format.value, false)))
  const team = save({ name: `Équipe type ${formatName.value}`, format: format.value, sets })
  workshopTeam.value = team.id
  workshopSlot.value = 0
  await navigateTo('/classique/equipes')
}
</script>

<style scoped>
.meta { display: flex; flex-direction: column; gap: 12px; }
.meta__head { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.meta__heading { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; }
.meta__title { margin: 0; font: 700 30px/1 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.meta__subtitle { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.meta__body { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 12px; align-items: start; }
.meta__side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.panel { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; min-width: 0; }
.panel--feature { box-shadow: inset 0 0 0 2px var(--uA), 0 0 0 3px var(--bd); }

.panel__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel__aside { margin-left: auto; font: 700 11px 'Atkinson Hyperlegible', sans-serif; text-shadow: none; }
.panel__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.panel__empty { margin: 0; padding: 12px; font: 700 13px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.panel__note { font: 700 12px/1.4 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.table { padding: 6px; display: flex; flex-direction: column; gap: 1px; overflow-x: auto; }

.table__row {
  display: grid;
  grid-template-columns: 26px minmax(150px, 1.4fr) 130px minmax(120px, 1fr) 72px minmax(110px, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 640px;
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--tx);
  text-decoration: none;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
}

a.table__row:hover { background: var(--chip); text-decoration: none; }
.table__row--head { font-size: 11px; color: var(--mu); padding-top: 4px; padding-bottom: 4px; }
.table__rank { font: 600 13px 'Pixelify Sans', sans-serif; color: var(--mu); text-align: right; }
.table__mon, .table__item { display: flex; align-items: center; gap: 4px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table__icon { flex: none; width: 40px; height: 30px; background: center / 40px no-repeat; image-rendering: pixelated; }
.table__item-icon { flex: none; display: block; }
.table__usage { display: flex; align-items: center; gap: 6px; font: 600 12px 'Pixelify Sans', sans-serif; }
.table__track { flex: 1; height: 8px; border-radius: 3px; background: var(--in); overflow: hidden; }
.table__fill { display: block; height: 100%; background: var(--uA); }

.table__tera {
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  font-size: 11px;
  display: inline-flex;
  align-items: center;
}

.table__move { font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.style { display: grid; grid-template-columns: 120px minmax(0, 1fr) 42px; gap: 8px; align-items: center; }
.style__name { font: 700 12px 'Atkinson Hyperlegible', sans-serif; }
.style__track { height: 8px; border-radius: 3px; background: var(--in); overflow: hidden; }
.style__fill { display: block; height: 100%; background: var(--hd); }
.style__pct { font: 600 12px 'Pixelify Sans', sans-serif; text-align: right; }
.member { display: flex; align-items: center; gap: 6px; color: var(--tx); text-decoration: none; border-radius: 6px; }
.member:hover { background: var(--chip); text-decoration: none; }
.member__icon { flex: none; width: 40px; height: 32px; background: center / 40px no-repeat; image-rendering: pixelated; }
.member__text { display: flex; flex-direction: column; min-width: 0; font: 400 11px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.member__text b { font-size: 13px; color: var(--tx); }
.member__text span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.duo { display: flex; align-items: center; gap: 2px; }
.duo__plus { font: 700 14px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.duo__name { flex: 1; min-width: 0; padding-left: 6px; font: 700 12px 'Atkinson Hyperlegible', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 1180px) {
  .meta__body { grid-template-columns: minmax(0, 1fr); }
}
</style>

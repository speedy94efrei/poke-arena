<template>
  <div class="page">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="banner banner--bad" role="alert">{{ error }}</p>
    <RouteNoRun v-if="!run" />
    <div v-else class="layout">
      <section class="shop" aria-label="Boutique">
        <header class="shop__head"><span>Boutique</span><span class="shop__money">{{ money(run.money) }}</span></header>
        <ul class="shop__list">
          <li v-for="entry in run.shop" :key="entry.id" class="row" :class="{ 'row--locked': !entry.available }">
            <span class="row__icon">
              <span v-if="entry.kind === 'tm'" class="row__tm">CT</span>
              <ItemIcon v-else :id="entry.id" :size="28" />
            </span>
            <span class="row__text">
              <b>{{ entry.kind === 'tm' ? `CT ${moveName(entry.id)}` : entry.kind === 'bag' ? BAG_ITEMS[entry.id]?.nom ?? itemName(entry.id) : itemName(entry.id) }}</b>
              <span>{{ describe(entry) }}</span>
            </span>
            <span class="row__price">{{ money(entry.price) }}</span>
            <button v-if="entry.available" type="button" class="btn btn--small btn--primary row__buy" :disabled="locked || pending || run.money < entry.price || owned(entry)" @click="act({ type: 'acheter', id: entry.id })">
              {{ owned(entry) ? 'Déjà là' : 'Acheter' }}
            </button>
            <span v-else class="row__lock">Arène {{ entry.from }}</span>
          </li>
        </ul>
      </section>

      <aside class="side">
        <UiPanel title="Sac">
          <ul class="bag">
            <li v-for="(count, id) in run.bag" v-show="count > 0" :key="id"><span>{{ BAG_ITEMS[id]?.nom ?? itemName(String(id)) }}</span><b>×{{ count }}</b></li>
            <li v-for="(item, index) in run.held" :key="`${item}-${index}`"><span>{{ itemName(item) }}</span><b>objet tenu</b></li>
          </ul>
          <p class="note">En combat : 2 potions et 1 Rappel au plus. Utiliser un objet prend ton tour. Les Champions ont les mêmes limites.</p>
        </UiPanel>

        <UiPanel :title="`Échange à l'aveugle · ${run.trades}/2 restants`">
          <p class="note">Tu choisis qui tu donnes, pas ce que tu reçois : un Pokémon de {{ run.name }} tiré au hasard, au niveau de l'équipe. Tu gardes ses objets et tes CT. Jamais pendant la Ligue.</p>
          <div class="trade" role="radiogroup" aria-label="Pokémon à donner">
            <button v-for="(member, index) in run.team" :key="member.species" type="button" role="radio" class="trade__mon" :class="{ 'trade__mon--on': giving === index }" :aria-checked="giving === index" :aria-label="speciesName(member.species)" @click="giving = index">
              <img :src="sprite(member.species)" :alt="speciesName(member.species)">
            </button>
          </div>
          <p v-if="received" class="received">Tu as reçu <b>{{ speciesName(received) }}</b> !</p>
          <button type="button" class="btn btn--primary trade__go" :disabled="locked || pending || giving < 0 || !run.trades || run.badges >= 8" @click="trade">
            {{ run.badges >= 8 ? 'Fermé pendant la Ligue' : giving >= 0 ? `Échanger ${speciesName(run.team[giving]!.species)}` : 'Choisis un Pokémon' }}
          </button>
        </UiPanel>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteShopEntry } from '~/utils/routeLigues'

definePageMeta({ layout: 'mode' })
useHead({ title: 'Boutique · Route des Ligues' })

const { run, error, pending, act, connected } = useRouteLigues()
const { sprite } = usePokedex()
const giving = ref(-1)
const received = ref('')
let before = ''

const locked = computed(() => !run.value || run.value.phase !== 'carte' || Boolean(run.value.battle))
const owned = (entry: RouteShopEntry) => entry.kind === 'tm' && Boolean(run.value?.tms.includes(entry.id))

const describe = (entry: RouteShopEntry) => {
  if (entry.kind === 'bag') return BAG_ITEMS[entry.id]?.effet ?? ''
  if (entry.kind === 'tm') return 'CT de la région : ajoute l\'attaque aux Pokémon compatibles'
  return 'Objet tenu'
}

const trade = () => {
  if (!run.value || giving.value < 0) return
  before = run.value.team[giving.value]!.species
  received.value = ''
  act({ type: 'echanger', index: giving.value })
}

watch(() => run.value?.team.map(member => member.species).join(','), () => {
  const species = run.value?.team[giving.value]?.species
  if (before && species && species !== before) {
    received.value = species
    before = ''
  }
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.banner { margin: 0; padding: 10px 14px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); font: 700 14px 'Nunito', sans-serif; }
.banner--bad { box-shadow: var(--pnS), inset 0 0 0 2px var(--bad); }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 12px; align-items: start; }
.shop { border-radius: var(--r); overflow: hidden; background: var(--pn); box-shadow: var(--pnS); }
.shop__head { padding: 8px 14px; background: var(--hd); color: var(--hdTx); display: flex; justify-content: space-between; font: 600 17px 'Pixelify Sans', sans-serif; text-shadow: var(--hdSh); }
.shop__money { font: 700 18px 'Pixelify Sans', sans-serif; }
.shop__list { margin: 0; padding: 8px; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.row { min-height: 50px; padding: 4px 10px; border-radius: 8px; background: var(--in); display: flex; align-items: center; gap: 10px; }
.row--locked { opacity: .5; }
.row__icon { width: 32px; display: grid; place-items: center; }
.row__tm { padding: 2px 5px; border-radius: 4px; background: var(--good); color: #fff; font: 800 11px 'Nunito', sans-serif; }
.row__text { flex: 1; min-width: 0; display: flex; flex-direction: column; font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.row__text b { font: 700 14px 'Nunito', sans-serif; color: var(--tx); }
.row__price { font: 600 16px 'Pixelify Sans', sans-serif; white-space: nowrap; }
.row__buy, .row__lock { min-width: 86px; justify-content: center; }
.row__lock { padding: 6px 10px; border-radius: 8px; background: var(--pn); font: 700 12px 'Nunito', sans-serif; color: var(--mu); text-align: center; }
.side { display: flex; flex-direction: column; gap: 12px; }
.bag { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; font: 700 13px 'Nunito', sans-serif; }
.bag li { display: flex; justify-content: space-between; }
.note { margin: 8px 0 0; font: 700 12px/1.4 'Nunito', sans-serif; color: var(--mu); }
.trade { margin: 10px 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.trade__mon { height: 54px; border: 0; border-radius: 10px; background: var(--in); cursor: pointer; display: grid; place-items: center; }
.trade__mon img { width: 48px; height: 40px; object-fit: contain; image-rendering: pixelated; }
.trade__mon--on { box-shadow: inset 0 0 0 3px var(--good); }
.received { margin: 0 0 8px; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--good) 20%, var(--pn)); font: 700 14px 'Nunito', sans-serif; }
.trade__go { width: 100%; justify-content: center; }

@media (max-width: 1000px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
}
</style>

<template>
  <div class="page">
    <LobbyConnection v-if="!connected" />
    <p v-if="error" class="banner banner--bad" role="alert">{{ error }}</p>
    <RouteNoRun v-if="!run" />
    <p v-else-if="run.phase === 'tirage'" class="banner">
      Choisis d'abord ton équipe dans le banc.
      <NuxtLink to="/route-des-ligues/tirage" class="btn btn--small btn--primary">Tirage du banc</NuxtLink>
    </p>
    <p v-else-if="!run.next" class="banner">
      {{ run.name }} est terminée. Bravo !
      <NuxtLink to="/route-des-ligues" class="btn btn--small btn--primary">Régions</NuxtLink>
    </p>
    <template v-else>
      <section class="hero" :style="{ '--accent': accent }" :aria-label="`Combat contre ${trainer!.name}`">
        <img class="hero__sprite" :src="trainerSprite(trainer!.sprite)" :alt="trainer!.name">
        <div class="hero__main">
          <span class="hero__kicker">
            <TypeBadge v-if="trainer!.type !== 'Champion'" :type="frenchType(trainer!.type)" small />
            {{ stageLabel(run.next.stage) }}<template v-if="trainer!.city"> · {{ trainer!.city }}</template>
          </span>
          <h1 class="hero__name">{{ trainer!.name }}</h1>
          <p class="hero__strategy">{{ trainer!.strategy }}</p>
          <div class="hero__team">
            <span v-for="mon in trainer!.team" :key="mon.species" class="foe">
              <img class="foe__sprite" :src="sprite(mon.species)" :alt="speciesName(mon.species)">
              <span class="foe__name">{{ speciesName(mon.species) }}</span>
              <span class="foe__level">N.{{ mon.level }}</span>
            </span>
          </div>
        </div>
        <dl class="facts">
          <div><dt>Niveau</dt><dd>{{ trainer!.level }} (ton équipe : {{ run.level }})</dd></div>
          <div><dt>Objets en combat</dt><dd>{{ bagText(trainer!.bag) }}</dd></div>
          <div v-if="rewardText"><dt>Récompense</dt><dd>{{ rewardText }}</dd></div>
          <div><dt>Prime</dt><dd>{{ money(trainer!.prize) }}</dd></div>
          <div><dt>Ton sac</dt><dd>{{ bagText(myBag) || 'vide' }}</dd></div>
        </dl>
      </section>

      <p v-if="run.championRetry && run.next.stage.kind === 'champion'" class="banner">Dernier essai contre le Maître : une nouvelle défaite fait recommencer {{ run.name }}.</p>
      <p v-if="run.phase === 'evolution'" class="banner">
        Des Pokémon évoluent après ton badge.
        <NuxtLink to="/route-des-ligues/evolution" class="btn btn--small btn--primary">Voir l'évolution</NuxtLink>
      </p>

      <UiPanel :title="`Prépare ton équipe · 4 attaques parmi celles connues au niveau ${run.level}`">
        <div class="prep">
          <article v-for="(member, index) in run.team" :key="member.species" class="member" :class="{ 'member--lead': index === 0, 'member--ko': member.hp === 0 }">
            <header class="member__head">
              <img class="member__icon" :src="sprite(member.species)" :alt="speciesName(member.species)">
              <span class="member__name">{{ speciesName(member.species) }}<small v-if="member.hp < 100">{{ member.hp === 0 ? 'K.O.' : `${member.hp} %` }}</small></span>
              <span v-if="index === 0" class="member__lead">★ Lead</span>
              <button v-else type="button" class="btn btn--small" :disabled="locked" @click="act({ type: 'lead', index })">Mettre en lead</button>
            </header>
            <div class="member__moves">
              <label v-for="slot in 4" :key="slot" class="move">
                <TypeBadge v-if="moveType(member.moves[slot - 1])" :type="moveType(member.moves[slot - 1])!" small />
                <select class="field move__select" :value="member.moves[slot - 1] ?? ''" :disabled="locked" :aria-label="`Attaque ${slot} de ${speciesName(member.species)}`" @change="event => setMove(index, member.moves, slot - 1, (event.target as HTMLSelectElement).value)">
                  <option value="">—</option>
                  <option v-for="move in member.known" :key="move" :value="move">{{ moveName(move) }}</option>
                </select>
              </label>
            </div>
            <label class="member__item">Objet
              <select class="field" :value="member.item" :disabled="locked" @change="event => act({ type: 'objet', index, item: (event.target as HTMLSelectElement).value })">
                <option value="">Aucun</option>
                <option v-if="member.item" :value="member.item">{{ itemName(member.item) }}</option>
                <option v-for="item in [...new Set(run.held)]" :key="item" :value="item">{{ itemName(item) }}</option>
              </select>
            </label>
          </article>
        </div>
      </UiPanel>

      <div class="actions">
        <NuxtLink to="/route-des-ligues/boutique" class="btn">Passer à la boutique</NuxtLink>
        <button v-if="run.battle" type="button" class="btn btn--primary actions__go" @click="resume(run.battle)">▶ Reprendre le combat</button>
        <button v-else type="button" class="btn btn--primary actions__go" :disabled="locked || pending || !connected" @click="act({ type: 'combattre' })">▶ Défier {{ trainer!.name }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Arène · Route des Ligues' })

const { run, error, pending, act, connected } = useRouteLigues()
const { join } = useShowdown()
const { dex, sprite } = usePokedex()

const trainer = computed(() => run.value?.next?.trainer ?? null)
const locked = computed(() => !run.value || run.value.phase !== 'carte' || Boolean(run.value.battle))
const accent = computed(() => trainer.value?.type === 'Champion' ? '#f0b93a' : '#a77bff')
const myBag = computed(() => Object.entries(run.value?.bag ?? {}).filter(([, count]) => count > 0).map(([id, count]) => `${id}.${count}`).join('+'))

const bagText = (text: string) => text.split('+').filter(Boolean).map((part) => {
  const [id = '', count = '0'] = part.split('.')
  const name = BAG_ITEMS[id]?.nom ?? itemName(id)
  return `${count} ${Number(count) > 1 ? name.replace(/(\S+)(?=$| )/g, word => `${word}s`) : name}`
}).join(', ')

const rewardText = computed(() => {
  const reward = trainer.value?.reward
  if (!reward) return ''
  return [...(reward.tms ?? []).map(tm => `CT ${moveName(tm)}`), ...(reward.items ?? []).map(item => itemName(item)), ...(reward.stones ?? []).map(stone => itemName(stone))].join(', ')
})

const moveType = (id: string | undefined) => (id ? dex.value?.moves[id]?.type : undefined)

const setMove = (index: number, current: string[], slot: number, move: string) => {
  const next = [...current]
  next[slot] = move
  act({ type: 'attaques', index, moves: next.filter(Boolean) })
}

/** Combat lancé plus tôt (page rechargée) : le site rejoint la salle, et Showdown renvoie son historique. */
const resume = (roomid: string) => {
  join(roomid)
  void navigateTo(`/route-des-ligues/combat/${roomid}`)
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.banner { margin: 0; padding: 10px 14px; border-radius: 10px; background: var(--pn); box-shadow: var(--pnS); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font: 700 14px 'Nunito', sans-serif; }
.banner--bad { box-shadow: var(--pnS), inset 0 0 0 2px var(--bad); }
.hero { padding: 16px 18px; border-radius: var(--r); background: linear-gradient(120deg, color-mix(in srgb, var(--accent) 45%, #160c2c), #0e0820); box-shadow: inset 0 0 0 3px var(--accent), var(--pnS); color: #fff; display: grid; grid-template-columns: 150px minmax(0, 1fr) minmax(220px, 300px); gap: 16px; align-items: center; }
.hero__sprite { width: 150px; height: 150px; object-fit: contain; image-rendering: pixelated; }
.hero__main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.hero__kicker { display: flex; align-items: center; gap: 6px; font: 700 12px 'Nunito', sans-serif; opacity: .9; }
.hero__name { margin: 0; font: 700 38px/1 'Pixelify Sans', sans-serif; text-shadow: 3px 3px 0 rgba(0, 0, 0, .4); }
.hero__strategy { margin: 0; font: 700 14px/1.4 'Nunito', sans-serif; }
.hero__team { display: flex; gap: 8px; flex-wrap: wrap; }
.foe { width: 76px; padding: 4px; border-radius: 10px; background: rgba(0, 0, 0, .3); display: flex; flex-direction: column; align-items: center; }
.foe__sprite { width: 48px; height: 40px; object-fit: contain; image-rendering: pixelated; }
.foe__name { font: 700 11px 'Nunito', sans-serif; text-align: center; }
.foe__level { font: 700 10px 'Nunito', sans-serif; opacity: .75; }
.facts { margin: 0; padding: 10px 12px; border-radius: 12px; background: rgba(0, 0, 0, .35); display: flex; flex-direction: column; gap: 6px; font: 700 12px 'Nunito', sans-serif; }
.facts div { display: flex; justify-content: space-between; gap: 10px; }
.facts dt { opacity: .75; }
.facts dd { margin: 0; text-align: right; }
.prep { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 10px; }
.member { padding: 10px; border-radius: 12px; background: var(--in); display: flex; flex-direction: column; gap: 8px; }
.member--lead { box-shadow: inset 0 0 0 2px var(--good); }
.member--ko { opacity: .6; }
.member__head { display: flex; align-items: center; gap: 8px; }
.member__icon { width: 40px; height: 32px; object-fit: contain; image-rendering: pixelated; }
.member__name { flex: 1; font: 600 17px 'Pixelify Sans', sans-serif; }
.member__name small { margin-left: 6px; font: 700 12px 'Nunito', sans-serif; color: var(--bad); }
.member__lead { padding: 4px 8px; border-radius: 6px; background: var(--good); color: #fff; font: 800 12px 'Nunito', sans-serif; }
.member__moves { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.move { display: flex; align-items: center; gap: 4px; min-width: 0; }
.move__select { flex: 1; min-width: 0; }
.member__item { display: flex; align-items: center; gap: 8px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.member__item .field { flex: 1; }
.actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.actions__go { height: 46px; padding: 0 22px; font-size: 17px; }

@media (max-width: 1000px) {
  .hero { grid-template-columns: minmax(0, 1fr); }
  .hero__sprite { width: 110px; height: 110px; }
}
</style>

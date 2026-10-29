<template>
  <header class="header">
    <AppLogo header />
    <div class="header__box">
      <span class="header__format">{{ battle.format.includes('roguelike') ? `Roguelike · ${battle.gameType === 'multi' ? 'coop' : 'solo'}` : isPokedraft(battle) ? `PokéDraft · Saison ${roster.saison}` : formatLabel(battle.formatName) || '…' }}</span>
      <span class="header__sep" />
      <span class="header__label">TOUR</span><span class="header__turn">{{ battle.turn || '—' }}</span>
    </div>
    <div class="header__players">
      <div v-for="player in players" :key="player.side" class="header__box header__player">
        <span class="header__avatar" :style="{ background: player.color }">{{ player.initial }}</span>
        <span class="header__who">
          <span>{{ player.label }}</span>
          <span class="header__balls">
            <span v-for="(ball, index) in player.balls" :key="index" class="header__ball" :class="`header__ball--${ball}`" />
          </span>
        </span>
      </div>
    </div>
    <div class="header__box header__mode-box">
      <span class="header__mode" :style="{ background: modeInfo.color }">{{ modeInfo.badge }}</span>
      <span class="header__mode-text">{{ modeInfo.text }}</span>
    </div>
    <button type="button" class="header__box header__help" :aria-pressed="beginner" :title="beginner ? 'Efficacité, dégâts estimés et avertissements sur les boutons' : 'Boutons sobres comme sur Showdown ; le calcul reste au survol'" @click="help = beginner ? 'confirme' : 'debutant'">
      <span class="header__label">AIDE</span>
      <span class="header__help-value">{{ beginner ? 'Débutant' : 'Confirmé' }}</span>
    </button>
    <label class="header__box header__decor">
      <span class="header__label">DÉCOR</span>
      <select v-model="choice" class="header__select">
        <option v-for="option in options" :key="option.id" :value="option.id">{{ option.nom }}</option>
      </select>
    </label>
    <button v-if="!battle.ended && battle.mySide" type="button" class="btn btn--danger" @click="emit('forfeit')">Abandonner</button>
    <button v-else type="button" class="btn" @click="emit('leave')">{{ replay ? 'Retour' : 'Retour au salon' }}</button>
  </header>
</template>

<script setup lang="ts">
import type { BattleState, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState, replay?: boolean }>()
const emit = defineEmits<{ forfeit: [], leave: [] }>()
const { store: draftStore } = useDraft()
const { help, beginner } = useBattleHelp()
const { choice, options } = useBattleStage(() => props.battle.roomid)

const LEVELS = ['', 'Débutant', 'Facile', 'Moyen', 'Difficile', 'Expert']

const modeInfo = computed(() => {
  const roomid = props.battle.roomid
  if (props.replay) return { badge: 'REPLAY', text: 'Combat terminé', color: '#7a52c8' }
  if (props.battle.format.startsWith('gen9routedesligues')) {
    const region = props.battle.format.slice('gen9routedesligues'.length)
    return { badge: 'ROUTE', text: region.charAt(0).toUpperCase() + region.slice(1), color: '#2a7a40' }
  }
  if (draftStore.rankedBattles.includes(roomid)) return { badge: 'CLASSÉ', text: 'Draft', color: '#c8362a' }
  if (draftStore.battles.includes(roomid)) return { badge: 'DRAFT', text: 'Amical', color: '#3d6fc8' }
  if (props.battle.format.includes('roguelike')) return { badge: 'ROGUELIKE', text: props.battle.gameType === 'multi' ? 'Coop' : 'Run', color: '#7a52c8' }
  const opponent = props.battle.sides[props.battle.mySide === 'p2' ? 'p1' : 'p2'].name
  const level = /^Bot Niveau (\d)/.exec(opponent)?.[1]
  if (level) return { badge: 'BOT', text: `Niveau ${level} · ${LEVELS[Number(level)] ?? ''}`, color: '#48a860' }
  if (props.battle.formatName.includes('Random') || !props.battle.mySide) return { badge: props.battle.mySide ? 'LIBRE' : 'SPECTATEUR', text: 'Combat', color: '#3d6fc8' }
  if (props.battle.rated || Object.keys(props.battle.ratings).length) return { badge: 'CLASSÉ', text: 'Ladder', color: '#c8362a' }
  return { badge: 'COMBAT', text: 'En ligne', color: '#3d6fc8' }
})

/** Chaque joueur avec ses Pokémon : debout, K.O. ou pas encore vus. */
const players = computed(() => {
  const mine: SideId = props.battle.mySide ?? 'p1'
  return ([mine, mine === 'p1' ? 'p2' : 'p1'] as SideId[]).map((side) => {
    const data = props.battle.sides[side]
    const size = Math.max(data.size ?? 6, data.team.length)
    const balls = Array.from({ length: size }, (_, index) => {
      const pokemon = data.team[index]
      if (!pokemon) return 'unknown'
      return pokemon.fainted ? 'fainted' : 'alive'
    })
    const name = data.name || '…'
    const self = side === props.battle.mySide
    return { side, label: self ? `${name} (toi)` : name, initial: name.charAt(0).toUpperCase(), color: self ? '#4a8fe0' : '#e05848', balls }
  })
})
</script>

<style scoped>
.header { display: flex; align-items: center; gap: 8px; min-width: 0; }

.header__box {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
  flex: none;
  color: var(--tx);
}

.header__format { font: 600 16px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); white-space: nowrap; }
.header__sep { width: 2px; height: 24px; background: var(--chip); }
.header__label { font: 600 12px 'Pixelify Sans', sans-serif; color: var(--mu); }
.header__turn { font: 700 22px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.header__players { flex: 1; min-width: 0; display: flex; justify-content: center; gap: 8px; }
.header__player { padding-left: 8px; min-width: 0; }
.header__avatar { flex: none; width: 32px; height: 32px; border-radius: 8px; color: #fff; display: grid; place-items: center; font: 700 16px 'Pixelify Sans', sans-serif; }
.header__who { display: flex; flex-direction: column; gap: 3px; min-width: 0; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.header__who > span:first-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
.header__balls { display: flex; gap: 3px; }
.header__ball { width: 11px; height: 11px; border-radius: 50%; box-shadow: 0 0 0 1px var(--bd); }
.header__ball--alive { background: linear-gradient(180deg, #e84838 0 46%, #222 46% 54%, #fff 54%); }
.header__ball--fainted { background: #555; opacity: .6; }
.header__ball--unknown { background: var(--chip); }
.header__mode { height: 26px; padding: 0 8px; border-radius: 6px; color: #fff; display: grid; place-items: center; font: 600 13px 'Pixelify Sans', sans-serif; }
.header__mode-text { font: 600 15px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); white-space: nowrap; }
.header__help { border: 0; cursor: pointer; gap: 8px; }
.header__help-value { font: 600 15px 'Pixelify Sans', sans-serif; color: var(--uT); }
.header__decor { gap: 8px; }

.header__select {
  height: 32px;
  border: 0;
  border-radius: 7px;
  padding: 0 8px;
  font-weight: 700;
  font-size: 13px;
  background: var(--in);
  color: var(--tx);
  box-shadow: inset 0 0 0 2px var(--chip);
  outline: none;
  max-width: 150px;
}

@media (max-width: 1400px) {
  .header__mode-box, .header__decor .header__label { display: none; }
}
</style>

<template>
  <div class="actions">
    <div class="actions__intro">
      <span class="actions__title">{{ title }}</span>
      <span v-if="battle.error" class="actions__error">{{ battle.error }}</span>
      <span v-else class="actions__hint">{{ hint }}</span>
    </div>

    <div class="moves" :class="{ 'moves--off': !canMove }">
      <div
        v-for="(move, index) in moves"
        :key="move.id"
        role="button"
        :tabindex="canMove && !move.disabled ? 0 : -1"
        :aria-label="`${move.name}, ${move.type}, PP ${move.pp}`"
        class="move"
        :class="{ 'move--disabled': move.disabled }"
        :style="{ background: move.color, color: move.textColor }"
        @click="pickMove(index, move.disabled)"
        @keydown.enter="pickMove(index, move.disabled)"
        @mouseenter="hovered = move.id"
        @mouseleave="hovered = ''"
        @focus="hovered = move.id"
        @blur="hovered = ''"
      >
        <div class="move__row">
          <span class="move__name">{{ move.name }}</span>
          <span class="move__power">{{ move.power }}</span>
        </div>
        <div class="move__row">
          <span class="move__tag">{{ move.type }}</span>
          <span v-if="move.effect" class="move__tag" :style="{ background: move.effect.bg, color: move.effect.fg }">{{ move.effect.label }}</span>
          <span class="move__spacer" />
          <span class="move__tag">PP <b>{{ move.pp }}</b></span>
        </div>
        <div v-if="hovered === move.id" class="tooltip">
          <div class="tooltip__head">
            <span class="tooltip__name">{{ move.name }}</span>
            <span class="tooltip__meta">{{ move.category }} · PP {{ move.pp }}</span>
          </div>
          <div v-for="row in move.numbers" :key="row.k" class="tooltip__line">
            <span>{{ row.k }}</span><b>{{ row.v }}</b>
          </div>
          <p class="tooltip__effect">{{ move.text }}</p>
          <span v-if="move.props" class="tooltip__props">{{ move.props }}</span>
        </div>
      </div>
    </div>

    <div class="bench" :class="{ 'bench--off': !canSwitch }">
      <button
        v-for="member in bench"
        :key="member.slot"
        type="button"
        class="member"
        :disabled="!canSwitch || member.fainted"
        :title="member.fainted ? `${member.name} est K.O.` : `Envoyer ${member.name}`"
        @click="emit('choose', `switch ${member.slot}`)"
      >
        <div class="member__top">
          <span class="member__icon" :style="{ backgroundImage: `url(${spriteUrl(member.speciesId)})` }" />
          <span class="member__name">{{ member.name }}</span>
          <span v-if="member.status" class="member__status" :style="{ background: member.status.couleur }">{{ member.status.court }}</span>
        </div>
        <div class="member__hp">
          <div class="member__track"><div class="member__bar" :style="{ width: `${member.percent}%`, background: hpColor(member.percent) }" /></div>
          <span class="member__pct">{{ member.fainted ? 'K.O.' : `${member.percent} %` }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattleState } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState }>()
const emit = defineEmits<{ choose: [choice: string] }>()
const hovered = ref('')

const request = computed(() => props.battle.request)
const forced = computed(() => Boolean(request.value?.forceSwitch?.[0]))
const active = computed(() => request.value?.active?.[0])
const ready = computed(() => Boolean(request.value) && !props.battle.choiceSent && !request.value?.teamPreview)
const canMove = computed(() => ready.value && !forced.value && Boolean(active.value))
const canSwitch = computed(() => ready.value && (forced.value || !(active.value?.trapped || active.value?.maybeTrapped)))
const mine = computed(() => request.value?.side.pokemon.find(p => p.active))
const opponent = computed(() => activePokemon(props.battle, props.battle.mySide === 'p1' ? 'p2' : 'p1'))

const title = computed(() => {
  if (props.battle.ended) return 'Combat terminé'
  if (!request.value || props.battle.choiceSent) return "En attente…"
  if (request.value.teamPreview) return 'Choisis ton Pokémon de tête'
  if (forced.value) return 'Choisis un remplaçant'
  return `Que doit faire ${mine.value ? speciesName(toId(mine.value.details.split(',')[0] ?? ''), '') : 'ton Pokémon'} ?`
})

const hint = computed(() => {
  if (props.battle.choiceSent) return "Ton choix est envoyé, l'adversaire réfléchit."
  if (forced.value) return 'Ton Pokémon est K.O.'
  if (active.value?.trapped) return 'Ton Pokémon est piégé : il ne peut pas sortir.'
  return `Tour ${props.battle.turn}`
})

const EFFECTS: Record<number, { label: string, bg: string, fg: string }> = {
  0: { label: 'Aucun effet', bg: '#1d1d1d', fg: '#fff' },
  0.25: { label: 'Très peu efficace', bg: 'rgba(0,0,0,.45)', fg: '#ffb4a8' },
  0.5: { label: 'Peu efficace', bg: 'rgba(0,0,0,.35)', fg: '#ffd0c4' },
  2: { label: 'Super efficace', bg: '#ffe066', fg: '#2a2410' },
  4: { label: 'Super efficace ×4', bg: '#ffd23a', fg: '#2a2410' },
}

const moves = computed(() => (active.value?.moves ?? []).map((slot) => {
  const data = findMove(slot.id)
  const type = data?.type ?? 'Normal'
  const status = data?.categorie === 'statut'
  const defender = opponent.value ? findPokemon(opponent.value.speciesId)?.types ?? [] : []
  const multiplier = data && !status && defender.length ? effectiveness(type, defender) : 1
  const accuracy = data?.precision == null ? '∞' : `${data.precision} %`
  const flags = [data?.contact && 'Contact', data?.son && 'Son', data?.morsure && 'Morsure', data?.danse && 'Danse', data?.coupsMultiples && 'Plusieurs coups'].filter(Boolean)
  return {
    id: slot.id,
    name: data?.nom ?? moveName(slot.move),
    type,
    color: TYPE_COLORS[type],
    textColor: typeTextColor(type),
    power: data?.puissance ? String(data.puissance) : '—',
    category: data ? { physique: 'Physique', spécial: 'Spéciale', statut: 'Statut' }[data.categorie] : '',
    pp: `${slot.pp}/${slot.maxpp}`,
    disabled: Boolean(slot.disabled) || slot.pp <= 0,
    effect: multiplier === 1 ? null : EFFECTS[multiplier] ?? null,
    numbers: [
      { k: 'Puissance', v: data?.puissance ? String(data.puissance) : '—' },
      { k: 'Précision', v: accuracy },
      { k: 'Priorité', v: data?.priorite ? (data.priorite > 0 ? `+${data.priorite}` : String(data.priorite)) : '0' },
    ],
    text: data?.effet ?? '',
    props: flags.join(' · '),
  }
}))

const bench = computed(() => (request.value?.side.pokemon ?? []).map((member, index) => {
  const speciesId = toId(member.details.split(',')[0] ?? '')
  const [hp = '0', status = ''] = member.condition.split(' ')
  const [current = '0', max = '1'] = hp.split('/')
  const fainted = status === 'fnt' || hp === '0'
  return {
    slot: index + 1,
    active: member.active,
    speciesId,
    name: speciesName(speciesId, member.ident.split(': ')[1] ?? ''),
    fainted,
    percent: fainted ? 0 : Math.round(Number(current) / Number(max) * 100),
    status: fainted ? undefined : STATUS_LABELS[status],
  }
}).filter(member => !member.active))

const pickMove = (index: number, disabled: boolean) => {
  if (canMove.value && !disabled) emit('choose', `move ${index + 1}`)
}
</script>

<style scoped>
.actions {
  display: grid;
  grid-template-columns: 210px minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
}

.actions__intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.actions__title { font: 700 16px/1.15 'Pixelify Sans', sans-serif; }
.actions__hint { font: 400 13px/1.35 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.actions__error {
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 210, 58, .14);
  color: #ffd23a;
  font: 700 12px/1.35 'Atkinson Hyperlegible', sans-serif;
}

.moves {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 62px 62px;
  gap: 8px;
}

.moves--off, .bench--off { opacity: .5; pointer-events: none; }

.move {
  position: relative;
  cursor: pointer;
  border-radius: 10px;
  clip-path: var(--cut);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .45), inset 0 -5px 0 rgba(0, 0, 0, .2);
  padding: 7px 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform .12s;
  outline: none;
}

.move:hover, .move:focus-visible { transform: translateY(-2px); }
.move--disabled { filter: grayscale(.8) brightness(.7); cursor: not-allowed; }

.move__row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.move__name {
  flex: 1;
  font: 700 16px 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.move__power { font: 700 19px 'Pixelify Sans', sans-serif; }
.move__spacer { flex: 1; }

.move__tag {
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, .28);
  color: #fff;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.tooltip {
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  width: 320px;
  z-index: 40;
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--pn2);
  color: var(--tx);
  box-shadow: var(--pnS), 0 16px 30px rgba(0, 0, 0, .5);
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: pop .15s both;
  cursor: default;
}

.tooltip__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tooltip__name { flex: 1; font: 700 17px 'Pixelify Sans', sans-serif; }
.tooltip__meta { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }

.tooltip__line {
  display: flex;
  justify-content: space-between;
  font: 400 13px 'Atkinson Hyperlegible', sans-serif;
  color: var(--mu);
}

.tooltip__line b { color: var(--tx); }

.tooltip__effect {
  margin: 0;
  padding-top: 6px;
  border-top: 2px solid var(--chip);
  font: 400 13px/1.4 'Atkinson Hyperlegible', sans-serif;
}

.tooltip__props { font: 700 11px 'Atkinson Hyperlegible', sans-serif; color: var(--sel); }

.bench {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.member {
  border: 0;
  cursor: pointer;
  border-radius: 9px;
  background: var(--chip);
  box-shadow: 0 0 0 2px var(--bd);
  padding: 5px 6px 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  text-align: left;
  color: var(--tx);
  min-width: 0;
  transition: transform .12s;
}

.member:hover:not(:disabled) { transform: translateY(-2px); }
.member:disabled { opacity: .45; cursor: not-allowed; }

.member__top {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.member__icon {
  width: 34px;
  height: 34px;
  flex: none;
  margin: -4px -2px -2px -4px;
  background: center/contain no-repeat;
  image-rendering: pixelated;
}

.member__name {
  flex: 1;
  min-width: 0;
  font: 700 12px/1.1 'Atkinson Hyperlegible', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member__status {
  flex: none;
  height: 16px;
  padding: 0 3px;
  border-radius: 3px;
  color: #fff;
  font: 700 9px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.member__hp {
  display: flex;
  align-items: center;
  gap: 4px;
}

.member__track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--dk);
  overflow: hidden;
}

.member__bar { height: 100%; }
.member__pct { font: 700 12px 'Pixelify Sans', sans-serif; }
</style>

<template>
  <div class="actions">
    <div class="actions__intro">
      <span class="actions__title">{{ title }}</span>
      <span v-if="battle.error" class="actions__error">{{ battle.error }}</span>
      <span v-else class="actions__hint">{{ hint }}</span>
      <div v-if="slots.length > 1" class="slots" aria-label="Choix par Pokémon">
        <span v-for="(slot, index) in slots" :key="index" class="slots__item" :class="{ 'slots__item--now': index === current, 'slots__item--done': index < current }">
          {{ slot.name }} · {{ choices[index] ? choiceLabel(choices[index]!, index) : index === current ? 'à toi' : '…' }}
        </span>
        <button v-if="current > 0 && !battle.choiceSent" type="button" class="btn btn--small" @click="undo">Annuler</button>
      </div>
      <div v-if="mechanics.length" class="mechanics">
        <button
          v-for="mechanic in mechanics"
          :key="mechanic.key"
          type="button"
          class="mechanic"
          :class="{ 'mechanic--on': toggled === mechanic.key }"
          :aria-pressed="toggled === mechanic.key"
          @click="toggled = toggled === mechanic.key ? '' : mechanic.key"
        >
          {{ mechanic.label }}
        </button>
      </div>
    </div>

    <div v-if="targeting" class="targets">
      <span class="targets__title">Cible de {{ targeting.name }}</span>
      <div class="targets__list">
        <button v-for="target in targeting.options" :key="target.value" type="button" class="target" :class="{ 'target--ally': target.value < 0 }" @click="commit(`${targeting.command} ${target.value}${targeting.suffix}`)">
          <span class="target__icon" :style="{ backgroundImage: `url(${spriteUrl(target.speciesId)})` }" />
          {{ target.label }}
        </button>
      </div>
      <button type="button" class="btn btn--small" @click="targeting = null">Retour</button>
    </div>

    <div v-else class="moves" :class="{ 'moves--off': !canMove }">
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
        :disabled="!canSwitch || member.fainted || member.taken"
        :title="member.fainted ? `${member.name} est K.O.` : `Envoyer ${member.name}`"
        @click="commit(`switch ${member.slot}`)"
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
import type { BattleState, RequestPokemon, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState }>()
const emit = defineEmits<{ choose: [choice: string] }>()
const hovered = ref('')
const choices = ref<string[]>([])
const toggled = ref('')
const targeting = ref<{ name: string, command: string, suffix: string, options: { value: number, label: string, speciesId: string }[] } | null>(null)

/** Cibles à choisir en combat double ou triple, selon la portée de l'attaque. */
const TARGETED = ['normal', 'any', 'adjacentFoe', 'adjacentAlly', 'adjacentAllyOrSelf']
const MECHANICS = [
  { key: 'terastallize', label: 'Téracristal' },
  { key: 'mega', label: 'Méga-Évolution' },
  { key: 'dynamax', label: 'Dynamax' },
  { key: 'zmove', label: 'Capacité Z' },
]

const request = computed(() => props.battle.request)
const pokedraft = computed(() => isPokedraft(props.battle))
const mySide = computed<SideId>(() => props.battle.mySide ?? 'p1')
const foeSide = computed<SideId>(() => mySide.value === 'p1' ? 'p2' : 'p1')
const speciesOf = (member: RequestPokemon) => toId(member.details.split(',')[0] ?? '')
const isFainted = (member?: RequestPokemon) => !member || member.condition.endsWith(' fnt') || member.condition.startsWith('0')

/** Places qui attendent un choix ce tour-ci ; les autres passent. */
const slots = computed(() => {
  const current = request.value
  if (!current || current.teamPreview || current.wait) return []
  const count = current.forceSwitch?.length ?? current.active?.length ?? 0
  return Array.from({ length: count }, (_, index) => {
    const member = current.side.pokemon[index]
    const needed = current.forceSwitch ? Boolean(current.forceSwitch[index]) : !isFainted(member)
    return { index, needed, forced: Boolean(current.forceSwitch?.[index]), name: member ? speciesName(speciesOf(member), '') : '' }
  })
})

const current = computed(() => {
  const next = slots.value.findIndex((slot, index) => slot.needed && choices.value[index] === undefined)
  return next === -1 ? slots.value.length : next
})
const slot = computed(() => slots.value[current.value])
const forced = computed(() => Boolean(slot.value?.forced))
const active = computed(() => slot.value ? request.value?.active?.[slot.value.index] : undefined)
const ready = computed(() => Boolean(request.value) && !props.battle.choiceSent && !request.value?.teamPreview && Boolean(slot.value))
const canMove = computed(() => ready.value && !forced.value && Boolean(active.value))
const canSwitch = computed(() => ready.value && (forced.value || !(active.value?.trapped || active.value?.maybeTrapped)))

watch(() => request.value?.rqid ?? request.value, () => {
  choices.value = []
  toggled.value = ''
  targeting.value = null
})

const mechanics = computed(() => {
  const data = active.value
  if (!canMove.value || !data) return []
  return MECHANICS.filter(mechanic => (mechanic.key === 'terastallize' && data.canTerastallize)
    || (mechanic.key === 'mega' && data.canMegaEvo)
    || (mechanic.key === 'dynamax' && data.canDynamax)
    || (mechanic.key === 'zmove' && data.canZMove?.some(Boolean)))
    .map(mechanic => mechanic.key === 'terastallize' ? { ...mechanic, label: `Téracristal · ${frenchType(data.canTerastallize ?? '')}` } : mechanic)
})

const title = computed(() => {
  if (props.battle.ended) return 'Combat terminé'
  if (!request.value || props.battle.choiceSent) return 'En attente…'
  if (request.value.teamPreview) return 'Choisis ton Pokémon de tête'
  if (forced.value) return slots.value.length > 1 ? `Remplaçant de ${slot.value?.name}` : 'Choisis un remplaçant'
  return `Que doit faire ${slot.value?.name || 'ton Pokémon'} ?`
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

const foes = computed(() => activePokemons(props.battle, foeSide.value).filter(pokemon => !pokemon.fainted))

const moves = computed(() => (active.value?.moves ?? []).map((move, index) => {
  const data = moveView(move.id, pokedraft.value)
  const type = data?.type ?? 'Normal'
  const status = data?.category === 'Statut'
  const defender = foes.value.length === 1 ? speciesView(foes.value[0]!.speciesId, pokedraft.value).types : []
  const multiplier = data && !status && defender.length ? effectiveness(type, defender) : 1
  const zMove = toggled.value === 'zmove' ? active.value?.canZMove?.[index] : null
  return {
    id: move.id,
    name: zMove ? moveName(zMove.move) : data?.nom ?? moveName(move.move),
    type,
    color: TYPE_COLORS[type] ?? '#9fa19f',
    textColor: typeTextColor(type),
    power: data?.power ? String(data.power) : '—',
    category: data?.category ?? '',
    pp: `${move.pp}/${move.maxpp}`,
    target: move.target ?? 'normal',
    disabled: Boolean(move.disabled) || move.pp <= 0 || (toggled.value === 'zmove' && !zMove),
    effect: multiplier === 1 ? null : EFFECTS[multiplier] ?? null,
    numbers: [
      { k: 'Puissance', v: data?.power ? String(data.power) : '—' },
      { k: 'Précision', v: data?.accuracy == null ? '∞' : `${data.accuracy} %` },
      { k: 'Priorité', v: data?.priority ? (data.priority > 0 ? `+${data.priority}` : String(data.priority)) : '0' },
    ],
    text: data?.text ?? '',
    props: data?.flags.join(' · ') ?? '',
  }
}))

const bench = computed(() => (request.value?.side.pokemon ?? []).map((member, index) => {
  const speciesId = speciesOf(member)
  const [hp = '0', status = ''] = member.condition.split(' ')
  const [currentHp = '0', max = '1'] = hp.split('/')
  const fainted = isFainted(member)
  return {
    slot: index + 1,
    active: member.active,
    speciesId,
    name: speciesName(speciesId, member.ident.split(': ')[1] ?? ''),
    fainted,
    taken: choices.value.includes(`switch ${index + 1}`),
    percent: fainted ? 0 : Math.round(Number(currentHp) / Number(max) * 100),
    status: fainted ? undefined : STATUS_LABELS[status],
  }
}).filter(member => !member.active))

const choiceLabel = (choice: string, index: number) => {
  if (choice === 'pass') return 'passe'
  const [kind, number] = choice.split(' ')
  if (kind === 'switch') return `→ ${bench.value.find(member => member.slot === Number(number))?.name ?? ''}`
  const move = request.value?.active?.[index]?.moves[Number(number) - 1]
  return move ? moveName(move.move) : 'attaque'
}

/** Ajoute le choix de la place en cours ; quand toutes les places ont choisi, envoie le tout. */
const commit = (choice: string) => {
  if (!slot.value) return
  const next = [...choices.value]
  next[slot.value.index] = choice
  targeting.value = null
  toggled.value = ''
  slots.value.forEach((entry, index) => {
    if (!entry.needed && next[index] === undefined) next[index] = 'pass'
  })
  choices.value = next
  if (slots.value.every((_, index) => next[index] !== undefined)) emit('choose', slots.value.map((_, index) => next[index]).join(', '))
}

const undo = () => {
  const done = slots.value.map((entry, index) => entry.needed ? index : -1).filter(index => index >= 0 && index < current.value)
  const last = done[done.length - 1]
  if (last === undefined) return
  const next = [...choices.value]
  next.length = last
  choices.value = next
}

const pickMove = (index: number, disabled: boolean) => {
  if (!canMove.value || disabled) return
  const move = moves.value[index]!
  const suffix = toggled.value ? ` ${toggled.value}` : ''
  const command = `move ${index + 1}`
  if (slots.value.length > 1 && TARGETED.includes(move.target)) {
    const allies = activePokemons(props.battle, mySide.value).filter(pokemon => !pokemon.fainted && (pokemon.position !== slot.value!.index || move.target === 'adjacentAllyOrSelf'))
    const options = [
      ...(move.target === 'adjacentAlly' || move.target === 'adjacentAllyOrSelf' ? [] : foes.value.map(pokemon => ({ value: pokemon.position + 1, label: `${speciesName(pokemon.speciesId)} adverse`, speciesId: pokemon.speciesId }))),
      ...(move.target === 'adjacentFoe' ? [] : allies.map(pokemon => ({ value: -(pokemon.position + 1), label: speciesName(pokemon.speciesId), speciesId: pokemon.speciesId }))),
    ]
    if (options.length > 1) {
      targeting.value = { name: move.name, command, suffix, options }
      return
    }
    if (options.length === 1) return commit(`${command} ${options[0]!.value}${suffix}`)
  }
  commit(`${command}${suffix}`)
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

.slots { display: flex; flex-direction: column; gap: 4px; }
.slots__item { font: 700 12px 'Atkinson Hyperlegible', sans-serif; color: var(--mu); }
.slots__item--now { color: var(--tx); }
.slots__item--done { color: #58d080; }
.mechanics { display: flex; flex-wrap: wrap; gap: 4px; }

.mechanic {
  border: 0;
  cursor: pointer;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  background: var(--chip);
  color: var(--tx);
  font: 700 12px 'Atkinson Hyperlegible', sans-serif;
}

.mechanic--on { background: var(--uA); color: var(--uAtx); }
.targets { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.targets__title { font: 600 15px 'Pixelify Sans', sans-serif; }
.targets__list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }

.target {
  border: 0;
  cursor: pointer;
  min-height: 46px;
  padding: 4px 10px;
  border-radius: 8px;
  background: #3a2a2a;
  color: #fff;
  font: 700 13px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}

.target--ally { background: #22384a; }
.target__icon { width: 36px; height: 36px; background: center / contain no-repeat; image-rendering: pixelated; flex: none; }
</style>

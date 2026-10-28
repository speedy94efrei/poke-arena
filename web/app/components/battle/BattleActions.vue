<template>
  <div class="actions">
    <div class="actions__head">
      <span class="actions__title">{{ title }}</span>
      <span v-if="battle.error" class="actions__error">{{ battle.error }}</span>
      <span v-else class="actions__hint">{{ hint }}</span>
      <div v-if="slots.length > 1" class="slots" aria-label="Choix par Pokémon">
        <span v-for="(slot, index) in slots" :key="index" class="slots__item" :class="{ 'slots__item--now': index === current, 'slots__item--done': index < current }">
          {{ slot.name }} · {{ choices[index] ? choiceLabel(choices[index]!, index) : index === current ? 'à toi' : '…' }}
        </span>
        <button v-if="current > 0 && !battle.choiceSent" type="button" class="btn btn--small" @click="undo">Annuler</button>
      </div>
      <button
        v-for="mechanic in mechanics"
        :key="mechanic.key"
        type="button"
        class="mechanic"
        :class="{ 'mechanic--on': toggled === mechanic.key, 'mechanic--tera': mechanic.key === 'terastallize' }"
        :aria-pressed="toggled === mechanic.key"
        @click="toggled = toggled === mechanic.key ? '' : mechanic.key"
      >
        <span v-if="mechanic.key === 'terastallize'" class="mechanic__gem" />
        {{ toggled === mechanic.key && mechanic.key === 'terastallize' ? `Téra ${frenchType(active?.canTerastallize ?? '')} activé` : mechanic.label }}
      </button>
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
        :style="{ '--type': move.color }"
        @click="pickMove(index, move.disabled)"
        @keydown.enter="pickMove(index, move.disabled)"
        @mouseenter="hovered = move.id"
        @mouseleave="hovered = ''"
        @focus="hovered = move.id"
        @blur="hovered = ''"
      >
        <div class="move__inner">
          <div class="move__main">
            <span class="move__name">{{ move.name }}</span>
            <span class="move__meta"><span class="move__type">{{ move.type }}</span>{{ move.category }} · PP {{ move.pp }}</span>
            <span v-if="beginner && move.warning" class="move__warn">⚠ {{ move.warning }}</span>
          </div>
          <div class="move__side">
            <span class="move__dmg">{{ beginner ? move.damage : move.power }}</span>
            <span v-if="beginner && move.effect" class="move__eff" :style="{ background: move.effect.bg, color: move.effect.fg }">{{ move.effect.label }}</span>
          </div>
        </div>
        <BattleTip v-if="hovered === move.id" placement="above" :align="index % 2 ? 'end' : 'start'">
          <div class="calc__head"><b>{{ move.calc ? 'Calcul' : move.category }} · {{ move.name }}</b><span v-if="move.calc" class="calc__dmg">{{ move.damage }}</span></div>
          <div v-for="row in move.rows" :key="row.k" class="calc__row"><span>{{ row.k }}</span><span>{{ row.v }}</span></div>
          <div v-for="warning in move.warnings" :key="warning" class="calc__warn">⚠ {{ warning }}</div>
          <p v-if="move.verdict" class="calc__verdict">{{ move.verdict }}</p>
          <p v-if="move.text" class="calc__text">{{ move.text }}</p>
        </BattleTip>
      </div>
    </div>

    <div class="bench" :class="{ 'bench--off': !canSwitch }">
      <div
        v-for="(member, index) in bench"
        :key="member.slot"
        role="button"
        :tabindex="canSwitch && !member.fainted && !member.taken ? 0 : -1"
        class="member"
        :class="{ 'member--off': !canSwitch || member.fainted || member.taken }"
        :style="{ '--type': member.color, '--habitat': member.habitat }"
        :aria-label="member.fainted ? `${member.name} est K.O.` : `Envoyer ${member.name}`"
        @click="switchTo(member)"
        @keydown.enter="switchTo(member)"
        @mouseenter="hoveredMember = member.slot"
        @mouseleave="hoveredMember = 0"
        @focus="hoveredMember = member.slot"
        @blur="hoveredMember = 0"
      >
        <span class="member__sprite" :style="{ backgroundImage: `url(${spriteUrl(member.speciesId)})` }" />
        <span class="member__name">{{ member.name }}</span>
        <span v-if="member.status" class="member__status" :style="{ background: member.status.couleur }">{{ member.status.court }}</span>
        <span v-else-if="beginner && member.matchup" class="member__status" :style="{ background: member.matchup.bg, color: member.matchup.fg }">{{ member.matchup.label }}</span>
        <div class="member__hp">
          <div class="member__track"><div class="member__bar" :style="{ width: `${member.percent}%`, background: hpColor(member.percent) }" /></div>
          <span class="member__pct">{{ member.fainted ? 'K.O.' : `${member.percent} %` }}</span>
        </div>
        <BattleTip v-if="hoveredMember === member.slot" placement="above" :align="index >= 3 ? 'end' : 'start'">
          <div class="poke__head">
            <b>{{ member.name }}</b>
            <span>N.{{ member.level }}</span>
          </div>
          <div class="poke__types">
            <TypeBadge v-for="type in member.types" :key="type" :type="type" small />
            <span v-if="member.teraType" class="poke__tera">Téra {{ frenchType(member.teraType) }}</span>
          </div>
          <div class="calc__row"><span>PV</span><span>{{ member.hpText }}</span></div>
          <div class="calc__row"><span>Talent</span><span>{{ member.ability }}</span></div>
          <div class="calc__row"><span>Objet</span><span>{{ member.item }}</span></div>
          <div v-if="member.stats" class="poke__stats">{{ member.stats }}</div>
          <ul class="poke__moves">
            <li v-for="move in member.moves" :key="move.id">
              <span class="poke__move-type" :style="{ background: TYPE_COLORS[move.type] }" />
              {{ move.name }}<span class="poke__pp">{{ move.pp }}</span>
            </li>
          </ul>
          <p v-if="member.matchupText" class="calc__verdict">{{ member.matchupText }}</p>
        </BattleTip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TypePokemon } from '#data/types/roster'
import type { BattlePokemon, BattleState, RequestPokemon, SideId } from '~/utils/battleTracker'

const props = defineProps<{ battle: BattleState }>()
const emit = defineEmits<{ choose: [choice: string] }>()
const calc = inject(BATTLE_CALC)
const { beginner } = useBattleHelp()
const hovered = ref('')
const hoveredMember = ref(0)
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
const EFFECTS: Record<string, { label: string, bg: string, fg: string }> = {
  0: { label: '✕ Sans effet', bg: '#383838', fg: '#fff' },
  0.25: { label: '▼ Très peu efficace ×¼', bg: '#e04838', fg: '#fff' },
  0.5: { label: '▼ Peu efficace ×0,5', bg: '#e04838', fg: '#fff' },
  1: { label: '= Neutre ×1', bg: '#d8d8d0', fg: '#383838' },
  2: { label: '▲ Super efficace ×2', bg: '#2f9a58', fg: '#fff' },
  4: { label: '▲ Super efficace ×4', bg: '#1f7a40', fg: '#fff' },
}
const STAT_ORDER = ['atk', 'def', 'spa', 'spd', 'spe'] as const

const request = computed(() => props.battle.request)
const pokedraft = computed(() => isPokedraft(props.battle))
const mySide = computed<SideId>(() => props.battle.mySide ?? 'p1')
const foeSide = computed<SideId>(() => mySide.value === 'p1' ? 'p2' : 'p1')
const speciesOf = (member: RequestPokemon) => toId(member.details.split(',')[0] ?? '')
const isFainted = (member?: RequestPokemon) => !member || member.condition.endsWith(' fnt') || member.condition.startsWith('0')
const ownPokemon = (member: RequestPokemon) => props.battle.sides[mySide.value].team.find(pokemon => pokemon.name === identName(member.ident) || (!pokemon.name && pokemon.speciesId === speciesOf(member)))
const percentText = (value: number) => `${Math.round(value * 100)}`

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
  return 'Survole une attaque pour le détail du calcul, un Pokémon pour ses attaques et ses PP.'
})

const foes = computed(() => activePokemons(props.battle, foeSide.value).filter(pokemon => !pokemon.fainted))
const attacker = computed(() => {
  const member = slot.value ? request.value?.side.pokemon[slot.value.index] : undefined
  return member ? ownPokemon(member) : undefined
})

/** Calcul de chaque attaque contre l'adversaire en face, Téracristal compris s'il est choisi. */
const calcs = computed(() => {
  const source = attacker.value
  const target = foes.value[Math.min(slot.value?.index ?? 0, foes.value.length - 1)]
  if (!calc || !source || !target || !active.value) return {}
  const tera = toggled.value === 'terastallize' ? active.value.canTerastallize ?? '' : ''
  return calc.movesAgainst(source, target, active.value.moves.map(move => move.id), tera)
})

const moves = computed(() => (active.value?.moves ?? []).map((move, index) => {
  const data = moveView(move.id, pokedraft.value)
  const zMove = toggled.value === 'zmove' ? active.value?.canZMove?.[index] : null
  const result = calcs.value[move.id] ?? null
  const type = result?.type ?? data?.type ?? 'Normal'
  const status = data?.category === 'Statut'
  const target = foes.value[0]
  const rows = result?.rows ?? [
    { k: 'Puissance', v: data?.power ? String(data.power) : '—' },
    { k: 'Précision', v: data?.accuracy == null ? 'ne rate jamais' : `${data.accuracy} %` },
    ...(data?.priority ? [{ k: 'Priorité', v: data.priority > 0 ? `+${data.priority}` : String(data.priority) }] : []),
  ]
  return {
    id: move.id,
    name: zMove ? moveName(zMove.move) : data?.nom ?? moveName(move.move),
    type,
    color: TYPE_COLORS[type] ?? '#9fa19f',
    power: result?.power ? String(result.power) : data?.power ? String(data.power) : '—',
    category: data?.category ?? '',
    pp: `${move.pp}/${move.maxpp}`,
    target: move.target ?? 'normal',
    disabled: Boolean(move.disabled) || move.pp <= 0 || (toggled.value === 'zmove' && !zMove),
    calc: result,
    damage: result ? `${percentText(result.minPct)}–${percentText(result.maxPct)} %` : status ? 'Statut' : '—',
    effect: result ? EFFECTS[String(result.multiplier)] ?? null : null,
    warning: result?.warnings[0] ?? '',
    warnings: result?.warnings ?? [],
    rows,
    verdict: result ? `${result.koText}${target ? ` sur ${speciesName(target.speciesId)}` : ''}.` : '',
    text: data?.text ?? '',
  }
}))

/** Face au Pokémon adverse actif : ce que ses types d'attaque font au Pokémon du banc. */
const matchupOf = (types: TypePokemon[], ability: string) => {
  const target = foes.value[0]
  if (!target || !types.length) return null
  const foeTypes = target.tera ? [frenchType(target.tera)] : speciesView(target.speciesId, pokedraft.value).types
  const values = foeTypes.map(type => ({ type, value: damageTaken(type, types, ability) }))
  const worst = Math.max(...values.map(entry => entry.value))
  const foeName = speciesName(target.speciesId)
  const detail = values.map(entry => `${entry.type} ×${String(entry.value).replace('.', ',')}`).join(', ')
  if (worst === 0) return { label: 'Immunisé', bg: '#383838', fg: '#fff', text: `Face à ${foeName} : immunisé à ses attaques de type (${detail}).` }
  if (worst >= 2) return { label: '▲ Faible', bg: '#e04838', fg: '#fff', text: `Face à ${foeName} : faible à ses attaques de type (${detail}).` }
  if (worst < 1) return { label: '▼ Résiste', bg: '#2f9a58', fg: '#fff', text: `Face à ${foeName} : résiste à ses attaques de type (${detail}).` }
  return { label: '= Neutre', bg: '#d8d8d0', fg: '#383838', text: `Face à ${foeName} : neutre (${detail}).` }
}

const bench = computed(() => (request.value?.side.pokemon ?? []).map((member, index) => {
  const speciesId = speciesOf(member)
  const pokemon: BattlePokemon | undefined = ownPokemon(member)
  const [hp = '0', status = ''] = member.condition.split(' ')
  const [currentHp = '0', max = '1'] = hp.split('/')
  const fainted = isFainted(member)
  const types = speciesView(speciesId, pokedraft.value).types
  const matchup = fainted ? null : matchupOf(types, toId(member.baseAbility))
  const stats = member.stats ?? pokemon?.stats
  return {
    slot: index + 1,
    active: member.active,
    speciesId,
    name: speciesName(speciesId, member.ident.split(': ')[1] ?? ''),
    level: pokemon?.level ?? 100,
    types,
    color: TYPE_COLORS[types[0] ?? 'Normal'] ?? '#555',
    habitat: habitatBackground(types[0]),
    teraType: member.teraType ?? '',
    fainted,
    taken: choices.value.includes(`switch ${index + 1}`),
    percent: fainted ? 0 : Math.round(Number(currentHp) / Number(max) * 100),
    hpText: fainted ? 'K.O.' : `${currentHp}/${max} (${Math.round(Number(currentHp) / Number(max) * 100)} %)`,
    status: fainted ? undefined : STATUS_LABELS[status],
    ability: member.baseAbility ? abilityName(member.baseAbility) : '?',
    item: member.item ? itemName(member.item) : 'aucun',
    stats: stats ? STAT_ORDER.map(stat => `${STAT_SHORT[stat]} ${stats[stat]}`).join(' / ') : '',
    moves: member.moves.map((id) => {
      const data = moveView(id, pokedraft.value)
      const known = pokemon?.pp[id]
      const basePp = currentPokedex()?.moves[id]?.pp ?? 0
      return { id, name: data?.nom ?? moveName(id), type: data?.type ?? 'Normal', pp: known ? `${known.pp}/${known.maxpp}` : basePp ? `${Math.floor(basePp * 8 / 5)}/${Math.floor(basePp * 8 / 5)}` : '' }
    }),
    matchup,
    matchupText: matchup?.text ?? '',
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

const switchTo = (member: { slot: number, fainted: boolean, taken: boolean }) => {
  if (!canSwitch.value || member.fainted || member.taken) return
  commit(`switch ${member.slot}`)
}

const pickMove = (index: number, disabled: boolean) => {
  if (!canMove.value || disabled) return
  const move = moves.value[index]!
  const suffix = toggled.value ? ` ${toggled.value}` : ''
  const command = `move ${index + 1}`
  if (activeCount(props.battle) > 1 && TARGETED.includes(move.target)) {
    const self = slot.value!.index + props.battle.myOffset
    const allies = activePokemons(props.battle, mySide.value).filter(pokemon => !pokemon.fainted && (pokemon.position !== self || move.target === 'adjacentAllyOrSelf'))
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
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--pn);
  box-shadow: var(--pnS);
}

.actions__head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-height: 36px; }
.actions__title { font: 600 19px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.actions__hint { flex: 1; min-width: 160px; font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.actions__error { flex: 1; padding: 6px 8px; border-radius: 6px; background: rgba(255, 210, 58, .14); color: #ffd23a; font: 700 12px/1.35 'Nunito', sans-serif; }

.mechanic {
  border: 0;
  cursor: pointer;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  background: var(--chip);
  color: var(--tx);
  box-shadow: 0 0 0 2px var(--bd), inset 0 -3px 0 rgba(0, 0, 0, .2);
  font: 600 15px 'Pixelify Sans', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mechanic--tera { background: var(--sel); color: var(--selTx); }
.mechanic--on { background: #60a1b8; color: #fff; }
.mechanic__gem { width: 14px; height: 14px; transform: rotate(45deg); background: linear-gradient(135deg, #bfe6f2, #60a1b8); border: 2px solid #fff; box-sizing: border-box; }
.moves { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.moves--off, .bench--off { opacity: .45; pointer-events: none; }

.move {
  position: relative;
  height: 84px;
  cursor: pointer;
  border-radius: 12px;
  background: var(--type);
  clip-path: var(--cut);
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, .55), inset 0 -6px 0 rgba(0, 0, 0, .18), 0 0 0 2px var(--bd);
  transition: transform .12s;
  outline: none;
}

.move:hover, .move:focus-visible { transform: translateY(-2px); clip-path: none; }
.move--disabled { filter: grayscale(.8) brightness(.7); cursor: not-allowed; }

.move__inner {
  position: absolute;
  inset: 8px 8px 12px;
  border-radius: 7px;
  background: rgba(255, 255, 255, .88);
  color: #383838;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 10px;
  padding: 4px 10px;
  box-sizing: border-box;
}

.move__main { display: flex; flex-direction: column; justify-content: center; gap: 1px; min-width: 0; }
.move__name { font: 600 18px/1.1 'Pixelify Sans', sans-serif; text-shadow: 2px 2px 0 #d8d8c8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.move__meta { display: flex; align-items: center; gap: 5px; font: 600 12px 'Pixelify Sans', sans-serif; color: #6a6a6a; white-space: nowrap; }
.move__type { height: 16px; padding: 0 6px; border-radius: 3px; background: var(--type); color: #fff; text-shadow: 1px 1px 0 rgba(0, 0, 0, .45); font-size: 11px; display: flex; align-items: center; }
.move__warn { font: 800 11px 'Nunito', sans-serif; color: #a04030; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.move__side { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 3px; }
.move__dmg { font: 700 20px/1 'Pixelify Sans', sans-serif; white-space: nowrap; }
.move__eff { height: 18px; padding: 0 6px; border-radius: 4px; font: 600 11px 'Pixelify Sans', sans-serif; display: flex; align-items: center; white-space: nowrap; }
.calc__head { display: flex; align-items: center; gap: 8px; }
.calc__head b { flex: 1; font: 600 16px 'Pixelify Sans', sans-serif; }
.calc__dmg { font: 700 17px 'Pixelify Sans', sans-serif; color: var(--ac); }
.calc__row { display: flex; justify-content: space-between; gap: 12px; }
.calc__row span:first-child { color: var(--mu); }
.calc__row span:last-child { text-align: right; }
.calc__warn { color: #ffb070; }
.calc__verdict { margin: 0; padding-top: 6px; border-top: 2px solid var(--chip); font-weight: 800; }
.calc__text { margin: 0; font-weight: 400; color: var(--mu); }
.bench { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }

.member {
  position: relative;
  height: 70px;
  border-radius: 10px;
  cursor: pointer;
  background: linear-gradient(90deg, rgba(0, 0, 0, .6), rgba(0, 0, 0, .12) 70%), var(--habitat, var(--type));
  box-shadow: 0 0 0 2px var(--bd);
  transition: transform .12s;
  outline: none;
}

.member:hover:not(.member--off), .member:focus-visible { transform: translateY(-2px); }
.member--off { opacity: .5; cursor: not-allowed; }
.member__sprite { position: absolute; right: -4px; top: -8px; width: 58px; height: 58px; background: center / contain no-repeat; image-rendering: pixelated; }
.member__name { position: absolute; left: 7px; top: 6px; right: 40px; font: 600 13px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 1px 1px 0 #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.member__status { position: absolute; left: 7px; top: 25px; height: 15px; padding: 0 5px; border-radius: 3px; color: #fff; font: 600 10px 'Pixelify Sans', sans-serif; display: flex; align-items: center; }
.member__hp { position: absolute; left: 7px; right: 7px; bottom: 7px; display: flex; align-items: center; gap: 5px; }
.member__track { flex: 1; height: 7px; border-radius: 4px; background: #383838; box-shadow: 0 0 0 1px #fff; overflow: hidden; }
.member__bar { height: 100%; }
.member__pct { font: 600 12px 'Pixelify Sans', sans-serif; color: #fff; text-shadow: 1px 1px 0 #000; }
.poke__head { display: flex; align-items: baseline; gap: 8px; }
.poke__head b { flex: 1; font: 600 17px 'Pixelify Sans', sans-serif; }
.poke__head span { color: var(--mu); }
.poke__types { display: flex; align-items: center; gap: 4px; }
.poke__tera { height: 18px; padding: 0 6px; border-radius: 4px; background: #60a1b8; color: #fff; font-size: 11px; display: flex; align-items: center; }
.poke__stats { font-weight: 400; color: var(--mu); }
.poke__moves { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
.poke__moves li { display: flex; align-items: center; gap: 6px; }
.poke__move-type { width: 8px; height: 14px; border-radius: 2px; flex: none; }
.poke__pp { margin-left: auto; font: 600 12px 'Pixelify Sans', sans-serif; color: var(--mu); }
.slots { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.slots__item { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.slots__item--now { color: var(--tx); }
.slots__item--done { color: var(--good); }
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
  font: 700 13px 'Nunito', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}

.target--ally { background: #22384a; }
.target__icon { width: 36px; height: 36px; background: center / contain no-repeat; image-rendering: pixelated; flex: none; }
</style>

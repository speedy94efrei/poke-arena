import type { Pokemon } from '#data/types/roster'
import type { Variante } from '~/utils/atelier'

export type DraftPhase = 'ban' | 'reveal' | 'pick' | 'prep' | 'done' | 'cancelled'

export interface DraftView {
  id: string
  phase: DraftPhase
  you: string
  opponent: string
  remaining: number
  turn: { side: number, count: number, done: number, mine: boolean } | null
  bans: { mine: string[], theirs: string[] }
  lostBans: { mine: number, theirs: number }
  locked: { mine: boolean, theirs: boolean }
  picks: { id: string, mine: boolean, random: boolean }[]
  preselection: string | null
  ready: { mine: boolean, theirs: boolean }
  ranked: boolean
}

export interface DraftAlert {
  icon: string
  tone: 'danger' | 'menace' | 'info'
  text: string
}

export const DRAFT = {
  turns: [1, 2, 2, 2, 2, 2, 1],
  bans: 3,
  team: 6,
  seconds: { ban: 30, reveal: 2.5, pick: 30, prep: 90 },
  steps: ['Bans', 'Picks', 'Préparation', 'Combat'],
  roles: ['Attaquant', 'Tank', 'Support', 'Pivot', 'Lanceur', 'Piégeur', 'Wallbreaker'],
}

export function draftStep(phase: DraftPhase): number {
  return { ban: 0, reveal: 0, pick: 1, prep: 2, done: 3, cancelled: 3 }[phase]
}

export function turnIndex(picks: number): number {
  let total = 0
  for (const [index, count] of DRAFT.turns.entries()) {
    total += count
    if (picks < total) return index
  }
  return DRAFT.turns.length
}

export function maxSecondsLeft(view: DraftView, seconds: number): number {
  const picksLeft = DRAFT.turns.length - 1 - turnIndex(view.picks.length)
  if (view.phase === 'ban') return seconds + DRAFT.seconds.reveal + DRAFT.turns.length * DRAFT.seconds.pick + DRAFT.seconds.prep
  if (view.phase === 'reveal') return seconds + DRAFT.turns.length * DRAFT.seconds.pick + DRAFT.seconds.prep
  if (view.phase === 'pick') return seconds + picksLeft * DRAFT.seconds.pick + DRAFT.seconds.prep
  if (view.phase === 'prep') return seconds
  return 0
}

export function clock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function launchers(motCle: string) {
  return roster.pokemon.filter(p => p.roles.some(role => role.startsWith('Lanceur'))
    && plainText(`${p.talent.effet} ${roster.attaques[p.signatureId]?.effet ?? ''}`).includes(motCle))
}

export function draftArchetypes(mine: Pokemon[]) {
  const counts = new Map<string, number>()
  for (const pokemon of mine) {
    for (const archetype of pokemon.archetypes) counts.set(archetype, (counts.get(archetype) ?? 0) + 1)
  }
  const mineIds = new Set(mine.map(p => p.id))
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([nom, count]) => {
    const motCle = ARCHETYPES.find(archetype => archetype.nom === nom)?.motCle
    const launched = motCle ? launchers(motCle).some(p => mineIds.has(p.id)) : false
    return { nom, count, icon: motCle ? (launched ? '✓' : '○') : '◆', solid: launched || count >= 2 }
  })
}

export function draftAlerts(mine: Pokemon[], theirs: Pokemon[], unavailable: Set<string>, phase: DraftPhase): DraftAlert[] {
  const alerts: DraftAlert[] = []
  const mineIds = new Set(mine.map(p => p.id))
  for (const opponent of theirs) {
    if (mine.length && !opponent.contresIds.some(id => mineIds.has(id))) {
      alerts.push({ icon: '!', tone: 'danger', text: `Aucune réponse à ${opponent.nom} (contres : ${opponent.contresIds.slice(0, 3).map(id => speciesName(id)).join(', ')}).` })
    }
    for (const pokemon of mine) {
      if (pokemon.contresIds.includes(opponent.id)) alerts.push({ icon: '⚔', tone: 'menace', text: `${opponent.nom} menace ton ${pokemon.nom}.` })
    }
  }
  const archetypes = new Set(mine.flatMap(p => p.archetypes))
  for (const archetype of ARCHETYPES) {
    if (!archetype.motCle || !archetypes.has(archetype.nom as Pokemon['archetypes'][number])) continue
    const list = launchers(archetype.motCle)
    if (!list.length || !list.every(p => unavailable.has(p.id))) continue
    const planB = archetype.attaque
      ? roster.pokemon.filter(p => !unavailable.has(p.id) && p.movepool.includes(archetype.attaque!)).slice(0, 3).map(p => p.nom)
      : []
    alerts.push({
      icon: '✕',
      tone: 'danger',
      text: `Lanceur ${archetype.nom} indisponible (${list.map(p => p.nom).join(', ')}). Plan B : ${planB.join(', ') || 'aucun'}${archetype.attaque ? ` avec ${moveName(archetype.attaque)}` : ''}.`,
    })
  }
  if (phase === 'ban') {
    for (const archetype of ARCHETYPES.filter(a => ['Pluie', 'Sable', 'Neige'].includes(a.nom))) {
      const list = launchers(archetype.motCle!)
      if (list.length === 1) alerts.push({ icon: 'i', tone: 'info', text: `${list[0]!.nom} est le seul lanceur ${archetype.nom} : le bannir coupe cet archétype.` })
    }
  }
  return alerts.slice(0, 6)
}

export interface PrepChoice {
  source: 'auto' | 'def' | number
  edited: Variante | null
  save: boolean
}

export function resolvePrep(pokemon: Pokemon, choice: PrepChoice | undefined, variants: Variante[]) {
  const favorite = variants.findIndex(variant => variant.favorite)
  const source = choice?.source ?? 'auto'
  const index = source === 'auto' ? favorite : source === 'def' ? -1 : source
  const base = variants[index] ?? defaultVariant(pokemon)
  let label = 'Set par défaut'
  if (source === 'auto') label = favorite >= 0 ? '★ Favorite (auto)' : 'Set par défaut (auto)'
  else if (variants[index]) label = `${base.favorite ? '★ ' : ''}${base.nom}`
  if (choice?.edited) return { variant: choice.edited, base, label: 'Set modifié', modified: true, selected: index }
  return { variant: base, base, label, modified: false, selected: index }
}

import type { Evs, StatId } from '~/utils/showdownTeam'

/** Un Pokémon d'équipe Classique, avec les identifiants Showdown (espèce, objet, talent, attaques, nature). */
export interface ClassicSet {
  nickname: string
  species: string
  item: string
  ability: string
  moves: string[]
  nature: string
  evs: Partial<Evs>
  ivs: Partial<Evs>
  gender: '' | 'M' | 'F'
  level: number
  shiny: boolean
  teraType: string
  happiness?: number
}

export interface ClassicTeam {
  id: string
  name: string
  format: string
  sets: ClassicSet[]
  updatedAt: string
}

const STAT_ORDER: StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const STAT_NAMES: Record<string, StatId> = { hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe' }
const STAT_LABELS: Record<StatId, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' }

function emptySet(): ClassicSet {
  return { nickname: '', species: '', item: '', ability: '', moves: [], nature: '', evs: {}, ivs: {}, gender: '', level: 100, shiny: false, teraType: '' }
}

function parseStats(text: string): Partial<Evs> {
  const stats: Partial<Evs> = {}
  for (const part of text.split('/')) {
    const [value = '', name = ''] = part.trim().split(/\s+/)
    const stat = STAT_NAMES[toId(name)]
    if (stat && value) stats[stat] = Number(value)
  }
  return stats
}

/**
 * Lit une équipe au format texte de Showdown (export du teambuilder), un Pokémon par bloc.
 * Les noms anglais deviennent des identifiants Showdown.
 */
export function importTeam(text: string): ClassicSet[] {
  const sets: ClassicSet[] = []
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
    const head = lines.shift()
    if (!head) continue
    const set = emptySet()
    let [identity = '', item = ''] = head.split(' @ ')
    set.item = toId(item)
    const gender = /\((M|F)\)\s*$/.exec(identity)
    if (gender) {
      set.gender = gender[1] as 'M' | 'F'
      identity = identity.slice(0, gender.index).trim()
    }
    const nicknamed = /^(.*)\(([^()]+)\)\s*$/.exec(identity)
    if (nicknamed) {
      set.nickname = nicknamed[1]!.trim()
      set.species = toId(nicknamed[2]!)
    } else {
      set.species = toId(identity)
    }
    for (const line of lines) {
      if (line.startsWith('- ')) set.moves.push(toId(line.slice(2).replace(/\[([^\]]+)\]/, '$1')))
      else if (line.startsWith('Ability:')) set.ability = toId(line.slice(8))
      else if (line.startsWith('Level:')) set.level = Number(line.slice(6)) || 100
      else if (line.startsWith('Shiny:')) set.shiny = /yes/i.test(line)
      else if (line.startsWith('Tera Type:')) set.teraType = line.slice(10).trim()
      else if (line.startsWith('Happiness:')) set.happiness = Number(line.slice(10))
      else if (line.startsWith('EVs:')) set.evs = parseStats(line.slice(4))
      else if (line.startsWith('IVs:')) set.ivs = parseStats(line.slice(4))
      else if (/ Nature$/.test(line)) set.nature = toId(line.replace(/ Nature$/, ''))
    }
    if (set.species) sets.push(set)
  }
  return sets
}

/** Équipe au format texte de Showdown ; `names` traduit les identifiants en noms anglais (espèce, objet, attaque…). */
export function exportTeam(sets: ClassicSet[], names: (kind: 'pokemon' | 'items' | 'abilities' | 'moves', id: string) => string): string {
  return sets.map((set) => {
    const species = names('pokemon', set.species)
    const identity = set.nickname && set.nickname !== species ? `${set.nickname} (${species})` : species
    const lines = [`${identity}${set.gender ? ` (${set.gender})` : ''}${set.item ? ` @ ${names('items', set.item)}` : ''}`]
    if (set.ability) lines.push(`Ability: ${names('abilities', set.ability)}`)
    if (set.level !== 100) lines.push(`Level: ${set.level}`)
    if (set.shiny) lines.push('Shiny: Yes')
    if (set.teraType) lines.push(`Tera Type: ${set.teraType}`)
    const evs = STAT_ORDER.filter(stat => set.evs[stat]).map(stat => `${set.evs[stat]} ${STAT_LABELS[stat]}`)
    if (evs.length) lines.push(`EVs: ${evs.join(' / ')}`)
    if (set.nature) lines.push(`${set.nature.charAt(0).toUpperCase()}${set.nature.slice(1)} Nature`)
    const ivs = STAT_ORDER.filter(stat => set.ivs[stat] !== undefined && set.ivs[stat] !== 31).map(stat => `${set.ivs[stat]} ${STAT_LABELS[stat]}`)
    if (ivs.length) lines.push(`IVs: ${ivs.join(' / ')}`)
    for (const move of set.moves) lines.push(`- ${names('moves', move)}`)
    return lines.join('\n')
  }).join('\n\n')
}

/** Format compact de Showdown, celui de la commande `/utm`. */
export function packClassicTeam(sets: ClassicSet[]): string {
  return sets.map((set) => {
    const evs = STAT_ORDER.map(stat => set.evs[stat] || '').join(',')
    const ivs = STAT_ORDER.map(stat => set.ivs[stat] ?? '').join(',')
    const extra = [set.happiness ?? '', '', '', '', '', set.teraType].join(',')
    return [
      set.nickname, set.species, set.item, set.ability, set.moves.join(','), set.nature,
      evs === ',,,,,' ? '' : evs, set.gender, ivs === ',,,,,' ? '' : ivs, set.shiny ? 'S' : '',
      set.level === 100 ? '' : String(set.level), extra === ',,,,,' ? '' : extra,
    ].join('|')
  }).join(']')
}

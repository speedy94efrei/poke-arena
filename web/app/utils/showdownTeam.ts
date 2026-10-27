import type { Pokemon } from '#data/types/roster'

type StatId = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
type Evs = Record<StatId, number>

export interface TeamSet {
  nickname: string
  speciesId: string
  itemId: string
  abilityId: string
  moves: string[]
  natureId: string
  evs: Evs
}

const NATURE_PLUS: Record<string, StatId> = {
  lonely: 'atk', brave: 'atk', adamant: 'atk', naughty: 'atk', bold: 'def', relaxed: 'def', impish: 'def', lax: 'def',
  timid: 'spe', hasty: 'spe', jolly: 'spe', naive: 'spe', modest: 'spa', mild: 'spa', quiet: 'spa', rash: 'spa',
  calm: 'spd', gentle: 'spd', sassy: 'spd', careful: 'spd',
}
const STAT_ORDER: StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

export function defaultEvs(pokemon: Pokemon): Evs {
  const plus = NATURE_PLUS[pokemon.setParDefaut.natureId]
  const attack: StatId = pokemon.stats.atq >= pokemon.stats.atqSpe ? 'atk' : 'spa'
  const evs: Evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  if (plus === 'def' || plus === 'spd') {
    evs.hp = 252
    evs[plus] = 252
    evs[plus === 'def' ? 'spd' : 'def'] = 4
  } else if (plus === 'spe') {
    evs.spe = 252
    evs[attack] = 252
    evs.hp = 4
  } else {
    evs[plus ?? attack] = 252
    evs.spe = 252
    evs.hp = 4
  }
  return evs
}

export function defaultSet(pokemon: Pokemon): TeamSet {
  const set = pokemon.setParDefaut
  return {
    nickname: pokemon.nom,
    speciesId: pokemon.id,
    itemId: set.objetId,
    abilityId: pokemon.talent.id,
    moves: set.attaquesIds.filter(move => !set.horsMovepool.includes(move)),
    natureId: set.natureId,
    evs: defaultEvs(pokemon),
  }
}

export function packTeam(sets: TeamSet[]): string {
  return sets.map((set) => {
    const evs = STAT_ORDER.map(stat => set.evs[stat] || '').join(',')
    return [set.nickname, set.speciesId, set.itemId, set.abilityId, set.moves.join(','), set.natureId,
      evs === ',,,,,' ? '' : evs, '', '', '', '', ''].join('|')
  }).join(']')
}

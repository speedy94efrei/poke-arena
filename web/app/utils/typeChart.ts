import type { TypePokemon } from '#data/types/roster'

export const TYPE_COLORS: Record<TypePokemon, string> = {
  Normal: '#9fa19f', Feu: '#e62829', Eau: '#2980ef', Plante: '#3fa129', Électrik: '#fac000', Glace: '#3dcef3',
  Combat: '#ff8000', Poison: '#9141cb', Sol: '#915121', Vol: '#81b9ef', Psy: '#ef4179', Insecte: '#91a119',
  Roche: '#afa981', Spectre: '#704170', Dragon: '#5060e1', Ténèbres: '#624d4e', Acier: '#60a1b8', Fée: '#ef70ef',
}

const DARK_TEXT: TypePokemon[] = ['Électrik', 'Glace', 'Vol', 'Roche', 'Normal', 'Fée']

export function typeTextColor(type: TypePokemon): string {
  return DARK_TEXT.includes(type) ? '#1d1d1d' : '#fff'
}

const CHART: Record<TypePokemon, [TypePokemon[], TypePokemon[], TypePokemon[]]> = {
  Normal: [[], ['Roche', 'Acier'], ['Spectre']],
  Feu: [['Plante', 'Glace', 'Insecte', 'Acier'], ['Feu', 'Eau', 'Roche', 'Dragon'], []],
  Eau: [['Feu', 'Sol', 'Roche'], ['Eau', 'Plante', 'Dragon'], []],
  Électrik: [['Eau', 'Vol'], ['Électrik', 'Plante', 'Dragon'], ['Sol']],
  Plante: [['Eau', 'Sol', 'Roche'], ['Feu', 'Plante', 'Poison', 'Vol', 'Insecte', 'Dragon', 'Acier'], []],
  Glace: [['Plante', 'Sol', 'Vol', 'Dragon'], ['Feu', 'Eau', 'Glace', 'Acier'], []],
  Combat: [['Normal', 'Glace', 'Roche', 'Ténèbres', 'Acier'], ['Poison', 'Vol', 'Psy', 'Insecte', 'Fée'], ['Spectre']],
  Poison: [['Plante', 'Fée'], ['Poison', 'Sol', 'Roche', 'Spectre'], ['Acier']],
  Sol: [['Feu', 'Électrik', 'Poison', 'Roche', 'Acier'], ['Plante', 'Insecte'], ['Vol']],
  Vol: [['Plante', 'Combat', 'Insecte'], ['Électrik', 'Roche', 'Acier'], []],
  Psy: [['Combat', 'Poison'], ['Psy', 'Acier'], ['Ténèbres']],
  Insecte: [['Plante', 'Psy', 'Ténèbres'], ['Feu', 'Combat', 'Poison', 'Vol', 'Spectre', 'Acier', 'Fée'], []],
  Roche: [['Feu', 'Glace', 'Vol', 'Insecte'], ['Combat', 'Sol', 'Acier'], []],
  Spectre: [['Psy', 'Spectre'], ['Ténèbres'], ['Normal']],
  Dragon: [['Dragon'], ['Acier'], ['Fée']],
  Ténèbres: [['Psy', 'Spectre'], ['Combat', 'Ténèbres', 'Fée'], []],
  Acier: [['Glace', 'Roche', 'Fée'], ['Feu', 'Eau', 'Électrik', 'Acier'], []],
  Fée: [['Combat', 'Dragon', 'Ténèbres'], ['Feu', 'Poison', 'Acier'], []],
}

export function effectiveness(attack: TypePokemon, defenders: TypePokemon[]): number {
  const [strong, weak, immune] = CHART[attack]
  return defenders.reduce((total, defender) => {
    if (immune.includes(defender)) return 0
    if (strong.includes(defender)) return total * 2
    if (weak.includes(defender)) return total / 2
    return total
  }, 1)
}

export const TYPE_EN_TO_FR: Record<string, TypePokemon> = {
  Normal: 'Normal', Fire: 'Feu', Water: 'Eau', Grass: 'Plante', Electric: 'Électrik', Ice: 'Glace',
  Fighting: 'Combat', Poison: 'Poison', Ground: 'Sol', Flying: 'Vol', Psychic: 'Psy', Bug: 'Insecte',
  Rock: 'Roche', Ghost: 'Spectre', Dragon: 'Dragon', Dark: 'Ténèbres', Steel: 'Acier', Fairy: 'Fée',
}

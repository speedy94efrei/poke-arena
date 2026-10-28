export type TrainingMode = 'libre' | 'draft'

export interface TrainingBot {
  key: string
  name: string
  level: number
  theme?: string
  online: boolean
  battles: number
  drafting: boolean
}

export interface TrainingLevel {
  key: string
  level: number
  label: string
  color: string
  description: string
}

export interface TrainingTheme {
  key: string
  label: string
  description: string
  background: string
  pokemon: string[]
}

const FX = 'https://play.pokemonshowdown.com/fx'

/** Niveaux et thèmes des bots, dans l'ordre de la page ; les clés sont celles du serveur de combat. */
export const TRAINING = {
  levels: [
    { key: 'niveau-1', level: 1, label: 'Débutant', color: '#48a860', description: 'Attaque au hasard et ne change jamais de Pokémon. Idéal pour découvrir les types.' },
    { key: 'niveau-2', level: 2, label: 'Facile', color: '#7ab840', description: 'Choisit l\'attaque qui fait le plus de dégâts, mais ne change jamais de Pokémon.' },
    { key: 'niveau-3', level: 3, label: 'Moyen', color: '#f8a830', description: 'Change de Pokémon avant de tomber, pose les pièges, se soigne et garde la Téra pour la fin.' },
    { key: 'niveau-4', level: 4, label: 'Difficile', color: '#e86838', description: 'Prend les KO, se booste quand il est tranquille, inflige des statuts, pose la météo et anticipe tes changements.' },
    { key: 'niveau-5', level: 5, label: 'Expert', color: '#d84838', description: 'Compare chaque attaque et chaque changement avec ta meilleure riposte probable, KO compris.' },
  ] as TrainingLevel[],
  themes: [
    { key: 'pluie', label: 'Pluie', description: 'Pose la pluie avec Danse Pluie, puis frappe avec ses Pokémon Eau.', background: `url(${FX}/bg-beach.png) center/cover`, pokemon: ['lanturn', 'sharpedo', 'quaquaval'] },
    { key: 'stall', label: 'Stall', description: 'Pièges, soins et statuts : il gagne à l\'usure.', background: `url(${FX}/bg-mountain.png) center/cover`, pokemon: ['miltank', 'corviknight', 'bastiodon'] },
    { key: 'distorsion', label: 'Distorsion', description: 'Lance Distorsion, puis frappe avec des Pokémon lents et puissants.', background: `url(${FX}/bg-city.png) center/cover`, pokemon: ['musharna', 'oranguru', 'mudsdale'] },
    { key: 'hyper-offense', label: 'Hyper offense', description: 'Frappe fort dès le premier tour et se booste dès qu\'il peut.', background: `url(${FX}/bg-desert.png) center/cover`, pokemon: ['lucario', 'weavile', 'hawlucha'] },
  ] as TrainingTheme[],
  themeLevel: 4,
  defaultBot: 'niveau-3',
}

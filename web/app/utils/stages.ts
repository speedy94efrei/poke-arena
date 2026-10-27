export interface Stage {
  id: string
  nom: string
  decor: string
  plateforme?: string
  showdown?: boolean
}

type TimeOfDay = 'jour' | 'crepuscule' | 'nuit'

const SHOWDOWN_FX = 'https://play.pokemonshowdown.com/fx'
const TIMED: [string, string, string][] = [
  ['route', 'Route', 'herbe'], ['pont', 'Pont de la ville', 'chemin'], ['gymnase', 'Gymnase', 'interieur'],
  ['plaine', 'Plaine', 'herbe'], ['mer', 'Bord de mer', 'eau'], ['ville', 'Ville', 'chemin'],
  ['foret', 'Forêt', 'herbe'], ['montagne', 'Montagne', 'rocher'], ['neige', 'Montagne enneigée', 'neige'],
]
const FIXED: [string, string, string][] = [
  ['interieur-1', 'Intérieur', 'interieur'], ['interieur-2', 'Salle claire', 'interieur'], ['interieur-3', 'Salle boisée', 'interieur'],
  ['grotte-1', 'Grotte', 'grotte'], ['grotte-2', 'Grotte profonde', 'grotte'], ['grotte-3', 'Abysses', 'grotte'],
  ['aaron', 'Conseil 4 · Aaron', 'aaron'], ['terry', 'Conseil 4 · Terry', 'terry'], ['adrien', 'Conseil 4 · Adrien', 'adrien'],
  ['lucio', 'Conseil 4 · Lucio', 'lucio'], ['cynthia', 'Maîtresse · Cynthia', 'cynthia'],
  ['monde-distorsion', 'Monde Distorsion', 'monde-distorsion'], ['tour-de-combat', 'Tour de Combat', 'tour-de-combat'],
  ['usine-de-combat', 'Usine de Combat', 'usine-de-combat'], ['arcade-de-combat', 'Arcade de Combat', 'arcade-de-combat'],
  ['chateau-de-combat', 'Château de Combat', 'chateau-de-combat'], ['salle-de-combat', 'Salle de Combat', 'salle-de-combat'],
]
const SHOWDOWN: [string, string][] = [
  ['route', 'Route'], ['beach', 'Plage'], ['city', 'Ville'], ['forest', 'Forêt'], ['mountain', 'Montagne'],
  ['river', 'Rivière'], ['dampcave', 'Grotte humide'], ['icecave', 'Grotte de glace'],
]
const PLATFORM_TIMED = new Set(['herbe', 'eau', 'chemin', 'rocher', 'neige'])

export function timeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours()
  return hour >= 7 && hour < 17 ? 'jour' : hour >= 17 && hour < 21 ? 'crepuscule' : 'nuit'
}

export function stages(time: TimeOfDay = timeOfDay()): Stage[] {
  const platform = (name: string) => `/combat/plateformes/${PLATFORM_TIMED.has(name) ? `${name}-${time}` : name}`
  return [
    ...TIMED.map(([id, nom, plateforme]) => ({ id, nom, decor: `/combat/decors/${id}-${time}.png`, plateforme: platform(plateforme) })),
    ...FIXED.map(([id, nom, plateforme]) => ({ id, nom, decor: `/combat/decors/${id}.png`, plateforme: platform(plateforme) })),
    ...SHOWDOWN.map(([id, nom]) => ({ id: `showdown-${id}`, nom: `${nom} (Showdown)`, decor: `${SHOWDOWN_FX}/bg-${id}.png`, showdown: true })),
  ]
}

export function stageFor(roomid: string, choice: string, time: TimeOfDay = timeOfDay()): Stage {
  const all = stages(time)
  const chosen = all.find(stage => stage.id === choice)
  if (chosen) return chosen
  const hash = [...roomid].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7)
  return all[hash % all.length]!
}

export const FALLBACK_DECOR = `${SHOWDOWN_FX}/bg-route.png`

export type GameType = 'singles' | 'doubles' | 'triples' | 'multi' | 'freeforall'

export interface BattleFormat {
  id: string
  name: string
  section: string
  /** Équipe fournie par le serveur (Random Battle et dérivés) : rien à préparer. */
  generatedTeam: boolean
  ladder: boolean
  challenge: boolean
  tournament: boolean
  level50: boolean
  bestOf: boolean
  gameType: GameType
}

export interface FormatSection {
  name: string
  column: number
  formats: BattleFormat[]
}

const SECTION_LABELS: Record<string, string> = {
  'S/V Singles': 'Écarlate et Violet · simples',
  'S/V Doubles': 'Écarlate et Violet · doubles',
  'Unofficial Metagames': 'Métas non officielles',
  'National Dex': 'Pokédex national',
  'Pet Mods': 'Pet mods',
  'Draft': 'Draft',
  'National Dex Other Tiers': 'Pokédex national · autres tiers',
  'Randomized Metas': 'Métas aléatoires',
  'Ladder Spotlight': 'Ladder du moment',
  'Temporary Tour Metas': 'Métas de tournoi temporaires',
  'Champions': 'Pokémon Champions',
  'Other Metagames': 'Autres métas',
  'Challengeable OMs': 'Autres métas à défier',
  'Past Gens OU': 'Anciennes générations · OU',
  'Past Gens Doubles OU': 'Anciennes générations · doubles OU',
  'Sw/Sh Singles': 'Épée et Bouclier · simples',
  'Sw/Sh Doubles': 'Épée et Bouclier · doubles',
  'US/UM Singles': 'Ultra-Soleil et Ultra-Lune · simples',
  'US/UM Doubles': 'Ultra-Soleil et Ultra-Lune · doubles',
  'OR/AS Singles': 'Rubis Oméga et Saphir Alpha · simples',
  'OR/AS Doubles/Triples': 'Rubis Oméga et Saphir Alpha · doubles et triples',
  'B2/W2 Singles': 'Noir 2 et Blanc 2 · simples',
  'B2/W2 Doubles': 'Noir 2 et Blanc 2 · doubles',
  'DPP Singles': 'Diamant, Perle et Platine · simples',
  'DPP Doubles': 'Diamant, Perle et Platine · doubles',
  'Past Generations': 'Générations précédentes',
}

/** Sections propres à l'univers PokéDraft, absentes du Classique. */
const OWN_SECTIONS = ['PokéDraft']

export function sectionLabel(name: string): string {
  return SECTION_LABELS[name] ?? name
}

function gameTypeOf(name: string): GameType {
  if (/free-for-all/i.test(name)) return 'freeforall'
  if (/multi/i.test(name)) return 'multi'
  if (/triples/i.test(name)) return 'triples'
  if (/doubles|vgc|2v2|battle stadium doubles/i.test(name)) return 'doubles'
  return 'singles'
}

/**
 * Lit la ligne `|formats|` envoyée par le serveur de combat : `|,colonne|Section|[Gen 9] OU,e|…`.
 * Le code après la virgule est un champ de bits hexadécimal (1 équipe générée, 2 ladder, 4 défis, 8 tournois,
 * 16 niveau 50, 64 au meilleur des 3).
 */
export function parseFormats(payload: string): FormatSection[] {
  const sections: FormatSection[] = []
  const parts = payload.split('|')
  let column = 1
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]!
    if (!part || part.startsWith(',L')) continue
    if (part.startsWith(',')) {
      column = Number(part.slice(1)) || column
      sections.push({ name: parts[++index] ?? '', column, formats: [] })
      continue
    }
    const comma = part.lastIndexOf(',')
    const name = comma >= 0 ? part.slice(0, comma) : part
    const code = comma >= 0 ? Number.parseInt(part.slice(comma + 1), 16) || 0 : 0
    const section = sections[sections.length - 1]
    if (!section) continue
    section.formats.push({
      id: showdownId(name),
      name,
      section: section.name,
      generatedTeam: Boolean(code & 1),
      ladder: Boolean(code & 2),
      challenge: Boolean(code & 4),
      tournament: Boolean(code & 8),
      level50: Boolean(code & 16),
      bestOf: Boolean(code & 64),
      gameType: gameTypeOf(name),
    })
  }
  return sections.filter(section => section.formats.length && !OWN_SECTIONS.includes(section.name))
}

/** Nom court d'un format : « [Gen 9] OU » devient « OU · Gen 9 ». */
export function formatLabel(name: string): string {
  const match = /^\[Gen (\d+)(?: ([^\]]+))?\] (.+)$/.exec(name)
  if (!match) return name
  const [, gen, variant, rest] = match
  return `${rest} · Gen ${gen}${variant ? ` ${variant}` : ''}`
}

const FORMAT_NAMES: Record<string, string> = {
  combatbudget: 'Combat à budget', ou: 'OU', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', zu: 'ZU', lc: 'LC', ubers: 'Ubers', ubersuu: 'Ubers UU', monotype: 'Monotype',
  anythinggoes: 'Anything Goes', doublesou: 'Doubles OU', doublesubers: 'Doubles Ubers', nationaldex: 'National Dex',
  nationaldexubers: 'National Dex Ubers', nationaldexuu: 'National Dex UU', nationaldexru: 'National Dex RU', nationaldexag: 'National Dex AG',
  nationaldexmonotype: 'National Dex Monotype', nationaldexdoubles: 'National Dex Doubles', randombattle: 'Random Battle',
  randomdoublesbattle: 'Random Doubles Battle', '1v1': '1v1', '2v2doubles': '2v2 Doubles', almostanyability: 'Almost Any Ability',
  balancedhackmons: 'Balanced Hackmons', purehackmons: 'Pure Hackmons', stabmons: 'STABmons', mixandmega: 'Mix and Mega',
  godlygift: 'Godly Gift', camomons: 'Camomons', partnersincrime: 'Partners in Crime', inheritance: 'Inheritance', cap: 'CAP',
  battlestadiumsingles: 'Battle Stadium Singles', battlestadiumdoubles: 'Battle Stadium Doubles', battlespotsingles: 'Battle Spot Singles',
  battlespotdoubles: 'Battle Spot Doubles', battlespottriples: 'Battle Spot Triples', letsgoou: "Let's Go OU", bdspou: 'BDSP OU',
  tradebacksou: 'Tradebacks OU', stadiumou: 'Stadium OU', nc1997: 'Nintendo Cup 1997', nintendocup1997: 'Nintendo Cup 1997',
}

function tierName(rest: string): string {
  if (FORMAT_NAMES[rest]) return FORMAT_NAMES[rest]
  if (rest.startsWith('vgc')) return `VGC ${rest.slice(3).replace(/reg(\w)$/, (_, letter: string) => ` Règlement ${letter.toUpperCase()}`)}`
  if (rest.startsWith('champions')) return `Champions ${tierName(rest.slice(9))}`
  return rest
}

/** Libellé d'un format à partir de son seul identifiant, quand le serveur n'a pas encore envoyé la liste. */
export function formatIdLabel(id: string): string {
  const match = /^gen(\d)(.+)$/.exec(id)
  if (!match) return id
  const [, gen, rest] = match
  return `${tierName(rest!)} · Gen ${gen}`
}

export function gameTypeLabel(type: GameType): string {
  return { singles: 'Simple', doubles: 'Double', triples: 'Triple', multi: 'Multi', freeforall: 'Chacun pour soi' }[type]
}

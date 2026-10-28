/** Attaques apprises par Pokémon : celles d'Écarlate et Violet, puis le surplus du Pokédex national. */
type Learnsets = Record<string, [string[], string[]]>

let loading: Promise<Learnsets> | null = null

export function loadLearnsets(): Promise<Learnsets> {
  loading ??= import('#data/references/learnsets.json').then(module => module.default as unknown as Learnsets)
  return loading
}

/** Attaques qu'un Pokémon peut apprendre dans le format ; le Pokédex national et les anciennes générations prennent la liste élargie. */
export function learnableMoves(learnsets: Learnsets | null, species: string, baseSpecies: string | undefined, format: string): string[] {
  const entry = learnsets?.[species] ?? (baseSpecies ? learnsets?.[baseSpecies] : undefined)
  if (!entry) return []
  const wide = format.includes('nationaldex') || !format.startsWith('gen9')
  return wide ? [...entry[0], ...entry[1]] : entry[0]
}

import type { TypePokemon } from '#data/types/roster'

/** Paysages pixel art animés de Jeruu (licence CC0), un par type : le fond des cartes Pokémon. */
const HABITATS: Record<TypePokemon, string> = {
  Normal: 'normal', Feu: 'feu', Eau: 'eau', Plante: 'plante', Électrik: 'electrik', Glace: 'glace',
  Combat: 'combat', Poison: 'poison', Sol: 'sol', Vol: 'vol', Psy: 'psy', Insecte: 'insecte',
  Roche: 'roche', Spectre: 'spectre', Dragon: 'dragon', Ténèbres: 'tenebres', Acier: 'acier', Fée: 'fee',
}

const stillFrames = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Paysage d'un type ; une image fixe quand le système demande moins d'animations. */
export function habitatUrl(type: string | undefined): string | null {
  const file = type ? HABITATS[type as TypePokemon] : undefined
  if (!file) return null
  return stillFrames() ? `/habitats/fixe/${file}.webp` : `/habitats/${file}.webp`
}

/** Fond d'une carte Pokémon : le paysage animé de son premier type, sur la couleur du type pendant le chargement. */
export function habitatBackground(type: string | undefined): string {
  const color = TYPE_COLORS[type as TypePokemon] ?? '#5a6478'
  const url = habitatUrl(type)
  return url ? `url(${url}) center / cover no-repeat, ${color}` : color
}

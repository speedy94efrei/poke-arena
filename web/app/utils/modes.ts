import type { Universe } from '~/utils/navigation'

export interface GameMode {
  id: Universe
  name: string
  /** Nom court du sélecteur de mode. */
  short: string
  tagline: string
  to: string
  /** Pastille du sélecteur de mode. */
  dot: string
  /** Dégradé de la transition entre deux modes, et sa couleur d'accent. */
  light: string
  dark: string
  accent: string
  soon?: boolean
}

export const MODES: GameMode[] = [
  { id: 'classique', name: 'Classique', short: 'Classique', tagline: 'Smogon · tous les formats', to: '/classique', dot: '#4a9ad8', light: '#2f74a3', dark: '#0f2a44', accent: '#8cc8f8' },
  { id: 'pokedraft', name: 'PokéDraft', short: 'PokéDraft', tagline: 'Draft classé', to: '/pokedraft', dot: '#f0b93a', light: '#a8761a', dark: '#2a1c06', accent: '#ffd970' },
  { id: 'roguelike', name: 'Roguelike', short: 'Roguelike', tagline: 'Monte le plus haut possible', to: '/roguelike', dot: '#a77bff', light: '#5a34a8', dark: '#120a2a', accent: '#c8a8ff', soon: true },
  { id: 'route', name: 'Route des Ligues', short: 'Route', tagline: 'De Kanto à Paldea', to: '/route-des-ligues', dot: '#4cc46a', light: '#2a7a40', dark: '#0a1e14', accent: '#9ae8ae', soon: true },
  { id: 'budget', name: 'Combat à budget', short: 'Budget', tagline: '100 points · ton équipe', to: '/budget', dot: '#2fc8b8', light: '#16756c', dark: '#061a18', accent: '#7af0e2' },
]

export function modeOf(id: Universe | null): GameMode | undefined {
  return MODES.find(mode => mode.id === id)
}

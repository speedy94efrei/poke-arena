export type Universe = 'classique' | 'pokedraft'

export interface NavLink {
  label: string
  to?: string
}

export interface NavItem extends NavLink {
  icon: string
  color: string
  children?: NavLink[]
}

/** Menus des deux univers ; une entrée sans `to` est affichée « bientôt ». */
export const NAVIGATION: Record<Universe, NavItem[]> = {
  classique: [
    {
      icon: '▶', label: 'Jouer', color: '#c8362a', to: '/classique',
      children: [
        { label: 'Accueil', to: '/classique' },
        { label: 'Combat classé', to: '/classique/classe' },
        { label: 'Combat en ligne', to: '/classique/en-ligne' },
        { label: 'Entraînement' },
      ],
    },
    { icon: '✎', label: 'Équipes', color: '#6a52c0' },
    {
      icon: '✉', label: 'Communauté', color: '#8a4ac8',
      children: [{ label: 'Tournois et événements' }, { label: 'Créer un tournoi' }, { label: 'Chat et social' }],
    },
    {
      icon: '?', label: 'Apprendre', color: '#1f8a82',
      children: [{ label: 'Pokédex' }, { label: 'Méta' }, { label: 'Guide' }],
    },
    {
      icon: '●', label: 'Profil', color: '#2f6fc0',
      children: [{ label: 'Classement Elo' }],
    },
  ],
  pokedraft: [
    { icon: '◆', label: 'Accueil de saison', color: 'var(--hd)', to: '/pokedraft' },
    { icon: 'C', label: 'Codex', color: 'var(--hd)', to: '/pokedraft/codex' },
    { icon: 'A', label: 'Atelier PokéDraft', color: '#5a8a3a', to: '/pokedraft/atelier' },
    { icon: 'D', label: 'Classé · Draft', color: '#c8362a', to: '/pokedraft/draft' },
    { icon: '⚔', label: 'Combat libre et défis', color: '#3d6fc8', to: '/pokedraft/combat' },
    { icon: '★', label: 'Classement et saison', color: '#3f8fa3', to: '/pokedraft/classement' },
  ],
}

export function universeOf(path: string): Universe | null {
  if (path.startsWith('/classique')) return 'classique'
  if (path.startsWith('/pokedraft')) return 'pokedraft'
  return null
}

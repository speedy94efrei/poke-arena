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
        { label: 'Entraînement', to: '/classique/entrainement' },
      ],
    },
    {
      icon: '✎', label: 'Équipes', color: '#6a52c0', to: '/classique/equipes',
      children: [{ label: 'Mes équipes', to: '/classique/equipes' }],
    },
    {
      icon: '✉', label: 'Communauté', color: '#8a4ac8', to: '/classique/tournois',
      children: [
        { label: 'Tournois et événements', to: '/classique/tournois' },
        { label: 'Créer un tournoi', to: '/classique/tournois/creer' },
        { label: 'Chat et social', to: '/classique/chat' },
      ],
    },
    {
      icon: '?', label: 'Apprendre', color: '#1f8a82', to: '/classique/pokedex',
      children: [{ label: 'Pokédex', to: '/classique/pokedex' }, { label: 'Méta', to: '/classique/meta' }, { label: 'Guide', to: '/classique/guide' }],
    },
    {
      icon: '●', label: 'Profil', color: '#2f6fc0', to: '/classique/classement',
      children: [{ label: 'Classement Elo', to: '/classique/classement' }],
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

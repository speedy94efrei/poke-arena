export type Universe = 'classique' | 'pokedraft' | 'roguelike' | 'route' | 'budget'

export interface NavLink {
  label: string
  to?: string
}

export interface NavItem extends NavLink {
  icon: string
  color: string
  children?: NavLink[]
}

/** Menus de chaque mode ; une entrée sans `to` est affichée « bientôt ». */
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
        { label: 'Replays', to: '/classique/replays' },
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
    { icon: '▶', label: 'Replays', color: '#7a52c8', to: '/pokedraft/replays' },
  ],
  roguelike: [
    { icon: '▲', label: 'Accueil', color: '#7a52c8', to: '/roguelike' },
    { icon: '▤', label: 'Ma run', color: '#7a52c8', to: '/roguelike/run' },
    { icon: '●', label: 'Équipe', color: '#7a52c8', to: '/roguelike/equipe' },
  ],
  route: [
    { icon: '◉', label: 'Régions', color: '#2a7a40', to: '/route-des-ligues' },
    { icon: '★', label: 'Tirage du banc', color: '#2a7a40', to: '/route-des-ligues/tirage' },
    { icon: '▤', label: 'Carte de la région', color: '#2a7a40', to: '/route-des-ligues/carte' },
    { icon: '⚔', label: 'Arène', color: '#2a7a40', to: '/route-des-ligues/arene' },
    { icon: '$', label: 'Boutique', color: '#2a7a40', to: '/route-des-ligues/boutique' },
    { icon: '↑', label: 'Évolution', color: '#2a7a40', to: '/route-des-ligues/evolution' },
  ],
  budget: [
    { icon: '▶', label: 'Accueil', color: '#16756c', to: '/budget' },
    { icon: '✎', label: 'Constructeur', color: '#16756c', to: '/budget/constructeur' },
    { icon: '¤', label: 'Barème et coûts', color: '#16756c', to: '/budget/bareme' },
  ],
}

export function universeOf(path: string): Universe | null {
  if (path.startsWith('/classique')) return 'classique'
  if (path.startsWith('/pokedraft')) return 'pokedraft'
  if (path.startsWith('/roguelike')) return 'roguelike'
  if (path.startsWith('/route-des-ligues')) return 'route'
  if (path.startsWith('/budget')) return 'budget'
  return null
}

/** Couleur des menus au choix, comme les cadres de menu des jeux DS : en-têtes des panneaux et cadre du texte de combat. */
export interface MenuColor {
  id: string
  label: string
  color: string
  /** Ombre portée du texte de l'en-tête. */
  shade: string
  text: string
}

export const MENU_COLORS: MenuColor[] = [
  { id: 'bleu', label: 'Bleu', color: '#3f8fc0', shade: '#2a6a90', text: '#fff' },
  { id: 'orange', label: 'Orange', color: '#ff7a1a', shade: '#8a3a00', text: '#fff' },
  { id: 'rouge', label: 'Rouge', color: '#d84838', shade: '#8a2418', text: '#fff' },
  { id: 'rose', label: 'Rose', color: '#d8508c', shade: '#8a2a56', text: '#fff' },
  { id: 'violet', label: 'Violet', color: '#7a52c8', shade: '#48307a', text: '#fff' },
  { id: 'turquoise', label: 'Turquoise', color: '#1a9c94', shade: '#0e5c58', text: '#fff' },
  { id: 'vert', label: 'Vert', color: '#3f9a4c', shade: '#22602c', text: '#fff' },
  { id: 'jaune', label: 'Jaune', color: '#f0c020', shade: '#f8e490', text: '#2a2410' },
  { id: 'marron', label: 'Marron', color: '#a0643a', shade: '#5e3a1e', text: '#fff' },
  { id: 'gris', label: 'Gris', color: '#6a7686', shade: '#3a424e', text: '#fff' },
  { id: 'nuit', label: 'Nuit', color: '#2c3240', shade: '#0e1016', text: '#fff' },
]

/** Variables CSS d'une couleur de menu ; l'ombre du texte suit l'épaisseur du style (Gen 4 ou Gen 5). */
export function menuColorStyle(id: string, gen: '4' | '5'): string {
  const menu = MENU_COLORS.find(candidate => candidate.id === id)
  if (!menu) return ''
  const offset = gen === '4' ? '2px 2px 0' : '1px 1px 0'
  return `--hd: ${menu.color}; --hdSh: ${offset} ${menu.shade}; --hdTx: ${menu.text}; --tbB: ${menu.color};`
}

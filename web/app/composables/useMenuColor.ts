const STORAGE_KEY = 'arene-couleur-menus'

/** Couleur des menus choisie par le joueur (gardée dans le navigateur) ; vide : la couleur du style Gen 4 ou Gen 5. */
export function useMenuColor() {
  const menuColor = useState<string>('menu-color', () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? ''
      return MENU_COLORS.some(menu => menu.id === saved) ? saved : ''
    } catch {
      return ''
    }
  })

  const setMenuColor = (id: string) => {
    menuColor.value = id
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      return
    }
  }

  return { menuColor, setMenuColor }
}

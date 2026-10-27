interface DraftHover {
  id: string
  left: number
  right: number
  top: number
  bottom: number
}

export function useDraftHover() {
  const hover = useState<DraftHover | null>('draft-hover', () => null)
  return {
    hover,
    show: (event: Event, id: string) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      hover.value = { id, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    },
    hide: () => {
      hover.value = null
    },
  }
}

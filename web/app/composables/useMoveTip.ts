interface MoveTip {
  moveId: string
  pokemonId: string
  x: number
  top: number
  bottom: number
  pinned: boolean
}

export function useMoveTip() {
  const tip = useState<MoveTip | null>('move-tip', () => null)

  const place = (event: Event, moveId: string, pokemonId: string, pinned: boolean) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    tip.value = { moveId, pokemonId, x: rect.left, top: rect.top, bottom: rect.bottom, pinned }
  }

  return {
    tip,
    show: (event: Event, moveId: string, pokemonId: string) => {
      if (!tip.value?.pinned) place(event, moveId, pokemonId, false)
    },
    hide: () => {
      if (!tip.value?.pinned) tip.value = null
    },
    pin: (event: Event, moveId: string, pokemonId: string) => {
      if (tip.value?.pinned && tip.value.moveId === moveId) tip.value = null
      else place(event, moveId, pokemonId, true)
    },
    close: () => {
      tip.value = null
    },
  }
}

export type GenStyle = '4' | '5'

const STORAGE_KEY = 'arene-gen'

export function useGenStyle() {
  const gen = useState<GenStyle>('gen-style', () => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '4' ? '4' : '5'
    } catch {
      return '5'
    }
  })

  const setGen = (value: GenStyle) => {
    gen.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      return
    }
  }

  return { gen, setGen }
}

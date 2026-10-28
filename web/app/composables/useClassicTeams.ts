import type { ClassicSet, ClassicTeam } from '~/utils/classicTeam'

const STORAGE_KEY = 'arene-equipes-classique'

function load(): ClassicTeam[] {
  try {
    const teams = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ClassicTeam[]
    return Array.isArray(teams) ? teams.filter(team => team && Array.isArray(team.sets)) : []
  } catch {
    return []
  }
}

/**
 * Équipes de l'univers Classique (« Mes équipes »), gardées dans ce navigateur.
 */
export function useClassicTeams() {
  const teams = useState<ClassicTeam[]>('classic-teams', () => import.meta.client ? load() : [])

  const persist = (next: ClassicTeam[]) => {
    teams.value = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      return
    }
  }

  const save = (team: Omit<ClassicTeam, 'id' | 'updatedAt'> & { id?: string }) => {
    const entry: ClassicTeam = { ...team, id: team.id ?? crypto.randomUUID(), updatedAt: new Date().toISOString() }
    persist([entry, ...teams.value.filter(other => other.id !== entry.id)])
    return entry
  }

  return {
    teams,
    save,
    remove: (id: string) => persist(teams.value.filter(team => team.id !== id)),
    importText: (name: string, format: string, text: string): ClassicTeam | null => {
      const sets: ClassicSet[] = importTeam(text)
      return sets.length ? save({ name: name.trim() || 'Équipe importée', format, sets }) : null
    },
    forFormat: (format: string) => teams.value.filter(team => team.format === format),
    packed: (team: ClassicTeam) => packClassicTeam(team.sets),
  }
}

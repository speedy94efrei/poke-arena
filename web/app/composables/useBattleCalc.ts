import type { BattlePokemon, BattleState, SideId } from '~/utils/battleTracker'
import type { Fighter, MoveCalc, ProbableSet } from '~/utils/damageCalc'
import type { UsageData } from '~/utils/usage'

export type HelpLevel = 'debutant' | 'confirme'
export type BattleCalc = ReturnType<typeof useBattleCalc>

/** Clé d'injection : l'écran de combat crée les calculs une fois, ses panneaux les partagent. */
export const BATTLE_CALC = Symbol('battle-calc') as InjectionKey<BattleCalc>

const HELP_KEY = 'arene-aide-combat'

/** Niveau d'aide en combat : débutant (efficacité, dégâts et avertissements sur les boutons) ou confirmé (comme Showdown). */
export function useBattleHelp() {
  const help = useState<HelpLevel>('battle-help', () => {
    try {
      return localStorage.getItem(HELP_KEY) === 'confirme' ? 'confirme' : 'debutant'
    } catch {
      return 'debutant'
    }
  })
  watch(help, (value) => {
    try {
      localStorage.setItem(HELP_KEY, value)
    } catch {
      return
    }
  })
  return { help, beginner: computed(() => help.value === 'debutant') }
}

/**
 * Calculs de l'écran de combat : set supposé de chaque Pokémon adverse (statistiques Smogon du format ou fiche
 * PokéDraft), ses PV estimés, et les dégâts de chaque attaque de ton Pokémon actif avec le calculateur de Smogon.
 */
export function useBattleCalc(battle: Ref<BattleState | undefined>) {
  const usage = shallowRef<UsageData | null>(null)
  const ready = computed(() => Boolean(currentCalc() && currentPokedex()))

  onMounted(() => {
    loadCalc()
    loadPokedex()
  })

  watch(() => battle.value?.format, async (format) => {
    usage.value = format && !format.endsWith('pokedraft') ? await loadUsage(format) : null
  }, { immediate: true })

  const mySide = computed<SideId>(() => battle.value?.mySide ?? 'p1')
  const foeSide = computed<SideId>(() => mySide.value === 'p1' ? 'p2' : 'p1')

  const setOf = (pokemon: BattlePokemon): ProbableSet => probableSet(pokemon.speciesId, usage.value, Boolean(battle.value && isPokedraft(battle.value)))

  /** PV estimés d'un Pokémon adverse (≈ PV / PV max), ou `null` tant que le calculateur charge. */
  const estimate = (pokemon: BattlePokemon) => {
    const calc = currentCalc()
    if (!calc || !battle.value || !ready.value) return null
    try {
      return estimatedHp(calc, battle.value, pokemon, setOf(pokemon))
    } catch {
      return null
    }
  }

  const fighter = (pokemon: BattlePokemon, side: SideId, tera = ''): Fighter => ({
    pokemon, side, own: side === mySide.value, set: setOf(pokemon), tera: tera || pokemon.tera || '',
  })

  /** Dégâts de chaque attaque d'un de tes Pokémon sur un Pokémon adverse ; `tera` : type Téra choisi pour ce tour. */
  const movesAgainst = (attacker: BattlePokemon, defender: BattlePokemon, moveIds: string[], tera = ''): Record<string, MoveCalc | null> => {
    const calc = currentCalc()
    const current = battle.value
    if (!calc || !current || !ready.value) return {}
    const source = fighter(attacker, mySide.value, tera)
    const target = fighter(defender, foeSide.value)
    return Object.fromEntries(moveIds.map((id) => {
      try {
        return [id, calcMove(calc, current, source, target, id)]
      } catch {
        return [id, null]
      }
    }))
  }

  return { usage, ready, setOf, estimate, movesAgainst }
}

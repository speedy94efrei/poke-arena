/** Combat à budget : chaque Pokémon coûte des points selon son tier Smogon, l'équipe en a 100. Barème : `server/config/budget.ts`. */
export const BUDGET_FORMAT = 'gen9combatbudget'

export const BUDGET_POINTS = 100

/** Coût de départ de chaque tier Gen 9, du plus cher au moins cher ; `null` : interdit. */
export const BUDGET_TIERS: { tier: string, label: string, cost: number | null }[] = [
  { tier: 'OU', label: 'OU', cost: 30 },
  { tier: 'UUBL', label: 'UUBL', cost: 26 },
  { tier: 'UU', label: 'UU', cost: 22 },
  { tier: 'RUBL', label: 'RUBL', cost: 19 },
  { tier: 'RU', label: 'RU', cost: 16 },
  { tier: 'NUBL', label: 'NUBL', cost: 14 },
  { tier: 'NU', label: 'NU', cost: 12 },
  { tier: 'PUBL', label: 'PUBL', cost: 10 },
  { tier: 'PU', label: 'PU', cost: 8 },
  { tier: 'ZUBL', label: 'ZUBL', cost: 6 },
  { tier: 'ZU', label: 'ZU', cost: 5 },
  { tier: 'NFE', label: 'Non classé (sous le ZU)', cost: 3 },
  { tier: 'Uber', label: 'Uber, AG', cost: null },
]

/** Réponse du serveur de combat à `/budget` : le coût de chaque Pokémon autorisé ce mois-ci. */
export interface BudgetReply {
  type: 'costs'
  format: string
  budget: number
  /** Mois des derniers ajustements (« 2026-11 »), vide tant qu'aucun n'est publié. */
  month: string
  /** `[id, tier, coût de départ, coût du mois]`. */
  pokemon: [string, string, number, number][]
}

const BANNED_TIERS = ['Uber', 'AG', 'Illegal', 'Unreleased', 'CAP', 'CAP NFE', 'CAP LC']

/** Coût de départ d'un tier ; `null` pour les tiers interdits. */
export function tierCost(tier: string): number | null {
  const clean = tier.replace(/[()]/g, '')
  if (BANNED_TIERS.includes(clean)) return null
  return BUDGET_TIERS.find(entry => entry.tier === clean)?.cost ?? 3
}

/** Couleur du compteur de points : vert sous le budget, ambre au plus juste, rouge au-dessus. */
export function budgetTone(total: number, budget = BUDGET_POINTS): 'ok' | 'full' | 'over' {
  if (total > budget) return 'over'
  return total >= budget - 3 ? 'full' : 'ok'
}

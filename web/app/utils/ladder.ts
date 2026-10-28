export interface EloRow {
  rank: number
  name: string
  elo: number
  wins: number
  losses: number
  ties: number
}

export interface EloTier {
  name: string
  min: number
  color: string
}

/** Paliers d'Elo affichés dans le Classique ; les combats démarrent à 1 000. */
export const ELO_TIERS: EloTier[] = [
  { name: 'Poké Ball', min: 0, color: '#e84838' },
  { name: 'Super Ball', min: 1200, color: '#3a8fd6' },
  { name: 'Hyper Ball', min: 1400, color: '#f8c830' },
  { name: 'Ultra', min: 1600, color: '#c8d0dc' },
  { name: 'Master', min: 1700, color: '#9a5ad8' },
]

export function eloTier(elo: number): EloTier {
  return [...ELO_TIERS].reverse().find(tier => elo >= tier.min) ?? ELO_TIERS[0]!
}

/** Lit le tableau HTML que renvoie la requête `laddertop` du serveur : rang, pseudo, Elo, victoires, défaites, nuls. */
export function parseLadderTop(html: string): EloRow[] {
  const rows: EloRow[] = []
  const document = new DOMParser().parseFromString(html, 'text/html')
  for (const row of document.querySelectorAll('tr')) {
    const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent?.trim() ?? '')
    if (cells.length < 6) continue
    rows.push({ rank: Number(cells[0]), name: cells[1]!, elo: Number(cells[2]), wins: Number(cells[3]), losses: Number(cells[4]), ties: Number(cells[5]) })
  }
  return rows
}

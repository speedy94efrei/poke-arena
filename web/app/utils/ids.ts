export function toId(text: string): string {
  return text.normalize('NFD').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Identifiant d'un pseudo, comme toID() du serveur de combat : les lettres accentuées sont retirées. */
export function showdownId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function toId(text: string): string {
  return text.normalize('NFD').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export interface ReplayPlayer {
  slot: string
  name: string
  showdown_id: string
}

/** Un replay tel que l'API le liste : sans son journal. */
export interface ReplaySummary {
  id: string
  format: string
  format_name: string
  winner: string | null
  turns: number
  rated: boolean
  players: ReplayPlayer[]
  ended_at: string
}

export interface Replay extends ReplaySummary {
  log: string
}

/** Identifiant du replay d'une salle de combat : `battle-gen9ou-12` → `gen9ou-12`. */
export function replayIdOf(roomid: string): string {
  return roomid.replace(/^battle-/, '')
}

/** Lien vers le replay d'une salle de combat. */
export function replayLink(roomid: string): string {
  return `/replay/${replayIdOf(roomid)}`
}

/** Lignes du journal que le lecteur rejoue (les lignes vides et l'horodatage ne servent pas). */
export function replayLines(log: string): string[] {
  return log.split('\n').filter(line => line && line !== '|' && !line.startsWith('|t:|'))
}

/** Position dans le journal du début de chaque tour : `starts[n]` est la ligne juste après `|turn|n`, `starts[0]` le tout début. */
export function turnStarts(lines: string[]): number[] {
  const starts = [0]
  lines.forEach((line, index) => {
    if (line.startsWith('|turn|')) starts.push(index + 1)
  })
  return starts
}

/** Les deux camps d'un replay : « A contre B », ou « A & C contre B & D » en multi. */
export function replayTitle(players: ReplayPlayer[]): string {
  const camp = (slots: string[]) => players.filter(player => slots.includes(player.slot)).map(player => player.name).join(' & ')
  return `${camp(['p1', 'p3'])} contre ${camp(['p2', 'p4'])}`
}

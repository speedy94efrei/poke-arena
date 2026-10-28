import type { PokedexData } from '~/utils/dex'

type Kind = 'pokemon' | 'moves' | 'items' | 'abilities'
type Translate = (kind: Kind, name: string) => string

/** Messages courants du validateur de Showdown, avec les noms anglais repérés pour les traduire. */
const RULES: [RegExp, (match: RegExpExecArray, name: Translate) => string][] = [
  [/^(.+) is tagged (.+), which is banned\.$/, (m, n) => `${n('pokemon', m[1]!)} est classé ${m[2]}, un tier interdit dans ce format.`],
  [/^(.+) has no moves \(.*\)\.$/, (m, n) => `${n('pokemon', m[1]!)} n'a aucune attaque : il en faut au moins une.`],
  [/^(.+) has exactly 0 EVs/, (m, n) => `${n('pokemon', m[1]!)} n'a aucun EV. Si c'est voulu, mets 1 EV n'importe où : ses stats ne changent pas.`],
  [/^(.+) can't learn (.+)\.$/, (m, n) => `${n('pokemon', m[1]!)} ne peut pas apprendre ${n('moves', m[2]!)}.`],
  [/^(.+)'s move (.+) is banned\.$/, (m, n) => `L'attaque ${n('moves', m[2]!)} de ${n('pokemon', m[1]!)} est interdite.`],
  [/^(.+)'s item (.+) is banned\.$/, (m, n) => `L'objet ${n('items', m[2]!)} de ${n('pokemon', m[1]!)} est interdit.`],
  [/^(.+)'s ability (.+) is banned\.$/, (m, n) => `Le talent ${n('abilities', m[2]!)} de ${n('pokemon', m[1]!)} est interdit.`],
  [/^(.+) can't have (.+)\.$/, (m, n) => `${n('pokemon', m[1]!)} ne peut pas avoir ${n('abilities', m[2]!)}.`],
  [/^(.+) is banned\.$/, (m, n) => `${n('pokemon', m[1]!)} est interdit dans ce format.`],
  [/^(.+) has more than 510 total EVs\.$/, (m, n) => `${n('pokemon', m[1]!)} dépasse 510 EV au total.`],
  [/^You are limited to one of each Pokémon by Species Clause\.$/, () => 'Clause Espèce : un seul exemplaire de chaque Pokémon.'],
  [/^You are limited to one of each item by Item Clause\.$/, () => 'Clause Objet : un seul exemplaire de chaque objet.'],
  [/^You may only bring up to (\d+) Pokémon/, m => `Ce format n'accepte que ${m[1]} Pokémon au plus.`],
  [/^You must bring at least (\d+) Pokémon/, m => `Ce format demande au moins ${m[1]} Pokémon.`],
  [/^(.+) must be at most level (\d+)/, (m, n) => `${n('pokemon', m[1]!)} doit être au niveau ${m[2]} au plus.`],
  [/^(.+) is unreleased/, (m, n) => `${n('pokemon', m[1]!)} n'est pas encore disponible dans ce format.`],
]

/** Message du validateur en français ; ceux qu'on ne reconnaît pas restent tels quels. */
export function frenchValidation(message: string, dex: PokedexData | null): string {
  const name: Translate = (kind, text) => dex?.[kind][toId(text)]?.nom ?? text
  for (const [pattern, render] of RULES) {
    const match = pattern.exec(message)
    if (match) return render(match, name)
  }
  return message
}

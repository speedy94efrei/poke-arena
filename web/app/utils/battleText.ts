export const STATUS_LABELS: Record<string, { court: string, couleur: string, inflige: string, soigne: string }> = {
  brn: { court: 'BRÛ', couleur: '#e0702c', inflige: 'est brûlé', soigne: "n'est plus brûlé" },
  par: { court: 'PAR', couleur: '#d4b000', inflige: 'est paralysé', soigne: "n'est plus paralysé" },
  psn: { court: 'PSN', couleur: '#9141cb', inflige: 'est empoisonné', soigne: "n'est plus empoisonné" },
  tox: { court: 'PSN+', couleur: '#7a2fb0', inflige: 'est gravement empoisonné', soigne: "n'est plus empoisonné" },
  slp: { court: 'SOM', couleur: '#7a8a9a', inflige: "s'endort", soigne: 'se réveille' },
  frz: { court: 'GEL', couleur: '#3dbad8', inflige: 'est gelé', soigne: 'dégèle' },
}

export const STAT_LABELS: Record<string, string> = {
  atk: 'Attaque', def: 'Défense', spa: 'Attaque Spéciale', spd: 'Défense Spéciale', spe: 'Vitesse',
  accuracy: 'Précision', evasion: 'Esquive',
}

export const STAT_SHORT: Record<string, string> = {
  atk: 'Atq', def: 'Déf', spa: 'Atq Spé', spd: 'Déf Spé', spe: 'Vit', accuracy: 'Préc', evasion: 'Esq',
}

export const WEATHERS: Record<string, { nom: string, debut: string }> = {
  raindance: { nom: 'Pluie', debut: 'Il commence à pleuvoir !' },
  primordialsea: { nom: 'Pluie battante', debut: 'Une pluie battante s’abat !' },
  sunnyday: { nom: 'Soleil', debut: 'Le soleil brille fort !' },
  desolateland: { nom: 'Grand soleil', debut: 'Le soleil devient brûlant !' },
  sandstorm: { nom: 'Tempête de sable', debut: 'Une tempête de sable se lève !' },
  snow: { nom: 'Neige', debut: 'Il commence à neiger !' },
  snowscape: { nom: 'Neige', debut: 'Il commence à neiger !' },
  hail: { nom: 'Grêle', debut: 'Il commence à grêler !' },
  deltastream: { nom: 'Turbulences', debut: 'Des turbulences mystérieuses se lèvent !' },
}

export const FIELD_EFFECTS: Record<string, string> = {
  electricterrain: 'Champ Électrifié', psychicterrain: 'Champ Psychique', mistyterrain: 'Champ Brumeux',
  grassyterrain: 'Champ Herbu', trickroom: 'Distorsion', gravity: 'Gravité', magicroom: 'Zone Magique',
  wonderroom: 'Zone Étrange',
}

export const SIDE_CONDITIONS: Record<string, { nom: string, couleur: string, icone: string }> = {
  stealthrock: { nom: 'Piège de Roc', couleur: '#afa981', icone: '▲' },
  spikes: { nom: 'Picots', couleur: '#915121', icone: '✶' },
  toxicspikes: { nom: 'Pics Toxik', couleur: '#9141cb', icone: '✶' },
  stickyweb: { nom: 'Toile Gluante', couleur: '#91a119', icone: '#' },
  reflect: { nom: 'Protection', couleur: '#ef4179', icone: '▣' },
  lightscreen: { nom: 'Mur Lumière', couleur: '#ef4179', icone: '▣' },
  auroraveil: { nom: 'Voile Aurore', couleur: '#3dcef3', icone: '❄' },
  tailwind: { nom: 'Vent Arrière', couleur: '#81b9ef', icone: '»' },
  safeguard: { nom: 'Rune Protect', couleur: '#ef70ef', icone: '✚' },
  mist: { nom: 'Brume', couleur: '#9fa19f', icone: '≈' },
  murfossile: { nom: 'Mur Fossile', couleur: '#afa981', icone: '▣' },
  nuageparfume: { nom: 'Nuage Parfumé', couleur: '#ef70ef', icone: '✿' },
}

/** Effets passagers d'un Pokémon : ce que dit le journal quand ils commencent, se manifestent ou finissent. */
export const VOLATILES: Record<string, { debut: string, actif?: string, fin: string }> = {
  confusion: { debut: 'devient confus', actif: 'est confus', fin: "n'est plus confus" },
  substitute: { debut: 'crée un clone', actif: "voit son clone encaisser l'attaque", fin: 'perd son clone' },
  taunt: { debut: 'est provoqué', fin: "n'est plus provoqué" },
  encore: { debut: 'doit répéter son attaque', fin: "n'est plus obligé de répéter son attaque" },
  leechseed: { debut: 'est infecté par Vampigraine', fin: "n'est plus infecté" },
  attract: { debut: 'tombe amoureux', actif: 'est amoureux', fin: "n'est plus amoureux" },
  yawn: { debut: "commence à s'assoupir", fin: "ne s'assoupit plus" },
  focusenergy: { debut: 'se concentre', fin: 'perd sa concentration' },
  disable: { debut: 'voit une attaque bloquée', fin: 'peut de nouveau utiliser son attaque' },
  saltcure: { debut: 'est couvert de sel', fin: "n'est plus couvert de sel" },
}

export function boostVerb(amount: number): string {
  const size = Math.abs(amount)
  if (amount > 0) return size >= 3 ? 'augmente énormément' : size === 2 ? 'augmente beaucoup' : 'augmente'
  return size >= 3 ? 'baisse énormément' : size === 2 ? 'baisse beaucoup' : 'baisse'
}

export function effectName(effect: string): string {
  const [kind, ...rest] = effect.split(': ')
  const name = rest.length ? rest.join(': ') : kind ?? ''
  if (kind === 'move') return moveName(name)
  if (kind === 'ability') return abilityName(name)
  if (kind === 'item') return itemName(name)
  const id = toId(name)
  return WEATHERS[id]?.nom ?? FIELD_EFFECTS[id] ?? SIDE_CONDITIONS[id]?.nom ?? STATUS_LABELS[id]?.court
    ?? findMove(id)?.nom ?? abilityName(name)
}

export function causeText(tags: string[]): string {
  const from = tags.find(tag => tag.startsWith('[from]'))
  if (!from) return ''
  const effect = from.slice(6).trim()
  const id = toId(effect.replace(/^(item|ability|move): /, ''))
  if (id === 'brn') return ' à cause de sa brûlure'
  if (id === 'psn' || id === 'tox') return ' à cause du poison'
  if (id === 'recoil') return ' à cause du contrecoup'
  if (id === 'stealthrock') return ' à cause du Piège de Roc'
  if (id === 'spikes') return ' à cause des Picots'
  if (id === 'sandstorm') return ' à cause de la tempête de sable'
  if (id === 'leechseed') return ' à cause de Vampigraine'
  if (id === 'drain') return ' en drainant son adversaire'
  if (id === 'confusion') return ' en se blessant dans sa confusion'
  return ` (${effectName(effect)})`
}

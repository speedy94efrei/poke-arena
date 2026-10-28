import type { PokedexData } from '~/utils/dex'
import type { UsageData, UsagePokemon } from '~/utils/usage'

export interface AssistantReply {
  text: string
  team?: string[]
}

type Style = 'rain' | 'sun' | 'sand' | 'snow' | 'trickroom' | 'stall' | 'offense' | 'balance' | 'voltturn'

interface StyleRule {
  label: string
  keywords: RegExp
  setters?: string[]
  abusers?: string[]
  types?: string[]
}

const TEAM_SIZE = 6

/** Styles d'équipe reconnus : mots-clés de la demande, talents qui posent le terrain et talents ou types qui en profitent. */
const STYLES: Record<Style, StyleRule> = {
  rain: { label: 'Pluie', keywords: /pluie|rain/, setters: ['drizzle'], abusers: ['swiftswim', 'raindish', 'dryskin', 'hydration'], types: ['Eau'] },
  sun: { label: 'Soleil', keywords: /soleil|sun/, setters: ['drought', 'orichalcumpulse'], abusers: ['chlorophyll', 'solarpower', 'protosynthesis', 'flowergift'], types: ['Feu', 'Plante'] },
  sand: { label: 'Sable', keywords: /sable|sand/, setters: ['sandstream'], abusers: ['sandrush', 'sandforce', 'sandveil'], types: ['Roche', 'Sol', 'Acier'] },
  snow: { label: 'Neige', keywords: /neige|grele|snow|hail/, setters: ['snowwarning'], abusers: ['slushrush', 'icebody', 'snowcloak'], types: ['Glace'] },
  trickroom: { label: 'Distorsion', keywords: /distorsion|trick ?room/ },
  stall: { label: 'Stall', keywords: /stall|defensi|tank|usure/ },
  offense: { label: 'Hyper offense', keywords: /hyper|offensi|agressi|\bho\b|attaque/ },
  balance: { label: 'Balance', keywords: /balance|equilibr/ },
  voltturn: { label: 'Volt-Turn', keywords: /volt|pivot|demi-tour|u-?turn/ },
}

const RECOVERY = ['recover', 'roost', 'slackoff', 'softboiled', 'moonlight', 'morningsun', 'synthesis', 'shoreup', 'strengthsap', 'wish', 'rest']
const SETUP = ['swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'quiverdance', 'shellsmash', 'bulkup', 'tidyup', 'victorydance', 'agility', 'bellydrum']
const PIVOTS = ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport', 'chillyreception', 'shedtail']

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Pokémon nommé dans la demande (nom français ou anglais), le plus long d'abord pour éviter les faux positifs. */
function mentionedPokemon(text: string, dex: PokedexData): string | null {
  const query = ` ${normalize(text)} `
  let best: { id: string, length: number } | null = null
  for (const [id, entry] of Object.entries(dex.pokemon)) {
    for (const name of [entry.nom, entry.name]) {
      const needle = normalize(name)
      if (needle.length >= 3 && query.includes(needle) && (!best || needle.length > best.length)) best = { id, length: needle.length }
    }
  }
  return best?.id ?? null
}

function moves(entry: UsagePokemon) {
  return entry.moves.map(([move]) => move)
}

/** Note d'un Pokémon du format pour un style : plus il en profite, plus elle est haute ; l'usage départage. */
function styleScore(style: Style, entry: UsagePokemon, dex: PokedexData): number {
  const species = dex.pokemon[entry.id]
  if (!species) return -1
  const abilities = entry.abilities.map(([ability]) => ability)
  const rule = STYLES[style]
  const offense = Math.max(species.stats.atk, species.stats.spa)
  const bulk = species.stats.hp + (species.stats.def + species.stats.spd) / 2
  let score = entry.usage
  if (rule.abusers?.some(ability => abilities.includes(ability))) score += 2
  if (rule.types?.some(type => species.types.includes(type as never))) score += 0.6
  if (style === 'trickroom') score += (moves(entry).includes('trickroom') ? 1.5 : 0) + (species.stats.spe <= 60 && offense >= 100 ? 1.5 : 0)
  if (style === 'stall') score += (moves(entry).some(move => RECOVERY.includes(move)) ? 1 : 0) + bulk / 250
  if (style === 'offense') score += (moves(entry).some(move => SETUP.includes(move)) ? 1 : 0) + (offense + species.stats.spe) / 250
  if (style === 'voltturn') score += moves(entry).some(move => PIVOTS.includes(move)) ? 1.5 : 0
  if (style === 'balance') score += (bulk / 250 + offense / 150) / 2
  return score
}

function fill(team: string[], usage: UsageData) {
  for (const entry of usage.pokemon) {
    if (team.length >= TEAM_SIZE) break
    if (!team.includes(entry.id)) team.push(entry.id)
  }
  return team
}

const names = (ids: string[], dex: PokedexData) => ids.map(id => dex.pokemon[id]?.nom ?? id).join(', ')

/**
 * Réponse de l'assistant d'équipe : une équipe autour d'un Pokémon nommé, ou dans un style d'équipe officiel,
 * à partir des statistiques Smogon du format.
 */
export function assistantReply(text: string, usage: UsageData | null, dex: PokedexData | null, formatName: string): AssistantReply {
  if (!dex) return { text: 'Je charge encore le Pokédex, réessaie dans un instant.' }
  if (!usage) return { text: `Je n'ai pas de statistiques Smogon pour ${formatName} : ajoute tes Pokémon à la main, je regarderai les faiblesses avec toi.` }
  const query = normalize(text)
  const style = (Object.keys(STYLES) as Style[]).find(key => STYLES[key].keywords.test(query))
  const pokemon = mentionedPokemon(text, dex)

  if (pokemon && !style) {
    const entry = usage.pokemon.find(candidate => candidate.id === pokemon)
    const mates = (entry?.teammates ?? []).map(([id]) => id).filter(id => id !== pokemon && usage.pokemon.some(candidate => candidate.id === id))
    const team = fill([pokemon, ...mates].slice(0, TEAM_SIZE), usage)
    return {
      text: entry
        ? `Autour de ${dex.pokemon[pokemon]!.nom} : ses coéquipiers les plus fréquents en ${formatName} sont ${names(mates.slice(0, 5), dex) || 'peu nombreux'}. Je complète avec les plus joués.`
        : `${dex.pokemon[pokemon]!.nom} est rare en ${formatName} : je lui associe les Pokémon les plus joués du format.`,
      team,
    }
  }

  if (style) {
    const rule = STYLES[style]
    const team: string[] = []
    let setterId = ''
    if (pokemon) team.push(pokemon)
    if (rule.setters) {
      const setter = usage.pokemon.find(entry => entry.abilities.some(([ability]) => rule.setters!.includes(ability)))
        ?? Object.entries(dex.pokemon).filter(([, species]) => !species.nonstandard && species.abilities.some(ability => rule.setters!.includes(toId(ability)))).map(([id]) => ({ id }))[0]
      if (!setter) return { text: `Aucun Pokémon ne pose ${rule.label.toLowerCase()} en ${formatName} : ce style n'y est pas jouable.` }
      setterId = setter.id
      if (!team.includes(setter.id)) team.push(setter.id)
    }
    const ranked = [...usage.pokemon].sort((a, b) => styleScore(style, b, dex) - styleScore(style, a, dex))
    for (const entry of ranked) {
      if (team.length >= TEAM_SIZE) break
      if (!team.includes(entry.id)) team.push(entry.id)
    }
    const share = usage.styles.find(([tag]) => tag === style || (style === 'snow' && tag === 'hail') || (style === 'offense' && tag === 'hyperoffense'))
    return {
      text: `Une équipe ${rule.label} pour ${formatName}${share ? `, un style joué par ${percent(share[1])} des équipes` : ''} : ${names(team, dex)}.${setterId ? ` ${dex.pokemon[setterId]?.nom ?? setterId} pose le terrain.` : ''}`,
      team: fill(team, usage),
    }
  }

  return { text: 'Dis-moi un Pokémon (« Construis autour de Dracolosse ») ou un style : pluie, soleil, sable, neige, Distorsion, stall, offensif, balance, volt-turn.' }
}

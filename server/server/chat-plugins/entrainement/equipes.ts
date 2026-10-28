/**
 * Les bots d'entraînement, leurs équipes de combat libre et leurs choix de draft (bans et picks).
 * Les bots à thème piochent d'abord dans un archétype du roster et posent eux-mêmes leur terrain.
 */
import { Dex } from '../../../sim/dex';
import type { Archetype, Pokemon as RosterPokemon, Roster } from '../../../../data/types/roster';
import { FORMAT, MAX_BANS, TEAM_SIZE, defaultSet } from '../pokedraft';
import type { Level } from './ia';

export interface BotProfile {
	key: string;
	name: string;
	level: Level;
	theme?: Archetype;
}

export const BOTS: BotProfile[] = [
	{ key: 'niveau-1', name: 'Bot Niveau 1', level: 1 },
	{ key: 'niveau-2', name: 'Bot Niveau 2', level: 2 },
	{ key: 'niveau-3', name: 'Bot Niveau 3', level: 3 },
	{ key: 'niveau-4', name: 'Bot Niveau 4', level: 4 },
	{ key: 'niveau-5', name: 'Bot Niveau 5', level: 5 },
	{ key: 'pluie', name: 'Bot Pluie', level: 4, theme: 'Pluie' },
	{ key: 'stall', name: 'Bot Stall', level: 4, theme: 'Stall' },
	{ key: 'distorsion', name: 'Bot Distorsion', level: 4, theme: 'Distorsion' },
	{ key: 'hyper-offense', name: 'Bot Hyper Offense', level: 4, theme: 'Hyper offense' },
];

/** Attaque de terrain qu'un bot à thème donne à ses Pokémon qui l'apprennent, s'il n'en a pas déjà deux. */
const THEME_FIELD: { [theme: string]: string } = {
	Pluie: 'raindance', Soleil: 'sunnyday', Sable: 'sandstorm', Neige: 'snowscape', Distorsion: 'trickroom',
};
const FIELD_SETTERS = 2;
/** Un bot à thème prend tous les Pokémon de son archétype avant de compléter avec les autres. */
const THEME_BONUS = 10;
/** Part de hasard dans les choix, par niveau : de pur hasard à presque toujours le meilleur. */
const NOISE: { [level in Level]: number } = { 1: Infinity, 2: Infinity, 3: 1.5, 4: 0.8, 5: 0.4 };

type Random = () => number;

const dex = Dex.forFormat(FORMAT);
const TYPES = dex.types.names();

function typesOf(pokemon: RosterPokemon) {
	return dex.species.get(pokemon.id).types;
}

function weaknesses(pokemon: RosterPokemon) {
	const types = typesOf(pokemon);
	return TYPES.filter(type => dex.getImmunity(type, types) && dex.getEffectiveness(type, types) > 0);
}

function shuffle<T>(list: T[], random: Random) {
	return list.map(value => ({ value, key: random() })).sort((a, b) => a.key - b.key).map(entry => entry.value);
}

/** Intérêt d'un Pokémon pour une équipe : sa puissance, les types qu'il ajoute, les faiblesses qu'il cumule, le thème. */
function fitness(pokemon: RosterPokemon, team: RosterPokemon[], profile: BotProfile, random: Random) {
	const teamTypes = new Set(team.flatMap(typesOf));
	const added = typesOf(pokemon).filter(type => !teamTypes.has(type)).length;
	const stacked = weaknesses(pokemon).filter(type => team.filter(member => weaknesses(member).includes(type)).length >= 2).length;
	const themed = profile.theme && pokemon.archetypes.includes(profile.theme) ? THEME_BONUS : 0;
	return pokemon.stats.total / 100 + 0.4 * added - 0.8 * stacked + themed + random() * NOISE[profile.level];
}

function choose(candidates: RosterPokemon[], team: RosterPokemon[], profile: BotProfile, random: Random) {
	if (!Number.isFinite(NOISE[profile.level])) return candidates[Math.floor(random() * candidates.length)];
	return candidates
		.map(pokemon => ({ pokemon, score: fitness(pokemon, team, profile, random) }))
		.reduce((best, entry) => entry.score > best.score ? entry : best).pokemon;
}

export function teamFor(profile: BotProfile, roster: Roster, random: Random = Math.random): PokemonSet[] {
	const team: RosterPokemon[] = [];
	const pool = [...roster.pokemon];
	while (team.length < TEAM_SIZE && pool.length) {
		const chosen = choose(pool, team, profile, random);
		team.push(chosen);
		pool.splice(pool.indexOf(chosen), 1);
	}
	return setsFor(profile, team);
}

/** Sets par défaut des fiches ; un bot à thème y ajoute son attaque de terrain et met un poseur en tête. */
export function setsFor(profile: BotProfile, team: RosterPokemon[]): PokemonSet[] {
	const sets = team.map(defaultSet);
	const field = profile.theme ? THEME_FIELD[profile.theme] : undefined;
	if (!field) return sets;
	let setters = sets.filter(set => set.moves.includes(field)).length;
	for (const [index, set] of sets.entries()) {
		if (setters >= FIELD_SETTERS) break;
		if (set.moves.includes(field) || !team[index].movepool.includes(field)) continue;
		set.moves = [...set.moves.slice(0, 3), field];
		setters++;
	}
	const lead = sets.findIndex(set => set.moves.includes(field));
	return lead > 0 ? [sets[lead], ...sets.filter((_, index) => index !== lead)] : sets;
}

export function bansFor(profile: BotProfile, roster: Roster, random: Random = Math.random): string[] {
	const candidates = roster.pokemon.filter(pokemon => !profile.theme || !pokemon.archetypes.includes(profile.theme));
	if (!Number.isFinite(NOISE[profile.level])) return shuffle(candidates, random).slice(0, MAX_BANS).map(pokemon => pokemon.id);
	return candidates
		.map(pokemon => ({ pokemon, score: pokemon.stats.total / 100 + random() * NOISE[profile.level] }))
		.sort((a, b) => b.score - a.score)
		.slice(0, MAX_BANS)
		.map(entry => entry.pokemon.id);
}

export function pickFor(profile: BotProfile, roster: Roster, available: string[], mine: string[], random: Random = Math.random): string {
	const byId = new Map(roster.pokemon.map(pokemon => [pokemon.id, pokemon]));
	const team = mine.map(id => byId.get(id)).filter((pokemon): pokemon is RosterPokemon => Boolean(pokemon));
	const candidates = available.map(id => byId.get(id)).filter((pokemon): pokemon is RosterPokemon => Boolean(pokemon));
	return choose(candidates, team, profile, random).id;
}

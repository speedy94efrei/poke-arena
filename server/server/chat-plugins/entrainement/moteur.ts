/**
 * Moteur de simulation de l'IA : chaque option du bot est rejouée dans une copie du combat, avec le vrai
 * simulateur, contre chaque riposte probable de l'adversaire, puis l'état obtenu est noté. Talents, objets,
 * attaques propres au format, priorités, météo et pièges sont donc appliqués exactement, quel que soit le format.
 * L'adversaire est reconstruit à partir de ce que le bot a vu (aperçu des équipes, attaques et objets révélés,
 * PV et statuts affichés) ; ses sets supposés sont fournis par l'appelant : le bot ne lit jamais l'équipe cachée.
 */
import { Battle } from '../../../sim/battle';
import { Dex, toID } from '../../../sim/dex';
import { Teams } from '../../../sim/teams';
import type { Pokemon } from '../../../sim/pokemon';
import type { Side } from '../../../sim/side';

export interface SeenPokemon {
	species: string;
	hp: number;
	status: string;
	moves: string[];
	/** Objet révélé, `''` s'il a été perdu, `null` s'il est inconnu. */
	item: string | null;
	tera: string | null;
	active: boolean;
}

export interface SideView {
	team: SeenPokemon[];
	boosts: SparseBoostsTable;
	hazards: { [id: string]: number };
	teraUsed: boolean;
}

export interface SearchInput {
	format: string;
	me: SideID;
	turn: number;
	ourSets: PokemonSet[];
	/** Sets supposés de l'adversaire, dans l'ordre de `theirs.team`. */
	theirSets: PokemonSet[];
	ours: SideView;
	theirs: SideView;
	options: { moves: string[], canTera: boolean, switches: string[] };
	field: { weather: string, weatherTurns: number, terrain: string, terrainTurns: number, trickRoom: number };
}

export interface OptionChoice {
	kind: 'move' | 'switch';
	id: string;
	tera: boolean;
}

export interface OptionView extends OptionChoice {
	score: number;
	worst: OptionChoice;
	worstScore: number;
	chosen: boolean;
}

export interface Analysis {
	turn: number;
	simulations: number;
	ms: number;
	options: OptionView[];
}

/** Poids de l'évaluation d'une position : un Pokémon vivant vaut ALIVE + HP × sa part de PV. */
export const WEIGHTS = {
	alive: 0.5,
	hp: 1,
	worstCase: 0.5,
	boost: { main: 0.08, spe: 0.06, bulk: 0.04 },
	status: { brn: 0.15, brnPhysical: 0.3, par: 0.15, tox: 0.2, psn: 0.1, slp: 0.25, frz: 0.3 } as { [status: string]: number },
	hazards: { stealthrock: 0.05, spikes: 0.04, toxicspikes: 0.03, stickyweb: 0.02 } as { [hazard: string]: number },
	maxResponses: 8,
};

const BOOST_CAP = 4;

/** Corrige un set supposé avec ce que le bot a vu : attaques et objet révélés, type Téra. */
export function reconcileSet(base: PokemonSet, seen: SeenPokemon): PokemonSet {
	return {
		...base,
		moves: [...new Set([...seen.moves, ...base.moves.map(toID)])].slice(0, 4),
		item: seen.item ?? base.item,
		...(seen.tera ? { teraType: seen.tera } : {}),
	};
}

function activeFirst<T extends { seen: SeenPokemon }>(team: T[]) {
	return [...team].sort((a, b) => Number(b.seen.active) - Number(a.seen.active));
}

function setStatus(battle: Battle, pokemon: Pokemon, status: string) {
	pokemon.status = status as ID;
	pokemon.statusState = battle.initEffectState({ id: status, target: pokemon });
	if (status === 'slp') {
		pokemon.statusState.startTime = 2;
		pokemon.statusState.time = 2;
	}
	if (status === 'tox') pokemon.statusState.stage = 0;
}

function inject(battle: Battle, side: Side, view: SideView, order: SeenPokemon[]) {
	side.pokemon.forEach((pokemon, index) => {
		const seen = order[index];
		if (!seen) return;
		if (seen.hp <= 0) {
			pokemon.hp = 0;
			pokemon.fainted = true;
			pokemon.status = 'fnt' as ID;
			pokemon.switchFlag = false;
			side.pokemonLeft--;
			return;
		}
		pokemon.hp = Math.max(1, Math.min(pokemon.maxhp, Math.round(pokemon.maxhp * seen.hp)));
		setStatus(battle, pokemon, seen.status && seen.status !== 'fnt' ? seen.status : '');
		if (seen.tera) {
			pokemon.teraType = seen.tera;
			battle.actions.terastallize(pokemon);
		}
	});
	if (view.teraUsed) for (const pokemon of side.pokemon) pokemon.canTerastallize = null;
	const active = side.active[0];
	if (active) active.boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, ...view.boosts };
	for (const [hazard, layers] of Object.entries(view.hazards)) {
		for (let layer = 0; layer < layers; layer++) side.addSideCondition(hazard, 'debug');
	}
}

/** Copie du combat dans l'état vu par le bot, prête à recevoir les choix du tour. */
export function buildBattle(input: SearchInput) {
	const foe: SideID = input.me === 'p1' ? 'p2' : 'p1';
	const ours = activeFirst(input.ours.team.map(seen => ({
		seen, set: input.ourSets.find(set => toID(set.species) === seen.species),
	})).filter((entry): entry is { seen: SeenPokemon, set: PokemonSet } => Boolean(entry.set)));
	const theirs = activeFirst(input.theirs.team.map((seen, index) => ({ seen, set: reconcileSet(input.theirSets[index], seen) })));
	const battle = new Battle({ formatid: toID(input.format), seed: '1,2,3,4' });
	battle.setPlayer(input.me, { name: 'bot', team: Teams.pack(ours.map(entry => entry.set)) });
	battle.setPlayer(foe, { name: 'adversaire', team: Teams.pack(theirs.map(entry => entry.set)) });
	if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default');

	inject(battle, battle.getSide(input.me), input.ours, ours.map(entry => entry.seen));
	inject(battle, battle.getSide(foe), input.theirs, theirs.map(entry => entry.seen));
	const { field } = battle;
	field.clearWeather();
	if (input.field.weather) {
		field.setWeather(input.field.weather, 'debug');
		if (field.weather) field.weatherState.duration = input.field.weatherTurns;
	}
	field.clearTerrain();
	if (input.field.terrain) {
		field.setTerrain(input.field.terrain, 'debug');
		if (field.terrain) field.terrainState.duration = input.field.terrainTurns;
	}
	if (input.field.trickRoom > 0) {
		if (!field.pseudoWeather['trickroom']) field.addPseudoWeather('trickroom', 'debug');
		const trickRoom = field.pseudoWeather['trickroom'];
		if (trickRoom) trickRoom.duration = input.field.trickRoom;
	}
	return { battle, foe };
}

/** Hasard figé : jet de dégâts moyen, pas de coup critique, les effets à 50 % ou plus se produisent. */
function freezeRandom(battle: Battle, me: SideID, missOurs: boolean) {
	battle.random = (m?: number, n?: number) => {
		if (m === undefined) return 0.5;
		if (n === undefined) return Math.floor((m - 1) / 2);
		return Math.floor((m + n - 1) / 2);
	};
	battle.randomChance = (numerator: number, denominator: number) => {
		if (missOurs && denominator === 100 && numerator < 100 && battle.activePokemon?.side.id === me) return false;
		return numerator * 2 >= denominator;
	};
}

function boostValue(pokemon: Pokemon) {
	const clamp = (value = 0) => Math.max(-BOOST_CAP, Math.min(BOOST_CAP, value));
	const main = pokemon.storedStats.atk >= pokemon.storedStats.spa ? 'atk' : 'spa';
	return WEIGHTS.boost.main * clamp(pokemon.boosts[main]) + WEIGHTS.boost.spe * clamp(pokemon.boosts.spe) +
		WEIGHTS.boost.bulk * (clamp(pokemon.boosts.def) + clamp(pokemon.boosts.spd)) / 2;
}

function sideValue(side: Side) {
	let total = 0;
	let benched = 0;
	for (const pokemon of side.pokemon) {
		if (pokemon.fainted || !pokemon.hp) continue;
		let value = WEIGHTS.alive + WEIGHTS.hp * pokemon.hp / pokemon.maxhp;
		const physical = pokemon.storedStats.atk > pokemon.storedStats.spa;
		value -= pokemon.status === 'brn' && physical ? WEIGHTS.status.brnPhysical : WEIGHTS.status[pokemon.status] ?? 0;
		if (pokemon.isActive) value += boostValue(pokemon);
		else benched++;
		total += value;
	}
	for (const [hazard, weight] of Object.entries(WEIGHTS.hazards)) {
		const condition = side.sideConditions[hazard];
		if (condition) total -= weight * (condition.layers ?? 1) * benched;
	}
	return total;
}

/** Valeur de la position pour le bot : ce qu'il lui reste moins ce qu'il reste à l'adversaire. */
export function evaluate(battle: Battle, me: SideID) {
	const side = battle.getSide(me);
	return sideValue(side) - sideValue(side.foe);
}

function command(option: OptionChoice, side: Side) {
	if (option.kind === 'switch') {
		const slot = side.pokemon.findIndex(pokemon => pokemon.species.id === option.id || toID(pokemon.set.species) === option.id);
		return `switch ${slot + 1}`;
	}
	return `move ${option.id}${option.tera ? ' terastallize' : ''}`;
}

function simulate(json: string, input: SearchInput, foe: SideID, ours: OptionChoice, theirs: OptionChoice, missOurs: boolean) {
	const battle = Battle.fromJSON(json);
	freezeRandom(battle, input.me, missOurs);
	const mySide = battle.getSide(input.me);
	if (!battle.choose(input.me, command(ours, mySide))) return null;
	if (!battle.choose(foe, command(theirs, battle.getSide(foe)))) return null;
	return evaluate(battle, input.me);
}

function accuracyOf(option: OptionChoice, format: string) {
	if (option.kind !== 'move') return 1;
	const accuracy = Dex.forFormat(format).moves.get(option.id).accuracy;
	return accuracy === true ? 1 : accuracy / 100;
}

/** Choisit l'option qui maximise un mélange de la pire riposte et de la riposte moyenne. */
export function search(input: SearchInput, random: () => number = Math.random): { best: OptionChoice, analysis: Analysis } {
	const started = Date.now();
	const { battle, foe } = buildBattle(input);
	const json = JSON.stringify(battle.toJSON());
	const dex = Dex.forFormat(input.format);

	const ours: OptionChoice[] = [];
	for (const id of input.options.moves) {
		ours.push({ kind: 'move', id, tera: false });
		if (input.options.canTera && dex.moves.get(id).category !== 'Status') ours.push({ kind: 'move', id, tera: true });
	}
	for (const id of input.options.switches) ours.push({ kind: 'switch', id, tera: false });

	const theirSide = battle.getSide(foe);
	const theirActive = theirSide.active[0];
	const theirs: OptionChoice[] = [
		...(theirActive?.moveSlots ?? []).map(slot => ({ kind: 'move' as const, id: slot.id, tera: false })),
		...theirSide.pokemon.filter(pokemon => !pokemon.isActive && !pokemon.fainted && pokemon.hp)
			.map(pokemon => ({ kind: 'switch' as const, id: pokemon.species.id, tera: false })),
	].slice(0, WEIGHTS.maxResponses);

	let simulations = 0;
	const options: OptionView[] = [];
	for (const option of ours) {
		const accuracy = accuracyOf(option, input.format);
		let worst: { choice: OptionChoice, value: number } | null = null;
		let sum = 0;
		let count = 0;
		for (const response of theirs) {
			const hit = simulate(json, input, foe, option, response, false);
			simulations++;
			if (hit === null) continue;
			let value = hit;
			if (accuracy < 1) {
				const miss = simulate(json, input, foe, option, response, true);
				simulations++;
				if (miss !== null) value = accuracy * hit + (1 - accuracy) * miss;
			}
			sum += value;
			count++;
			if (!worst || value < worst.value) worst = { choice: response, value };
		}
		if (!worst || !count) continue;
		const score = WEIGHTS.worstCase * worst.value + (1 - WEIGHTS.worstCase) * sum / count;
		options.push({ ...option, score, worst: worst.choice, worstScore: worst.value, chosen: false });
	}
	if (!options.length) throw new Error("Aucune option jouable dans la simulation.");
	options.sort((a, b) => b.score - a.score);
	const top = options.filter(option => option.score >= options[0].score - 0.005);
	const best = top[Math.floor(random() * top.length)];
	best.chosen = true;
	return {
		best: { kind: best.kind, id: best.id, tera: best.tera },
		analysis: { turn: input.turn, simulations, ms: Date.now() - started, options },
	};
}

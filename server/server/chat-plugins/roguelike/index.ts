/**
 * Roguelike à étages : des runs courtes contre l'IA des bots d'entraînement, en solo ou en coop à deux (combats
 * multi : deux joueurs contre deux IA). Tout est calculé ici ; le site envoie seulement les choix du joueur par
 * `/roguelike action <json>` et reçoit l'état de sa run par `|roguelike|<json>`. Les runs sont gardées dans
 * config/roguelike.json après chaque étape : une run se reprend plus tard, et un combat interrompu par un
 * redémarrage du serveur se relance.
 */
import * as crypto from 'crypto';
import { FS } from '../../../lib';
import { Teams } from '../../../sim/teams';
import type { Pokemon as RosterPokemon, Roster } from '../../../../data/types/roster';
import { loadRoster } from '../pokedraft';
import { Training } from '../entrainement';
import { finalConditions, type Condition } from './journal';
import {
	DUO_FORMAT, LEVEL, MAX_TEAM, ROGUE_FORMAT, bossRule, bossTheme, doorsFor, floorKind, hasDoors, mysteryFor, planFloor,
	rewardsFor, shopFor, startDraw, startSets, tokensFor, weeklyEnd, weeklySeed,
	type DoorKind, type FloorPlan, type MysteryEvent, type RewardOption, type ShopOffer,
} from './generateur';

const DATA_PATH = 'config/roguelike.json';
const INVITE_TTL = 5 * 60_000;
const LEADERBOARD_SIZE = 10;
const NATURES = Dex.natures.all().map(nature => nature.id as string);

type Mode = 'libre' | 'semaine';
type Phase = 'depart' | 'combat' | 'recompense' | 'porte' | 'boutique' | 'pension' | 'mystere' | 'fin';

interface Member {
	species: string;
	set: PokemonSet;
	/** Attaques apprises par CT : le joueur peut les remettre dans son set hors combat. */
	learned: string[];
	hp: number;
	status: string;
}

interface Player {
	id: ID;
	name: string;
	team: Member[];
	bag: string[];
	lost: { species: string, floor: number }[];
	recruited: number;
	/** Tirage de départ : 3 Pokémon, tant que le joueur n'a pas gardé le sien. */
	draw: string[];
	rewards: { options: RewardOption[], picks: number } | null;
	/** Prêt à combattre (coop), ou fini avec la boutique, la pension ou l'événement en cours. */
	ready: boolean;
	pensionUsed: boolean;
	mysteryDone: boolean;
}

interface Run {
	id: string;
	mode: Mode;
	duo: boolean;
	seed: string;
	floor: number;
	phase: Phase;
	players: Player[];
	tokens: number;
	turns: number;
	wins: number;
	/** Le prochain étage est un combat d'élite (porte choisie). */
	elite: boolean;
	doors: [DoorKind, DoorKind] | null;
	shop: { offers: ShopOffer[], bought: number[] } | null;
	mystery: MysteryEvent | null;
	battle: { roomid: string, plan: FloorPlan } | null;
	/** Étages gagnés, pour la tour : les boss y gardent leur thème et leurs Pokémon. */
	cleared: { floor: number, kind: string, theme: string | null, species: string[] }[];
	history: { floor: number, icon: string, text: string }[];
	result: { text: string } | null;
	createdAt: number;
	updatedAt: number;
}

interface Score {
	names: string[];
	floor: number;
	turns: number;
}

interface Store {
	runs: { [id: string]: Run };
	records: { [user: string]: { libre: number, runs: number, semaine: number, duo: number } };
	/** Défis de la semaine, par seed : le meilleur essai de chaque joueur (ou duo). */
	weekly: { [seed: string]: { solo: { [key: string]: Score }, duo: { [key: string]: Score } } };
}

class RoguelikeError extends Error {}

function hpCode(member: Member) {
	return `${member.hp}${member.status}`;
}

export const Roguelike = new class {
	store: Store = { runs: {}, records: {}, weekly: {} };
	roster: Roster = loadRoster();
	byId = new Map<string, RosterPokemon>();
	/** Invitations en coop : la personne invitée, puis qui l'invite et pour quel mode. */
	invites = new Map<ID, { from: ID, name: string, mode: Mode, expires: number }>();

	constructor() {
		this.byId = new Map(this.roster.pokemon.map(pokemon => [pokemon.id, pokemon]));
		this.load();
	}

	load() {
		const data = JSON.parse(FS(DATA_PATH).readIfExistsSync() || '{}');
		this.store = { runs: data.runs ?? {}, records: data.records ?? {}, weekly: data.weekly ?? {} };
		for (const run of Object.values(this.store.runs)) {
			if (run.battle && !Rooms.get(run.battle.roomid)) {
				run.battle = null;
				for (const player of run.players) player.ready = false;
			}
		}
	}

	save() {
		FS(DATA_PATH).writeUpdate(() => JSON.stringify(this.store));
	}

	/** La run en cours d'un joueur, ou la dernière terminée, qu'il voit jusqu'à en lancer une autre. */
	runOf(user: ID) {
		const runs = Object.values(this.store.runs).filter(run => run.players.some(player => player.id === user));
		return runs.find(run => run.phase !== 'fin') ?? runs.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
	}

	activeRun(user: ID) {
		const run = this.runOf(user);
		return run && run.phase !== 'fin' ? run : null;
	}

	player(run: Run, user: ID) {
		const player = run.players.find(entry => entry.id === user);
		if (!player) throw new RoguelikeError("Tu ne joues pas dans cette run.");
		return player;
	}

	member(player: Player, species: string) {
		const member = player.team.find(entry => entry.species === species);
		if (!member) throw new RoguelikeError("Ce Pokémon n'est pas dans ton équipe.");
		return member;
	}

	pokemon(species: string) {
		const pokemon = this.byId.get(species);
		if (!pokemon) throw new RoguelikeError('Pokémon inconnu.');
		return pokemon;
	}

	maxTeam(run: Run) {
		return run.duo ? MAX_TEAM.duo : MAX_TEAM.solo;
	}

	log(run: Run, icon: string, text: string) {
		run.history.push({ floor: run.floor, icon, text });
	}

	newPlayer(id: ID, name: string, seed: string, index: number): Player {
		return {
			id, name, team: [], bag: [], lost: [], recruited: 0, draw: startDraw(this.roster, seed, index).map(pokemon => pokemon.id),
			rewards: null, ready: false, pensionUsed: false, mysteryDone: false,
		};
	}

	/** Nouvelle run : seed au hasard en run libre, celle de la semaine pour le défi. Une seule run en cours par joueur. */
	create(users: User[], mode: Mode) {
		for (const user of users) {
			if (this.activeRun(user.id)) throw new RoguelikeError(`${user.name} a déjà une run en cours : il faut d'abord l'abandonner.`);
		}
		for (const user of users) {
			for (const [id, run] of Object.entries(this.store.runs)) {
				if (run.phase === 'fin' && run.players.some(player => player.id === user.id)) delete this.store.runs[id];
			}
		}
		const seed = mode === 'semaine' ? weeklySeed() : `libre-${crypto.randomBytes(6).toString('hex')}`;
		const run: Run = {
			id: crypto.randomBytes(6).toString('hex'), mode, duo: users.length > 1, seed, floor: 1, phase: 'depart',
			players: users.map((user, index) => this.newPlayer(user.id, user.name, seed, index)),
			tokens: 0, turns: 0, wins: 0, elite: false, doors: null, shop: null, mystery: null, battle: null,
			cleared: [], history: [], result: null, createdAt: Date.now(), updatedAt: Date.now(),
		};
		this.store.runs[run.id] = run;
		this.touch(run);
		return run;
	}

	/** Garde un des 3 Pokémon du tirage, avec l'un de ses deux sets. */
	start(run: Run, user: ID, species: string, choice: number) {
		if (run.phase !== 'depart') throw new RoguelikeError("Le départ est déjà fait.");
		const player = this.player(run, user);
		if (player.team.length) throw new RoguelikeError("Tu as déjà choisi ton Pokémon.");
		if (!player.draw.includes(species)) throw new RoguelikeError("Ce Pokémon n'est pas dans ton tirage.");
		const option = startSets(this.pokemon(species))[choice];
		if (!option) throw new RoguelikeError('Set inconnu.');
		player.team.push({ species, set: option.set, learned: [], hp: 100, status: '' });
		player.draw = [];
		this.log(run, '●', `${player.name} part avec ${this.pokemon(species).nom}`);
		if (run.players.every(entry => entry.team.length)) run.phase = 'combat';
		this.touch(run);
	}

	/** Lance le combat de l'étage. En coop, il démarre quand les deux joueurs sont prêts. */
	fight(run: Run, user: ID) {
		if (run.phase !== 'combat') throw new RoguelikeError("Ce n'est pas le moment de combattre.");
		if (run.battle) throw new RoguelikeError('Le combat est déjà lancé.');
		this.player(run, user).ready = true;
		if (run.players.some(player => !player.ready)) {
			this.touch(run);
			return null;
		}
		const users = run.players.map(player => Users.get(player.id));
		if (users.some(entry => !entry?.connected)) {
			for (const player of run.players) player.ready = false;
			throw new RoguelikeError('Les deux joueurs doivent être connectés au serveur de combat.');
		}
		const plan = planFloor(this.roster, run.seed, run.floor, run.players.map(player => player.team.length), run.elite, this.maxTeam(run));
		const bots = Training.availableBots(run.players.length, plan.theme ?? undefined);
		if (bots.length < run.players.length) {
			for (const player of run.players) player.ready = false;
			throw new RoguelikeError("Les bots ne sont pas connectés : réessaie dans un instant.");
		}
		const rules: string[] = [];
		if (run.players.some(player => player.team.some(member => member.hp < 100 || member.status))) {
			rules.push(`Roguelike PV = ${run.players.map(player => player.team.map(hpCode).join('.')).join('/')}`);
		}
		if (plan.rule) rules.push(`Roguelike Boss = ${plan.rule}`);
		if (plan.bonus) rules.push(`Roguelike Bonus = ${plan.bonus}`);
		const format = (run.duo ? DUO_FORMAT : ROGUE_FORMAT) + (rules.length ? `@@@${rules.join(',')}` : '');
		const players = run.players.flatMap((player, index) => [
			{ user: users[index]!, team: Teams.pack(player.team.map(member => member.set)) },
			{ user: bots[index], team: Teams.pack(plan.teams[index]) },
		]);
		const room = Rooms.createBattle({ format, players, rated: false });
		for (const player of run.players) player.ready = false;
		if (!room) throw new RoguelikeError("Le combat n'a pas pu démarrer.");
		Training.imposed.set(room.roomid, { level: plan.level, multi: run.duo });
		run.battle = { roomid: room.roomid, plan };
		this.touch(run);
		return room.roomid;
	}

	/** Fin d'un combat : PV et statuts relus dans le journal, Pokémon K.O. perdus, puis récompenses ou fin de run. */
	battleEnded(roomid: string, winner: ID, turns: number, lines: string[]) {
		const run = Object.values(this.store.runs).find(entry => entry.battle?.roomid === roomid);
		if (!run?.battle) return;
		const plan = run.battle.plan;
		run.battle = null;
		run.turns += turns;
		run.players.forEach((player, index) => {
			const side = `p${index * 2 + 1}`;
			const start = new Map<string, Condition>(player.team.map(member => [member.set.name, { hp: member.hp, status: member.status }]));
			const end = finalConditions(lines, side, start);
			for (const member of [...player.team]) {
				const condition = end.get(member.set.name);
				if (!condition) continue;
				member.hp = condition.hp;
				member.status = condition.status;
				if (member.hp > 0) continue;
				player.team.splice(player.team.indexOf(member), 1);
				player.lost.push({ species: member.species, floor: run.floor });
				this.log(run, '✕', `${this.pokemon(member.species).nom} K.O. : perdu pour la run`);
			}
		});
		const victory = run.players.some(player => player.id === winner);
		const label = this.floorLabel(plan);
		if (!victory) {
			this.end(run, `Défaite à l'étage ${run.floor} contre ${label}`);
			return;
		}
		const emptied = run.players.find(player => !player.team.length);
		if (emptied) {
			this.end(run, `${emptied.name} n'a plus de Pokémon après l'étage ${run.floor}`);
			return;
		}
		const boss = plan.kind !== 'combat';
		run.wins++;
		run.tokens += tokensFor(run.floor, boss || plan.elite);
		run.cleared.push({ floor: run.floor, kind: plan.elite ? 'elite' : plan.kind, theme: plan.theme, species: plan.teams.flat().map(set => set.species) });
		if (boss) this.log(run, plan.kind === 'grosboss' ? '♛' : '☠', `${label} battu`);
		run.elite = false;
		run.players.forEach((player, index) => {
			player.rewards = {
				options: rewardsFor(this.roster, run.seed, run.floor, index, plan.teams[index] ?? [], player.team.map(member => ({ species: member.species, moves: [...member.set.moves, ...member.learned] })), plan.kind === 'grosboss'),
				picks: boss || plan.elite ? 2 : 1,
			};
		});
		run.phase = 'recompense';
		this.touch(run);
	}

	floorLabel(plan: FloorPlan) {
		if (plan.kind === 'combat') return plan.elite ? "une équipe d'élite" : 'une équipe générée';
		const theme = plan.theme === 'Monotype' ? `monotype ${plan.type}` : plan.theme;
		return `${plan.kind === 'grosboss' ? 'le gros boss' : 'le boss'} ${theme}`;
	}

	/** Récompenses choisies : un index par choix, avec le Pokémon à relâcher, ou celui qui apprend la CT. */
	reward(run: Run, user: ID, choices: { index: number, release?: string, member?: string, replace?: string }[]) {
		if (run.phase !== 'recompense') throw new RoguelikeError("Pas de récompense à choisir.");
		const player = this.player(run, user);
		if (!player.rewards) throw new RoguelikeError('Tu as déjà choisi.');
		const { options, picks } = player.rewards;
		const indexes = new Set(choices.map(choice => choice.index));
		if (indexes.size !== Math.min(picks, options.length) || [...indexes].some(index => !options[index])) {
			throw new RoguelikeError(picks > 1 ? `Choisis ${picks} récompenses différentes.` : 'Choisis une récompense.');
		}
		for (const choice of choices) this.applyReward(run, player, options[choice.index], choice);
		player.rewards = null;
		if (run.players.every(entry => !entry.rewards)) this.nextFloor(run);
		this.touch(run);
	}

	applyReward(run: Run, player: Player, option: RewardOption, choice: { release?: string, member?: string, replace?: string }) {
		if (option.kind === 'recrue') {
			this.recruit(run, player, option.species, option.set, choice.release);
		} else if (option.kind === 'objet') {
			player.bag.push(option.item);
		} else if (option.kind === 'ct') {
			this.teach(player, option.move, option.members, choice.member, choice.replace);
		} else {
			run.tokens += option.amount;
		}
	}

	recruit(run: Run, player: Player, species: string, set: PokemonSet, release?: string) {
		if (player.team.some(member => member.species === species)) throw new RoguelikeError('Ce Pokémon est déjà dans ton équipe.');
		if (player.team.length >= this.maxTeam(run)) {
			if (!release) throw new RoguelikeError(`Équipe complète : choisis un Pokémon à relâcher.`);
			const freed = this.member(player, release);
			if (freed.set.item) player.bag.push(freed.set.item);
			player.team.splice(player.team.indexOf(freed), 1);
			this.log(run, '↩', `${player.name} relâche ${this.pokemon(release).nom}`);
		}
		player.team.push({ species, set: { ...set, level: LEVEL }, learned: [], hp: 100, status: '' });
		player.recruited++;
		this.log(run, '+', `${player.name} recrute ${this.pokemon(species).nom}`);
	}

	/** CT : l'attaque rejoint les attaques apprises, et remplace une attaque du set si le joueur en choisit une. */
	teach(player: Player, move: string, compatible: string[], species?: string, replace?: string) {
		if (!species || !compatible.includes(species)) throw new RoguelikeError('Choisis un Pokémon compatible avec la CT.');
		const member = this.member(player, species);
		if (!member.learned.includes(move)) member.learned.push(move);
		if (member.set.moves.length < 4) {
			member.set.moves.push(move);
		} else if (replace) {
			const slot = member.set.moves.indexOf(replace);
			if (slot < 0) throw new RoguelikeError("Cette attaque n'est pas dans son set.");
			member.learned.push(replace);
			member.set.moves[slot] = move;
			member.learned = member.learned.filter(entry => entry !== move);
		}
	}

	/** Étage suivant : des portes après les étages 2, 4, 7, 9…, sinon directement le combat. */
	nextFloor(run: Run) {
		const cleared = run.floor;
		run.floor++;
		if (hasDoors(cleared)) {
			run.doors = doorsFor(run.seed, cleared);
			run.phase = 'porte';
		} else {
			run.phase = 'combat';
		}
	}

	door(run: Run, user: ID, index: number) {
		if (run.phase !== 'porte' || !run.doors) throw new RoguelikeError("Pas de porte à choisir.");
		const player = this.player(run, user);
		const kind = run.doors[index];
		if (!kind) throw new RoguelikeError('Porte inconnue.');
		run.doors = null;
		for (const entry of run.players) entry.ready = false;
		const owned = run.players.flatMap(entry => entry.team.map(member => ({ species: member.species, moves: [...member.set.moves, ...member.learned] })));
		if (kind === 'centre') {
			for (const member of run.players.flatMap(entry => entry.team)) {
				member.hp = 100;
				member.status = '';
			}
			this.log(run, '✚', 'Centre Pokémon : équipe soignée');
			run.phase = 'combat';
		} else if (kind === 'boutique') {
			run.shop = { offers: shopFor(this.roster, run.seed, run.floor, owned), bought: [] };
			run.phase = 'boutique';
		} else if (kind === 'elite') {
			run.elite = true;
			this.log(run, '★', `${player.name} ouvre la porte du combat d'élite`);
			run.phase = 'combat';
		} else if (kind === 'pension') {
			for (const entry of run.players) entry.pensionUsed = false;
			run.phase = 'pension';
		} else {
			run.mystery = mysteryFor(this.roster, run.seed, run.floor, owned.map(member => member.species));
			for (const entry of run.players) entry.mysteryDone = false;
			if (run.mystery.kind === 'piege') {
				for (const member of run.players.flatMap(entry => entry.team)) member.hp = Math.max(1, member.hp - run.mystery.damage);
				this.log(run, '?', `Événement mystère : un piège blesse l'équipe (−${run.mystery.damage} %)`);
			} else if (run.mystery.kind === 'maudit') {
				for (const entry of run.players) entry.bag.push(run.mystery.item);
				this.log(run, '?', `Événement mystère : un objet maudit rejoint le sac`);
			}
			run.phase = 'mystere';
		}
		this.touch(run);
	}

	buy(run: Run, user: ID, index: number, species?: string, replace?: string) {
		if (run.phase !== 'boutique' || !run.shop) throw new RoguelikeError("La boutique est fermée.");
		const offer = run.shop.offers[index];
		if (!offer) throw new RoguelikeError('Article inconnu.');
		if (run.shop.bought.includes(index)) throw new RoguelikeError('Déjà acheté.');
		if (run.tokens < offer.price) throw new RoguelikeError('Pas assez de jetons.');
		const player = this.player(run, user);
		if (offer.kind === 'ct') this.teach(player, offer.id, offer.members ?? [], species, replace);
		else player.bag.push(offer.id);
		run.tokens -= offer.price;
		run.shop.bought.push(index);
		this.touch(run);
	}

	/** Pension : nature et attaques d'un Pokémon, parmi tout son movepool (son talent reste celui de sa fiche). */
	pension(run: Run, user: ID, species: string, nature: string, moves: string[]) {
		if (run.phase !== 'pension') throw new RoguelikeError("La pension est fermée.");
		const player = this.player(run, user);
		if (player.pensionUsed) throw new RoguelikeError('Tu as déjà réglé un Pokémon à la pension.');
		const member = this.member(player, species);
		const pool = new Set([...this.pokemon(species).movepool, ...member.learned, ...member.set.moves]);
		const unique: string[] = [...new Set(moves.map(toID))];
		if (!unique.length || unique.length > 4 || unique.some(move => !pool.has(move))) throw new RoguelikeError('Choisis 1 à 4 attaques de son movepool.');
		if (!NATURES.includes(toID(nature))) throw new RoguelikeError('Nature inconnue.');
		member.learned = [...new Set([...member.learned, ...member.set.moves])].filter(move => !unique.includes(move));
		member.set.moves = unique;
		member.set.nature = toID(nature);
		player.pensionUsed = true;
		this.log(run, '⌂', `${player.name} règle ${this.pokemon(species).nom} à la pension`);
		this.touch(run);
	}

	/** Événement mystère avec un Pokémon rare : le recruter, ou passer. */
	mystery(run: Run, user: ID, accept: boolean, release?: string) {
		if (run.phase !== 'mystere' || run.mystery?.kind !== 'recrue') throw new RoguelikeError('Rien à décider.');
		const player = this.player(run, user);
		if (player.mysteryDone) throw new RoguelikeError('Tu as déjà décidé.');
		if (accept) this.recruit(run, player, run.mystery.species, run.mystery.set, release);
		player.mysteryDone = true;
		this.touch(run);
	}

	/** Fin de la boutique, de la pension ou de l'événement : le combat suivant, quand tous les joueurs ont fini. */
	done(run: Run, user: ID) {
		if (!['boutique', 'pension', 'mystere'].includes(run.phase)) throw new RoguelikeError('Rien à terminer.');
		this.player(run, user).ready = true;
		if (run.players.every(player => player.ready)) {
			for (const player of run.players) player.ready = false;
			run.shop = null;
			run.mystery = null;
			run.phase = 'combat';
		}
		this.touch(run);
	}

	/** Objet tenu, hors combat : il vient du sac, et l'ancien y retourne. */
	equip(run: Run, user: ID, species: string, item: string) {
		if (run.battle || run.phase === 'fin') throw new RoguelikeError('Les objets se changent hors combat.');
		const player = this.player(run, user);
		const member = this.member(player, species);
		if (item && !player.bag.includes(item)) throw new RoguelikeError("Cet objet n'est pas dans ton sac.");
		if (item) player.bag.splice(player.bag.indexOf(item), 1);
		if (member.set.item) player.bag.push(member.set.item);
		member.set.item = item;
		this.touch(run);
	}

	/** Attaques du set, parmi celles qu'il connaît déjà (son set et ses CT). */
	moves(run: Run, user: ID, species: string, moves: string[]) {
		if (run.battle || run.phase === 'fin') throw new RoguelikeError('Les attaques se changent hors combat.');
		const member = this.member(this.player(run, user), species);
		const known = new Set([...member.set.moves, ...member.learned]);
		const unique: string[] = [...new Set(moves.map(toID))];
		if (!unique.length || unique.length > 4 || unique.some(move => !known.has(move))) throw new RoguelikeError('Choisis 1 à 4 attaques qu\'il connaît.');
		member.learned = [...known].filter(move => !unique.includes(move));
		member.set.moves = unique;
		this.touch(run);
	}

	abandon(run: Run, user: ID) {
		if (run.phase === 'fin') throw new RoguelikeError('La run est déjà terminée.');
		const player = this.player(run, user);
		if (run.battle) Rooms.get(run.battle.roomid)?.battle?.forfeit(Users.get(user)!, ' a abandonné la run.');
		this.end(run, `${player.name} abandonne à l'étage ${run.floor}`);
	}

	/** Fin de run : records personnels, et classement du défi de la semaine (meilleur étage, puis moins de tours). */
	end(run: Run, text: string) {
		run.phase = 'fin';
		run.battle = null;
		run.result = { text };
		this.log(run, '✕', text);
		for (const player of run.players) {
			const record = this.store.records[player.id] ??= { libre: 0, runs: 0, semaine: 0, duo: 0 };
			record.runs++;
			const key = run.duo ? 'duo' : run.mode;
			record[key] = Math.max(record[key], run.floor);
		}
		if (run.mode === 'semaine') {
			const board = this.store.weekly[run.seed] ??= { solo: {}, duo: {} };
			const scores = run.duo ? board.duo : board.solo;
			const key = run.players.map(player => player.id).sort().join('+');
			const previous = scores[key];
			if (!previous || run.floor > previous.floor || (run.floor === previous.floor && run.turns < previous.turns)) {
				scores[key] = { names: run.players.map(player => player.name), floor: run.floor, turns: run.turns };
			}
		}
		this.touch(run);
	}

	touch(run: Run) {
		run.updatedAt = Date.now();
		this.save();
		for (const player of run.players) {
			const user = Users.get(player.id);
			if (user) this.send(user);
		}
	}

	leaderboard(seed: string, duo: boolean, me: ID) {
		const scores = Object.entries(this.store.weekly[seed]?.[duo ? 'duo' : 'solo'] ?? {})
			.sort(([, a], [, b]) => b.floor - a.floor || a.turns - b.turns)
			.map(([key, score], index) => ({ rank: index + 1, mine: key.split('+').includes(me), ...score }));
		return { top: scores.slice(0, LEADERBOARD_SIZE), mine: scores.find(score => score.mine) ?? null, count: scores.length };
	}

	/** La tour autour de l'étage en cours : les étages gagnés, celui en cours, et les prochains avec leurs boss. */
	tower(run: Run) {
		const floors = [];
		for (let floor = Math.max(1, run.floor - 4); floor <= run.floor + 5; floor++) {
			const kind = floorKind(floor);
			const cleared = run.cleared.find(entry => entry.floor === floor);
			const theme = kind === 'combat' ? null : bossTheme(run.seed, floor);
			floors.push({
				floor, kind, theme, rule: kind === 'grosboss' ? bossRule(run.seed, floor) : null,
				state: cleared ? 'gagne' : floor === run.floor ? 'en-cours' : floor < run.floor ? 'gagne' : 'a-venir',
				species: cleared?.species.slice(0, 6) ?? [],
			});
		}
		return floors;
	}

	view(run: Run, user: ID) {
		const index = run.players.findIndex(player => player.id === user);
		const plan = run.phase === 'combat' && !run.battle ?
			planFloor(this.roster, run.seed, run.floor, run.players.map(player => player.team.length), run.elite, this.maxTeam(run)) :
			run.battle?.plan ?? null;
		return {
			id: run.id, mode: run.mode, duo: run.duo, seed: run.seed, floor: run.floor, phase: run.phase, me: index,
			tokens: run.tokens, turns: run.turns, wins: run.wins, elite: run.elite, maxTeam: this.maxTeam(run),
			doors: run.doors, shop: run.shop, mystery: run.mystery, battle: run.battle?.roomid ?? null,
			next: plan && {
				kind: plan.kind, elite: plan.elite, theme: plan.theme, type: plan.type, rule: plan.rule, level: plan.level, bonus: plan.bonus,
				sizes: plan.teams.map(team => team.length),
			},
			tower: this.tower(run),
			players: run.players.map(player => ({
				id: player.id, name: player.name, ready: player.ready, recruited: player.recruited, lost: player.lost, bag: player.bag,
				pensionUsed: player.pensionUsed, mysteryDone: player.mysteryDone,
				team: player.team.map(member => ({
					species: member.species, hp: member.hp, status: member.status, learned: member.learned,
					item: member.set.item, ability: member.set.ability, nature: member.set.nature, moves: member.set.moves,
				})),
				draw: player.draw.map(species => ({
					species, sets: startSets(this.pokemon(species)).map(option => ({
						label: option.label, item: option.set.item, nature: option.set.nature, moves: option.set.moves, evs: option.set.evs,
					})),
				})),
				rewards: player.rewards,
			})),
			history: run.history,
			result: run.result,
		};
	}

	send(user: User, error?: string) {
		const run = this.runOf(user.id);
		const seed = weeklySeed();
		const invite = this.invites.get(user.id);
		const sent = [...this.invites].find(([, entry]) => entry.from === user.id);
		user.send(`|roguelike|${JSON.stringify({
			type: 'state',
			run: run ? this.view(run, user.id) : null,
			records: this.store.records[user.id] ?? { libre: 0, runs: 0, semaine: 0, duo: 0 },
			weekly: { seed, endsAt: weeklyEnd(), solo: this.leaderboard(seed, false, user.id), duo: this.leaderboard(seed, true, user.id) },
			invite: invite && invite.expires > Date.now() ? { from: invite.name, mode: invite.mode } : null,
			sent: sent && sent[1].expires > Date.now() ? { to: Users.get(sent[0])?.name ?? sent[0], mode: sent[1].mode } : null,
			bots: Training.availableBots(2).length,
			error,
		})}`);
	}

	invite(user: User, name: string, mode: Mode) {
		const partner = Users.get(name);
		if (!partner?.connected) throw new RoguelikeError("Ce joueur n'est pas connecté au serveur de combat.");
		if (partner.id === user.id) throw new RoguelikeError('Invite quelqu\'un d\'autre que toi.');
		if (Training.isReserved(partner.name)) throw new RoguelikeError('Les bots ne jouent pas en coop.');
		if (this.activeRun(user.id)) throw new RoguelikeError('Tu as déjà une run en cours.');
		if (this.activeRun(partner.id)) throw new RoguelikeError(`${partner.name} a déjà une run en cours.`);
		for (const [id, entry] of this.invites) if (entry.from === user.id) this.invites.delete(id);
		this.invites.set(partner.id, { from: user.id, name: user.name, mode, expires: Date.now() + INVITE_TTL });
		this.send(partner);
	}

	accept(user: User) {
		const invite = this.invites.get(user.id);
		if (!invite || invite.expires < Date.now()) throw new RoguelikeError("L'invitation a expiré.");
		const host = Users.get(invite.from);
		if (!host?.connected) throw new RoguelikeError(`${invite.name} n'est plus connecté.`);
		this.invites.delete(user.id);
		return this.create([host, user], invite.mode);
	}

	decline(user: User) {
		const invite = this.invites.get(user.id);
		this.invites.delete(user.id);
		const host = invite && Users.get(invite.from);
		if (host) this.send(host);
	}

	cancelInvite(user: User) {
		for (const [id, entry] of this.invites) {
			if (entry.from !== user.id) continue;
			this.invites.delete(id);
			const partner = Users.get(id);
			if (partner) this.send(partner);
		}
	}

	/** Une action du site : `{ "type": "…", … }`. */
	act(user: User, action: { [key: string]: any }) {
		const mode: Mode = action.mode === 'semaine' ? 'semaine' : 'libre';
		switch (action.type) {
		case 'nouvelle': return void this.create([user], mode);
		case 'inviter': return void this.invite(user, String(action.pseudo ?? ''), mode);
		case 'accepter': return void this.accept(user);
		case 'refuser': return void this.decline(user);
		case 'annuler': return void this.cancelInvite(user);
		}
		const run = this.activeRun(user.id);
		if (!run) throw new RoguelikeError("Tu n'as pas de run en cours.");
		switch (action.type) {
		case 'depart': return void this.start(run, user.id, toID(action.species), Number(action.set) || 0);
		case 'combattre': {
			const roomid = this.fight(run, user.id);
			if (roomid) {
				for (const player of run.players) Users.get(player.id)?.send(`|roguelike|${JSON.stringify({ type: 'battle', roomid })}`);
			}
			return;
		}
		case 'recompense': return void this.reward(run, user.id, Array.isArray(action.choix) ? action.choix : []);
		case 'porte': return void this.door(run, user.id, Number(action.index));
		case 'acheter': return void this.buy(run, user.id, Number(action.index), action.member, action.replace);
		case 'pension': return void this.pension(run, user.id, toID(action.species), String(action.nature ?? ''), Array.isArray(action.moves) ? action.moves : []);
		case 'mystere': return void this.mystery(run, user.id, Boolean(action.accepter), action.release);
		case 'terminer': return void this.done(run, user.id);
		case 'objet': return void this.equip(run, user.id, toID(action.species), toID(action.item ?? ''));
		case 'attaques': return void this.moves(run, user.id, toID(action.species), Array.isArray(action.moves) ? action.moves : []);
		case 'abandonner': return void this.abandon(run, user.id);
		}
		throw new RoguelikeError('Action inconnue.');
	}
};

export const commands: Chat.ChatCommands = {
	roguelike: {
		''(target, room, user) {
			Roguelike.send(user);
		},
		action(target, room, user) {
			let action: { [key: string]: any } = {};
			try {
				action = JSON.parse(target);
			} catch {
				return Roguelike.send(user, 'Action illisible.');
			}
			try {
				Roguelike.act(user, action);
				Roguelike.send(user);
			} catch (error) {
				if (!(error instanceof RoguelikeError)) throw error;
				Roguelike.send(user, error.message);
			}
		},
	},
};

export const handlers: Chat.Handlers = {
	onBattleEnd(battle, winner) {
		Roguelike.battleEnded(battle.roomid, winner, battle.turn ?? 0, battle.room.log.log);
	},
};

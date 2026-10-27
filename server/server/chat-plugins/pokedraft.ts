/**
 * Draft classé PokéDraft : bans simultanés, picks en serpent, préparation des sets, puis combat.
 * Le site parle à ce plugin par la commande /pokedraft et reçoit l'état par des lignes |pokedraft|<json>.
 */
import { FS } from '../../lib';
import { Teams } from '../../sim/teams';
import { TeamValidator } from '../../sim/team-validator';
import type { Pokemon as RosterPokemon, Roster } from '../../../data/types/roster';

export type Side = 0 | 1;
export type Phase = 'ban' | 'reveal' | 'pick' | 'prep' | 'done' | 'cancelled';

export const FORMAT = 'gen9pokedraft';
export const ROSTER_PATH = '../data/rosters/roster-saison-1.json';
export const MAX_BANS = 3;
export const TEAM_SIZE = 6;
export const TURNS: [Side, number][] = [[0, 1], [1, 2], [0, 2], [1, 2], [0, 2], [1, 2], [0, 1]];
export const DURATIONS = { ban: 30_000, reveal: 2_500, pick: 30_000, prep: 90_000 };

const NATURE_PLUS: { [nature: string]: StatID } = {
	lonely: 'atk', brave: 'atk', adamant: 'atk', naughty: 'atk', bold: 'def', relaxed: 'def', impish: 'def', lax: 'def',
	timid: 'spe', hasty: 'spe', jolly: 'spe', naive: 'spe', modest: 'spa', mild: 'spa', quiet: 'spa', rash: 'spa',
	calm: 'spd', gentle: 'spd', sassy: 'spd', careful: 'spd',
};

export class DraftError extends Error {}

interface Pick {
	id: string;
	side: Side;
	random: boolean;
}

export function loadRoster(): Roster {
	return JSON.parse(FS(ROSTER_PATH).readSync()) as Roster;
}

export function defaultSet(pokemon: RosterPokemon): PokemonSet {
	const set = pokemon.setParDefaut;
	const plus = NATURE_PLUS[set.natureId];
	const attack: StatID = pokemon.stats.atq >= pokemon.stats.atqSpe ? 'atk' : 'spa';
	const evs: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
	if (plus === 'def' || plus === 'spd') {
		evs.hp = 252;
		evs[plus] = 252;
		evs[plus === 'def' ? 'spd' : 'def'] = 4;
	} else {
		evs[plus === 'spe' ? attack : plus ?? attack] = 252;
		evs.spe = 252;
		evs.hp = 4;
	}
	return {
		name: pokemon.nom,
		species: pokemon.id,
		item: set.objetId,
		ability: pokemon.talent.id,
		moves: set.attaquesIds.filter(id => !set.horsMovepool.includes(id)),
		nature: set.natureId,
		gender: '',
		evs,
		ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
		level: 100,
	};
}

export class DraftSession {
	phase: Phase = 'ban';
	bans: [string[], string[]] = [[], []];
	locked: [boolean, boolean] = [false, false];
	lostBans: [number, number] = [0, 0];
	picks: Pick[] = [];
	turn = 0;
	preselection: [string | null, string | null] = [null, null];
	teams: [string | null, string | null] = [null, null];
	deadline: number;

	constructor(
		readonly id: string,
		readonly players: [ID, ID],
		readonly roster: Roster,
		now: number,
		private readonly random: () => number = Math.random,
		readonly names: [string, string] = players,
	) {
		this.deadline = now + DURATIONS.ban;
	}

	get pool() {
		return this.roster.pokemon.map(pokemon => pokemon.id);
	}

	sideOf(userid: ID): Side {
		const side = this.players.indexOf(userid);
		if (side < 0) throw new DraftError("Tu ne participes pas à ce draft.");
		return side as Side;
	}

	available() {
		const out = new Set([...this.picks.map(pick => pick.id), ...(this.phase === 'ban' ? [] : [...this.bans[0], ...this.bans[1]])]);
		return this.pool.filter(id => !out.has(id));
	}

	picksOf(side: Side) {
		return this.picks.filter(pick => pick.side === side).map(pick => pick.id);
	}

	currentTurn() {
		const [side, count] = TURNS[this.turn];
		const before = TURNS.slice(0, this.turn).reduce((total, [, n]) => total + n, 0);
		return { side, count, done: this.picks.length - before };
	}

	setBans(side: Side, ids: string[]) {
		if (this.phase !== 'ban' || this.locked[side]) throw new DraftError("Les bans sont déjà verrouillés.");
		const unique = [...new Set(ids)];
		if (unique.length > MAX_BANS) throw new DraftError(`Tu ne peux bannir que ${MAX_BANS} Pokémon.`);
		const unknown = unique.find(id => !this.pool.includes(id));
		if (unknown) throw new DraftError(`« ${unknown} » n'est pas dans le roster.`);
		this.bans[side] = unique;
	}

	lockBans(side: Side, now: number) {
		if (this.phase !== 'ban') throw new DraftError("La phase de bans est terminée.");
		this.locked[side] = true;
		if (this.locked[0] && this.locked[1]) this.reveal(now);
	}

	preselect(side: Side, id: string | null) {
		if (this.phase !== 'pick') throw new DraftError("Ce n'est pas la phase de picks.");
		if (id && !this.available().includes(id)) throw new DraftError("Ce Pokémon n'est plus disponible.");
		this.preselection[side] = id;
	}

	pick(side: Side, id: string, now: number) {
		if (this.phase !== 'pick') throw new DraftError("Ce n'est pas la phase de picks.");
		if (this.currentTurn().side !== side) throw new DraftError("Ce n'est pas ton tour.");
		if (!this.available().includes(id)) throw new DraftError("Ce Pokémon n'est plus disponible.");
		this.addPick(id, side, false, now);
	}

	/** Une équipe vide vaut les sets par défaut des 6 Pokémon draftés. */
	submitTeam(side: Side, packed: string) {
		if (this.phase !== 'prep') throw new DraftError("Ce n'est pas la phase de préparation.");
		if (!packed) packed = this.defaultTeam(side);
		const sets = Teams.unpack(packed);
		if (!sets) throw new DraftError("Équipe illisible.");
		const species = sets.map(set => toID(set.species)).sort();
		const expected = this.picksOf(side).sort();
		if (species.length !== TEAM_SIZE || species.some((id, index) => id !== expected[index])) {
			throw new DraftError("L'équipe doit contenir exactement tes 6 Pokémon draftés.");
		}
		const problems = TeamValidator.get(FORMAT).validateTeam(sets);
		if (problems) throw new DraftError(problems.join(' '));
		this.teams[side] = packed;
		if (this.teams[0] && this.teams[1]) this.phase = 'done';
	}

	cancel() {
		this.phase = 'cancelled';
	}

	/** Applique les chronos écoulés. Renvoie vrai si l'état a changé. */
	update(now: number): boolean {
		if (now < this.deadline || this.phase === 'done' || this.phase === 'cancelled') return false;
		if (this.phase === 'ban') {
			this.reveal(now);
		} else if (this.phase === 'reveal') {
			this.phase = 'pick';
			this.deadline = now + DURATIONS.pick;
		} else if (this.phase === 'pick') {
			const { side, count, done } = this.currentTurn();
			for (let i = done; i < count; i++) {
				const options = this.available();
				const preselected = this.preselection[side];
				const id = preselected && options.includes(preselected) ? preselected : options[Math.floor(this.random() * options.length)];
				this.preselection[side] = null;
				this.addPick(id, side, id !== preselected, now);
			}
		} else if (this.phase === 'prep') {
			this.phase = 'done';
		}
		return true;
	}

	/** Équipe à envoyer au combat : celle validée par le joueur, sinon les sets par défaut. */
	teamFor(side: Side): string {
		return this.teams[side] ?? this.defaultTeam(side);
	}

	defaultTeam(side: Side) {
		const byId = new Map(this.roster.pokemon.map(pokemon => [pokemon.id, pokemon]));
		return Teams.pack(this.picksOf(side).map(id => defaultSet(byId.get(id)!)));
	}

	view(side: Side, now: number) {
		const other = (1 - side) as Side;
		const hidden = this.phase === 'ban';
		return {
			id: this.id,
			phase: this.phase,
			you: this.names[side],
			opponent: this.names[other],
			remaining: Math.max(0, this.deadline - now),
			turn: this.phase === 'pick' ? { ...this.currentTurn(), mine: this.currentTurn().side === side } : null,
			bans: { mine: this.bans[side], theirs: hidden ? [] : this.bans[other] },
			lostBans: { mine: this.lostBans[side], theirs: this.lostBans[other] },
			locked: { mine: this.locked[side], theirs: this.locked[other] },
			picks: this.picks.map(pick => ({ id: pick.id, mine: pick.side === side, random: pick.random })),
			preselection: this.preselection[side],
			ready: { mine: this.teams[side] !== null, theirs: this.teams[other] !== null },
		};
	}

	private reveal(now: number) {
		this.phase = 'reveal';
		this.locked = [true, true];
		this.lostBans = [MAX_BANS - this.bans[0].length, MAX_BANS - this.bans[1].length];
		this.deadline = now + DURATIONS.reveal;
	}

	private addPick(id: string, side: Side, random: boolean, now: number) {
		this.picks.push({ id, side, random });
		if (this.preselection[side] === id) this.preselection[side] = null;
		const { count, done } = this.currentTurn();
		if (done < count) return;
		this.turn++;
		if (this.turn >= TURNS.length) {
			this.phase = 'prep';
			this.deadline = now + DURATIONS.prep;
		} else {
			this.deadline = now + DURATIONS.pick;
		}
	}
}

export const Drafts = new class {
	queue: ID[] = [];
	challenges = new Map<ID, ID>();
	sessions = new Map<string, DraftSession>();
	timers = new Map<string, NodeJS.Timeout>();
	byUser = new Map<ID, string>();
	counter = 0;
	roster: Roster | null = null;

	send(userid: ID, data: AnyObject) {
		Users.get(userid)?.send(`|pokedraft|${JSON.stringify(data)}`);
	}

	sessionOf(userid: ID) {
		const id = this.byUser.get(userid);
		const session = id ? this.sessions.get(id) : undefined;
		if (!session) throw new DraftError("Tu n'es dans aucun draft.");
		return session;
	}

	search(user: User) {
		if (this.byUser.has(user.id)) throw new DraftError("Tu es déjà dans un draft.");
		const opponent = this.queue.find(id => id !== user.id && Users.get(id)?.connected);
		if (opponent) {
			this.queue = this.queue.filter(id => id !== opponent && id !== user.id);
			this.start([opponent, user.id]);
			return;
		}
		if (!this.queue.includes(user.id)) this.queue.push(user.id);
		this.send(user.id, { type: 'search', searching: true });
	}

	cancelSearch(user: User) {
		this.queue = this.queue.filter(id => id !== user.id);
		this.send(user.id, { type: 'search', searching: false });
	}

	challenge(user: User, targetName: string) {
		const target = Users.get(targetName);
		if (!target?.connected) throw new DraftError(`« ${targetName} » n'est pas connecté.`);
		if (target.id === user.id) throw new DraftError("Tu ne peux pas te défier toi-même.");
		if (this.byUser.has(user.id) || this.byUser.has(target.id)) throw new DraftError("L'un de vous est déjà dans un draft.");
		this.challenges.set(user.id, target.id);
		this.send(user.id, { type: 'challenge', to: target.name });
		this.send(target.id, { type: 'challenged', from: user.name, active: true });
	}

	accept(user: User, fromName: string) {
		const from = toID(fromName);
		if (this.challenges.get(from) !== user.id) throw new DraftError("Ce défi n'existe plus.");
		this.challenges.delete(from);
		this.start([from, user.id]);
	}

	reject(user: User, fromName: string) {
		const from = toID(fromName);
		if (this.challenges.get(from) === user.id) {
			this.challenges.delete(from);
			this.send(from, { type: 'challenge', to: null, rejectedBy: user.name });
		}
		this.send(user.id, { type: 'challenged', from: fromName, active: false });
	}

	cancelChallenge(user: User) {
		const target = this.challenges.get(user.id);
		if (!target) return;
		this.challenges.delete(user.id);
		this.send(target, { type: 'challenged', from: user.name, active: false });
		this.send(user.id, { type: 'challenge', to: null });
	}

	start(players: [ID, ID]) {
		this.roster ??= loadRoster();
		for (const id of players) {
			for (const [from, target] of this.challenges) {
				if (target === id) this.send(id, { type: 'challenged', from: Users.get(from)?.name ?? from, active: false });
			}
		}
		const shuffled: [ID, ID] = Math.random() < 0.5 ? players : [players[1], players[0]];
		const names = shuffled.map(id => Users.get(id)?.name ?? id) as [string, string];
		const session = new DraftSession(`draft${++this.counter}`, shuffled, this.roster, Date.now(), Math.random, names);
		this.sessions.set(session.id, session);
		for (const id of players) {
			this.byUser.set(id, session.id);
			this.queue = this.queue.filter(other => other !== id);
			this.challenges.delete(id);
		}
		this.broadcast(session);
	}

	act(user: User, action: (session: DraftSession, side: Side, now: number) => void) {
		const session = this.sessionOf(user.id);
		action(session, session.sideOf(user.id), Date.now());
		this.broadcast(session);
	}

	quit(user: User) {
		const session = this.sessionOf(user.id);
		session.cancel();
		const other = session.players.find(id => id !== user.id)!;
		this.send(other, { type: 'cancelled', reason: `${user.name} a quitté le draft.` });
		this.send(user.id, { type: 'cancelled', reason: "Tu as quitté le draft." });
		this.end(session);
	}

	broadcast(session: DraftSession) {
		const now = Date.now();
		while (session.update(now));
		if (session.phase === 'done') {
			this.launch(session);
			return;
		}
		session.players.forEach((id, side) => this.send(id, { type: 'state', draft: session.view(side as Side, now) }));
		clearTimeout(this.timers.get(session.id));
		this.timers.set(session.id, setTimeout(() => this.broadcast(session), Math.max(0, session.deadline - now) + 50));
	}

	launch(session: DraftSession) {
		const users = session.players.map(id => Users.get(id));
		if (users.some(user => !user?.connected)) {
			session.players.forEach(id => this.send(id, { type: 'cancelled', reason: "Un joueur s'est déconnecté avant le combat." }));
			this.end(session);
			return;
		}
		session.players.forEach((id, side) => this.send(id, { type: 'state', draft: session.view(side as Side, Date.now()) }));
		const room = Rooms.createBattle({
			format: FORMAT,
			players: users.map((user, side) => ({ user: user!, team: session.teamFor(side as Side) })),
			rated: false,
		});
		session.players.forEach(id => this.send(id, room ? { type: 'battle', roomid: room.roomid } : { type: 'cancelled', reason: "Le combat n'a pas pu démarrer." }));
		this.end(session);
	}

	end(session: DraftSession) {
		clearTimeout(this.timers.get(session.id));
		this.timers.delete(session.id);
		this.sessions.delete(session.id);
		for (const id of session.players) {
			if (this.byUser.get(id) === session.id) this.byUser.delete(id);
		}
	}

	resend(user: User) {
		const id = this.byUser.get(user.id);
		const session = id ? this.sessions.get(id) : undefined;
		if (session) {
			this.send(user.id, { type: 'state', draft: session.view(session.sideOf(user.id), Date.now()) });
		} else {
			this.send(user.id, { type: 'state', draft: null });
		}
		this.send(user.id, { type: 'search', searching: this.queue.includes(user.id) });
		const to = this.challenges.get(user.id);
		this.send(user.id, { type: 'challenge', to: to ? Users.get(to)?.name ?? to : null });
		for (const [from, target] of this.challenges) {
			if (target === user.id) this.send(user.id, { type: 'challenged', from: Users.get(from)?.name ?? from, active: true });
		}
	}
};

function run(user: User, action: () => void) {
	try {
		action();
	} catch (error) {
		if (!(error instanceof DraftError)) throw error;
		Drafts.send(user.id, { type: 'error', message: error.message });
	}
}

export const commands: Chat.ChatCommands = {
	pokedraft: {
		''(target, room, user) {
			run(user, () => Drafts.resend(user));
		},
		search(target, room, user) {
			run(user, () => Drafts.search(user));
		},
		cancelsearch(target, room, user) {
			run(user, () => Drafts.cancelSearch(user));
		},
		challenge(target, room, user) {
			run(user, () => Drafts.challenge(user, target.trim()));
		},
		accept(target, room, user) {
			run(user, () => Drafts.accept(user, target.trim()));
		},
		reject(target, room, user) {
			run(user, () => Drafts.reject(user, target.trim()));
		},
		cancelchallenge(target, room, user) {
			run(user, () => Drafts.cancelChallenge(user));
		},
		bans(target, room, user) {
			run(user, () => Drafts.act(user, (session, side) => session.setBans(side, target.split(',').map(toID).filter(Boolean))));
		},
		lockbans(target, room, user) {
			run(user, () => Drafts.act(user, (session, side, now) => session.lockBans(side, now)));
		},
		preselect(target, room, user) {
			run(user, () => Drafts.act(user, (session, side) => session.preselect(side, toID(target) || null)));
		},
		pick(target, room, user) {
			run(user, () => Drafts.act(user, (session, side, now) => session.pick(side, toID(target), now)));
		},
		team(target, room, user) {
			run(user, () => Drafts.act(user, (session, side) => session.submitTeam(side, target.trim())));
		},
		quit(target, room, user) {
			run(user, () => Drafts.quit(user));
		},
	},
};

export const handlers: Chat.Handlers = {
	onDisconnect(user) {
		if (user.connected) return;
		Drafts.queue = Drafts.queue.filter(id => id !== user.id);
		Drafts.challenges.delete(user.id);
	},
};

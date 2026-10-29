/**
 * Bots d'entraînement : des joueurs du serveur, connectés en local comme n'importe quel client, qui acceptent
 * les défis de combat libre et de draft puis jouent avec l'IA de leur niveau. Rien n'est classé.
 * En Classique, le site prépare d'abord l'entraînement (/entrainement preparer : format, équipe du bot, la tienne)
 * puis défie le bot ; un coach suit le combat de ton côté et donne, à la demande, l'option que le moteur préfère.
 * Le site demande leur état par /entrainement et reçoit une ligne |entrainement|<json>.
 * `ARENE_TRAINING_BOTS=0` les désactive.
 */
import * as crypto from 'crypto';
import { Teams } from '../../../sim/teams';
import type { ChoiceRequest } from '../../../sim/side';
import type { Pokemon as RosterPokemon, Roster } from '../../../../data/types/roster';
import { Drafts, FORMAT, loadRoster } from '../pokedraft';
import { LeaderAI, MultiTrainingAI, TrainingAI, type Level } from './ia';
import { BOTS, bansFor, pickFor, setsFor, teamFor, type BotProfile } from './equipes';
import { smogonSets } from './smogon';

const START_DELAY = 3_000;
const RECONNECT_DELAY = 5_000;
const CHOICE_DELAY = 600;
const DRAFT_DELAY = 1_200;
const MAX_BATTLES = 10;
const PREPARATION_TTL = 10 * 60_000;
const MAX_TEAM_LENGTH = 6000;
/** Temps laissé au bot d'un Champion pour se connecter avant son combat. */
const LEADER_WAIT = 8_000;
/** Prouve au filtre de pseudos qu'une connexion est bien un bot : lui seul peut prendre un nom de bot. */
const SECRET = crypto.randomBytes(24).toString('hex');

/** Entraînement Classique préparé par le site avant de défier un bot. */
interface Preparation {
	format: ID;
	/** Équipe du bot au format compact, vide pour un format à équipes générées. */
	team: string;
	/** Ton équipe, pour que le coach rejoue tes options avec tes vrais sets. */
	mine: string;
	coach: boolean;
	expires: number;
}

interface Coach {
	ai: TrainingAI;
	user: ID;
}

interface DraftView {
	id: string;
	phase: string;
	turn: { mine: boolean } | null;
	bans: { mine: string[], theirs: string[] };
	locked: { mine: boolean };
	picks: { id: string, mine: boolean }[];
	ready: { mine: boolean };
}

class TrainingBot {
	socket: WebSocket | null = null;
	battles = new Map<string, TrainingAI>();
	coaches = new Map<string, Coach>();
	draftSteps = new Set<string>();
	timer: NodeJS.Timeout | null = null;
	stopped = false;

	constructor(readonly profile: BotProfile, readonly roster: Roster) {}

	get id() {
		return toID(this.profile.name);
	}

	get online() {
		return this.socket?.readyState === WebSocket.OPEN && Boolean(Users.get(this.id)?.connected);
	}

	start() {
		if (this.stopped) return;
		const host = !Config.bindaddress || Config.bindaddress === '0.0.0.0' ? '127.0.0.1' : Config.bindaddress;
		const socket = new WebSocket(`ws://${host}:${Config.port}/showdown/websocket`);
		this.socket = socket;
		socket.onmessage = event => this.receive(String(event.data));
		socket.onerror = () => {};
		socket.onclose = () => {
			if (this.socket !== socket) return;
			this.socket = null;
			this.battles.clear();
			if (!this.stopped) this.timer = setTimeout(() => this.start(), RECONNECT_DELAY);
		};
	}

	stop() {
		this.stopped = true;
		if (this.timer) clearTimeout(this.timer);
		this.socket?.close();
	}

	send(text: string) {
		if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(text);
	}

	receive(data: string) {
		const lines = data.split('\n');
		if (lines[0].startsWith('>')) {
			const room = lines[0].slice(1);
			if (room.startsWith('battle-')) this.battle(room, lines.slice(1));
			return;
		}
		for (const line of lines) this.global(line);
	}

	global(line: string) {
		if (line.startsWith('|challstr|')) {
			this.send(`|/entrainement bot ${SECRET}`);
			this.send(`|/trn ${this.profile.name}`);
		} else if (line.startsWith('|pokedraft|')) {
			this.draft(JSON.parse(line.slice('|pokedraft|'.length)));
		} else if (line.startsWith('|pm|')) {
			const [, , sender = '', receiver = '', ...message] = line.split('|');
			const text = message.join('|');
			if (text.startsWith('/challenge') && toID(receiver) === this.id) this.challenged(sender.slice(1), text);
		}
	}

	challenged(from: string, text: string) {
		const format = toID(text.slice('/challenge'.length).trim().split('|')[0]);
		if (!format) return;
		if (this.profile.leader) {
			this.send(`|/reject ${from}`);
			return;
		}
		if (this.battles.size >= MAX_BATTLES) {
			this.send(`|/reject ${from}`);
			return;
		}
		if (format === FORMAT) {
			this.send(`|/utm ${Teams.pack(teamFor(this.profile, this.roster))}`);
			this.send(`|/accept ${from}`);
			return;
		}
		const rules = Dex.formats.get(format);
		const preparation = Training.preparation(toID(from), this.id);
		const generated = Boolean(rules.team);
		if (!rules.exists || rules.gameType !== 'singles' || (!generated && preparation?.format !== format)) {
			this.send(`|/reject ${from}`);
			return;
		}
		this.send(`|/utm ${generated ? 'null' : preparation!.team}`);
		this.send(`|/accept ${from}`);
	}

	battle(room: string, lines: string[]) {
		let ai = this.battles.get(room);
		const format = room.split('-')[1] ?? FORMAT;
		if (!ai) {
			if (!lines.includes('|init|battle')) return;
			const imposed = Training.imposed.get(room);
			if (imposed?.sets) {
				const sets = imposed.sets;
				ai = new LeaderAI(imposed.level, this.roster, Math.random, {
					format, sets: species => sets.find(set => toID(set.species) === species) ?? null,
				});
			} else if (imposed) {
				ai = imposed.multi ?
					new MultiTrainingAI(imposed.level, this.roster, Math.random, { format }) :
					new TrainingAI(imposed.level, this.roster, Math.random, { format });
			} else {
				ai = format === FORMAT ?
					new TrainingAI(this.profile.level, this.roster) :
					new TrainingAI(this.profile.level, this.roster, Math.random, { format, sets: smogonSets(format) });
			}
			this.battles.set(room, ai);
		}
		for (const line of lines) {
			if (line.startsWith('|request|')) {
				if (line.length > 9) this.answer(room, ai, JSON.parse(line.slice(9)));
			} else if (line.startsWith('|win|') || line === '|tie') {
				this.battles.delete(room);
				this.coaches.delete(room);
				Training.imposed.delete(room);
				setTimeout(() => this.send(`${room}|/leave`), 2_000);
			} else if (line.startsWith('|error|[Invalid choice]') || line.startsWith('|error|[Unavailable choice]')) {
				this.send(`${room}|/choose default`);
			} else {
				if (line.startsWith('|player|') && format !== FORMAT) this.followPlayer(room, format, line);
				ai.receiveLine(line);
				this.coaches.get(room)?.ai.receiveLine(line);
			}
		}
	}

	/** Joueur humain d'un combat Classique : s'il a demandé le coach, une IA de niveau 5 suit le combat de son côté. */
	followPlayer(room: string, format: string, line: string) {
		const user = toID(line.split('|')[3] ?? '');
		if (!user || user === this.id || this.coaches.has(room)) return;
		const preparation = Training.preparation(user, this.id);
		if (!preparation?.coach) return;
		const ai = new TrainingAI(5, this.roster, Math.random, { engine: true, format, sets: smogonSets(format) });
		if (preparation.mine) ai.setTeam(Teams.unpack(preparation.mine) ?? []);
		this.coaches.set(room, { ai, user });
	}

	answer(room: string, ai: TrainingAI, request: ChoiceRequest & { rqid?: number }) {
		if (request.wait) return;
		setTimeout(() => {
			if (this.battles.get(room) !== ai) return;
			let choice: string;
			try {
				choice = ai.decide(request);
			} catch (error) {
				Monitor.warn(`Bot d'entraînement ${this.profile.name} (${room}) : ${(error as Error).message}`);
				choice = 'default';
			}
			if (choice) this.send(`${room}|/choose ${choice}|${request.rqid ?? ''}`);
		}, CHOICE_DELAY);
	}

	draft(message: { type: string, from?: string, active?: boolean, draft?: DraftView | null }) {
		if (message.type === 'challenged' && message.active && message.from) {
			this.send(`|/pokedraft accept ${message.from}`);
			return;
		}
		if (message.type === 'battle' || message.type === 'cancelled') this.draftSteps.clear();
		const draft = message.type === 'state' ? message.draft : null;
		if (!draft) return;
		const step = `${draft.id}:${draft.phase}:${draft.picks.length}`;
		if (this.draftSteps.has(step)) return;
		if (draft.phase === 'ban' && !draft.locked.mine) {
			this.draftSteps.add(step);
			const bans = bansFor(this.profile, this.roster);
			setTimeout(() => {
				this.send(`|/pokedraft bans ${bans.join(',')}`);
				this.send('|/pokedraft lockbans');
			}, DRAFT_DELAY);
		} else if (draft.phase === 'pick' && draft.turn?.mine) {
			this.draftSteps.add(step);
			const taken = new Set([...draft.bans.mine, ...draft.bans.theirs, ...draft.picks.map(pick => pick.id)]);
			const available = this.roster.pokemon.map(pokemon => pokemon.id).filter(id => !taken.has(id));
			const mine = draft.picks.filter(pick => pick.mine).map(pick => pick.id);
			const choice = pickFor(this.profile, this.roster, available, mine);
			setTimeout(() => this.send(`|/pokedraft pick ${choice}`), DRAFT_DELAY);
		} else if (draft.phase === 'prep' && !draft.ready.mine) {
			this.draftSteps.add(step);
			const picked = draft.picks.filter(pick => pick.mine)
				.map(pick => this.roster.pokemon.find(pokemon => pokemon.id === pick.id))
				.filter((pokemon): pokemon is RosterPokemon => Boolean(pokemon));
			setTimeout(() => this.send(`|/pokedraft team ${Teams.pack(setsFor(this.profile, picked))}`), DRAFT_DELAY);
		}
	}
}

export const Training = new class {
	bots: TrainingBot[] = [];
	botUsers = new WeakSet<User>();
	prepared = new Map<string, Preparation>();
	/**
	 * Combats lancés par le serveur (Roguelike, Route des Ligues) : le niveau d'IA à jouer, s'il s'agit d'un combat multi,
	 * et pour un Champion de la Route les sets du joueur, qu'il connaît comme dans les jeux.
	 */
	imposed = new Map<string, { level: Level, multi: boolean, sets?: PokemonSet[] }>();
	/** Champions de la Route des Ligues : un bot par Champion, connecté à la première demande. */
	leaders = new Map<ID, TrainingBot>();
	reserved = new Set<ID>();

	/** Pseudos réservés aux Champions, que personne d'autre ne peut prendre. */
	reserve(names: string[]) {
		for (const name of names) this.reserved.add(toID(name));
	}

	/** Le bot qui joue ce Champion, connecté au besoin ; null s'il ne se connecte pas à temps. */
	async leader(name: string): Promise<User | null> {
		const id = toID(name);
		this.reserved.add(id);
		let bot = this.leaders.get(id);
		if (!bot) {
			bot = new TrainingBot({ key: `route-${id}`, name, level: 5, leader: true }, loadRoster());
			this.leaders.set(id, bot);
			bot.start();
		}
		for (let wait = 0; wait < LEADER_WAIT / 100 && !bot.online; wait++) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		return bot.online ? Users.get(bot.id) ?? null : null;
	}

	/** Bots en ligne pour un combat lancé par le serveur, les moins occupés d'abord ; ceux du thème demandé en tête. */
	availableBots(count: number, theme?: string): User[] {
		return this.bots
			.filter(bot => bot.online && bot.battles.size < MAX_BATTLES)
			.sort((a, b) => Number(b.profile.theme === theme) - Number(a.profile.theme === theme) || a.battles.size - b.battles.size)
			.slice(0, count)
			.map(bot => Users.get(bot.id)!);
	}

	/** Garde l'entraînement que le joueur va lancer contre ce bot, le temps de le défier. */
	prepare(user: User, data: { bot?: unknown, format?: unknown, team?: unknown, mine?: unknown, coach?: unknown }) {
		const bot = this.bots.find(entry => entry.id === toID(String(data.bot ?? '')));
		const format = Dex.formats.get(String(data.format ?? ''));
		const team = typeof data.team === 'string' ? data.team : '';
		const mine = typeof data.mine === 'string' ? data.mine : '';
		if (!bot) return "Ce bot n'est pas connecté.";
		if (!format.exists || format.gameType !== 'singles') return 'Les bots ne jouent que les formats en simple.';
		if (!format.team && !team) return 'Il faut une équipe pour le bot dans ce format.';
		if (team.length > MAX_TEAM_LENGTH || mine.length > MAX_TEAM_LENGTH) return 'Équipe trop longue.';
		this.prepared.set(`${user.id}>${bot.id}`, {
			format: format.id, team, mine, coach: data.coach !== false, expires: Date.now() + PREPARATION_TTL,
		});
		return null;
	}

	preparation(user: ID, bot: ID) {
		const preparation = this.prepared.get(`${user}>${bot}`);
		return preparation && preparation.expires > Date.now() ? preparation : null;
	}

	/** Conseil du coach pour la décision en cours du joueur : le choix du moteur et la note de chaque option. */
	coach(user: User, roomid: string) {
		const room = Rooms.get(roomid);
		const coach = this.bots.map(bot => bot.coaches.get(roomid)).find(entry => entry?.user === user.id);
		const raw = room?.battle?.playerTable[user.id]?.request.request;
		if (!coach || !raw) return { type: 'coach', room: roomid, error: "Pas de conseil possible pour l'instant." };
		const request = JSON.parse(raw) as ChoiceRequest;
		if (request.wait || request.teamPreview) return { type: 'coach', room: roomid, error: 'Rien à décider pour le moment.' };
		if (!coach.ai.team.length) coach.ai.setTeam(setsFromRequest(request));
		let choice = '';
		try {
			choice = coach.ai.decide(request);
		} catch (error) {
			return { type: 'coach', room: roomid, error: `Le coach n'a pas pu analyser ce tour (${(error as Error).message}).` };
		}
		const analysis = coach.ai.lastAnalysis;
		return {
			type: 'coach', room: roomid, turn: coach.ai.turnNumber, choice,
			options: analysis?.options.map(option => ({ kind: option.kind, id: option.id, tera: option.tera, score: option.score })) ?? [],
			simulations: analysis?.simulations ?? 0,
		};
	}

	start() {
		if (this.bots.length) return;
		const roster = loadRoster();
		this.bots = BOTS.map(profile => new TrainingBot(profile, roster));
		for (const bot of this.bots) bot.start();
	}

	stop() {
		for (const bot of [...this.bots, ...this.leaders.values()]) bot.stop();
		this.bots = [];
		this.leaders.clear();
	}

	isReserved(name: string) {
		const id = toID(name);
		return this.reserved.has(id) || BOTS.some(profile => toID(profile.name) === id);
	}

	send(user: User) {
		const bots = BOTS.map(profile => {
			const bot = this.bots.find(other => other.profile.key === profile.key);
			return {
				...profile,
				online: Boolean(bot?.online),
				battles: bot?.battles.size ?? 0,
				drafting: Drafts.byUser.has(toID(profile.name)),
			};
		});
		user.send(`|entrainement|${JSON.stringify({ type: 'bots', enabled: this.bots.length > 0, bots })}`);
	}
};

export const commands: Chat.ChatCommands = {
	entrainement: {
		''(target, room, user) {
			Training.send(user);
		},
		bot(target, room, user) {
			if (target.trim() === SECRET) Training.botUsers.add(user);
		},
		preparer(target, room, user) {
			let data = {};
			try {
				data = JSON.parse(target);
			} catch {
				data = {};
			}
			const error = Training.prepare(user, data);
			user.send(`|entrainement|${JSON.stringify(error ? { type: 'erreur', message: error } : { type: 'pret' })}`);
		},
		coach(target, room, user) {
			user.send(`|entrainement|${JSON.stringify(Training.coach(user, target.trim()))}`);
		},
	},
};

/** Sets du joueur d'après sa requête, quand son équipe est générée par le serveur (Random Battle). */
function setsFromRequest(request: ChoiceRequest): PokemonSet[] {
	return request.side.pokemon.map((pokemon) => {
		const [species = '', ...details] = pokemon.details.split(', ');
		const level = Number(details.find(part => part.startsWith('L'))?.slice(1)) || 100;
		return {
			name: species, species, item: pokemon.item, ability: pokemon.baseAbility, moves: pokemon.moves, nature: 'serious',
			gender: '', evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 },
			ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, level,
		};
	});
}

export const namefilter: Chat.NameFilter = (name, user) => (
	Training.isReserved(name) && !Training.botUsers.has(user) ? '' : name
);

export const destroy = () => Training.stop();

if (!Config.lazysockets && process.env.ARENE_TRAINING_BOTS !== '0') {
	setTimeout(() => Training.start(), START_DELAY);
}

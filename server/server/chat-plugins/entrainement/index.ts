/**
 * Bots d'entraînement : des joueurs du serveur, connectés en local comme n'importe quel client, qui acceptent
 * les défis de combat libre et de draft puis jouent avec l'IA de leur niveau. Rien n'est classé.
 * Le site demande leur état par /entrainement et reçoit une ligne |entrainement|<json>.
 * `ARENE_TRAINING_BOTS=0` les désactive.
 */
import * as crypto from 'crypto';
import { Teams } from '../../../sim/teams';
import type { ChoiceRequest } from '../../../sim/side';
import type { Pokemon as RosterPokemon, Roster } from '../../../../data/types/roster';
import { Drafts, FORMAT, loadRoster } from '../pokedraft';
import { TrainingAI } from './ia';
import { BOTS, bansFor, pickFor, setsFor, teamFor, type BotProfile } from './equipes';

const START_DELAY = 3_000;
const RECONNECT_DELAY = 5_000;
const CHOICE_DELAY = 600;
const DRAFT_DELAY = 1_200;
const MAX_BATTLES = 10;
/** Prouve au filtre de pseudos qu'une connexion est bien un bot : lui seul peut prendre un nom de bot. */
const SECRET = crypto.randomBytes(24).toString('hex');

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
		const format = text.slice('/challenge'.length).trim().split('|')[0];
		if (!format) return;
		if (toID(format) !== FORMAT || this.battles.size >= MAX_BATTLES) {
			this.send(`|/reject ${from}`);
			return;
		}
		this.send(`|/utm ${Teams.pack(teamFor(this.profile, this.roster))}`);
		this.send(`|/accept ${from}`);
	}

	battle(room: string, lines: string[]) {
		let ai = this.battles.get(room);
		if (!ai) {
			if (!lines.includes('|init|battle')) return;
			ai = new TrainingAI(this.profile.level, this.roster);
			this.battles.set(room, ai);
		}
		for (const line of lines) {
			if (line.startsWith('|request|')) {
				if (line.length > 9) this.answer(room, ai, JSON.parse(line.slice(9)));
			} else if (line.startsWith('|win|') || line === '|tie') {
				this.battles.delete(room);
				setTimeout(() => this.send(`${room}|/leave`), 2_000);
			} else if (line.startsWith('|error|[Invalid choice]') || line.startsWith('|error|[Unavailable choice]')) {
				this.send(`${room}|/choose default`);
			} else {
				ai.receiveLine(line);
			}
		}
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

	start() {
		if (this.bots.length) return;
		const roster = loadRoster();
		this.bots = BOTS.map(profile => new TrainingBot(profile, roster));
		for (const bot of this.bots) bot.start();
	}

	stop() {
		for (const bot of this.bots) bot.stop();
		this.bots = [];
	}

	isReserved(name: string) {
		const id = toID(name);
		return BOTS.some(profile => toID(profile.name) === id);
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
	},
};

export const namefilter: Chat.NameFilter = (name, user) => (
	Training.isReserved(name) && !Training.botUsers.has(user) ? '' : name
);

export const destroy = () => Training.stop();

if (!Config.lazysockets && process.env.ARENE_TRAINING_BOTS !== '0') {
	setTimeout(() => Training.start(), START_DELAY);
}

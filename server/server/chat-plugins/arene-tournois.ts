/**
 * Tournois de l'Arène. Chaque tournoi a son propre salon, ouvert aux inscriptions un quart d'heure avant le début ;
 * le tournoi démarre seul à l'heure prévue. Les tournois réguliers reviennent chaque semaine, les autres sont
 * proposés par les joueurs depuis le site.
 * Le site lit le calendrier, les tournois ouverts et les derniers résultats par /arenetournois et propose un
 * tournoi par /arenetournois proposer <json> ; les deux répondent par une ligne |arenetournois|<json>.
 * Le module crée aussi les salons de discussion publics du site s'ils manquent.
 */
import * as crypto from 'crypto';
import { FS } from '../../lib';

type TourType = 'elimination' | 'double' | 'roundrobin';

interface Planned {
	id: string;
	name: string;
	format: string;
	type: TourType;
	cap: number;
	startsAt: number;
	/** Règles ajoutées (« Item Clause ») ou retirées (« !Team Preview ») au format. */
	rules: string[];
	/** Identifiant du joueur qui l'a proposé, `null` pour un tournoi régulier ; son pseudo pour l'affichage. */
	author: string | null;
	authorName?: string;
}

interface Regular {
	key: string;
	name: string;
	format: string;
	type: TourType;
	cap: number;
	/** Jour de la semaine (0 pour dimanche) et heure, à l'heure locale du serveur. */
	day: number;
	hour: number;
	minute: number;
}

interface Result {
	id: string;
	name: string;
	format: string;
	winner: string;
	finalist: string | null;
	players: number;
	at: number;
	/** Tableau final, pour le revoir une fois le salon fermé. */
	bracket?: AnyObject;
}

interface Store {
	planned: Planned[];
	results: Result[];
}

interface Proposal {
	name?: unknown;
	format?: unknown;
	type?: unknown;
	cap?: unknown;
	startsAt?: unknown;
	rules?: unknown;
}

const DATA_PATH = 'config/arene-tournois.json';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const REGISTRATION = 15 * MINUTE;
const TICK = 30_000;
const HORIZON = 14 * DAY;
const MAX_AHEAD = 30 * DAY;
const KEEP_PAST = 2 * DAY;
const MAX_PENDING = 3;
const MAX_RESULTS = 20;
const MAX_NAME = 40;
const CAPS = [4, 8, 16, 32, 64];
const START_DELAY = 3_000;
const GENERATORS: Record<TourType, [string, string]> = {
	elimination: ['elimination', ''],
	double: ['elimination', '2'],
	roundrobin: ['roundrobin', ''],
};

/** Clauses que l'on peut ajouter ou retirer à la création d'un tournoi, avec leur valeur quand la règle en demande une. */
const CLAUSES = ['Sleep Clause Mod', 'Species Clause', 'Evasion Moves Clause', 'OHKO Clause', 'Team Preview', 'Item Clause'];
const CLAUSE_VALUES: Record<string, string> = { 'Item Clause': 'Item Clause = 1' };

const REGULARS: Regular[] = [
	{ key: 'hebdo', name: 'Tournoi hebdo', format: 'gen9ou', type: 'elimination', cap: 64, day: 1, hour: 21, minute: 0 },
	{ key: 'random', name: 'Random du mercredi', format: 'gen9randombattle', type: 'elimination', cap: 32, day: 3, hour: 20, minute: 30 },
	{ key: 'doubles', name: 'Doubles du vendredi', format: 'gen9doublesou', type: 'elimination', cap: 32, day: 5, hour: 21, minute: 0 },
	{ key: 'monotype', name: 'Monotype du samedi', format: 'gen9monotype', type: 'elimination', cap: 32, day: 6, hour: 18, minute: 0 },
	{ key: 'natdex', name: 'National Dex du dimanche', format: 'gen9nationaldex', type: 'roundrobin', cap: 8, day: 0, hour: 17, minute: 0 },
];

/** Salons de discussion publics du site, créés au démarrage s'ils n'existent pas. */
const PUBLIC_ROOMS = ['Stratégie', 'Aide aux débutants', 'Tournois'];

/** Sortie muette pour les actions de tournoi lancées par le serveur lui-même, sans joueur derrière. */
const silent = {
	sendReply() {},
	errorReply() {},
	modlog() {},
	privateModAction() {},
	addModAction() {},
} as unknown as Chat.CommandContext;

function load(): Store {
	try {
		const data = JSON.parse(FS(DATA_PATH).readIfExistsSync() || '{}');
		return { planned: Array.isArray(data.planned) ? data.planned : [], results: Array.isArray(data.results) ? data.results : [] };
	} catch {
		return { planned: [], results: [] };
	}
}

function roomidOf(id: string) {
	return `tournoi-${id}` as RoomID;
}

function tournamentFormat(id: string) {
	const format = Dex.formats.get(id);
	return format.exists && format.effectType === 'Format' && format.tournamentShow ? format : null;
}

export const ArenaTournaments = new class {
	store = load();
	timer: NodeJS.Timeout | null = null;

	save() {
		FS(DATA_PATH).writeUpdate(() => JSON.stringify(this.store));
	}

	/** Prochaines occurrences des tournois réguliers, de la veille jusqu'à l'horizon du calendrier. */
	regularEvents(now: number): Planned[] {
		const events: Planned[] = [];
		const start = new Date(now - DAY);
		start.setHours(0, 0, 0, 0);
		for (let time = start.getTime(); time < now + HORIZON; time += DAY) {
			const date = new Date(time);
			for (const regular of REGULARS) {
				if (date.getDay() !== regular.day || !tournamentFormat(regular.format)) continue;
				const startsAt = new Date(date);
				startsAt.setHours(regular.hour, regular.minute, 0, 0);
				const stamp = `${startsAt.getFullYear()}${String(startsAt.getMonth() + 1).padStart(2, '0')}${String(startsAt.getDate()).padStart(2, '0')}`;
				events.push({
					id: `${regular.key}-${stamp}`, name: regular.name, format: regular.format, type: regular.type,
					cap: regular.cap, startsAt: startsAt.getTime(), rules: [], author: null,
				});
			}
		}
		return events;
	}

	events(now = Date.now()) {
		return [...this.regularEvents(now), ...this.store.planned].sort((a, b) => a.startsAt - b.startsAt);
	}

	tournamentOf(event: Planned) {
		const game = Rooms.get(roomidOf(event.id))?.game;
		return game instanceof Tournaments.Tournament ? game : null;
	}

	/** Ouvre le salon et le tournoi d'un événement : inscriptions jusqu'à l'heure prévue, puis départ automatique. */
	open(event: Planned, now: number) {
		const format = tournamentFormat(event.format);
		if (!format) return;
		const roomid = roomidOf(event.id);
		let room = Rooms.get(roomid);
		if (!room) {
			room = Rooms.createChatRoom(roomid, event.name, {
				isPersonal: true,
				isPrivate: 'hidden',
				modjoin: null,
				auth: {},
				creationTime: now,
				introMessage: `<p><strong>${event.name}</strong> : ${format.name}. Inscriptions ouvertes jusqu'au départ.</p>`,
			});
		}
		if (room.game || room.type !== 'chat') return;
		const [generatorName, modifier] = GENERATORS[event.type];
		const { elimination, roundrobin } = Tournaments.TournamentGenerators;
		const Generator = generatorName === 'roundrobin' ? roundrobin : elimination;
		const tour = new Tournaments.Tournament(room, format, new Generator(modifier), String(event.cap), false, event.name);
		room.game = tour;
		if (event.rules.length) {
			try {
				tour.setCustomRules(event.rules.join(','));
			} catch {
				Monitor.warn(`[arene-tournois] règles refusées pour ${event.id} : ${event.rules.join(', ')}`);
			}
		}
		tour.setAutoStartTimeout(Math.max(30_000, event.startsAt - now), silent);
		const end = tour.onTournamentEnd.bind(tour);
		tour.onTournamentEnd = () => {
			this.recordResult(event, tour);
			end();
		};
	}

	recordResult(event: Planned, tour: InstanceType<typeof Tournaments.Tournament>) {
		const results = tour.generator.getResults();
		if (!Array.isArray(results)) return;
		const [first, second] = results as { name: string }[][];
		if (!first?.[0]) return;
		this.store.results = [{
			id: event.id, name: event.name, format: event.format, winner: first[0].name,
			finalist: second?.[0]?.name ?? null, players: tour.players.length, at: Date.now(), bracket: tour.getBracketData?.(),
		}, ...this.store.results.filter(result => result.id !== event.id)].slice(0, MAX_RESULTS);
		this.save();
	}

	tick() {
		const now = Date.now();
		for (const event of this.events(now)) {
			if (now >= event.startsAt - REGISTRATION && now < event.startsAt && !this.tournamentOf(event)) this.open(event, now);
		}
		const kept = this.store.planned.filter(event => event.startsAt > now - KEEP_PAST);
		if (kept.length !== this.store.planned.length) {
			this.store.planned = kept;
			this.save();
		}
	}

	view(user: User) {
		const now = Date.now();
		const events = this.events(now).filter(event => event.startsAt > now - DAY).map((event) => {
			const tour = this.tournamentOf(event);
			const finished = this.store.results.find(result => result.id === event.id);
			return {
				...event,
				author: event.authorName ?? event.author,
				formatName: Dex.formats.get(event.format).name,
				regular: event.author === null,
				roomid: tour ? roomidOf(event.id) : null,
				status: tour ? (tour.isTournamentStarted ? 'started' : 'open') : finished ? 'ended' : event.startsAt > now ? 'planned' : 'past',
				players: tour ? tour.players.map(player => player.name) : [],
				count: tour ? tour.players.length : finished?.players ?? 0,
				joined: tour ? tour.players.some(player => player.id === user.id) : false,
				bracket: tour ? tour.getBracketData() : finished?.bracket ?? null,
				winner: finished?.winner ?? null,
			};
		});
		return {
			type: 'calendrier', now, registration: REGISTRATION, clauses: CLAUSES, caps: CAPS,
			events, results: this.store.results.map(({ bracket, ...result }) => result),
		};
	}

	/** Valide et enregistre un tournoi proposé par un joueur. Renvoie l'erreur à afficher, ou l'événement créé. */
	propose(user: User, proposal: Proposal): string | Planned {
		const now = Date.now();
		const name = typeof proposal.name === 'string' ? proposal.name.trim() : '';
		if (!user.named) return "Choisis un pseudo avant de proposer un tournoi.";
		if (!name || name.length > MAX_NAME || name.includes('|')) return `Donne au tournoi un nom de 1 à ${MAX_NAME} caractères, sans « | ».`;
		const format = typeof proposal.format === 'string' ? tournamentFormat(proposal.format) : null;
		if (!format) return "Ce format n'accepte pas de tournoi sur le serveur.";
		const type = proposal.type as TourType;
		if (!GENERATORS[type]) return 'Type de tournoi inconnu.';
		const cap = Number(proposal.cap);
		if (!CAPS.includes(cap)) return `Nombre de places possible : ${CAPS.join(', ')}.`;
		const startsAt = Number(proposal.startsAt);
		if (!Number.isFinite(startsAt) || startsAt < now + REGISTRATION || startsAt > now + MAX_AHEAD) {
			return "Choisis un départ entre un quart d'heure et 30 jours à partir de maintenant.";
		}
		if (this.store.planned.filter(event => event.author === user.id && event.startsAt > now).length >= MAX_PENDING) {
			return `Tu as déjà ${MAX_PENDING} tournois à venir : attends que l'un d'eux soit passé.`;
		}
		const ruleTable = Dex.formats.getRuleTable(format);
		const wanted = proposal.rules && typeof proposal.rules === 'object' ? proposal.rules as Record<string, unknown> : {};
		const rules: string[] = [];
		for (const clause of CLAUSES) {
			if (typeof wanted[clause] !== 'boolean') continue;
			const present = ruleTable.has(toID(clause));
			if (wanted[clause] && !present) rules.push(CLAUSE_VALUES[clause] ?? clause);
			if (!wanted[clause] && present) rules.push(`!${clause}`);
		}
		if (rules.length) {
			try {
				Dex.formats.validate(`${format.id}@@@${rules.join(',')}`);
			} catch (error) {
				return `Ces règles ne vont pas avec ${format.name} : ${(error as Error).message}`;
			}
		}
		const event: Planned = {
			id: `${toID(name).slice(0, 20) || 'tournoi'}-${crypto.randomBytes(3).toString('hex')}`,
			name, format: format.id, type, cap, startsAt, rules, author: user.id, authorName: user.name,
		};
		this.store.planned.push(event);
		this.save();
		return event;
	}

	ensureRooms() {
		for (const title of PUBLIC_ROOMS) {
			if (!Rooms.get(toID(title))) Rooms.global.addChatRoom(title);
		}
	}

	start() {
		this.ensureRooms();
		this.tick();
		this.timer = setInterval(() => this.tick(), TICK);
	}

	stop() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}
};

export const commands: Chat.ChatCommands = {
	arenetournois: {
		''(target, room, user) {
			user.send(`|arenetournois|${JSON.stringify(ArenaTournaments.view(user))}`);
		},
		proposer(target, room, user) {
			let proposal: Proposal = {};
			try {
				proposal = JSON.parse(target) as Proposal;
			} catch {
				proposal = {};
			}
			const created = ArenaTournaments.propose(user, proposal);
			const reply = typeof created === 'string' ? { type: 'erreur', message: created } : { type: 'propose', event: created };
			user.send(`|arenetournois|${JSON.stringify(reply)}`);
		},
	},
};

export const destroy = () => ArenaTournaments.stop();

if (!Config.lazysockets) setTimeout(() => ArenaTournaments.start(), START_DELAY);

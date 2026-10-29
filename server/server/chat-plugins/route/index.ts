/**
 * Route des Ligues : le joueur traverse les régions dans l'ordre et y affronte les 8 Champions d'Arène, le Conseil 4
 * et le Maître, avec un banc de 12 Pokémon tiré dans le Pokédex régional (il en garde 6). C'est le badge qui fait
 * monter le niveau ; les Pokémon évoluent et apprennent leurs attaques au fil des badges. Une défaite fait recommencer
 * la région avec un nouveau tirage (le Maître laisse un essai de plus) ; une région terminée est validée pour de bon.
 *
 * Le site demande l'état par /route et agit par /route action <json> ; le serveur répond par |route|<json>.
 * La progression de chaque joueur est enregistrée dans config/route-des-ligues.json après chaque étape.
 */
import * as crypto from 'crypto';
import { FS } from '../../../lib';
import { Teams } from '../../../sim/teams';
import { BAG_ITEMS } from '../../../sim/side';
import { Training } from '../entrainement';
import { finalConditions, type Condition } from '../roguelike/journal';
import {
	REGIONS, TEAM_SIZE, TRADES, blindTrade, botName, counterStarter, defaultMoves, drawBench, evolutionPaths, formatFor,
	knownMoves, loadRegion, prizeFor, readyEvolution, routeDex, shopFor, stageForLevel, stageOf, teamLevel, trainerFor,
	type Region, type Stage, type Trainer, type TrainerSet,
} from './donnees';

const DATA_PATH = 'config/route-des-ligues.json';
const EVS = { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 };
const IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const HISTORY_SIZE = 40;

export class RouteError extends Error {}

export interface Member {
	species: ID;
	moves: ID[];
	item: ID | '';
	/** PV (en %) et statut gardés pendant la Ligue ; 100 et rien ailleurs, l'équipe étant soignée entre deux combats. */
	hp: number;
	status: string;
}

export interface Run {
	region: string;
	attempt: number;
	seed: string;
	phase: 'tirage' | 'carte' | 'evolution' | 'fin';
	draw: ID[];
	team: Member[];
	badges: number;
	/** Membres du Conseil 4 battus (4 : place au Maître). */
	league: number;
	money: number;
	/** Objets de sac utilisables en combat (potions, Rappels). */
	bag: { [item: string]: number };
	/** Objets tenus possédés et pas encore donnés. */
	held: ID[];
	tms: ID[];
	stones: ID[];
	trades: number;
	/** Starter du Maître, choisi contre l'équipe gardée. */
	starter: ID | null;
	/** Le Maître laisse un essai de plus : vrai une fois cet essai donné. */
	championRetry: boolean;
	evolutions: { index: number, to: ID }[];
	battle: { roomid: string } | null;
	history: { at: number, text: string }[];
}

export interface Save {
	id: ID;
	name: string;
	region: string;
	run: Run | null;
	completed: string[];
	attempts: { [region: string]: number };
	/** Prime du Maître gardée pour la région suivante. */
	bonus: number;
	/** Dernière défaite, montrée au retour sur la Route. */
	defeat: { region: string, against: string, attempt: number } | null;
}

function nameOf(id: string) {
	return routeDex().species.get(id).name;
}

function regionOf(run: Run): Region {
	const region = loadRegion(run.region);
	if (!region) throw new RouteError("Cette région n'est pas encore ouverte.");
	return region;
}

/** Sets d'un Champion pour son combat : le Maître ajoute le starter choisi contre le joueur. */
function trainerTeam(region: Region, stage: Stage, run: Run): TrainerSet[] {
	const trainer = trainerFor(region, stage);
	if (stage.kind !== 'champion' || !run.starter) return trainer.team;
	return [...trainer.team, region.champion.starters[run.starter]];
}

function toSet(set: TrainerSet): PokemonSet {
	const name = nameOf(set.species);
	return {
		name, species: name, item: set.item ?? '', ability: set.ability, moves: set.moves, nature: set.nature ?? 'Hardy',
		gender: '', evs: { ...EVS }, ivs: { ...IVS }, level: set.level,
	};
}

function hpCode(member: Member) {
	return `${Math.round(member.hp)}${member.status}`;
}

/** Sac de combat au format de la règle Route Sac : « potion.2+revive.1 ». */
function bagRule(bag: { [item: string]: number }) {
	return Object.entries(bag).filter(([id, count]) => BAG_ITEMS[id] && count > 0).map(([id, count]) => `${id}.${count}`).join('+');
}

export const Route = new class {
	saves: { [user: string]: Save } = {};

	constructor() {
		this.load();
	}

	load() {
		try {
			this.saves = JSON.parse(FS(DATA_PATH).readIfExistsSync() || '{}');
		} catch {
			this.saves = {};
		}
		for (const save of Object.values(this.saves)) {
			if (save.run?.battle && !Rooms.get(save.run.battle.roomid)?.battle) save.run.battle = null;
		}
		const names = REGIONS.map(entry => loadRegion(entry.id)).filter((region): region is Region => Boolean(region))
			.flatMap(region => [
				...region.gyms.map((trainer, index) => botName(trainer, { kind: 'gym', index })),
				...region.elite.map((trainer, index) => botName(trainer, { kind: 'elite', index })),
				botName(region.champion, { kind: 'champion' }),
			]);
		Training.reserve(names);
	}

	save() {
		FS(DATA_PATH).writeUpdate(() => JSON.stringify(this.saves));
	}

	saveOf(user: User): Save {
		const save = this.saves[user.id] ??= {
			id: user.id, name: user.name, region: 'kanto', run: null, completed: [], attempts: {}, bonus: 0, defeat: null,
		};
		save.name = user.name;
		return save;
	}

	/** Journal de la région ; une espèce s'écrit {id}, le site l'affiche avec son nom français. */
	log(run: Run, text: string) {
		run.history.unshift({ at: Date.now(), text });
		run.history.length = Math.min(run.history.length, HISTORY_SIZE);
	}

	/** Nouvelle tentative dans une région : nouveau tirage, 0 Pokédollar (sauf la prime du Maître à la première). */
	start(save: Save, regionId: string) {
		const region = loadRegion(regionId);
		if (!region) throw new RouteError("Cette région n'est pas encore ouverte.");
		const index = REGIONS.findIndex(entry => entry.id === region.id);
		if (index > 0 && !save.completed.includes(REGIONS[index - 1].id)) {
			throw new RouteError(`Termine ${REGIONS[index - 1].name} pour débloquer ${region.name}.`);
		}
		const attempt = (save.attempts[region.id] ?? 0) + 1;
		save.attempts[region.id] = attempt;
		const seed = `${region.id}-${save.id}-${attempt}-${crypto.randomBytes(4).toString('hex')}`;
		save.region = region.id;
		save.run = {
			region: region.id, attempt, seed, phase: 'tirage', draw: drawBench(region, seed), team: [], badges: 0, league: 0,
			money: save.bonus, bag: {}, held: [], tms: [], stones: [], trades: TRADES,
			starter: null, championRetry: false, evolutions: [], battle: null, history: [],
		};
		save.bonus = 0;
		this.log(save.run, `Arrivée à ${region.name} · tentative ${attempt}`);
		return save.run;
	}

	runOf(save: Save) {
		if (!save.run) throw new RouteError("Choisis d'abord une région.");
		return save.run;
	}

	level(run: Run) {
		return teamLevel(regionOf(run), stageOf(run.badges, run.league));
	}

	member(run: Run, index: number) {
		const member = run.team[index];
		if (!member) throw new RouteError('Ce Pokémon ne fait pas partie de ton équipe.');
		return member;
	}

	between(run: Run) {
		if (run.phase !== 'carte') throw new RouteError("Ce n'est pas le moment.");
		if (run.battle) throw new RouteError('Un combat est en cours.');
	}

	/** Le joueur garde 6 Pokémon du banc : ils arrivent au niveau de la 1re arène, au stade normal pour ce niveau. */
	keep(save: Save, species: string[]) {
		const run = this.runOf(save);
		if (run.phase !== 'tirage') throw new RouteError('Ton équipe est déjà choisie pour cette région.');
		const ids = [...new Set(species.map(toID))];
		if (ids.length !== TEAM_SIZE || ids.some(id => !run.draw.includes(id))) {
			throw new RouteError(`Garde ${TEAM_SIZE} Pokémon différents de ton banc.`);
		}
		const region = regionOf(run);
		const level = this.level(run);
		run.team = ids.map(id => {
			const stage = stageForLevel(id, region, level, 0);
			return { species: stage, moves: defaultMoves(stage, level), item: '', hp: 100, status: '' };
		});
		run.starter = counterStarter(region, ids) as ID;
		run.phase = 'carte';
		this.log(run, `Équipe gardée : ${run.team.map(member => `{${member.species}}`).join(', ')}`);
	}

	setMoves(run: Run, index: number, moves: string[]) {
		this.between(run);
		const member = this.member(run, index);
		const known = knownMoves(member.species, this.level(run), run.tms);
		const chosen = [...new Set(moves.map(toID))];
		if (!chosen.length || chosen.length > 4 || chosen.some(move => !known.includes(move))) {
			throw new RouteError(`Choisis 1 à 4 attaques que ${nameOf(member.species)} connaît au niveau ${this.level(run)}.`);
		}
		member.moves = chosen;
	}

	equip(run: Run, index: number, item: string) {
		this.between(run);
		const member = this.member(run, index);
		const id = toID(item);
		if (id && !run.held.includes(id)) throw new RouteError("Tu n'as pas cet objet.");
		if (member.item) run.held.push(member.item);
		if (id) run.held.splice(run.held.indexOf(id), 1);
		member.item = id;
	}

	lead(run: Run, index: number) {
		this.between(run);
		const [member] = run.team.splice(index, 1);
		if (!member) throw new RouteError('Ce Pokémon ne fait pas partie de ton équipe.');
		run.team.unshift(member);
	}

	buy(run: Run, id: string) {
		this.between(run);
		const entry = shopFor(regionOf(run), run.badges).find(item => item.id === toID(id));
		if (!entry) throw new RouteError("La boutique ne vend pas encore cet objet.");
		if (run.money < entry.price) throw new RouteError("Tu n'as pas assez de Pokédollars.");
		if (entry.kind === 'tm' && run.tms.includes(entry.id as ID)) throw new RouteError('Tu as déjà cette CT.');
		run.money -= entry.price;
		if (entry.kind === 'bag') run.bag[entry.id] = (run.bag[entry.id] ?? 0) + 1;
		if (entry.kind === 'held') run.held.push(entry.id as ID);
		if (entry.kind === 'tm') run.tms.push(entry.id as ID);
	}

	/** Échange à l'aveugle : le joueur donne un Pokémon et en reçoit un au hasard ; il garde l'objet tenu. Jamais pendant la Ligue. */
	trade(run: Run, index: number) {
		this.between(run);
		if (run.badges >= 8) throw new RouteError("Pas d'échange pendant la Ligue.");
		if (run.trades <= 0) throw new RouteError("Tu n'as plus d'échange dans cette région.");
		const region = regionOf(run);
		const member = this.member(run, index);
		const level = this.level(run);
		const received = blindTrade(region, `${run.seed}|${run.trades}`, run.team.map(entry => entry.species), level, run.badges);
		if (member.item) run.held.push(member.item);
		run.team[index] = { species: received, moves: defaultMoves(received, level, run.tms), item: '', hp: 100, status: '' };
		run.trades--;
		this.log(run, `Échange : {${member.species}} contre {${received}}`);
		return received;
	}

	stone(run: Run, index: number, stone: string) {
		this.between(run);
		const member = this.member(run, index);
		const id = toID(stone);
		if (!run.stones.includes(id)) throw new RouteError("Tu n'as pas cette pierre.");
		const path = evolutionPaths(member.species, regionOf(run)).find(entry => entry.by === 'stone' && entry.stone === id);
		if (!path) throw new RouteError(`${nameOf(member.species)} n'évolue pas avec cette pierre.`);
		run.stones.splice(run.stones.indexOf(id), 1);
		this.log(run, `{${member.species}} évolue en {${path.to}}`);
		member.species = path.to;
	}

	/** Évolution proposée après un badge : le joueur l'accepte ou la refuse (elle revient au badge suivant). */
	evolve(run: Run, index: number, accept: boolean) {
		if (run.phase !== 'evolution') throw new RouteError("Aucune évolution n'attend.");
		const pending = run.evolutions.find(entry => entry.index === index);
		if (!pending) throw new RouteError("Ce Pokémon n'évolue pas maintenant.");
		run.evolutions = run.evolutions.filter(entry => entry !== pending);
		const member = this.member(run, index);
		if (accept) {
			this.log(run, `{${member.species}} évolue en {${pending.to}}`);
			member.species = pending.to;
			const next = readyEvolution(member.species, regionOf(run), this.level(run), run.badges);
			if (next) run.evolutions.unshift({ index, to: next.to });
		}
		if (!run.evolutions.length) run.phase = 'carte';
	}

	/** Lance le combat suivant contre le bot du Champion. */
	async fight(user: User, save: Save) {
		const run = this.runOf(save);
		this.between(run);
		const region = regionOf(run);
		const stage = stageOf(run.badges, run.league);
		const trainer = trainerFor(region, stage);
		const level = this.level(run);
		if (!run.team.some(member => member.hp > 0)) throw new RouteError("Tous tes Pokémon sont K.O.");
		const bot = await Training.leader(botName(trainer, stage));
		if (!bot) throw new RouteError(`${trainer.name} n'est pas encore arrivé : réessaie dans un instant.`);
		if (run.battle) throw new RouteError('Un combat est en cours.');
		const alive = run.team.findIndex(member => member.hp > 0);
		if (alive > 0) run.team.unshift(...run.team.splice(alive, 1));
		const sets = run.team.map(member => ({
			name: nameOf(member.species), species: nameOf(member.species), item: member.item,
			ability: routeDex().species.get(member.species).abilities[0], moves: member.moves, nature: 'Hardy', gender: '',
			evs: { ...EVS }, ivs: { ...IVS }, level,
		}));
		const rules = [`Route Sac = ${bagRule(run.bag)}/${trainer.bag}`];
		if (run.team.some(member => member.hp < 100 || member.status)) rules.push(`Route PV = ${run.team.map(hpCode).join('.')}`);
		const room = Rooms.createBattle({
			format: `${formatFor(region)}@@@${rules.join(',')}`,
			players: [{ user, team: Teams.pack(sets) }, { user: bot, team: Teams.pack(trainerTeam(region, stage, run).map(toSet)) }],
			rated: false,
		});
		if (!room) throw new RouteError("Le combat n'a pas pu démarrer.");
		Training.imposed.set(room.roomid, { level: trainer.ai, multi: false, sets });
		run.battle = { roomid: room.roomid };
		return room.roomid;
	}

	/** Fin d'un combat : objets du sac utilisés, PV gardés pendant la Ligue, puis badge, évolutions… ou défaite. */
	battleEnded(roomid: string, winner: ID, lines: string[]) {
		const save = Object.values(this.saves).find(entry => entry.run?.battle?.roomid === roomid);
		const run = save?.run;
		if (!save || !run) return;
		run.battle = null;
		const region = regionOf(run);
		const stage = stageOf(run.badges, run.league);
		const trainer = trainerFor(region, stage);
		for (const line of lines) {
			const [, command, side, name] = line.split('|');
			if (command !== 'bagitem' || side !== 'p1') continue;
			const id = Object.keys(BAG_ITEMS).find(item => BAG_ITEMS[item].name === name);
			if (id && run.bag[id]) run.bag[id]--;
		}
		if (winner !== save.id) {
			this.lost(save, run, region, stage, trainer);
		} else {
			this.won(save, run, region, stage, trainer, lines);
		}
		this.save();
		const user = Users.get(save.id);
		if (user) this.send(user);
	}

	won(save: Save, run: Run, region: Region, stage: Stage, trainer: Trainer, lines: string[]) {
		const prize = prizeFor(stage);
		if (stage.kind === 'champion') {
			save.bonus = prize;
			save.completed = [...new Set([...save.completed, region.id])];
			run.phase = 'fin';
			this.log(run, `Victoire contre le Maître ${trainer.name} : ${region.name} est terminée !`);
			return;
		}
		run.money += prize;
		const before = this.level(run);
		if (stage.kind === 'gym') {
			run.badges++;
			const reward = trainer.reward ?? {};
			run.tms = [...new Set([...run.tms, ...(reward.tms ?? []) as ID[]])];
			run.held.push(...(reward.items ?? []) as ID[]);
			run.stones.push(...(reward.stones ?? []) as ID[]);
			this.log(run, `${trainer.badge ?? 'Badge'} obtenu contre ${trainer.name} · +${prize} ₽`);
			for (const member of run.team) Object.assign(member, { hp: 100, status: '' });
		} else {
			run.league++;
			this.log(run, `Victoire contre ${trainer.name} du Conseil 4 · +${prize} ₽`);
			const start = new Map(run.team.map(member => [nameOf(member.species), { hp: member.hp, status: member.status } as Condition]));
			const final = finalConditions(lines, 'p1', start);
			for (const member of run.team) Object.assign(member, final.get(nameOf(member.species)) ?? {});
			// Après le 4e membre du Conseil, l'équipe est soignée avant le Maître.
			if (run.league >= 4) for (const member of run.team) Object.assign(member, { hp: 100, status: '' });
		}
		const level = this.level(run);
		run.evolutions = level > before || stage.kind === 'gym' ? run.team
			.map((member, index) => ({ index, next: readyEvolution(member.species, region, level, run.badges) }))
			.filter(entry => entry.next)
			.map(entry => ({ index: entry.index, to: entry.next!.to })) : [];
		run.phase = run.evolutions.length ? 'evolution' : 'carte';
	}

	lost(save: Save, run: Run, region: Region, stage: Stage, trainer: Trainer) {
		if (stage.kind === 'champion' && !run.championRetry) {
			run.championRetry = true;
			for (const member of run.team) Object.assign(member, { hp: 100, status: '' });
			this.log(run, `Défaite contre le Maître ${trainer.name} : un dernier essai t'attend.`);
			return;
		}
		save.defeat = { region: region.id, against: trainer.name, attempt: run.attempt };
		this.log(run, `Défaite contre ${trainer.name}`);
		this.start(save, region.id);
	}

	/** Ce que le site affiche : régions, partie en cours, carte, équipe, boutique. */
	view(save: Save) {
		const run = save.run;
		const region = run ? loadRegion(run.region) : null;
		const regions = REGIONS.map((entry, index) => ({
			...entry,
			open: Boolean(loadRegion(entry.id)),
			completed: save.completed.includes(entry.id),
			unlocked: index === 0 || save.completed.includes(REGIONS[index - 1].id),
			attempts: save.attempts[entry.id] ?? 0,
		}));
		if (!run || !region) return { regions, run: null, bonus: save.bonus, defeat: save.defeat };
		const stage = stageOf(run.badges, run.league);
		const level = this.level(run);
		const trainerView = (trainer: Trainer, at: Stage, index: number) => {
			const done = at.kind === 'gym' ? index < run.badges : at.kind === 'elite' ? run.badges >= 8 && index < run.league : run.phase === 'fin';
			const current = !done && at.kind === stage.kind && (at.kind === 'champion' || index === (stage as { index: number }).index);
			return {
				id: trainer.id, name: trainer.name, type: trainer.type, city: trainer.city ?? null, badge: trainer.badge ?? null,
				sprite: trainer.sprite, strategy: trainer.strategy, bag: trainer.bag, done, current,
				level: Math.max(...trainerTeam(region, at, run).map(set => set.level)),
				team: trainerTeam(region, at, run).map(set => ({ species: set.species, level: set.level })),
				reward: trainer.reward ?? null, prize: prizeFor(at), teamLevel: teamLevel(region, at),
			};
		};
		return {
			regions, bonus: save.bonus, defeat: save.defeat,
			run: {
				region: region.id, name: region.name, mechanic: region.mechanic, tagline: region.tagline, attempt: run.attempt,
				phase: run.phase, badges: run.badges, league: run.league, level, money: run.money, trades: run.trades,
				championRetry: run.championRetry, battle: run.battle?.roomid ?? null,
				bag: run.bag, held: run.held, tms: run.tms, stones: run.stones, history: run.history,
				draw: run.draw.map(id => ({ species: id, evolutions: evolutionPaths(id, region), starter: region.starters.includes(id) })),
				team: run.team.map(member => ({
					...member, known: knownMoves(member.species, level, run.tms), evolutions: evolutionPaths(member.species, region),
				})),
				evolutions: run.evolutions,
				next: run.phase === 'fin' ? null : { stage, trainer: trainerView(trainerFor(region, stage), stage, stage.kind === 'champion' ? 0 : stage.index) },
				gyms: region.gyms.map((trainer, index) => trainerView(trainer, { kind: 'gym', index }, index)),
				elite: region.elite.map((trainer, index) => trainerView(trainer, { kind: 'elite', index }, index)),
				champion: trainerView(region.champion, { kind: 'champion' }, 0),
				shop: region.shop.map(entry => ({ ...entry, available: entry.from <= run.badges + 1 })),
			},
		};
	}

	send(user: User, error = '') {
		user.send(`|route|${JSON.stringify({ type: 'state', ...this.view(this.saveOf(user)), error })}`);
	}

	async act(user: User, action: AnyObject) {
		const save = this.saveOf(user);
		const index = Number(action.index);
		switch (action.type) {
		case 'region': {
			const run = save.run;
			if (run && run.region === toID(action.region) && run.phase !== 'fin') return;
			this.start(save, String(action.region ?? ''));
			save.defeat = null;
			return;
		}
		case 'garder': return void this.keep(save, Array.isArray(action.species) ? action.species : []);
		case 'attaques': return void this.setMoves(this.runOf(save), index, Array.isArray(action.moves) ? action.moves : []);
		case 'objet': return void this.equip(this.runOf(save), index, String(action.item ?? ''));
		case 'lead': return void this.lead(this.runOf(save), index);
		case 'acheter': return void this.buy(this.runOf(save), String(action.id ?? ''));
		case 'echanger': return void this.trade(this.runOf(save), index);
		case 'pierre': return void this.stone(this.runOf(save), index, String(action.stone ?? ''));
		case 'evoluer': return void this.evolve(this.runOf(save), index, Boolean(action.accepter));
		case 'oublier-defaite': save.defeat = null; return;
		case 'combattre': {
			const roomid = await this.fight(user, save);
			user.send(`|route|${JSON.stringify({ type: 'battle', roomid })}`);
			return;
		}
		}
		throw new RouteError('Action inconnue.');
	}
};

export const commands: Chat.ChatCommands = {
	route: {
		''(target, room, user) {
			Route.send(user);
		},
		async action(target, room, user) {
			let action: AnyObject = {};
			try {
				action = JSON.parse(target);
			} catch {
				return Route.send(user, 'Action illisible.');
			}
			try {
				await Route.act(user, action);
				Route.save();
				Route.send(user);
			} catch (error) {
				if (!(error instanceof RouteError)) throw error;
				Route.send(user, error.message);
			}
		},
	},
};

export const handlers: Chat.Handlers = {
	onBattleEnd(battle, winner) {
		Route.battleEnded(battle.roomid, winner, battle.room.log.log);
	},
};

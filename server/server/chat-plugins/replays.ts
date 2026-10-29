/**
 * Replays : à la fin de chaque combat, le serveur envoie son journal public (celui d'un spectateur, PV en %) à l'API,
 * qui le garde ; le site le rejoue tour par tour sur /replay/<id>. Sans ARENE_API_URL ni ARENE_API_SECRET, rien n'est gardé.
 */
import type { RoomBattle } from '../room-battle';
import { Arene } from './pokedraft';

/** Lignes sans intérêt pour revoir le combat : chat, arrivées et départs, minuteur, messages HTML du serveur. */
const SKIPPED = /^\|(c|c:|j|J|l|L|n|N|b|B|inactive|inactiveoff|t:|raw|html|uhtml|uhtmlchange|hidelines|unlink|bigerror)\|/;
const MAX_LOG = 4_000_000;

export function replayLog(log: string) {
	return log.split('\n').filter(line => line && !SKIPPED.test(line)).join('\n');
}

/** Ce que l'API garde d'un combat terminé, ou null pour un combat privé. */
export function replayPayload(battle: RoomBattle) {
	const room = battle.room;
	const { id, password } = room.getReplayData();
	if (password || room.settings.isPrivate || room.hideReplay) return null;
	const log = replayLog(room.getLog(0));
	if (!log || log.length > MAX_LOG) return null;
	const win = log.split('\n').findLast(line => line.startsWith('|win|'));
	return {
		id,
		format: battle.format,
		format_name: Dex.formats.get(battle.format, true).name,
		winner: win ? win.slice(5).slice(0, 30) : null,
		turns: battle.turn,
		rated: Boolean(room.rated),
		log,
		players: battle.players.map(player => ({ slot: player.slot, name: player.name.slice(0, 30), showdown_id: player.id })),
	};
}

export const handlers: Chat.Handlers = {
	onBattleEnd(battle) {
		if (!Arene.enabled) return;
		const payload = replayPayload(battle);
		if (!payload) return;
		Arene.request('POST', '/replays', payload).catch(error => {
			Monitor.warn(`Replay non enregistré (${battle.roomid}) : ${error.message}`);
		});
	},
};

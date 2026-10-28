/**
 * Relecture du journal d'un combat terminé : les PV (en %) et le statut de chaque Pokémon d'un joueur. Les lignes
 * `|split|pN` sont suivies de la version secrète (PV exacts) pour ce camp, puis de la version publique.
 */

export interface Condition {
	hp: number;
	status: string;
}

function applyCondition(entry: Condition, condition = '') {
	const [hp = '', status = ''] = condition.split(' ');
	if (status === 'fnt' || hp === '0') {
		entry.hp = 0;
		entry.status = '';
		return;
	}
	const [current, max] = hp.split('/').map(Number);
	if (max) entry.hp = Math.max(1, Math.round(current / max * 100));
	entry.status = status;
}

/** État final des Pokémon d'un camp (`p1`, `p3`…), par surnom ; `start` : leur état au début du combat. */
export function finalConditions(lines: string[], side: string, start: Map<string, Condition>) {
	const state = new Map([...start].map(([name, condition]) => [name, { ...condition }]));
	for (let index = 0; index < lines.length; index++) {
		let line = lines[index];
		const split = /^\|split\|(p\d)$/.exec(line);
		if (split) {
			line = (split[1] === side ? lines[index + 1] : lines[index + 2]) ?? '';
			index += 2;
		}
		const [, command = '', ident = '', ...rest] = line.split('|');
		if (!ident.startsWith(side)) continue;
		const entry = state.get(ident.slice(ident.indexOf(':') + 1).trim());
		if (!entry && command !== '-cureteam') continue;
		switch (command) {
		case 'switch': case 'drag': case 'replace':
			applyCondition(entry!, rest[1]);
			break;
		case '-damage': case '-heal': case '-sethp':
			applyCondition(entry!, rest[0]);
			break;
		case 'faint':
			entry!.hp = 0;
			entry!.status = '';
			break;
		case '-status':
			entry!.status = rest[0] ?? '';
			break;
		case '-curestatus':
			entry!.status = '';
			break;
		case '-cureteam':
			for (const other of state.values()) other.status = '';
			break;
		}
	}
	return state;
}

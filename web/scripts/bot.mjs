// Adversaire de test pour le serveur local : accepte les défis (combat libre et draft), drafte et joue au hasard.
// Usage : npm run bot -- [--url ws://…] [--name "Bot Test"] [--api http://localhost:8088/api [--ranked]]
// Avec --api et un mot de passe (ARENE_BOT_PASSWORD, ou --password), le bot se connecte à son compte Arène
// (créé au besoin) ; --ranked le met en file classée.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: options } = parseArgs({
  options: {
    url: { type: 'string', default: 'ws://localhost:8100/showdown/websocket' },
    name: { type: 'string', default: 'Bot Test' },
    api: { type: 'string' },
    password: { type: 'string', default: process.env.ARENE_BOT_PASSWORD },
    ranked: { type: 'boolean', default: false },
  },
});
const { url, name } = options;
const roster = JSON.parse(readFileSync(new URL('../../data/rosters/roster-saison-1.json', import.meta.url), 'utf8'));

const NATURE_PLUS = {
  lonely: 'atk', brave: 'atk', adamant: 'atk', naughty: 'atk', bold: 'def', relaxed: 'def', impish: 'def', lax: 'def',
  timid: 'spe', hasty: 'spe', jolly: 'spe', naive: 'spe', modest: 'spa', mild: 'spa', quiet: 'spa', rash: 'spa',
  calm: 'spd', gentle: 'spd', sassy: 'spd', careful: 'spd',
};
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

function packedSet(pokemon) {
  const set = pokemon.setParDefaut;
  const plus = NATURE_PLUS[set.natureId];
  const attack = pokemon.stats.atq >= pokemon.stats.atqSpe ? 'atk' : 'spa';
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  if (plus === 'def' || plus === 'spd') Object.assign(evs, { hp: 252, [plus]: 252, [plus === 'def' ? 'spd' : 'def']: 4 });
  else Object.assign(evs, { [plus === 'spe' || !plus ? attack : plus]: 252, spe: 252, hp: 4 });
  const moves = set.attaquesIds.filter(id => !set.horsMovepool.includes(id));
  return [pokemon.nom, pokemon.id, set.objetId, pokemon.talent.id, moves.join(','), set.natureId,
    STATS.map(stat => evs[stat] || '').join(','), '', '', '', '', ''].join('|');
}

const shuffle = list => [...list].sort(() => Math.random() - 0.5);

async function api(method, path, body, token) {
  const response = await fetch(`${options.api}${path}`, {
    method,
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(data.errors ?? data.message ?? data)}`);
  return data;
}

async function linkAccount() {
  const credentials = { name, password: options.password };
  const session = await api('POST', '/session', credentials).catch(() => api('POST', '/players', credentials));
  const { token } = await api('POST', '/me/showdown-tokens', undefined, session.token);
  send(`|/pokedraft auth ${token}`);
}

function searchRanked() {
  if (options.ranked) setTimeout(() => send('|/pokedraft search'), 2000);
}
const freeTeam = shuffle(roster.pokemon).slice(0, 6);
const handled = new Set();
const ws = new WebSocket(url);
const send = text => ws.send(text);

function onDraft(message) {
  if (message.type === 'account' && message.verified) {
    console.log('compte vérifié :', message.name);
    searchRanked();
  }
  if (message.type === 'result') console.log(`résultat classé : ${message.outcome}, ${message.points_delta} PL (${message.points_after}) ${message.note ?? ''}`);
  if (message.type === 'challenged' && message.active) {
    console.log('draft proposé par', message.from);
    send(`|/pokedraft accept ${message.from}`);
  }
  if (message.type === 'battle') console.log('combat de draft :', message.roomid);
  if (message.type === 'cancelled') {
    console.log('draft annulé :', message.reason);
    searchRanked();
  }
  if (message.type === 'error') console.log('erreur de draft :', message.message);
  if (message.type !== 'state' || !message.draft) return;
  const draft = message.draft;
  const step = `${draft.id}:${draft.phase}:${draft.picks.length}`;
  if (handled.has(step)) return;
  if (draft.phase === 'ban' && !draft.locked.mine) {
    handled.add(step);
    const bans = shuffle(roster.pokemon).slice(0, 3).map(p => p.id);
    setTimeout(() => {
      send(`|/pokedraft bans ${bans.join(',')}`);
      send('|/pokedraft lockbans');
    }, 1500);
  } else if (draft.phase === 'pick' && draft.turn?.mine) {
    handled.add(step);
    const taken = new Set([...draft.bans.mine, ...draft.bans.theirs, ...draft.picks.map(pick => pick.id)]);
    const choice = shuffle(roster.pokemon.filter(p => !taken.has(p.id)))[0];
    setTimeout(() => send(`|/pokedraft pick ${choice.id}`), 1200);
  } else if (draft.phase === 'prep' && !draft.ready.mine) {
    handled.add(step);
    setTimeout(() => send('|/pokedraft team'), 1500);
  }
}

function onRequest(room, request) {
  if (request.wait) return;
  let choice;
  if (request.teamPreview) {
    choice = 'team 123456';
  } else if (request.forceSwitch) {
    const slot = request.side.pokemon.findIndex(p => !p.active && !p.condition.endsWith(' fnt'));
    choice = `switch ${slot + 1}`;
  } else {
    const moves = request.active[0].moves.map((move, index) => ({ ...move, index })).filter(move => !move.disabled && move.pp > 0);
    choice = moves.length ? `move ${shuffle(moves)[0].index + 1}` : 'move 1';
  }
  setTimeout(() => send(`${room}|/choose ${choice}|${request.rqid}`), 400);
}

ws.onmessage = (event) => {
  const lines = String(event.data).split('\n');
  const room = lines[0].startsWith('>') ? lines[0].slice(1) : '';
  for (const line of lines) {
    if (line.startsWith('|challstr|')) send(`|/trn ${name}`);
    else if (line.startsWith('|updateuser|') && line.includes(name)) {
      console.log('connecté :', name, '· équipe de combat libre :', freeTeam.map(p => p.nom).join(', '));
      if (options.api && options.password) linkAccount().catch(error => console.log('compte Arène :', error.message));
    }
    else if (line.startsWith('|pokedraft|')) onDraft(JSON.parse(line.slice('|pokedraft|'.length)));
    else if (line.startsWith('|pm|') && line.includes('/challenge gen9pokedraft')) {
      const from = line.split('|')[2].slice(1);
      console.log('défi de combat libre de', from);
      send(`|/utm ${freeTeam.map(packedSet).join(']')}`);
      send(`|/accept ${from}`);
    } else if (line.startsWith('|request|') && line.length > 9) onRequest(room, JSON.parse(line.slice(9)));
    else if (line.startsWith('|win|') || line === '|tie') {
      console.log('fin du combat :', line);
      send(`|/leave ${room}`);
      searchRanked();
    }
    else if (line.startsWith('|error|')) console.log('erreur :', line);
  }
};
ws.onclose = () => {
  console.log('déconnecté');
  process.exit(0);
};

// Adversaire de test pour le serveur local : accepte les défis (combat libre et draft), drafte et joue au hasard.
// Usage : npm run bot -- [url du websocket] [pseudo]
import { readFileSync } from 'node:fs';

const url = process.argv[2] ?? 'ws://localhost:8100/showdown/websocket';
const name = process.argv[3] ?? 'Bot Test';
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
const freeTeam = shuffle(roster.pokemon).slice(0, 6);
const handled = new Set();
const ws = new WebSocket(url);
const send = text => ws.send(text);

function onDraft(message) {
  if (message.type === 'challenged' && message.active) {
    console.log('draft proposé par', message.from);
    send(`|/pokedraft accept ${message.from}`);
  }
  if (message.type === 'battle') console.log('combat de draft :', message.roomid);
  if (message.type === 'cancelled') console.log('draft annulé :', message.reason);
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
    else if (line.startsWith('|updateuser|') && line.includes(name)) console.log('connecté :', name, '· équipe de combat libre :', freeTeam.map(p => p.nom).join(', '));
    else if (line.startsWith('|pokedraft|')) onDraft(JSON.parse(line.slice('|pokedraft|'.length)));
    else if (line.startsWith('|pm|') && line.includes('/challenge gen9pokedraft')) {
      const from = line.split('|')[2].slice(1);
      console.log('défi de combat libre de', from);
      send(`|/utm ${freeTeam.map(packedSet).join(']')}`);
      send(`|/accept ${from}`);
    } else if (line.startsWith('|request|') && line.length > 9) onRequest(room, JSON.parse(line.slice(9)));
    else if (line.startsWith('|win|') || line === '|tie') console.log('fin du combat :', line);
    else if (line.startsWith('|error|')) console.log('erreur :', line);
  }
};
ws.onclose = () => {
  console.log('déconnecté');
  process.exit(0);
};

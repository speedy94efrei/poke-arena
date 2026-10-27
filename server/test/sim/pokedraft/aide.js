'use strict';

const common = require('./../../common');

const FORMAT = 'gen9pokedraft@@@^!Team Preview,^!Obtainable,!Species Clause,!Sleep Clause Mod';

function combat(p1, p2, options = {}) {
	return common.createBattle({ formatid: FORMAT, ...options }, [p1, p2]);
}

/** Dégâts infligés au Pokémon de p2 par l'attaque de p1 au premier tour. `avant` prépare le combat. */
function degats(attaquant, defenseur, attaque, avant, options) {
	const battle = combat([attaquant], [defenseur], options);
	if (avant) avant(battle);
	const cible = battle.p2.active[0];
	const pvAvant = cible.hp;
	battle.makeChoices(`move ${attaque}`, 'move sleeptalk');
	const resultat = pvAvant - cible.hp;
	battle.destroy();
	return resultat;
}

/** Côté qui a agi en premier au dernier tour joué. */
function premierAAgir(battle) {
	const tours = battle.log.filter(line => line.startsWith('|turn|'));
	const debut = battle.log.lastIndexOf(tours[tours.length - (battle.ended ? 1 : 2)]);
	const coup = battle.log.slice(debut + 1).find(line => line.startsWith('|move|'));
	return coup ? coup.slice(6, 8) : null;
}

/** Nombre de combats, sur `n` graines fixes, où `essai(seed)` renvoie vrai. */
function frequence(n, essai) {
	let fois = 0;
	for (let i = 1; i <= n; i++) {
		if (essai(`gen5,${(i * 2654435761).toString(16).padStart(16, '0').slice(-16)}`)) fois++;
	}
	return fois;
}

module.exports = { combat, degats, premierAAgir, frequence };

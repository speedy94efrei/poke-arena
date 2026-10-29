// Talents qui protègent toute l'équipe, même depuis le banc : leur effet vit dans une condition de camp.
// Elle est posée à la première entrée en jeu, quand tous les Pokémon de départ sont sur le terrain.
const TALENTS_D_EQUIPE = ['sagedelaforet', 'majordome'];

/**
 * PV (en %) et statut de départ des Pokémon des joueurs (camps p1 et p3), gardés du combat précédent :
 * « 64brn.100/100.38par », un groupe par joueur, un code par Pokémon dans l'ordre de l'équipe ; 0 pour un Pokémon K.O.
 */
export function applyKeptHp(battle: Battle, value: string) {
	const players = battle.sides.filter(side => side.n % 2 === 0);
	value.split('/').forEach((entry, index) => {
		const side = players[index];
		if (!side) return;
		entry.split('.').forEach((slot, position) => {
			const pokemon = side.pokemon[position];
			const match = /^(\d+)(brn|par|psn|tox|slp|frz)?$/.exec(slot);
			if (!pokemon || !match) return;
			if (Number(match[1]) === 0) {
				// K.O. au combat précédent (Ligue de la Route des Ligues) : il reste K.O., jamais en tête d'équipe.
				pokemon.hp = 0;
				pokemon.fainted = true;
				side.pokemonLeft--;
				return;
			}
			pokemon.hp = Math.max(1, Math.min(pokemon.maxhp, Math.ceil(pokemon.maxhp * Number(match[1]) / 100)));
			const status = match[2] as ID | undefined;
			if (!status) return;
			pokemon.status = status;
			pokemon.statusState = battle.initEffectState({ id: status, target: pokemon });
			if (status === 'slp') pokemon.statusState.startTime = pokemon.statusState.time = battle.random(2, 5);
			if (status === 'tox') pokemon.statusState.stage = 0;
		});
	});
}

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	pokedraftmod: {
		effectType: 'Rule',
		name: 'PokeDraft Mod',
		desc: "Règles propres au mod PokéDraft : talents d'équipe actifs depuis le banc.",
		onSwitchIn() {
			for (const side of this.sides) {
				for (const talent of TALENTS_D_EQUIPE) {
					if (side.sideConditions[talent]) continue;
					const porteur = side.pokemon.find(pokemon => pokemon.baseAbility === talent);
					if (porteur) side.addSideCondition(talent, porteur);
				}
			}
		},
	},
	// Roguelike : les joueurs sont les camps pairs (p1, et p3 en coop), l'IA les camps impairs.
	roguelikepv: {
		effectType: 'Rule',
		name: 'Roguelike PV',
		desc: "PV (en %) et statut de départ de chaque Pokémon des joueurs, gardés du combat précédent : « 64brn.100/100.38par ».",
		hasValue: true,
		onValidateRule(value) {
			if (!/^[0-9a-z./]+$/.test(value)) throw new Error(`Roguelike PV : valeur invalide « ${value} ».`);
		},
		onBegin() {
			applyKeptHp(this, this.ruleTable.valueRules.get('roguelikepv') ?? '');
		},
	},
	roguelikeboss: {
		effectType: 'Rule',
		name: 'Roguelike Boss',
		desc: "Règle d'un gros boss : « pieges » (Piège de Roc et Picots déjà posés chez les joueurs) ou « lead » (son Pokémon de tête commence à +1 partout).",
		hasValue: true,
		onValidateRule(value) {
			if (!['pieges', 'lead'].includes(value)) throw new Error(`Roguelike Boss : règle inconnue « ${value} ».`);
		},
		onBegin() {
			if (this.ruleTable.valueRules.get('roguelikeboss') !== 'pieges') return;
			// Aucun Pokémon n'est encore sur le terrain : les pièges sont posés sans passer par leurs événements.
			for (const side of this.sides) {
				if (side.n % 2 !== 0) continue;
				for (const [id, name] of [['stealthrock', 'Stealth Rock'], ['spikes', 'Spikes']]) {
					side.sideConditions[id] = this.initEffectState({ id, target: side, layers: 1 });
					this.add('-sidestart', side, `move: ${name}`);
				}
			}
		},
		onSwitchIn(pokemon) {
			if (this.turn !== 0 || pokemon.side.n % 2 === 0 || this.ruleTable.valueRules.get('roguelikeboss') !== 'lead') return;
			this.boost({ atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, pokemon, pokemon);
		},
	},
	roguelikebonus: {
		effectType: 'Rule',
		name: 'Roguelike Bonus',
		desc: "Bonus de stats des Pokémon de l'IA, en %, à partir de l'étage 30.",
		hasValue: 'positive-integer',
		onModifyAtkPriority: 1,
		onModifyAtk(atk, pokemon) {
			return roguelikeBonus(this, pokemon);
		},
		onModifyDefPriority: 1,
		onModifyDef(def, pokemon) {
			return roguelikeBonus(this, pokemon);
		},
		onModifySpAPriority: 1,
		onModifySpA(spa, pokemon) {
			return roguelikeBonus(this, pokemon);
		},
		onModifySpDPriority: 1,
		onModifySpD(spd, pokemon) {
			return roguelikeBonus(this, pokemon);
		},
		onModifySpe(spe, pokemon) {
			if (pokemon.side.n % 2 === 0) return;
			return this.modify(spe, 100 + Number(this.ruleTable.valueRules.get('roguelikebonus')), 100);
		},
	},
};

function roguelikeBonus(battle: Battle, pokemon: Pokemon) {
	if (pokemon.side.n % 2 === 0) return;
	return battle.chainModify([4096 + Math.round(40.96 * Number(battle.ruleTable.valueRules.get('roguelikebonus'))), 4096]);
}

'use strict';
// Pokédex complet de l'univers Classique : Pokémon, attaques, talents et objets du simulateur Showdown,
// avec les noms et descriptions en français de PokéAPI (fichiers CSV gardés dans data/cache/pokeapi).
// Écrit aussi les attaques que chaque Pokémon peut apprendre (Écarlate et Violet, puis le surplus du Dex national).
// Construire d'abord le serveur (`node build` dans server/).
//   node data/scripts/build_dex.cjs server data/references/dex.json data/references/learnsets.json

const fs = require('fs');
const path = require('path');

const [serverDir, outPath, learnsetsPath] = process.argv.slice(2);
const { Dex } = require(path.resolve(serverDir, 'dist/sim/dex'));
Dex.includeData();
const toID = Dex.toID;

const CSV_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const CACHE = path.resolve(__dirname, '../cache/pokeapi');
const FRENCH = '5';
const ENGLISH = '9';
const EXCLUDED = new Set(['CAP', 'Custom', 'LGPE', 'Pokestar', 'Future']);
const TYPES = {
	Normal: 'Normal', Fire: 'Feu', Water: 'Eau', Grass: 'Plante', Electric: 'Électrik', Ice: 'Glace', Fighting: 'Combat',
	Poison: 'Poison', Ground: 'Sol', Flying: 'Vol', Psychic: 'Psy', Bug: 'Insecte', Rock: 'Roche', Ghost: 'Spectre',
	Dragon: 'Dragon', Dark: 'Ténèbres', Steel: 'Acier', Fairy: 'Fée', Stellar: 'Stellaire', '???': '???',
};
const CATEGORIES = { Physical: 'Physique', Special: 'Spéciale', Status: 'Statut' };

/** Lecteur CSV : guillemets, guillemets doublés et retours à la ligne dans les champs. */
function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (char === '"') {
				quoted = false;
			} else {
				field += char;
			}
		} else if (char === '"') {
			quoted = true;
		} else if (char === ',') {
			row.push(field);
			field = '';
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else {
			field += char;
		}
	}
	if (field || row.length) rows.push([...row, field]);
	const [header, ...data] = rows;
	return data.filter(cells => cells.length === header.length).map(cells => Object.fromEntries(header.map((key, index) => [key, cells[index]])));
}

async function csv(name) {
	fs.mkdirSync(CACHE, { recursive: true });
	const file = path.join(CACHE, `${name}.csv`);
	if (!fs.existsSync(file)) {
		const response = await fetch(`${CSV_URL}/${name}.csv`);
		if (!response.ok) throw new Error(`${name}.csv : ${response.status}`);
		fs.writeFileSync(file, await response.text());
	}
	return parseCsv(fs.readFileSync(file, 'utf8'));
}

/** Noms français indexés par l'identifiant Showdown, en passant par le nom anglais de la même ligne PokéAPI. */
function namesById(rows, key) {
	const byResource = new Map();
	for (const row of rows) {
		const entry = byResource.get(row[key]) ?? {};
		if (row.local_language_id === ENGLISH) entry.en = row.name;
		if (row.local_language_id === FRENCH) entry.fr = row.name;
		byResource.set(row[key], entry);
	}
	const result = new Map();
	for (const [resource, { en, fr }] of byResource) if (en && fr) result.set(toID(en), { fr, resource });
	return result;
}

/** Texte de jeu français le plus récent de chaque ressource. */
function latestFlavor(rows, key) {
	const result = new Map();
	for (const row of rows) {
		if (row.language_id !== FRENCH) continue;
		const current = result.get(row[key]);
		const version = Number(row.version_group_id);
		if (!current || version > current.version) result.set(row[key], { version, text: row.flavor_text.replace(/\\n|\s+/g, ' ').replace(/ {2,}/g, ' ').trim() });
	}
	return new Map([...result].map(([id, value]) => [id, value.text]));
}

const kept = entry => entry.exists && !EXCLUDED.has(entry.isNonstandard);

(async () => {
	const [speciesNames, forms, formNames, moveNames, abilityNames, itemNames, moveFlavor, abilityFlavor, itemFlavor] = await Promise.all([
		csv('pokemon_species_names'), csv('pokemon_forms'), csv('pokemon_form_names'), csv('move_names'), csv('ability_names'),
		csv('item_names'), csv('move_flavor_text'), csv('ability_flavor_text'), csv('item_flavor_text'),
	]);

	const speciesFr = new Map(speciesNames.filter(row => row.local_language_id === FRENCH).map(row => [Number(row.pokemon_species_id), row.name]));
	const formFrById = new Map(formNames.filter(row => row.local_language_id === FRENCH && (row.pokemon_name || row.form_name)).map(row => [row.pokemon_form_id, row]));
	const formFr = new Map();
	for (const form of forms) {
		const row = formFrById.get(form.id);
		if (row) formFr.set(toID(form.identifier), { full: row.pokemon_name, form: row.form_name });
	}
	// Les identifiants de forme de PokéAPI sont parfois plus longs que ceux de Showdown (« ogerpon-wellspring-mask »).
	const formOf = species => formFr.get(species.id) ?? [...formFr].find(([id]) => id.startsWith(species.id))?.[1];
	const frenchName = (species) => {
		const base = speciesFr.get(species.num);
		if (!species.forme) return formFr.get(species.id)?.full || base || species.name;
		const form = formOf(species);
		if (form?.full) return form.full;
		if (base) return `${base} (${form?.form || species.forme})`;
		return species.name;
	};

	const pokemon = {};
	for (const species of Dex.species.all()) {
		if (!kept(species) || species.num <= 0) continue;
		pokemon[species.id] = {
			name: species.name,
			nom: frenchName(species),
			num: species.num,
			sprite: species.spriteid,
			types: species.types.map(type => TYPES[type]),
			stats: species.baseStats,
			abilities: Object.values(species.abilities),
			tier: species.tier,
			natDexTier: species.natDexTier,
			gen: species.gen,
			...(species.forme ? { baseSpecies: toID(species.baseSpecies), forme: species.forme } : {}),
			...(species.isNonstandard ? { nonstandard: species.isNonstandard } : {}),
			weight: species.weightkg,
		};
	}

	const movesFr = namesById(moveNames, 'move_id');
	const moveText = latestFlavor(moveFlavor, 'move_id');
	const moves = {};
	for (const move of Dex.moves.all()) {
		if (!kept(move) || move.isMax || move.isZ) continue;
		const french = movesFr.get(move.id);
		moves[move.id] = {
			name: move.name,
			nom: french?.fr ?? move.name,
			type: TYPES[move.type],
			category: CATEGORIES[move.category],
			power: move.basePower,
			accuracy: move.accuracy === true ? null : move.accuracy,
			pp: move.pp,
			priority: move.priority,
			description: (french && moveText.get(french.resource)) ?? move.shortDesc,
			...(move.isNonstandard ? { nonstandard: move.isNonstandard } : {}),
		};
	}

	const abilitiesFr = namesById(abilityNames, 'ability_id');
	const abilityText = latestFlavor(abilityFlavor, 'ability_id');
	const abilities = {};
	for (const ability of Dex.abilities.all()) {
		if (!kept(ability) || !ability.num) continue;
		const french = abilitiesFr.get(ability.id);
		abilities[ability.id] = {
			name: ability.name,
			nom: french?.fr ?? ability.name,
			description: (french && abilityText.get(french.resource)) ?? ability.shortDesc,
		};
	}

	const itemsFr = namesById(itemNames, 'item_id');
	const itemText = latestFlavor(itemFlavor, 'item_id');
	const items = {};
	for (const item of Dex.items.all()) {
		if (!kept(item)) continue;
		const french = itemsFr.get(item.id);
		items[item.id] = {
			name: item.name,
			nom: french?.fr ?? item.name,
			sprite: item.spritenum,
			description: ((french && itemText.get(french.resource)) ?? item.shortDesc ?? '').replace(/^Objet à tenir\. /, ''),
			...(item.isNonstandard ? { nonstandard: item.isNonstandard } : {}),
		};
	}

	const dex = { pokemon, moves, abilities, items };
	fs.writeFileSync(outPath, JSON.stringify(dex));

	const learnsets = {};
	for (const id of Object.keys(pokemon)) {
		const current = [...Dex.species.getMovePool(id)].filter(move => moves[move]).sort();
		const extra = [...Dex.species.getMovePool(id, true)].filter(move => moves[move] && !current.includes(move)).sort();
		learnsets[id] = [current, extra];
	}
	fs.writeFileSync(learnsetsPath, JSON.stringify(learnsets));
	console.log(`attaques apprises : ${(fs.statSync(learnsetsPath).size / 1024).toFixed(0)} Ko`);
	const missing = kind => Object.values(dex[kind]).filter(entry => entry.nom === entry.name).length;
	console.log(`${Object.keys(pokemon).length} Pokémon, ${Object.keys(moves).length} attaques, ${Object.keys(abilities).length} talents, ${Object.keys(items).length} objets`);
	console.log(`sans nom français : ${missing('pokemon')} Pokémon, ${missing('moves')} attaques, ${missing('abilities')} talents, ${missing('items')} objets`);
	console.log(`${(fs.statSync(outPath).size / 1024).toFixed(0)} Ko`);
})();

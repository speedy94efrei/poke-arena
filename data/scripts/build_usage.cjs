'use strict';
// Statistiques d'usage Smogon, compactées par format : les Pokémon les plus joués avec leurs objets, talents,
// attaques, types Téra, répartitions d'EV et coéquipiers, et la part de chaque style d'équipe (tags « metagame »).
// Source : pkmn.github.io/smogon (fichiers mensuels de smogon.com/stats), gardée dans data/cache/usage.
//   node data/scripts/build_usage.cjs data/references/usage

const fs = require('fs');
const path = require('path');

const [outDir] = process.argv.slice(2);
const SOURCE = 'https://pkmn.github.io/smogon/data/stats';
const CACHE = path.resolve(__dirname, '../cache/usage');
const TOP = { pokemon: 40, items: 4, abilities: 3, moves: 8, tera: 3, spreads: 2, teammates: 6, counters: 4, styles: 14 };
// Au-delà du top, les Pokémon joués dans au moins 0,5 % des équipes gardent un set plus court : assez pour l'Atelier.
const RARE = { pokemon: 160, minUsage: 0.005, items: 3, abilities: 3, moves: 6, tera: 2, spreads: 1, teammates: 4, counters: 0 };
const CONCURRENCY = 4;

const toID = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '');
const round = value => Math.round(value * 10000) / 10000;
const top = (record, count, key = toID) => Object.entries(record ?? {})
	.sort((a, b) => (Array.isArray(b[1]) ? b[1][0] : b[1]) - (Array.isArray(a[1]) ? a[1][0] : a[1]))
	.slice(0, count)
	.map(([name, value]) => [key(name), round(Array.isArray(value) ? value[1] : value)]);

async function source(file) {
	fs.mkdirSync(CACHE, { recursive: true });
	const cached = path.join(CACHE, file);
	if (!fs.existsSync(cached)) {
		const response = await fetch(`${SOURCE}/${file}`);
		if (!response.ok) throw new Error(`${file} : ${response.status}`);
		fs.writeFileSync(cached, Buffer.from(await response.arrayBuffer()));
	}
	return JSON.parse(fs.readFileSync(cached, 'utf8'));
}

function compact(format, stats) {
	const pokemon = Object.entries(stats.pokemon)
		.sort((a, b) => b[1].usage.weighted - a[1].usage.weighted)
		.filter(([, entry], index) => index < TOP.pokemon || (index < RARE.pokemon && entry.usage.weighted >= RARE.minUsage))
		.map(([name, entry], index) => {
			const limits = index < TOP.pokemon ? TOP : RARE;
			return {
				id: toID(name),
				usage: round(entry.usage.weighted),
				items: top(entry.items, limits.items),
				abilities: top(entry.abilities, limits.abilities),
				moves: top(entry.moves, limits.moves),
				tera: top(entry.teraTypes, limits.tera, name => name),
				spreads: top(entry.spreads, limits.spreads, name => name),
				teammates: top(entry.teammates, limits.teammates),
				counters: top(entry.counters, limits.counters),
			};
		});
	const styles = Object.entries(stats.metagame?.tags ?? {}).sort((a, b) => b[1] - a[1]).slice(0, TOP.styles).map(([tag, share]) => [tag, round(share)]);
	return { format, battles: stats.battles, pokemon, styles };
}

(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const index = await (await fetch(`${SOURCE}/index.json`)).json();
	const files = Object.keys(index);
	const summary = [];
	let next = 0;
	await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
		while (next < files.length) {
			const file = files[next++];
			const format = file.replace(/\.json$/, '');
			try {
				const data = compact(format, await source(file));
				fs.writeFileSync(path.join(outDir, file), JSON.stringify(data));
				summary.push({ format, battles: data.battles });
			} catch (error) {
				console.log(`${format} ignoré : ${error.message}`);
			}
		}
	}));
	summary.sort((a, b) => a.format.localeCompare(b.format));
	fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), formats: summary }));
	const size = fs.readdirSync(outDir).reduce((total, file) => total + fs.statSync(path.join(outDir, file)).size, 0);
	console.log(`${summary.length} formats, ${(size / 1024).toFixed(0)} Ko`);
})();

/**
 * Ajoute à chaque fiche générée les effets codés à la main. Un effet sans fiche
 * modifie l'entrée officielle du même id (talent ou attaque officiels améliorés).
 */
export function avecEffets<Table extends object>(fiches: Table, effets: { [id: string]: object }): Table {
	const source = fiches as { [id: string]: object };
	const table: { [id: string]: object } = { ...source };
	for (const [id, effet] of Object.entries(effets)) {
		table[id] = { ...(source[id] ?? { inherit: true }), ...effet };
	}
	return table as Table;
}

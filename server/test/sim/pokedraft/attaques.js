'use strict';

const assert = require('./../../assert');
const { combat, degats, premierAAgir, frequence } = require('./aide');

let battle;

const CIBLE = { species: 'Snorlax', ability: 'runaway', moves: ['sleeptalk'] };
const RESERVE = { species: 'Chansey', ability: 'runaway', moves: ['sleeptalk'] };

function lanceur(move, species = 'Mew') {
	return { species, ability: 'runaway', moves: [move] };
}

describe('PokéDraft · signatures', () => {
	afterEach(() => {
		battle?.destroy();
		battle = null;
	});

	for (const move of ['glissebanquise', 'envoleclair', 'rubanretour', 'overdrive', 'phareabyssal']) {
		it(`${move} fait ressortir le lanceur`, () => {
			battle = combat([lanceur(move), RESERVE], [CIBLE]);
			battle.makeChoices(`move ${move}`, 'move sleeptalk');
			assert.equal(battle.p1.requestState, 'switch');
		});
	}

	it('Phare Abyssal soigne 1/8 des PV du lanceur', () => {
		battle = combat([lanceur('phareabyssal'), RESERVE], [CIBLE]);
		const mew = battle.p1.active[0];
		mew.sethp(100);
		battle.makeChoices('move phareabyssal', 'move sleeptalk');
		assert.equal(mew.hp, 100 + Math.floor(mew.baseMaxhp / 8));
	});

	for (const [move, condition] of [['eboulissismique', 'stealthrock'], ['coupdecarapace', 'spikes'], ['crachatdegravier', 'spikes'], ['barbbarrage', 'toxicspikes']]) {
		it(`${move} pose ${condition} chez l'adversaire`, () => {
			battle = combat([lanceur(move)], [CIBLE]);
			battle.makeChoices(`move ${move}`, 'move sleeptalk');
			assert(battle.p2.sideConditions[condition]);
		});
	}

	for (const move of ['brasierpurifiant', 'ventilofeuilles', 'souffledutombeau']) {
		it(`${move} retire les pièges de son côté`, () => {
			battle = combat([lanceur(move)], [{ species: 'Slowbro', ability: 'runaway', moves: ['sleeptalk'] }]);
			battle.p1.addSideCondition('spikes', battle.p2.active[0]);
			battle.p1.addSideCondition('stealthrock', battle.p2.active[0]);
			battle.makeChoices(`move ${move}`, 'move sleeptalk');
			assert.false(battle.p1.sideConditions['spikes']);
			assert.false(battle.p1.sideConditions['stealthrock']);
		});
	}

	for (const [move, status, bornes] of [['souffledesenfers', 'brn', [8, 30]], ['gazardent', 'brn', [8, 30]], ['blizzardsacre', 'frz', [1, 14]]]) {
		it(`${move} inflige ${status} avec la bonne probabilité`, () => {
			const fois = frequence(60, seed => {
				const b = combat([lanceur(move)], [CIBLE], { seed });
				b.makeChoices(`move ${move}`, 'move sleeptalk');
				const touche = b.p2.active[0].status === status;
				b.destroy();
				return touche;
			});
			assert.bounded(fois, bornes);
		});
	}

	it('Croc Tyrannique est une morsure qui peut apeurer', () => {
		battle = combat([lanceur('croctyrannique', 'Ninjask')], [{ species: 'Snorlax', ability: 'runaway', moves: ['tackle'] }], { forceRandomChance: true });
		assert(battle.dex.moves.get('croctyrannique').flags['bite']);
		battle.makeChoices('move croctyrannique', 'move tackle');
		assert(battle.log.some(line => line.startsWith('|cant|p2a') && line.includes('flinch')));
	});

	for (const move of ['bourrasqueboreale', 'linceuldefeuilles', 'ruadedeboue']) {
		it(`${move} baisse la Vitesse de la cible`, () => {
			battle = combat([lanceur(move)], [CIBLE]);
			battle.makeChoices(`move ${move}`, 'move sleeptalk');
			assert.statStage(battle.p2.active[0], 'spe', -1);
		});
	}

	it('Griffe Glacée baisse la Vitesse avec 30 % de chance', () => {
		const fois = frequence(60, seed => {
			const b = combat([lanceur('griffeglacee')], [CIBLE], { seed });
			b.makeChoices('move griffeglacee', 'move sleeptalk');
			const baisse = b.p2.active[0].boosts.spe === -1;
			b.destroy();
			return baisse;
		});
		assert.bounded(fois, [8, 30]);
	});

	it('Corne Catapulte force la cible à sortir avec 30 % de chance', () => {
		const fois = frequence(60, seed => {
			const b = combat([lanceur('cornecatapulte')], [CIBLE, RESERVE], { seed });
			b.makeChoices('move cornecatapulte', 'move sleeptalk');
			const ejecte = b.p2.active[0].species.name === 'Chansey';
			b.destroy();
			return ejecte;
		});
		assert.bounded(fois, [8, 30]);
	});

	it('Charge Blindée calcule ses dégâts avec la Défense', () => {
		const sansBaisse = degats(lanceur('chargeblindee', 'Corviknight'), CIBLE, 'chargeblindee');
		const avecBaisse = degats(lanceur('chargeblindee', 'Corviknight'), CIBLE, 'chargeblindee', b => b.p1.active[0].setBoost({ atk: -6 }));
		assert.equal(avecBaisse, sansBaisse);
	});

	it('Choc Primitif ignore les talents défensifs', () => {
		const cible = ability => ({ species: 'Snorlax', ability, moves: ['sleeptalk'] });
		const avecTalent = degats(lanceur('chocprimitif'), cible('fluffy'), 'chocprimitif');
		const sansTalent = degats(lanceur('chocprimitif'), cible('runaway'), 'chocprimitif');
		assert.equal(avecTalent, sansTalent);
	});

	it('Chant des Dunes touche les Vol et Lévitation', () => {
		assert(degats(lanceur('chantdesdunes'), { species: 'Corviknight', moves: ['sleeptalk'] }, 'chantdesdunes') > 0);
		assert(degats(lanceur('chantdesdunes'), { species: 'Bronzong', ability: 'levitate', moves: ['sleeptalk'] }, 'chantdesdunes') > 0);
	});

	it('Ailes de Coton soigne 25 % des PV du lanceur', () => {
		battle = combat([lanceur('ailesdecoton')], [CIBLE]);
		const mew = battle.p1.active[0];
		mew.sethp(100);
		battle.makeChoices('move ailesdecoton', 'move sleeptalk');
		assert.equal(mew.hp, 100 + Math.floor(mew.baseMaxhp / 4));
	});

	it('Éclair Perçant donne +1 Atq et +1 Vit en mettant K.O.', () => {
		battle = combat([lanceur('eclairpercant')], [{ species: 'Pichu', level: 1, moves: ['sleeptalk'] }, RESERVE]);
		battle.makeChoices('move eclairpercant', 'move sleeptalk');
		assert.statStage(battle.p1.active[0], 'atk', 1);
		assert.statStage(battle.p1.active[0], 'spe', 1);
	});

	it('Riposte Kaiju double sa puissance si le lanceur a été touché ce tour', () => {
		battle = combat([lanceur('ripostekaiju', 'Duraludon')], [CIBLE]);
		const [duralugon, cible] = [battle.p1.active[0], battle.p2.active[0]];
		const move = battle.dex.getActiveMove('ripostekaiju');
		assert.equal(move.basePowerCallback.call(battle, duralugon, cible, move), 80);
		duralugon.attackedBy.push({ source: cible, damage: 30, thisTurn: true, move: 'tackle', slot: cible.getSlot() });
		assert.equal(move.basePowerCallback.call(battle, duralugon, cible, move), 160);
	});

	it('Paume d\'Aura gagne +1 priorité contre une cible sous la moitié des PV', () => {
		battle = combat([lanceur('paumedaura', 'Snorlax')], [{ species: 'Ninjask', ability: 'runaway', moves: ['growl'] }]);
		battle.makeChoices('move paumedaura', 'move growl');
		assert.equal(premierAAgir(battle), 'p2');
		battle.p2.active[0].sethp(10);
		battle.makeChoices('move paumedaura', 'move growl');
		assert.equal(premierAAgir(battle), 'p1');
	});

	it('Coup de Poireau fait un critique contre une cible boostée', () => {
		battle = combat([lanceur('coupdepoireau')], [CIBLE]);
		battle.p2.active[0].setBoost({ def: 1 });
		battle.makeChoices('move coupdepoireau', 'move sleeptalk');
		assert(battle.log.some(line => line.startsWith('|-crit|')));
	});

	it('Danse Aquatique passe à 90 de puissance sous la pluie', () => {
		battle = combat([{ species: 'Quaquaval', ability: 'drizzle', moves: ['aquastep'] }], [CIBLE]);
		const move = battle.dex.getActiveMove('aquastep');
		const puissance = move.basePowerCallback.call(battle, battle.p1.active[0], battle.p2.active[0], move);
		assert.equal(puissance, 90);
	});

	it('Étreinte Venimeuse empoisonne et empêche de sortir pendant 2 tours', () => {
		battle = combat([lanceur('etreintevenimeuse')], [CIBLE, RESERVE]);
		battle.makeChoices('move etreintevenimeuse', 'move sleeptalk');
		assert.equal(battle.p2.active[0].status, 'psn');
		assert.trapped(() => battle.makeChoices('move etreintevenimeuse', 'switch 2'));
		battle.makeChoices('move etreintevenimeuse', 'move sleeptalk');
		assert.trapped(() => battle.makeChoices('move etreintevenimeuse', 'switch 2'));
		battle.makeChoices('move etreintevenimeuse', 'move sleeptalk');
		battle.makeChoices('move etreintevenimeuse', 'switch 2');
		assert.species(battle.p2.active[0], 'Chansey');
	});

	it('Plein Gaz soigne 33 % et donne +1 Vit, même avec tous ses PV', () => {
		battle = combat([lanceur('pleingaz')], [CIBLE]);
		const mew = battle.p1.active[0];
		battle.makeChoices('move pleingaz', 'move sleeptalk');
		assert.statStage(mew, 'spe', 1);
		mew.sethp(100);
		battle.makeChoices('move pleingaz', 'move sleeptalk');
		assert.equal(mew.hp, 100 + Math.round(mew.baseMaxhp * 33 / 100));
	});

	it('Recharge Électrique donne +1 Atq Spé et +1 Vit au lanceur en simple', () => {
		battle = combat([lanceur('rechargeelectrique')], [CIBLE]);
		battle.makeChoices('move rechargeelectrique', 'move sleeptalk');
		assert.statStage(battle.p1.active[0], 'spa', 1);
		assert.statStage(battle.p1.active[0], 'spe', 1);
	});

	it('Étincelle Partagée soigne 25 %, ou 33 % sous le Champ Électrifié avec Joues Électriques', () => {
		battle = combat([lanceur('etincellepartagee', 'Pachirisu')], [CIBLE]);
		let pachirisu = battle.p1.active[0];
		pachirisu.sethp(10);
		battle.makeChoices('move etincellepartagee', 'move sleeptalk');
		assert.equal(pachirisu.hp, 10 + Math.floor(pachirisu.baseMaxhp * 0.25));
		battle.destroy();
		battle = combat([{ species: 'Pachirisu', ability: 'joueselectriques', moves: ['etincellepartagee'] }], [CIBLE]);
		pachirisu = battle.p1.active[0];
		pachirisu.sethp(10);
		battle.makeChoices('move etincellepartagee', 'move sleeptalk');
		assert.equal(pachirisu.hp, 10 + Math.floor(pachirisu.baseMaxhp * 0.33));
	});

	it('Linceul de Givre pose des Picots et baisse la Vitesse de la cible', () => {
		battle = combat([lanceur('linceuldegivre')], [CIBLE]);
		battle.makeChoices('move linceuldegivre', 'move sleeptalk');
		assert(battle.p2.sideConditions['spikes']);
		assert.statStage(battle.p2.active[0], 'spe', -1);
	});

	it('Transe pose Distorsion pendant 3 tours et soigne 25 %', () => {
		battle = combat([lanceur('transe')], [CIBLE]);
		const mew = battle.p1.active[0];
		mew.sethp(100);
		battle.makeChoices('move transe', 'move sleeptalk');
		assert(battle.field.getPseudoWeather('trickroom'));
		assert.equal(mew.hp, 100 + Math.floor(mew.baseMaxhp / 4));
		battle.makeChoices('move transe', 'move sleeptalk');
		assert(battle.field.getPseudoWeather('trickroom'));
		battle.makeChoices('move transe', 'move sleeptalk');
		assert.false(battle.field.getPseudoWeather('trickroom'));
	});

	it('Bol de Lait soigne 50 % et soigne le statut de l\'équipe la première fois', () => {
		battle = combat([lanceur('boldelait', 'Miltank'), RESERVE], [CIBLE]);
		const miltank = battle.p1.active[0];
		const allie = battle.p1.pokemon[1];
		allie.status = 'par';
		miltank.sethp(100);
		battle.makeChoices('move boldelait', 'move sleeptalk');
		assert.equal(miltank.hp, 100 + Math.floor(miltank.baseMaxhp / 2));
		assert.equal(allie.status, '');
		allie.status = 'par';
		battle.makeChoices('move boldelait', 'move sleeptalk');
		assert.equal(allie.status, 'par');
	});

	it('Rêve Partagé endort le lanceur et lui rend tous ses PV', () => {
		battle = combat([lanceur('revepartage', 'Musharna')], [CIBLE]);
		const musharna = battle.p1.active[0];
		musharna.sethp(10);
		battle.makeChoices('move revepartage', 'move sleeptalk');
		assert.equal(musharna.status, 'slp');
		assert.fullHP(musharna);
	});

	it('Amass\'Sable amélioré soigne et retire le statut', () => {
		battle = combat([lanceur('shoreup', 'Palossand')], [CIBLE]);
		const palossand = battle.p1.active[0];
		palossand.setStatus('brn');
		palossand.sethp(100);
		battle.makeChoices('move shoreup', 'move sleeptalk');
		assert.equal(palossand.status, '');
		assert(palossand.hp > 100);
	});

	it('Habanerage modifié : +1 Atq et -2 Déf pour la cible', () => {
		battle = combat([lanceur('spicyextract', 'Scovillain')], [CIBLE]);
		battle.makeChoices('move spicyextract', 'move sleeptalk');
		assert.statStage(battle.p2.active[0], 'atk', 1);
		assert.statStage(battle.p2.active[0], 'def', -2);
	});

	describe('Marque du Prédateur', () => {
		const SHARPEDO = { species: 'Sharpedo', ability: 'runaway', moves: ['marquedupredateur', 'sleeptalk'] };

		it('empêche la cible de sortir tant que Sharpedo reste', () => {
			battle = combat([SHARPEDO, RESERVE], [CIBLE, RESERVE]);
			battle.makeChoices('move marquedupredateur', 'move sleeptalk');
			assert.trapped(() => battle.makeChoices('move sleeptalk', 'switch 2'));
			battle.makeChoices('switch 2', 'move sleeptalk');
			battle.makeChoices('move sleeptalk', 'switch 2');
			assert.species(battle.p2.active[0], 'Chansey');
		});

		it('passe à 70 de puissance et +1 priorité une fois la marque posée, une seule marque par combat', () => {
			battle = combat([SHARPEDO, RESERVE], [{ species: 'Ninjask', ability: 'runaway', moves: ['growl'] }, RESERVE]);
			const [sharpedo, ninjask] = [battle.p1.active[0], battle.p2.active[0]];
			const move = battle.dex.getActiveMove('marquedupredateur');
			assert.equal(move.basePowerCallback.call(battle, sharpedo, ninjask, move), 50);
			battle.makeChoices('move marquedupredateur', 'move growl');
			assert.equal(premierAAgir(battle), 'p2');
			assert.equal(move.basePowerCallback.call(battle, sharpedo, ninjask, move), 70);
			battle.makeChoices('move marquedupredateur', 'move growl');
			assert.equal(premierAAgir(battle), 'p1');
			battle.makeChoices('switch 2', 'move growl');
			battle.makeChoices('switch 2', 'move growl');
			battle.makeChoices('move marquedupredateur', 'move growl');
			assert.false(battle.p2.active[0].volatiles['marquedupredateur']);
		});
	});

	it('Au Service fait sortir le lanceur, et le remplaçant a +1 priorité sur sa première attaque au tour suivant', () => {
		battle = combat([lanceur('auservice', 'Indeedee'), { species: 'Snorlax', ability: 'runaway', moves: ['tackle'] }],
			[{ species: 'Ninjask', ability: 'runaway', moves: ['growl'] }]);
		battle.makeChoices('move auservice', 'move growl');
		battle.makeChoices('switch 2', '');
		battle.makeChoices('move tackle', 'move growl');
		assert.equal(premierAAgir(battle), 'p1');
		battle.makeChoices('move tackle', 'move growl');
		assert.equal(premierAAgir(battle), 'p2');
	});

	it('Halloween amélioré : la cible devient Spectre et perd 1/16 de ses PV par tour au profit de Banshitrouye', () => {
		battle = combat([lanceur('trickortreat', 'Gourgeist')], [CIBLE]);
		const [banshitrouye, ronflex] = [battle.p1.active[0], battle.p2.active[0]];
		banshitrouye.sethp(50);
		battle.makeChoices('move trickortreat', 'move sleeptalk');
		assert(ronflex.hasType('Ghost'));
		const perte = Math.floor(ronflex.baseMaxhp / 16);
		assert.equal(ronflex.hp, ronflex.maxhp - perte);
		assert.equal(banshitrouye.hp, 50 + perte);
	});

	it('Sommation modifiée : le prochain Pokémon qui entre gagne +1 Déf Spé', () => {
		battle = combat([lanceur('instruct', 'Oranguru'), RESERVE], [CIBLE]);
		battle.makeChoices('move instruct', 'move sleeptalk');
		assert(battle.p1.sideConditions['instruct']);
		battle.makeChoices('switch 2', 'move sleeptalk');
		assert.statStage(battle.p1.active[0], 'spd', 1);
		assert.false(battle.p1.sideConditions['instruct']);
	});

	describe('Marteau Mastoc', () => {
		const FORGELINA = { species: 'Tinkaton', ability: 'runaway', moves: ['gigatonhammer', 'sleeptalk'] };

		it('ne peut pas être utilisé deux tours de suite contre un Pokémon non Acier', () => {
			battle = combat([FORGELINA], [CIBLE]);
			battle.makeChoices('move gigatonhammer', 'move sleeptalk');
			assert.cantMove(() => battle.makeChoices('move gigatonhammer', 'move sleeptalk'), 'Tinkaton', 'Gigaton Hammer', true);
		});

		it('peut être utilisé tous les tours contre un Acier, sans être résisté', () => {
			battle = combat([FORGELINA], [{ species: 'Corviknight', ability: 'runaway', moves: ['sleeptalk'] }]);
			const corvaillus = battle.p2.active[0];
			assert.equal(corvaillus.runEffectiveness(battle.dex.getActiveMove('gigatonhammer')), 0);
			battle.makeChoices('move gigatonhammer', 'move sleeptalk');
			const pv = corvaillus.hp;
			battle.makeChoices('move gigatonhammer', 'move sleeptalk');
			assert(corvaillus.hp < pv);
		});
	});

	it('Mur Fossile réduit les dégâts physiques d\'un tiers pendant 4 tours, puis le lanceur ressort', () => {
		const coup = avecMur => degats({ species: 'Snorlax', ability: 'runaway', moves: ['bodyslam'] }, { species: 'Bastiodon', ability: 'runaway', moves: ['sleeptalk'] }, 'bodyslam',
			avecMur ? b => b.p2.addSideCondition('murfossile', b.p2.active[0]) : null);
		assert.bounded(coup(true) / coup(false), [0.64, 0.7]);
		battle = combat([lanceur('murfossile', 'Bastiodon'), RESERVE], [CIBLE]);
		battle.makeChoices('move murfossile', 'move sleeptalk');
		assert.equal(battle.p1.requestState, 'switch');
		battle.makeChoices('switch 2', '');
		assert.equal(battle.p1.sideConditions['murfossile'].duration, 3);
	});

	it('Nuage Parfumé soigne 15 % par tour et empêche les baisses de stats', () => {
		battle = combat([lanceur('nuageparfume', 'Oinkologne')], [{ species: 'Snorlax', ability: 'runaway', moves: ['growl'] }]);
		const fragroin = battle.p1.active[0];
		fragroin.sethp(100);
		battle.makeChoices('move nuageparfume', 'move growl');
		assert.equal(fragroin.hp, 100 + Math.floor(fragroin.baseMaxhp * 0.15));
		battle.makeChoices('move nuageparfume', 'move growl');
		assert.statStage(fragroin, 'atk', 0);
	});
});

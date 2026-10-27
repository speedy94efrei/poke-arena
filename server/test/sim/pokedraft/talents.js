'use strict';

const assert = require('./../../assert');
const { combat, degats, premierAAgir } = require('./aide');

let battle;

const TAPE = { species: 'Snorlax', ability: 'runaway', moves: ['bodyslam'] };
const MORSURE = { species: 'Snorlax', ability: 'runaway', moves: ['crunch'] };
const CHANSEY = { species: 'Chansey', ability: 'runaway', moves: ['sleeptalk'] };
const NEUTRE = 'runaway';

function rapport(talent, autre, attaquant, defenseur, attaque, avant) {
	const avec = degats(attaquant(talent), defenseur(talent), attaque, avant);
	const sans = degats(attaquant(autre), defenseur(autre), attaque, avant);
	return avec / sans;
}

describe('PokéDraft · talents', () => {
	afterEach(() => {
		battle?.destroy();
		battle = null;
	});

	it('Couche Polaire réduit de 25 % les dégâts physiques au-dessus de la moitié des PV', () => {
		const ratio = rapport('couchepolaire', NEUTRE, () => TAPE,
			ability => ({ species: 'Dewgong', ability, moves: ['sleeptalk'] }), 'bodyslam');
		assert.bounded(ratio, [0.72, 0.78]);
	});

	it('Couche Polaire ne protège plus sous la moitié des PV', () => {
		const affaibli = b => b.p2.active[0].sethp(b.p2.active[0].maxhp / 2 - 1);
		const ratio = rapport('couchepolaire', NEUTRE, () => TAPE,
			ability => ({ species: 'Dewgong', ability, moves: ['sleeptalk'] }), 'bodyslam', affaibli);
		assert.bounded(ratio, [0.98, 1.02]);
	});

	it('Roc Millénaire survit à 1 PV quand il a tous ses PV', () => {
		battle = combat([TAPE], [{ species: 'Onix', level: 1, ability: 'rocmillenaire', moves: ['sleeptalk'] }]);
		battle.makeChoices('move bodyslam', 'move sleeptalk');
		assert.equal(battle.p2.active[0].hp, 1);
	});

	it('Roc Millénaire gagne +1 Déf par tour, jusqu\'à +2', () => {
		battle = combat([{ species: 'Onix', ability: 'rocmillenaire', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		for (let i = 0; i < 3; i++) battle.makeChoices('move sleeptalk', 'move sleeptalk');
		assert.statStage(battle.p1.active[0], 'def', 2);
	});

	it('Deuil Vengeur donne +30 % d\'Atq dès qu\'un allié est K.O.', () => {
		const coup = allieKo => {
			const b = combat([{ species: 'Marowak', ability: 'deuilvengeur', moves: ['earthquake'] }, { species: 'Pikachu', moves: ['sleeptalk'] }],
				[{ species: 'Snorlax', moves: ['sleeptalk'] }]);
			if (allieKo) {
				b.p1.pokemon[1].hp = 0;
				b.p1.pokemon[1].fainted = true;
			}
			const cible = b.p2.active[0];
			b.makeChoices('move earthquake', 'move sleeptalk');
			const resultat = cible.maxhp - cible.hp;
			b.destroy();
			return resultat;
		};
		assert.bounded(coup(true) / coup(false), [1.26, 1.34]);
	});

	it('Motif Terrifiant baisse l\'Atq et l\'Atq Spé du Pokémon en face à l\'entrée', () => {
		battle = combat([{ species: 'Arbok', ability: 'motifterrifiant', moves: ['sleeptalk'] }], [{ species: 'Snorlax', moves: ['sleeptalk'] }]);
		assert.statStage(battle.p2.active[0], 'atk', -1);
		assert.statStage(battle.p2.active[0], 'spa', -1);
	});

	it('Poireau Fidèle monte le taux de critique et fait des critiques ×2', () => {
		battle = combat([{ species: 'Farfetch’d', ability: 'poireaufidele', moves: ['leafblade'] }], [{ species: 'Snorlax', moves: ['sleeptalk'] }]);
		const move = battle.dex.getActiveMove('leafblade');
		assert.equal(battle.runEvent('ModifyCritRatio', battle.p1.active[0], battle.p2.active[0], move, 1), 2);
		const ratio = rapport('poireaufidele', NEUTRE, ability => ({ species: 'Farfetch’d', ability, moves: ['wickedblow'] }),
			() => ({ species: 'Snorlax', moves: ['sleeptalk'] }), 'wickedblow');
		assert.bounded(ratio, [1.3, 1.37]);
	});

	it('Pendule baisse l\'Atq Spé du Pokémon adverse qui entre', () => {
		battle = combat([{ species: 'Hypno', ability: 'pendule', moves: ['sleeptalk'] }],
			[{ species: 'Snorlax', moves: ['sleeptalk'] }, { species: 'Chansey', moves: ['sleeptalk'] }]);
		battle.makeChoices('move sleeptalk', 'switch 2');
		assert.statStage(battle.p2.active[0], 'spa', -1);
	});

	it('Lait Nourricier soigne 1/16 des PV à la fin du tour', () => {
		battle = combat([{ species: 'Miltank', ability: 'laitnourricier', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		const miltank = battle.p1.active[0];
		miltank.sethp(100);
		battle.makeChoices('move sleeptalk', 'move sleeptalk');
		assert.equal(miltank.hp, 100 + Math.floor(miltank.baseMaxhp / 16));
	});

	it('Marée Abyssale pose la pluie à l\'entrée', () => {
		battle = combat([{ species: 'Lanturn', ability: 'mareeabyssale', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		assert(battle.field.isWeather('raindance'));
	});

	it('Collerette Ardente donne +1 Atq Spé et +1 Vit en passant sous 50 %, une seule fois', () => {
		battle = combat([{ species: 'Typhlosion', ability: 'colleretteardente', moves: ['sleeptalk'] }], [{ species: 'Snorlax', moves: ['tackle'] }]);
		const typhlosion = battle.p1.active[0];
		typhlosion.sethp(Math.floor(typhlosion.maxhp / 2) + 5);
		battle.makeChoices('move sleeptalk', 'move tackle');
		assert.statStage(typhlosion, 'spa', 1);
		assert.statStage(typhlosion, 'spe', 1);
		typhlosion.sethp(typhlosion.maxhp);
		battle.makeChoices('move sleeptalk', 'move tackle');
		typhlosion.sethp(Math.floor(typhlosion.maxhp / 2) + 5);
		battle.makeChoices('move sleeptalk', 'move tackle');
		assert.statStage(typhlosion, 'spa', 1);
	});

	it('Gonflement pose une couche de Pics Toxik la première fois qu\'il est touché au contact', () => {
		battle = combat([{ species: 'Qwilfish', ability: 'gonflement', moves: ['sleeptalk'] }], [{ species: 'Snorlax', moves: ['tackle'] }]);
		battle.makeChoices('move sleeptalk', 'move tackle');
		assert.equal(battle.p2.sideConditions['toxicspikes']?.layers, 1);
		battle.makeChoices('move sleeptalk', 'move tackle');
		assert.equal(battle.p2.sideConditions['toxicspikes']?.layers, 1);
	});

	it('Corne Levier fait +30 % contre les Pokémon de plus de 100 kg', () => {
		const ratio = rapport('cornelevier', NEUTRE, ability => ({ species: 'Heracross', ability, moves: ['megahorn'] }),
			() => ({ species: 'Snorlax', moves: ['sleeptalk'] }), 'megahorn');
		assert.bounded(ratio, [1.26, 1.34]);
	});

	it('Fossile Vivant bloque les baisses de stats et double la Vitesse sous la pluie', () => {
		battle = combat([{ species: 'Relicanth', ability: 'fossilevivant', moves: ['sleeptalk'] }], [{ species: 'Lanturn', ability: 'mareeabyssale', moves: ['growl'] }]);
		battle.makeChoices('move sleeptalk', 'move growl');
		const relicanth = battle.p1.active[0];
		assert.statStage(relicanth, 'atk', 0);
		assert.equal(relicanth.getStat('spe'), relicanth.getStat('spe', false, true) * 2);
	});

	it('Esprit du Désert : Vitesse ×1,5 et aucun dégât sous la tempête de sable', () => {
		battle = combat([{ species: 'Flygon', ability: 'espritdudesert', moves: ['sleeptalk'] }], [{ species: 'Hippowdon', ability: 'sandstream', moves: ['sleeptalk'] }]);
		battle.makeChoices('move sleeptalk', 'move sleeptalk');
		const flygon = battle.p1.active[0];
		assert.fullHP(flygon);
		assert.equal(flygon.getStat('spe'), Math.floor(flygon.getStat('spe', false, true) * 1.5));
	});

	it('Régime de Bananes soigne 25 % sous la moitié des PV, 3 fois par combat', () => {
		battle = combat([{ species: 'Tropius', ability: 'regimedebananes', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		const tropius = battle.p1.active[0];
		for (let i = 0; i < 4; i++) {
			tropius.sethp(10);
			battle.makeChoices('move sleeptalk', 'move sleeptalk');
			assert.equal(tropius.hp, i < 3 ? 10 + Math.floor(tropius.baseMaxhp / 4) : 10);
		}
	});

	it('Odeur du Sang fait +30 % contre un Pokémon sous la moitié de ses PV', () => {
		const affaibli = b => b.p2.active[0].sethp(b.p2.active[0].maxhp / 2 - 1);
		const ratio = rapport('odeurdusang', NEUTRE, ability => ({ species: 'Sharpedo', ability, moves: ['crunch'] }),
			() => ({ species: 'Snorlax', moves: ['sleeptalk'] }), 'crunch', affaibli);
		assert.bounded(ratio, [1.26, 1.34]);
	});

	it('Nuage de Coton divise par deux la première attaque super efficace', () => {
		const ratio = rapport('nuagedecoton', NEUTRE, () => ({ species: 'Snorlax', moves: ['icebeam'] }),
			ability => ({ species: 'Altaria', ability, moves: ['sleeptalk'] }), 'icebeam');
		assert.bounded(ratio, [0.47, 0.53]);
	});

	it('Bouclier Frontal divise par deux les dégâts au contact', () => {
		const ratio = rapport('bouclierfrontal', NEUTRE, () => TAPE,
			ability => ({ species: 'Bastiodon', ability, moves: ['sleeptalk'] }), 'bodyslam');
		assert.bounded(ratio, [0.47, 0.53]);
	});

	it('Roi des Neiges pose la neige et ses attaques Glace ne ratent pas', () => {
		const touche = ability => {
			const b = combat([{ species: 'Abomasnow', ability, moves: ['iciclecrash'] }], [{ species: 'Snorlax', ability: 'snowwarning', moves: ['sleeptalk'] }], { forceRandomChance: false });
			b.makeChoices('move iciclecrash', 'move sleeptalk');
			const hit = b.p2.active[0].hp < b.p2.active[0].maxhp;
			b.destroy();
			return hit;
		};
		battle = combat([{ species: 'Abomasnow', ability: 'roidesneiges', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		assert(battle.field.isWeather('snowscape'));
		assert.equal(touche('roidesneiges'), true);
		assert.equal(touche(NEUTRE), false);
	});

	it('Poupée de Neige laisse à 1 PV une fois par combat', () => {
		battle = combat([MORSURE], [{ species: 'Froslass', level: 1, ability: 'poupeedeneige', moves: ['sleeptalk'] }]);
		battle.makeChoices('move crunch', 'move sleeptalk');
		assert.equal(battle.p2.active[0].hp, 1);
		battle.makeChoices('move crunch', 'move sleeptalk');
		assert.fainted(battle.p2.active[0]);
	});

	it('Signes Gravés donne +1 Atq à chaque K.O.', () => {
		battle = combat([{ species: 'Weavile', ability: 'signesgraves', moves: ['tackle'] }],
			[{ species: 'Pichu', level: 1, moves: ['sleeptalk'] }, { species: 'Pichu', level: 1, moves: ['sleeptalk'] }]);
		battle.makeChoices('move tackle', 'move sleeptalk');
		assert.statStage(battle.p1.active[0], 'atk', 1);
	});

	it('Joues Électriques pose le Champ Électrifié à l\'entrée', () => {
		battle = combat([{ species: 'Pachirisu', ability: 'joueselectriques', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		assert(battle.field.isTerrain('electricterrain'));
	});

	it('Vision X passe à travers Clonage et ignore l\'esquive', () => {
		battle = combat([{ species: 'Luxray', ability: 'visionx', moves: ['thunderfang'] }], [{ species: 'Snorlax', moves: ['substitute'] }]);
		const move = battle.dex.getActiveMove('thunderfang');
		battle.runEvent('ModifyMove', battle.p1.active[0], battle.p2.active[0], move, move);
		assert(move.ignoreEvasion);
		battle.p2.active[0].addVolatile('substitute');
		const pv = battle.p2.active[0].hp;
		battle.makeChoices('move thunderfang', 'move substitute');
		assert(battle.p2.active[0].hp < pv);
	});

	it('Chef de Meute donne +1 Atq par K.O. adverse, jusqu\'à +2', () => {
		const pichu = { species: 'Pichu', level: 1, moves: ['sleeptalk'] };
		battle = combat([{ species: 'Bisharp', ability: 'chefdemeute', moves: ['tackle'] }], [pichu, pichu, pichu, pichu]);
		for (let i = 1; i <= 3; i++) {
			battle.makeChoices('move tackle', 'move sleeptalk');
			if (i < 3) battle.makeChoices('', `switch ${i + 1}`);
		}
		assert.statStage(battle.p1.active[0], 'atk', 2);
	});

	it('Couturière baisse la Vitesse d\'un cran de plus', () => {
		battle = combat([{ species: 'Leavanny', ability: 'couturiere', moves: ['linceuldefeuilles'] }], [{ species: 'Snorlax', moves: ['sleeptalk'] }]);
		battle.makeChoices('move linceuldefeuilles', 'move sleeptalk');
		assert.statStage(battle.p2.active[0], 'spe', -2);
	});

	it('Maison de Pierre pose Piège de Roc et gagne +1 Déf en passant sous 50 %', () => {
		battle = combat([{ species: 'Crustle', ability: 'maisondepierre', moves: ['sleeptalk'] }], [{ species: 'Snorlax', moves: ['tackle'] }]);
		const crustle = battle.p1.active[0];
		crustle.sethp(Math.floor(crustle.maxhp / 2) + 3);
		battle.makeChoices('move sleeptalk', 'move tackle');
		assert(battle.p2.sideConditions['stealthrock']);
		assert.statStage(crustle, 'def', 1);
	});

	it('Brume Onirique pose le Champ Psychique à l\'entrée', () => {
		battle = combat([{ species: 'Musharna', ability: 'brumeonirique', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		assert(battle.field.isTerrain('psychicterrain'));
	});

	it('Entrée en Scène donne +1 priorité à la première attaque de la première entrée', () => {
		battle = combat([{ species: 'Hawlucha', ability: 'entreeenscene', moves: ['tackle'] }], [{ species: 'Ninjask', ability: NEUTRE, moves: ['growl'] }]);
		battle.makeChoices('move tackle', 'move growl');
		assert.equal(premierAAgir(battle), 'p1');
		battle.makeChoices('move tackle', 'move growl');
		assert.equal(premierAAgir(battle), 'p2');
	});

	it('Antennes Brumeuses pose le Champ Brumeux et protège de Provoc', () => {
		battle = combat([{ species: 'Dedenne', ability: 'antennesbrumeuses', moves: ['sleeptalk'] }], [{ species: 'Snorlax', moves: ['taunt'] }]);
		assert(battle.field.isTerrain('mistyterrain'));
		battle.makeChoices('move sleeptalk', 'move taunt');
		assert.false(battle.p1.active[0].volatiles['taunt']);
	});

	it('Potager Hanté pose le Champ Herbu et soigne 1/8 par tour', () => {
		battle = combat([{ species: 'Gourgeist', ability: 'potagerhante', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		assert(battle.field.isTerrain('grassyterrain'));
		const gourgeist = battle.p1.active[0];
		gourgeist.sethp(50);
		battle.makeChoices('move sleeptalk', 'move sleeptalk');
		assert.equal(gourgeist.hp, 50 + 2 * Math.floor(gourgeist.baseMaxhp / 16));
	});

	it('Boue Protectrice divise par deux les dégâts Eau et baisse l\'Atq des attaquants au contact', () => {
		const ratio = rapport('boueprotectrice', NEUTRE, () => ({ species: 'Snorlax', moves: ['surf'] }),
			ability => ({ species: 'Mudsdale', ability, moves: ['sleeptalk'] }), 'surf');
		assert.bounded(ratio, [0.47, 0.53]);
		battle = combat([TAPE], [{ species: 'Mudsdale', ability: 'boueprotectrice', moves: ['sleeptalk'] }]);
		battle.makeChoices('move bodyslam', 'move sleeptalk');
		assert.statStage(battle.p1.active[0], 'atk', -1);
	});

	it('Souffle Divin : les attaques Glace ne sont plus résistées', () => {
		const ratio = rapport('souffledivin', NEUTRE, ability => ({ species: 'Ninetales-Alola', ability, moves: ['icebeam'] }),
			() => ({ species: 'Dewgong', moves: ['sleeptalk'] }), 'icebeam');
		assert.bounded(ratio, [3.9, 4.1]);
	});

	it('Phéromones Toxiques : les attaques Poison touchent les Acier', () => {
		const avec = degats({ species: 'Salazzle', ability: 'pheromonestoxiques', moves: ['sludgebomb'] }, { species: 'Bastiodon', moves: ['sleeptalk'] }, 'sludgebomb');
		const sans = degats({ species: 'Salazzle', ability: NEUTRE, moves: ['sludgebomb'] }, { species: 'Bastiodon', moves: ['sleeptalk'] }, 'sludgebomb');
		assert(avec > 0);
		assert.equal(sans, 0);
	});

	it('Moteur Vivant donne +1 Vit à l\'entrée', () => {
		battle = combat([{ species: 'Cyclizar', ability: 'moteurvivant', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		assert.statStage(battle.p1.active[0], 'spe', 1);
	});

	it('Ferronnière fait +30 % contre les Acier et les Vol', () => {
		const ratio = rapport('ferronniere', NEUTRE, ability => ({ species: 'Tinkaton', ability, moves: ['playrough'] }),
			() => ({ species: 'Corviknight', moves: ['sleeptalk'] }), 'playrough');
		assert.bounded(ratio, [1.26, 1.34]);
	});

	it('Double Piment pose le soleil et renforce ses attaques Plante de 50 % au soleil', () => {
		battle = combat([{ species: 'Scovillain', ability: 'doublepiment', moves: ['sleeptalk'] }], [{ species: 'Chansey', moves: ['sleeptalk'] }]);
		assert(battle.field.isWeather('sunnyday'));
		const soleil = { species: 'Snorlax', ability: 'drought', moves: ['sleeptalk'] };
		const ratio = rapport('doublepiment', NEUTRE, ability => ({ species: 'Scovillain', ability, moves: ['energyball'] }), () => soleil, 'energyball');
		assert.bounded(ratio, [1.46, 1.54]);
	});

	it('Momie amélioré : l\'attaquant au contact prend Momie et perd 1 cran d\'Atq', () => {
		battle = combat([MORSURE], [{ species: 'Cofagrigus', ability: 'mummy', moves: ['sleeptalk'] }]);
		battle.makeChoices('move crunch', 'move sleeptalk');
		assert.equal(battle.p1.active[0].ability, 'mummy');
		assert.statStage(battle.p1.active[0], 'atk', -1);
	});

	it('Sable Humide amélioré : +2 Déf et dégâts Eau divisés par deux', () => {
		const ratio = rapport('watercompaction', NEUTRE, () => ({ species: 'Snorlax', moves: ['surf'] }),
			ability => ({ species: 'Palossand', ability, moves: ['sleeptalk'] }), 'surf');
		assert.bounded(ratio, [0.47, 0.53]);
	});

	it('Nerfs d\'Acier amélioré : ne peut pas être forcé à sortir', () => {
		battle = combat([{ species: 'Duraludon', ability: 'stalwart', moves: ['sleeptalk'] }, { species: 'Chansey', moves: ['sleeptalk'] }],
			[{ species: 'Snorlax', moves: ['roar'] }]);
		battle.makeChoices('move sleeptalk', 'move roar');
		assert.species(battle.p1.active[0], 'Duraludon');
	});

	it('Expul\'Sable amélioré : la tempête de sable dure 8 tours', () => {
		battle = combat([{ species: 'Sandaconda', ability: 'sandspit', moves: ['sleeptalk'] }], [TAPE]);
		battle.makeChoices('move sleeptalk', 'move bodyslam');
		assert(battle.field.isWeather('sandstorm'));
		assert.equal(battle.field.weatherState.duration, 7);
	});

	it('Punk Rock amélioré : ses attaques sonores ont 20 % de chance d\'empoisonner', () => {
		battle = combat([{ species: 'Toxtricity', ability: 'punkrock', moves: ['boomburst'] }], [{ species: 'Snorlax', moves: ['sleeptalk'] }], { forceRandomChance: true });
		battle.makeChoices('move boomburst', 'move sleeptalk');
		assert.equal(battle.p2.active[0].status, 'psn');
	});

	describe('Chien des Enfers', () => {
		const DEMOLOSSE = { species: 'Houndoom', ability: 'chiendesenfers', moves: ['darkpulse', 'sleeptalk'] };
		const NINJASK = { species: 'Ninjask', ability: NEUTRE, moves: ['sleeptalk', 'uturn'] };

		it('empêche un Pokémon faible au Feu ou aux Ténèbres de changer pendant 2 tours', () => {
			battle = combat([DEMOLOSSE], [NINJASK, CHANSEY]);
			assert.trapped(() => battle.makeChoices('move sleeptalk', 'switch 2'));
			battle.makeChoices('move sleeptalk', 'move sleeptalk');
			assert.trapped(() => battle.makeChoices('move sleeptalk', 'switch 2'));
			battle.makeChoices('move sleeptalk', 'move sleeptalk');
			battle.makeChoices('move sleeptalk', 'switch 2');
			assert.species(battle.p2.active[0], 'Chansey');
		});

		it('ne piège pas un Pokémon qui n\'est faible ni au Feu ni aux Ténèbres', () => {
			battle = combat([DEMOLOSSE], [{ species: 'Snorlax', ability: NEUTRE, moves: ['sleeptalk'] }, CHANSEY]);
			battle.makeChoices('move sleeptalk', 'switch 2');
			assert.species(battle.p2.active[0], 'Chansey');
		});

		it('empêche aussi de sortir avec une attaque pivot', () => {
			battle = combat([DEMOLOSSE], [NINJASK, CHANSEY]);
			battle.makeChoices('move sleeptalk', 'move uturn');
			assert.species(battle.p2.active[0], 'Ninjask');
			assert.notEqual(battle.p2.requestState, 'switch');
		});

		it('attaque un Spectre avant qu\'il parte', () => {
			battle = combat([{ ...DEMOLOSSE, level: 50 }], [{ species: 'Gengar', ability: NEUTRE, moves: ['sleeptalk'] }, CHANSEY]);
			battle.makeChoices('move darkpulse', 'switch 2');
			const coup = battle.log.findIndex(line => line.startsWith('|move|p1a: Houndoom|Dark Pulse|p2a: Gengar'));
			const sortie = battle.log.findIndex(line => line.startsWith('|switch|p2a: Chansey'));
			assert(coup >= 0 && coup < sortie);
		});

		it('s\'arrête quand Démolosse sort', () => {
			battle = combat([DEMOLOSSE, CHANSEY], [NINJASK, CHANSEY]);
			battle.makeChoices('switch 2', 'move sleeptalk');
			battle.makeChoices('move sleeptalk', 'switch 2');
			assert.species(battle.p2.active[0], 'Chansey');
		});
	});

	it('Mue Éclair laisse un leurre qui encaisse jusqu\'à 25 % des PV de Ninjask', () => {
		const degatsSurRemplacant = ability => {
			const b = combat([{ species: 'Ninjask', ability, moves: ['sleeptalk'] }, { species: 'Snorlax', ability: NEUTRE, moves: ['sleeptalk'] }],
				[{ species: 'Machamp', ability: NEUTRE, moves: ['seismictoss'] }]);
			const leurre = Math.floor(b.p1.active[0].maxhp / 4);
			b.makeChoices('switch 2', 'move seismictoss');
			const ronflex = b.p1.active[0];
			const resultat = { degats: ronflex.maxhp - ronflex.hp, leurre };
			b.destroy();
			return resultat;
		};
		const avec = degatsSurRemplacant('mueeclair');
		const sans = degatsSurRemplacant(NEUTRE);
		assert.equal(sans.degats - avec.degats, avec.leurre);
	});

	it('Lecture d\'Aura révèle l\'objet et les 4 attaques du Pokémon en face', () => {
		battle = combat([{ species: 'Lucario', ability: 'lecturedaura', moves: ['sleeptalk'] }],
			[{ species: 'Snorlax', ability: NEUTRE, item: 'leftovers', moves: ['bodyslam', 'curse', 'rest', 'sleeptalk'] }]);
		assert(battle.log.some(line => line.startsWith('|-item|p2a: Snorlax|Leftovers')));
		assert.equal(battle.log.filter(line => line.startsWith('|-activate|p1a: Lucario') && line.includes('|move: ')).length, 4);
	});

	it('Rubans Apaisants bloque les attaques de boost ce tour-ci et le suivant', () => {
		battle = combat([CHANSEY, { species: 'Sylveon', ability: 'rubansapaisants', moves: ['sleeptalk'] }],
			[{ species: 'Snorlax', ability: NEUTRE, moves: ['swordsdance', 'sleeptalk'] }]);
		const ronflex = battle.p2.active[0];
		battle.makeChoices('switch 2', 'move swordsdance');
		assert.statStage(ronflex, 'atk', 0);
		assert.cantMove(() => battle.makeChoices('move sleeptalk', 'move swordsdance'), 'Snorlax', 'Swords Dance', true);
		battle.makeChoices('move sleeptalk', 'move sleeptalk');
		battle.makeChoices('move sleeptalk', 'move swordsdance');
		assert.statStage(ronflex, 'atk', 2);
	});

	it('Mâchoire Royale : les morsures passent à travers Abri et brisent les écrans', () => {
		battle = combat([{ species: 'Tyrantrum', ability: 'machoireroyale', moves: ['crunch'] }], [{ species: 'Snorlax', ability: NEUTRE, moves: ['protect'] }]);
		battle.p2.addSideCondition('reflect', battle.p2.active[0]);
		battle.p2.addSideCondition('lightscreen', battle.p2.active[0]);
		battle.makeChoices('move crunch', 'move protect');
		assert.false.fullHP(battle.p2.active[0]);
		assert.false(battle.p2.sideConditions['reflect']);
		assert.false(battle.p2.sideConditions['lightscreen']);
	});

	it('Sage de la Forêt : +20 % Atq et Atq Spé pour l\'équipe sous Distorsion, même depuis le banc', () => {
		const coup = (talent, gouroutanKo) => {
			const b = combat([TAPE, { species: 'Oranguru', ability: talent, moves: ['sleeptalk'] }], [{ species: 'Snorlax', ability: NEUTRE, moves: ['sleeptalk'] }]);
			b.field.addPseudoWeather('trickroom', b.p1.active[0]);
			if (gouroutanKo) {
				b.p1.pokemon[1].hp = 0;
				b.p1.pokemon[1].fainted = true;
			}
			const cible = b.p2.active[0];
			b.makeChoices('move bodyslam', 'move sleeptalk');
			const resultat = cible.maxhp - cible.hp;
			b.destroy();
			return resultat;
		};
		assert.bounded(coup('sagedelaforet', false) / coup(NEUTRE, false), [1.17, 1.23]);
		assert.bounded(coup('sagedelaforet', true) / coup(NEUTRE, false), [0.98, 1.02]);
	});

	it('Majordome : -20 % de dégâts prioritaires et immunité à Bluff pour l\'équipe, même depuis le banc', () => {
		const coup = (talent, attaque) => {
			const b = combat([{ species: 'Snorlax', ability: NEUTRE, moves: ['sleeptalk'] }, { species: 'Indeedee', ability: talent, moves: ['sleeptalk'] }],
				[{ species: 'Mew', ability: NEUTRE, moves: [attaque] }]);
			const cible = b.p1.active[0];
			b.makeChoices('move sleeptalk', `move ${attaque}`);
			const resultat = cible.maxhp - cible.hp;
			b.destroy();
			return resultat;
		};
		assert.bounded(coup('majordome', 'quickattack') / coup(NEUTRE, 'quickattack'), [0.77, 0.83]);
		assert.equal(coup('majordome', 'fakeout'), 0);
	});

	it('Danse du Carnaval : les attaques de danse passent le sommeil, la paralysie et la confusion', () => {
		const danse = (talent, entrave) => {
			const b = combat([{ species: 'Quaquaval', ability: talent, moves: ['aquastep'] }], [{ species: 'Snorlax', ability: NEUTRE, moves: ['sleeptalk'] }], { forceRandomChance: true });
			const palmaval = b.p1.active[0];
			if (entrave === 'slp') {
				palmaval.setStatus('slp');
				palmaval.statusState.time = 3;
			} else if (entrave === 'par') {
				palmaval.setStatus('par');
			} else {
				palmaval.addVolatile('confusion');
				palmaval.volatiles['confusion'].time = 3;
			}
			b.makeChoices('move aquastep', 'move sleeptalk');
			const touche = b.p2.active[0].hp < b.p2.active[0].maxhp;
			b.destroy();
			return touche;
		};
		for (const entrave of ['slp', 'par', 'confusion']) {
			assert.equal(danse('danseducarnaval', entrave), true, `danse sous ${entrave}`);
			assert.equal(danse(NEUTRE, entrave), false, `sans le talent sous ${entrave}`);
		}
	});

	it('Odeur Tenace amélioré : Fragroin transmet son talent quand il touche au contact', () => {
		battle = combat([{ species: 'Oinkologne', ability: 'lingeringaroma', moves: ['bodyslam'] }], [{ species: 'Snorlax', ability: 'thickfat', moves: ['sleeptalk'] }]);
		battle.makeChoices('move bodyslam', 'move sleeptalk');
		assert.equal(battle.p2.active[0].ability, 'lingeringaroma');
	});
});

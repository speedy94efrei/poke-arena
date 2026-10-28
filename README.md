# Arène

Plateforme de combats Pokémon pour la communauté française, construite sur Pokémon Showdown. Projet de fans, open source et non commercial.

Arène propose deux jeux :

- **Classique** : les formats de Showdown à l'identique, avec un Elo par format.
- **PokéDraft** : notre jeu. Chaque saison de 4 semaines a un roster de 50 Pokémon avec des fiches maison (stats redistribuées, talents et attaques signatures), un classé en draft et des rangs saisonniers.

## Organisation

| Dossier | Contenu | Techno |
| --- | --- | --- |
| `server/` | Serveur de combat : Pokémon Showdown, avec le mod `pokedraft` et le format `[Gen 9] PokeDraft` | TypeScript, Node |
| `api/` | Back : comptes, saisons, Atelier, classement, tournois | Laravel 13, Sail |
| `web/` | Site | Nuxt 4 |
| `data/` | Rosters de saison (source de vérité) et scripts de génération | JSON, Python |

## Prérequis

- Node 24 (ou 22.21 minimum)
- Docker, pour l'API
- Python 3.12, pour régénérer les rosters

Sous Windows, clone le dépôt dans le système de fichiers de WSL (par exemple `~/projets`) plutôt que dans `C:\` : Docker y est beaucoup plus rapide.

## Lancer en local

### Serveur de combat

```bash
cd server
npm ci
node pokemon-showdown start --no-security 8100
```

Le serveur écoute sur le port 8100, celui qu'attend le site. `--no-security` est réservé au développement : il accepte n'importe quel pseudo libre, sans passer par le serveur de connexion de Showdown.

Pour que les drafts classés comptent, branche le serveur sur l'API avec deux variables d'environnement : l'adresse de l'API et le secret partagé (`ARENE_INTERNAL_SECRET` dans `api/.env`).

```bash
ARENE_API_URL=http://localhost:8088/api ARENE_API_SECRET=<le secret de api/.env> node pokemon-showdown start --no-security 8100
```

Sans ces variables, tout fonctionne mais aucun draft n'est compté.

### Bots d'entraînement

Le mode Entraînement appartiendra à l'univers Classique, organisé par style d'équipe (hyper offense, pluie, stall…) : apprendre à jouer un style, puis à l'affronter. Son écran n'existe pas encore ; le serveur de combat embarque déjà les bots et leur IA, testés pour l'instant avec le roster PokéDraft.

Le serveur de combat lance lui-même ses bots, quelques secondes après son démarrage : des joueurs connectés en local, comme n'importe quel client, qui acceptent les défis de combat libre et de draft. Leurs pseudos sont réservés (personne d'autre ne peut les prendre), et `ARENE_TRAINING_BOTS=0` les désactive. Rien n'est classé.

| Bot | Ce qu'il fait |
|---|---|
| Bot Niveau 1 | attaque au hasard, ne change jamais de Pokémon |
| Bot Niveau 2 | choisit l'attaque qui fait le plus de dégâts |
| Bot Niveau 3 | change de Pokémon avant de tomber ou face à un mur, pose les pièges, se soigne, garde la Téra pour la fin |
| Bot Niveau 4 | prend les KO (attaques prioritaires comprises), se booste quand il est tranquille, inflige des statuts, pose la météo ou Distorsion qui sert son équipe, anticipe les changements |
| Bot Niveau 5 | les règles du niveau 4, puis compare chaque attaque et chaque changement avec la meilleure riposte probable |
| Bot Pluie, Bot Stall, Bot Distorsion, Bot Hyper Offense | niveau 4, avec une équipe piochée d'abord dans l'archétype du roster ; ils ajoutent Danse Pluie ou Distorsion aux sets qui l'apprennent |

L'IA (`server/server/chat-plugins/entrainement/`) suit le journal du combat et estime les dégâts avec les données du format ; elle suppose que l'adversaire joue le set par défaut de sa fiche, corrigé au fil des attaques révélées. En draft, les bots bannissent et piquent selon leur niveau. Un bot ne peut être que dans un draft à la fois, mais joue jusqu'à 10 combats libres en même temps.

Le moteur de simulation (`entrainement/moteur.ts`) rejoue chaque option du bot dans une copie du combat, avec le vrai simulateur, contre chaque riposte probable de l'adversaire (une soixantaine à une centaine de tours simulés, 250 à 600 ms par décision). Il reconstruit l'adversaire à partir de ce que le bot a vu, note la position obtenue (Pokémon restants et leurs PV, statuts, boosts, pièges) et retient un mélange de la pire riposte et de la riposte moyenne. Il ne dépend d'aucun format : l'appelant lui donne le format et les sets supposés de l'adversaire. Pour l'instant, seuls le banc d'essai et les tests l'utilisent (option `engine`) ; les bots du serveur jouent encore le niveau 5 par règles.

Le banc d'essai fait jouer les IA entre elles avec des équipes variées, chaque paire d'équipes deux fois en échangeant les camps :

```bash
node tools/banc-entrainement.js --duels 5:4,5:1 --equipes 15 --rapport banc.json
node tools/banc-entrainement.js --voir 5:4 --graine 3
```

Le premier affiche le taux de victoire avec son intervalle de confiance, la durée des combats, le temps de décision et trois erreurs typiques ; le second déroule un combat avec, à chaque tour, les options simulées et leur note. Mesures actuelles (30 combats par duel) : le moteur bat le niveau 1 à 90 %, mais seulement 52 % contre le niveau 4 et 53 % contre le niveau 5 par règles. Son évaluation reste à régler. Entre niveaux par règles : niveau 2 contre 1, 83 % ; 3 contre 2, 87 % ; 4 contre 3, 53 %.

Les tests (`server/test/sim/pokedraft/entrainement.js`) vérifient les choix de chaque niveau dans des situations précises, la reconstruction du combat par le moteur, et font jouer de vrais combats au simulateur : le niveau 5, par règles comme par simulation, doit battre le niveau 1.

En production, avec un vrai serveur de connexion, ces pseudos devront correspondre à des comptes enregistrés.

### Effets des fiches

Dans `server/data/mods/pokedraft/`, `pokedex.ts`, `abilities.ts`, `moves.ts` et `movepool.ts` sont générés depuis le roster (voir [data/README.md](data/README.md)). Les effets des talents et des signatures s'écrivent à la main dans `effets-talents.ts` et `effets-attaques.ts`, avec un test par effet dans `server/test/sim/pokedraft/`. Pour lancer ces tests seuls, depuis `server/` :

```bash
npx mocha --no-config --ui bdd --exit --timeout 60000 test/main.js test/sim/pokedraft/*.js
```

`--no-config` évite de lancer toute la suite de tests de Showdown.

Tous les effets du combat simple sont codés. Trois fichiers écrits à la main complètent le mod :

- `conditions.ts` adapte le sommeil, la paralysie et la confusion pour Danse du Carnaval ;
- `rulesets.ts` définit la règle « PokeDraft Mod », qui pose au début du combat les effets d'équipe de Sage de la Forêt et de Majordome (actifs même depuis le banc) ;
- `outils.ts` fusionne les effets avec les données générées.

Restent les parties propres au combat double : l'amélioration d'Armure Miroir, la redirection d'Étincelle Partagée, et les versions en double de Sommation et d'Au Service.

### Draft classé

Le draft tourne dans le serveur de combat, dans le plugin `server/server/chat-plugins/pokedraft.ts`, sans autre service. Deux joueurs s'affrontent en quatre temps :

1. **Bans** (30 s) : chacun bannit jusqu'à 3 Pokémon en secret. Les bans sont révélés ensemble, et un ban non choisi à la fin du chrono est perdu.
2. **Picks** (30 s par tour) : 6 Pokémon chacun, en serpent 1-2-2-2-2-2-1. Si le chrono expire, la présélection est verrouillée, sinon le pick est tiré au hasard.
3. **Préparation** (90 s) : chacun envoie ses 6 sets, tirés de l'Atelier ou modifiés pour le match. Sans envoi, ce sont les sets par défaut.
4. **Combat** : le serveur crée le combat au format `[Gen 9] PokeDraft` avec les deux équipes validées.

Le site envoie des commandes `/pokedraft …` (`auth`, `search`, `challenge`, `accept`, `bans`, `lockbans`, `preselect`, `pick`, `team`, `quit`) et reçoit l'état du draft par des lignes `|pokedraft|<json>`. Chaque joueur ne reçoit que ce qu'il a le droit de voir : les bans adverses restent vides jusqu'à la révélation. La logique du draft est testée à part dans `server/test/sim/pokedraft/draft.js`.

### Classement

Quand le serveur de combat est branché sur l'API, les drafts lancés par la file sont classés ; les défis entre joueurs restent amicaux.

- **Compte vérifié.** Le serveur de combat accepte n'importe quel pseudo en local, il ne sait donc pas qui joue. Le site demande à l'API un jeton à usage unique (5 min) et l'envoie avec `/pokedraft auth` ; le plugin le fait valider par l'API, qui vérifie que le pseudo du serveur de combat est bien celui du compte. Seul un compte vérifié peut chercher une partie classée. Le site fait cette liaison tout seul quand le pseudo de connexion au serveur de combat est celui du compte.
- **Résultat.** À la fin du combat, le plugin envoie à l'API les bans, les picks et le vainqueur. L'API met à jour les deux joueurs et renvoie leur gain ou perte de PL, que le site affiche en fin de combat. Un même combat n'est jamais compté deux fois.
- **Abandon.** Quitter un draft classé coûte 5 PL ; 3 abandons en 24 h imposent 15 min d'attente avant la file suivante.

Les règles, réglables dans `api/config/ranked.php` :

| | |
|---|---|
| Rangs | Poké Ball, Super Ball, Hyper Ball, Honor Ball, Luxe Ball, chacune en 3 divisions de 100 PL (III, II, I), puis Master Ball ; Champion = top 10 des Master Ball |
| Placement | 5 drafts sans points, puis placement à 300 PL + 120 par victoire |
| Victoire | +20 PL, +2 par victoire de série au-delà de la première (bonus plafonné à +6) |
| Défaite | −18 PL ; après une montée, un bouclier empêche de redescendre pendant 3 matchs |
| Inactivité | à partir de Luxe Ball, −25 PL par jour après 7 jours sans partie (commande `ranked:decay`, planifiée chaque nuit), sans sortir de Luxe Ball |
| Bannières | Départ à l'inscription, puis une par palier atteint ; Champion pour un top 10 en fin de saison |

### API

```bash
cd api
docker run --rm -u "$(id -u):$(id -g)" -e COMPOSER_HOME=/tmp/composer -v "$(pwd):/app" -w /app composer:latest install
cp .env.example .env
touch database/database.sqlite
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate
```

L'API répond sur http://localhost. Change `APP_PORT` dans `.env` si le port 80 est déjà pris ; le site l'attend sur http://localhost:8088/api (`NUXT_PUBLIC_API_URL` pour en changer).

Avant le premier lancement, crée la saison 1 et choisis le secret partagé avec le serveur de combat :

```bash
./vendor/bin/sail artisan db:seed
```

puis mets une valeur longue et aléatoire dans `ARENE_INTERNAL_SECRET` (`.env`). Les tests se lancent avec `./vendor/bin/sail artisan test`.

Sans Sail ni PHP installé, l'image officielle de Composer suffit (elle contient PHP), en gardant `vendor/` dans un volume Docker :

```bash
docker run --rm -v "$(pwd):/app" -v arene-api-vendor:/app/vendor -w /app composer:latest install
docker run --rm -v "$(pwd):/app" -v arene-api-vendor:/app/vendor -w /app composer:latest php artisan migrate --seed
docker run -d --name arene-api -p 8088:8000 -v "$(pwd):/app" -v arene-api-vendor:/app/vendor -w /app composer:latest php artisan serve --host=0.0.0.0 --port=8000
```

Routes publiques : `GET /api/seasons/current` (saison et nombre de drafts), `/api/seasons/current/pokemon-stats` (méta), `/api/seasons/current/duos`, `/api/seasons/current/ladder` (classement et répartition par palier), `/api/players/{pseudo}` (fiche publique d'un joueur : rang, bilan, Pokémon signature, bans favoris, derniers drafts ; ni abandons ni inactivité, réservés à `GET /api/me`). Comptes : `POST /api/players` (inscription), `POST /api/session` (connexion), `DELETE /api/session`, `GET /api/me`, `PUT /api/me/banner`, `POST /api/me/showdown-tokens`, `GET /api/me/atelier-variants` (variantes de l'Atelier, par Pokémon), `PUT /api/me/atelier-variants/{pokémon}` (remplace les variantes d'un Pokémon, liste vide pour les supprimer), `POST /api/me/atelier-variants/import` (ajoute celles du navigateur pour les Pokémon que le compte n'a pas encore réglés). Les routes `/api/internal/…` sont réservées au serveur de combat, qui présente le secret dans l'en-tête `X-Arene-Secret`.

Les pseudos de compte n'acceptent que des lettres sans accent, des chiffres, des espaces et `_ . -` : le serveur de combat retire les autres caractères, et le pseudo doit y être le même.

### Site

```bash
cd web
npm install
npm run dev
```

Le site répond sur http://localhost:3000, ou sur le port libre suivant si celui-ci est pris (le terminal l'affiche). `npm run typecheck` vérifie les types, y compris ceux du roster. Pour viser un autre serveur de combat, définis `NUXT_PUBLIC_SHOWDOWN_URL` (par défaut `ws://localhost:8100/showdown/websocket`).

Pages disponibles :

- `/` : le hub, pour choisir son univers ; il rouvre le dernier univers visité au bout de 3 secondes, sauf si l'on reste.

Univers Classique (Smogon, tous les formats du serveur de combat) :

- `/classique` : l'accueil. Ton Elo dans le format choisi, les Pokémon les plus utilisés et la répartition des styles d'équipe de ce format (statistiques Smogon), et tes derniers combats ;
- `/classique/classe` : le combat classé, dans n'importe quel format qui a un ladder. Format choisi dans la liste complète du serveur (raccourcis pour les plus joués), équipe prise dans « Mes équipes » ou collée au format texte de Showdown, ou fournie par le serveur pour les Random Battles ; à côté, le classement Elo du format lu sur le serveur ;
- `/classique/en-ligne` : les défis entre joueurs dans tous les formats, les défis reçus, les combats en cours à regarder en spectateur et les salons du serveur ;
- `/classique/equipes` : l'Atelier d'équipe (« Mes équipes »). Une équipe par onglet, créée vide, importée du texte de Showdown ou proposée par l'assistant ; six emplacements, et pour chacun les attaques, objets, talents, types Téra et répartitions d'EV les plus joués du format (statistiques Smogon), toutes les attaques qu'il peut apprendre, la nature, les EV et IV avec les stats finales. L'assistant construit une équipe autour d'un Pokémon (ses coéquipiers les plus fréquents) ou dans un style officiel de Smogon (pluie, soleil, sable, neige, Distorsion, stall, hyper offense, balance, volt-turn). À côté : le profil de jeu de l'équipe, le tableau des faiblesses, la validité (règles de base, puis le validateur du serveur de combat, messages traduits en français) et l'export au format texte de Showdown ;
- `/classique/pokedex` : le Pokédex. La liste des Pokémon du format par usage (ou tout le Pokédex en cherchant, en français ou en anglais), et pour chacun la fiche (stats, faiblesses, talents), ce que joue la communauté (attaques, objets, types Téra, répartitions, coéquipiers et contres, d'après Smogon) et toutes les attaques qu'il apprend ; un bouton l'ajoute à l'équipe ouverte dans l'Atelier ;
- `/classique/meta` : la méta d'un format. Les Pokémon les plus utilisés avec leur objet, type Téra et attaque n°1, la répartition des styles d'équipe, l'équipe type (le n°1 et ses coéquipiers les plus fréquents, à copier dans l'Atelier) et les duos les plus joués ;
- `/classique/guide` : le guide. Les objets et talents incontournables (avec leur part dans la méta du format), le tableau des natures, les IV et EV expliqués avec un calculateur de statistiques ;
- `/classique/combat/<salle>` : l'écran de combat, partagé avec PokéDraft. Simple, double et triple (un choix par Pokémon et le choix de la cible), Téracristal, Méga-Évolution, Dynamax et capacités Z selon la génération. Les noms viennent du Pokédex français (`data/references/dex.json`).

Les équipes du Classique sont gardées dans le navigateur pour l'instant.

Univers PokéDraft :

- `/pokedraft` : l'accueil de saison. Dates et compte à rebours, ton rang, méta de la saison (présence, taux de ban et de victoire de chaque Pokémon), notes du patch (fiches corrigées) et duos les plus draftés ensemble ;
- `/pokedraft/classement` : ton rang (PL, position, placements, bouclier, pénalités, inactivité), l'échelle des rangs avec la part des joueurs, tes bannières, le classement de la saison, ton historique et tes saisons passées ;
- `/pokedraft/joueur/<pseudo>` : la fiche d'un joueur, ouverte depuis le classement ou l'historique. Rang et meilleur rang de la saison, bilan et série, Pokémon les plus draftés avec leur taux de victoire, bans favoris, derniers drafts classés avec les deux équipes, bannières débloquées et saisons passées ;
- `/pokedraft/codex` : le Codex, les 50 fiches de la saison lues dans `data/rosters/roster-saison-1.json`. Vue par génération ou par archétype, filtres, comparaison de deux fiches, movepool complet et infobulle sur chaque attaque. « Copier dans l'Atelier » y crée une variante à partir du set par défaut ;
- `/pokedraft/atelier` : l'Atelier, jusqu'à 3 variantes par Pokémon. Le talent est fixe ; on choisit les 4 attaques dans le movepool (les attaques refusées par le format sont grisées) et l'objet parmi 96, avec une recherche sur le nom et l'effet, des filtres par usage et les objets recommandés par Smogon en tête. Un tableau règle la nature (▲ et ▼ sur les stats), les EV (curseur ou saisie, 510 au plus) et l'IV de chaque stat (31 ou 0), avec les stats finales au niveau 100. Sans compte, les variantes sont gardées dans le navigateur (`localStorage`). Connecté, elles sont enregistrées sur le compte peu après chaque modification, et l'indicateur en haut de page dit où elles en sont ; à la connexion, celles du navigateur rejoignent le compte (le compte garde sa version pour les Pokémon qu'il a déjà réglés) ;
- `/pokedraft/draft` : le salon du draft (recherche d'une partie classée, défis amicaux), puis `/pokedraft/draft/<id>` pour le draft lui-même : bans, picks avec aide (archétypes, menaces, lanceurs indisponibles), préparation des sets, puis lancement du combat ;
- `/pokedraft/combat` : le combat libre contre le serveur local (voir plus bas). Chaque Pokémon de l'équipe part avec sa variante favorite, ou le set par défaut s'il n'en a pas ; un menu par Pokémon permet d'en choisir une autre.

### Tester un combat ou un draft

1. Lance le serveur de combat et le site.
2. Ouvre `/pokedraft/combat` (combat libre) ou `/pokedraft/draft` (draft) dans deux fenêtres, dont une en navigation privée.
3. Dans chacune, choisis un pseudo. En combat libre, choisis aussi une équipe de 6 parmi le roster (variantes de l'Atelier ou sets par défaut des fiches).
4. Défie l'autre pseudo, ou lance la recherche dans les deux fenêtres.

Pour tester seul, défie un bot d'entraînement (par exemple **Bot Niveau 3**) depuis `/pokedraft/combat` ou `/pokedraft/draft`. Pour le draft classé, lance le bot de test depuis `web/` puis défie **Bot Test** :

```bash
npm run bot
```

Le bot accepte les défis de combat libre et de draft, bannit et picke au hasard, envoie ses sets par défaut et joue des attaques au hasard. `--url` et `--name` changent le serveur et le pseudo.

Pour jouer un draft classé contre lui, donne-lui un compte : il se connecte (ou s'inscrit) avec le mot de passe de `ARENE_BOT_PASSWORD`, se fait vérifier, puis se remet en file après chaque partie.

```bash
ARENE_BOT_PASSWORD=<un mot de passe> npm run bot -- --api http://localhost:8088/api --ranked
```

Recharger la page pendant un combat coupe la connexion : le combat est perdu pour cette fenêtre.

### Décors de combat

Les décors et plateformes de `web/public/combat/` ne sont pas versionnés : ce sont des découpes de planches tierces (décors de Pokémon Platine © Nintendo, extraits par Sunday-Domeko ; décors de Princess-Phoenix). Pour les générer à partir des deux planches :

```bash
python data/scripts/cut_battle_assets.py <planche Platine> <planche Princess-Phoenix> web/public/combat
```

Sans eux, le site se rabat sur les décors en ligne de Showdown.

### Données

Voir [data/README.md](data/README.md).

## Mettre à jour Showdown

`server/` suit le dépôt officiel `smogon/pokemon-showdown` par un subtree git :

```bash
git subtree pull --prefix server https://github.com/smogon/pokemon-showdown.git master --squash
```

Pour que ces mises à jour passent sans conflit, le code d'Arène dans `server/` se limite à `data/mods/pokedraft/` et `config/custom-formats.ts`. Ce dernier est ignoré par le `.gitignore` de Showdown : il a été ajouté avec `git add -f`, et Git le suit ensuite normalement.

## Licence

Le code d'Arène est sous licence AGPL-3.0 (voir [LICENSE](LICENSE)). Le code de Pokémon Showdown dans `server/` reste sous licence MIT (voir [server/LICENSE](server/LICENSE)).

Pokémon et les noms associés sont des marques de Nintendo, Game Freak et The Pokémon Company. Arène est un projet de fans non officiel. Le dépôt ne contient aucun sprite ni son officiel.

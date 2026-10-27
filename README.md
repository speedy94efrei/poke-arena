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

L'API répond sur http://localhost. Change `APP_PORT` dans `.env` si le port 80 est déjà pris.

### Site

```bash
cd web
npm install
npm run dev
```

Le site répond sur http://localhost:3000, ou sur le port libre suivant si celui-ci est pris (le terminal l'affiche). `npm run typecheck` vérifie les types, y compris ceux du roster. Pour viser un autre serveur de combat, définis `NUXT_PUBLIC_SHOWDOWN_URL` (par défaut `ws://localhost:8100/showdown/websocket`).

Pages disponibles :

- `/pokedraft/codex` : le Codex, les 50 fiches de la saison lues dans `data/rosters/roster-saison-1.json`. Vue par génération ou par archétype, filtres, comparaison de deux fiches, movepool complet et infobulle sur chaque attaque. « Copier dans l'Atelier » y crée une variante à partir du set par défaut ;
- `/pokedraft/atelier` : l'Atelier, jusqu'à 3 variantes par Pokémon. Le talent est fixe ; on choisit les 4 attaques dans le movepool (les attaques refusées par le format sont grisées) et l'objet parmi 96, avec une recherche sur le nom et l'effet, des filtres par usage et les objets recommandés par Smogon en tête. Un tableau règle la nature (▲ et ▼ sur les stats), les EV (curseur ou saisie, 510 au plus) et l'IV de chaque stat (31 ou 0), avec les stats finales au niveau 100. Les variantes sont gardées dans le navigateur (`localStorage`) en attendant les comptes ;
- `/pokedraft/combat` : le combat libre contre le serveur local (voir plus bas). Chaque Pokémon de l'équipe part avec sa variante favorite, ou le set par défaut s'il n'en a pas ; un menu par Pokémon permet d'en choisir une autre.

### Tester un combat

1. Lance le serveur de combat et le site.
2. Ouvre `/pokedraft/combat` dans deux fenêtres, dont une en navigation privée.
3. Dans chacune, choisis un pseudo et une équipe de 6 parmi le roster (variantes de l'Atelier ou sets par défaut des fiches).
4. Défie l'autre pseudo, ou lance la recherche dans les deux fenêtres.

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

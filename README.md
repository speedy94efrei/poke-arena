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
node pokemon-showdown start
```

Le serveur écoute sur le port 8000.

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

Le site répond sur http://localhost:3000. `npm run typecheck` vérifie les types, y compris ceux du roster.

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

# Données

- `rosters/roster-saison-N.json` : la source de vérité d'une saison. Le serveur de combat, l'API et le site lisent ce fichier.
- `schemas/roster.schema.json` : le format de ce fichier (JSON Schema 2020-12). Le roster y fait référence, donc un éditeur comme VS Code le vérifie et le complète pendant qu'on l'édite.
- `types/roster.d.ts` : les types TypeScript du roster, générés depuis le schéma. Ne pas les modifier à la main.
- `sources/saison-N/` : les fiches de la saison (PDF) et leurs corrections (Markdown), à partir desquelles le roster est généré.
- `references/` : les listes que l'Atelier propose, générées elles aussi (voir plus bas) : `objets.json` (objets autorisés, nom et description en français, numéro d'icône Showdown), `natures.json` (les 25 natures et la stat qu'elles montent et baissent), `attaques-interdites.json` (attaques du movepool que le format refuse, par Pokémon, avec la raison) et `smogon.json` (objets recommandés par les analyses Smogon, par Pokémon).
- `scripts/` : la génération. Les scripts sont en Python pour l'instant ; ils seront portés en TypeScript.

`cache/` contient les fichiers intermédiaires et n'est pas versionné.

## Régénérer le roster de la saison 1

Depuis la racine du dépôt, avec Python 3.12 :

```bash
pip install -r data/scripts/requirements.txt
python data/scripts/pdf_to_text.py data/sources/saison-1/fiches.pdf data/cache/fiches-saison-1.txt
python data/scripts/fetch_pokeapi.py data/cache/pokeapi
python data/scripts/build_roster.py data/cache/fiches-saison-1.txt server/data/formats-data.ts data/cache/roster-fiches.json data/sources/saison-1/corrections.md
python data/scripts/build_moves.py data/cache/roster-fiches.json server/data data/cache/pokeapi data/rosters/roster-saison-1.json
python data/scripts/validate_roster.py data/rosters/roster-saison-1.json
python data/scripts/build_mod.py data/rosters/roster-saison-1.json server/data server/data/mods/pokedraft
```

1. `pdf_to_text.py` extrait le texte des fiches.
2. `fetch_pokeapi.py` télécharge depuis PokéAPI les noms et descriptions des attaques en français.
3. `build_roster.py` lit les fiches, applique les corrections (une fiche corrigée remplace celle du PDF), vérifie les stats et relie les contres entre Pokémon du roster.
4. `build_moves.py` ajoute le movepool National Dex de chaque Pokémon, lu dans `server/data`, le dictionnaire des attaques avec les valeurs PokéDraft, et les identifiants Showdown du talent, de l'objet et de la nature des sets par défaut.
5. `validate_roster.py` vérifie le fichier par rapport au schéma, puis sa cohérence : totaux de stats, attaques référencées présentes dans le dictionnaire, signature dans le movepool, contres réciproques. Il s'arrête en erreur au moindre problème.
6. `build_mod.py` écrit les fiches dans le mod Showdown (`server/data/mods/pokedraft/`) : stats, talents créés, signatures créées, valeurs des attaques officielles modifiées et ajouts au movepool. Les effets des talents et des signatures, eux, s'écrivent à la main dans `effets-talents.ts` et `effets-attaques.ts`, que les fichiers générés fusionnent avec les données des fiches. Une signature sans PP dans sa fiche reçoit 10 PP en attendant.

`build_moves.py` et `validate_roster.py` listent aussi ce qui reste à compléter dans les fiches, sans bloquer : attaques du set absentes du movepool, signatures sans PP ni contact, fiches à valider.

## Régénérer les références de l'Atelier

Depuis la racine du dépôt, après le roster et une fois le serveur de combat compilé (`node pokemon-showdown start` le fait, ou `node build` dans `server/`) :

```bash
python data/scripts/build_references.py data/cache/pokeapi server data/rosters/roster-saison-1.json data/references
python data/scripts/fetch_smogon.py data/cache/smogon
python data/scripts/build_smogon.py data/cache/smogon data/rosters/roster-saison-1.json data/references/objets.json data/references/smogon.json
node data/scripts/build_interdits.cjs server data/rosters/roster-saison-1.json data/references/attaques-interdites.json
```

1. `build_references.py` écrit la liste des objets proposés (choisie à la main dans le script, regroupée par usage) et les natures, avec les noms et descriptions français de PokéAPI et le numéro de l'icône de chaque objet dans la planche de Showdown. Il s'arrête si un objet manque à Showdown ou si un objet d'un set par défaut n'est pas dans la liste.
2. `fetch_smogon.py` télécharge les sets des analyses Smogon (Gen 4 à 9) publiés par [data.pkmn.cc](https://data.pkmn.cc). `build_smogon.py` en tire, pour chaque Pokémon, les objets recommandés dans les tiers simples (Ubers à ZU, LC, National Dex), à partir de la génération la plus récente qui en propose un de la liste. Ces conseils valent pour les stats et talents officiels : l'Atelier les donne à titre indicatif. Le script affiche les Pokémon sans recommandation et les objets recommandés absents de la liste (méga-gemmes, cristaux Z…).
3. `build_interdits.cjs` passe chaque attaque du movepool de chaque fiche au validateur du format `[Gen 9] PokeDraft` et note celles qu'il refuse : clause d'esquive (Reflet, Lilliput…), clause K.O. en un coup (Abîme, Glaciation…), attaques bannies (Relais, Assistance, Queulonage) et attaques impossibles à obtenir (Escalade sur certains Pokémon). L'Atelier les grise, le Codex les signale.

Le test `server/test/sim/pokedraft/atelier.js` vérifie que ces listes collent au format : chaque objet et chaque nature sont acceptés, et le validateur refuse exactement les attaques listées. Il échoue si le roster ou le format change sans que les références soient régénérées.

## Types TypeScript

Après chaque changement du schéma, régénère les types depuis `data/` :

```bash
npm install
npm run types
```

Le site les importe par l'alias `#data` défini dans `web/nuxt.config.ts` :

```ts
import type { Roster } from '#data/types/roster'
import rosterJson from '#data/rosters/roster-saison-1.json'

const roster = rosterJson as Roster
```

Le serveur de combat les importe par un chemin relatif, sans toucher à la config de Showdown. Depuis `server/data/mods/pokedraft/` :

```ts
import type { Roster } from '../../../../data/types/roster';
```

Un import JSON est typé avec des `string` simples : TypeScript ne sait pas qu'un type vaut « Feu » plutôt qu'une chaîne quelconque. D'où le `as Roster`, à faire sur un fichier déjà validé.

## Valider un roster édité à la main

```bash
python data/scripts/validate_roster.py data/rosters/roster-saison-1.json
```

Côté TypeScript, le même schéma se vérifie avec Ajv en mode 2020-12 :

```bash
npx ajv-cli@5 validate --spec=draft2020 -s data/schemas/roster.schema.json -d data/rosters/roster-saison-1.json
```

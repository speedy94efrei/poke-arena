# Données

- `rosters/roster-saison-N.json` : la source de vérité d'une saison. Le serveur de combat, l'API et le site lisent ce fichier.
- `sources/saison-N/` : les fiches de la saison (PDF) et leurs corrections (Markdown), à partir desquelles le roster est généré.
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
```

1. `pdf_to_text.py` extrait le texte des fiches.
2. `fetch_pokeapi.py` télécharge depuis PokéAPI les noms et descriptions des attaques en français.
3. `build_roster.py` lit les fiches, applique les corrections (une fiche corrigée remplace celle du PDF), vérifie les stats et relie les contres entre Pokémon du roster.
4. `build_moves.py` ajoute le movepool National Dex de chaque Pokémon, lu dans `server/data`, et le dictionnaire des attaques avec les valeurs PokéDraft.

Les deux derniers scripts affichent les points à corriger dans les fiches : attaques du set absentes du movepool, signatures sans PP, anciens noms d'attaques.

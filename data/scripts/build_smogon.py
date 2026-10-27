import json, os, re, sys
from collections import Counter
sys.stdout.reconfigure(encoding="utf-8")
smogon_dir, roster_path, objets_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

GENERATIONS = [9, 8, 7, 6, 5, 4]
FORMATS = {"ubers": "Ubers", "ou": "OU", "uu": "UU", "ru": "RU", "nu": "NU", "pu": "PU", "zu": "ZU", "lc": "LC",
           "nationaldex": "NatDex", "nationaldexuu": "NatDex UU", "nationaldexru": "NatDex RU"}


def to_id(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def held_items(set_data):
    item = set_data.get("item")
    return [item] if isinstance(item, str) else item or []


roster = json.load(open(roster_path, encoding="utf-8"))
proposed = {item["id"] for item in json.load(open(objets_path, encoding="utf-8"))}
analyses = {}
for generation in GENERATIONS:
    data = json.load(open(os.path.join(smogon_dir, f"gen{generation}.json"), encoding="utf-8"))
    analyses[generation] = {to_id(species): formats for species, formats in data.items()}

recommendations = {}
skipped = Counter()
for pokemon in roster["pokemon"]:
    for generation in GENERATIONS:
        formats = {key: sets for key, sets in analyses[generation].get(pokemon["id"], {}).items() if key in FORMATS}
        if not formats:
            continue
        by_item = {}
        for key, sets in formats.items():
            label = FORMATS[key] if generation == 9 else f"Gen {generation} {FORMATS[key]}"
            for set_data in sets.values():
                for item in held_items(set_data):
                    item_id = to_id(item)
                    if item_id not in proposed:
                        skipped[item] += 1
                        continue
                    labels = by_item.setdefault(item_id, [])
                    if label not in labels:
                        labels.append(label)
        if by_item:
            ranked = sorted(by_item.items(), key=lambda entry: -len(entry[1]))
            recommendations[pokemon["id"]] = {"generation": generation,
                                              "objets": [{"id": item_id, "formats": labels} for item_id, labels in ranked]}
            break

with open(out_path, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(recommendations, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
print(f"{len(recommendations)}/{len(roster['pokemon'])} Pokémon avec des objets recommandés")
print("sans recommandation :", ", ".join(p["nom"] for p in roster["pokemon"] if p["id"] not in recommendations) or "aucun")
if skipped:
    print("objets recommandés absents de la liste :", ", ".join(f"{item} ({count})" for item, count in skipped.most_common()))

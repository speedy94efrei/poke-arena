import csv, json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8")
pokeapi_dir, ps_dir, roster_path, out_dir = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

FRENCH = "5"
STATS = {"1": "hp", "2": "atk", "3": "def", "4": "spa", "5": "spd", "6": "spe"}
ITEM_GROUPS = [
    ("Puissance", ["lifeorb", "choiceband", "choicespecs", "choicescarf", "expertbelt", "muscleband", "wiseglasses",
                   "loadeddice", "weaknesspolicy", "throatspray", "powerherb", "metronome", "scopelens",
                   "razorclaw", "widelens", "zoomlens"]),
    ("Défense et soin", ["leftovers", "blacksludge", "rockyhelmet", "assaultvest", "heavydutyboots", "focussash",
                         "eviolite", "airballoon", "covertcloak", "clearamulet", "protectivepads", "shellbell", "bigroot",
                         "mentalherb", "whiteherb"]),
    ("Baies", ["sitrusberry", "lumberry", "salacberry", "liechiberry", "petayaberry", "custapberry"]),
    ("Contrôle", ["ejectbutton", "ejectpack", "redcard", "shedshell", "roomservice", "lightclay",
                  "toxicorb", "flameorb", "adrenalineorb", "blunderpolicy"]),
    ("Météo et champs", ["damprock", "heatrock", "smoothrock", "icyrock", "terrainextender", "utilityumbrella"]),
    ("Propres à un Pokémon", ["thickclub"]),
]
DESCRIPTIONS = {
    "loadeddice": "Objet à tenir. Les capacités qui frappent plusieurs fois touchent le plus souvent 4 ou 5 fois.",
    "covertcloak": "Objet à tenir. Protège le porteur des effets secondaires des capacités adverses.",
    "clearamulet": "Objet à tenir. Empêche les capacités et talents adverses de baisser les stats du porteur.",
    "icyrock": "Objet à tenir. Prolonge la durée de la capacité Chute de Neige utilisée par le porteur.",
}


def to_id(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def rows(name):
    with open(os.path.join(pokeapi_dir, name), encoding="utf-8", newline="") as handle:
        yield from csv.DictReader(handle)


def clean(text):
    return re.sub(r"\s+", " ", text.replace("­", "")).strip()


showdown_items = set(re.findall(r"^\t(\w+): \{", open(os.path.join(ps_dir, "data", "items.ts"), encoding="utf-8").read(), re.M))
roster = json.load(open(roster_path, encoding="utf-8"))
grouped = {item for _, ids in ITEM_GROUPS for item in ids}
missing_defaults = sorted({p["setParDefaut"]["objetId"] for p in roster["pokemon"]} - grouped)
if missing_defaults:
    sys.exit(f"Objets des sets par défaut absents de la liste : {', '.join(missing_defaults)}")

pokeapi_ids = {to_id(row["identifier"]): row["id"] for row in rows("items.csv")}
names = {row["item_id"]: row["name"] for row in rows("item_names.csv") if row["local_language_id"] == FRENCH}
descriptions = {}
for row in rows("item_flavor_text.csv"):
    if row["language_id"] != FRENCH:
        continue
    current = descriptions.get(row["item_id"])
    if current is None or int(row["version_group_id"]) > current[0]:
        descriptions[row["item_id"]] = (int(row["version_group_id"]), clean(row["flavor_text"]))

items = []
for group, ids in ITEM_GROUPS:
    for item in ids:
        if item not in showdown_items:
            sys.exit(f"Objet inconnu de Showdown : {item}")
        if item not in pokeapi_ids or pokeapi_ids[item] not in names:
            sys.exit(f"Nom français introuvable : {item}")
        pokeapi_id = pokeapi_ids[item]
        items.append({"id": item, "nom": names[pokeapi_id], "groupe": group,
                      "description": DESCRIPTIONS.get(item) or descriptions.get(pokeapi_id, (0, None))[1]})

nature_names = {row["nature_id"]: row["name"] for row in rows("nature_names.csv") if row["local_language_id"] == FRENCH}
natures = []
for row in rows("natures.csv"):
    neutral = row["increased_stat_id"] == row["decreased_stat_id"]
    natures.append({"id": row["identifier"], "nom": nature_names[row["id"]],
                    "plus": None if neutral else STATS[row["increased_stat_id"]],
                    "moins": None if neutral else STATS[row["decreased_stat_id"]]})
natures.sort(key=lambda n: (n["plus"] is not None, n["nom"]))

os.makedirs(out_dir, exist_ok=True)
for name, data in (("objets.json", items), ("natures.json", natures)):
    with open(os.path.join(out_dir, name), "w", encoding="utf-8", newline="\n") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
print(f"{len(items)} objets, {len(natures)} natures")

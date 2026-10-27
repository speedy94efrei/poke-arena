import csv, json, re, sys, unicodedata
from collections import Counter
sys.stdout.reconfigure(encoding="utf-8")
csv.field_size_limit(10_000_000)
roster_path, ps_dir, pokeapi_dir, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

TYPES = {"Normal": "Normal", "Fire": "Feu", "Water": "Eau", "Electric": "Électrik", "Grass": "Plante", "Ice": "Glace",
         "Fighting": "Combat", "Poison": "Poison", "Ground": "Sol", "Flying": "Vol", "Psychic": "Psy", "Bug": "Insecte",
         "Rock": "Roche", "Ghost": "Spectre", "Dragon": "Dragon", "Dark": "Ténèbres", "Steel": "Acier", "Fairy": "Fée",
         "Stellar": "Stellaire", "???": "???"}
CATEGORIES = {"Physical": "physique", "Special": "spécial", "Status": "statut"}
EXCLUDED_NONSTANDARD = {"Unobtainable", "LGPE", "CAP", "Custom", "Gigantamax", "Future"}
OLD_FRENCH_NAMES = {"vitextreme": "extremespeed", "dracopulse": "dragonpulse"}
FRENCH = "5"
NO_EFFECT = "Aucun effet supplémentaire."


def to_id(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def fold(text):
    text = text.replace("’", "'").replace("œ", "oe").replace("Œ", "Oe")
    text = unicodedata.normalize("NFD", text)
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in text if unicodedata.category(c) != "Mn").lower())


def ts_entries(path):
    text = open(path, encoding="utf-8").read()
    return {m.group(1): m.group(2) for m in re.finditer(r"\n\t(\w+): \{\n(.*?)\n\t\},", text, re.S)}


def top_field(block, name):
    m = re.search(r"^\t\t" + name + r": (.+?),?$", block, re.M)
    return m.group(1).strip().rstrip(",") if m else None


def load_ps_moves():
    moves = {}
    for mid, block in ts_entries(f"{ps_dir}/moves.ts").items():
        flags_line = top_field(block, "flags") or "{}"
        flags = set(re.findall(r"(\w+): 1", flags_line))
        accuracy = top_field(block, "accuracy")
        multihit = top_field(block, "multihit")
        moves[mid] = {
            "name": (top_field(block, "name") or "").strip('"'),
            "type": (top_field(block, "type") or "").strip('"'),
            "category": (top_field(block, "category") or "").strip('"'),
            "basePower": int(top_field(block, "basePower") or 0),
            "accuracy": None if accuracy == "true" else int(accuracy),
            "pp": int(top_field(block, "pp") or 0),
            "priority": int(top_field(block, "priority") or 0),
            "flags": flags,
            "multihit": multihit,
            "nonstandard": (top_field(block, "isNonstandard") or "").strip('"') or None,
            "zmax": bool(top_field(block, "isZ") or top_field(block, "isMax")),
        }
    return moves


def load_learnsets():
    text = open(f"{ps_dir}/learnsets.ts", encoding="utf-8").read()
    sets = {}
    for m in re.finditer(r"\n\t(\w+): \{\n\t\tlearnset: \{(.*?)\n\t\t\}", text, re.S):
        sets[m.group(1)] = dict(re.findall(r"\n\t\t\t(\w+): \[([^\]]*)\]", m.group(2)))
    return sets


def load_prevos():
    prevos = {}
    for sid, block in ts_entries(f"{ps_dir}/pokedex.ts").items():
        prevo = top_field(block, "prevo")
        if prevo:
            prevos[sid] = to_id(prevo.strip('"'))
    return prevos


def load_pokeapi():
    by_identifier = {row["identifier"]: row["id"] for row in csv.DictReader(open(f"{pokeapi_dir}/moves.csv", encoding="utf-8"))}
    ps_to_api = {to_id(identifier): api_id for identifier, api_id in by_identifier.items()}
    names = {row["move_id"]: row["name"] for row in csv.DictReader(open(f"{pokeapi_dir}/move_names.csv", encoding="utf-8"))
             if row["local_language_id"] == FRENCH}
    order = {row["id"]: int(row["order"]) for row in csv.DictReader(open(f"{pokeapi_dir}/version_groups.csv", encoding="utf-8"))}
    texts = {}
    for row in csv.DictReader(open(f"{pokeapi_dir}/move_flavor_text.csv", encoding="utf-8")):
        if row["language_id"] != FRENCH:
            continue
        rank = order.get(row["version_group_id"], 0)
        if row["move_id"] not in texts or rank > texts[row["move_id"]][0]:
            texts[row["move_id"]] = (rank, " ".join(row["flavor_text"].replace("­", "").split()))
    return ps_to_api, names, {k: v[1] for k, v in texts.items()}


def movepool_for(pid, natdex, learnsets, prevos, ps_moves):
    pool, species = set(), pid
    while species:
        for move, sources in learnsets.get(species, {}).items():
            if natdex or '"9' in sources:
                pool.add(move)
        species = prevos.get(species)
    return {m for m in pool if m in ps_moves and not ps_moves[m]["zmax"]
            and ps_moves[m]["nonstandard"] not in EXCLUDED_NONSTANDARD
            and (natdex or ps_moves[m]["nonstandard"] is None)}


def official_entry(mid, ps, api_id, names, texts):
    return {
        "id": mid, "nom": names.get(api_id, ps["name"]).replace("’", "'"), "nomAnglais": ps["name"],
        "type": TYPES[ps["type"]], "categorie": CATEGORIES[ps["category"]],
        "puissance": ps["basePower"] or None, "precision": ps["accuracy"], "pp": ps["pp"], "priorite": ps["priority"],
        "contact": "contact" in ps["flags"], "son": "sound" in ps["flags"], "morsure": "bite" in ps["flags"],
        "danse": "dance" in ps["flags"], "coupsMultiples": bool(ps["multihit"]),
        "effet": texts.get(api_id), "origine": "officielle",
    }


def signature_effect(sig):
    head = re.search(r"[A-ZÉ][\wéèêïë]+ · (physique|spécial|statut)[^.]*\.", sig["description"])
    effect = sig["description"][head.end():].strip() if head else sig["description"]
    return effect or NO_EFFECT


def build():
    doc = json.load(open(roster_path, encoding="utf-8"))
    ps_moves, learnsets, prevos = load_ps_moves(), load_learnsets(), load_prevos()
    ps_to_api, names, texts = load_pokeapi()
    fr_to_id = {fold(names[api]): mid for mid, api in ps_to_api.items() if api in names and mid in ps_moves}
    dictionary, problems, to_define = {}, [], []

    def official(mid):
        if mid not in dictionary:
            dictionary[mid] = official_entry(mid, ps_moves[mid], ps_to_api.get(mid), names, texts)
        return dictionary[mid]

    def by_french(name):
        key = fold(name)
        if key in OLD_FRENCH_NAMES:
            problems.append(f"nom FR ancien dans une fiche : '{name}' -> '{official(OLD_FRENCH_NAMES[key])['nom']}'")
            return OLD_FRENCH_NAMES[key]
        return fr_to_id.get(key)

    doc["regles"] = ("Stats PokéDraft = total officiel redistribué. Movepool de base = National Dex pour tous les Pokémon "
                     "(toutes les attaques apprises dans une génération), plus les ajouts de la fiche. La signature est "
                     "disponible mais pas obligatoire. Puissances et précisions ajustables par patch.")
    for p in doc["pokemon"]:
        pool = movepool_for(p["id"], True, learnsets, prevos, ps_moves)
        if not pool:
            problems.append(f"{p['nom']}: movepool vide")

        sig = p["signature"]
        sig_id = by_french(sig["nom"]) if "officielle" in sig["origine"] else None
        if sig_id:
            entry = dict(official(sig_id))
            base = dict(entry)
            entry.update({k: v for k, v in {"type": sig["type"], "categorie": sig["categorie"], "puissance": sig["puissance"],
                                             "precision": None if sig["neRateJamais"] else sig["precision"],
                                             "priorite": sig["priorite"]}.items() if v is not None})
            changed = {k: base[k] for k in ("type", "categorie", "puissance", "precision", "priorite") if base[k] != entry[k]}
            if sig["origine"] != "officielle":
                entry.update({"origine": "officielle modifiée", "effet": signature_effect(sig),
                              "effetOfficiel": base["effet"], "officiel": changed or None})
            entry["signatureDe"] = p["id"]
            dictionary[sig_id] = entry
        else:
            sig_id = to_id(fold(sig["nom"]))
            if sig_id in ps_moves:
                problems.append(f"{p['nom']}: id de signature créée en conflit avec Showdown ({sig_id})")
            physical = sig["categorie"] == "physique"
            dictionary[sig_id] = {
                "id": sig_id, "nom": sig["nom"], "nomAnglais": None, "type": sig["type"], "categorie": sig["categorie"],
                "puissance": sig["puissance"], "precision": None if sig["neRateJamais"] else sig["precision"], "pp": None,
                "priorite": sig["priorite"], "contact": None if physical else False, "son": "sonore" in sig["description"],
                "morsure": None if "Croc" in sig["nom"] else False, "danse": False, "coupsMultiples": bool(sig["coups"]),
                "effet": signature_effect(sig), "origine": "signature créée", "signatureDe": p["id"],
            }
            to_define.append((p["nom"], sig["nom"], ["pp"] + (["contact"] if physical else []) + (["morsure"] if "Croc" in sig["nom"] else [])))
        pool.add(sig_id)

        added_ids = []
        raw = re.sub(r"\([^)]*\)", "", p["ajoutsMovepool"]).split(". ")[0]
        for name in [n.strip(" .") for n in raw.split(",")]:
            if not name or fold(name) == "aucun":
                continue
            mid = by_french(name)
            if not mid:
                problems.append(f"{p['nom']}: ajout introuvable '{name}'")
                continue
            added_ids.append(mid)
            pool.add(mid)

        set_ids, outside = [], []
        for name in p["setParDefaut"]["attaques"]:
            mid = sig_id if fold(name) == fold(sig["nom"]) else by_french(name)
            if not mid:
                problems.append(f"{p['nom']}: attaque du set introuvable '{name}'")
                continue
            set_ids.append(mid)
            if mid not in pool:
                outside.append(mid)
                official(mid)
                older = mid in movepool_for(p["id"], True, learnsets, prevos, ps_moves)
                reason = "appris seulement avant la Gen 9" if older else "jamais appris officiellement"
                problems.append(f"{p['nom']}: '{name}' est dans le set mais pas dans le movepool ({reason})")

        for mid in pool:
            if mid in ps_moves:
                official(mid)
        p["signatureId"], p["ajoutsMovepoolIds"] = sig_id, added_ids
        p["setParDefaut"]["attaquesIds"] = set_ids
        p["setParDefaut"]["horsMovepool"] = outside
        p["movepool"] = sorted(pool, key=lambda m: fold(dictionary[m]["nom"]))

    for entry in dictionary.values():
        if entry["effet"] is None:
            problems.append(f"attaque sans texte FR: {entry['nom']} ({entry['id']})")
    doc["attaques"] = dict(sorted(dictionary.items(), key=lambda kv: fold(kv[1]["nom"])))
    json.dump(doc, open(out, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    return doc, problems, to_define


doc, problems, to_define = build()
sizes = sorted((len(p["movepool"]), p["nom"]) for p in doc["pokemon"])
print("attaques dans le dictionnaire:", len(doc["attaques"]))
print("movepool min/max:", sizes[:3], sizes[-3:])
print("origines:", Counter(a["origine"] for a in doc["attaques"].values()))
print("signatures modifiees:", [(a["nom"], a.get("officiel")) for a in doc["attaques"].values() if a["origine"] == "officielle modifiée"])
print("a definir:", *to_define, sep="\n  ")
print("problemes:", *problems, sep="\n  ")

import json
import os
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")
roster_path, ps_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]

TYPES = {"Normal": "Normal", "Feu": "Fire", "Eau": "Water", "Électrik": "Electric", "Plante": "Grass", "Glace": "Ice",
         "Combat": "Fighting", "Poison": "Poison", "Sol": "Ground", "Vol": "Flying", "Psy": "Psychic", "Insecte": "Bug",
         "Roche": "Rock", "Spectre": "Ghost", "Dragon": "Dragon", "Ténèbres": "Dark", "Acier": "Steel", "Fée": "Fairy"}
CATEGORIES = {"physique": "Physical", "spécial": "Special", "statut": "Status"}
STATS = {"pv": "hp", "atq": "atk", "def": "def", "atqSpe": "spa", "defSpe": "spd", "vit": "spe"}
DEFAULT_PP = 10
HEADER = f"// Généré depuis {os.path.relpath(roster_path).replace(os.sep, '/')} par data/scripts/build_mod.py. Ne pas modifier à la main.\n"


def ps_id(text):
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def ps_name(name):
    """Showdown tire l'id du nom : les accents décomposés gardent l'affichage et donnent un id sans accent."""
    decomposed = unicodedata.normalize("NFD", name).replace("’", "'")
    return json.dumps(decomposed, ensure_ascii=True)


def text(value):
    return json.dumps(value, ensure_ascii=False)


def official_ability_names():
    content = open(f"{ps_dir}/abilities.ts", encoding="utf-8").read()
    names = {}
    for match in re.finditer(r"\n\t(\w+): \{\n(.*?)\n\t\},", content, re.S):
        name = re.search(r'^\t\tname: "(.+?)",$', match.group(2), re.M)
        if name:
            names[match.group(1)] = name.group(1)
    return names


def write(name, body):
    with open(os.path.join(out_dir, name), "w", encoding="utf-8", newline="\n") as file:
        file.write(HEADER + "\n" + body)


def pokedex(roster, ability_names):
    lines = ["export const Pokedex: import('../../../sim/dex-species').ModdedSpeciesDataTable = {"]
    for p in roster:
        talent = p["talent"]
        ability = text(ability_names[talent["id"]]) if talent["origine"].startswith("officiel") else ps_name(talent["nom"])
        stats = ", ".join(f"{STATS[k]}: {p['stats'][k]}" for k in STATS)
        lines += [f"\t{p['id']}: {{", "\t\tinherit: true,", f"\t\tbaseStats: {{ {stats} }},",
                  f"\t\tabilities: {{ 0: {ability} }},", "\t},"]
    return "\n".join(lines + ["};", ""])


def abilities(roster):
    lines = ["export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {"]
    created = [p for p in roster if not p["talent"]["origine"].startswith("officiel")]
    for number, p in enumerate(created, start=1):
        talent = p["talent"]
        lines += [f"\t{talent['id']}: {{", f"\t\tname: {ps_name(talent['nom'])},",
                  f"\t\tshortDesc: {text(talent['effet'])},", "\t\trating: 3,", f"\t\tnum: -{number},",
                  "\t\tflags: {},", "\t},"]
    return "\n".join(lines + ["};", ""])


def move_flags(move):
    flags = ["protect: 1", "mirror: 1"] if move["categorie"] != "statut" else []
    flags.append("metronome: 1")
    if move["categorie"] == "physique" and move["contact"] is not False:
        flags.append("contact: 1")
    for field, flag in (("son", "sound"), ("morsure", "bite"), ("danse", "dance")):
        if move[field]:
            flags.append(f"{flag}: 1")
    return "{ " + ", ".join(flags) + " }"


def accuracy(move):
    return "true" if move["precision"] is None else str(move["precision"])


def moves(roster, dictionary):
    lines = ["export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {"]
    hits = {p["signatureId"]: p["signature"]["coups"] for p in roster}
    created = [m for m in dictionary.values() if m["origine"] == "signature créée"]
    for number, move in enumerate(created, start=1):
        status = move["categorie"] == "statut"
        lines += [f"\t{move['id']}: {{", f"\t\tnum: -{number},", f"\t\tname: {ps_name(move['nom'])},",
                  f"\t\ttype: {text(TYPES[move['type']])},", f"\t\tcategory: {text(CATEGORIES[move['categorie']])},",
                  f"\t\tbasePower: {move['puissance'] or 0},", f"\t\taccuracy: {accuracy(move)},"]
        if move["pp"] is None:
            lines.append(f"\t\tpp: {DEFAULT_PP}, // PP à définir dans la fiche")
        else:
            lines.append(f"\t\tpp: {move['pp']},")
        lines += [f"\t\tpriority: {move['priorite']},", f"\t\tflags: {move_flags(move)},"]
        if hits.get(move["id"]):
            lines.append(f"\t\tmultihit: {hits[move['id']]},")
        lines += [f"\t\ttarget: {text('self' if status else 'normal')},", "\t\tsecondary: null,",
                  f"\t\tshortDesc: {text(move['effet'])},", "\t},"]
    fields = {"puissance": "basePower", "precision": "accuracy", "priorite": "priority", "type": "type", "categorie": "category"}
    for move in dictionary.values():
        if move["origine"] != "officielle modifiée" or not move.get("officiel"):
            continue
        lines += [f"\t{move['id']}: {{", "\t\tinherit: true,"]
        for field in move["officiel"]:
            value = {"precision": accuracy(move), "type": text(TYPES[move["type"]]),
                     "categorie": text(CATEGORIES[move["categorie"]])}.get(field, str(move[field]))
            lines.append(f"\t\t{fields[field]}: {value},")
        lines.append("\t},")
    return "\n".join(lines + ["};", ""])


def movepool(roster):
    lines = ["export const AjoutsMovepool: { [speciesid: string]: string[] } = {"]
    for p in roster:
        added = list(dict.fromkeys(p["ajoutsMovepoolIds"] + [p["signatureId"]]))
        lines.append(f"\t{p['id']}: [{', '.join(text(m) for m in added)}],")
    return "\n".join(lines + ["};", ""])


def check_ids(roster, dictionary):
    names = [(p["talent"]["id"], p["talent"]["nom"]) for p in roster if not p["talent"]["origine"].startswith("officiel")]
    names += [(m["id"], m["nom"]) for m in dictionary.values() if m["origine"] == "signature créée"]
    for expected, name in names:
        actual = ps_id(json.loads(ps_name(name)))
        if actual != expected:
            sys.exit(f"id Showdown inattendu pour « {name} » : {actual} au lieu de {expected}")


doc = json.load(open(roster_path, encoding="utf-8"))
roster, dictionary = doc["pokemon"], doc["attaques"]
check_ids(roster, dictionary)
write("pokedex.ts", pokedex(roster, official_ability_names()))
write("abilities.ts", abilities(roster))
write("moves.ts", moves(roster, dictionary))
write("movepool.ts", movepool(roster))
created_moves = sum(1 for m in dictionary.values() if m["origine"] == "signature créée")
print(f"{len(roster)} Pokémon, {sum(1 for p in roster if not p['talent']['origine'].startswith('officiel'))} talents créés, "
      f"{created_moves} signatures créées écrits dans {out_dir}")

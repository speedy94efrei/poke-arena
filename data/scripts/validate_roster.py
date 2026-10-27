import json
import os
import sys
from jsonschema import Draft202012Validator

sys.stdout.reconfigure(encoding="utf-8")
roster_path = sys.argv[1]
schema_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "schemas", "roster.schema.json")
STAT_KEYS = ["pv", "atq", "def", "atqSpe", "defSpe", "vit"]


def schema_errors(doc, schema):
    validator = Draft202012Validator(schema)
    for error in sorted(validator.iter_errors(doc), key=lambda e: list(e.absolute_path)):
        path = "/".join(str(part) for part in error.absolute_path) or "(racine)"
        yield f"{path} : {error.message}"


def integrity_errors(doc):
    moves, roster = doc["attaques"], doc["pokemon"]
    ids = [p["id"] for p in roster]
    known = set(ids)
    used = set()
    for key, move in moves.items():
        if key != move["id"]:
            yield f"attaques/{key} : la clé ne correspond pas à l'id « {move['id']} »"
    for duplicate in {i for i in ids if ids.count(i) > 1}:
        yield f"pokemon : id en double « {duplicate} »"
    for p in roster:
        where = f"pokemon/{p['id']}"
        for name in ("stats", "statsOfficielles"):
            if sum(p[name][k] for k in STAT_KEYS) != p[name]["total"]:
                yield f"{where}/{name} : le total ne correspond pas à la somme des stats"
        if p["stats"]["total"] != p["statsOfficielles"]["total"]:
            yield f"{where}/stats : total {p['stats']['total']} au lieu du total officiel {p['statsOfficielles']['total']}"
        pool = set(p["movepool"])
        referenced = {"movepool": p["movepool"], "signatureId": [p["signatureId"]],
                      "ajoutsMovepoolIds": p["ajoutsMovepoolIds"], "setParDefaut/attaquesIds": p["setParDefaut"]["attaquesIds"]}
        for field, move_ids in referenced.items():
            for move_id in move_ids:
                used.add(move_id)
                if move_id not in moves:
                    yield f"{where}/{field} : attaque inconnue « {move_id} »"
        for field, move_ids in (("signatureId", [p["signatureId"]]), ("ajoutsMovepoolIds", p["ajoutsMovepoolIds"])):
            for move_id in move_ids:
                if move_id not in pool:
                    yield f"{where}/{field} : « {move_id} » n'est pas dans le movepool"
        signature = moves.get(p["signatureId"])
        if signature and signature.get("signatureDe") != p["id"]:
            yield f"{where}/signatureId : l'attaque « {p['signatureId']} » n'est pas marquée comme sa signature"
        outside = [m for m in p["setParDefaut"]["attaquesIds"] if m not in pool]
        if outside != p["setParDefaut"]["horsMovepool"]:
            yield f"{where}/setParDefaut/horsMovepool : devrait valoir {outside}"
        for field in ("contresIds", "ilContre"):
            for other in p[field]:
                if other not in known or other == p["id"]:
                    yield f"{where}/{field} : « {other} » n'est pas un autre Pokémon du roster"
        for other in p["contresIds"]:
            counters = next((q for q in roster if q["id"] == other), None)
            if counters and p["id"] not in counters["ilContre"]:
                yield f"{where}/contresIds : « {other} » ne le liste pas dans ilContre"
    for move_id, move in moves.items():
        if move_id not in used:
            yield f"attaques/{move_id} : attaque utilisée par aucun Pokémon"
        if move.get("signatureDe") and move["signatureDe"] not in known:
            yield f"attaques/{move_id}/signatureDe : « {move['signatureDe']} » n'est pas dans le roster"


def to_complete(doc):
    moves = doc["attaques"].values()
    for field in ("pp", "contact", "morsure"):
        missing = [m["nom"] for m in moves if m[field] is None]
        if missing:
            yield f"{field} à définir pour {len(missing)} attaque(s) : {', '.join(missing[:5])}{'…' if len(missing) > 5 else ''}"
    for p in doc["pokemon"]:
        if p["setParDefaut"]["horsMovepool"]:
            yield f"{p['nom']} : set par défaut hors movepool ({', '.join(p['setParDefaut']['horsMovepool'])})"
        if p["talent"]["aValider"] or p["signature"]["aValider"]:
            yield f"{p['nom']} : fiche à valider"


doc = json.load(open(roster_path, encoding="utf-8"))
schema = json.load(open(schema_path, encoding="utf-8"))
errors = list(schema_errors(doc, schema))
if not errors:
    errors = list(integrity_errors(doc))
for error in errors:
    print("ERREUR", error)
for item in to_complete(doc):
    print("À COMPLÉTER", item)
print(f"{roster_path} : {len(errors)} erreur(s)")
sys.exit(1 if errors else 0)

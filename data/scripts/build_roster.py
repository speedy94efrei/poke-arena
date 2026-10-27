import json, re, sys
from collections import Counter
sys.stdout.reconfigure(encoding="utf-8")
src, formats_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
corrections_paths = sys.argv[4:]

IDS = {
 "Lamantine":"dewgong","Onix":"onix","Ossatueur":"marowak","Arbok":"arbok","Canarticho":"farfetchd",
 "Hypnomade":"hypno","Écrémeuh":"miltank","Lanturn":"lanturn","Typhlosion":"typhlosion","Qwilfish":"qwilfish",
 "Démolosse":"houndoom","Scarhino":"heracross","Relicanth":"relicanth","Ninjask":"ninjask","Tropius":"tropius",
 "Libégon":"flygon","Sharpedo":"sharpedo","Altaria":"altaria","Bastiodon":"bastiodon","Blizzaroi":"abomasnow",
 "Momartik":"froslass","Lucario":"lucario","Dimoret":"weavile","Pachirisu":"pachirisu","Luxray":"luxray",
 "Tutankafer":"cofagrigus","Scalproie":"bisharp","Manternel":"leavanny","Crabaraque":"crustle","Mushana":"musharna",
 "Nymphali":"sylveon","Ptyranidur":"tyrantrum","Brutalibré":"hawlucha","Dedenne":"dedenne","Banshitrouye":"gourgeist",
 "Bourrinos":"mudsdale","Trépassable":"palossand","Feunard d'Alola":"ninetalesalola","Malamandre":"salazzle",
 "Gouroutan":"oranguru","Duralugon":"duraludon","Corvaillus":"corviknight","Dunaconda":"sandaconda",
 "Salarsen":"toxtricity","Wimessir":"indeedee","Motorizard":"cyclizar","Forgelina":"tinkaton",
 "Scovilain":"scovillain","Palmaval":"quaquaval","Fragroin":"oinkologne",
}
SPRITE = {"ninetalesalola": "ninetales-alola"}
OFFICIAL_ARCHETYPES = {"Terrain Électrique": "Champ Électrifié", "Terrain Psychique": "Champ Psychique",
                       "Terrain Brumeux": "Champ Brumeux", "Terrain Herbu": "Champ Herbu"}
LABELS = ["Correction :", "Archétypes :", "Stats :", "Talent —", "Signature —", "Ajouts au movepool :",
          "Set par défaut :", "Faiblesses :", "Contres naturels :", "Piégeables :", "Draft :"]
STAT_KEYS = ["pv", "atq", "def", "atqSpe", "defSpe", "vit"]


def read_lines(path):
    kept = []
    for raw in open(path, encoding="utf-8").read().splitlines():
        line = raw.strip()
        if (not line or line == "Fiches Pokémon" or re.match(r"^Page \d+ of \d+$", line)
                or line.startswith(("--- page", "pages:")) or "warnings.warn" in line):
            continue
        kept.append(line)
    return kept


def read_md_lines(path):
    kept, inside = [], False
    for raw in open(path, encoding="utf-8").read().splitlines():
        line = raw.strip()
        if line.startswith("#"):
            inside = line.startswith("### ")
            if inside:
                kept.append(line[4:].strip())
            continue
        if not inside or not line:
            continue
        line = re.sub(r"^- ", "", line).replace("**", "")
        line = re.sub(r"^Pokémon piégeables \(\d+\) :", "Piégeables :", line)
        kept.append(line)
    return kept


def group_entries(lines):
    entries, current = [], None
    for i, line in enumerate(lines):
        if re.match(r"^Génération \d$", line):
            continue
        if line in IDS and i + 1 < len(lines) and "· Gen " in lines[i + 1]:
            current = {"nom": line, "lines": []}
            entries.append(current)
        elif current is not None:
            current["lines"].append(line)
    return entries


def join(lines):
    text = ""
    for line in lines:
        glue = "" if text.endswith("-") and not text.endswith(" -") else " "
        text = line if not text else text + glue + line
    return text


def split_fields(text):
    pattern = "(" + "|".join(re.escape(label) for label in LABELS) + ")"
    parts = re.split(pattern, text)
    return parts[0].strip(), {parts[k]: parts[k + 1].strip() for k in range(1, len(parts), 2)}


def parse_stats(text):
    m = re.search(r"(\d+) PV · (\d+) Atq · (\d+) Déf · (\d+) Atq Spé · (\d+) Déf Spé · (\d+) Vit \((\d+)\)", text)
    o = re.search(r"Officiel[^:]*: (\d+)/(\d+)/(\d+)/(\d+)/(\d+)/(\d+)", text)
    stats = dict(zip(STAT_KEYS, map(int, m.groups()[:6])))
    stats["total"] = int(m.group(7))
    official = dict(zip(STAT_KEYS, map(int, o.groups())))
    official["total"] = sum(official.values())
    note = re.search(r"Officiel \(([^)]+)\)", text)
    return stats, official, note.group(1) if note else None


def parse_named(text):
    m = re.match(r"(?P<nom>.+?) \((?P<origine>[^)]+)\)(?P<flag> — À (?:RE)?VALIDER)? : (?P<rest>.*)$", text)
    origine = m.group("origine")
    to_validate = bool(m.group("flag")) or "VALIDER" in origine
    origine = re.sub(r",\s*À (RE)?VALIDER", "", origine).strip()
    rest = m.group("rest").strip()
    lore = re.search(r"\s*Lore : (.*)$", rest)
    effect = rest[:lore.start()].strip() if lore else rest
    return m.group("nom").strip(), origine, to_validate, effect, lore.group(1).strip() if lore else None


def parse_signature(text):
    sig = {"type": None, "categorie": None, "puissance": None, "coups": None,
           "precision": None, "neRateJamais": False, "priorite": 0}
    head = re.search(r"(?P<type>[A-ZÉ][\wéèêïë]+) · (?P<cat>physique|spécial|statut)"
                     r"(?: · (?P<pow>\d+)(?: × (?P<hits>\d+) coups)?)?"
                     r"(?: · (?P<acc>\d+ %|ne rate jamais))?"
                     r"(?: · (?P<extra>[^.]+?))?(?:\.|$)", text)
    if not head:
        return sig
    sig["type"], sig["categorie"] = head.group("type"), head.group("cat")
    sig["puissance"] = int(head.group("pow")) if head.group("pow") else None
    sig["coups"] = int(head.group("hits")) if head.group("hits") else None
    accuracy = head.group("acc")
    if accuracy == "ne rate jamais" or "ne rate jamais" in (head.group("extra") or ""):
        sig["neRateJamais"] = True
    elif accuracy:
        sig["precision"] = int(accuracy.split()[0])
    else:
        improved = re.search(r"Amélioré : précision (\d+) %", text)
        if improved:
            sig["precision"] = int(improved.group(1))
    priority = re.search(r"priorité ([+\-−]\d)", head.group(0))
    if priority:
        sig["priorite"] = int(priority.group(1).replace("−", "-"))
    return sig


def parse_set(text):
    parts = [p.strip() for p in text.split(" · ")]
    moves_text, _, note = " · ".join(parts[2:]).partition(". ")
    return {"objet": parts[0], "nature": parts[1],
            "attaques": [m.strip().rstrip(".") for m in moves_text.split(",")],
            "note": note.strip() or None}


def showdown_tier(formats, pid):
    m = re.search(r"\n\t" + pid + r": \{(.*?)\n\t\}", formats, re.S)
    if not m:
        return None
    tier = re.search(r'tier: "([^"]+)"', m.group(1))
    past = re.search(r'isNonstandard: "([^"]+)"', m.group(1))
    return (past.group(1) + " / " if past else "") + (tier.group(1) if tier else "?")


def build():
    formats = open(formats_path, encoding="utf-8").read()
    roster, problems = [], []
    entries = group_entries(read_lines(src))
    corrected = {}
    for path in corrections_paths:
        for e in group_entries(read_md_lines(path)):
            corrected[e["nom"]] = e
    entries = [corrected.get(e["nom"], e) for e in entries]
    for e in entries:
        head, f = split_fields(join(e["lines"]))
        head_parts = [h.strip() for h in head.split(" · ")]
        pid = IDS[e["nom"]]
        stats, official, official_note = parse_stats(f["Stats :"])
        t_nom, t_or, t_val, t_eff, t_lore = parse_named(f["Talent —"])
        s_nom, s_or, s_val, s_eff, s_lore = parse_named(f["Signature —"])
        entry = {
            "id": pid, "nom": e["nom"], "generation": int(head_parts[1].split()[1]),
            "types": head_parts[2].split("/"), "roles": [r.strip() for r in head_parts[0].split(",")],
            "archetypes": [OFFICIAL_ARCHETYPES.get(a.strip(), a.strip()) for a in f["Archétypes :"].split(",")],
            "tierSmogonFiche": " · ".join(head_parts[3:]).replace("Smogon : ", ""),
            "tierShowdownActuel": showdown_tier(formats, pid),
            "stats": stats, "statsOfficielles": official, "statsOfficiellesNote": official_note,
            "talent": {"nom": t_nom, "origine": t_or, "aValider": t_val, "effet": t_eff, "lore": t_lore},
            "signature": {"nom": s_nom, "origine": s_or, "aValider": s_val, **parse_signature(s_eff),
                          "description": s_eff, "lore": s_lore},
            "ajoutsMovepool": f["Ajouts au movepool :"],
            "setParDefaut": parse_set(f["Set par défaut :"]),
            "faiblesses": f["Faiblesses :"], "contres": f["Contres naturels :"], "conseilDraft": f["Draft :"],
            "piegeables": [n.strip().rstrip(".") for n in f["Piégeables :"].split(",")] if "Piégeables :" in f else None,
            "correction": f.get("Correction :"),
            "sprite": f"https://play.pokemonshowdown.com/sprites/gen5/{SPRITE.get(pid, pid)}.png",
        }
        roster.append(entry)
        if stats["total"] != official["total"]:
            problems.append(f"{e['nom']}: total {stats['total']} != officiel {official['total']}")
        if sum(stats[k] for k in STAT_KEYS) != stats["total"]:
            problems.append(f"{e['nom']}: somme des stats != total affiché")
        for group in re.findall(r"\(([^)]*)\)", entry["contres"]):
            for name in re.split(r",|\bet\b", group):
                name = name.strip().rstrip(".…").strip()
                if name and name[0].isupper() and name not in IDS and not name.startswith(("Champ", "Osmerang", "Triple")):
                    problems.append(f"{e['nom']}: contre hors roster ? '{name}'")
    return roster, problems


def link_counters(roster):
    by_name = sorted(IDS.items(), key=lambda item: -len(item[0]))
    for p in roster:
        found = []
        for name, pid in by_name:
            if pid != p["id"] and re.search(r"(?<![\wÀ-ÿ])" + re.escape(name) + r"(?![\wÀ-ÿ])", p["contres"]):
                found.append((p["contres"].index(name), pid))
        p["contresIds"] = [pid for _, pid in sorted(found)]
    for p in roster:
        p["ilContre"] = [q["id"] for q in roster if p["id"] in q["contresIds"]]


roster, problems = build()
link_counters(roster)
json.dump({"saison": 1, "titre": "Fiches Pokémon — Saison 1",
           "regles": "Stats PokéDraft = total officiel redistribué. Movepool de base = Smogon (Gen 9, National Dex pour les absents de Gen 9). La signature est disponible mais pas obligatoire. Puissances et précisions ajustables par patch.",
           "pokemon": roster},
          open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("pokemon:", len(roster))
print("types:", dict(sorted(Counter(t for p in roster for t in p["types"]).items(), key=lambda x: x[1])))
print("archetypes:", dict(Counter(a for p in roster for a in p["archetypes"]).most_common()))
print("corriges:", [p["nom"] for p in roster if p["correction"]])
print("a valider:", [p["nom"] for p in roster if p["talent"]["aValider"] or p["signature"]["aValider"]])
print("signature sans en-tete parse:", [p["nom"] for p in roster if not p["signature"]["type"]])
print("tiers fiche vs showdown:")
for p in roster:
    print(f"  {p['nom']:16} fiche={p['tierSmogonFiche']:40} showdown={p['tierShowdownActuel']}")
print("problemes:", *problems, sep="\n  ")
names = {p["id"]: p["nom"] for p in roster}
print("moins de 2 contres nommes:", [(p["nom"], [names[i] for i in p["contresIds"]]) for p in roster if len(p["contresIds"]) < 2])
print("contre le plus souvent:", sorted(((len(p["ilContre"]), p["nom"]) for p in roster), reverse=True)[:8])
print("ne contre personne:", [p["nom"] for p in roster if not p["ilContre"]])
for p in roster:
    print(f"  {p['nom']:16} contres={[names[i] for i in p['contresIds']]}")

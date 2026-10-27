import os
import sys
import urllib.request

BASE = "https://data.pkmn.cc/sets"
GENERATIONS = ["gen9", "gen8", "gen7", "gen6", "gen5", "gen4"]

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for generation in GENERATIONS:
    request = urllib.request.Request(f"{BASE}/{generation}.json", headers={"User-Agent": "arene-pokedraft"})
    with urllib.request.urlopen(request) as response, open(os.path.join(out, f"{generation}.json"), "wb") as handle:
        handle.write(response.read())
    print("ok", generation)

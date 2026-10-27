import os
import sys
import urllib.request

BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"
FILES = ["moves.csv", "move_names.csv", "move_flavor_text.csv", "version_groups.csv",
         "abilities.csv", "ability_names.csv", "items.csv", "item_names.csv", "natures.csv", "nature_names.csv"]

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for name in FILES:
    urllib.request.urlretrieve(f"{BASE}/{name}", os.path.join(out, name))
    print("ok", name)

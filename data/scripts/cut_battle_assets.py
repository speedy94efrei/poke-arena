import os
import sys
from collections import deque
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
platine_path, princess_path, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]

TIMES = ["jour", "crepuscule", "nuit"]
PLATINE_BACKGROUNDS = [
    [f"plaine-{t}" for t in TIMES], [f"mer-{t}" for t in TIMES], [f"ville-{t}" for t in TIMES],
    [f"foret-{t}" for t in TIMES], [f"montagne-{t}" for t in TIMES], [f"neige-{t}" for t in TIMES],
    ["interieur-1", "interieur-2", "interieur-3"], ["grotte-1", "grotte-2", "grotte-3"],
    ["aaron", "terry", "adrien"], ["lucio", "cynthia", "monde-distorsion"],
    ["tour-de-combat", "usine-de-combat", "arcade-de-combat"], ["chateau-de-combat", "salle-de-combat", None],
]
PLATINE_PLATFORMS = [
    [f"herbe-{t}" for t in TIMES], [f"eau-{t}" for t in TIMES], [f"chemin-{t}" for t in TIMES],
    [f"glace-{t}" for t in TIMES], [f"rocher-{t}" for t in TIMES], [f"neige-{t}" for t in TIMES],
    [f"sable-{t}" for t in TIMES], [f"boue-{t}" for t in TIMES], [f"chemin-mouille-{t}" for t in TIMES],
    ["grotte", "interieur", "aaron"], ["terry", "adrien", "lucio"], ["cynthia", "monde-distorsion", "tour-de-combat"],
    ["usine-de-combat", "arcade-de-combat", "chateau-de-combat"], ["salle-de-combat", None, None],
]
PRINCESS_BACKGROUNDS = [[f"route-{t}" for t in TIMES], [f"gymnase-{t}" for t in TIMES], [f"pont-{t}" for t in TIMES]]


def save(image, folder, name):
    os.makedirs(os.path.join(out_dir, folder), exist_ok=True)
    image.save(os.path.join(out_dir, folder, f"{name}.png"), optimize=True)


def is_background(pixel):
    return pixel[3] < 10 or pixel[:3] == (255, 255, 255)


def clear_outside(cell):
    pixels, width, height = cell.load(), cell.width, cell.height
    queue = deque((x, y) for x in range(width) for y in (0, height - 1))
    queue.extend((x, y) for y in range(height) for x in (0, width - 1))
    seen = set()
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not (0 <= x < width and 0 <= y < height) or not is_background(pixels[x, y]):
            continue
        seen.add((x, y))
        pixels[x, y] = (0, 0, 0, 0)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return cell


def split_platforms(cell):
    rows = [y for y in range(cell.height) if any(cell.getpixel((x, y))[3] for x in range(cell.width))]
    gaps = [(rows[i + 1] - rows[i], i) for i in range(len(rows) - 1)]
    cut = rows[max(gaps)[1]] + 1
    top, bottom = cell.crop((0, 0, cell.width, cut)), cell.crop((0, cut, cell.width, cell.height))
    return top.crop(top.getbbox()), bottom.crop(bottom.getbbox())


def cut_platine(sheet):
    count = 0
    for row, names in enumerate(PLATINE_BACKGROUNDS):
        for column, name in enumerate(names):
            if name:
                top = 16 + 168 * row
                save(sheet.crop((256 * column, top, 256 * column + 256, top + 152)).convert("RGB"), "decors", name)
                count += 1
    for row, names in enumerate(PLATINE_PLATFORMS):
        for column, name in enumerate(names):
            if not name:
                continue
            left, top = 768 + 256 * column, 96 * row + 16
            cell = clear_outside(sheet.crop((left, top, left + 256, top + 80)).convert("RGBA"))
            opponent, player = split_platforms(cell)
            save(opponent, "plateformes", f"{name}-adverse")
            save(player, "plateformes", f"{name}-joueur")
            count += 2
    return count


def cut_princess(sheet):
    for row, names in enumerate(PRINCESS_BACKGROUNDS):
        for column, name in enumerate(names):
            save(sheet.crop((256 * column, 192 * row, 256 * column + 256, 192 * row + 192)).convert("RGB"), "decors", name)
    return 9


total = cut_platine(Image.open(platine_path).convert("RGBA")) + cut_princess(Image.open(princess_path))
print(f"{total} images écrites dans {out_dir}")

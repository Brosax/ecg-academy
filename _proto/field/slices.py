"""Dev helper: render orthogonal slices of the voxel heart (local frame) from cache/geom_dump.json.
Usage: python -I slices.py <geom_dump.json> <out.png>"""
import json
import sys
from PIL import Image, ImageDraw

d = json.load(open(sys.argv[1]))
n = d["n"]
loc = d["loc"]
ch = d["ch"]
sf = d["sf"]
tm = d["tm"]
COL = {0: (200, 60, 60), 1: (60, 90, 200), 2: (60, 170, 80), 3: (200, 160, 40)}
S = 4
W = 140 * S
img = Image.new("RGB", (W * 3, W * 2), (255, 255, 255))
dr = ImageDraw.Draw(img)


def plot(panel, row, axis_keep, val, tol, coords):
    ox, oy = panel * W, row * W
    dr.rectangle([ox, oy, ox + W - 1, oy + W - 1], outline=(0, 0, 0))
    dr.text((ox + 4, oy + 4), "%s=%d" % ("xyz"[axis_keep], val), fill=(0, 0, 0))
    for i in range(n):
        p = loc[3 * i:3 * i + 3]
        if abs(p[axis_keep] - val) > tol:
            continue
        a, b = coords
        u = ox + (p[a] + 75) * S
        v = oy + W - (p[b] + 75) * S
        c = COL[ch[i]]
        if sf[i] & 32:
            c = (0, 0, 0)
        elif sf[i] & 8:
            c = (150, 0, 150)
        elif sf[i] & 16:
            c = (0, 180, 200)
        shade = 0.5 + 0.5 * tm[i]
        c = tuple(int(x * shade) for x in c)
        dr.rectangle([u - 4, v - 4, u + 4, v + 4], fill=c)


specs = (sys.argv[3] if len(sys.argv) > 3 else "z:-15,z:5,z:30,y:-30,y:10,y:40").split(",")
PLANE = {"x": (0, (2, 1)), "y": (1, (0, 2)), "z": (2, (0, 1))}
for m, sp in enumerate(specs[:6]):
    ax, val = sp.split(":")
    keep, coords = PLANE[ax]
    plot(m % 3, m // 3, keep, float(val), 1.3, coords)
img.save(sys.argv[2])
print("ok")

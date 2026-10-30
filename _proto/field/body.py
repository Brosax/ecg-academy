"""Dev helper: body-frame projections of the heart nodes + torso outline + electrodes.
Usage: python -I body.py dump.json out.png"""
import json, sys, math
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1]))
pos, ch, n = d["pos"], d["ch"], d["n"]
COL = {0: (200, 60, 60), 1: (60, 90, 200), 2: (60, 170, 80), 3: (200, 160, 40)}
S = 1.6
W = int(400 * S)
img = Image.new("RGB", (W * 3, W), (255, 255, 255))
dr = ImageDraw.Draw(img)
def panel(pi, title, f, slab):
    ox = pi * W
    dr.rectangle([ox, 0, ox + W - 1, W - 1], outline=(0, 0, 0))
    dr.text((ox + 4, 4), title, fill=(0, 0, 0))
    pts = []
    for i in range(n):
        p = pos[3 * i:3 * i + 3]
        if slab and not slab(p):
            continue
        u, v, depth = f(p)
        pts.append((depth, u, v, COL[ch[i]]))
    pts.sort()
    for depth, u, v, c in pts:
        x, y = ox + W / 2 + u * S, W / 2 - v * S
        dr.rectangle([x - 2, y - 2, x + 2, y + 2], fill=c)
    return ox
# frontal view from the front: u = -x? viewer facing patient: patient left appears on viewer's right -> u = x
ox = panel(0, "frontal (viewer facing patient; patient left = right side)", lambda p: (p[0], p[1] + 20, p[2]), None)
for k, e in d["elec"].items():
    x, y, z = e["pos"]
    if k.startswith("V"):
        dr.ellipse([ox + W / 2 + x * S - 4, W / 2 - (y + 20) * S - 4, ox + W / 2 + x * S + 4, W / 2 - (y + 20) * S + 4], outline=(0, 0, 0))
        dr.text((ox + W / 2 + x * S + 5, W / 2 - (y + 20) * S), k, fill=(0, 0, 0))
# transverse slab at ventricular mid level, viewed from feet (CT convention: patient left on viewer right? CT: patient left on viewer's right)
ox = panel(1, "transverse slab y in [-35,-15], CT view from feet (ant up)", lambda p: (p[0], p[2], -p[1]), lambda p: -35 <= p[1] <= -15)
A, B = d["A"], d["B"]
pts = [(ox + W / 2 + A * math.sin(t) * S, W / 2 - B * math.cos(t) * S) for t in [i * 2 * math.pi / 100 for i in range(101)]]
dr.line(pts, fill=(0, 0, 0))
for k, e in d["elec"].items():
    x, y, z = e["pos"]
    if k.startswith("V"):
        dr.ellipse([ox + W / 2 + x * S - 4, W / 2 - z * S - 4, ox + W / 2 + x * S + 4, W / 2 - z * S + 4], outline=(0, 0, 0))
        dr.text((ox + W / 2 + x * S + 5, W / 2 - z * S), k, fill=(0, 0, 0))
ox = panel(2, "left lateral view (ant to the left? ant = right side)", lambda p: (p[2], p[1] + 20, p[0]), None)
img.save(sys.argv[2])
print("ok")

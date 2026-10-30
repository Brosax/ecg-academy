"""Dev helper: plot atrial activation map (3 orthogonal local-frame projections). Usage: python -I amap.py in.json out.png"""
import json, sys, colorsys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1]))
L, T, C = d["loc"], d["t"], d["ch"]
n = len(T)
tmax = max(T) if max(T) > 0 else 1
S = 4; W = 120 * S
img = Image.new("RGB", (W * 3, W + 20), (255, 255, 255)); dr = ImageDraw.Draw(img)
views = [("x-y (front)", 0, 1, 2), ("z-y (side)", 2, 1, 0), ("x-z (top)", 0, 2, 1)]
for vi, (name, a, b, c) in enumerate(views):
    ox = vi * W
    dr.text((ox + 4, W + 4), name + "  tmax %.0f" % tmax, fill=(0, 0, 0))
    pts = sorted(range(n), key=lambda i: L[3 * i + c])
    cx = sum(L[3 * i + a] for i in range(n)) / n; cy = sum(L[3 * i + b] for i in range(n)) / n
    for i in pts:
        u = L[3 * i + a]; v = L[3 * i + b]
        x = ox + W / 2 + (u - cx) * S; y = W / 2 - (v - cy) * S
        t = T[i]
        col = (180, 180, 180) if t < 0 else tuple(int(255 * q) for q in colorsys.hsv_to_rgb(0.75 * t / tmax, 1, 0.9 if C[i] == 0 else 0.6))
        dr.rectangle([x - S / 2, y - S / 2, x + S / 2, y + S / 2], fill=col)
img.save(sys.argv[2])

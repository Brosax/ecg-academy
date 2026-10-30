"""Render a synthetic 12-lead ECG JSON to PNGs for side-by-side judging (prototype harness, not shipped).

Input JSON: {"fs": 500, "title": "...", "leads": {"I": [...mV], "II": [...], "III", "aVR", "aVL", "aVF", "V1".."V6"}}
Outputs:
  <out>.png        standard 3x4 layout (2.5 s per column) + 10 s lead II rhythm strip, 25 mm/s, 10 mm/mV
  <out>-beat.png   one beat per lead at 50 mm/s, 20 mm/mV (2 x 6), window taken around the strongest QRS of lead II

Usage: python -I render.py <in.json> <out-prefix>
"""
import json
import sys

from PIL import Image, ImageDraw

PX_PER_MM = 4
MINOR = (246, 207, 204)
MAJOR = (229, 156, 151)
PAPER = (255, 246, 245)
TRACE = (22, 24, 29)
LABEL = (59, 63, 70)
ORDER = [["I", "aVR", "V1", "V4"], ["II", "aVL", "V2", "V5"], ["III", "aVF", "V3", "V6"]]


def grid(draw, w, h):
    for i in range(0, int(w / PX_PER_MM) + 1):
        x = i * PX_PER_MM
        draw.line([(x, 0), (x, h)], fill=MAJOR if i % 5 == 0 else MINOR, width=2 if i % 5 == 0 else 1)
    for j in range(0, int(h / PX_PER_MM) + 1):
        y = j * PX_PER_MM
        draw.line([(0, y), (w, y)], fill=MAJOR if j % 5 == 0 else MINOR, width=2 if j % 5 == 0 else 1)


def trace(draw, sig, fs, x0, y0, mm_per_s, mm_per_mv, t0=0.0, t1=None):
    t1 = len(sig) / fs if t1 is None else t1
    a, b = int(t0 * fs), min(len(sig), int(t1 * fs))
    pts = []
    for k in range(a, b):
        x = x0 + (k - a) / fs * mm_per_s * PX_PER_MM
        y = y0 - sig[k] * mm_per_mv * PX_PER_MM
        pts.append((x, y))
    if len(pts) > 1:
        draw.line(pts, fill=TRACE, width=2)


def cal_pulse(draw, x0, y0, mm_per_mv):
    h = mm_per_mv * PX_PER_MM
    w = 5 * PX_PER_MM
    draw.line([(x0, y0), (x0 + 2, y0), (x0 + 2, y0 - h), (x0 + 2 + w, y0 - h), (x0 + 2 + w, y0), (x0 + 4 + w, y0)], fill=TRACE, width=2)


def standard(data, out):
    fs = data["fs"]
    L = data["leads"]
    row_mm, cols_s = 30, 2.5
    w = int((10 + 250) * PX_PER_MM)
    h = int((4 * row_mm + 12) * PX_PER_MM)
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    grid(d, w, h)
    x_start = 10 * PX_PER_MM
    for r, row in enumerate(ORDER):
        y0 = (r * row_mm + 20) * PX_PER_MM
        cal_pulse(d, 2 * PX_PER_MM, y0, 10)
        for c, name in enumerate(row):
            t0 = c * cols_s
            x0 = x_start + c * cols_s * 25 * PX_PER_MM
            trace(d, L[name], fs, x0, y0, 25, 10, t0, t0 + cols_s)
            d.text((x0 + 4, y0 - 15 * PX_PER_MM), name, fill=LABEL)
    y0 = (3 * row_mm + 20) * PX_PER_MM
    cal_pulse(d, 2 * PX_PER_MM, y0, 10)
    trace(d, L["II"], fs, x_start, y0, 25, 10)
    d.text((x_start + 4, y0 - 15 * PX_PER_MM), "II", fill=LABEL)
    d.text((8, 4), data.get("title", ""), fill=LABEL)
    img.save(out + ".png")


def beat(data, out):
    fs = data["fs"]
    L = data["leads"]
    ii = L["II"]
    # strongest |slope| peak away from the edges -> QRS anchor
    best, kbest = -1.0, int(len(ii) / 2)
    for k in range(int(0.6 * fs), len(ii) - int(0.8 * fs)):
        s = abs(ii[k + 1] - ii[k - 1])
        if s > best:
            best, kbest = s, k
    t_anchor = kbest / fs
    t0, t1 = t_anchor - 0.35, t_anchor + 0.55
    cell_w_mm, cell_h_mm = (t1 - t0) * 50 + 6, 60
    names = [["I", "II", "III", "aVR", "aVL", "aVF"], ["V1", "V2", "V3", "V4", "V5", "V6"]]
    w = int(6 * cell_w_mm * PX_PER_MM)
    h = int(2 * cell_h_mm * PX_PER_MM)
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    grid(d, w, h)
    for r, row in enumerate(names):
        for c, name in enumerate(row):
            x0 = (c * cell_w_mm + 3) * PX_PER_MM
            y0 = (r * cell_h_mm + 35) * PX_PER_MM
            trace(d, L[name], fs, x0, y0, 50, 20, t0, t1)
            d.text((x0 + 4, (r * cell_h_mm + 2) * PX_PER_MM), name + "  (50 mm/s, 20 mm/mV)", fill=LABEL)
    img.save(out + "-beat.png")


if __name__ == "__main__":
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)
    standard(data, sys.argv[2])
    beat(data, sys.argv[2])
    print("wrote", sys.argv[2] + ".png", sys.argv[2] + "-beat.png")

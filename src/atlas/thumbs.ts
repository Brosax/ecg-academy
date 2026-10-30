/**
 * Real-example thumbnails on atlas pages: which PTB-XL cases to show first, and a tiny lead-II strip as an SVG path.
 * Pure (no DOM) — tested in tests/atlas.
 */
import type { FindingId } from '../core/findings';

/** The part of a real case the ranking needs (src/real RealCase satisfies it). */
export interface RankableCase {
  readonly id: number;
  readonly num: number;
  readonly cls: string;
  readonly findings: readonly FindingId[];
}

/**
 * Best teaching examples first: cases whose teaching class (the reason they were curated) is this finding, then the
 * "purest" tracings (fewest other findings), then blind case number. Deterministic.
 */
export function rankCases<C extends RankableCase>(cases: readonly C[], classMatches: (cls: string) => boolean): C[] {
  return [...cases].sort((a, b) => {
    const ma = classMatches(a.cls) ? 0 : 1;
    const mb = classMatches(b.cls) ? 0 : 1;
    return ma - mb || a.findings.length - b.findings.length || a.num - b.num;
  });
}

/** Thumbnail geometry: 25 mm/s and 10 mm/mV drawn at 4 units per mm (so the paper grid is 4 / 20 units). */
export const THUMB = {
  unitsPerMm: 4,
  seconds: 4,
  heightMm: 25,
  /** baseline position from the top, as a fraction of the height (R waves are taller than S waves) */
  baseline: 0.62,
} as const;

export const THUMB_W = THUMB.seconds * 25 * THUMB.unitsPerMm; // 400
export const THUMB_H = THUMB.heightMm * THUMB.unitsPerMm; // 100

function median(a: Float32Array, i0: number, i1: number): number {
  const step = Math.max(1, Math.floor((i1 - i0) / 400));
  const v: number[] = [];
  for (let i = i0; i < i1; i += step) v.push(a[i]);
  v.sort((x, y) => x - y);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
}

/**
 * SVG path of one lead between t0 and t0 + THUMB.seconds, at true paper scale (25 mm/s, 10 mm/mV), baseline-centred
 * on the median and clipped to the box. Each pixel column keeps its min and max (in time order) so QRS peaks survive.
 */
export function stripPath(x: Float32Array, fs: number, t0Ms = 0): string {
  const u = THUMB.unitsPerMm;
  const i0 = Math.max(0, Math.round((t0Ms * fs) / 1000));
  const i1 = Math.min(x.length, i0 + Math.round(THUMB.seconds * fs));
  if (i1 - i0 < 2) return '';
  const base = median(x, i0, i1);
  const yOf = (mv: number) => {
    const y = THUMB_H * THUMB.baseline - (mv - base) * 10 * u;
    return Math.min(THUMB_H - 0.5, Math.max(0.5, y));
  };
  const cols = THUMB_W;
  const perCol = (i1 - i0) / cols;
  const pts: string[] = [];
  for (let c = 0; c < cols; c++) {
    const a = i0 + Math.floor(c * perCol);
    const b = Math.max(a + 1, Math.min(i1, i0 + Math.floor((c + 1) * perCol)));
    let lo = Infinity, hi = -Infinity, iLo = a, iHi = a;
    for (let i = a; i < b; i++) {
      const v = x[i];
      if (v < lo) {
        lo = v;
        iLo = i;
      }
      if (v > hi) {
        hi = v;
        iHi = i;
      }
    }
    const px = (c + 0.5).toFixed(1);
    const first = iLo <= iHi ? lo : hi;
    const second = iLo <= iHi ? hi : lo;
    pts.push(`${px} ${yOf(first).toFixed(1)}`);
    if (second !== first) pts.push(`${px} ${yOf(second).toFixed(1)}`);
  }
  return `M${pts.join('L')}`;
}

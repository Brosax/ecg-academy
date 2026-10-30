/**
 * Heart-rate arithmetic at standard paper speed (25 mm/s: 1 small square = 1 mm = 40 ms, 1 large square = 5 mm =
 * 200 ms, 300 large squares per minute, 1500 small squares per minute).
 *   300 method   rate ≈ 300 / (large squares between two R waves) → 300, 150, 100, 75, 60, 50 for 1…6 squares
 *   1500 method  rate = 1500 / (small squares between two R waves)
 *   6-s method   rate ≈ (QRS complexes in 6 s = 30 large squares) × 10 — the only one of the three valid for
 *                irregular rhythms.
 * At other speeds the constants scale with the speed (e.g. 50 mm/s: 600 / large squares, 3000 / small squares).
 */
import type { BeatMarks } from '../../core/ecg';

export const SEQ_300 = [300, 150, 100, 75, 60, 50] as const;

export const SMALL_MS_AT_25 = 40;

export function smallSquareMs(speedMmPerS: number): number {
  return 1000 / speedMmPerS;
}

export function squaresFromRr(rrMs: number, speedMmPerS = 25): { readonly small: number; readonly large: number } {
  const small = rrMs / smallSquareMs(speedMmPerS);
  return { small, large: small / 5 };
}

/** Large squares per minute at this speed (300 at 25 mm/s). */
export function largePerMinute(speedMmPerS = 25): number {
  return (60 * speedMmPerS) / 5;
}

/** Small squares per minute at this speed (1500 at 25 mm/s). */
export function smallPerMinute(speedMmPerS = 25): number {
  return 60 * speedMmPerS;
}

export function rate300(largeSquares: number, speedMmPerS = 25): number {
  return largePerMinute(speedMmPerS) / largeSquares;
}

export function rate1500(smallSquares: number, speedMmPerS = 25): number {
  return smallPerMinute(speedMmPerS) / smallSquares;
}

export function rate6s(complexesIn6s: number): number {
  return complexesIn6s * 10;
}

/** Number of R peaks in [t0, t0 + 6000). */
export function countIn6s(rPeaksMs: readonly number[], t0Ms: number): number {
  let n = 0;
  for (const t of rPeaksMs) if (t >= t0Ms && t < t0Ms + 6000) n++;
  return n;
}

/** Label of the 300-sequence for a whole number of large squares (1…6), else null. */
export function seq300Label(largeSquares: number): number | null {
  const n = Math.round(largeSquares);
  return Math.abs(largeSquares - n) < 1e-9 && n >= 1 && n <= 6 ? SEQ_300[n - 1] : null;
}

/** The two 300-sequence labels that bracket an RR expressed in large squares (for "between 75 and 60"). */
export function seq300Bracket(largeSquares: number): readonly [number, number] | null {
  if (largeSquares < 1 || largeSquares > 6) return null;
  const lo = Math.floor(largeSquares);
  const hi = Math.min(6, lo + 1);
  return [SEQ_300[lo - 1], SEQ_300[hi - 1]];
}

/**
 * R-peak times from truth: within each beat's QRS window, the sample with the largest absolute deviation from the
 * pre-QRS baseline (works for positive and negative complexes).
 */
export function rPeaksFromBeats(beats: readonly BeatMarks[], x: Float32Array, fs: number): number[] {
  const out: number[] = [];
  for (const b of beats) {
    const i0 = Math.max(0, Math.round((b.qrsOn * fs) / 1000));
    const i1 = Math.min(x.length - 1, Math.round((b.qrsOff * fs) / 1000));
    const bl = x[Math.max(0, i0 - Math.round(0.01 * fs))] ?? 0;
    let best = i0;
    let bestV = -1;
    for (let i = i0; i <= i1; i++) {
      const v = Math.abs(x[i] - bl);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    }
    out.push((best * 1000) / fs);
  }
  return out;
}

/**
 * Simple QRS detector for ECGs without beat marks (Pan–Tompkins-like): band-limited slope energy, moving-window
 * integration, adaptive threshold at 35 % of the 98th percentile, 250 ms refractory period, peak refined to the
 * largest |x − local median| within ±60 ms.
 */
export function detectRPeaks(x: Float32Array, fs: number): number[] {
  const n = x.length;
  if (n < fs) return [];
  const d = new Float32Array(n);
  for (let i = 2; i < n - 2; i++) d[i] = (2 * x[i + 2] + x[i + 1] - x[i - 1] - 2 * x[i - 2]) / 8;
  const w = Math.max(1, Math.round(0.12 * fs));
  const e = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += d[i] * d[i];
    if (i >= w) acc -= d[i - w] * d[i - w];
    e[i] = acc / w;
  }
  const sorted = Array.from(e).sort((a, b) => a - b);
  const thr = 0.35 * sorted[Math.floor(0.98 * (sorted.length - 1))];
  const refractory = Math.round(0.25 * fs);
  const half = Math.round(0.06 * fs);
  const peaks: number[] = [];
  let i = 0;
  while (i < n) {
    if (e[i] > thr) {
      // the integrated energy rises over the QRS; search the raw signal around this region
      let j = i;
      while (j < n && e[j] > thr) j++;
      const c0 = Math.max(0, i - half);
      const c1 = Math.min(n - 1, j);
      const local: number[] = [];
      for (let k = Math.max(0, c0 - half); k <= Math.min(n - 1, c1 + half); k++) local.push(x[k]);
      local.sort((a, b) => a - b);
      const med = local[local.length >> 1] ?? 0;
      let best = c0;
      let bestV = -1;
      for (let k = c0; k <= c1; k++) {
        const v = Math.abs(x[k] - med);
        if (v > bestV) {
          bestV = v;
          best = k;
        }
      }
      if (!peaks.length || best - peaks[peaks.length - 1] >= refractory) peaks.push(best);
      i = Math.max(j, best + refractory);
    } else i++;
  }
  return peaks.map((k) => (k * 1000) / fs);
}

export function rrIntervals(rPeaksMs: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < rPeaksMs.length; i++) out.push(rPeaksMs[i] - rPeaksMs[i - 1]);
  return out;
}

/** Mean rate over all RR intervals (beats/min), or null with fewer than two peaks. */
export function meanRate(rPeaksMs: readonly number[]): number | null {
  const rr = rrIntervals(rPeaksMs);
  if (!rr.length) return null;
  return 60000 / (rr.reduce((a, b) => a + b, 0) / rr.length);
}

/** Irregularity: (max RR − min RR) / mean RR; > ~0.16 (≈ 120 ms at 75/min) reads as irregular. */
export function rrIrregularity(rPeaksMs: readonly number[]): number {
  const rr = rrIntervals(rPeaksMs);
  if (rr.length < 2) return 0;
  const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
  return (Math.max(...rr) - Math.min(...rr)) / mean;
}

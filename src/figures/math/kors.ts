/**
 * Vectorcardiogram reconstruction from the 12-lead ECG with the Kors regression transform (Kors JA, van Herpen G,
 * Sittig AC, van Bemmel JH. Reconstruction of the Frank vectorcardiogram from standard electrocardiographic leads:
 * diagnostic comparison of different methods. Eur Heart J 1990;11:1083-92). The eight independent leads I, II, V1–V6
 * map to Frank X (patient's left +), Y (inferior +), Z (posterior +).
 *
 * Screen convention (shared with the hexaxial and horizontal-plane figures): frontal plane x = X, y = Y; horizontal
 * plane seen from the feet (anterior up) x = X, y = Z.
 */
import type { BeatMarks, EcgSignal } from '../../core/ecg';
import type { StdLead } from '../../core/leads';

export const KORS_LEADS = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const satisfies readonly StdLead[];

/** Rows X, Y, Z; columns I, II, V1…V6 (Kors et al. 1990, regression method). */
export const KORS_MATRIX: readonly (readonly number[])[] = [
  [0.38, -0.07, -0.13, 0.05, -0.01, 0.14, 0.06, 0.54],
  [-0.07, 0.93, 0.06, -0.02, -0.05, 0.06, -0.17, 0.13],
  [0.11, -0.23, -0.43, -0.06, -0.14, -0.2, -0.11, 0.31],
];

export type Xyz = readonly [number, number, number];

/** Kors transform of one instant: values in KORS_LEADS order → [X, Y, Z]. */
export function korsTransform(values: readonly number[]): Xyz {
  const out = [0, 0, 0];
  for (let r = 0; r < 3; r++) {
    let s = 0;
    for (let c = 0; c < 8; c++) s += KORS_MATRIX[r][c] * (values[c] ?? 0);
    out[r] = s;
  }
  return [out[0], out[1], out[2]];
}

export interface VcgSeries {
  /** time of every sample (ms from record start) */
  readonly t: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
}

/**
 * VCG over [t0, t1] at the given step, with each lead's baseline (median of [baseT0, baseT1], usually the end of the
 * PR segment) removed so the loop starts at the origin.
 */
export function vcgSeries(sig: EcgSignal, t0: number, t1: number, stepMs: number, base: readonly [number, number]): VcgSeries {
  const fs = sig.fs;
  const leads = KORS_LEADS.map((l) => sig.leads[l]);
  const baseline = leads.map((x) => {
    const i0 = Math.max(0, Math.round((base[0] * fs) / 1000));
    const i1 = Math.min(x.length - 1, Math.max(i0, Math.round((base[1] * fs) / 1000)));
    const v: number[] = [];
    for (let i = i0; i <= i1; i++) v.push(x[i]);
    v.sort((a, b) => a - b);
    return v.length ? v[v.length >> 1] : 0;
  });
  const n = Math.max(2, Math.floor((t1 - t0) / stepMs) + 1);
  const T = new Float64Array(n), X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n);
  const vals = new Array<number>(8);
  for (let k = 0; k < n; k++) {
    const t = t0 + k * stepMs;
    const f = (t * fs) / 1000;
    const i = Math.max(0, Math.min(leads[0].length - 2, Math.floor(f)));
    const fr = Math.max(0, Math.min(1, f - i));
    for (let c = 0; c < 8; c++) vals[c] = leads[c][i] * (1 - fr) + leads[c][i + 1] * fr - baseline[c];
    const [x, y, z] = korsTransform(vals);
    T[k] = t;
    X[k] = x;
    Y[k] = y;
    Z[k] = z;
  }
  return { t: T, x: X, y: Y, z: Z };
}

/** The beat whose window [pOn or qrsOn − 200, next beat start) contains t, else the first dominant-looking beat. */
export function beatAt(beats: readonly BeatMarks[], t: number | null): number {
  if (!beats.length) return -1;
  if (t != null) {
    for (let i = 0; i < beats.length; i++) {
      const start = Math.min(beats[i].pOn ?? beats[i].qrsOn - 200, beats[i].qrsOn - 120);
      const next = i + 1 < beats.length ? Math.min(beats[i + 1].pOn ?? beats[i + 1].qrsOn - 200, beats[i + 1].qrsOn - 120) : Infinity;
      if (t >= start && t < next) return i;
    }
    if (t < beats[0].qrsOn) return 0;
    return beats.length - 1;
  }
  // a beat away from the record edges
  return Math.min(1, beats.length - 1);
}

/**
 * Time window the figure shows for one beat: from just before its P (or 200 ms before its QRS) to just after its T,
 * in whole milliseconds (the cursor is whole milliseconds too, so it can sit exactly on an edge).
 */
export function beatWindow(b: BeatMarks, durationMs: number): readonly [number, number] {
  return [Math.max(0, Math.round((b.pOn ?? b.qrsOn - 200) - 20)), Math.floor(Math.min(durationMs - 2, b.tOff + 30))];
}

/**
 * The beat to show for cursor time t. Neighbouring windows overlap (the shown window starts before beatAt's
 * boundary, and at fast rates a T wave runs into the next P), so the beat on screen is kept while t stays inside its
 * window; otherwise beatAt decides. Without this the window flips to the neighbour under the pointer or the keys.
 */
export function stickyBeat(beats: readonly BeatMarks[], t: number | null, current: number, durationMs: number): number {
  if (t != null && current >= 0 && current < beats.length) {
    const [a, z] = beatWindow(beats[current], durationMs);
    if (t >= a - 0.5 && t <= z + 0.5) return current;
  }
  return beatAt(beats, t);
}

/**
 * Keyboard step of the cursor through the beats: moves `delta` ms inside the shown beat's window, stops once on its
 * edge, then continues into the neighbouring beat (time keeps running the same way: into the overlap when the windows
 * overlap, across the gap to the next window when they do not). Stops at the first / last beat. A cursor outside the
 * window starts from the window edge on the side it moves away from.
 */
export function stepBeatCursor(
  beats: readonly BeatMarks[],
  current: number,
  t: number | null,
  delta: number,
  durationMs: number,
): { readonly beat: number; readonly t: number } {
  const [a, z] = beatWindow(beats[current], durationMs);
  const from = t != null && t >= a - 0.5 && t <= z + 0.5 ? Math.min(z, Math.max(a, t)) : delta >= 0 ? a : z;
  const next = from + delta;
  // within half a millisecond of an edge counts as on it (the shared cursor may hold a rounded or fractional time)
  if (next > z) {
    if (from < z - 0.5 || current + 1 >= beats.length) return { beat: current, t: z };
    const [a1, z1] = beatWindow(beats[current + 1], durationMs);
    return { beat: current + 1, t: Math.min(z1, Math.max(next, a1)) };
  }
  if (next < a) {
    if (from > a + 0.5 || current <= 0) return { beat: current, t: a };
    const [a0, z0] = beatWindow(beats[current - 1], durationMs);
    return { beat: current - 1, t: Math.max(a0, Math.min(next, z0)) };
  }
  return { beat: current, t: next };
}

/** Mean vector (area / duration) of a VCG window — the mean QRS (or T) vector. */
export function meanVector(s: VcgSeries, t0: number, t1: number): Xyz {
  let x = 0, y = 0, z = 0, n = 0;
  for (let k = 0; k < s.t.length; k++) {
    if (s.t[k] < t0 || s.t[k] > t1) continue;
    x += s.x[k];
    y += s.y[k];
    z += s.z[k];
    n++;
  }
  return n ? [x / n, y / n, z / n] : [0, 0, 0];
}

/** Value of the series at time t (linear interpolation), or null outside it. */
export function vcgAt(s: VcgSeries, t: number): Xyz | null {
  const n = s.t.length;
  if (n < 2 || t < s.t[0] || t > s.t[n - 1]) return null;
  const step = s.t[1] - s.t[0];
  const f = (t - s.t[0]) / step;
  const i = Math.min(n - 2, Math.floor(f));
  const fr = f - i;
  return [s.x[i] * (1 - fr) + s.x[i + 1] * fr, s.y[i] * (1 - fr) + s.y[i + 1] * fr, s.z[i] * (1 - fr) + s.z[i + 1] * fr];
}

/** Signed area of a closed 2-D loop (shoelace); > 0 means clockwise on screen (y down). */
export function loopSignedArea(xs: ArrayLike<number>, ys: ArrayLike<number>): number {
  let a = 0;
  const n = xs.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += xs[i] * ys[j] - xs[j] * ys[i];
  }
  return a / 2;
}

/**
 * Rhythm readers for the hallmark criteria of the rhythm groups (synth-rhythm, M3): what a reader does with a rhythm
 * strip — list the QRS complexes and the P waves, measure RR, PP and PR sequences, group complexes by shape, find
 * pacing stimuli, pauses and the dominant frequency of disorganised activity. Every reader works on the oracle's
 * measurement and the delivered signal only (never the engine truth), like the criteria that use them
 * (tests/synth/oracle/criteria/*.ts).
 */
import { STD_LEADS, type StdLead } from '../../../src/core/leads';
import { blankSpikes, residualPWaves, type Leads } from '../oracle/measure';
import type { CriterionCtx } from '../oracle/criteria/types';

const IND: readonly StdLead[] = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/** The delivered leads with the pacing stimuli the oracle found blanked (as the oracle measures them). */
const BLANKED = new WeakMap<object, Leads>();
export function sig(c: CriterionCtx): Leads {
  let L = BLANKED.get(c.m);
  if (!L) {
    L = blankSpikes(c.leads, c.m.spikes);
    BLANKED.set(c.m, L);
  }
  return L;
}

export const median = (xs: readonly number[]): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const sd = (xs: readonly number[]): number => {
  const m = mean(xs);
  return xs.length ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) : NaN;
};
export const cv = (xs: readonly number[]): number => sd(xs) / mean(xs);

/** One detected ventricular complex (ms). */
export interface RBeat {
  readonly i: number;
  readonly on: number;
  readonly off: number;
  readonly width: number;
  /** P onset found before this QRS (after the previous T), and PR, or null */
  readonly pOn: number | null;
  readonly pr: number | null;
  readonly rrPre: number | null;
  readonly rrPost: number | null;
}

/** The oracle's complexes in ms, with RR before / after (between detected complexes). */
export function beatsMs(c: CriterionCtx): RBeat[] {
  const ms = (i: number): number => (i * 1000) / c.fs;
  const b = c.m.beats;
  return b.map((x, i) => ({
    i,
    on: ms(x.qrsOn),
    off: ms(x.qrsOff),
    width: ms(x.qrsOff - x.qrsOn),
    pOn: x.pOn !== null ? ms(x.pOn) : null,
    pr: x.pOn !== null ? ms(x.qrsOn - x.pOn) : null,
    rrPre: i > 0 ? ms(x.qrsOn - b[i - 1].qrsOn) : null,
    rrPost: i + 1 < b.length ? ms(b[i + 1].qrsOn - x.qrsOn) : null,
  }));
}

/**
 * QRS duration of one complex measured on its own (ms): spatial slope (|dx/dt| summed over the 8 independent leads,
 * ± 6 ms smoothing) from the oracle's onset; the end is where it stays under 8 % of the complex's peak slope for
 * 16 ms (an ectopic or aberrant beat that the oracle gave the template's edges gets its own width).
 */
export function beatWidth(c: CriterionCtx, b: RBeat): number {
  const L = sig(c);
  const n = L.I.length;
  const i0 = Math.max(1, Math.round((b.on * c.fs) / 1000));
  const i1 = Math.min(n - 2, i0 + Math.round(0.26 * c.fs));
  const w = Math.max(1, Math.round(0.006 * c.fs));
  const s = new Float64Array(i1 - i0 + 1);
  for (let i = i0; i <= i1; i++) {
    let a = 0;
    for (let k = -w; k <= w; k++) for (const l of IND) a += Math.abs(L[l][Math.min(n - 1, i + k + 1)] - L[l][Math.max(0, i + k - 1)]);
    s[i - i0] = a;
  }
  let pk = 0, pi = 0;
  for (let k = 0; k < Math.min(s.length, Math.round(0.14 * c.fs)); k++) if (s[k] > pk) {
    pk = s[k];
    pi = k;
  }
  const hold = Math.round(0.016 * c.fs);
  let run = 0;
  for (let k = pi; k < s.length; k++) {
    run = s[k] < 0.08 * pk ? run + 1 : 0;
    if (run >= hold) return ((k - hold + 1 - w) * 1000) / c.fs;
  }
  return (s.length * 1000) / c.fs;
}

/**
 * Edges of the complex around a time `tMs` inside it (ms): the spatial slope's peak within ± 40 ms of tMs, then
 * outward until it stays under 8 % of that peak (12 ms before, 16 ms after) — for complexes found by curvature.
 */
export function complexAround(c: CriterionCtx, tMs: number): { on: number; off: number; width: number } {
  const L = sig(c);
  const n = L.I.length;
  const w = Math.max(1, Math.round(0.006 * c.fs));
  const slope = (i: number): number => {
    let a = 0;
    for (let k = -w; k <= w; k++) for (const l of IND) a += Math.abs(L[l][Math.min(n - 1, i + k + 1)] - L[l][Math.max(0, i + k - 1)]);
    return a;
  };
  const i0 = Math.round((tMs * c.fs) / 1000);
  let pk = 0, pi = i0;
  for (let i = Math.max(1, i0 - Math.round(0.04 * c.fs)); i <= Math.min(n - 2, i0 + Math.round(0.04 * c.fs)); i++) {
    const v = slope(i);
    if (v > pk) {
      pk = v;
      pi = i;
    }
  }
  let on = pi, run = 0;
  while (on > 1 && pi - on < Math.round(0.2 * c.fs)) {
    on--;
    run = slope(on) < 0.08 * pk ? run + 1 : 0;
    if (run >= Math.round(0.012 * c.fs)) break;
  }
  on += run;
  let off = pi;
  run = 0;
  while (off < n - 2 && off - pi < Math.round(0.25 * c.fs)) {
    off++;
    run = slope(off) < 0.08 * pk ? run + 1 : 0;
    if (run >= Math.round(0.016 * c.fs)) break;
  }
  off -= run;
  return { on: (on * 1000) / c.fs, off: (off * 1000) / c.fs, width: ((off - on) * 1000) / c.fs };
}

/** RR intervals between consecutive detected complexes (ms). */
export function rrList(c: CriterionCtx): number[] {
  const b = beatsMs(c);
  return b.slice(1).map((x, i) => x.on - b[i].on);
}

/**
 * P waves of the strip, conducted or not: peaks of the QRST-subtracted residual of II and V1 (the oracle's
 * residualPWaves, valid in every rhythm whose complexes share one template; P waves overlapping a QRS are not seen).
 * Returns peak times (ms); the P onset is ≈ 40 ms before.
 */
export function pPeaks(c: CriterionCtx): number[] {
  return residualPWaves(sig(c), c.m);
}

/** Pacing stimuli the oracle found and blanked (ms). */
export function stimuli(c: CriterionCtx): number[] {
  return c.m.spikes.map((i) => (i * 1000) / c.fs);
}

/** Spike amplitude (mV) of the raw (unblanked) signal at a stimulus, largest over the 8 independent leads. */
export function spikeAmp(c: CriterionCtx, tMs: number): number {
  const i = Math.round((tMs * c.fs) / 1000);
  let a = 0;
  for (const l of IND) {
    const x = c.leads[l];
    if (i < 1 || i >= x.length - 1) continue;
    a = Math.max(a, Math.abs(x[i] - 0.5 * (x[i - 1] + x[i + 1])));
  }
  return a;
}

/** Level of a lead before a beat (mean of on − 30 … on − 10 ms). */
function levelBefore(c: CriterionCtx, l: StdLead, onMs: number): number {
  const x = sig(c)[l];
  const a = Math.max(0, Math.round(((onMs - 30) * c.fs) / 1000)), z = Math.max(a + 1, Math.round(((onMs - 10) * c.fs) / 1000));
  let s = 0;
  for (let i = a; i < z; i++) s += x[i];
  return s / (z - a);
}

/** Net QRS deflection (largest positive + largest negative against the level before) of one complex in a lead. */
export function netOf(c: CriterionCtx, l: StdLead, b: RBeat): number {
  const x = sig(c)[l];
  const lv = levelBefore(c, l, b.on);
  let mx = 0, mn = 0;
  for (let i = Math.round((b.on * c.fs) / 1000); i <= Math.round((b.off * c.fs) / 1000) && i < x.length; i++) {
    mx = Math.max(mx, x[i] - lv);
    mn = Math.min(mn, x[i] - lv);
  }
  return mx + mn;
}

/** Peak-to-peak QRS amplitude of one complex in a lead. */
export function p2pOf(c: CriterionCtx, l: StdLead, b: RBeat): number {
  const x = sig(c)[l];
  let mx = -Infinity, mn = Infinity;
  for (let i = Math.round((b.on * c.fs) / 1000); i <= Math.round((b.off * c.fs) / 1000) && i < x.length; i++) {
    mx = Math.max(mx, x[i]);
    mn = Math.min(mn, x[i]);
  }
  return mx - mn;
}

/** Largest |deflection| (signed) of a lead in a window (ms) against the level before `ref`. */
export function extremumIn(c: CriterionCtx, l: StdLead, a: number, z: number, ref: number): number {
  const x = sig(c)[l];
  const lv = levelBefore(c, l, ref);
  let best = 0;
  for (let i = Math.max(0, Math.round((a * c.fs) / 1000)); i <= Math.min(x.length - 1, Math.round((z * c.fs) / 1000)); i++) {
    const v = x[i] - lv;
    if (Math.abs(v) > Math.abs(best)) best = v;
  }
  return best;
}

/** Correlation of two complexes' QRS (8 independent leads, onset − 10 … onset + 110 ms). */
export function qrsCorr(c: CriterionCtx, a: RBeat, b: RBeat): number {
  const ia = Math.round((a.on * c.fs) / 1000), ib = Math.round((b.on * c.fs) / 1000);
  const k0 = -Math.round(0.01 * c.fs), k1 = Math.round(0.11 * c.fs);
  let sxy = 0, sxx = 0, syy = 0;
  for (const l of IND) {
    const x = sig(c)[l];
    const la = levelBefore(c, l, a.on), lb = levelBefore(c, l, b.on);
    for (let k = k0; k <= k1; k++) {
      const u = (x[ia + k] ?? la) - la, v = (x[ib + k] ?? lb) - lb;
      sxy += u * v;
      sxx += u * u;
      syy += v * v;
    }
  }
  return sxy / Math.sqrt(Math.max(1e-12, sxx * syy));
}

/** Morphology groups of complexes (greedy, correlation ≥ thr with the group's first member), largest first. */
export function shapeGroups(c: CriterionCtx, beats: readonly RBeat[], thr = 0.9): RBeat[][] {
  const groups: RBeat[][] = [];
  for (const b of beats) {
    const g = groups.find((x) => qrsCorr(c, x[0], b) >= thr);
    if (g) g.push(b);
    else groups.push([b]);
  }
  return groups.sort((a, b) => b.length - a.length);
}

/** P-wave shape vectors (II, III, aVL, V1, I, aVF around the peak ± 50 ms, each against the level 60 ms before it). */
function pShape(c: CriterionCtx, peakMs: number): number[] {
  const out: number[] = [];
  const i0 = Math.round((peakMs * c.fs) / 1000);
  const h = Math.round(0.05 * c.fs), step = Math.max(1, Math.round(0.004 * c.fs));
  for (const l of ['II', 'III', 'aVL', 'V1', 'I', 'aVF'] as const) {
    const x = sig(c)[l];
    const ref = x[Math.max(0, i0 - Math.round(0.06 * c.fs))];
    for (let k = -h; k <= h; k += step) out.push((x[Math.min(x.length - 1, Math.max(0, i0 + k))] ?? 0) - ref);
  }
  return out;
}

/**
 * Number of distinct P-wave morphologies among the P peaks. Two P waves are the same morphology when their shapes
 * correlate (≥ thr over II, III, aVL, V1, I, aVF), their sizes differ by ≤ 1.8× and no lead shows them with opposite
 * polarities (both ≥ 0.02 mV) — a reader tells P waves apart by their polarity in each lead first.
 */
export function pShapeCount(c: CriterionCtx, peaks: readonly number[], thr = 0.8): number {
  const LEADS = ['II', 'III', 'aVL', 'V1', 'I', 'aVF'] as const;
  const reps: { s: number[]; pol: number[] }[] = [];
  for (const p of peaks) {
    const s = pShape(c, p);
    const pol = LEADS.map((l) => pPolarity(c, l, p));
    const nrm = Math.hypot(...s);
    const same = reps.some((r) => {
      const nr = Math.hypot(...r.s);
      const dot = r.s.reduce((a, v, k) => a + v * s[k], 0);
      const flip = pol.some((v, k) => Math.abs(v) >= 0.02 && Math.abs(r.pol[k]) >= 0.02 && Math.sign(v) !== Math.sign(r.pol[k]));
      return !flip && dot / Math.max(1e-12, nr * nrm) >= thr && Math.max(nr, nrm) / Math.max(1e-12, Math.min(nr, nrm)) <= 1.8;
    });
    if (!same) reps.push({ s, pol });
  }
  return reps.length;
}

/** Polarity of the P wave at a peak in a lead: the signed extremum ± 25 ms of the peak against the level 60 ms before. */
export function pPolarity(c: CriterionCtx, l: StdLead, peakMs: number): number {
  const x = sig(c)[l];
  const i0 = Math.round((peakMs * c.fs) / 1000);
  const ref = x[Math.max(0, i0 - Math.round(0.06 * c.fs))];
  let best = 0;
  for (let k = -Math.round(0.025 * c.fs); k <= Math.round(0.025 * c.fs); k++) {
    const v = (x[i0 + k] ?? ref) - ref;
    if (Math.abs(v) > Math.abs(best)) best = v;
  }
  return best;
}

/**
 * Complexes of a disorganised or very fast wide rhythm (pre-excited AF, polymorphic VT): peaks of the spatial
 * curvature energy (8 leads, 8 ms second difference) above 35 % of its 98th percentile, ≥ `refractoryMs` apart. The
 * T waves of these rhythms are broad and blunt; the QRS carries the curvature.
 */
export function curvaturePeaks(c: CriterionCtx, refractoryMs = 180, frac = 0.35): number[] {
  const L = sig(c);
  const n = L.I.length;
  const k = Math.max(1, Math.round(0.008 * c.fs));
  const e = new Float64Array(n);
  for (const l of IND) {
    const x = L[l];
    for (let i = k; i < n - k; i++) e[i] += Math.abs(x[i + k] - 2 * x[i] + x[i - k]);
  }
  const sm = new Float64Array(n);
  const w = Math.max(1, Math.round(0.01 * c.fs));
  for (let i = w; i < n - w; i++) {
    let s = 0;
    for (let j = -w; j <= w; j++) s += e[i + j];
    sm[i] = s;
  }
  const sorted = Array.from(sm).sort((a, b) => a - b);
  const thr = frac * sorted[Math.floor(0.98 * (n - 1))];
  const out: number[] = [];
  const refr = Math.round((refractoryMs * c.fs) / 1000);
  for (let i = 1; i < n - 1; i++) {
    if (sm[i] < thr || sm[i] < sm[i - 1] || sm[i] < sm[i + 1]) continue;
    const last = out[out.length - 1];
    if (last !== undefined && i - last < refr) {
      if (sm[i] > sm[last]) out[out.length - 1] = i;
      continue;
    }
    out.push(i);
  }
  return out.map((i) => (i * 1000) / c.fs);
}

/**
 * Dominant frequency (Hz) of a lead between `lo` and `hi` Hz: the largest bin of a Hann-windowed DFT (0.1 Hz steps)
 * of the mean-removed signal.
 */
export function dominantHz(c: CriterionCtx, l: StdLead, lo = 2, hi = 12): number {
  const x = sig(c)[l];
  const n = x.length;
  const m = mean(Array.from(x));
  let best = lo, bv = -1;
  for (let f = lo; f <= hi + 1e-9; f += 0.1) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i += 2) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      const v = (x[i] - m) * w;
      const ph = (2 * Math.PI * f * i) / c.fs;
      re += v * Math.cos(ph);
      im -= v * Math.sin(ph);
    }
    const p = re * re + im * im;
    if (p > bv) {
      bv = p;
      best = f;
    }
  }
  return best;
}

/** Largest absolute value of a lead (mV) after removing its median. */
export function maxAbs(c: CriterionCtx, l: StdLead): number {
  const x = sig(c)[l];
  const m = median(Array.from(x));
  let a = 0;
  for (let i = 0; i < x.length; i++) a = Math.max(a, Math.abs(x[i] - m));
  return a;
}

/** Peak-to-peak of a lead over a time window (ms). */
export function p2pIn(c: CriterionCtx, l: StdLead, a: number, z: number): number {
  const x = sig(c)[l];
  let mx = -Infinity, mn = Infinity;
  for (let i = Math.max(0, Math.round((a * c.fs) / 1000)); i < Math.min(x.length, Math.round((z * c.fs) / 1000)); i++) {
    mx = Math.max(mx, x[i]);
    mn = Math.min(mn, x[i]);
  }
  return mx > mn ? mx - mn : 0;
}

/** For each P peak, the first QRS onset after it (ms), or null. */
export function nextQrsAfter(beats: readonly RBeat[], t: number): RBeat | null {
  return beats.find((b) => b.on > t) ?? null;
}

/** Formatting helper. */
export const f0 = (x: number | null | undefined): string => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(0));
export const f2 = (x: number | null | undefined): string => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(2));
export { STD_LEADS };

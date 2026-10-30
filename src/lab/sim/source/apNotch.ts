/**
 * Phase-1 notch of the ventricular action potential — the transient outward current I_to ("spike and dome").
 * Cold enhances it (Osborn / J wave of hypothermia); in Brugada syndrome the right-ventricular outflow-tract
 * epicardium has a deep notch with a delayed, partly lost dome. I_to is dense in the epicardium and sparse in the
 * endocardium (Yan & Antzelevitch 1996), so the notch differs across the wall — that transmural difference, and
 * nothing hand-made, is what the ECG shows (CLAUDE.md one-source rule).
 *
 * Per voxel with notch depth d (fraction of the AP excursion) the TMP template of conduction/ap.ts becomes
 *
 *   s(t) = U(x) · R(y) · ( P(x) − d · N(x) ),      x = t − δ, y = t − ρ, A = ρ − δ
 *   N(x) = S(x) · [ (1 − r) + r · E(x) ]
 *   S(x) = σ((x − x_on)/τ_on)                notch onset right after the upstroke (I_to activates within ms)
 *   E(x) = exp(−(x − x_on)/τ_dome)           the dome (L-type Ca²⁺ current) returns with time constant τ_dome
 *
 * r = 1: a full dome (spike-and-dome; the hypothermic J wave), r < 1: the dome is partly lost and the plateau stays
 * depressed until repolarization (Brugada). Repolarization time ρ is untouched: APD changes go through tissue.apd,
 * which the 3D colouring and the slice read as well.
 *
 * Only s_v changes; the kernel c_v is untouched, so Σc ≡ 0 still holds and H = −gain·Σ c_v·s_v stays the exact
 * voxel-face EDL: a notch shared by every voxel at the same δ gives H = 0, and only a notch that differs between
 * neighbouring surfaces (epicardium vs endocardium) gives a J deflection, pointing along the notched surface's
 * outward normal (H_notch = +gain·Σ c_v·d_v·N_v).
 *
 * Fast synthesis (the scheme of source/voxelEdl.ts): with R = 1 − G(y), G = σ(y/τr), and G(y) ≈ e^{y/τr} wherever
 * the factor it multiplies lives only at x ≪ A, the notch term Δs = −d·U·S·[(1−r) + r·E]·R splits into
 *   δ-histogram, weight c·d:             T1(x) = −U·S·[(1−r) + r·E]
 *   δ-histogram, weight c·d·e^{−A/τr}:   T2(x) = −(1 − U·S)·e^{x/τr}·[(1−r) + r·E]          (τ_dome ≥ τr)
 *                                        T2(x) = −(1 − U·S)·e^{x/τr}·(1−r) + r·U·S·E·e^{x/τr}   (τ_dome < τr)
 *   ρ-histogram, weight c·d·(1−r):       G(y)
 *   ρ-histogram, weight c·d·r·e^{−(A−x_on)/τ_dome}:   e^{−y/τ_dome}·G(y)                    (τ_dome ≥ τr only)
 * A slow dome (τ_dome ≥ τr) is carried exactly by the last ρ term; a fast dome (τ_dome < τr) has died out long
 * before repolarization, so its overlap with G is the small e^{−A/τr} δ term. Either way the result is exact up to
 * O(e^{−2(A − x_on)/τr}), like the AP synthesis itself, and every table stays bounded (τ_on ≤ τr/2, see sanitizeNotch).
 *
 * The 3D colouring and the slice evaluate the plain AP (view3d AP_GLSL) — they show activation and repolarization,
 * not the few-millivolt notch; the activation and APD fields they read are the ones the ECG uses.
 */
import { sigmoid } from '../conduction/ap';
import type { ApParams, SourceKernel } from '../types';

/** Notch shape of one tissue entry (times in ms after the voxel's upstroke). */
export interface NotchShape {
  /** Notch onset (sigmoid midpoint) and its time constant. */
  readonly onsetMs: number;
  readonly onsetTauMs: number;
  /** The notch recovers as e^{−(x − onset)/τ_dome} (the dome returns). */
  readonly domeTauMs: number;
  /** Fraction of the notch the dome recovers: 1 = full dome, 0 = dome lost until repolarization. */
  readonly domeRecovery: number;
}

/** Scenario-level notch parameters (tissue.notch entries add a RegionSelector). */
export interface NotchSpec {
  /** Notch depth: fraction of the AP excursion (0 … 0.9). */
  readonly depth: number;
  /** Dome time constant (ms). */
  readonly domeTauMs: number;
  /** Fraction of the notch the dome recovers (default 1). */
  readonly domeRecovery?: number;
  /** Notch onset after the upstroke (ms, default 6) and its time constant (ms, default 2.5). */
  readonly onsetMs?: number;
  readonly onsetTauMs?: number;
}

/** Grid-sized notch assignment: class 0 = no notch, class k uses shapes[k − 1] with the voxel's depth. */
export interface NotchField {
  readonly cls: Uint8Array;
  readonly depth: Float32Array;
  readonly shapes: readonly NotchShape[];
}

export const NOTCH_DEFAULT_ONSET_MS = 6;
export const NOTCH_DEFAULT_ONSET_TAU_MS = 2.5;

export const notchShapeOf = (s: NotchSpec): NotchShape => ({
  onsetMs: s.onsetMs ?? NOTCH_DEFAULT_ONSET_MS,
  onsetTauMs: s.onsetTauMs ?? NOTCH_DEFAULT_ONSET_TAU_MS,
  domeTauMs: s.domeTauMs,
  domeRecovery: s.domeRecovery ?? 1,
});

/** Clamps a shape to the supported range: 0 ≤ onset, 1 ms ≤ τ_on ≤ τr/2, τ_on ≤ τ_dome, 0 ≤ r ≤ 1. */
export function sanitizeNotch(s: NotchShape, ap: ApParams): NotchShape {
  const onsetTauMs = Math.min(0.5 * ap.tauRepMs, Math.max(1, s.onsetTauMs));
  return {
    onsetMs: Math.max(0, s.onsetMs),
    onsetTauMs,
    domeTauMs: Math.max(onsetTauMs, s.domeTauMs),
    domeRecovery: Math.min(1, Math.max(0, s.domeRecovery)),
  };
}

/** N(x): the notch profile (0 before the upstroke, 1 at full depth). */
export function notchProfile(x: number, s: NotchShape): number {
  const S = sigmoid((x - s.onsetMs) / s.onsetTauMs);
  if (S === 0) return 0;
  return S * (1 - s.domeRecovery + s.domeRecovery * Math.exp(Math.min(700, -(x - s.onsetMs) / s.domeTauMs)));
}

/** Exact notched AP s(t) of one voxel (tests, teaching insets); equals conduction/ap apValue when depth = 0. */
export function apValueNotched(tMs: number, tActMs: number, tRepMs: number, ap: ApParams, s: NotchShape, depth: number): number {
  const x = tMs - tActMs;
  const plateau = 1 - (ap.plateauSlope * x) / 200;
  return sigmoid(x / ap.tauUpMs) * (plateau - depth * notchProfile(x, s)) * sigmoid(-(tMs - tRepMs) / ap.tauRepMs);
}

/** Per-voxel activation / repolarization times as source/voxelEdl collects them (kernel index, δ, ρ, A = ρ − δ). */
export interface NotchVoxelTimes {
  readonly idx: Uint32Array;
  readonly d: Float64Array;
  readonly r: Float64Array;
  readonly A: Float64Array;
}

/** Output sampling of a template: sample i at t0 + i·dt; sub-bins of dt/sub with B0 guard bins (see voxelEdl). */
export interface NotchGrid {
  readonly t0: number;
  readonly dt: number;
  readonly nOut: number;
  readonly sub: number;
  readonly b0: number;
}

/** softplus(z) = ln(1 + e^z), stable. */
const softplus = (z: number) => (z > 30 ? z : z < -30 ? Math.exp(z) : Math.log1p(Math.exp(z)));

/**
 * Σ_v c_v·Δs_v(t_i) of the notched voxels (3 components interleaved, heart-local frame, mm²; multiply by −gain).
 * Returns null when no kernel voxel carries a notch.
 */
export function notchSourceSum(vt: NotchVoxelTimes, k: SourceKernel, field: NotchField, ap: ApParams, grid: NotchGrid): Float64Array | null {
  const { t0, dt, nOut, sub, b0 } = grid;
  const db = dt / sub;
  const nBins = sub * (nOut + 4) + 2 * b0;
  const binOf = (t: number) => (t - t0) / db + b0;
  const mLo = b0 - nBins, mHi = sub * (nOut - 1) + b0;
  const nm = mHi - mLo + 1;
  const tauR = ap.tauRepMs, tauU = ap.tauUpMs;
  const out = new Float64Array(3 * nOut);
  let any = false;
  for (let cls = 1; cls <= field.shapes.length; cls++) {
    const s = sanitizeNotch(field.shapes[cls - 1], ap);
    const slowDome = s.domeTauMs >= tauR;
    const rr = s.domeRecovery, keep = 1 - rr;
    const h1 = new Float64Array(3 * nBins), h2 = new Float64Array(3 * nBins), h3 = new Float64Array(3 * nBins), h4 = new Float64Array(3 * nBins);
    const splat = (h: Float64Array, t: number, w: number, cx: number, cy: number, cz: number) => {
      const x = binOf(t);
      const b = Math.floor(x);
      if (b < 0 || b + 1 >= nBins) return;
      const f = x - b;
      h[3 * b] += cx * w * (1 - f);
      h[3 * b + 1] += cy * w * (1 - f);
      h[3 * b + 2] += cz * w * (1 - f);
      h[3 * b + 3] += cx * w * f;
      h[3 * b + 4] += cy * w * f;
      h[3 * b + 5] += cz * w * f;
    };
    let n = 0;
    for (let i = 0; i < vt.idx.length; i++) {
      const q = vt.idx[i];
      const v = k.voxels[q];
      if (field.cls[v] !== cls) continue;
      const dep = field.depth[v];
      if (dep === 0) continue;
      const cx = k.c[3 * q], cy = k.c[3 * q + 1], cz = k.c[3 * q + 2];
      const A = vt.A[i];
      splat(h1, vt.d[i], dep, cx, cy, cz);
      splat(h2, vt.d[i], dep * Math.exp(-A / tauR), cx, cy, cz);
      if (keep > 0) splat(h3, vt.r[i], dep * keep, cx, cy, cz);
      if (slowDome && rr > 0) splat(h4, vt.r[i], dep * rr * Math.exp(-(A - s.onsetMs) / s.domeTauMs), cx, cy, cz);
      n++;
    }
    if (n === 0) continue;
    any = true;
    // lag tables (lag = m·db)
    const T1 = new Float64Array(nm), T2 = new Float64Array(nm), T3 = new Float64Array(nm), T4 = new Float64Array(nm);
    for (let m = mLo; m <= mHi; m++) {
      const lag = m * db, j = m - mLo;
      const u = sigmoid(lag / tauU), su = sigmoid((lag - s.onsetMs) / s.onsetTauMs);
      const us = u * su;
      // 1 − U·S without cancellation: (1−u) + (1−su) − (1−u)(1−su)
      const cu = sigmoid(-lag / tauU), cs = sigmoid(-(lag - s.onsetMs) / s.onsetTauMs);
      const notUs = cu + cs - cu * cs;
      const eDome = (lag - s.onsetMs) / s.domeTauMs; // E = exp(−eDome)
      // U·S·E: combine exponents so the product never overflows for very negative lags
      const usE = us > 0 ? Math.exp(Math.log(us) - eDome) : 0;
      T1[j] = -(keep * us + rr * usE);
      const eR = lag / tauR;
      if (slowDome) {
        // (1 − U·S)·e^{x/τr}·[(1−r) + r·E]: bounded because τ_dome ≥ τr
        const a = notUs > 0 ? Math.exp(Math.min(700, Math.log(notUs) + eR)) : 0;
        const b = notUs > 0 && rr > 0 ? Math.exp(Math.min(700, Math.log(notUs) + eR - eDome)) : 0;
        T2[j] = -(keep * a + rr * b);
        // e^{−y/τ_dome}·σ(y/τr) = exp(−y/τ_dome − softplus(−y/τr))
        T4[j] = Math.exp(Math.min(700, -lag / s.domeTauMs - softplus(-eR)));
      } else {
        const a = notUs > 0 ? Math.exp(Math.min(700, Math.log(notUs) + eR)) : 0;
        const b = usE > 0 ? Math.exp(Math.min(700, Math.log(usE) + eR)) : 0;
        T2[j] = -keep * a + rr * b;
      }
      T3[j] = sigmoid(eR);
    }
    const nzList = (h: Float64Array) => {
      const o: number[] = [];
      for (let b = 0; b < nBins; b++) if (h[3 * b] !== 0 || h[3 * b + 1] !== 0 || h[3 * b + 2] !== 0) o.push(b);
      return Int32Array.from(o);
    };
    const terms: [Float64Array, Float64Array][] = [[h1, T1], [h2, T2]];
    if (keep > 0) terms.push([h3, T3]);
    if (slowDome && rr > 0) terms.push([h4, T4]);
    for (const [h, T] of terms) {
      const bins = nzList(h);
      for (let i = 0; i < nOut; i++) {
        const base = sub * i + b0 - mLo;
        let x = 0, y = 0, z = 0;
        for (let p = 0; p < bins.length; p++) {
          const b = bins[p];
          const w = T[base - b];
          x += h[3 * b] * w;
          y += h[3 * b + 1] * w;
          z += h[3 * b + 2] * w;
        }
        out[3 * i] += x;
        out[3 * i + 1] += y;
        out[3 * i + 2] += z;
      }
    }
  }
  return any ? out : null;
}

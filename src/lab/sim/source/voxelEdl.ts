/**
 * Voxel-face equivalent double layer (EDL) — the single source of every ECG sample (CLAUDE.md one-source rule).
 *
 * Kernel (per compartment): c_v = h² · Σ outward unit normals of the voxel's faces that border non-myocardium
 * (Blood, Out, Ring, Vessel, Dead, grid edge) or the other compartment. Σ_v c_v = 0 exactly (closed surface; the
 * entries are integer multiples of h², so the float64 sum is exact).
 * Source: H(t) = −gain · Σ_v c_v · s_v(t), s_v = normalized TMP template (conduction/ap.ts). This is the gradient
 * theorem on J_i = −σ∇Vm over the voxelized wall (docs/research/dipole-model-design.md §2), so: H = gain × (net
 * wavefront area vector) during QRS, H = 0 when all voxels share one state (flat baseline/ST), T only from
 * repolarization-time differences, ventricular gradient ∫H dt independent of activation order, atrial
 * repolarization → Ta wave without any hand-made wave.
 *
 * Fast synthesis: with U = σ(x/τu), P = 1 − a·x/200, R = σ(−y/τr), x = t−δ, y = t−ρ, A = ρ−δ:
 *   s = U·P·R = F(x) − w·G(y) + (a/200)·K(y) + e^{−A/τr}·C(x)
 *   F = U·P, G = σ(y/τr), K = y·G, w = 1 − a·A/200, C = σ(−x/τu)·P(x)·e^{x/τr}
 * (exact up to O(e^{−2A/τr})). Each term is a weighted histogram of δ or ρ (0.25 ms sub-bins, linear split)
 * convolved with a fixed kernel table — O(n_samples × n_bins) instead of O(n_samples × n_voxels).
 * Then a zero-phase Gaussian low-pass (−3 dB at ap.lowpassHz, default 150 Hz) removes voxel-staircase ripple.
 * Optional per-voxel phase-1 notch (I_to spike-and-dome, tissue.notch): source/apNotch.ts adds its Σ c·Δs with the
 * same histogram scheme; without a notch the synthesis is unchanged.
 */
import { PLATEAU_REF_MS, sanitizeAp, sigmoid } from '../conduction/ap';
import { compMask } from '../conduction/gridUtil';
import type { NotchField } from './apNotch';
import { apValueNotched, notchSourceSum, sanitizeNotch } from './apNotch';
import type { ApParams, BeatTemplate, Comp, SourceKernel, TemplateTruth, VoxelGrid } from '../types';

// Local aliases: hot loops avoid re-reading imported bindings (module-namespace getters under the test runner).
const sig = sigmoid;
const REF = PLATEAU_REF_MS;

// ---------------------------------------------------------------- kernel

export function buildKernel(g: VoxelGrid, comp: Comp): SourceKernel {
  const [nx, ny, nz] = g.dims;
  const h2 = g.hMm * g.hMm;
  const sx = 1, sy = nx, sz = nx * ny;
  const inC = compMask(g, comp); // 1 inside the compartment; the grid edge counts as outside
  const vox: number[] = [];
  const cs: number[] = [];
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        if (!inC[v]) continue;
        // outward normal of each boundary face (+1 if the +axis neighbour is outside the compartment)
        const xp = i + 1 < nx ? inC[v + sx] : 0, xm = i > 0 ? inC[v - sx] : 0;
        const yp = j + 1 < ny ? inC[v + sy] : 0, ym = j > 0 ? inC[v - sy] : 0;
        const zp = k + 1 < nz ? inC[v + sz] : 0, zm = k > 0 ? inC[v - sz] : 0;
        const cx = xm - xp, cy = ym - yp, cz = zm - zp; // (1 − xp) − (1 − xm)
        if (cx === 0 && cy === 0 && cz === 0) continue; // interior (or opposite faces cancel): contributes nothing
        vox.push(v);
        cs.push(cx * h2, cy * h2, cz * h2);
      }
  return { comp, voxels: Uint32Array.from(vox), c: Float32Array.from(cs) };
}

/** Σ c (float64) — exactly [0,0,0] for a valid kernel. */
export function kernelSum(k: SourceKernel): [number, number, number] {
  let x = 0, y = 0, z = 0;
  for (let q = 0; q < k.voxels.length; q++) {
    x += k.c[3 * q];
    y += k.c[3 * q + 1];
    z += k.c[3 * q + 2];
  }
  return [x, y, z];
}

/** Σ |c| (float64) — normalizer for closure checks. */
export function kernelAbsSum(k: SourceKernel): number {
  let s = 0;
  for (let q = 0; q < k.voxels.length; q++) s += Math.hypot(k.c[3 * q], k.c[3 * q + 1], k.c[3 * q + 2]);
  return s;
}

// ---------------------------------------------------------------- synthesis

export interface SynthesisInput {
  readonly key: string;
  readonly kernel: SourceKernel;
  /** Grid-sized activation times (ms rel. to the beat event; Infinity = never). */
  readonly tAct: Float32Array;
  /** Grid-sized reference APD (ms). */
  readonly apdRefMs: Float32Array;
  readonly apdScale: number;
  readonly ap: ApParams;
  /** mV per mm². */
  readonly gain: number;
  readonly fsHz?: number;
  /** Samples kept before the first activation (ms). */
  readonly preMs?: number;
  /** Optional phase-1 AP notch per voxel (source/apNotch.ts, tissue.notch). Absent → the plain AP, bit-identical. */
  readonly notch?: NotchField | null;
}

const SUB = 4; // sub-bins per output sample (0.25 ms at 1 kHz)

interface VoxelTimes {
  readonly idx: Uint32Array; // kernel index
  readonly d: Float64Array; // δ
  readonly r: Float64Array; // ρ
  readonly A: Float64Array; // ρ − δ
}

function voxelTimes(inp: SynthesisInput): VoxelTimes {
  const k = inp.kernel;
  const idx: number[] = [], d: number[] = [], r: number[] = [], A: number[] = [];
  for (let q = 0; q < k.voxels.length; q++) {
    const v = k.voxels[q];
    const ta = inp.tAct[v];
    if (!Number.isFinite(ta)) continue; // never activated → s ≡ 0
    const apd = inp.apdRefMs[v] * inp.apdScale;
    idx.push(q);
    d.push(ta);
    r.push(ta + apd);
    A.push(apd);
  }
  return { idx: Uint32Array.from(idx), d: Float64Array.from(d), r: Float64Array.from(r), A: Float64Array.from(A) };
}

/** Repolarized fraction thresholds that define the T-wave truth (see templateTruth). */
export const REPOL_ON_FRACTION = 0.02;
export const REPOL_END_FRACTION = 0.95;

/**
 * Model-truth points of a template (ms rel. to the beat event), from the kernel (boundary, c ≠ 0) voxels'
 * activation δ and repolarization ρ (sigmoid midpoint) times:
 *   onMs       = min δ − 2τu    first boundary voxel at 12 % of its upstroke
 *   offMs      = max δ          last boundary voxel at mid-upstroke
 *   repolOnMs  = t where the |c|-weighted repolarized fraction f(t) = Σ|c|·σ((t−ρ)/τr) / Σ|c| reaches 2 %
 *   repolEndMs = t where f(t) reaches 95 % ("95 % of the source surface has repolarized")
 * Interior voxels (c = 0) never change H, so they do not define ECG truth (they are still coloured in 3D).
 * tests/sim/measure checks that the blind measurements (|dH/dt| rules, tangent T end) land within 10 ms of these.
 */
export function templateTruth(vt: VoxelTimes, k: SourceKernel, ap: ApParams): TemplateTruth {
  const n = vt.d.length;
  if (n === 0) return { onMs: 0, offMs: 0, repolOnMs: 0, repolEndMs: 0 };
  let dMin = Infinity, dMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (let i = 0; i < n; i++) {
    dMin = Math.min(dMin, vt.d[i]);
    dMax = Math.max(dMax, vt.d[i]);
    rMin = Math.min(rMin, vt.r[i]);
    rMax = Math.max(rMax, vt.r[i]);
  }
  // |c|-weighted histogram of ρ at 0.5 ms, then f(t) = histogram ⊛ logistic CDF, scanned at 0.5 ms
  const step = 0.5;
  const r0 = rMin - 10 * ap.tauRepMs, nb = Math.ceil((rMax + 10 * ap.tauRepMs - r0) / step) + 1;
  const hist = new Float64Array(nb);
  let tot = 0;
  for (let i = 0; i < n; i++) {
    const q = vt.idx[i];
    const w = Math.hypot(k.c[3 * q], k.c[3 * q + 1], k.c[3 * q + 2]);
    hist[Math.round((vt.r[i] - r0) / step)] += w;
    tot += w;
  }
  const nz: number[] = [];
  for (let b = 0; b < nb; b++) if (hist[b] > 0) nz.push(b);
  const frac = (t: number) => {
    let s = 0;
    for (const b of nz) s += hist[b] * sig((t - (r0 + b * step)) / ap.tauRepMs);
    return s / tot;
  };
  const crossing = (target: number) => {
    let lo = r0, hi = r0 + nb * step;
    for (let it = 0; it < 40; it++) {
      const mid = 0.5 * (lo + hi);
      if (frac(mid) < target) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  };
  return { onMs: dMin - 2 * ap.tauUpMs, offMs: dMax, repolOnMs: crossing(REPOL_ON_FRACTION), repolEndMs: crossing(REPOL_END_FRACTION) };
}

export function weightedPercentile(x: Float64Array, w: Float64Array, p: number): number {
  const order = Array.from(x.keys()).sort((a, b) => x[a] - x[b] || a - b);
  let tot = 0;
  for (let i = 0; i < w.length; i++) tot += w[i];
  let acc = 0;
  for (const i of order) {
    acc += w[i];
    if (acc >= p * tot) return x[i];
  }
  return x[order[order.length - 1]];
}

export interface SynthesisResult {
  readonly template: BeatTemplate;
  /** Unfiltered H (local frame, mV), same sampling — for tests. */
  readonly raw: Float32Array;
}

export function synthesizeTemplate(inp: SynthesisInput): SynthesisResult {
  const ap = sanitizeAp(inp.ap);
  const fs = inp.fsHz ?? 1000;
  const dt = 1000 / fs;
  const k = inp.kernel;
  const vt = voxelTimes(inp);
  const truth = templateTruth(vt, k, ap);
  const n = vt.d.length;
  if (n === 0) {
    const empty = new Float32Array(3);
    return { template: { key: inp.key, comp: k.comp, fsHz: fs, t0Ms: 0, n: 1, H: empty, truth }, raw: empty };
  }
  let dMin = Infinity, rMax = -Infinity, dMax = -Infinity, rMin = Infinity;
  for (let i = 0; i < n; i++) {
    dMin = Math.min(dMin, vt.d[i]);
    dMax = Math.max(dMax, vt.d[i]);
    rMin = Math.min(rMin, vt.r[i]);
    rMax = Math.max(rMax, vt.r[i]);
  }
  const pre = inp.preMs ?? 20;
  const t0 = Math.floor((dMin - pre) / dt) * dt;
  const tEnd = rMax + 12 * ap.tauRepMs + 10;
  const nOut = Math.ceil((tEnd - t0) / dt) + 1;
  const db = dt / SUB; // sub-bin width
  // Bin b sits at time t0 + (b − B0)·db; output sample i at t0 + i·dt  →  lag index m = SUB·i − b + B0.
  const B0 = 8;
  const nBins = SUB * (nOut + 4) + 2 * B0;
  const binOf = (t: number) => (t - t0) / db + B0;

  // histograms (3 components each)
  const hD = new Float64Array(3 * nBins), hDc = new Float64Array(3 * nBins), hRw = new Float64Array(3 * nBins), hR = new Float64Array(3 * nBins);
  const a = ap.plateauSlope;
  const splat = (h: Float64Array, t: number, wx: number, wy: number, wz: number) => {
    const x = binOf(t);
    const b = Math.floor(x);
    if (b < 0 || b + 1 >= nBins) return;
    const f = x - b;
    h[3 * b] += wx * (1 - f);
    h[3 * b + 1] += wy * (1 - f);
    h[3 * b + 2] += wz * (1 - f);
    h[3 * b + 3] += wx * f;
    h[3 * b + 4] += wy * f;
    h[3 * b + 5] += wz * f;
  };
  for (let i = 0; i < n; i++) {
    const q = vt.idx[i];
    const cx = k.c[3 * q], cy = k.c[3 * q + 1], cz = k.c[3 * q + 2];
    const A = vt.A[i];
    const w = 1 - (a * A) / REF;
    const e = Math.exp(-A / ap.tauRepMs);
    splat(hD, vt.d[i], cx, cy, cz);
    splat(hDc, vt.d[i], cx * e, cy * e, cz * e);
    splat(hRw, vt.r[i], cx * w, cy * w, cz * w);
    splat(hR, vt.r[i], cx, cy, cz);
  }

  // kernel tables indexed by lag m (lag time = (m − B0)… see below); m ranges over [mLo, mHi]
  const mLo = SUB * 0 - nBins + B0, mHi = SUB * (nOut - 1) + B0;
  const nm = mHi - mLo + 1;
  const tF = new Float64Array(nm), tC = new Float64Array(nm), tG = new Float64Array(nm), tK = new Float64Array(nm);
  for (let m = mLo; m <= mHi; m++) {
    // lag = t_i − τ_b = i·dt − (b − B0)·db = (SUB·i − b + B0)·db = m·db
    const lag = m * db;
    const P = 1 - (a * lag) / REF;
    const j = m - mLo;
    tF[j] = sig(lag / ap.tauUpMs) * P;
    const cu = sig(-lag / ap.tauUpMs);
    tC[j] = cu > 1e-300 ? cu * P * Math.exp(Math.min(700, lag / ap.tauRepMs)) : 0;
    const G = sig(lag / ap.tauRepMs);
    tG[j] = G;
    tK[j] = lag * G;
  }

  // nonzero bin lists
  const nz = (h: Float64Array) => {
    const out: number[] = [];
    for (let b = 0; b < nBins; b++) if (h[3 * b] !== 0 || h[3 * b + 1] !== 0 || h[3 * b + 2] !== 0) out.push(b);
    return Int32Array.from(out);
  };
  const bD = nz(hD), bR = nz(hR);
  // notched voxels (source/apNotch.ts): Σ c·Δs, added before the gain
  const nsum = inp.notch ? notchSourceSum(vt, k, inp.notch, ap, { t0, dt, nOut, sub: SUB, b0: B0 }) : null;
  const raw = new Float32Array(3 * nOut);
  const kA = a / REF;
  for (let i = 0; i < nOut; i++) {
    let x = 0, y = 0, z = 0;
    const base = SUB * i + B0 - mLo;
    for (let p = 0; p < bD.length; p++) {
      const b = bD[p];
      const j = base - b;
      const f = tF[j], c = tC[j];
      x += hD[3 * b] * f + hDc[3 * b] * c;
      y += hD[3 * b + 1] * f + hDc[3 * b + 1] * c;
      z += hD[3 * b + 2] * f + hDc[3 * b + 2] * c;
    }
    for (let p = 0; p < bR.length; p++) {
      const b = bR[p];
      const j = base - b;
      const G = tG[j], K = tK[j] * kA;
      x += -hRw[3 * b] * G + hR[3 * b] * K;
      y += -hRw[3 * b + 1] * G + hR[3 * b + 1] * K;
      z += -hRw[3 * b + 2] * G + hR[3 * b + 2] * K;
    }
    if (nsum) {
      x += nsum[3 * i];
      y += nsum[3 * i + 1];
      z += nsum[3 * i + 2];
    }
    raw[3 * i] = -inp.gain * x;
    raw[3 * i + 1] = -inp.gain * y;
    raw[3 * i + 2] = -inp.gain * z;
  }
  const H = gaussianLowpass(raw, nOut, fs, ap.lowpassHz);
  return { template: { key: inp.key, comp: k.comp, fsHz: fs, t0Ms: t0, n: nOut, H, truth }, raw };
}

/**
 * Reference implementation: direct per-voxel evaluation of the exact template (no histogram, no low-pass).
 * O(n_voxels × n_samples) — tests only.
 */
export function synthesizeDirect(inp: SynthesisInput, t0Ms: number, n: number): Float32Array {
  const ap = sanitizeAp(inp.ap);
  const dt = 1000 / (inp.fsHz ?? 1000);
  const vt = voxelTimes(inp);
  const k = inp.kernel;
  const out = new Float64Array(3 * n);
  const notch = inp.notch ?? null;
  for (let i = 0; i < vt.d.length; i++) {
    const q = vt.idx[i];
    const cx = k.c[3 * q], cy = k.c[3 * q + 1], cz = k.c[3 * q + 2];
    const cls = notch ? notch.cls[k.voxels[q]] : 0;
    const shape = notch && cls > 0 ? sanitizeNotch(notch.shapes[cls - 1], ap) : null;
    const depth = notch && cls > 0 ? notch.depth[k.voxels[q]] : 0;
    for (let s = 0; s < n; s++) {
      const t = t0Ms + s * dt;
      const x = t - vt.d[i];
      const val = shape
        ? apValueNotched(t, vt.d[i], vt.r[i], ap, shape, depth)
        : sigmoid(x / ap.tauUpMs) * (1 - (ap.plateauSlope * x) / PLATEAU_REF_MS) * sigmoid(-(t - vt.r[i]) / ap.tauRepMs);
      out[3 * s] += cx * val;
      out[3 * s + 1] += cy * val;
      out[3 * s + 2] += cz * val;
    }
  }
  return Float32Array.from(out, (x) => -inp.gain * x);
}

/** Zero-phase Gaussian FIR low-pass on 3-component interleaved samples; −3 dB at cutoffHz. Zero-padded ends. */
export function gaussianLowpass(x: Float32Array, n: number, fsHz: number, cutoffHz: number): Float32Array {
  // |H(f)| = exp(−2π²σ²f²) = 1/√2  →  σ = √(ln 2 / 2) / (π f_c)
  const sigma = (Math.sqrt(Math.LN2 / 2) / (Math.PI * cutoffHz)) * fsHz; // samples
  if (sigma < 0.3) return x.slice();
  const half = Math.ceil(4 * sigma);
  const w = new Float64Array(2 * half + 1);
  let sw = 0;
  for (let i = -half; i <= half; i++) sw += w[i + half] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < w.length; i++) w[i] /= sw;
  const y = new Float32Array(3 * n);
  for (let s = 0; s < n; s++) {
    let a = 0, b = 0, c = 0;
    for (let i = -half; i <= half; i++) {
      const j = s + i;
      if (j < 0 || j >= n) continue;
      const ww = w[i + half];
      a += ww * x[3 * j];
      b += ww * x[3 * j + 1];
      c += ww * x[3 * j + 2];
    }
    y[3 * s] = a;
    y[3 * s + 1] = b;
    y[3 * s + 2] = c;
  }
  return y;
}

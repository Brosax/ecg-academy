/**
 * Renderer: kernels → heart vector H(t) (Frank, Float64) + near-field electrode sums, then electrode potentials
 * (DECISION §6.1 steps 4–5, §6.2):
 *
 *   H(t)   = Σ_k far_k · amp_k f_k(t) d_k(t)
 *   Φ_e(t) = g·L_e·H(t) + g·Σ_{k with loc} amp_k f_k(t) d_k(t) · g_e(r_k, far_k)
 *
 * Near-field gains are cached per (rounded location, far) inside one call (bounded by the number of distinct
 * locations of the call). Nothing here knows about leads: assemble.ts forms them from the potentials.
 */
import type { Vec3 } from '../api';
import { COMPUTED_SITES, SITE_POS, type ComputedSite } from '../leads/electrodes';
import { BETA, nearGain, SITE_LEAD_VECTOR } from '../leads/leadfield';
import { dirAt, shapeAt, type Kernel } from './kernel';

const NS = COMPUTED_SITES.length;

export interface Rendered {
  readonly fs: number;
  readonly n: number;
  /** time (ms) of sample 0 */
  readonly t0: number;
  readonly H: readonly [Float64Array, Float64Array, Float64Array];
  /** near-field potential per computed site (COMPUTED_SITES order) */
  readonly near: readonly Float64Array[];
}

type Gains = Float64Array; // NS × 3

/** Gains per (rounded location, far, β): bounded (cleared when full; locations repeat across beats and calls). */
const LOC_GAINS = new Map<string, Map<number, Gains>>();
const MAX_LOC_GAINS = 4096;
let locGainCount = 0;
/** Gains per kernel object (weak: dies with the kernels of a call). */
const KERNEL_GAINS = new WeakMap<Kernel, Gains>();

/** Location quantum (cm) of the gain cache: gains are computed from the quantised location, so a cache hit and a
 *  miss give identical numbers and the output never depends on what was rendered before (determinism, T7). */
const LOC_Q = 1e-3;
const quant = (x: number): number => Math.round(x / LOC_Q) * LOC_Q;
/** integer key of a quantised location (|x| < 65 cm at 1e-3 cm: 17 bits per axis, exact in a double) */
const OFF = 65536;
const locKey = (loc: Vec3): number => {
  const ix = Math.round(loc[0] / LOC_Q) + OFF, iy = Math.round(loc[1] / LOC_Q) + OFF, iz = Math.round(loc[2] / LOC_Q) + OFF;
  return (ix * 131072 + iy) * 131072 + iz;
};

function locGains(loc: Vec3, far: number, beta: number): Gains {
  const fk = `${far}|${beta}`;
  let byLoc = LOC_GAINS.get(fk);
  if (!byLoc) LOC_GAINS.set(fk, (byLoc = new Map()));
  const key = locKey(loc);
  let g = byLoc.get(key);
  if (!g) {
    const q: Vec3 = [quant(loc[0]), quant(loc[1]), quant(loc[2])];
    g = new Float64Array(NS * 3);
    for (let s = 0; s < NS; s++) {
      const v = nearGain(SITE_POS[COMPUTED_SITES[s]], q, far, beta);
      g[3 * s] = v[0];
      g[3 * s + 1] = v[1];
      g[3 * s + 2] = v[2];
    }
    if (locGainCount >= MAX_LOC_GAINS) {
      LOC_GAINS.clear();
      locGainCount = 0;
      LOC_GAINS.set(fk, (byLoc = new Map()));
    }
    byLoc.set(key, g);
    locGainCount++;
  }
  return g;
}

/** Near-field gains of a kernel (null: no location, or β = 0). */
function kernelGains(k: Kernel, beta: number): Gains | null {
  if (!k.loc || beta === 0) return null;
  if (beta === BETA) {
    let g = KERNEL_GAINS.get(k);
    if (!g) {
      g = locGains(k.loc, k.far, beta);
      KERNEL_GAINS.set(k, g);
    }
    return g;
  }
  return locGains(k.loc, k.far, beta);
}

/**
 * Render kernels into n samples at fs starting at time t0 (ms). The common case — a bump with a fixed direction — is
 * evaluated inline (no per-sample calls); the near field accumulates into one sample-major buffer (9 sites per
 * sample, cache-friendly) that is split per site at the end.
 */
export function render(kernels: readonly Kernel[], fs: number, n: number, t0: number, beta = BETA): Rendered {
  const H: [Float64Array, Float64Array, Float64Array] = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  const nearI = new Float64Array(n * NS);
  const dt = 1000 / fs;
  const proj = new Float64Array(NS);
  const [Hx, Hy, Hz] = H;
  for (const k of kernels) {
    if (k.amp === 0) continue;
    const gains = kernelGains(k, beta);
    const fw = k.loc ? k.far : 1;
    if (k.shape === 'impulse') {
      const i = Math.round((k.tp - t0) / dt);
      if (i < 0 || i >= n) continue;
      const f = k.amp / dt; // area-preserving into one sample
      Hx[i] += fw * f * k.dir[0];
      Hy[i] += fw * f * k.dir[1];
      Hz[i] += fw * f * k.dir[2];
      if (gains) for (let s = 0; s < NS; s++) nearI[i * NS + s] += f * (k.dir[0] * gains[3 * s] + k.dir[1] * gains[3 * s + 1] + k.dir[2] * gains[3 * s + 2]);
      continue;
    }
    const i0 = Math.max(0, Math.ceil((k.s0 - t0) / dt));
    const i1 = Math.min(n - 1, Math.floor((k.s1 - t0) / dt));
    if (i1 < i0) continue;
    if (gains && !k.dir2) for (let s = 0; s < NS; s++) proj[s] = k.dir[0] * gains[3 * s] + k.dir[1] * gains[3 * s + 1] + k.dir[2] * gains[3 * s + 2];
    if (k.shape === 'bump' && !k.dir2) {
      // inline (1 − |u|^q)³ over the support; strictly inside (s0, s1) as shapeAt
      const { tp, wl, wr, q, amp, s0, s1 } = k;
      const dx = fw * k.dir[0], dy = fw * k.dir[1], dz = fw * k.dir[2];
      const q2 = q === 2;
      for (let i = i0; i <= i1; i++) {
        const t = t0 + i * dt;
        if (t <= s0 || t >= s1) continue;
        const a = t < tp ? (tp - t) / wl : (t - tp) / wr;
        if (a >= 1) continue;
        const b = 1 - (q2 ? a * a : a ** q);
        const f = amp * (b * b * b);
        if (f === 0) continue;
        Hx[i] += dx * f;
        Hy[i] += dy * f;
        Hz[i] += dz * f;
        if (gains) {
          const o = i * NS;
          for (let s = 0; s < NS; s++) nearI[o + s] += f * proj[s];
        }
      }
      continue;
    }
    for (let i = i0; i <= i1; i++) {
      const t = t0 + i * dt;
      const f = k.amp * shapeAt(k, t);
      if (f === 0) continue;
      const d = k.dir2 ? dirAt(k, t) : k.dir;
      Hx[i] += fw * f * d[0];
      Hy[i] += fw * f * d[1];
      Hz[i] += fw * f * d[2];
      if (gains) {
        if (k.dir2) for (let s = 0; s < NS; s++) proj[s] = d[0] * gains[3 * s] + d[1] * gains[3 * s + 1] + d[2] * gains[3 * s + 2];
        const o = i * NS;
        for (let s = 0; s < NS; s++) nearI[o + s] += f * proj[s];
      }
    }
  }
  const near: Float64Array[] = [];
  for (let s = 0; s < NS; s++) {
    const x = new Float64Array(n);
    for (let i = 0, o = s; i < n; i++, o += NS) x[i] = nearI[o];
    near.push(x);
  }
  return { fs, n, t0, H, near };
}

/** Electrode potentials Φ_e = g·(L_e·H + near_e) at the computed sites. */
export function electrodePotentials(r: Rendered, torsoGain = 1): Record<ComputedSite, Float64Array> {
  const out = {} as Record<ComputedSite, Float64Array>;
  const [Hx, Hy, Hz] = r.H;
  const n = r.n;
  for (let s = 0; s < NS; s++) {
    const site = COMPUTED_SITES[s];
    const L = SITE_LEAD_VECTOR[site];
    const l0 = L[0], l1 = L[1], l2 = L[2];
    const nf = r.near[s];
    const p = new Float64Array(n);
    for (let i = 0; i < n; i++) p[i] = torsoGain * (l0 * Hx[i] + l1 * Hy[i] + l2 * Hz[i] + nf[i]);
    out[site] = p;
  }
  return out;
}

/** Electrode potentials at one instant (no buffers): used by solves and truth probes. */
export function potentialsAt(kernels: readonly Kernel[], t: number, torsoGain = 1, beta = BETA): Record<ComputedSite, number> {
  let hx = 0, hy = 0, hz = 0;
  const nf = new Float64Array(NS);
  for (const k of kernels) {
    if (k.amp === 0 || k.shape === 'impulse' || t <= k.s0 || t >= k.s1) continue;
    const f = k.amp * shapeAt(k, t);
    if (f === 0) continue;
    const d = dirAt(k, t);
    const fw = k.loc ? k.far : 1;
    hx += fw * f * d[0];
    hy += fw * f * d[1];
    hz += fw * f * d[2];
    const g = kernelGains(k, beta);
    if (g) {
      for (let s = 0; s < NS; s++) nf[s] += f * (d[0] * g[3 * s] + d[1] * g[3 * s + 1] + d[2] * g[3 * s + 2]);
    }
  }
  const out = {} as Record<ComputedSite, number>;
  COMPUTED_SITES.forEach((site, s) => {
    const L = SITE_LEAD_VECTOR[site];
    out[site] = torsoGain * (L[0] * hx + L[1] * hy + L[2] * hz + nf[s]);
  });
  return out;
}

/**
 * Electrode potentials at sites render.ts does not compute (DECISION §6.2, §6.8): Mason–Likar torso sites, explicit
 * chest sites (misplaced, high, low), extra leads V3R/V4R/V7–V9. Same rule as render.ts › electrodePotentials:
 *
 *   Φ_e(t) = g·( L_e·H(t) + Σ_{k with loc} amp_k f_k(t) d_k(t) · g_e(r_k, far_k) )
 *
 * with H(t) taken from the call's Rendered (so the far field is shared) and the near-field sum re-run over the kernels
 * for these sites only (cost ∝ number of extra sites; nothing is paid by a standard recording). Locations are quantised
 * exactly as render.ts quantises them, so a standard site computed here equals render.ts to rounding (tested).
 */
import type { Vec3 } from '../api';
import { dirAt, shapeAt, type Kernel } from '../kernel/kernel';
import type { Rendered } from '../kernel/render';
import type { Hookup, SiteDef } from './electrodes';
import { BETA, nearGain } from './leadfield';

/** Location quantum of render.ts's gain cache (cm). */
const LOC_Q = 1e-3;
const quant = (x: number): number => Math.round(x / LOC_Q) * LOC_Q;

/** Potentials (Float64, same samples as `r`) at the given sites. `kernels` are the kernels rendered into `r`. */
export function sitePotentials(r: Rendered, kernels: readonly Kernel[], sites: readonly SiteDef[], torsoGain = 1, beta = BETA): Float64Array[] {
  const ns = sites.length;
  const near: Float64Array[] = sites.map(() => new Float64Array(r.n));
  if (ns === 0) return [];
  const dt = 1000 / r.fs;
  const gains = new Float64Array(3 * ns);
  const proj = new Float64Array(ns);
  for (const k of kernels) {
    if (k.amp === 0 || !k.loc || beta === 0) continue;
    const q: Vec3 = [quant(k.loc[0]), quant(k.loc[1]), quant(k.loc[2])];
    for (let s = 0; s < ns; s++) {
      const g = nearGain(sites[s].pos, q, k.far, beta);
      gains[3 * s] = g[0];
      gains[3 * s + 1] = g[1];
      gains[3 * s + 2] = g[2];
    }
    if (k.shape === 'impulse') {
      const i = Math.round((k.tp - r.t0) / dt);
      if (i < 0 || i >= r.n) continue;
      const f = k.amp / dt;
      for (let s = 0; s < ns; s++) near[s][i] += f * (k.dir[0] * gains[3 * s] + k.dir[1] * gains[3 * s + 1] + k.dir[2] * gains[3 * s + 2]);
      continue;
    }
    const i0 = Math.max(0, Math.ceil((k.s0 - r.t0) / dt));
    const i1 = Math.min(r.n - 1, Math.floor((k.s1 - r.t0) / dt));
    if (i1 < i0) continue;
    if (!k.dir2) for (let s = 0; s < ns; s++) proj[s] = k.dir[0] * gains[3 * s] + k.dir[1] * gains[3 * s + 1] + k.dir[2] * gains[3 * s + 2];
    for (let i = i0; i <= i1; i++) {
      const t = r.t0 + i * dt;
      const f = k.amp * shapeAt(k, t);
      if (f === 0) continue;
      if (k.dir2) {
        const d = dirAt(k, t);
        for (let s = 0; s < ns; s++) proj[s] = d[0] * gains[3 * s] + d[1] * gains[3 * s + 1] + d[2] * gains[3 * s + 2];
      }
      for (let s = 0; s < ns; s++) near[s][i] += f * proj[s];
    }
  }
  const [Hx, Hy, Hz] = r.H;
  return sites.map((site, s) => {
    const L = site.lv, nf = near[s];
    const p = new Float64Array(r.n);
    for (let i = 0; i < r.n; i++) p[i] = torsoGain * (L[0] * Hx[i] + L[1] * Hy[i] + L[2] * Hz[i] + nf[i]);
    return p;
  });
}

/** Potentials of every non-computed site of a hook-up, keyed like `Hookup.sites` (spread them into the potentials of
 *  render.ts before `assemble` / `recordingChain`). */
export function hookupSitePotentials(r: Rendered, kernels: readonly Kernel[], hook: Hookup, torsoGain = 1, beta = BETA): Record<string, Float64Array> {
  const keys = Object.keys(hook.sites);
  const pots = sitePotentials(r, kernels, keys.map((k) => hook.sites[k]), torsoGain, beta);
  const out: Record<string, Float64Array> = {};
  keys.forEach((k, i) => (out[k] = pots[i]));
  return out;
}

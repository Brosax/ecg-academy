/**
 * Normalised transmembrane-potential (TMP) template of one patch group for one activation:
 *   s(t) = amp · U(t) · Pl(t) · N(t) · L(t)   (0 = rest, 1 = plateau)
 * U: fraction of the face already activated (smoothstep across the activation window [t0, t1]);
 * Pl: slow plateau decline (fraction per 200 ms after the mean activation time tm);
 * N: optional phase-1 notch (spike-and-dome; Brugada/Ito) — depth, held to tm+d1, recovered by tm+d2;
 * L: phase-3 repolarisation, a Gompertz decay L = exp(−ln2·e^{x/τ_eff}), x = t − tm − apd (L = ½ at x = 0): slow at
 *    first, then regenerative and steep, ending abruptly — which gives the T wave its slow upstroke and faster
 *    downstroke. τ_eff folds the face's activation spread (window width W) and its intra-region APD spread S into the
 *    phase-3 slope: τ_eff² = τ² + (W² + S²)/(4π²).
 */
import { smooth01 } from './vec.ts';

export interface ApParams {
  t0: number;
  t1: number;
  apd: number;
  tau: number;
  spread: number;
  plat: number;
  amp: number;
  /** Diastolic (resting) level after injury (TQ shift); 0 = healthy. Added outside the AP. */
  rest: number;
  notchDepth: number;
  notchD1: number;
  notchD2: number;
}

export const apTauEff = (p: ApParams): number => {
  const W = p.t1 - p.t0;
  return Math.sqrt(p.tau * p.tau + (W * W + p.spread * p.spread) / (4 * Math.PI * Math.PI));
};

/** Time after which the AP is back at rest (L < 1e-6). */
export const apEnd = (p: ApParams): number => (p.t0 + p.t1) / 2 + p.apd + 3 * apTauEff(p);

/** Repolarisation end used for truth (latest face): L ≈ 3 % (x = 1.6 τ_eff). */
export const apRepEnd = (p: ApParams, k = 1.6): number => (p.t0 + p.t1) / 2 + p.apd + k * apTauEff(p);

export function apValue(p: ApParams, t: number, tauEff: number): number {
  if (t <= p.t0) return 0;
  const tm = (p.t0 + p.t1) / 2;
  const U = smooth01((t - p.t0) / (p.t1 - p.t0));
  const dt = t - tm;
  const Pl = dt > 0 ? Math.max(0.2, 1 - (p.plat * dt) / 200) : 1;
  let N = 1;
  if (p.notchDepth > 0 && dt > 0) {
    const on = smooth01((dt - 1) / 6);
    const off = 1 - smooth01((dt - p.notchD1) / (p.notchD2 - p.notchD1));
    N = 1 - p.notchDepth * on * off;
  }
  const x = (t - tm - p.apd) / tauEff;
  const L = x > 3 ? 0 : x < -12 ? 1 : Math.exp(-Math.LN2 * Math.exp(x));
  return p.amp * U * Pl * N * L;
}

/** Add one AP into a state buffer whose sample i is at time tOrigin + i·1000/fs (ms). */
export function addAp(buf: Float64Array, fs: number, tOrigin: number, p: ApParams, gain = 1): void {
  const tauEff = apTauEff(p);
  const end = apEnd(p);
  const dt = 1000 / fs;
  const i0 = Math.max(0, Math.ceil((p.t0 - tOrigin) / dt));
  const i1 = Math.min(buf.length - 1, Math.floor((end - tOrigin) / dt));
  for (let i = i0; i <= i1; i++) buf[i] += gain * apValue(p, tOrigin + i * dt, tauEff);
}

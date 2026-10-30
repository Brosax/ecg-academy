// ecg.ts — electrode potentials phi_e(t) = sum_n W_e,n Vm_n(t), with each node's normalised transmembrane potential
// written as a sum of shifted kernels so the sum becomes weighted event histograms convolved with a few kernels:
//   Vm(tau) = r + (A-r) U(tau) - d N(tau) - (a A/100) [ramp(tau) - ramp(tau-APD)] - (A - r - a A APD/100) S3(tau-APD)
// U: voxel-averaged upstroke (smooth step), N: phase-1 notch (spike-and-dome), ramp: linear plateau decline,
// S3: phase-3 repolarisation (logistic). The constant sum_n W r_n (all nodes at rest) is the reference (TQ) level.
import type { Activations } from './engine.ts';

// w3: width of the late (final) part of phase 3; sk: early-phase-3 width as a multiple of w3 (phase 3 starts slowly and
// ends steeply, which makes T waves rise more gradually than they fall)
export interface KClass { wu: number; w3: number; sk: number; tn1: number; tn: number; }
export const CLASSES: KClass[] = [
  { wu: 2.6, w3: 10, sk: 1.8, tn1: 2, tn: 25 },   // 0 ventricular
  { wu: 2.6, w3: 22, sk: 1, tn1: 2, tn: 20 },     // 1 atrial
  { wu: 3.2, w3: 7.5, sk: 1.1, tn1: 2, tn: 25 },  // 2 hyperkalaemic ventricular (steep, near-symmetric phase 3)
  { wu: 3.4, w3: 11, sk: 1.6, tn1: 2, tn: 25 },   // 3 ischaemic
  { wu: 2.6, w3: 9, sk: 1.6, tn1: 2.5, tn: 70 },  // 4 Brugada RVOT epicardium (deep notch, slow dome)
];

export interface Tpl { amp: Float32Array; rest: Float32Array; notch: Float32Array; slope: Float32Array; cls: Uint8Array; }

function kernels(dt: number, c: KClass) {
  const ku: number[] = []; const nu = Math.ceil(4 * c.wu / dt);
  for (let k = -nu; k <= nu; k++) { const x = k * dt / c.wu; const s = 1 / Math.cosh(x); ku.push(s * s); }
  const su = ku.reduce((a, b) => a + b, 0); for (let k = 0; k < ku.length; k++) ku[k] /= su;
  const k3: number[] = []; const n3 = Math.ceil(9 * c.w3 * Math.max(1, c.sk) / dt);
  for (let k = -n3; k <= n3; k++) { const x = k * dt / (k < 0 ? c.w3 * c.sk : c.w3); const s = 1 / (1 + Math.exp(-x)); k3.push(s * (1 - s)); }
  const s3 = k3.reduce((a, b) => a + b, 0); for (let k = 0; k < k3.length; k++) k3[k] /= s3;
  const kn: number[] = []; const nn = Math.ceil(7 * c.tn / dt);
  for (let k = 0; k <= nn; k++) { const t = k * dt; kn.push((1 - Math.exp(-t / c.tn1)) * Math.exp(-t / c.tn)); }
  return { ku: Float64Array.from(ku), nu, k3: Float64Array.from(k3), n3, kn: Float64Array.from(kn) };
}

// returns per-electrode potentials (mV) on the grid t0 + k*dt, k < T
export function synthesize(acts: Activations, nMyo: number, W: Float64Array[], tpl: Tpl, t0: number, T: number, dt: number, gainMv: number): Float64Array[] {
  const E = W.length, NC = CLASSES.length;
  const used = new Uint8Array(NC);
  for (let k = 0; k < acts.count; k++) { const i = acts.node[k]; if (i < nMyo) used[tpl.cls[i]] = 1; }
  // histograms: [e][kind][class][T]; kinds U,N,S per class; R1,R2 shared
  const mk = () => new Float64Array(T + 2);
  const hU: Float64Array[][] = [], hN: Float64Array[][] = [], hS: Float64Array[][] = [], hR1: Float64Array[] = [], hR2: Float64Array[] = [];
  for (let e = 0; e < E; e++) {
    hU.push([]); hN.push([]); hS.push([]);
    for (let c = 0; c < NC; c++) { hU[e].push(used[c] ? mk() : new Float64Array(0)); hN[e].push(used[c] ? mk() : new Float64Array(0)); hS[e].push(used[c] ? mk() : new Float64Array(0)); }
    hR1.push(mk()); hR2.push(mk());
  }
  const inv = 1 / dt;
  for (let k = 0; k < acts.count; k++) {
    const i = acts.node[k]; if (i >= nMyo) continue;
    const AT = acts.t[k], APD = acts.apd[k], RT = AT + APD;
    const c = tpl.cls[i];
    const A = tpl.amp[i], r = tpl.rest[i], d = tpl.notch[i], a = tpl.slope[i] * A / 100;
    const xa = (AT - t0) * inv, xr = (RT - t0) * inv;
    if (xr < 0 || xa >= T) { if (xa >= T) continue; }
    const ia = Math.floor(xa), fa = xa - ia, ir = Math.floor(xr), fr = xr - ir;
    const okA = ia >= 0 && ia < T, okR = ir >= 0 && ir < T;
    const jU = A - r, jS = A - r - a * APD;
    for (let e = 0; e < E; e++) {
      const w = W[e][i]; if (w === 0) continue;
      if (okA) {
        const u = hU[e][c]; u[ia] += w * jU * (1 - fa); u[ia + 1] += w * jU * fa;
        if (d !== 0) { const nn = hN[e][c]; nn[ia] += w * d * (1 - fa); nn[ia + 1] += w * d * fa; }
        if (a !== 0) { const r1 = hR1[e]; r1[ia] += w * a * (1 - fa); r1[ia + 1] += w * a * fa; }
      } else if (ia < 0) {
        // event before the window: fold into the first bin as a step already completed (with its ramp)
        hU[e][c][0] += w * jU;
        if (a !== 0) { hR1[e][0] += w * a; hU[e][c][0] -= w * a * (-xa) * dt; }
      }
      if (okR) {
        const s = hS[e][c]; s[ir] += w * jS * (1 - fr); s[ir + 1] += w * jS * fr;
        if (a !== 0) { const r2 = hR2[e]; r2[ir] += w * a * (1 - fr); r2[ir + 1] += w * a * fr; }
      } else if (ir < 0) {
        hS[e][c][0] += w * jS;
        if (a !== 0) { hR2[e][0] += w * a; hU[e][c][0] += w * a * (-xr) * dt; }
      }
    }
  }
  const out: Float64Array[] = [];
  const K = CLASSES.map((c) => kernels(dt, c));
  const acc = new Float64Array(T + 2);
  for (let e = 0; e < E; e++) {
    const phi = new Float64Array(T);
    // ramps
    let c1 = 0, c2 = 0;
    for (let k = 0; k < T; k++) { c1 += hR1[e][k] - hR2[e][k]; c2 += c1 * dt; phi[k] -= c2; }
    for (let c = 0; c < NC; c++) {
      if (!used[c]) continue;
      const kk = K[c];
      // upstroke: convolve with dU then integrate
      acc.fill(0);
      const u = hU[e][c];
      for (let k = 0; k < T; k++) { const v = u[k]; if (v === 0) continue; for (let q = 0; q < kk.ku.length; q++) { const t = k + q - kk.nu; if (t >= 0 && t < T) acc[t] += v * kk.ku[q]; else if (t < 0) acc[0] += v * kk.ku[q]; } }
      let s = 0; for (let k = 0; k < T; k++) { s += acc[k]; phi[k] += s; }
      // repolarisation
      acc.fill(0);
      const h3 = hS[e][c];
      for (let k = 0; k < T; k++) { const v = h3[k]; if (v === 0) continue; for (let q = 0; q < kk.k3.length; q++) { const t = k + q - kk.n3; if (t >= 0 && t < T) acc[t] += v * kk.k3[q]; else if (t < 0) acc[0] += v * kk.k3[q]; } }
      s = 0; for (let k = 0; k < T; k++) { s += acc[k]; phi[k] -= s; }
      // notch
      const hn = hN[e][c];
      for (let k = 0; k < T; k++) { const v = hn[k]; if (v === 0) continue; for (let q = 0; q < kk.kn.length && k + q < T; q++) phi[k + q] -= v * kk.kn[q]; }
    }
    for (let k = 0; k < T; k++) phi[k] *= gainMv;
    out.push(phi);
  }
  return out;
}

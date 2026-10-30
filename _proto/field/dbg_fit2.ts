// dbg_fit2.ts — multi-condition calibration (dev): coordinate search over the SHARED normal-heart parameters so that
// normal, complete RBBB and complete LBBB (which differ from normal only by a blocked bundle) all match textbook
// amplitudes/durations at once. usage: node dbg_fit2.ts [sweeps] ['<start json>']
import { generate } from './synth.ts';
process.env.FIELD_NOCACHE = '1';
type P = Record<string, unknown>;
interface Spec { path: string; x: number; step: number; lo: number; hi: number; }
const specs: Spec[] = [
  { path: 'geom.el', x: 40.6, step: 5, lo: 20, hi: 65 },
  { path: 'geom.az', x: 45, step: 5, lo: 25, hi: 70 },
  { path: 'geom.roll', x: -12, step: 8, lo: -50, hi: 40 },
  { path: 'purk.postTh0', x: -91, step: 15, lo: -180, hi: -60 },
  { path: 'purk.postTh1', x: -5.3, step: 15, lo: -60, hi: 60 },
  { path: 'vPurk', x: 1.546, step: 0.2, lo: 0.8, hi: 3 },
  { path: 'vPurkRV', x: 1.252, step: 0.2, lo: 0.8, hi: 3 },
  { path: 'vN', x: 0.32, step: 0.04, lo: 0.2, hi: 0.6 },
  { path: 'vT', x: 0.737, step: 0.06, lo: 0.4, hi: 0.9 },
  { path: 'fasc.rbb', x: 35, step: 2, lo: 26, hi: 50 },
  { path: 'fasc.lsf', x: 33, step: 2, lo: 26, hi: 46 },
  { path: 'fasc.laf', x: 31.5, step: 2, lo: 26, hi: 46 },
  { path: 'fasc.lpf', x: 34.3, step: 2, lo: 26, hi: 46 },
  { path: 'purk.lvFree', x: 0.98, step: 0.05, lo: 0.55, hi: 0.98 },
  { path: 'purk.lvPost', x: 0.856, step: 0.05, lo: 0.4, hi: 0.98 },
  { path: 'purk.lvSept', x: 0.931, step: 0.06, lo: 0.3, hi: 0.98 },
  { path: 'purk.rvFree', x: 0.758, step: 0.05, lo: 0.45, hi: 0.95 },
  { path: 'purk.rvSept', x: 0.95, step: 0.06, lo: 0.3, hi: 0.95 },
  { path: 'roots.lafTh', x: 115, step: 10, lo: 60, hi: 160 },
  { path: 'roots.lafAb', x: 0.649, step: 0.06, lo: 0.3, hi: 0.85 },
  { path: 'roots.lpfTh', x: -117.5, step: 10, lo: -170, hi: -60 },
  { path: 'roots.lpfAb', x: 0.38, step: 0.06, lo: 0.15, hi: 0.7 },
  { path: 'mbDelay', x: 4, step: 3, lo: 0, hi: 20 },
  { path: 'gain', x: 0.855, step: 0.06, lo: 0.6, hi: 2 },
];
if (process.argv[3]) { const st = JSON.parse(process.argv[3]); for (const s of specs) if (st[s.path] !== undefined) s.x = st[s.path]; }
function build(xs: number[]): P {
  const o: P = {};
  specs.forEach((s, k) => { const parts = s.path.split('.'); let t = o as Record<string, unknown>; for (let i = 0; i < parts.length - 1; i++) { t[parts[i]] ||= {}; t = t[parts[i]] as Record<string, unknown>; } t[parts[parts.length - 1]] = xs[k]; });
  const g = o.geom as Record<string, unknown>; g.apexBody = [68, -45, 50];
  return o;
}
type L = Record<string, Float32Array>;
function beat(id: string): { L: L; k0: number; k1: number; qrs: number } | null {
  const r = generate(id, { fs: 500, durationS: 1.7, seed: 1 });
  const b = r.truth.beats[0]; if (!b) return null;
  return { L: r.leads as unknown as L, k0: Math.round(b.qrsOnMs / 2), k1: Math.round(b.qrsOffMs / 2), qrs: b.qrsOffMs - b.qrsOnMs };
}
function qrs3(x: Float32Array, k0: number, k1: number) { const b0 = x[k0 - 2]; let mx = 0, kmx = k0; for (let k = k0; k <= k1; k++) if (x[k] - b0 > mx) { mx = x[k] - b0; kmx = k; } let q = 0, s = 0; for (let k = k0; k < kmx; k++) q = Math.min(q, x[k] - b0); for (let k = kmx; k <= k1; k++) s = Math.min(s, x[k] - b0); return [q * 10, mx * 10, s * 10]; }
const TN: Record<string, [number, number, number]> = { I: [-0.6, 7, -2], II: [-0.3, 10, -2], aVL: [-0.5, 4, -3], V1: [0, 2.5, -10], V2: [0, 5, -14], V3: [0, 9, -10], V4: [-0.3, 15, -7], V5: [-1, 14, -3], V6: [-1, 11, -1.5] };
function evalP(xs: number[]): { f: number; info: string } {
  process.env.FIELD_OVR = JSON.stringify(build(xs));
  let f = 0; const parts: string[] = [];
  const n = beat('normal'); if (!n) return { f: 1e9, info: 'no beat' };
  for (const nm of Object.keys(TN)) { const m = qrs3(n.L[nm], n.k0, n.k1), t = TN[nm]; for (let i = 0; i < 3; i++) { const tol = i === 1 ? 2 + 0.15 * Math.abs(t[1]) : 1 + 0.2 * Math.abs(t[i]); f += ((m[i] - t[i]) / tol) ** 2; } parts.push(`${nm} ${m.map((v) => v.toFixed(1)).join('/')}`); }
  f += ((n.qrs - 92) / 6) ** 2;
  // frontal QRS axis ~ +60
  let sI = 0, sF = 0; for (let k = n.k0; k <= n.k1; k++) { sI += n.L.I[k] - n.L.I[n.k0 - 2]; sF += n.L.aVF[k] - n.L.aVF[n.k0 - 2]; }
  const ax = Math.atan2(2 * sF / Math.sqrt(3), sI) * 180 / Math.PI; f += ((ax - 60) / 12) ** 2;
  parts.push(`ax ${ax.toFixed(0)} qrs ${n.qrs.toFixed(0)}`);
  // RBBB: V1 r small, R' > r (target 8), terminal S in I and V6, QRS ~135
  const r = beat('rbbb'); if (!r) return { f: 1e9, info: 'no rbbb' };
  const v1 = r.L.V1, b1 = v1[r.k0 - 2]; const k40 = r.k0 + 20;
  let rr = 0, sMin = 0, kS = r.k0, rp = 0;
  for (let k = r.k0; k <= k40; k++) rr = Math.max(rr, v1[k] - b1);
  for (let k = r.k0; k <= r.k0 + 35; k++) if (v1[k] - b1 < sMin) { sMin = v1[k] - b1; kS = k; }
  for (let k = kS; k <= r.k1; k++) rp = Math.max(rp, v1[k] - b1);
  const kt = r.k0 + Math.round(0.6 * (r.k1 - r.k0));
  let sI2 = 0, sV6 = 0; for (let k = kt; k <= r.k1; k++) { sI2 = Math.min(sI2, r.L.I[k] - r.L.I[r.k0 - 2]); sV6 = Math.min(sV6, r.L.V6[k] - r.L.V6[r.k0 - 2]); }
  f += 1.5 * (2 * ((rr * 10 - 3) / 1.2) ** 2 + ((rp * 10 - 8) / 2.5) ** 2 + ((sI2 * 10 + 3) / 1.2) ** 2 + ((sV6 * 10 + 3) / 1.5) ** 2 + ((r.qrs - 135) / 10) ** 2);
  parts.push(`RBBB r ${(rr * 10).toFixed(1)} R' ${(rp * 10).toFixed(1)} S_I ${(sI2 * 10).toFixed(1)} S_V6 ${(sV6 * 10).toFixed(1)} qrs ${r.qrs.toFixed(0)}`);
  // LBBB: QRS ~145, V1 QS/rS, no q in I/V6, broad R in I, V6
  const l = beat('lbbb'); if (!l) return { f: 1e9, info: 'no lbbb' };
  const m1 = qrs3(l.L.V1, l.k0, l.k1), m6 = qrs3(l.L.V6, l.k0, l.k1), mI = qrs3(l.L.I, l.k0, l.k1);
  f += 1.5 * (((l.qrs - 145) / 10) ** 2 + ((m1[1] - 0.8) / 1) ** 2 + ((m1[2] + 15) / 5) ** 2 + (m6[0] / 0.4) ** 2 + (mI[0] / 0.4) ** 2 + ((m6[1] - 13) / 3) ** 2 + ((mI[1] - 10) / 3) ** 2);
  parts.push(`LBBB V1 ${m1.map((v) => v.toFixed(1)).join('/')} V6 ${m6.map((v) => v.toFixed(1)).join('/')} I ${mI.map((v) => v.toFixed(1)).join('/')} qrs ${l.qrs.toFixed(0)}`);
  return { f, info: parts.join('  ') };
}
const xs = specs.map((s) => s.x);
let cur = evalP(xs);
console.log('start', cur.f.toFixed(2), cur.info);
const sweeps = Number(process.argv[2] || 3);
for (let sw = 0; sw < sweeps; sw++) {
  for (let k = 0; k < specs.length; k++) {
    const s = specs[k];
    for (const dir of [1, -1]) {
      const old = xs[k]; xs[k] = Math.min(s.hi, Math.max(s.lo, old + dir * s.step));
      if (xs[k] === old) continue;
      const r = evalP(xs);
      if (r.f < cur.f) { cur = r; console.log(`  ${s.path} -> ${xs[k].toFixed(3)}  f ${cur.f.toFixed(2)}`); break; }
      xs[k] = old;
    }
  }
  for (const s of specs) s.step *= 0.75;
  console.log(`sweep ${sw} f ${cur.f.toFixed(2)} ${cur.info}`);
  console.log('  params', JSON.stringify(Object.fromEntries(specs.map((s, k) => [s.path, +xs[k].toFixed(3)]))));
}

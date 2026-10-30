// dbg_fit.ts — coordinate search of physiological parameters so that the NORMAL heart matches textbook normal
// 12-lead amplitudes (dev calibration tool). usage: node dbg_fit.ts [sweeps] ['<start json>']
import { generate } from './synth.ts';
process.env.FIELD_NOCACHE = '1';
type P = Record<string, unknown>;
interface Spec { path: string; x: number; step: number; lo: number; hi: number; }
const specs: Spec[] = [
  { path: 'geom.el', x: 35, step: 8, lo: 20, hi: 65 },
  { path: 'geom.az', x: 45, step: 8, lo: 25, hi: 70 },
  { path: 'geom.roll', x: 0, step: 12, lo: -50, hi: 40 },
  { path: 'purk.postTh0', x: -120, step: 20, lo: -180, hi: -60 },
  { path: 'purk.postTh1', x: -10, step: 20, lo: -60, hi: 60 },
  { path: 'vPurk', x: 1.4, step: 0.25, lo: 0.8, hi: 3 },
  { path: 'vPurkRV', x: 1.4, step: 0.25, lo: 0.8, hi: 3 },
  { path: 'vN', x: 0.32, step: 0.05, lo: 0.2, hi: 0.6 },
  { path: 'vT', x: 0.62, step: 0.08, lo: 0.4, hi: 0.9 },
  { path: 'fasc.rbb', x: 35, step: 2, lo: 26, hi: 46 },
  { path: 'fasc.lsf', x: 33, step: 2, lo: 26, hi: 46 },
  { path: 'fasc.laf', x: 33, step: 2, lo: 26, hi: 46 },
  { path: 'fasc.lpf', x: 33, step: 2, lo: 26, hi: 46 },
  { path: 'purk.lvFree', x: 0.9, step: 0.05, lo: 0.55, hi: 0.98 },
  { path: 'purk.lvPost', x: 0.8, step: 0.06, lo: 0.4, hi: 0.98 },
  { path: 'purk.lvSept', x: 0.8, step: 0.06, lo: 0.45, hi: 0.98 },
  { path: 'purk.rvFree', x: 0.85, step: 0.06, lo: 0.45, hi: 0.95 },
  { path: 'purk.rvSept', x: 0.8, step: 0.06, lo: 0.4, hi: 0.95 },
  { path: 'roots.lafTh', x: 115, step: 12, lo: 60, hi: 160 },
  { path: 'roots.lafAb', x: 0.62, step: 0.08, lo: 0.3, hi: 0.85 },
  { path: 'roots.lpfTh', x: -120, step: 12, lo: -170, hi: -60 },
  { path: 'roots.lpfAb', x: 0.38, step: 0.08, lo: 0.15, hi: 0.7 },
  { path: 'gain', x: 1, step: 0.1, lo: 0.6, hi: 2 },
];
const fixed: P = { purk: { lvFree: 0.9, lvPost: 0.8, postTh0: -120, postTh1: -10, lvSept: 0.8, rvFree: 0.85, rvSept: 0.8 }, geom: { apexBody: [68, -45, 50] }, fasc: { lsf: 33, laf: 33, lpf: 33, rbb: 35 }, roots: { lafTh: 115, lafAb: 0.62, lpfTh: -120, lpfAb: 0.38 } };
if (process.argv[3]) { const st = JSON.parse(process.argv[3]); for (const s of specs) if (st[s.path] !== undefined) s.x = st[s.path]; }
// targets (mm at 10 mm/mV): [q, R, S] (q and S negative); tolerance per value
const T: Record<string, [number, number, number]> = {
  I: [-0.7, 7, -2], II: [-0.3, 11, -2], V1: [0, 2.5, -10], V2: [0, 5, -14], V3: [0, 9, -10], V4: [-0.3, 15, -7], V5: [-1, 14, -3], V6: [-1, 11, -1.5],
};
function build(xs: number[]): P {
  const o: P = JSON.parse(JSON.stringify(fixed));
  specs.forEach((s, k) => { const parts = s.path.split('.'); let t = o as Record<string, unknown>; for (let i = 0; i < parts.length - 1; i++) { t[parts[i]] ||= {}; t = t[parts[i]] as Record<string, unknown>; } t[parts[parts.length - 1]] = xs[k]; });
  return o;
}
function evalP(xs: number[]): { f: number; info: string } {
  process.env.FIELD_OVR = JSON.stringify(build(xs));
  const r = generate('normal', { fs: 500, durationS: 1.7, seed: 1 });
  const b = r.truth.beats[0]; if (!b) return { f: 1e9, info: 'no beat' };
  const k0 = Math.round(b.qrsOnMs / 2), k1 = Math.round(b.qrsOffMs / 2);
  let f = 0; const parts: string[] = [];
  for (const nm of Object.keys(T)) {
    const x = r.leads[nm as keyof typeof r.leads]; const b0 = x[k0 - 2];
    let mx = 0, kmx = k0; for (let k = k0; k <= k1; k++) if (x[k] - b0 > mx) { mx = x[k] - b0; kmx = k; }
    let q = 0, s = 0; for (let k = k0; k < kmx; k++) q = Math.min(q, x[k] - b0); for (let k = kmx; k <= k1; k++) s = Math.min(s, x[k] - b0);
    const m = [q * 10, mx * 10, s * 10]; const t = T[nm];
    for (let i = 0; i < 3; i++) { const tol = i === 1 ? 2 + 0.15 * Math.abs(t[1]) : 1 + 0.2 * Math.abs(t[i]); f += ((m[i] - t[i]) / tol) ** 2; }
    parts.push(`${nm} ${m.map((v) => v.toFixed(1)).join('/')}`);
  }
  const qrs = b.qrsOffMs - b.qrsOnMs; f += ((qrs - 92) / 6) ** 2;
  // Kors VCG of the QRS: spatial max magnitude / elevation / azimuth (X left, Y inferior, Z posterior)
  const L = r.leads; const bs = (nm: keyof typeof L) => L[nm][k0 - 2];
  let bm = 0, bv = [0, 0, 0];
  for (let k = k0; k <= k1; k++) { const g2 = (nm: keyof typeof L) => L[nm][k] - bs(nm); const I = g2('I'), II = g2('II'), V1 = g2('V1'), V2 = g2('V2'), V3 = g2('V3'), V4 = g2('V4'), V5 = g2('V5'), V6 = g2('V6');
    const v = [0.38 * I - 0.07 * II - 0.13 * V1 + 0.05 * V2 - 0.01 * V3 + 0.14 * V4 + 0.06 * V5 + 0.54 * V6, -0.07 * I + 0.93 * II + 0.06 * V1 - 0.02 * V2 - 0.05 * V3 + 0.06 * V4 - 0.17 * V5 + 0.13 * V6, 0.11 * I - 0.23 * II - 0.43 * V1 - 0.06 * V2 - 0.14 * V3 - 0.20 * V4 - 0.11 * V5 + 0.31 * V6];
    const mm = Math.hypot(v[0], v[1], v[2]); if (mm > bm) { bm = mm; bv = v; } }
  const el = Math.atan2(bv[1], Math.hypot(bv[0], bv[2])) * 180 / Math.PI, az = Math.atan2(-bv[2], bv[0]) * 180 / Math.PI;
  f += ((el - 50) / 12) ** 2 + ((az + 20) / 20) ** 2 + ((bm - 1.8) / 0.4) ** 2;
  parts.push(`VCG ${bm.toFixed(2)} el ${el.toFixed(0)} az ${az.toFixed(0)}`);
  return { f, info: `QRS ${qrs.toFixed(0)} | ` + parts.join('  ') };
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
  for (const s of specs) s.step *= 0.7;
  console.log(`sweep ${sw} f ${cur.f.toFixed(2)} ${cur.info}`);
  console.log('  params', JSON.stringify(Object.fromEntries(specs.map((s, k) => [s.path, +xs[k].toFixed(3)]))));
}

/**
 * Dev calibration of the NORMAL heart against a textbook normal QRS loop (run once; results are baked into
 * conduction.ts / model.ts with a helper). The target is a smooth reference heart-vector loop (app frame, mV) projected
 * through the Dower lead vectors; the model's 12 leads (its own lead field, proximity included) are fitted to it by
 * searching physiological activation parameters only (Purkinje exit times/widths within Durrer-type bounds, transmural
 * speed and dispersion, regional wall thickness, global gain). Every candidate is one source through one lead system.
 *
 * Usage: node tune2.ts [iterations] [seed] [restartFromBest=0|1]
 */
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADSYS } from '../model.ts';
import { NORMAL_PMJ, NORMAL_VCOND } from '../conduction.ts';
import { LEADS, dowerElectrodes } from '../leadfield.ts';
import type { V3 } from '../vec.ts';
import { rng, gauss, dot } from '../vec.ts';

// reference loop keyframes: t (ms from QRS onset), x left, y superior, z anterior (mV)
const KF: [number, number, number, number][] = [
  [0, 0, 0, 0],
  [6, -0.05, 0.0, 0.07],
  [12, -0.12, -0.04, 0.22],
  [18, 0.05, -0.22, 0.38],
  [24, 0.45, -0.55, 0.33],
  [30, 0.95, -0.85, 0.05],
  [36, 1.35, -1.0, -0.35],
  [42, 1.4, -0.9, -0.7],
  [48, 1.1, -0.6, -0.9],
  [54, 0.7, -0.25, -0.85],
  [60, 0.35, 0.05, -0.65],
  [66, 0.12, 0.18, -0.42],
  [74, 0.0, 0.12, -0.18],
  [82, -0.02, 0.04, -0.05],
  [92, 0, 0, 0],
];
function loopAt(t: number): V3 {
  if (t <= KF[0][0] || t >= KF[KF.length - 1][0]) return [0, 0, 0];
  let i = 0;
  while (KF[i + 1][0] < t) i++;
  // Catmull-Rom between i and i+1
  const P = (k: number) => KF[Math.max(0, Math.min(KF.length - 1, k))];
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
  const u = (t - p1[0]) / (p2[0] - p1[0]);
  const out: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const a = p0[c + 1], b = p1[c + 1], d = p2[c + 1], e = p3[c + 1];
    out[c] = 0.5 * (2 * b + (-a + d) * u + (2 * a - 5 * b + 4 * d - e) * u * u + (-a + 3 * b - 3 * d + e) * u * u * u);
  }
  return out;
}
const D = dowerElectrodes();
const leadVec: Record<string, V3> = {};
{
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const avg = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const wct: V3 = [(D.RA[0] + D.LA[0] + D.LL[0]) / 3, (D.RA[1] + D.LA[1] + D.LL[1]) / 3, (D.RA[2] + D.LA[2] + D.LL[2]) / 3];
  leadVec.I = sub(D.LA, D.RA); leadVec.II = sub(D.LL, D.RA); leadVec.III = sub(D.LL, D.LA);
  leadVec.aVR = sub(D.RA, avg(D.LA, D.LL)); leadVec.aVL = sub(D.LA, avg(D.RA, D.LL)); leadVec.aVF = sub(D.LL, avg(D.RA, D.LA));
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) leadVec[v] = sub(D[v], wct);
}
export const targetLead = (l: string, t: number): number => dot(leadVec[l], loopAt(t));

interface P { name: string; get(): number; set(v: number): void; lo: number; hi: number; step: number }
const params: P[] = [];
const TB: Record<string, [number, number]> = {
  'm_antsep:IN': [0, 3], 'm_infsep:IN': [0, 6], 'm_ant:IN': [0, 6], 'm_inf:IN': [0, 8], 'a_sep:IN': [0, 10],
  'b_antsep:OUT': [10, 40], 'b_infsep:OUT': [10, 40],
};
for (const p of NORMAL_PMJ) {
  const isRV = p.branch === 'RBB';
  const [lo, hi] = TB[p.face] ?? (isRV ? [5, 28] : [2, 28]);
  params.push({ name: `t:${p.face}`, get: () => p.t, set: (v) => (p.t = v), lo, hi, step: 2 });
  params.push({ name: `h:${p.face}`, get: () => p.h ?? 8, set: (v) => (p.h = v), lo: 5, hi: 16, step: 1 });
}
for (const k of Object.keys(NORMAL_VCOND.wall)) {
  const base = k.startsWith('rv') ? 0.35 : k === 'apex' ? 0.6 : 1.0;
  params.push({ name: `wall:${k}`, get: () => NORMAL_VCOND.wall[k], set: (v) => (NORMAL_VCOND.wall[k] = v), lo: base * 0.7, hi: base * 1.5, step: 0.05 });
}
params.push({ name: 'vT', get: () => NORMAL_VCOND.vT, set: (v) => (NORMAL_VCOND.vT = v), lo: 0.03, hi: 0.06, step: 0.003 });
params.push({ name: 'tmDisp', get: () => NORMAL_VCOND.tmDisp, set: (v) => (NORMAL_VCOND.tmDisp = v), lo: 0.1, hi: 0.6, step: 0.04 });
params.push({ name: 'vEndo', get: () => NORMAL_VCOND.vEndo, set: (v) => (NORMAL_VCOND.vEndo = v), lo: 0.05, hi: 0.1, step: 0.005 });
params.push({ name: 'vEpi', get: () => NORMAL_VCOND.vEpi, set: (v) => (NORMAL_VCOND.vEpi = v), lo: 0.04, hi: 0.09, step: 0.005 });
params.push({ name: 'gainV', get: () => LEADSYS.gainV, set: (v) => (LEADSYS.gainV = v), lo: 0.03, hi: 0.3, step: 0.005 });

export function cost(verbose = false): number {
  const sim = simulate(CONDITIONS.normal, { fs: 500, durationS: 1.6, seed: 1 });
  const b = sim.truth.beats.find((x) => x.qrsOnMs > 200 && x.tOffMs < 1600);
  if (!b) return 1e9;
  const a0 = b.qrsOnMs;
  let c = 0, n = 0;
  const rows: string[] = [];
  for (const l of LEADS) {
    const x = sim.leads[l];
    const i0 = Math.round(a0 / 2);
    let base = 0;
    for (let i = i0 - 8; i < i0; i++) base += x[i];
    base /= 8;
    let e = 0;
    let row = `${l.padEnd(4)}`;
    for (let t = -6; t <= 110; t += 2) {
      const i = Math.round((a0 + t) / 2);
      const m = (x[i] - base) * 10, g = targetLead(l, t) * 10;
      e += (m - g) ** 2;
      n++;
      if (verbose && t % 6 === 0 && t >= 0 && t <= 90) row += `${m.toFixed(0).padStart(4)}/${g.toFixed(0).padEnd(3)}`;
    }
    c += e;
    rows.push(row);
  }
  c /= n;
  c += ((b.qrsOffMs - b.qrsOnMs - 92) / 8) ** 2;
  if (verbose) console.log('t(ms):  ' + Array.from({ length: 16 }, (_, k) => String(k * 6).padStart(8)).join('') + '\n' + rows.join('\n') + `\nQRS ${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} cost ${c.toFixed(3)}`);
  return c;
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!)) {
  const iters = Number(process.argv[2] ?? 3000);
  const r = rng(Number(process.argv[3] ?? 7));
  let best = cost();
  let x = params.map((p) => p.get());
  let sigma = 1;
  console.log(`start cost ${best.toFixed(3)}`);
  for (let it = 0; it < iters; it++) {
    const y = x.slice();
    const nMut = 1 + Math.floor(r() * 4);
    for (let k = 0; k < nMut; k++) {
      const j = Math.floor(r() * params.length);
      const p = params[j];
      y[j] = Math.min(p.hi, Math.max(p.lo, y[j] + gauss(r) * p.step * sigma));
    }
    params.forEach((p, j) => p.set(y[j]));
    const c = cost();
    if (c < best) { best = c; x = y; sigma = Math.min(3, sigma * 1.1); }
    else sigma = Math.max(0.3, sigma * 0.997);
    if (it % 500 === 0) console.log(`it ${it} best ${best.toFixed(3)} sigma ${sigma.toFixed(2)}`);
  }
  params.forEach((p, j) => p.set(x[j]));
  cost(true);
  const out: Record<string, number> = {};
  params.forEach((p, j) => (out[p.name] = Math.round(x[j] * 1000) / 1000));
  console.log(JSON.stringify(out));
}

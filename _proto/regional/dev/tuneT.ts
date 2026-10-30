/**
 * Dev calibration of the NORMAL repolarisation map (APD gradients, phase-3 shape) against textbook T-wave amplitudes and
 * QT. Output JSON is baked into model.ts by hand. Usage: node tuneT.ts [iterations] [seed]
 */
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { NORMAL_VREP } from '../model.ts';
import { LEADS } from '../leadfield.ts';
import { rng, gauss } from '../vec.ts';

// T peak (mm at 10 mm/mV): [target, tolerance]
const TT: Record<string, [number, number]> = {
  I: [2.5, 0.8], II: [3.5, 0.8], III: [1.0, 1.2], aVR: [-3.0, 0.8], aVL: [0.8, 1.0], aVF: [2.2, 1.0],
  V1: [0.3, 1.0], V2: [4.5, 1.2], V3: [5.0, 1.2], V4: [4.5, 1.0], V5: [3.5, 0.8], V6: [2.5, 0.8],
};
const QT = 385;

interface P { name: string; get(): number; set(v: number): void; lo: number; hi: number; step: number }
const v = NORMAL_VREP;
const params: P[] = [
  { name: 'gAB', get: () => v.gAB, set: (x) => (v.gAB = x), lo: 20, hi: 90, step: 4 },
  { name: 'dTM.LV', get: () => v.dTM.LV, set: (x) => (v.dTM.LV = x), lo: 0, hi: 40, step: 3 },
  { name: 'dTM.RV', get: () => v.dTM.RV, set: (x) => (v.dTM.RV = x), lo: 0, hi: 25, step: 3 },
  { name: 'dTM.SEPT', get: () => v.dTM.SEPT, set: (x) => (v.dTM.SEPT = x), lo: -8, hi: 15, step: 3 },
  { name: 'dRV', get: () => v.dRV, set: (x) => (v.dRV = x), lo: -30, hi: 30, step: 3 },
  { name: 'dGroup.ANT', get: () => v.dGroup.ANT, set: (x) => (v.dGroup.ANT = x), lo: -30, hi: 30, step: 3 },
  { name: 'dGroup.LAT', get: () => v.dGroup.LAT, set: (x) => (v.dGroup.LAT = x), lo: -30, hi: 30, step: 3 },
  { name: 'dGroup.INF', get: () => v.dGroup.INF, set: (x) => (v.dGroup.INF = x), lo: -30, hi: 30, step: 3 },
  { name: 'dGroup.APEX', get: () => v.dGroup.APEX, set: (x) => (v.dGroup.APEX = x), lo: -25, hi: 0, step: 3 },
  { name: 'tau', get: () => v.tau, set: (x) => (v.tau = x), lo: 8, hi: 35, step: 2 },
  { name: 'spread', get: () => v.spread, set: (x) => (v.spread = x), lo: 5, hi: 45, step: 3 },
  { name: 'plat', get: () => v.plat, set: (x) => (v.plat = x), lo: 0, hi: 0.35, step: 0.03 },
  { name: 'apd0', get: () => v.apd0, set: (x) => (v.apd0 = x), lo: 200, hi: 300, step: 4 },
];

function cost(verbose = false): number {
  const sim = simulate(CONDITIONS.normal, { fs: 500, durationS: 1.8, seed: 1 });
  const b = sim.truth.beats.find((x) => x.qrsOnMs > 200 && x.tOffMs < 1800);
  if (!b) return 1e9;
  const I = (t: number) => Math.round(t / 2);
  let c = 0;
  const rows: string[] = [];
  for (const l of LEADS) {
    const x = sim.leads[l];
    let base = 0;
    for (let i = I(b.qrsOnMs) - 8; i < I(b.qrsOnMs); i++) base += x[i];
    base /= 8;
    let t = 0;
    for (let i = I(b.qrsOffMs + 80); i < I(b.tOffMs); i++) if (Math.abs(x[i] - base) > Math.abs(t)) t = x[i] - base;
    const st = (x[I(b.qrsOffMs + 40)] - base) * 10;
    t *= 10;
    c += ((t - TT[l][0]) / TT[l][1]) ** 2 + (st / 0.5) ** 2 * 0.3;
    rows.push(`${l} ${t.toFixed(1)}/${TT[l][0]} st40 ${st.toFixed(1)}`);
  }
  c += ((sim.truth.qtMs - QT) / 10) ** 2;
  if (verbose) console.log(rows.join(' | ') + `\nQT ${sim.truth.qtMs} cost ${c.toFixed(2)}`);
  return c;
}

const iters = Number(process.argv[2] ?? 1500);
const r = rng(Number(process.argv[3] ?? 5));
let best = cost(true);
let x = params.map((p) => p.get());
let sigma = 1;
for (let it = 0; it < iters; it++) {
  const y = x.slice();
  const nMut = 1 + Math.floor(r() * 3);
  for (let k = 0; k < nMut; k++) {
    const j = Math.floor(r() * params.length);
    y[j] = Math.min(params[j].hi, Math.max(params[j].lo, y[j] + gauss(r) * params[j].step * sigma));
  }
  params.forEach((p, j) => p.set(y[j]));
  const c = cost();
  if (c < best) { best = c; x = y; sigma = Math.min(3, sigma * 1.1); } else sigma = Math.max(0.3, sigma * 0.996);
  if (it % 300 === 0) console.log(`it ${it} best ${best.toFixed(2)}`);
}
params.forEach((p, j) => p.set(x[j]));
cost(true);
const out: Record<string, number> = {};
params.forEach((p, j) => (out[p.name] = Math.round(x[j] * 1000) / 1000));
console.log(JSON.stringify(out));

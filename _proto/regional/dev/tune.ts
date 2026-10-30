/**
 * Dev calibration of the NORMAL heart (run once; results are copied by hand into conduction.ts / model.ts).
 * Searches physiological activation parameters (Purkinje exit times/widths within Durrer-type bounds, transmural speed,
 * regional wall thickness, global gain) so that the normal beat matches textbook 12-lead amplitudes. Every candidate is
 * still one source through one lead system; only the normal heart's parameters are being calibrated.
 *
 * Usage: node tune.ts [iterations] [seed]   → prints the best parameter set as JSON
 */
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADSYS } from '../model.ts';
import { NORMAL_PMJ, NORMAL_VCOND } from '../conduction.ts';
import { LEADS } from '../leadfield.ts';
import { rng, gauss } from '../vec.ts';

type Tgt = { q?: [number, number]; r?: [number, number]; s?: [number, number]; neg?: [number, number] };
// mm at 10 mm/mV: [target, tolerance]
const TGT: Record<string, Tgt> = {
  I: { q: [-0.8, 0.4], r: [7, 2], s: [-1, 1] },
  II: { q: [-0.3, 0.6], r: [12, 2.5], s: [-1, 1] },
  III: { r: [6, 3], s: [-2, 2] },
  aVR: { r: [0.5, 1], neg: [-7, 2] },
  aVL: { q: [-0.8, 0.5], r: [3.5, 2], s: [-2, 2] },
  aVF: { r: [9, 2.5], s: [-1.5, 1.5] },
  V1: { r: [2, 1], s: [-10, 3] },
  V2: { r: [4.5, 1.5], s: [-15, 4] },
  V3: { r: [8, 2.5], s: [-9, 3] },
  V4: { r: [15, 3], s: [-5, 2.5] },
  V5: { q: [-1, 0.5], r: [15, 3], s: [-2, 1.5] },
  V6: { q: [-1.2, 0.5], r: [11, 3], s: [-1, 1] },
};

interface P { name: string; get(): number; set(v: number): void; lo: number; hi: number; step: number }
const params: P[] = [];
// physiological bounds on Purkinje exit times (ms): Durrer's three early LV sites 0–5, rest of the LV ≤ 25, RV 5–25
const TB: Record<string, [number, number]> = {
  'm_antsep:IN': [0, 3], 'm_infsep:IN': [0, 6], 'm_ant:IN': [0, 6], 'm_inf:IN': [0, 8], 'a_sep:IN': [0, 10],
};
for (const p of NORMAL_PMJ) {
  const isRV = p.branch === 'RBB';
  const [lo, hi] = TB[p.face] ?? (isRV ? [5, 25] : [2, 25]);
  params.push({ name: `t:${p.face}`, get: () => p.t, set: (v) => (p.t = v), lo, hi, step: 2 });
  params.push({ name: `h:${p.face}`, get: () => p.h ?? 8, set: (v) => (p.h = v), lo: 5, hi: 14, step: 1 });
}
for (const k of Object.keys(NORMAL_VCOND.wall)) {
  const base = NORMAL_VCOND.wall[k];
  params.push({ name: `wall:${k}`, get: () => NORMAL_VCOND.wall[k], set: (v) => (NORMAL_VCOND.wall[k] = v), lo: base * 0.7, hi: base * 1.35, step: 0.05 });
}
params.push({ name: 'vT', get: () => NORMAL_VCOND.vT, set: (v) => (NORMAL_VCOND.vT = v), lo: 0.03, hi: 0.06, step: 0.003 });
params.push({ name: 'gainV', get: () => LEADSYS.gainV, set: (v) => (LEADSYS.gainV = v), lo: 0.03, hi: 0.3, step: 0.01 });

function measure(x: Float32Array, a: number, z: number): { q: number; r: number; s: number; ext: number } {
  let base = 0;
  for (let i = a - 10; i < a; i++) base += x[i];
  base /= 10;
  let r = 0, ri = a;
  for (let i = a; i <= z; i++) if (x[i] - base > r) { r = x[i] - base; ri = i; }
  let q = 0, s = 0;
  for (let i = a; i < ri; i++) q = Math.min(q, x[i] - base);
  for (let i = ri; i <= z; i++) s = Math.min(s, x[i] - base);
  // significant extrema count (notching)
  let ext = 0, dir = 0, last = x[a];
  for (let i = a + 1; i <= z; i++) {
    const d = x[i] - last;
    if (Math.abs(d) < 0.03) continue;
    const nd = Math.sign(d);
    if (dir !== 0 && nd !== dir) ext++;
    dir = nd;
    last = x[i];
  }
  return { q: q * 10, r: r * 10, s: s * 10, ext };
}

function cost(verbose = false): number {
  const sim = simulate(CONDITIONS.normal, { fs: 500, durationS: 1.6, seed: 1 });
  const b = sim.truth.beats.find((x) => x.qrsOnMs > 200 && x.tOffMs < 1600)!;
  if (!b) return 1e9;
  const a = Math.round(b.qrsOnMs / 2), z = Math.round(b.qrsOffMs / 2);
  let c = 0;
  const rows: string[] = [];
  for (const l of LEADS) {
    const m = measure(sim.leads[l], a, z);
    const t = TGT[l];
    const e = (v: number, tt?: [number, number]) => (tt ? ((v - tt[0]) / tt[1]) ** 2 : 0);
    c += e(m.q, t.q) + e(m.r, t.r) + e(m.s, t.s) + e(Math.min(m.q, m.s), t.neg);
    c += Math.max(0, m.ext - 3) * 2;
    rows.push(`${l.padEnd(4)} q ${m.q.toFixed(1).padStart(5)} r ${m.r.toFixed(1).padStart(5)} s ${m.s.toFixed(1).padStart(6)} ext ${m.ext}`);
  }
  c += ((b.qrsOffMs - b.qrsOnMs - 92) / 6) ** 2;
  if (verbose) console.log(rows.join('\n') + `\nQRS ${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} cost ${c.toFixed(2)}`);
  return c;
}

const iters = Number(process.argv[2] ?? 2000);
const r = rng(Number(process.argv[3] ?? 7));
let best = cost();
let x = params.map((p) => p.get());
let sigma = 1;
console.log(`start cost ${best.toFixed(2)}`);
for (let it = 0; it < iters; it++) {
  // mutate a random subset
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
  else { sigma = Math.max(0.3, sigma * 0.995); }
  if (it % 200 === 0) console.log(`it ${it} best ${best.toFixed(2)} sigma ${sigma.toFixed(2)}`);
}
params.forEach((p, j) => p.set(x[j]));
cost(true);
const out: Record<string, number> = {};
params.forEach((p, j) => (out[p.name] = Math.round(x[j] * 1000) / 1000));
console.log(JSON.stringify(out));

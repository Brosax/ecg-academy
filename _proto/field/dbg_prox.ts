// dbg_prox.ts — compare full lead-field QRS amplitudes with a single-dipole (centroid lead vector) approximation (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM } from './geom.ts';
import { defaultTorso, leadSystem, leadVectorsAt, ELECTRODES, TAU } from './torso.ts';
import { dipoleWeights } from './dbg_util.ts';
const r = generate('normal', { fs: 500, durationS: 1.7, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const b = r.truth.beats[0];
const ls = leadSystem(defaultTorso());
let c = [0, 0, 0], nv = 0; for (let i = 0; i < g.n; i++) if (g.dom[i] === DOM.V) { for (let k = 0; k < 3; k++) c[k] += g.pos[3 * i + k]; nv++; }
c = c.map((v) => v / nv);
const LV = leadVectorsAt(ls, c as [number, number, number]);
const Wd = dipoleWeights(g);
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300) act[i] = a.t[k] - b.qrsOnMs; }
const E = (nm: string) => ELECTRODES.indexOf(nm as typeof ELECTRODES[number]);
const leadVec = (nm: string) => { const wct = [0, 1, 2].map((k) => (LV[E('RA')][k] + LV[E('LA')][k] + LV[E('LL')][k]) / 3); if (nm === 'I') return [0, 1, 2].map((k) => LV[E('LA')][k] - LV[E('RA')][k]); if (nm === 'II') return [0, 1, 2].map((k) => LV[E('LL')][k] - LV[E('RA')][k]); return [0, 1, 2].map((k) => LV[E(nm)][k] - wct[k]); };
const gain = 1000 * m.p.gain * TAU * g.h / 1000; // mV per (mm) of Wd ... W = TAU*h(m)*sum dZ; dZ ~ gradZ(V/A/m) * d(mm)/1000
const out: string[] = [];
for (const nm of ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']) {
  const lv = leadVec(nm); let mx = 0, mn = 0;
  for (let t = 0; t <= 120; t += 1) { const H = [0, 0, 0]; for (let i = 0; i < g.n; i++) if (act[i] <= t) for (let k = 0; k < 3; k++) H[k] += Wd[k][i]; const v = -(H[0] * lv[0] + H[1] * lv[1] + H[2] * lv[2]) / 1000 * gain; mx = Math.max(mx, v); mn = Math.min(mn, v); }
  const x = r.leads[nm as keyof typeof r.leads]; const k0 = Math.round(b.qrsOnMs / 2), k1 = Math.round(b.qrsOffMs / 2); let fx = 0, fn = 0; for (let k = k0; k <= k1; k++) { fx = Math.max(fx, x[k] - x[k0 - 2]); fn = Math.min(fn, x[k] - x[k0 - 2]); }
  out.push(`${nm}: full ${(fx * 10).toFixed(1)}/${(fn * 10).toFixed(1)}  dipole ${(mx * 10).toFixed(1)}/${(mn * 10).toFixed(1)}`);
}
console.log(out.join('\n'));

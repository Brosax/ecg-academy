// dbg_vcg.ts — ventricular depolarisation dipole (body frame, +x left, +y up, +z anterior) every 5 ms through one QRS,
// next to the real lead values I, aVF, V1, V6 (mm at 10 mm/mV) at the same instants (dev)
// usage: node dbg_vcg.ts <id> ['<FIELD_OVR json>'] ['<FIELD_COVR json>']
import { generate, lastInternals } from './synth.ts';
import { DOM } from './geom.ts';
import { dipoleWeights } from './dbg_util.ts';
const id = process.argv[2] || 'normal';
if (process.argv[3]) process.env.FIELD_OVR = process.argv[3];
if (process.argv[4]) process.env.FIELD_COVR = process.argv[4];
const r = generate(id, { fs: 1000, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!;
const b = r.truth.beats[1] ?? r.truth.beats[0];
const Wd = dipoleWeights(g);
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300 && act[i] > 1e8) act[i] = a.t[k]; }
const L = r.leads; const K = (t: number) => Math.round(t);
const base = (x: Float32Array) => x[K(b.qrsOnMs) - 4];
console.log(`${id}: QRS ${b.qrsOnMs.toFixed(0)}..${b.qrsOffMs.toFixed(0)} (${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} ms)`);
console.log('   t     Hx     Hy     Hz   |H|  az(deg, 0=left,+ant) el     I   aVF    V1    V6');
let sum = [0, 0, 0];
for (let t = b.qrsOnMs; t <= b.qrsOffMs + 10; t += 5) {
  const H = [0, 0, 0];
  for (let i = 0; i < g.n; i++) if (act[i] <= t) for (let c = 0; c < 3; c++) H[c] += Wd[c][i];
  for (let c = 0; c < 3; c++) sum[c] += H[c];
  const mag = Math.hypot(H[0], H[1], H[2]);
  const az = Math.atan2(H[2], H[0]) * 180 / Math.PI, el = Math.atan2(H[1], Math.hypot(H[0], H[2])) * 180 / Math.PI;
  const v = (x: Float32Array) => ((x[K(t)] - base(x)) * 10).toFixed(1).padStart(6);
  console.log(`${(t - b.qrsOnMs).toFixed(0).padStart(4)} ${H.map((x) => (x / 1000).toFixed(1).padStart(6)).join(' ')} ${(mag / 1000).toFixed(1).padStart(5)} ${(az).toFixed(0).padStart(5)} ${(el).toFixed(0).padStart(5)}  ${v(L.I)}${v(L.aVF)}${v(L.V1)}${v(L.V6)}`);
}
const az = Math.atan2(sum[2], sum[0]) * 180 / Math.PI;
console.log('mean vector az', az.toFixed(0), '(sign conventions as above)');

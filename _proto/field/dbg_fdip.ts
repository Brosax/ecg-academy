// dbg_fdip.ts — atrial depolarisation dipole (far-field, body frame x left, y up, z anterior) through one flutter
// cycle or one sinus P wave: total H(t) of the depolarised atrial tissue, split RA / LA (dev)
// usage: node dbg_fdip.ts [aflutter|normal] ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { generate, lastInternals } from './synth.ts';
import { CH, DOM } from './geom.ts';
import { dipoleWeights } from './dbg_util.ts';
const id = process.argv[2] || 'aflutter';
if (process.argv[3]) process.env.FIELD_OVR = process.argv[3];
if (process.argv[4]) process.env.FIELD_COVR = process.argv[4];
generate(id, { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const a = m.acts!; const g = m.g;
let t0: number;
if (id === 'aflutter') { let k = a.first[m.sites.FLUT]; while (k >= 0 && a.t[k] < 1000) k = a.next[k]; t0 = a.t[k]; }
else { let k = a.first[m.sites.SA]; while (k >= 0 && a.t[k] < 500) k = a.next[k]; t0 = a.t[k]; }
const act = new Float64Array(g.n).fill(NaN);
for (let i = 0; i < g.n; i++) { if (g.dom[i] !== DOM.A) continue; let q = a.first[i]; while (q >= 0 && a.t[q] < t0) q = a.next[q]; if (q >= 0 && a.t[q] < t0 + 300) act[i] = a.t[q] - t0; }
const Wd = dipoleWeights(g);
console.log(`${id}: atrial depolarisation dipole from t0 = ${t0.toFixed(0)} (cumulative, activation only)`);
console.log('   t |   RA: Hx    Hy    Hz |   LA: Hx    Hy    Hz | total |H|  az  el');
for (let t = 0; t <= 260; t += 10) {
  const H = { RA: [0, 0, 0], LA: [0, 0, 0] };
  for (let i = 0; i < g.n; i++) if (act[i] <= t) { const h = g.ch[i] === CH.RA ? H.RA : H.LA; for (let c = 0; c < 3; c++) h[c] += Wd[c][i] / 100; }
  const T = [0, 1, 2].map((c) => H.RA[c] + H.LA[c]);
  const f = (v: number[]) => v.map((x) => x.toFixed(1).padStart(6)).join('');
  console.log(`${String(t).padStart(4)} | ${f(H.RA)} | ${f(H.LA)} | ${Math.hypot(...T).toFixed(1).padStart(5)} ${(Math.atan2(T[2], T[0]) * 180 / Math.PI).toFixed(0).padStart(4)} ${(Math.atan2(T[1], Math.hypot(T[0], T[2])) * 180 / Math.PI).toFixed(0).padStart(4)}`);
}

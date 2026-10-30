// dbg_regd.ts — per-region change of the depolarisation dipole (body frame) for nodes activated in a window (dev)
// usage: node dbg_regd.ts <id> t0,t1 ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { generate, lastInternals } from './synth.ts';
import { DOM, CH, SF } from './geom.ts';
import { dipoleWeights } from './dbg_util.ts';
const id = process.argv[2] || 'normal';
const [w0, w1] = (process.argv[3] || '0,200').split(',').map(Number);
if (process.argv[4]) process.env.FIELD_OVR = process.argv[4];
if (process.argv[5]) process.env.FIELD_COVR = process.argv[5];
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const b = r.truth.beats[0];
const Wd = dipoleWeights(g);
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300 && act[i] > 1e8) act[i] = a.t[k] - b.qrsOnMs; }
const reg = (i: number) => {
  const ab = g.ab[i] < 0.33 ? 'apx' : g.ab[i] < 0.66 ? 'mid' : 'bas';
  if (g.ch[i] === CH.RV) return (g.sf[i] & SF.RVOT ? 'RVOT' : 'RV-' + ab);
  if (g.sf[i] & SF.SEPTAL) return 'SEP-' + ab;
  const th = g.th[i]; const s = th >= 45 && th < 135 ? 'ant' : th >= -45 && th < 45 ? 'lat' : th >= -135 && th < -45 ? 'inf' : 'sepx';
  return 'LV-' + ab + '-' + s;
};
const S: Record<string, { n: number; d: number[]; t: number[] }> = {};
for (let i = 0; i < g.n; i++) {
  if (g.dom[i] !== DOM.V) continue;
  const k = reg(i); const e = (S[k] ||= { n: 0, d: [0, 0, 0], t: [] }); e.n++; e.t.push(act[i]);
  if (act[i] > w0 && act[i] <= w1) for (let c = 0; c < 3; c++) e.d[c] += Wd[c][i] / 1000;
}
const tot = [0, 0, 0];
const rows = Object.entries(S).sort((x, y) => Math.hypot(...y[1].d) - Math.hypot(...x[1].d));
console.log(`${id} window ${w0}..${w1} ms after QRS onset; region  n  median/p95 activation  dH (x left, y up, z ant)`);
for (const [k, e] of rows) { e.t.sort((x, y) => x - y); for (let c = 0; c < 3; c++) tot[c] += e.d[c]; if (Math.hypot(...e.d) < 0.03) continue; console.log(`${k.padEnd(12)} ${String(e.n).padStart(5)} ${e.t[e.t.length >> 1].toFixed(0).padStart(4)} ${e.t[Math.floor(e.t.length * 0.95)].toFixed(0).padStart(4)}  ${e.d.map((v) => v.toFixed(2).padStart(6)).join('')}`); }
console.log('total', tot.map((v) => v.toFixed(2)).join(' '));

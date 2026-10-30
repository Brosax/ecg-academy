import { dipoleWeights } from './dbg_util.ts';
// dbg_late.ts — which regions activate late, and their dipole contribution in a time window (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM, CH, SF } from './geom.ts';
const id = process.argv[2] || 'normal';
const [w0, w1] = (process.argv[3] || '45,65').split(',').map(Number);
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const b = r.truth.beats[0];
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300) act[i] = a.t[k] - b.qrsOnMs; }
const Wd = dipoleWeights(g);
const reg = (i: number) => {
  const ab = g.ab[i] < 0.33 ? 'apx' : g.ab[i] < 0.66 ? 'mid' : 'bas';
  if (g.ch[i] === CH.RV) return (g.sf[i] & SF.RVOT ? 'RVOT' : 'RV-' + ab + (g.loc[3 * i + 2] > g.p.rvC[2] ? '-ant' : '-inf'));
  if (g.sf[i] & SF.SEPTAL) return 'SEP-' + ab;
  const th = g.th[i]; const s = th >= 45 && th < 135 ? 'ant' : th >= -45 && th < 45 ? 'lat' : th >= -135 && th < -45 ? 'inf' : 'sepx';
  return 'LV-' + ab + '-' + s;
};
const S: Record<string, { n: number; nw: number; H: number[]; tmin: number; tmed: number[] }> = {};
for (let i = 0; i < g.n; i++) {
  if (g.dom[i] !== DOM.V) continue;
  const k = reg(i); const e = (S[k] ||= { n: 0, nw: 0, H: [0, 0, 0], tmin: 1e9, tmed: [] });
  e.n++; e.tmed.push(act[i]);
  if (act[i] > w0 && act[i] <= w1) { e.nw++; for (let c = 0; c < 3; c++) e.H[c] += Wd[c][i]; }
}
const rows = Object.entries(S).sort((x, y) => Math.hypot(...y[1].H) - Math.hypot(...x[1].H));
console.log(`window ${w0}-${w1} ms after QRS onset; region n, %activated-in-window, median act, p90, dipole contribution (body x left, y up, z ant) and |H|`);
let T = [0, 0, 0];
for (const [k, e] of rows) {
  e.tmed.sort((x, y) => x - y);
  const med = e.tmed[Math.floor(e.tmed.length / 2)], p90 = e.tmed[Math.floor(e.tmed.length * 0.9)];
  T = T.map((v, c) => v + e.H[c]);
  console.log(k.padEnd(14), String(e.n).padStart(5), (100 * e.nw / e.n).toFixed(0).padStart(4) + '%', med.toFixed(0).padStart(4), p90.toFixed(0).padStart(4), e.H.map((v) => v.toFixed(0).padStart(6)).join(''), Math.hypot(...e.H).toFixed(0).padStart(6));
}
console.log('total', T.map((v) => v.toFixed(0)).join(' '), Math.hypot(...T).toFixed(0));

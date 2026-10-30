// dbg_path.ts — where does the LV free wall first get activated? earliest free-wall nodes and their predecessors (dev)
// usage: node dbg_path.ts <id> ['<FIELD_COVR>']
import { generate, lastInternals } from './synth.ts';
import { CH, SF, DOM } from './geom.ts';
const id = process.argv[2] || 'lbbb';
if (process.argv[3]) process.env.FIELD_COVR = process.argv[3];
const r = generate(id, { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const G = m.graph;
const b = r.truth.beats[0];
const at = new Float64Array(G.n).fill(Infinity);
for (let k = 0; k < a.count; k++) { const t = a.t[k]; if (t >= b.qrsOnMs - 60 && t < b.qrsOnMs + 300 && t < at[a.node[k]]) at[a.node[k]] = t; }
const kind = (i: number) => {
  if (i >= g.n) { const s = Object.entries(m.spec).find(([, v]) => v === i); if (s) return 'SPEC-' + s[0]; return 'PURK' + (m.purkOf.indexOf(i) >= 0 ? (g.ch[m.purkOf.indexOf(i)] === CH.RV || (g.sf[m.purkOf.indexOf(i)] & SF.RV_ENDO) ? '-RVside' : '-LVside') : ''); }
  if (g.dom[i] !== DOM.V) return 'ATR';
  if (g.ch[i] === CH.RV) return 'RV';
  return (g.sf[i] & SF.SEPTAL) ? 'SEPT' : 'LVfree';
};
const free: number[] = []; for (let i = 0; i < g.n; i++) if (g.ch[i] === CH.LV && !(g.sf[i] & SF.SEPTAL) && isFinite(at[i]) && (process.env.SELTH ? Math.abs(g.th[i] - Number(process.env.SELTH)) < 25 && g.ab[i] > 0.4 && g.ab[i] < 0.6 : true)) free.push(i);
free.sort((x, y) => at[x] - at[y]);
// predecessor: the in-neighbour j with at[j] + w(j->i) closest to at[i]
const pred = (i: number) => {
  let best = -1, bd = Infinity;
  for (let j = 0; j < G.n; j++) { if (!isFinite(at[j])) continue; for (let e = G.start[j]; e < G.start[j + 1]; e++) if (G.to[e] === i) { const d = Math.abs(at[j] + G.w[e] - at[i]); if (d < bd) { bd = d; best = j; } } }
  return best;
};
console.log(`${id}: QRS onset ${b.qrsOnMs.toFixed(0)}`);
for (const i of free.slice(0, 12)) { const p = pred(i); console.log(`free LV node ab ${g.ab[i].toFixed(2)} th ${g.th[i].toFixed(0)} tm ${g.tm[i].toFixed(2)} AT ${(at[i] - b.qrsOnMs).toFixed(1)}  <- ${kind(p)} ${p < g.n ? `ab ${g.ab[p].toFixed(2)} th ${g.th[p].toFixed(0)} tm ${g.tm[p].toFixed(2)}` : ''} AT ${(at[p] - b.qrsOnMs).toFixed(1)}`); }

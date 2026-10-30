// dbg_leak.ts — count Purkinje-to-Purkinje graph edges that join the LV and RV networks directly (dev)
import { buildModel, defaultParams } from './model.ts';
import { SF } from './geom.ts';
const m = buildModel(defaultParams(), 1);
const g = m.g; const inv = new Int32Array(m.graph.n).fill(-1);
for (let i = 0; i < g.n; i++) if (m.purkOf[i] >= 0) inv[m.purkOf[i]] = i;
let lr = 0; const abs: number[] = [];
for (let pi = 0; pi < m.graph.n; pi++) {
  const i = inv[pi]; if (i < 0) continue;
  for (let e = m.graph.start[pi]; e < m.graph.start[pi + 1]; e++) {
    const j = inv[m.graph.to[e]]; if (j < 0) continue;
    const li = (g.sf[i] & SF.LV_ENDO) !== 0, lj = (g.sf[j] & SF.LV_ENDO) !== 0;
    const ri = (g.sf[i] & SF.RV_ENDO) !== 0, rj = (g.sf[j] & SF.RV_ENDO) !== 0;
    if ((li && !ri && rj && !lj) || (ri && !li && lj && !rj)) { lr++; abs.push(g.ab[i]); }
    else if ((li && ri) || (lj && rj)) { lr++; abs.push(g.ab[i]); }
  }
}
abs.sort((a, b) => a - b);
console.log('LV<->RV Purkinje edges', lr, 'ab range', abs[0]?.toFixed(2), abs[abs.length - 1]?.toFixed(2), 'median', abs[abs.length >> 1]?.toFixed(2));
let both = 0; for (let i = 0; i < g.n; i++) if ((g.sf[i] & SF.LV_ENDO) && (g.sf[i] & SF.RV_ENDO)) both++;
console.log('nodes flagged both LV_ENDO and RV_ENDO', both);

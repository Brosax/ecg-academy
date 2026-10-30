import { dipoleWeights } from './dbg_util.ts';
// dbg_mean.ts — decomposition of the mean QRS vector  M = -sum_i Wd_i (t_i - tbar)  by surface type (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM, CH, SF } from './geom.ts';
const id = process.argv[2] || 'normal';
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const b = r.truth.beats[0];
const act = new Float64Array(g.n).fill(NaN);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300) act[i] = a.t[k] - b.qrsOnMs; }
const Wd = dipoleWeights(g);
let tb = 0, nb = 0; for (let i = 0; i < g.n; i++) if (g.dom[i] === DOM.V) { const w = Math.hypot(Wd[0][i], Wd[1][i], Wd[2][i]); tb += w * act[i]; nb += w; } tb /= nb;
const surf = (i: number) => {
  const f = g.sf[i]; const base = g.ab[i] > 0.97 && !(f & SF.RVOT);
  if (base) return g.ch[i] === CH.RV ? 'RV base ring' : 'LV base ring';
  if (f & SF.RVOT) return 'RVOT';
  if (g.ch[i] === CH.RV) return (f & SF.RV_ENDO) ? 'RV endo' : (f & SF.EPI) ? 'RV epi' : 'RV other';
  if (f & SF.LV_ENDO) return (f & SF.SEPTAL) ? 'LV septal endo' : 'LV free endo';
  if (f & SF.RV_ENDO) return 'RV septal endo';
  if (f & SF.EPI) { const th = g.th[i]; return 'LV epi ' + (th >= 45 && th < 135 ? 'ant' : th >= -45 && th < 45 ? 'lat' : th >= -135 && th < -45 ? 'inf' : 'sep') + (g.ab[i] < 0.35 ? '-apx' : ''); }
  return 'other';
};
const M: Record<string, number[]> = {}; const T: number[] = [0, 0, 0];
for (let i = 0; i < g.n; i++) { if (g.dom[i] !== DOM.V) continue; const k = surf(i); const e = (M[k] ||= [0, 0, 0, 0, 0]); for (let c = 0; c < 3; c++) { const v = -Wd[c][i] * (act[i] - tb) / 1000; e[c] += v; T[c] += v; } const w = Math.hypot(Wd[0][i], Wd[1][i], Wd[2][i]); e[3] += w * act[i]; e[4] += w; }
console.log('mean act (area-weighted) ms', tb.toFixed(1));
console.log('surface              mean t   x(L)   y(U)   z(A)  |  local: xFree  yBase   zAnt   area');
const loc = (v: number[]) => g.bodyToLocalDir([v[0], v[1], v[2]]);
for (const [k, e] of Object.entries(M).sort()) console.log(k.padEnd(18), (e[3] / Math.max(1e-9, e[4])).toFixed(0).padStart(6), e.slice(0, 3).map((v) => v.toFixed(0).padStart(7)).join(''), ' |', loc(e).map((v) => v.toFixed(0).padStart(7)).join(''), (e[4] / 1).toFixed(0).padStart(7));
console.log('TOTAL             ', '      ', T.map((v) => v.toFixed(0).padStart(7)).join(''), ' |', loc(T).map((v) => v.toFixed(0).padStart(7)).join(''), ' frontal', (Math.atan2(-T[1], T[0]) * 180 / Math.PI).toFixed(0), ' horiz(+ant)', (Math.atan2(T[2], T[0]) * 180 / Math.PI).toFixed(0));

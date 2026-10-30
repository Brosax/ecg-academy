import { generate, lastInternals } from './synth.ts';
import { CH, SF, DOM } from './geom.ts';
const id = process.argv[2] || 'normal';
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const { model: m } = lastInternals!;
const a = m.acts!; const g = m.g;
// take the beat closest to t=1000
const b = r.truth.beats[0];
const on = b.qrsOnMs;
const T: Record<string, number[]> = {};
const add = (k: string, v: number) => { (T[k] ||= []).push(v); };
for (let k = 0; k < a.count; k++) {
  const i = a.node[k]; if (i >= g.n || g.dom[i] !== DOM.V) continue;
  const t = a.t[k] - on; if (t < -5 || t > 250) continue;
  const lab = (g.ch[i] === CH.RV ? (g.sf[i] & SF.RVOT ? 'RVOT' : 'RV') : (g.sf[i] & SF.SEPTAL ? 'SEP' : 'LV')) + (g.tm[i] < 0.34 ? '-endo' : g.tm[i] > 0.66 ? '-epi' : '-mid');
  add(lab, t); add('ALL', t);
}
const q = (x: number[], p: number) => { const s = [...x].sort((u, v) => u - v); return s[Math.floor(p * (s.length - 1))]; };
for (const k of Object.keys(T).sort()) console.log(k.padEnd(10), 'n', String(T[k].length).padStart(5), ' min', q(T[k],0).toFixed(0).padStart(4), ' p10', q(T[k],0.1).toFixed(0).padStart(4), ' p50', q(T[k],0.5).toFixed(0).padStart(4), ' p90', q(T[k],0.9).toFixed(0).padStart(4), ' max', q(T[k],1).toFixed(0).padStart(4));
// VCG: dipole moment from the EDL (sum over interior faces) at 2 ms steps over the QRS
const W = [0,1,2].map(() => new Float64Array(g.n));
for (let i = 0; i < g.n; i++) for (let qq = g.nb6.start[i]; qq < g.nb6.start[i+1]; qq++) { const j = g.nb6.idx[qq]; for (let c = 0; c < 3; c++) W[c][i] += g.pos[3*j+c] - g.pos[3*i+c]; }
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && a.t[k] >= on - 5 && a.t[k] < on + 300 && g.dom[i] === DOM.V) act[i] = a.t[k] - on; }
let line = '';
for (let t = 0; t <= 110; t += 5) {
  const H = [0,0,0];
  for (let i = 0; i < g.n; i++) if (act[i] <= t) for (let c = 0; c < 3; c++) H[c] += W[c][i];
  // Frank: X left, Y inferior, Z posterior
  const X = H[0], Y = -H[1], Z = -H[2];
  const mag = Math.hypot(X, Y, Z);
  line += `t=${t} |H|=${mag.toFixed(0)} front=${(Math.atan2(Y, X)*180/Math.PI).toFixed(0)} horiz(az from X toward ant)=${(Math.atan2(-Z, X)*180/Math.PI).toFixed(0)}\n`;
}
console.log(line);

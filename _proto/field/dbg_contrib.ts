// per-region contributions to selected electrodes during the QRS (activation-only step model)
import { generate, lastInternals } from './synth.ts';
import { CH, SF, DOM } from './geom.ts';
import { ELECTRODES } from './torso.ts';
const id = process.argv[2] || 'normal';
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!;
const b = r.truth.beats[0]; const on = b.qrsOnMs;
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= on - 5 && a.t[k] < on + 200) act[i] = a.t[k] - on; }
// rebuild weights quickly through the synth cache
const W = (globalThis as unknown as { __W?: Float64Array[] }).__W;
void W;
import { nodeWeights, defaultTorso, leadSystem } from './torso.ts';
const ls = leadSystem(defaultTorso());
const Wt = nodeWeights(g, ls);
const reg = (i: number) => g.ch[i] === CH.RV ? (g.sf[i] & SF.RVOT ? 'RVOT' : 'RV') : (g.sf[i] & SF.SEPTAL ? 'SEP' : (g.ab[i] > 0.82 ? 'LVbase' : 'LV'));
const names = ['LV', 'LVbase', 'SEP', 'RV', 'RVOT'];
const want = (process.argv[3] || 'V2,V4,V6,LL').split(',');
for (const ename of want) {
  const isLimbLead = ename === 'II';
  const e = ELECTRODES.indexOf(ename as typeof ELECTRODES[number]);
  const wct = (i: number) => (Wt[0][i] + Wt[1][i] + Wt[2][i]) / 3;
  console.log('electrode', ename, '(minus WCT), mV by region, t from QRS onset');
  let line = 't   ' + names.map((n) => n.padStart(7)).join('') + '   total';
  console.log(line);
  for (let t = 0; t <= 90; t += 5) {
    const s: Record<string, number> = {}; let tot = 0;
    for (let i = 0; i < g.n; i++) { if (g.dom[i] !== DOM.V || act[i] > t) continue; const w = (Wt[e][i] - wct(i)) * 1000; s[reg(i)] = (s[reg(i)] || 0) + w; tot += w; }
    console.log(String(t).padStart(3), names.map((n) => (s[n] || 0).toFixed(2).padStart(7)).join(''), tot.toFixed(2).padStart(8));
  }
  void isLimbLead;
}

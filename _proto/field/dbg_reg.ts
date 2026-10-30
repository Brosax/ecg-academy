// dbg_reg.ts — per-region contribution to a lead's QRS change between two times (dev)
// usage: node dbg_reg.ts <id> <lead> t0,t1 ['<ovr>']
import { generate, lastInternals, weightsFor } from './synth.ts';
import { DOM, CH, SF } from './geom.ts';
import { ELECTRODES } from './torso.ts';
const id = process.argv[2] || 'normal'; const lead = process.argv[3] || 'V1';
const [w0, w1] = (process.argv[4] || '50,75').split(',').map(Number);
if (process.argv[5]) process.env.FIELD_OVR = process.argv[5];
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const b = r.truth.beats[0];
const W = weightsFor(m);
const E = (nm: string) => W[ELECTRODES.indexOf(nm as typeof ELECTRODES[number])];
const lw = new Float64Array(g.n);
const wct = (i: number) => (E('RA')[i] + E('LA')[i] + E('LL')[i]) / 3;
for (let i = 0; i < g.n; i++) {
  lw[i] = lead === 'I' ? E('LA')[i] - E('RA')[i] : lead === 'II' ? E('LL')[i] - E('RA')[i] : lead === 'III' ? E('LL')[i] - E('LA')[i] : lead === 'aVF' ? E('LL')[i] - 0.5 * (E('RA')[i] + E('LA')[i]) : lead === 'aVL' ? E('LA')[i] - 0.5 * (E('RA')[i] + E('LL')[i]) : E(lead)[i] - wct(i);
}
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300) act[i] = a.t[k] - b.qrsOnMs; }
const reg = (i: number) => {
  const ab = g.ab[i] < 0.33 ? 'apx' : g.ab[i] < 0.66 ? 'mid' : 'bas';
  const lay = g.tm[i] < 0.34 ? 'en' : g.tm[i] < 0.67 ? 'mi' : 'ep';
  if (g.ch[i] === CH.RV) return (g.sf[i] & SF.RVOT ? 'RVOT' : 'RV-' + ab + (g.loc[3 * i + 2] > g.p.rvC[2] ? '-ant' : '-inf'));
  if (g.sf[i] & SF.SEPTAL) return 'SEP-' + ab;
  const th = g.th[i]; const s = th >= 45 && th < 135 ? 'ant' : th >= -45 && th < 45 ? 'lat' : th >= -135 && th < -45 ? 'inf' : 'sepx';
  return 'LV-' + ab + '-' + s + '-' + lay;
};
const S: Record<string, { n: number; c: number; med: number[] }> = {};
const gain = 1000 * m.p.gain;
for (let i = 0; i < g.n; i++) {
  if (g.dom[i] !== DOM.V) continue;
  const k = reg(i); const e = (S[k] ||= { n: 0, c: 0, med: [] }); e.n++; e.med.push(act[i]);
  if (act[i] > w0 && act[i] <= w1) e.c += lw[i] * gain * 10; // mm
}
const rows = Object.entries(S).sort((x, y) => Math.abs(y[1].c) - Math.abs(x[1].c));
let tot = 0;
for (const [k, e] of rows.slice(0, 16)) { e.med.sort((x, y) => x - y); tot += e.c; console.log(k.padEnd(18), String(e.n).padStart(5), e.med[e.med.length >> 1].toFixed(0).padStart(4), e.med[Math.floor(e.med.length * 0.95)].toFixed(0).padStart(4), e.c.toFixed(2).padStart(8)); }
console.log('total mm change', rows.reduce((s, [, e]) => s + e.c, 0).toFixed(2));

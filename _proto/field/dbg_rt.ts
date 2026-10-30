// dbg_rt.ts — lead-weighted repolarisation-time histogram (what shapes the T wave) by region, one beat (dev)
// usage: node dbg_rt.ts <id> <lead> ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { generate, lastInternals, weightsFor } from './synth.ts';
import { DOM, CH, SF } from './geom.ts';
import { ELECTRODES } from './torso.ts';
const id = process.argv[2] || 'hyperk'; const lead = process.argv[3] || 'III';
if (process.argv[4]) process.env.FIELD_OVR = process.argv[4];
if (process.argv[5]) process.env.FIELD_COVR = process.argv[5];
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const b = r.truth.beats[0];
const W = weightsFor(m);
const E = (nm: string) => W[ELECTRODES.indexOf(nm as typeof ELECTRODES[number])];
const lw = (i: number) => {
  const RA = E('RA')[i], LA = E('LA')[i], LL = E('LL')[i];
  if (lead === 'I') return LA - RA; if (lead === 'II') return LL - RA; if (lead === 'III') return LL - LA;
  if (lead === 'aVL') return LA - 0.5 * (RA + LL); if (lead === 'aVF') return LL - 0.5 * (RA + LA); if (lead === 'aVR') return RA - 0.5 * (LA + LL);
  return E(lead)[i] - (RA + LA + LL) / 3;
};
const reg = (i: number) => g.ch[i] === CH.RV ? 'RV' : (g.sf[i] & SF.SEPTAL) ? 'SEP' : g.tm[i] < 0.5 ? 'LVen' : 'LVep';
const regs = ['RV', 'SEP', 'LVen', 'LVep'];
const bins: Record<string, number[]> = {}; for (const k of regs) bins[k] = new Array(40).fill(0);
const gain = 1000 * m.p.gain * 10;
for (let k = 0; k < a.count; k++) {
  const i = a.node[k]; if (i >= g.n || g.dom[i] !== DOM.V) continue;
  if (a.t[k] < b.qrsOnMs - 5 || a.t[k] > b.qrsOnMs + 300) continue;
  const rt = a.t[k] + a.apd[k] - b.qrsOnMs; const bi = Math.floor((rt - 150) / 10); if (bi < 0 || bi >= 40) continue;
  bins[reg(i)][bi] += -lw(i) * gain * (m.amp[i] - m.rest[i]);
}
console.log(`${id} ${lead}: -(lead weight) summed per 10 ms bin of repolarisation time (mm-scale; positive -> upright T contribution)`);
console.log('  RT  ' + regs.map((k) => k.padStart(7)).join('') + '    sum');
for (let bi = 0; bi < 40; bi++) {
  const s = regs.reduce((acc, k) => acc + bins[k][bi], 0);
  if (regs.every((k) => Math.abs(bins[k][bi]) < 0.05)) continue;
  console.log(`${String(150 + bi * 10).padStart(4)}  ${regs.map((k) => bins[k][bi].toFixed(2).padStart(7)).join('')}  ${s.toFixed(2).padStart(6)}`);
}

// dbg_fph.ts — flutter: lead-weighted atrial activation histogram over one cycle (the depolarisation part of the F
// wave is its running sum), split RA / LA, plus the region being activated in each 10 ms bin (dev)
// usage: node dbg_fph.ts ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { generate, lastInternals, weightsFor } from './synth.ts';
import { DOM, CH } from './geom.ts';
import { ELECTRODES } from './torso.ts';
if (process.argv[2]) process.env.FIELD_OVR = process.argv[2];
if (process.argv[3]) process.env.FIELD_COVR = process.argv[3];
generate('aflutter', { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!;
const W = weightsFor(m);
const E = (nm: string) => W[ELECTRODES.indexOf(nm as typeof ELECTRODES[number])];
const lw = (i: number, lead: string) => {
  const RA = E('RA')[i], LA = E('LA')[i], LL = E('LL')[i];
  if (lead === 'II') return LL - RA; if (lead === 'III') return LL - LA; if (lead === 'aVF') return LL - 0.5 * (RA + LA); if (lead === 'I') return LA - RA;
  return E(lead)[i] - (RA + LA + LL) / 3;
};
let k = a.first[m.sites.FLUT]; const ex: number[] = []; while (k >= 0) { ex.push(a.t[k]); k = a.next[k]; }
const t0 = ex[ex.length - 3], cl = ex[ex.length - 2] - t0;
const nb = Math.ceil(cl / 10);
const H: Record<string, number[]> = {}; for (const key of ['RA-II', 'LA-II', 'RA-V1', 'LA-V1', 'RA-aVF', 'LA-aVF']) H[key] = new Array(nb).fill(0);
const pos: number[][] = Array.from({ length: nb }, () => [0, 0, 0, 0]);
const gain = 1000 * m.p.gain * 10 * m.p.aAmp;
for (let i = 0; i < g.n; i++) {
  if (g.dom[i] !== DOM.A) continue;
  let kk = a.first[i]; let t = NaN; while (kk >= 0) { if (a.t[kk] >= t0 && a.t[kk] < t0 + cl) { t = a.t[kk]; break; } kk = a.next[kk]; }
  if (isNaN(t)) continue;
  const bi = Math.min(nb - 1, Math.floor((t - t0) / 10)); const c = g.ch[i] === CH.RA ? 'RA' : 'LA';
  for (const ld of ['II', 'V1', 'aVF']) H[c + '-' + ld][bi] += lw(i, ld) * gain;
  pos[bi][0] += g.pos[3 * i]; pos[bi][1] += g.pos[3 * i + 1]; pos[bi][2] += g.pos[3 * i + 2]; pos[bi][3]++;
}
console.log(`cycle ${cl.toFixed(0)} ms; columns: lead-weighted activation per 10 ms (mm), and the mean body position (x left, y up, z ant) of the nodes activated`);
console.log(' bin   RA-II  LA-II  cumII |  RA-aVF LA-aVF | RA-V1  LA-V1  cumV1 |  n   x    y    z');
let cII = 0, cV1 = 0;
const mII = H['RA-II'].concat(H['LA-II']).reduce((s, v) => s + v, 0);
for (let bi = 0; bi < nb; bi++) {
  cII += H['RA-II'][bi] + H['LA-II'][bi]; cV1 += H['RA-V1'][bi] + H['LA-V1'][bi];
  const p = pos[bi]; const n = p[3] || 1;
  console.log(`${String(bi * 10).padStart(4)}  ${H['RA-II'][bi].toFixed(2).padStart(6)} ${H['LA-II'][bi].toFixed(2).padStart(6)} ${cII.toFixed(2).padStart(6)} | ${H['RA-aVF'][bi].toFixed(2).padStart(6)} ${H['LA-aVF'][bi].toFixed(2).padStart(6)} | ${H['RA-V1'][bi].toFixed(2).padStart(6)} ${H['LA-V1'][bi].toFixed(2).padStart(6)} ${cV1.toFixed(2).padStart(6)} | ${String(p[3]).padStart(4)} ${(p[0] / n).toFixed(0).padStart(4)} ${(p[1] / n).toFixed(0).padStart(4)} ${(p[2] / n).toFixed(0).padStart(4)}`);
}
console.log('net II over the cycle (should be ~0):', mII.toFixed(2));

// dbg_flw.ts — flutter F-wave shape from the atria only (ventricular weights masked out): per lead, the trace over
// two atrial cycles (mm, mean removed) plus peak-up / peak-down; and the sinus P of the normal heart with the same
// shared overrides (dev)
// usage: node dbg_flw.ts ['<FIELD_OVR>'] ['<FIELD_COVR for aflutter>']
import { generate, lastInternals, weightsFor } from './synth.ts';
import { synthesize } from './ecg.ts';
import { DOM } from './geom.ts';
import { ELECTRODES } from './torso.ts';
import { fiducials, leadMeasures } from './measure.ts';
if (process.argv[2]) process.env.FIELD_OVR = process.argv[2];
if (process.argv[3]) process.env.FIELD_COVR = process.argv[3];
// optional regional LA speed scale for the flutter run (FLW_LAV=1.5)
import { CONDITIONS } from './conditions.ts';
import { CH } from './geom.ts';
if (process.env.FLW_LAV) { const base = CONDITIONS.aflutter.params; const f = Number(process.env.FLW_LAV); CONDITIONS.aflutter = { ...CONDITIONS.aflutter, params: (s) => { const p = base(s); p.mods.push({ sel: (S, i) => (S.g.ch[i] === CH.LA ? 1 : 0), vScale: f }); return p; } }; }
generate('aflutter', { fs: 500, durationS: 3, seed: 1 });
const I = lastInternals!; const m = I.model; const g = m.g;
const W = weightsFor(m);
const tpl = { amp: m.amp, rest: m.rest, notch: m.notch, slope: m.slope, cls: m.cls };
const phi = synthesize(m.acts!, m.nMyo, W.map((w) => w.map((v, i) => (g.dom[i] === DOM.A ? v : 0))), tpl, I.t0, I.phi[0].length, I.dt, 1000 * m.p.gain);
const e = (nm: string) => ELECTRODES.indexOf(nm as typeof ELECTRODES[number]);
const lead = (k: number, nm: string) => {
  const RA = phi[e('RA')][k], LA = phi[e('LA')][k], LL = phi[e('LL')][k];
  if (nm === 'I') return LA - RA; if (nm === 'II') return LL - RA; if (nm === 'III') return LL - LA;
  if (nm === 'aVF') return LL - 0.5 * (RA + LA); if (nm === 'aVL') return LA - 0.5 * (RA + LL); if (nm === 'aVR') return RA - 0.5 * (LA + LL);
  return phi[e(nm)][k] - (RA + LA + LL) / 3;
};
let k = m.acts!.first[m.sites.FLUT]; const ex: number[] = []; while (k >= 0) { ex.push(m.acts!.t[k]); k = m.acts!.next[k]; }
const exIn = ex.filter((t) => t > 800 && t < 2400);
const cl = exIn[exIn.length - 1] - exIn[exIn.length - 2];
const t0 = exIn[exIn.length - 2];
const nS = Math.round(2 * cl / I.dt);
const k0 = Math.round((t0 - I.t0) / I.dt);
console.log(`atrial cycle ${cl.toFixed(0)} ms (exits ${ex.slice(-5).map((t) => t.toFixed(0)).join(',')})`);
for (const nm of ['II', 'III', 'aVF', 'I', 'aVL', 'V1', 'V2', 'V6']) {
  const x: number[] = []; for (let q = 0; q < nS; q++) x.push(lead(k0 + q, nm) * 10);
  const mean = x.reduce((s, v) => s + v, 0) / x.length;
  const y = x.map((v) => v - mean);
  const up = Math.max(...y), dn = Math.min(...y);
  const tr: string[] = []; for (let q = 0; q < nS; q += Math.round(10 / I.dt)) tr.push(y[q].toFixed(1).padStart(5));
  console.log(`${nm.padEnd(4)} up ${up.toFixed(1).padStart(5)} down ${dn.toFixed(1).padStart(5)} | ${tr.join('')}`);
}
// sinus P with the same shared overrides
delete process.env.FIELD_COVR;
const r = generate('normal', { fs: 500, durationS: 3, seed: 1 });
const b = r.truth.beats[1];
const f = fiducials(r.leads, 500, b.qrsOnMs + 20, r.truth.beats[0].qrsOnMs, r.truth.beats[2]?.qrsOnMs ?? null);
const row: string[] = [];
for (const nm of ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V6']) { const mm = leadMeasures(r.leads[nm as 'I'], 500, { ...f, qrsOn: b.qrsOnMs, qrsOff: b.qrsOffMs, tOff: b.tOffMs, pOn: b.pOnMs }); row.push(`${nm} ${(mm.p * 10).toFixed(1)}/${(mm.pNeg * 10).toFixed(1)}`); }
console.log(`normal P (+/-, mm): ${row.join('  ')}   PR ${r.truth.prMs?.toFixed(0)}  P dur ${(b.qrsOnMs - (b.pOnMs ?? 0)).toFixed(0)}`);

// dbg_axis.ts — frontal QRS axis bookkeeping for one beat: net QRS areas (mV·ms) of I and aVF in the model's QRS window
// from the full signal and from the ventricular-only source, plus the axis from net peak amplitudes (dev)
// usage: node dbg_axis.ts <id>
import { generate, lastInternals, weightsFor } from './synth.ts';
import { synthesize } from './ecg.ts';
import { DOM } from './geom.ts';
import { ELECTRODES } from './torso.ts';
const id = process.argv[2] || 'rbbb';
const r = generate(id, { fs: 1000, durationS: 3, seed: 1 });
const I = lastInternals!; const m = I.model; const g = m.g; const W = weightsFor(m);
const tpl = { amp: m.amp, rest: m.rest, notch: m.notch, slope: m.slope, cls: m.cls };
const e = (nm: string) => ELECTRODES.indexOf(nm as typeof ELECTRODES[number]);
const pv = synthesize(m.acts!, m.nMyo, W.map((w, k) => (['RA', 'LA', 'LL'].includes(ELECTRODES[k]) ? w.map((v, i) => (g.dom[i] === DOM.V ? v : 0)) : new Float64Array(w.length))), tpl, I.t0, I.phi[0].length, I.dt, 1000 * m.p.gain);
const at = (t: number) => Math.round((t - I.t0) / I.dt);
for (const b of r.truth.beats.slice(1, 3)) {
  const k0 = Math.round(b.qrsOnMs), k1 = Math.round(b.qrsOffMs);
  const full = (nm: 'I' | 'aVF') => { const x = r.leads[nm]; const base = x[k0 - 5]; let s = 0, mx = -1e9, mn = 1e9; for (let k = k0; k <= k1; k++) { s += x[k] - base; mx = Math.max(mx, x[k] - base); mn = Math.min(mn, x[k] - base); } return [s, mx + mn]; };
  const ven = (nm: 'I' | 'aVF') => { let s = 0, mx = -1e9, mn = 1e9; const f = (t: number) => { const q = at(t); const RA = pv[e('RA')][q], LA = pv[e('LA')][q], LL = pv[e('LL')][q]; return nm === 'I' ? LA - RA : LL - 0.5 * (RA + LA); }; const base = f(k0 - 5); for (let k = k0; k <= k1; k++) { const y = f(k) - base; s += y; mx = Math.max(mx, y); mn = Math.min(mn, y); } return [s, mx + mn]; };
  const ax = (sI: number, sF: number) => (Math.atan2(2 * sF / Math.sqrt(3), sI) * 180 / Math.PI).toFixed(0);
  const fI = full('I'), fF = full('aVF'), vIa = ven('I'), vFa = ven('aVF'); const vI = vIa[0], vF = vFa[0];
  console.log(`beat ${b.qrsOnMs.toFixed(0)}: full area I ${fI[0].toFixed(1)} aVF ${fF[0].toFixed(1)} -> ${ax(fI[0], fF[0])} | vent area I ${vI.toFixed(1)} aVF ${vF.toFixed(1)} -> ${ax(vI, vF)} | net peak I ${(fI[1] * 10).toFixed(1)} aVF ${(fF[1] * 10).toFixed(1)} -> ${ax(fI[1], fF[1])} | vent net peak -> ${ax(vIa[1], vFa[1])}`);
}

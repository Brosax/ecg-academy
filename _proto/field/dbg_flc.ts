// dbg_flc.ts — contribution of RA, LA and ventricles to II, aVF, V1 (mm) through two atrial cycles in a window (dev)
// usage: node dbg_flc.ts [id] [t0ms] [lenMs] ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { generate, lastInternals, weightsFor } from './synth.ts';
import { synthesize } from './ecg.ts';
import { CH } from './geom.ts';
import { ELECTRODES } from './torso.ts';
const id = process.argv[2] || 'aflutter';
const t0 = Number(process.argv[3] || 1400), len = Number(process.argv[4] || 400);
if (process.argv[5]) process.env.FIELD_OVR = process.argv[5];
if (process.argv[6]) process.env.FIELD_COVR = process.argv[6];
generate(id, { fs: 500, durationS: 3, seed: 1 });
const I = lastInternals!; const m = I.model; const g = m.g;
const W = weightsFor(m);
const tpl = { amp: m.amp, rest: m.rest, notch: m.notch, slope: m.slope, cls: m.cls };
const part = (f: (i: number) => boolean) => synthesize(m.acts!, m.nMyo, W.map((w) => w.map((v, i) => (f(i) ? v : 0))), tpl, I.t0, I.phi[0].length, I.dt, 1000 * m.p.gain);
const parts = { RA: part((i) => g.ch[i] === CH.RA), LA: part((i) => g.ch[i] === CH.LA), V: part((i) => g.ch[i] === CH.LV || g.ch[i] === CH.RV) };
const e = (nm: string) => ELECTRODES.indexOf(nm as typeof ELECTRODES[number]);
const lead = (phi: Float64Array[], k: number, nm: string) => {
  const RA = phi[e('RA')][k], LA = phi[e('LA')][k], LL = phi[e('LL')][k];
  if (nm === 'II') return LL - RA; if (nm === 'aVF') return LL - 0.5 * (RA + LA); if (nm === 'I') return LA - RA;
  return phi[e(nm)][k] - (RA + LA + LL) / 3;
};
const k0 = Math.round((t0 - I.t0) / I.dt);
const ref: Record<string, Record<string, number>> = {};
for (const [pn, phi] of Object.entries(parts)) { ref[pn] = {}; for (const nm of ['I', 'II', 'aVF', 'V1']) { let s = 0; for (let k = k0; k < k0 + Math.round(len / I.dt); k++) s += lead(phi, k, nm); ref[pn][nm] = s / Math.round(len / I.dt); } }
console.log('   t | RA:  I    II   aVF   V1 | LA:  I    II   aVF   V1 | V:  II  aVF | sum II aVF V1   (mm, mean removed)');
for (let t = t0; t < t0 + len; t += 10) {
  const k = Math.round((t - I.t0) / I.dt);
  const row = (pn: keyof typeof parts, nms: string[]) => nms.map((nm) => ((lead(parts[pn], k, nm) - ref[pn][nm]) * 10).toFixed(1).padStart(5)).join(' ');
  const sum = ['II', 'aVF', 'V1'].map((nm) => (((lead(parts.RA, k, nm) - ref.RA[nm]) + (lead(parts.LA, k, nm) - ref.LA[nm])) * 10).toFixed(1).padStart(5)).join(' ');
  console.log(`${String(t).padStart(5)} | ${row('RA', ['I', 'II', 'aVF', 'V1'])} | ${row('LA', ['I', 'II', 'aVF', 'V1'])} | ${row('V', ['II', 'aVF'])} | ${sum}`);
}

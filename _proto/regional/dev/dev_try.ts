// dev: quick parameter exploration on one condition. Usage: node dev_try.ts <id> '<json overrides>'
// overrides: { beta, gainV, heart: {...}, pmj: {"face": t}, wall: {...}, vT, vrep: {...} }
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADSYS } from '../model.ts';
import { NORMAL_PMJ, NORMAL_VCOND } from '../conduction.ts';
import { LEADS } from '../leadfield.ts';
import { leadAmplitudes } from '../measure.ts';
const id = process.argv[2] ?? 'normal';
const ov = JSON.parse(process.argv[3] ?? '{}');
if (ov.beta !== undefined) LEADSYS.beta = ov.beta;
if (ov.gainV !== undefined) LEADSYS.gainV = ov.gainV;
if (ov.pmj) for (const p of NORMAL_PMJ) if (ov.pmj[p.face] !== undefined) { const v = ov.pmj[p.face]; if (Array.isArray(v)) { p.t = v[0]; p.h = v[1]; } else p.t = v; }
if (ov.wall) Object.assign(NORMAL_VCOND.wall, ov.wall);
if (ov.vT) NORMAL_VCOND.vT = ov.vT;
const cond = { ...CONDITIONS[id], heart: { ...(CONDITIONS[id].heart ?? {}), ...(ov.heart ?? {}) }, vrep: { ...(CONDITIONS[id].vrep ?? {}), ...(ov.vrep ?? {}) } };
const sim = simulate(cond, { fs: 500, durationS: 4, seed: 1 });
const b = sim.truth.beats[1];
const mm = (v: number) => (v * 10).toFixed(1).padStart(6);
console.log(`QRS ${sim.truth.qrsMs} QT ${sim.truth.qtMs} axis ${sim.truth.qrsAxisDeg}`);
console.log('lead     Q      R      S  Rpk    T');
for (const l of LEADS) {
  const a = leadAmplitudes(sim.leads[l], 500, b.qrsOnMs, b.qrsOffMs, b.tOffMs, b.pOnMs);
  console.log(`${l.padEnd(4)}${mm(a.q)}${mm(a.r)}${mm(a.s)}${a.rPeakMs.toFixed(0).padStart(5)}${mm(a.t)}`);
}

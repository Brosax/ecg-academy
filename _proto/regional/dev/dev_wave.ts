// dev: print chosen leads (mm) every `step` ms over one beat, with optional parameter overrides (as dev_try.ts).
// Usage: node dev_wave.ts <id> '<json overrides>' [leads=V1,V2,I,V6] [step=8] [toMs=200]
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADSYS } from '../model.ts';
const id = process.argv[2] ?? 'normal';
const ov = JSON.parse(process.argv[3] ?? '{}');
const leads = (process.argv[4] ?? 'V1,V2,I,V6').split(',');
const step = Number(process.argv[5] ?? 8);
const to = Number(process.argv[6] ?? 200);
if (ov.beta !== undefined) LEADSYS.beta = ov.beta;
if (ov.gainV !== undefined) LEADSYS.gainV = ov.gainV;
const c0 = CONDITIONS[id];
const cond = {
  ...c0, heart: { ...(c0.heart ?? {}), ...(ov.heart ?? {}) }, vrep: { ...(c0.vrep ?? {}), ...(ov.vrep ?? {}) },
  vcond: { ...(c0.vcond ?? {}), ...(ov.vcond ?? {}) }, regions: { ...(c0.regions ?? {}), ...(ov.regions ?? {}) },
};
const fs = 1000;
const sim = simulate(cond, { fs, durationS: 4, seed: 1 });
const b = sim.truth.beats[1];
console.log(`QRS ${sim.truth.qrsMs} QT ${sim.truth.qtMs} axis ${sim.truth.qrsAxisDeg}`);
console.log('  t ' + leads.map((l) => l.padStart(6)).join(''));
const i0 = Math.round(b.qrsOnMs - 10);
for (let t = -10; t <= to; t += step) {
  const i = Math.round(b.qrsOnMs + t);
  console.log(String(t).padStart(4) + leads.map((l) => ((sim.leads[l as keyof typeof sim.leads][i] - sim.leads[l as keyof typeof sim.leads][i0]) * 10).toFixed(1).padStart(6)).join(''));
}

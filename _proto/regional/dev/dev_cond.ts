// dev: run a condition with a JSON patch merged into its definition (deep for rhythm/vcond/vrep/regions/heart/atria)
// and print selected leads (mm) every step ms from QRS onset of beat 1. Usage: node dev_cond.ts id 'patch' leads step to [beat]
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADSYS } from '../model.ts';
const [id, patchS, leadsS, stepS, toS, beatS] = process.argv.slice(2);
const patch = JSON.parse(patchS ?? '{}');
if (patch.LEADSYS) Object.assign(LEADSYS, patch.LEADSYS);
const c0 = CONDITIONS[id];
const cond = { ...c0 } as any;
for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
if (patch.rhythm?.ap) cond.rhythm.ap = { ...(c0.rhythm as any).ap, ...patch.rhythm.ap };
const leads = (leadsS ?? 'I,II,III,aVL,aVF,V1,V2,V4,V6').split(',');
const step = Number(stepS ?? 8), to = Number(toS ?? 200);
const sim = simulate(cond, { fs: 1000, durationS: 4, seed: 1 });
const b = sim.truth.beats[Number(beatS ?? 1)];
console.log(`HR ${sim.truth.hrBpm} PR ${sim.truth.prMs} QRS ${sim.truth.qrsMs} QT ${sim.truth.qtMs} axis ${sim.truth.qrsAxisDeg}`);
console.log('   t' + leads.map((l) => l.padStart(6)).join(''));
const i0 = Math.round(b.qrsOnMs - 10);
for (let t = -10; t <= to; t += step) {
  const i = Math.round(b.qrsOnMs + t);
  console.log(String(t).padStart(4) + leads.map((l) => { const x = (sim.leads as any)[l]; return ((x[i] - x[i0]) * 10).toFixed(1).padStart(6); }).join(''));
}

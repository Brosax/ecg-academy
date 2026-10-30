// dev: ST level at J (QRS off), J+40, J+80 and T peak (mm, vs PR baseline) for all leads, with a condition patch.
// Usage: node dev_stm.ts id '<patch json as dev_cond>'
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADS } from '../leadfield.ts';
const [id, patchS] = process.argv.slice(2);
const patch = JSON.parse(patchS ?? '{}');
const c0 = CONDITIONS[id];
const cond = { ...c0 } as any;
for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
const fs = 1000;
const sim = simulate(cond, { fs, durationS: 4, seed: 1 });
const b = sim.truth.beats[1];
const I = (t: number) => Math.round(t);
let out = `QRS ${sim.truth.qrsMs} QT ${sim.truth.qtMs} axis ${sim.truth.qrsAxisDeg}\nlead    J  J+40  J+80  Tpk\n`;
for (const l of LEADS) {
  const x = sim.leads[l];
  let base = 0; for (let i = I(b.qrsOnMs - 25); i < I(b.qrsOnMs - 5); i++) base += x[i]; base /= 20;
  const v = (t: number) => ((x[I(t)] - base) * 10);
  let tp = 0; for (let t = b.qrsOffMs + 80; t < b.tOffMs; t++) if (Math.abs(v(t)) > Math.abs(tp)) tp = v(t);
  out += `${l.padEnd(5)}${v(b.qrsOffMs).toFixed(1).padStart(5)}${v(b.qrsOffMs + 40).toFixed(1).padStart(6)}${v(b.qrsOffMs + 80).toFixed(1).padStart(6)}${tp.toFixed(1).padStart(6)}\n`;
}
console.log(out);

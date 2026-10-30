// dev: ST levels (J+20, J+60) vs TP baseline (mean of 40 ms before P onset) for a beat; optional atrial gain override
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADSYS } from '../model.ts';
import { LEADS } from '../leadfield.ts';
const id = process.argv[2] ?? 'normal';
if (process.argv[3] !== undefined) LEADSYS.gainA = Number(process.argv[3]);
const sim = simulate(CONDITIONS[id], { fs: 500, durationS: 4, seed: 1 });
const b = sim.truth.beats[2];
const I = (t: number) => Math.round(t / 2);
const tp0 = (b.pOnMs ?? b.qrsOnMs - 200) - 40;
let row = 'lead  PRseg  J+20  J+60 (mm vs TP)\n';
for (const l of LEADS) {
  const x = sim.leads[l];
  let base = 0; for (let i = I(tp0); i < I(tp0 + 40); i++) base += x[i]; base /= I(40);
  const pr = (x[I(b.qrsOnMs - 10)] - base) * 10;
  row += `${l.padEnd(5)}${pr.toFixed(2).padStart(6)}${((x[I(b.qrsOffMs + 20)] - base) * 10).toFixed(2).padStart(6)}${((x[I(b.qrsOffMs + 60)] - base) * 10).toFixed(2).padStart(6)}\n`;
}
console.log(`qrsOff ${b.qrsOffMs - b.qrsOnMs}\n` + row);

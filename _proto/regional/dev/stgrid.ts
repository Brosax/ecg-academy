// dev (review): J+40 ST (mm) of every lead + T of chosen leads for a list of patches (ST / reciprocal-change tuning)
// Usage: node dev/stgrid.ts <id> '<json array of patches>'
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADS } from '../leadfield.ts';
const [id, patchesS] = process.argv.slice(2);
for (const patch of JSON.parse(patchesS)) {
  const c0 = CONDITIONS[id];
  const cond = { ...c0 } as any;
  for (const k of ['rhythm', 'vcond', 'vrep', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
  if (patch.regions) cond.regions = patch.regions;
  const sim = simulate(cond, { fs: 1000, durationS: 4, seed: 1 });
  const b = sim.truth.beats[1];
  const out: string[] = [];
  for (const l of LEADS) {
    const x = (sim.leads as any)[l] as Float32Array;
    let base = 0; for (let i = Math.round(b.qrsOnMs - 22); i < Math.round(b.qrsOnMs - 2); i++) base += x[i]; base /= 20;
    const v = (t: number) => (x[Math.round(t)] - base) * 10;
    let big = 0; for (let t = b.qrsOffMs + 60; t < b.tOffMs; t++) if (Math.abs(v(t)) > Math.abs(big)) big = v(t);
    out.push(`${l} ${v(b.qrsOffMs).toFixed(1)}/${v(b.qrsOffMs + 40).toFixed(1)}/${big.toFixed(1)}`);
  }
  console.log(`QRS ${sim.truth.qrsMs} axis ${sim.truth.qrsAxisDeg} | J/J40/T: ${out.join(' ')}\n   ${JSON.stringify(patch).slice(0, 300)}`);
}

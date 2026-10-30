// dev (review): LVH strain ST-T shape — J+40, T trough, and the largest rise ("hump") between J+20 and the T trough
// (0 for a monotonic downsloping ST merging into the inverted T). Usage: node dev/dev_hump.ts <id> '<json array of patches>'
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
const [id, patchesS, leadsS] = process.argv.slice(2);
const leads = (leadsS ?? 'I,aVL,V4,V5,V6').split(',');
for (const patch of JSON.parse(patchesS ?? '[{}]')) {
  const c0 = CONDITIONS[id];
  const cond = { ...c0 } as any;
  for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
if (patch['regions!']) cond.regions = patch['regions!']; // replace (not merge) the regional modifiers
  if (patch.regionsAll) { cond.regions = { ...cond.regions }; for (const r of Object.keys(cond.regions)) cond.regions[r] = { ...cond.regions[r], ...patch.regionsAll }; }
  const sim = simulate(cond, { fs: 1000, durationS: 4, seed: 1 });
  const b = sim.truth.beats[1];
  const out: string[] = [];
  for (const l of leads) {
    const x = (sim.leads as any)[l] as Float32Array;
    let base = 0; for (let i = Math.round(b.qrsOnMs - 22); i < Math.round(b.qrsOnMs - 2); i++) base += x[i]; base /= 20;
    const v = (t: number) => (x[Math.round(t)] - base) * 10;
    let tt = b.qrsOffMs + 20; for (let t = b.qrsOffMs + 20; t < b.tOffMs; t++) if (v(t) < v(tt)) tt = t;
    let hump = 0, mn = Infinity;
    for (let t = b.qrsOffMs + 20; t <= tt; t++) { mn = Math.min(mn, v(t)); hump = Math.max(hump, v(t) - mn); }
    let tMax = 0; for (let t = tt; t < b.tOffMs + 60; t++) tMax = Math.max(tMax, v(t));
    out.push(`${l}: J40 ${v(b.qrsOffMs + 40).toFixed(1)} T ${v(tt).toFixed(1)}@${(tt - b.qrsOnMs).toFixed(0)} hump ${hump.toFixed(1)} post+ ${tMax.toFixed(1)}`);
  }
  console.log(`${JSON.stringify(patch)}\n  QRS ${sim.truth.qrsMs} QT ${sim.truth.qtMs} axis ${sim.truth.qrsAxisDeg} | ${out.join(' | ')}`);
}

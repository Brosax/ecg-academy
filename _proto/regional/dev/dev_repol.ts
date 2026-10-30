// dev (review): repolarisation midpoint (activation mid + APD) of every face for one beat, sorted, with a vrep/regions patch
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
const [id, patchS] = process.argv.slice(2);
const patch = JSON.parse(patchS ?? '{}');
const c0 = CONDITIONS[id];
const cond = { ...c0 } as any;
for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
const sim = simulate(cond, { fs: 500, durationS: 3, seed: 1 });
const b = sim.truth.beats[1];
const evs = sim.vEvents.filter((e) => e.p.t0 >= b.qrsOnMs - 1 && e.p.t0 < b.qrsOnMs + 400);
const rows = evs.map((e) => ({ f: `${sim.heart.vregions[e.face >> 1].id}:${e.face & 1 ? 'OUT' : 'IN'}`, act: (e.p.t0 + e.p.t1) / 2 - b.qrsOnMs, rep: (e.p.t0 + e.p.t1) / 2 + e.p.apd - b.qrsOnMs }));
rows.sort((a, z) => a.rep - z.rep);
for (const r of rows) console.log(`${r.f.padEnd(14)} act ${r.act.toFixed(0).padStart(4)}  rep ${r.rep.toFixed(0).padStart(4)}`);

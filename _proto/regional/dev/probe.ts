// dev (review): run a condition with a JSON patch (merged like dev_cond.ts), write dev/tmp/<name>.json for the render
// harness and print a compact morphology table of one beat: QRS extrema sequence, J / J+40 / J+80, T extrema.
// Usage: node dev/probe.ts <id> '<patch json>' [name] [beat]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADS } from '../leadfield.ts';

const [id, patchS, nameS, beatS] = process.argv.slice(2);
const patch = JSON.parse(patchS ?? '{}');
const c0 = CONDITIONS[id];
const cond = { ...c0 } as any;
for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
if (patch['regions!']) cond.regions = patch['regions!']; // replace (not merge) the regional modifiers
if (patch.regionsAll) { cond.regions = { ...cond.regions }; for (const r of Object.keys(cond.regions)) cond.regions[r] = { ...cond.regions[r], ...patch.regionsAll }; }
const fs = 500;
const t0 = performance.now();
const sim = simulate(cond, { fs, durationS: 10, seed: 1 });
const ms = performance.now() - t0;
const here = dirname(fileURLToPath(import.meta.url));
const name = nameS ?? id;
mkdirSync(join(here, 'tmp'), { recursive: true });
const leads: Record<string, number[]> = {};
for (const l of LEADS) leads[l] = Array.from(sim.leads[l], (v) => Math.round(v * 10000) / 10000);
writeFileSync(join(here, 'tmp', `${name}.json`), JSON.stringify({ fs, title: name, leads }));
const tr = sim.truth;
const b = tr.beats[Number(beatS ?? 4)];
console.log(`${name}: HR ${tr.hrBpm} PR ${tr.prMs} QRS ${tr.qrsMs} QT ${tr.qtMs} axis ${tr.qrsAxisDeg}  (${ms.toFixed(0)} ms)`);
const I = (t: number) => Math.round((t * fs) / 1000);
for (const l of LEADS) {
  const x = sim.leads[l];
  let base = 0; for (let i = I(b.qrsOnMs - 22); i < I(b.qrsOnMs - 2); i++) base += x[i]; base /= I(20);
  const v = (i: number) => (x[i] - base) * 10;
  // QRS extrema (prominence 0.7 mm)
  const ex: string[] = [];
  let last = 0;
  const a = I(b.qrsOnMs), z = I(b.qrsOffMs);
  for (let i = a + 1; i < z; i++) {
    const y = v(i);
    if ((y > v(i - 1) && y >= v(i + 1)) || (y < v(i - 1) && y <= v(i + 1))) {
      if (Math.abs(y - last) < 0.7) continue;
      ex.push(`${y.toFixed(1)}@${(((i - a) * 1000) / fs).toFixed(0)}`);
      last = y;
    }
  }
  // T extrema between J+60 and T end + 40
  const tex: string[] = [];
  last = v(I(b.qrsOffMs + 60));
  for (let i = I(b.qrsOffMs + 60) + 1; i < I(b.tOffMs + 40); i++) {
    const y = v(i);
    if ((y > v(i - 1) && y >= v(i + 1)) || (y < v(i - 1) && y <= v(i + 1))) {
      if (Math.abs(y - last) < 0.4) continue;
      tex.push(`${y.toFixed(1)}@${(((i - a) * 1000) / fs).toFixed(0)}`);
      last = y;
    }
  }
  const j = v(z), j40 = v(I(b.qrsOffMs + 40)), j80 = v(I(b.qrsOffMs + 80));
  console.log(`${l.padEnd(4)} QRS[${ex.join(' ')}]  J ${j.toFixed(1)} J40 ${j40.toFixed(1)} J80 ${j80.toFixed(1)}  T[${tex.join(' ')}]`);
}

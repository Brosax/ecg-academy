// dbg_prof.ts — time the pipeline stages for one condition (dev)
import { buildModel, simulate } from './model.ts';
import { CONDITIONS } from './conditions.ts';
import { generate } from './synth.ts';
const id = process.argv[2] || 'normal';
let t = performance.now();
generate(id, { fs: 500, durationS: 1, seed: 1 });
console.log('warm', (performance.now() - t).toFixed(0));
t = performance.now();
const p = CONDITIONS[id].params(1);
const m = buildModel(p, 1);
console.log('buildModel', (performance.now() - t).toFixed(0), 'graph nodes', m.graph.n, 'edges', m.graph.to.length);
t = performance.now();
const a = simulate(m, 10000, 1);
console.log('simulate', (performance.now() - t).toFixed(0), 'acts', a.count);
t = performance.now();
generate(id, { fs: 500, durationS: 10, seed: 1 });
console.log('generate 10s', (performance.now() - t).toFixed(0));

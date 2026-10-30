// dbg_rr.ts — RR intervals of a 10 s run (dev). usage: node dbg_rr.ts <id> ['<ovr>']
import { generate } from './synth.ts';
if (process.argv[3]) process.env.FIELD_COVR = process.argv[3];
const r = generate(process.argv[2] || 'afib', { fs: 500, durationS: 10, seed: Number(process.env.SEED || 1) });
const on = r.truth.beats.map((b) => b.qrsOnMs); const rr = on.slice(1).map((t, k) => t - on[k]);
console.log('HR', r.truth.hrBpm.toFixed(0), 'n', on.length, 'RR', rr.map((x) => x.toFixed(0)).join(' '));

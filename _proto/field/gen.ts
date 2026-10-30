// gen.ts — generate all benchmark conditions (10 s, fs 500, seed 1) to out/<id>.json + out/<id>.truth.json
// usage: node gen.ts [id ...]
import { generate, LEADS } from './synth.ts';
import { CONDITIONS } from './conditions.ts';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('./out/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CONDITIONS);
const fs = 500, durationS = 10, seed = 1;
// warm the lead-field caches so per-condition timings measure the model, not the one-off BEM solve
{ const t = performance.now(); generate('normal', { fs, durationS: 1, seed }); console.log('warm-up (BEM + lead weights, cached afterwards):', (performance.now() - t).toFixed(0), 'ms'); }
const times: number[] = [];
for (const id of ids) {
  const t = performance.now();
  const r = generate(id, { fs, durationS, seed });
  const ms = performance.now() - t;
  times.push(ms);
  const leads: Record<string, number[]> = {};
  for (const l of LEADS) leads[l] = Array.from(r.leads[l], (v) => Math.round(v * 1e5) / 1e5);
  writeFileSync(new URL(id + '.json', OUT), JSON.stringify({ fs, title: id, leads }));
  const tr = { ...r.truth, beats: r.truth.beats.map((b) => ({ pOnMs: b.pOnMs === null ? null : +b.pOnMs.toFixed(1), qrsOnMs: +b.qrsOnMs.toFixed(1), qrsOffMs: +b.qrsOffMs.toFixed(1), tOffMs: +b.tOffMs.toFixed(1) })) };
  writeFileSync(new URL(id + '.truth.json', OUT), JSON.stringify(tr, null, 1));
  const t2 = r.truth;
  console.log(`${id.padEnd(16)} ${ms.toFixed(0).padStart(6)} ms   HR ${t2.hrBpm.toFixed(0)}  PR ${t2.prMs === null ? '-' : t2.prMs.toFixed(0)}  QRS ${t2.qrsMs.toFixed(0)}  QT ${t2.qtMs.toFixed(0)}  axis ${t2.qrsAxisDeg.toFixed(0)}  beats ${t2.beats.length}  ${t2.rhythm}`);
}
console.log('mean ms per 10 s 12-lead:', (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0));

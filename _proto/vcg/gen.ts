/**
 * Generate every benchmark condition (10 s, 500 Hz, seed 1) to out/<id>.json + out/<id>.truth.json and print the
 * generation time per condition.   Usage:  node gen.ts [id ...]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { generate } from './synth.ts';
import { BENCHMARK_IDS } from './conditions.ts';
import { LEADS } from './leads.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });

const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...BENCHMARK_IDS];
const opts = { fs: 500, durationS: 10, seed: 1 };

// warm-up (JIT) so the timings reflect steady state
generate(ids[0]!, opts);

for (const id of ids) {
  const reps = 5;
  const t0 = performance.now();
  let res = generate(id, opts);
  for (let r = 1; r < reps; r++) res = generate(id, opts);
  const ms = (performance.now() - t0) / reps;
  const leads: Record<string, number[]> = {};
  for (const l of LEADS) leads[l] = Array.from(res.leads[l], (v) => Math.round(v * 1e6) / 1e6);
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify({ fs: opts.fs, title: id, leads }));
  writeFileSync(join(outDir, `${id}.truth.json`), JSON.stringify(res.truth, null, 1));
  const t = res.truth;
  console.log(
    `${id.padEnd(16)} ${ms.toFixed(2).padStart(6)} ms/10 s 12-lead | HR ${t.hrBpm.toFixed(0)} PR ${t.prMs === null ? '—' : t.prMs.toFixed(0)} ` +
      `QRS ${t.qrsMs.toFixed(0)} QT ${t.qtMs.toFixed(0)} axis ${t.qrsAxisDeg.toFixed(0)}° ${t.rhythm}`,
  );
}

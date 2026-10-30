/**
 * Generate every benchmark condition (10 s, fs 500, seed 1) → out/<id>.json + out/<id>.truth.json.
 * Usage: node gen.ts [id ...]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from './synth.ts';
import { BENCHMARK_IDS } from './conditions.ts';
import { LEADS } from './leadfield.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });

const ids = process.argv.length > 2 ? process.argv.slice(2) : BENCHMARK_IDS;
const opts = { fs: 500, durationS: 10, seed: 1 };
for (const id of ids) {
  const t0 = performance.now();
  const res = generate(id, opts);
  const t1 = performance.now();
  const leads: Record<string, number[]> = {};
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4, r5 = (v: number) => Math.round(v * 1e5) / 1e5;
  for (const l of LEADS) leads[l] = Array.from(res.leads[l], r4);
  // the written file keeps the limb identities exactly (to double precision): III, aVR, aVL, aVF are re-derived from
  // the rounded I and II (the Goldberger leads need one more decimal) instead of being rounded on their own
  const I = leads.I, II = leads.II;
  leads.III = I.map((a, i) => r4(II[i] - a));
  leads.aVR = I.map((a, i) => r5(-(a + II[i]) / 2));
  leads.aVL = I.map((a, i) => r5(a - II[i] / 2));
  leads.aVF = I.map((a, i) => r5(II[i] - a / 2));
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify({ fs: opts.fs, title: id, leads }));
  writeFileSync(join(outDir, `${id}.truth.json`), JSON.stringify(res.truth, null, 1));
  const t2 = performance.now();
  // steady state: median of 5 further runs (geometry, lead weights and conduction graph are cached per heart)
  const runs: number[] = [];
  for (let k = 0; k < 5; k++) { const a = performance.now(); generate(id, opts); runs.push(performance.now() - a); }
  runs.sort((a, b) => a - b);
  const warm = runs[2];
  console.log(`${id.padEnd(16)} generate ${(t1 - t0).toFixed(1).padStart(7)} ms (warm median ${warm.toFixed(1)} ms), write ${(t2 - t1).toFixed(1)} ms` +
    `  HR ${res.truth.hrBpm} PR ${res.truth.prMs} QRS ${res.truth.qrsMs} QT ${res.truth.qtMs} axis ${res.truth.qrsAxisDeg}`);
}

// dev (review): max |difference| (mm) per lead between the current engine and a reference out/ folder
// Usage: node dev/cmp_ref.ts <refDir> [id ...]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generate } from '../synth.ts';
import { BENCHMARK_IDS } from '../conditions.ts';
import { LEADS } from '../leadfield.ts';
const [ref, ...rest] = process.argv.slice(2);
const ids = rest.length ? rest : BENCHMARK_IDS;
for (const id of ids) {
  const t0 = performance.now();
  const r = generate(id, { fs: 500, durationS: 10, seed: 1 });
  const ms = performance.now() - t0;
  const old = JSON.parse(readFileSync(join(ref, `${id}.json`), 'utf8')).leads;
  const out: string[] = [];
  let worst = 0;
  for (const l of LEADS) { let m = 0; const a = r.leads[l], b = old[l]; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); worst = Math.max(worst, m); out.push(`${l} ${(m * 10).toFixed(2)}`); }
  console.log(`${id.padEnd(15)} max ${(worst * 10).toFixed(2)} mm (${ms.toFixed(0)} ms) | ${out.join(' ')}`);
}

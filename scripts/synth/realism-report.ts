/**
 * Dev report: T4 realism (tests/synth/realism.ts) per scenario over seeds 1–5, with the outlying features. With
 * --write it records the current fractions (rounded down to 0.01) as the ratchet floors in
 * tests/synth/fixtures/t4-floors.json, never lowering an existing floor.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/realism-report.ts [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate } from '../../src/synth/index';
import { measure } from '../../tests/synth/oracle/measure';
import { checkFeatures, SCENARIO_CLASS } from '../../tests/synth/realism';

const OUT = fileURLToPath(new URL('../../tests/synth/fixtures/t4-floors.json', import.meta.url));
let floors: Record<string, number> = {};
try {
  floors = (JSON.parse(readFileSync(OUT, 'utf8')) as { floors: Record<string, number> }).floors;
} catch {
  /* first run */
}
for (const [id, cls] of Object.entries(SCENARIO_CLASS)) {
  let inside = 0, total = 0;
  const outl = new Map<string, string>();
  for (let seed = 1; seed <= 5; seed++) {
    const r = generate({ scenario: id, seed });
    for (const c of checkFeatures(measure(r.ecg.signal.leads, r.ecg.signal.fs), cls)) {
      total++;
      if (c.inside) inside++;
      else outl.set(c.name, `${c.name} ${c.value.toFixed(3)} [${c.env.p5}, ${c.env.p95}]`);
    }
  }
  const frac = inside / total;
  console.log(`${id.padEnd(22)} ${cls.padEnd(6)} ${(100 * frac).toFixed(1)} %  floor ${floors[id] ?? '—'}  outliers: ${[...outl.values()].join('; ')}`);
  if (process.argv.includes('--write')) floors[id] = Math.max(floors[id] ?? 0, Math.floor(100 * frac) / 100);
}
if (process.argv.includes('--write')) {
  writeFileSync(OUT, `${JSON.stringify({ _note: 'T4 ratchet floors: fraction of oracle features inside the PTB-XL class 5–95 % envelope (seeds 1–5). Only raise them (scripts/synth/realism-report.ts --write). Target ≥ 0.90.', floors }, null, 1)}\n`);
  console.log(`wrote ${OUT}`);
}

/**
 * Writes tests/synth/fixtures/golden.json: per scenario (and variant) the seed-1 signal hash and truth summary used by
 * the T7 test (tests/synth/determinism.test.ts). Run after a deliberate engine change, then re-render and review the
 * gallery (scripts/synth/gallery.ts) before committing the new fixture.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/golden.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate } from '../../src/synth/index';
import { GOLDEN_SEED, signalHash, truthSummary } from '../../tests/synth/golden';
import { allCases } from '../../tests/synth/helpers';

const OUT = fileURLToPath(new URL('../../tests/synth/fixtures/golden.json', import.meta.url));
let old: Record<string, { signal: string; truth: string }> = {};
try {
  old = (JSON.parse(readFileSync(OUT, 'utf8')) as { cases: typeof old }).cases;
} catch {
  /* first run */
}
const cases: Record<string, { signal: string; truth: string }> = {};
for (const c of allCases()) {
  const r = generate({ scenario: c.id, variant: c.variant, seed: GOLDEN_SEED });
  cases[c.name] = { signal: signalHash(r), truth: truthSummary(r) };
  const o = old[c.name];
  const tag = !o ? 'new' : o.signal === cases[c.name].signal ? 'same' : 'CHANGED';
  console.log(`${tag.padEnd(7)} ${c.name.padEnd(28)} ${cases[c.name].truth}`);
}
writeFileSync(OUT, `${JSON.stringify({ _note: 'T7 golden hashes (seed 1). Regenerate with scripts/synth/golden.ts after a reviewed engine change.', seed: GOLDEN_SEED, cases }, null, 1)}\n`);
console.log(`wrote ${OUT}`);

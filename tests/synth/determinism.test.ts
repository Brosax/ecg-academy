/**
 * T7 determinism (DECISION §8.2): the same request gives byte-identical arrays — also after other scenarios were
 * generated first (no cache may make the output depend on call history) — and every scenario matches its golden hash
 * (seed 1). A changed hash is a deliberate engine change: regenerate the fixture AND re-render the review gallery:
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/golden.ts
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/gallery.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STD_LEADS } from '../../src/core/leads';
import { generate } from '../../src/synth';
import { GOLDEN_SEED, signalHash, truthSummary } from './golden';
import { allCases } from './helpers';

const FIXTURE = fileURLToPath(new URL('./fixtures/golden.json', import.meta.url));

function sameArrays(a: ReturnType<typeof generate>, b: ReturnType<typeof generate>): boolean {
  for (const l of STD_LEADS) {
    const x = a.ecg.signal.leads[l], y = b.ecg.signal.leads[l];
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (!Object.is(x[i], y[i])) return false;
  }
  return true;
}

describe('determinism', () => {
  it('same request → byte-identical leads, independent of what was generated before', () => {
    const req = { scenario: 'stemi-anterior', seed: 11 } as const;
    const first = generate(req);
    // disturb every cache (shapes, gains, region graph) with other scenarios and seeds
    for (const c of allCases()) generate({ scenario: c.id, variant: c.variant, seed: 5 });
    const second = generate(req);
    expect(sameArrays(first, second)).toBe(true);
    expect(JSON.stringify(second.ecg.truth)).toBe(JSON.stringify(first.ecg.truth));
  });

  it('different seeds give different ECGs (natural variability)', () => {
    const a = generate({ scenario: 'normal', seed: 1 }), b = generate({ scenario: 'normal', seed: 2 });
    expect(sameArrays(a, b)).toBe(false);
  });

  it('golden hashes match tests/synth/fixtures/golden.json (seed 1, A serialisation rule)', () => {
    expect(existsSync(FIXTURE), 'golden fixture missing: run scripts/synth/golden.ts').toBe(true);
    const golden = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { cases: Record<string, { signal: string; truth: string }> };
    const names = allCases().map((c) => c.name);
    expect(Object.keys(golden.cases).sort(), 'scenario set changed: regenerate the golden fixture').toEqual([...names].sort());
    const changed: string[] = [];
    for (const c of allCases()) {
      const r = generate({ scenario: c.id, variant: c.variant, seed: GOLDEN_SEED });
      const g = golden.cases[c.name];
      if (g.signal !== signalHash(r) || g.truth !== truthSummary(r)) changed.push(`${c.name}: ${g.truth} → ${truthSummary(r)}`);
    }
    expect(changed, 'engine output changed: regenerate the golden fixture and re-review the gallery').toEqual([]);
  });
});

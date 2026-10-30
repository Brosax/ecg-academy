/**
 * Practice against the REAL synthetic engine (src/synth) and its live catalogue: every family the hub offers today
 * generates valid items at every difficulty, and their keys agree with the model truth of the tracing they show.
 * Guards the contract between the generators and the engine as both grow. Skipped only when the engine cannot render
 * even the normal scenario (it is built in parallel).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isFindingId } from '../../../src/core/findings';
import type { Item } from '../../../src/practice/api';
import { FAMILY_SPECS, familyAvailable } from '../../../src/practice/core/families';
import { resolvePool } from '../../../src/practice/core/gen/common';
import { generateItem } from '../../../src/practice/core/generate';
import { gradeItem } from '../../../src/practice/core/grade';
import { ecgOf, setPracticePorts } from '../../../src/practice/core/ports';
import { generate } from '../../../src/synth/index';
import { fakeReal } from '../fake';
import { validate } from '../validate';

let engineOk = false;

beforeAll(() => {
  setPracticePorts({ synth: null, real: fakeReal });
  try {
    engineOk = generate({ scenario: 'normal', seed: 1 }).ecg.truth !== null;
  } catch {
    engineOk = false;
  }
});
afterAll(() => setPracticePorts({ synth: null, real: null }));

/** Answer that the grader must accept as fully correct (the key itself). */
function keyAnswer(item: Item) {
  switch (item.kind) {
    case 'rate':
      return { kind: 'number', value: item.key.truthBpm } as const;
    case 'measure':
    case 'qtc':
      return { kind: 'number', value: item.key.truthMs } as const;
    case 'axis':
      return { kind: 'number', value: item.key.truthDeg } as const;
    case 'choice':
      return { kind: 'choice', id: item.key.correct } as const;
    case 'compare':
      return { kind: 'choice', id: item.key.correct } as const;
    case 'findings':
      return { kind: 'multi', ids: item.key.correct } as const;
    default:
      return null;
  }
}

describe('practice on the real synthetic engine', () => {
  const synthFamilies = FAMILY_SPECS.filter((s) => s.source === 'synth');

  it('offers at least one drill for most competencies, and the measurement basics', (ctx) => {
    if (!engineOk) ctx.skip();
    for (const id of ['rate', 'measure-pr', 'measure-qrs', 'measure-qt', 'qtc', 'axis-degrees', 'sinus', 'occlusion', 'report']) expect(familyAvailable(id), id).toBe(true);
  });

  for (const spec of synthFamilies) {
    it(`${spec.id}: available ⇒ valid, self-consistent items at every difficulty`, async (ctx) => {
      if (!engineOk) ctx.skip();
      if (!familyAvailable(spec)) {
        // an unavailable family with an empty pool must fail loudly, never produce a broken item
        if (spec.pool && resolvePool(spec.pool).length === 0) await expect(generateItem(spec.id, 1)).rejects.toThrow();
        return;
      }
      for (const d of spec.difficulties) {
        for (const seed of [1, 2]) {
          const item = await generateItem(spec.id, seed, d);
          validate(item, spec.id);
          const ecg = await ecgOf(item.ecg);
          const truth = ecg.truth;
          expect(truth, item.id).not.toBeNull();
          if (!truth) continue;
          // single-choice items over findings: the answer is on the tracing
          if (item.kind === 'choice' && isFindingId(item.key.correct) && !['spot', 'triage', 'sinus', 'p-qrs', 'paper'].includes(spec.id)) {
            expect(truth.findings, item.id).toContain(item.key.correct);
          }
          if (item.kind === 'findings') for (const f of item.key.correct) expect(truth.findings, item.id).toContain(f);
          if (item.kind === 'rate') {
            expect(item.key.truthBpm).toBeGreaterThan(15);
            expect(item.key.truthBpm).toBeLessThan(450);
          }
          if (item.kind === 'measure') expect(item.key.truthMs, item.id).toBeGreaterThan(0);
          if (item.kind === 'locate') for (const t of item.key.targets) expect(t.t1).toBeLessThanOrEqual(ecg.signal.durationMs + 1);
          if (item.kind === 'compare') await expect(ecgOf(item.ecg2)).resolves.toBeDefined();
          const a = keyAnswer(item);
          if (a) expect(gradeItem(item, a).verdict, item.id).toBe('correct');
        }
      }
    });
  }
});

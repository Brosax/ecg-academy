import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COMPETENCIES, type CompetencyId, type Mastery } from '../../../src/practice/api';
import { difficultyFor, examAllocation, examBlueprint, examSummary, fit, interleave, planMixed, planReviews, reviewEntry } from '../../../src/practice/core/adaptive';
import { getSpec } from '../../../src/practice/core/families';
import { generateItem } from '../../../src/practice/core/generate';
import { masteryFrom } from '../../../src/practice/core/mastery';
import { setPracticePorts } from '../../../src/practice/core/ports';
import { createRng } from '../../../src/core/rng';
import { fakeReal, fakeSynth } from '../fake';

beforeAll(() => setPracticePorts({ synth: fakeSynth, real: fakeReal }));
afterAll(() => setPracticePorts({ synth: null, real: null }));

const none = (): Mastery => masteryFrom([]);

describe('exam blueprint', () => {
  it('allocates exactly the length, every competency once from 12 items, occlusion and arrhythmia weighted double', () => {
    for (const n of [12, 20, 30, 40]) {
      const a = examAllocation(n);
      expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(n);
      for (const c of COMPETENCIES) expect(a[c]).toBeGreaterThanOrEqual(1);
    }
    const a = examAllocation(40);
    expect(a.C8).toBeGreaterThan(a.C1);
    expect(a.C9).toBeGreaterThan(a.C12);
    expect(Object.values(examAllocation(6)).reduce((x, y) => x + y, 0)).toBe(6);
  });

  it('is deterministic, uses real families when asked, and every entry generates', async () => {
    const a = examBlueprint({ length: 20, includeReal: true, seed: 5 });
    const b = examBlueprint({ length: 20, includeReal: true, seed: 5 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(20);
    const comps = new Set(a.map((e) => getSpec(e.family)?.competency));
    expect(comps.size).toBe(12);
    const withReal = [1, 2, 3, 4, 5, 6].some((seed) => examBlueprint({ length: 30, includeReal: true, seed }).some((e) => getSpec(e.family)?.source === 'real'));
    expect(withReal).toBe(true);
    expect(examBlueprint({ length: 30, includeReal: false, seed: 1 }).every((e) => getSpec(e.family)?.source === 'synth')).toBe(true);
    for (const e of a) {
      const item = await generateItem(e.family, e.seed, e.difficulty);
      expect(item.family).toBe(e.family);
    }
  });

  it('summarises by competency with a separate count of missed critical findings', () => {
    const s = examSummary([
      { competency: 'C8', score: 0, missedCritical: true },
      { competency: 'C8', score: 1 },
      { competency: 'C2', score: 0.5 },
    ]);
    expect(s.total).toBeCloseTo(0.5, 12);
    expect(s.byCompetency.C8).toEqual({ n: 2, score: 0.5 });
    expect(s.missedCritical).toBe(1);
  });
});

describe('adaptive mixed mode and reviews', () => {
  it('difficulty follows accuracy, and fits each family', () => {
    expect(difficultyFor(null)).toBe('classic');
    expect(difficultyFor(0.7)).toBe('subtle');
    expect(difficultyFor(0.85)).toBe('noisy');
    expect(difficultyFor(0.95)).toBe('borderline');
    expect(fit({ difficulties: ['classic', 'subtle', 'noisy'] }, 'borderline')).toBe('noisy');
    expect(fit({ difficulties: ['classic'] }, 'noisy')).toBe('classic');
  });

  it('weights weak competencies and interleaves due reviews, deterministically', () => {
    const weak: CompetencyId = 'C6';
    const mastery = (c: CompetencyId) => (c === weak ? masteryFrom(Array(20).fill(0)) : masteryFrom(Array(20).fill(1)));
    const due = [{ key: 'finding:av-block-3', box: 1 as const, due: 0 }];
    const plan = planMixed({ seed: 3, count: 20, mastery, due });
    expect(plan).toEqual(planMixed({ seed: 3, count: 20, mastery, due }));
    expect(plan).toHaveLength(20);
    const c6 = plan.filter((e) => getSpec(e.family)?.competency === weak).length;
    expect(c6).toBeGreaterThan(5);
    expect(plan.some((e) => e.card === 'finding:av-block-3' && e.focus === 'av-block-3')).toBe(true);
    for (let i = 1; i < plan.length; i++) if (plan[i].family === plan[i - 1].family) expect(new Set(plan.map((p) => p.family)).size).toBeLessThan(3);
  });

  it('plans without any progress', () => {
    expect(planMixed({ seed: 1, count: 10, mastery: none, due: [] })).toHaveLength(10);
  });

  it('maps review cards to families (finding cards with focus)', () => {
    const rng = createRng(1);
    expect(reviewEntry({ key: 'rate', box: 3, due: 0 }, rng)).toMatchObject({ family: 'rate', difficulty: 'subtle', card: 'rate' });
    expect(reviewEntry({ key: 'finding:lbbb', box: 1, due: 0 }, rng)).toMatchObject({ focus: 'lbbb' });
    expect(reviewEntry({ key: 'unknown-family', box: 1, due: 0 }, rng)).toBeNull();
    expect(planReviews([{ key: 'finding:pvc', box: 2, due: 0 }, { key: 'qtc', box: 1, due: 0 }], 9)).toHaveLength(2);
  });

  it('interleave separates neighbours of the same family when possible', () => {
    const xs = ['a', 'a', 'b', 'b', 'c'].map((family) => ({ family }));
    const out = interleave(xs);
    for (let i = 1; i < out.length; i++) expect(out[i].family).not.toBe(out[i - 1].family);
  });
});

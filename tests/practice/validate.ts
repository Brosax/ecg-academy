/**
 * Shared structural check of a generated practice item (used by the fake-provider and the real-engine tests): id,
 * family, competency, three-language text, finding ids, and a key that is internally consistent for its kind.
 */
import { expect } from 'vitest';
import { FINDINGS, isFindingId, type FindingId } from '../../src/core/findings';
import type { Item } from '../../src/practice/api';
import { FAMILY_SPECS } from '../../src/practice/core/families';
import { qtcOf } from '../../src/practice/core/grade';
import { parseItemId } from '../../src/practice/core/generate';
import { nonEmptyL10n } from '../../src/practice/core/text';

export function validate(item: Item, family: string, topic?: FindingId): void {
  const spec = FAMILY_SPECS.find((s) => s.id === family);
  expect(spec).toBeDefined();
  expect(item.family).toBe(family);
  expect(item.kind).toBe(spec?.kind);
  expect(item.competency).toBe(spec?.competency);
  expect(item.id).toBe(topic ? `${family}:${item.difficulty}:${item.seed}:${topic}` : `${family}:${item.difficulty}:${item.seed}`);
  expect(parseItemId(item.id)).toEqual({ family, difficulty: item.difficulty, seed: item.seed, ...(topic ? { topic } : {}) });
  expect(nonEmptyL10n(item.prompt)).toBe(true);
  expect(nonEmptyL10n(item.explanation)).toBe(true);
  if (item.hint) expect(nonEmptyL10n(item.hint)).toBe(true);
  for (const f of item.findings) expect(isFindingId(f)).toBe(true);
  switch (item.kind) {
    case 'rate':
      expect(item.key.truthBpm).toBeGreaterThan(0);
      expect(item.key.minTolBpm).toBeGreaterThanOrEqual(5);
      break;
    case 'measure':
      expect(item.key.truthMs).toBeGreaterThan(0);
      expect(item.key.toleranceMs).toBeGreaterThanOrEqual(20);
      break;
    case 'qtc':
      expect(Math.abs(item.key.truthMs - qtcOf(item.key.formula, item.key.qtMs, item.key.rrMs))).toBeLessThanOrEqual(1);
      expect(item.key.toleranceMs).toBe(30);
      break;
    case 'axis':
      expect(Number.isFinite(item.key.truthDeg)).toBe(true);
      expect(item.key.fullDeg).toBe(20);
      expect(item.key.partialDeg).toBe(30);
      break;
    case 'choice': {
      const ids = item.key.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(2);
      expect(ids).toContain(item.key.correct);
      for (const o of item.key.options) expect(nonEmptyL10n(o.label)).toBe(true);
      break;
    }
    case 'findings':
      expect(item.key.correct.length).toBeGreaterThan(0);
      for (const c of item.key.correct) expect(item.key.options).toContain(c);
      expect(new Set(item.key.options).size).toBe(item.key.options.length);
      break;
    case 'locate':
      expect(item.key.targets.length).toBeGreaterThan(0);
      for (const t of item.key.targets) expect(t.t1).toBeGreaterThan(t.t0);
      break;
    case 'occlusion':
      expect(['occlusion', 'indeterminate', 'not-occlusion']).toContain(item.key.call);
      if (item.key.mimic) expect(item.key.mimicOptions).toContain(item.key.mimic);
      if (item.key.territory) expect(item.key.territoryOptions?.map((o) => o.id)).toContain(item.key.territory);
      break;
    case 'report':
      for (const f of item.key.findings) expect(isFindingId(f)).toBe(true);
      if (item.key.rhythm) expect(FINDINGS[item.key.rhythm]).toBeDefined();
      break;
    case 'compare':
      expect(['left', 'right']).toContain(item.key.correct);
      expect(item.ecg2).toBeDefined();
      break;
  }
}

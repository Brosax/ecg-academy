/**
 * Heart Lab links from a lesson (src/course/lab.ts): one link per lab scenario, in the lesson's finding order, only for
 * findings the lab can show and only while the shell routes #/lab.
 */
import { describe, expect, it } from 'vitest';
import { labLinks } from '../../src/course/lab';
import type { FindingId } from '../../src/core/findings';

describe('labLinks', () => {
  const table: Partial<Record<FindingId, string>> = { rbbb: '#/lab/rbbb', lbbb: '#/lab/lbbb', 'sinus-rhythm': '#/lab/nsr', 'normal-ecg': '#/lab/nsr' };
  const hrefOf = (f: FindingId) => table[f] ?? null;

  it('one link per scenario, first finding names it, unknown findings skipped', () => {
    const out = labLinks(['normal-ecg', 'sinus-rhythm', 'brugada-type1', 'rbbb'], hrefOf, () => true);
    expect(out).toEqual([
      { finding: 'normal-ecg', href: '#/lab/nsr' },
      { finding: 'rbbb', href: '#/lab/rbbb' },
    ]);
  });

  it('no links while the shell does not route them', () => {
    expect(labLinks(['rbbb', 'lbbb'], hrefOf, () => false)).toEqual([]);
  });

  it('with the real lab table and router, links are lab routes', () => {
    for (const x of labLinks(['rbbb', 'lbbb', 'atrial-fibrillation'])) expect(x.href).toMatch(/^#\/lab\/[a-z0-9-]+$/);
  });
});

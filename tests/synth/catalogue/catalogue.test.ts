/**
 * Catalogue (DECISION §9): unique ids, group membership, every scenario and variant generates, filters work, the 12
 * bake-off benchmarks exist under their §9 ids, every scenario declares its hallmark criteria (tests/synth/oracle/
 * criteria), and every FindingId of src/core/findings.ts is produced (declared or derived) by at least one scenario
 * or variant at seed 1 — the catalogue covers the whole taxonomy (M6: nothing pending).
 */
import { describe, expect, it } from 'vitest';
import { FINDING_LIST, type FindingId } from '../../../src/core/findings';
import { SCENARIO_GROUPS, scenarios } from '../../../src/synth';
import { CRITERIA } from '../oracle/criteria';
import { allCases, gen } from '../helpers';

/** The bake-off benchmarks (DECISION §0, §12.2) under their catalogue ids. */
const BENCHMARKS = ['normal', 'rbbb', 'lbbb', 'stemi-anterior', 'stemi-inferior', 'lvh-strain', 'wpw', 'brugada-type1', 'atrial-flutter', 'hyperkalemia', 'atrial-fibrillation', 'vt-monomorphic'] as const;

describe('catalogue', () => {
  it('has unique ids and every scenario sits in a known group', () => {
    const ids = scenarios().map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of scenarios()) expect(SCENARIO_GROUPS).toContain(d.group);
  });

  it('contains the 12 bake-off benchmarks', () => {
    const ids = new Set(scenarios().map((d) => d.id));
    for (const b of BENCHMARKS) expect(ids.has(b), b).toBe(true);
  });

  it('filters by group and by finding', () => {
    expect(scenarios({ group: 'normal' }).every((d) => d.group === 'normal')).toBe(true);
    expect(scenarios({ group: 'normal' }).length).toBeGreaterThanOrEqual(8);
    expect(scenarios({ finding: 'rbbb' }).map((d) => d.id)).toContain('rbbb');
    // a finding declared only by a variant is found too
    expect(scenarios({ finding: 'av-block-1' }).map((d) => d.id)).toContain('athlete');
  });

  it('every scenario and variant generates at 3 seeds with truth and region states', () => {
    for (const c of allCases()) {
      for (const seed of [1, 2, 3]) {
        const r = gen({ scenario: c.id, variant: c.variant, seed });
        expect(r.ecg.truth, c.name).not.toBeNull();
        expect(r.ecg.regions, c.name).not.toBeNull();
        expect(r.ecg.origin).toEqual({ kind: 'synthetic', scenarioId: c.id, seed });
        expect(r.ecg.signal.leads.I.length).toBe(5000);
      }
    }
  });

  it('every scenario declares its hallmark criteria (tests/synth/oracle/criteria)', () => {
    const missing = scenarios().map((d) => d.id).filter((id) => !CRITERIA[id]);
    expect(missing).toEqual([]);
    const unknown = Object.keys(CRITERIA).filter((id) => !scenarios().some((d) => d.id === id));
    expect(unknown).toEqual([]);
  });

  it('every FindingId of src/core/findings.ts is produced by at least one scenario', () => {
    const produced = new Set<FindingId>();
    for (const c of allCases()) {
      const t = gen({ scenario: c.id, variant: c.variant, seed: 1 }).ecg.truth!;
      for (const f of t.findings) produced.add(f);
    }
    const gap = FINDING_LIST.map((f) => f.id).filter((f) => !produced.has(f));
    expect(gap, 'findings produced by no scenario').toEqual([]);
  });
});

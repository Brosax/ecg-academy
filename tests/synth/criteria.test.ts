/**
 * T3 textbook criteria (DECISION §8.2): for every scenario (and variant) × 3 seeds, the hallmark criteria of §9 hold on
 * the clean delivered ECG as measured by the independent oracle, and so does the generic sanity set (minus the
 * scenario's declared opt-outs). Criteria live in tests/synth/oracle/criteria/<group>.ts under the scenario id.
 */
import { describe, expect, it } from 'vitest';
import { scenarios } from '../../src/synth';
import { allCases, gen } from './helpers';
import { measure } from './oracle/measure';
import { CRITERIA, GENERIC, GENERIC_IDS, VARIANT_CRITERIA, type CriterionCtx } from './oracle/criteria';

describe('textbook criteria (T3)', () => {
  for (const c of allCases()) {
    const def = scenarios().find((d) => d.id === c.id)!;
    const sc = CRITERIA[c.id];
    it(`${c.name} × seeds 1–3`, () => {
      expect(sc, `no criteria declared for '${c.id}'`).toBeDefined();
      const fails: string[] = [];
      for (const seed of [1, 2, 3]) {
        const r = gen({ scenario: c.id, variant: c.variant, seed });
        const leads = r.ecg.signal.leads;
        const ctx: CriterionCtx = { m: measure(leads, r.ecg.signal.fs), leads, fs: r.ecg.signal.fs, def, variant: c.variant };
        for (const g of GENERIC_IDS) {
          if (sc.optOut?.[g]) continue;
          const msg = GENERIC[g](ctx);
          if (msg) fails.push(`seed ${seed} [generic ${g}] ${msg}`);
        }
        const extra = c.variant ? (VARIANT_CRITERIA[c.id]?.[c.variant] ?? []) : [];
        for (const h of [...sc.hallmarks, ...extra]) {
          const msg = h.check(ctx);
          if (msg) fails.push(`seed ${seed} [${h.id}] ${msg}`);
        }
      }
      expect(fails).toEqual([]);
    });
  }
});

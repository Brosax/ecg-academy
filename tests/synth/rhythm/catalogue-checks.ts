/**
 * Shared catalogue checks for the rhythm groups (atrial, svt, ventricular, av-block, pacing): every scenario and
 * variant generates a truth whose rhythm label and findings match the declaration, its variant labels are written in
 * the three languages, its highlights name real regions and its dial ranges are sound. Used by
 * tests/synth/catalogue/rhythm-*.test.ts.
 */
import { expect, it } from 'vitest';
import { FINDINGS, type FindingId } from '../../../src/core/findings';
import { REGIONS } from '../../../src/core/regions';
import { scenarios, type ScenarioGroup } from '../../../src/synth';
import { gen } from '../helpers';

const SINUS = new Set<FindingId>(['sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia']);

export function rhythmGroupChecks(group: ScenarioGroup): void {
  const defs = scenarios({ group });
  it(`group '${group}' has scenarios`, () => expect(defs.length).toBeGreaterThan(0));
  for (const d of defs) {
    for (const v of [undefined, ...Object.keys(d.variants ?? {})]) {
      const name = v ? `${d.id}--${v}` : d.id;
      it(`${name}: truth matches the declaration`, () => {
        const declared = v ? (d.variants?.[v]?.findings ?? d.findings) : d.findings;
        const t = gen({ scenario: d.id, variant: v, seed: 1 }).ecg.truth!;
        // the rhythm label is the first declared rhythm finding (a sinus rhythm is named by its rate)
        const rhythm = declared.find((f) => FINDINGS[f].cat === 'rhythm');
        expect(rhythm, `${name} declares a rhythm finding`).toBeDefined();
        if (SINUS.has(rhythm!)) expect(SINUS.has(t.rhythm), `${name}: ${t.rhythm}`).toBe(true);
        else expect(t.rhythm).toBe(rhythm);
        for (const f of declared) expect(t.findings, `${name} misses ${f}`).toContain(f);
        if (d.intervals === 'not-applicable') expect(t.prMs).toBeNull();
      });
    }
    it(`${d.id}: variant labels in zh / en / es, highlights on real regions, sound dial ranges`, () => {
      for (const [k, v] of Object.entries(d.variants ?? {})) {
        for (const lang of ['zh', 'en', 'es'] as const) expect(v.label[lang].trim().length, `${d.id}--${k} ${lang}`).toBeGreaterThan(0);
        expect(v.label.zh).not.toBe(v.label.en);
        expect(v.label.es).not.toBe(v.label.en);
      }
      for (const r of Object.keys(d.highlights ?? {})) expect(REGIONS[r as keyof typeof REGIONS], r).toBeDefined();
      for (const [k, r] of Object.entries(d.dials)) expect(r!.min, k).toBeLessThan(r!.max);
    });
  }
}

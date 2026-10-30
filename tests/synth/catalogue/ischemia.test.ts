/**
 * Group 'ischemia' (DECISION §9.7): what the global tiers (T1–T3, T7) cannot see.
 *  - Supplemental leads (SynthRequest.extraLeads): RV infarction shows ST↑ in V4R, posterior MI ST↑ in V7–V9, and the
 *    controls do not; the truth carries their ST values (stMv) like the twelve standard leads.
 *  - The occlusion-MI decision: the STEMI millimetre criterion (src/synth/truth/findings.ts, criteria.md UDMI-4 / ESC 2023
 *    sex- and age-specific thresholds) applied to the oracle's J-point values separates the scenarios the way the course
 *    teaches it — a classic STEMI meets it, a subtle occlusion MI (hyperacute T, disproportionate ST↑) and its
 *    equivalents (de Winter, Wellens) do not, and a young man's normal ST elevation stays below his threshold.
 */
import { describe, expect, it } from 'vitest';
import type { Lead, StdLead } from '../../../src/core/leads';
import { STD_LEADS } from '../../../src/core/leads';
import { generate, scenarios, type SynthRequest } from '../../../src/synth';
import { stemiCriterionLeads, stemiThresholdMv, type Sex } from '../../../src/synth/truth/findings';
import { gen } from '../helpers';
import { measure, type Measurement } from '../oracle/measure';

/** criteria.md "Supplemental leads" (UDMI-4): V7–V9 ≥ 0.05 mV (≥ 0.1 mV men < 40 y); V3R / V4R ≥ 0.05 mV (≥ 0.1 mV men < 30 y). */
const SUPPLEMENTAL_MV = 0.05;
/** DECISION §9.7 hallmark of RV infarction: ST↑ ≥ 0.1 mV in V4R. */
const V4R_RV_MI_MV = 0.1;

/** J-point level (mV, against the PR segment) of any recorded lead, averaged over the oracle's dominant beats. */
function jOf(leads: Readonly<Record<string, Float32Array>>, m: Measurement, lead: string, fs: number, afterJMs = 0): number {
  const x = leads[lead];
  const k = (ms: number): number => Math.round((ms * fs) / 1000);
  let s = 0;
  for (const b of m.dominant) {
    const pr = (x[b.qrsOn - k(30)] + x[b.qrsOn - k(20)] + x[b.qrsOn - k(10)]) / 3;
    s += x[b.qrsOff + k(afterJMs)] - pr;
  }
  return s / m.dominant.length;
}

function wired(req: SynthRequest): { leads: Readonly<Record<string, Float32Array>>; m: Measurement; fs: number } {
  const r = generate(req);
  const leads = r.ecg.signal.leads as unknown as Readonly<Record<string, Float32Array>>;
  return { leads, m: measure(r.ecg.signal.leads, r.ecg.signal.fs), fs: r.ecg.signal.fs };
}

const SEEDS = [1, 2, 3];

describe('ischemia: supplemental leads', () => {
  it('RV infarction: ST↑ ≥ 0.1 mV in V4R and ≥ 0.05 mV in V3R; inferior STEMI without RV involvement stays below 0.05 mV in V4R', () => {
    for (const seed of SEEDS) {
      const rv = wired({ scenario: 'rv-infarction', seed, extraLeads: ['V3R', 'V4R'] });
      expect(jOf(rv.leads, rv.m, 'V4R', rv.fs), `rv-infarction seed ${seed} V4R`).toBeGreaterThanOrEqual(V4R_RV_MI_MV);
      expect(jOf(rv.leads, rv.m, 'V3R', rv.fs), `rv-infarction seed ${seed} V3R`).toBeGreaterThanOrEqual(SUPPLEMENTAL_MV);
      const inf = wired({ scenario: 'stemi-inferior', seed, extraLeads: ['V3R', 'V4R'] });
      expect(jOf(inf.leads, inf.m, 'V4R', inf.fs), `stemi-inferior seed ${seed} V4R`).toBeLessThan(SUPPLEMENTAL_MV);
    }
  });

  it('posterior MI (isolated, evolved, or extending an inferior STEMI): ST↑ ≥ 0.05 mV in ≥ 2 of V7–V9, mirror of the V1–V3 depression', () => {
    for (const [id, variant] of [['stemi-posterior', undefined], ['stemi-posterior', 'evolved'], ['stemi-inferior', 'posterior']] as const) {
      for (const seed of SEEDS) {
        const p = wired({ scenario: id, variant, seed, extraLeads: ['V7', 'V8', 'V9'] });
        const back = (['V7', 'V8', 'V9'] as const).map((l) => jOf(p.leads, p.m, l, p.fs));
        expect(back.filter((v) => v >= SUPPLEMENTAL_MV).length, `${id}${variant ? `--${variant}` : ''} seed ${seed}: ${back.map((v) => v.toFixed(3)).join(' ')}`).toBeGreaterThanOrEqual(2);
        expect(Math.min(p.m.feats.V1.j, p.m.feats.V2.j), `${id} V1–V2 depression`).toBeLessThan(0);
      }
    }
  });

  it('controls: the normal ECG and an anterior STEMI show no ST↑ in V4R or V7–V9', () => {
    for (const id of ['normal', 'stemi-anterior'] as const) {
      const c = wired({ scenario: id, seed: 1, extraLeads: ['V4R', 'V7', 'V8', 'V9'] });
      for (const l of ['V4R', 'V7', 'V8', 'V9']) expect(jOf(c.leads, c.m, l, c.fs), `${id} ${l}`).toBeLessThan(SUPPLEMENTAL_MV);
    }
  });

  it('extra leads leave the twelve standard leads unchanged (same heart, extra electrodes only)', () => {
    const a = generate({ scenario: 'rv-infarction', seed: 2, extraLeads: ['V4R'] });
    const b = gen({ scenario: 'rv-infarction', seed: 2 });
    for (const l of STD_LEADS) expect(Array.from(a.ecg.signal.leads[l])).toEqual(Array.from(b.ecg.signal.leads[l]));
  });
});

describe('ischemia: the occlusion-MI decision (STEMI millimetre criterion on the measured J point)', () => {
  /** the oracle's J-point ST of the standard leads, as a reader would read them */
  const measuredJ = (id: string, seed: number, variant?: string): { j: Partial<Record<Lead, number>>; sex: Sex; age: number | null } => {
    const r = gen({ scenario: id, seed, variant });
    const m = measure(r.ecg.signal.leads, r.ecg.signal.fs);
    const def = scenarios().find((d) => d.id === id)!;
    const j: Partial<Record<Lead, number>> = {};
    for (const l of STD_LEADS) j[l as StdLead] = m.feats[l].j;
    return { j, sex: def.patient?.sex ?? null, age: def.patient?.ageY ?? null };
  };
  const meets = (id: string, seed: number, variant?: string): boolean => {
    const x = measuredJ(id, seed, variant);
    return stemiCriterionLeads(x.j, x.sex, x.age).length > 0;
  };

  it('thresholds follow criteria.md (UDMI-4 / ESC 2023): V2–V3 by sex and age, supplemental leads, other leads', () => {
    expect(stemiThresholdMv('V2', 'male', 35)).toBe(0.25);
    expect(stemiThresholdMv('V3', 'male', 58)).toBe(0.2);
    expect(stemiThresholdMv('V2', 'female', 30)).toBe(0.15);
    expect(stemiThresholdMv('V2', null, null)).toBe(0.15);
    expect(stemiThresholdMv('II', 'male', 58)).toBe(0.1);
    expect(stemiThresholdMv('V8', 'male', 35)).toBe(0.1);
    expect(stemiThresholdMv('V8', 'female', 35)).toBe(0.05);
    expect(stemiThresholdMv('V4R', 'male', 25)).toBe(0.1);
    expect(stemiThresholdMv('V4R', 'male', 35)).toBe(0.05);
    // two contiguous leads are needed: one lead alone does not meet it
    expect(stemiCriterionLeads({ V2: 0.3, V3: 0.0, V1: 0.0 }, 'male', 58)).toEqual([]);
    expect(stemiCriterionLeads({ II: 0.12, aVF: 0.11 }, 'female', 70).sort()).toEqual(['II', 'aVF']);
  });

  it('classic STEMIs meet the criterion in their territory', () => {
    for (const id of ['stemi-anterior', 'stemi-inferior', 'stemi-lateral', 'stemi-anterolateral', 'rv-infarction'] as const) {
      for (const seed of SEEDS) expect(meets(id, seed), `${id} seed ${seed}`).toBe(true);
    }
  });

  // (the posterior scenario is posterolateral — it meets the criterion in V5–V6 — so it is not in this list; its V1–V3
  // depression with V7–V9 elevation is checked above)
  it('occlusion MI without STEMI criteria: subtle anterior occlusion, hyperacute T, de Winter and Wellens do not meet it', () => {
    for (const [id, variant] of [['stemi-anterior-subtle', undefined], ['hyperacute-t', undefined], ['de-winter', undefined], ['wellens', undefined], ['wellens', 'b']] as const) {
      for (const seed of SEEDS) expect(meets(id, seed, variant), `${id}${variant ? `--${variant}` : ''} seed ${seed}`).toBe(false);
    }
  });

  it('the truth does not apply the millimetre criterion to LBBB or ventricular paced complexes (Sgarbossa–Smith instead)', () => {
    for (const [id, variant] of [['lbbb', undefined], ['sgarbossa', 'smith'], ['paced-vvi', undefined]] as const) {
      const f = generate({ scenario: id, variant, seed: 1 }).ecg.truth!.facts;
      expect(f.stemiCriterionMet, `${id}${variant ? `--${variant}` : ''}`).toBe('not-applicable');
      expect(f.stemiCriterionLeads).toBe('');
    }
    expect(generate({ scenario: 'stemi-anterior', seed: 1 }).ecg.truth!.facts.stemiCriterionMet).toBe('yes');
  });

  it('mimics: the normal male-pattern ST elevation of a young man stays below his V2–V3 threshold', () => {
    const def = scenarios().find((d) => d.id === 'early-repolarization');
    if (!def) return;
    for (const seed of SEEDS) {
      const x = measuredJ('early-repolarization', seed);
      for (const l of ['V2', 'V3'] as const) expect(x.j[l]!, `early-repolarization seed ${seed} ${l}`).toBeLessThan(stemiThresholdMv(l, x.sex, x.age));
    }
  });
});

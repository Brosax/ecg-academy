/**
 * generate() with the lead-system wiring (synth-leads M5, wired by synth-finish M6): extra leads, explicit chest sites
 * and placements change only what the electrodes record — the standard leads, the truth and every other lead stay
 * bit-identical.
 */
import { describe, expect, it } from 'vitest';
import { STD_LEADS } from '../../../src/core/leads';
import { generate } from '../../../src/synth';
import { measure } from '../oracle/measure';

describe('extra leads change nothing else (bit-identical standard leads and truth)', () => {
  const cases = [
    { scenario: 'normal', seed: 3 },
    { scenario: 'stemi-anterior', seed: 1 },
    { scenario: 'atrial-fibrillation', seed: 2 },
    { scenario: 'electrode-reversal-la-ra', seed: 4 },
    { scenario: 'normal', seed: 5, recording: { gain: 0.5, adc: { lsbUv: 5, rangeMv: 5 } } },
  ] as const;
  for (const req of cases) {
    it(`${req.scenario} seed ${req.seed}${'recording' in req ? ' (gain + ADC)' : ''}`, () => {
      const a = generate(req), b = generate({ ...req, extraLeads: ['V4R', 'V8'] });
      for (const l of STD_LEADS) expect(b.ecg.signal.leads[l], l).toEqual(a.ecg.signal.leads[l]);
      const strip = (t: object): string => JSON.stringify({ ...t, stMv: {} });
      expect(strip(b.ecg.truth!)).toBe(strip(a.ecg.truth!));
    });
  }
});

describe('extra leads (V3R, V4R, V7–V9)', () => {
  const r = generate({ scenario: 'normal', seed: 1, extraLeads: ['V3R', 'V4R', 'V7', 'V8', 'V9'] });
  const L = r.ecg.signal.leads;
  const peak = (x: Float32Array): { r: number; s: number } => ({ r: Math.max(...x), s: Math.min(...x) });

  it('are delivered only when requested and leave the twelve leads unchanged', () => {
    const plain = generate({ scenario: 'normal', seed: 1 }).ecg.signal.leads;
    for (const l of STD_LEADS) expect(L[l]).toEqual(plain[l]);
    expect(plain.V4R).toBeUndefined();
    for (const l of ['V3R', 'V4R', 'V7', 'V8', 'V9'] as const) expect(L[l]?.length).toBe(5000);
  });

  it('look like a normal heart seen from the right and from behind: rS in V3R/V4R, positive R in V7–V9 falling toward V9', () => {
    const v4r = peak(L.V4R!), v3r = peak(L.V3R!), v7 = peak(L.V7!), v8 = peak(L.V8!), v9 = peak(L.V9!);
    expect(v3r.r).toBeLessThan(-v3r.s);
    expect(v4r.r).toBeLessThan(0.5 * -v4r.s);
    expect(v7.r).toBeGreaterThan(0.6);
    expect(v8.r).toBeLessThan(v7.r);
    expect(v9.r).toBeLessThan(v8.r);
  });
});

describe('explicit chest sites', () => {
  it('V1–V2 in the 2nd intercostal space: negative P in V1, inverted T in V1, smaller R in V2 (criteria.md "Electrode misplacement")', () => {
    const b = generate({ scenario: 'normal', seed: 2 }).ecg.signal.leads;
    const h = generate({ scenario: 'normal', seed: 2, recording: { placement: { chest: { V1: { ics: 2, line: 'sternal', side: 'R' }, V2: { ics: 2, line: 'sternal', side: 'L' } } } } }).ecg.signal.leads;
    const base = measure(b, 500), high = measure(h, 500);
    expect(high.feats.V1.pNeg).toBeLessThan(base.feats.V1.pNeg - 0.01);
    expect(high.feats.V1.t).toBeLessThan(0);
    expect(high.feats.V2.r).toBeLessThan(0.6 * base.feats.V2.r);
    // the limb leads do not move
    for (const l of ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V3', 'V6'] as const) expect(h[l]).toEqual(b[l]);
  });

  it('V1–V2 in the 6th intercostal space (too low): the mirror image — P and T in V1 turn upright, a smaller S', () => {
    const low = { chest: { V1: { ics: 6, line: 'sternal', side: 'R' }, V2: { ics: 6, line: 'sternal', side: 'L' } } } as const;
    for (const seed of [1, 2, 3]) {
      const b = generate({ scenario: 'normal', seed }).ecg.signal.leads;
      const h = generate({ scenario: 'normal', seed, recording: { placement: low } }).ecg.signal.leads;
      const base = measure(b, 500).feats.V1, lo = measure(h, 500).feats.V1;
      expect(-base.pNeg, `seed ${seed} standard V1 P is negative-dominant`).toBeGreaterThan(base.p);
      expect(lo.p, `seed ${seed} low V1 P is upright-dominant`).toBeGreaterThan(-lo.pNeg);
      expect(base.t, `seed ${seed}`).toBeLessThan(0);
      expect(lo.t, `seed ${seed}`).toBeGreaterThan(0.03);
      expect(Math.abs(lo.s), `seed ${seed}`).toBeLessThan(0.8 * Math.abs(base.s));
      for (const l of ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V3', 'V4', 'V5', 'V6'] as const) expect(h[l], `seed ${seed} ${l}`).toEqual(b[l]);
    }
  });
});

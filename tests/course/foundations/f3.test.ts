import { describe, expect, it } from 'vitest';
import { sampleAt } from '../../../src/core/ecg';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../../src/core/leads';
import { generate } from '../../../src/synth';
import { CHEST_SOURCE, isAxisCorrect, isChestPredictionCorrect, isPairCorrect, isReferenceCorrect, isSumCorrect, leadGeometry, limbWindow } from '../../../src/course/foundations/f3.math';

describe('F3: the triangle becomes axes by translation only', () => {
  for (const lead of LIMB_LEADS) it(lead, () => {
    const start = leadGeometry(lead, 0);
    const dx = start.x2 - start.x1, dy = start.y2 - start.y1;
    for (const t of [0, .2, .5, .9, 1]) {
      const a = leadGeometry(lead, t);
      expect(a.x2 - a.x1).toBeCloseTo(dx, 10);
      expect(a.y2 - a.y1).toBeCloseTo(dy, 10);
      expect(Math.atan2(dy, dx) * 180 / Math.PI).toBeCloseTo(LIMB_ANGLE_DEG[lead], 8);
    }
    const end = leadGeometry(lead, 1);
    expect((end.x1 + end.x2) / 2).toBeCloseTo(220);
    expect((end.y1 + end.y2) / 2).toBeCloseTo(160);
  });
});

describe('F3: one model source, exact lead algebra', () => {
  const ecg = generate({ scenario: 'normal', seed: 311 }).ecg;
  const w = limbWindow(ecg)!;
  it('the sampled, reconstructed traces agree with the recorded leads', () => {
    for (let i = 0; i < w.leads.I.length; i++) {
      const t = w.from + (w.to - w.from) * i / (w.leads.I.length - 1);
      for (const lead of LIMB_LEADS) expect(w.leads[lead][i]).toBeCloseTo(sampleAt(ecg.signal.leads[lead], ecg.signal.fs, t), 5);
      expect(w.leads.I[i] + w.leads.III[i]).toBeCloseTo(w.leads.II[i], 10);
      expect(w.leads.aVR[i] + w.leads.aVL[i] + w.leads.aVF[i]).toBeCloseTo(0, 10);
      expect(w.phi.RA[i] + w.phi.LA[i] + w.phi.LL[i]).toBeCloseTo(0, 10);
    }
  });
  it('the horizontal schematic uses different projections of one loop', () => {
    expect(CHEST_SOURCE.traces).toHaveLength(6);
    expect(CHEST_SOURCE.traces[0]).not.toEqual(CHEST_SOURCE.traces[5]);
    expect(CHEST_SOURCE.rs[0].s).toBeGreaterThan(CHEST_SOURCE.rs[0].r);
    expect(CHEST_SOURCE.rs[5].r).toBeGreaterThan(CHEST_SOURCE.rs[5].s);
    expect(CHEST_SOURCE.traces.every(t => t.length === CHEST_SOURCE.loop.length)).toBe(true);
  });
  it('missing data does not silently substitute an invented trace', () => expect(limbWindow(undefined)).toBeNull());
  it('task validators distinguish lead, reference and perspective', () => {
    expect(isPairCorrect('II')).toBe(true); expect(isPairCorrect('III')).toBe(false);
    expect(isSumCorrect('II')).toBe(true); expect(isSumCorrect('aVF')).toBe(false);
    expect(isAxisCorrect('aVF')).toBe(true); expect(isAxisCorrect('II')).toBe(false);
    expect(isReferenceCorrect('average')).toBe(true); expect(isReferenceCorrect('wct')).toBe(false);
    expect(isChestPredictionCorrect('different')).toBe(true); expect(isChestPredictionCorrect('same')).toBe(false);
  });
});

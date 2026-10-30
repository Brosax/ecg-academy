import { describe, expect, it } from 'vitest';
import {
  allQtc,
  hrFromRr,
  interpretQtc,
  QTC_LIMITS,
  qtc,
  qtcBazett,
  qtcFramingham,
  qtcFridericia,
  qtcHodges,
  rateCaveat,
  rrFromHr,
} from '../../src/figures/math/qtc';

describe('QTc formulas', () => {
  it('all formulas return QT unchanged at 60 /min (RR 1000 ms)', () => {
    const r = allQtc(400, 1000);
    expect(r.bazett).toBeCloseTo(400, 9);
    expect(r.fridericia).toBeCloseTo(400, 9);
    expect(r.framingham).toBeCloseTo(400, 9);
    expect(r.hodges).toBeCloseTo(400, 9);
  });

  it('matches hand-computed values at 100 /min (QT 360, RR 600)', () => {
    expect(qtcBazett(360, 600)).toBeCloseTo(464.76, 1);
    expect(qtcFridericia(360, 600)).toBeCloseTo(426.86, 1);
    expect(qtcFramingham(360, 600)).toBeCloseTo(421.6, 6);
    expect(qtcHodges(360, 600)).toBeCloseTo(430, 6);
  });

  it('matches hand-computed values at 50 /min (QT 440, RR 1200)', () => {
    expect(qtcBazett(440, 1200)).toBeCloseTo(401.66, 1);
    expect(qtcFridericia(440, 1200)).toBeCloseTo(414.04, 1);
    expect(qtcFramingham(440, 1200)).toBeCloseTo(409.2, 6);
    expect(qtcHodges(440, 1200)).toBeCloseTo(422.5, 6);
  });

  it('Bazett over-corrects at fast rates compared with Fridericia', () => {
    for (const hr of [90, 110, 130, 150]) {
      const rr = rrFromHr(hr);
      expect(qtc('bazett', 340, rr)).toBeGreaterThan(qtc('fridericia', 340, rr));
    }
  });

  it('converts HR ↔ RR', () => {
    expect(rrFromHr(75)).toBe(800);
    expect(hrFromRr(500)).toBe(120);
  });
});

describe('QTc interpretation', () => {
  it('uses sex-specific prolongation limits (AHA/ACCF/HRS 2009)', () => {
    expect(interpretQtc(449, 'male')).toBe('normal');
    expect(interpretQtc(450, 'male')).toBe('prolonged');
    expect(interpretQtc(455, 'female')).toBe('normal');
    expect(interpretQtc(460, 'female')).toBe('prolonged');
  });

  it('flags LQTS range, high risk and short QT', () => {
    expect(interpretQtc(480, 'female')).toBe('lqts');
    expect(interpretQtc(500, 'male')).toBe('lqts');
    expect(interpretQtc(501, 'male')).toBe('high-risk');
    expect(interpretQtc(QTC_LIMITS.short, 'male')).toBe('short');
    expect(interpretQtc(340, 'female')).toBe('short');
    expect(interpretQtc(QTC_LIMITS.veryShort, 'male')).toBe('very-short');
    expect(interpretQtc(400, 'female')).toBe('normal');
  });

  it('warns about Bazett away from 60 /min', () => {
    expect(rateCaveat(120)).toBe('fast');
    expect(rateCaveat(45)).toBe('slow');
    expect(rateCaveat(70)).toBeNull();
  });
});

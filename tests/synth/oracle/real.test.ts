/**
 * The oracle must read real ECGs before it may grade synthetic ones (DECISION §8.1): on the 300 curated PTB-XL records
 * shipped in src/data/real it agrees with the GE 12SL reference measurements (PTB-XL+) — median |Δ| ≤ 10 ms for PR and
 * QRS, ≤ 10° for the QRS axis, ≤ 2 bpm for the rate.
 *
 * QT: the oracle uses the tangent method (criteria.md `qtc-bazett`, the method the curriculum teaches) in the lead with
 * the largest T, which is the convention of the synthetic truth (the dominant primary T). 12SL places the T offset later
 * than the tangent method does (a known difference between tangent and threshold-type T-end rules: Postema PG et al.,
 * Heart Rhythm 2008;5:1015–1018). That convention bias is measured here (−35 ms on 2026-10-17) and bounded (−45…0 ms);
 * the oracle's agreement beyond it is gated at median |Δ − bias| ≤ 10 ms. The T4 envelopes compare QT/QTc features
 * after this bias.
 * Data: PTB-XL v1.0.3 / PTB-XL+ v1.0.1 (Wagner 2020; Strodthoff 2023), PhysioNet, CC BY 4.0.
 */
import { describe, expect, it } from 'vitest';
import { compareReal, type RealDelta } from './real-compare';
import { realRecords } from './real-data';

const med = (xs: readonly number[]): number => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length % 2 ? s[s.length >> 1] : (s[(s.length >> 1) - 1] + s[s.length >> 1]) / 2;
};

/** Measured QT convention bias (oracle tangent − 12SL), ms; the bounds below are the acceptance range. */
const QT_BIAS_BOUNDS = { min: -45, max: 0 } as const;

describe('oracle vs GE 12SL on the shipped PTB-XL records', () => {
  const rows: RealDelta[] = realRecords().map(compareReal);
  const vals = (k: 'hr' | 'pr' | 'qrs' | 'qt' | 'axis'): number[] => rows.map((d) => d[k]).filter((x): x is number => x !== null);

  it('measures every record', () => {
    expect(rows.length).toBe(300);
    expect(vals('qrs').length).toBeGreaterThanOrEqual(295);
  });
  it('rate: median |Δ| ≤ 2 bpm', () => {
    expect(med(vals('hr').map(Math.abs))).toBeLessThanOrEqual(2);
  });
  it('PR: median |Δ| ≤ 10 ms, and a P is found in ≥ 85 % of records with a 12SL PR', () => {
    expect(med(vals('pr').map(Math.abs))).toBeLessThanOrEqual(10);
    const withRef = rows.filter((d) => d.pr !== null || d.prMissing).length;
    expect(rows.filter((d) => d.prMissing).length).toBeLessThanOrEqual(0.15 * withRef);
  });
  it('QRS: median |Δ| ≤ 10 ms', () => {
    expect(med(vals('qrs').map(Math.abs))).toBeLessThanOrEqual(10);
  });
  it('QRS axis: median |Δ| ≤ 10°', () => {
    expect(med(vals('axis').map(Math.abs))).toBeLessThanOrEqual(10);
  });
  it('QT: tangent-method bias vs 12SL within bounds, spread around it ≤ 10 ms', () => {
    const qt = vals('qt');
    const bias = med(qt);
    expect(bias).toBeGreaterThanOrEqual(QT_BIAS_BOUNDS.min);
    expect(bias).toBeLessThanOrEqual(QT_BIAS_BOUNDS.max);
    expect(med(qt.map((x) => Math.abs(x - bias)))).toBeLessThanOrEqual(10);
  });
});

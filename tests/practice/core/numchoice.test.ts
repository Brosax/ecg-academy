import { describe, expect, it } from 'vitest';
import { numericOptions } from '../../../src/practice/core/numchoice';
import { numericCredit, TOL } from '../../../src/practice/core/grade';

const angDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

describe('numericOptions', () => {
  it('four ascending values, exactly one within tolerance', () => {
    for (const truth of [38, 59, 75, 104, 148, 230]) {
      const tol = Math.max(truth * 0.1, 5);
      const v = numericOptions({ truth, tol, unit: 1, min: 15, seed: `r${truth}` });
      expect(v).toHaveLength(4);
      expect([...v].sort((a, b) => a - b)).toEqual(v);
      expect(v.filter((x) => numericCredit(x - truth, tol) === 1)).toHaveLength(1);
      expect(v.filter((x) => numericCredit(x - truth, tol) > 0)).toHaveLength(1);
      expect(v.every((x) => x >= 15)).toBe(true);
    }
  });

  it('intervals round to 10 ms and stay positive', () => {
    for (const truth of [44, 88, 163, 212, 402, 520]) {
      const v = numericOptions({ truth, tol: TOL.intervalMs, unit: 10, min: 20, seed: `m${truth}` });
      expect(v).toHaveLength(4);
      expect(v.every((x) => x % 10 === 0 && x >= 20)).toBe(true);
      expect(v.filter((x) => numericCredit(x - truth, TOL.intervalMs) > 0)).toHaveLength(1);
    }
  });

  it('uses a qualifying decoy (e.g. QT to the T peak)', () => {
    const v = numericOptions({ truth: 400, tol: 20, unit: 10, decoys: [300, 395], seed: 'qt' });
    expect(v).toContain(300);
    expect(v).not.toContain(390);
  });

  it('angles wrap and only the reference scores', () => {
    for (const truth of [-170, -45, 0, 60, 175]) {
      const v = numericOptions({ truth, tol: TOL.axisFullDeg, unit: 5, angle: true, seed: `a${truth}` });
      expect(v).toHaveLength(4);
      expect(v.every((x) => x > -180 && x <= 180)).toBe(true);
      expect(v.filter((x) => angDiff(x, truth) <= TOL.axisPartialDeg)).toHaveLength(1);
    }
  });

  it('is reproducible from the seed', () => {
    const a = numericOptions({ truth: 72, tol: 7.2, unit: 1, seed: 'same' });
    const b = numericOptions({ truth: 72, tol: 7.2, unit: 1, seed: 'same' });
    expect(a).toEqual(b);
  });
});

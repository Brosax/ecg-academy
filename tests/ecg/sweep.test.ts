import { describe, expect, it } from 'vitest';
import { eraseGapMs, monitorGeometry, pagedTime, sweep, sweepFracOf, sweepTimeAt } from '../../src/ecg/sweep';

describe('monitor sweep', () => {
  it('first pass: only new trace, nothing to the right of the head', () => {
    const s = sweep(2000, 6000, 200);
    expect(s.start).toBe(0);
    expect(s.headFrac).toBeCloseTo(1 / 3);
    expect(s.spans).toEqual([{ t0: 0, t1: 2000, tOrigin: 0 }]);
    expect(sweepTimeAt(s, 0.25)).toBeCloseTo(1500);
    expect(sweepTimeAt(s, 0.5)).toBeNull();
  });

  it('later passes: new trace left of the head, old trace after the erase bar', () => {
    const s = sweep(7000, 6000, 200);
    expect(s.start).toBe(6000);
    expect(s.spans).toEqual([
      { t0: 6000, t1: 7000, tOrigin: 6000 },
      { t0: 1200, t1: 6000, tOrigin: 0 },
    ]);
    expect(sweepFracOf(s, 6500)).toBeCloseTo(500 / 6000);
    expect(sweepFracOf(s, 3000)).toBeCloseTo(0.5);
    expect(sweepFracOf(s, 1000)).toBeNull(); // erased
    expect(sweepTimeAt(s, 0.1)).toBeCloseTo(6600);
    expect(sweepTimeAt(s, 0.18)).toBeNull(); // inside the erase bar
    expect(sweepTimeAt(s, 0.5)).toBeCloseTo(3000);
  });

  it('reduced motion: whole pages, clamped to the record', () => {
    expect(pagedTime(3000, 6000, 10000)).toBeCloseTo(6000);
    expect(pagedTime(3000, 6000, 10000)).toBeLessThan(6000);
    expect(pagedTime(7000, 6000, 10000)).toBe(10000);
    expect(pagedTime(12000, 6000, 10000)).toBe(10000);
  });
});

describe('monitor geometry and sweep mapping', () => {
  it('time ↔ fraction round-trips on both sweeps; the erase bar maps to nothing', () => {
    const s = sweep(8300, 6000, eraseGapMs(6000));
    for (const t of [6000, 7000, 8300, 2600, 4000, 5999]) {
      const fr = sweepFracOf(s, t);
      expect(fr).not.toBeNull();
      expect(sweepTimeAt(s, fr ?? 0)).toBeCloseTo(t, 6);
    }
    // just ahead of the head is the erase bar (180 ms here)
    expect(sweepTimeAt(s, s.headFrac + 100 / 6000)).toBeNull();
    expect(sweepFracOf(s, 2400)).toBeNull();
  });

  it('erase bar: about 3 % of the window, at least 120 ms', () => {
    expect(eraseGapMs(6000)).toBe(180);
    expect(eraseGapMs(2000)).toBe(120);
    expect(eraseGapMs(10000)).toBe(300);
  });

  it('strip size: whole 5 mm squares, room for the label, tall artefacts capped', () => {
    const g = monitorGeometry(1.5, -0.4, 6000, 25, 10);
    expect(g.widthMm).toBe(150);
    expect(g.baselineMm).toBe(25); // 15 mm R + 6 mm label room → 25
    expect(g.heightMm).toBe(25 + 10); // 4 mm S + 2 → 10
    expect(g.heightMm % 5).toBe(0);
    expect(monitorGeometry(1.5, -0.4, 6000, 50, 20).widthMm).toBe(300);
    const capped = monitorGeometry(20, -20, 6000, 25, 10);
    expect(capped.baselineMm).toBe(45);
    expect(capped.heightMm).toBe(45 + 40);
    const flat = monitorGeometry(0, 0, 6000, 25, 10);
    expect(flat).toEqual({ widthMm: 150, heightMm: 15, baselineMm: 10 });
  });
});

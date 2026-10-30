import { describe, expect, it } from 'vitest';
import {
  calibrationPulseMm, cellAt, clinicalAnchor, clinicalColumnOf, clinicalColumnStart, fitPxPerMm, gridLines, gridLevels,
  GRID_3X4, mmToMs, msToMm, mvToMm, PAPER, sheetLayout, sweep, sweepFracOf, sweepTimeAt,
} from '../../../src/lab/ecg/paper';

describe('paper units', () => {
  it('25 mm/s and 10 mm/mV: 1 small box = 40 ms = 0.1 mV, 1 large box = 200 ms = 0.5 mV', () => {
    expect(msToMm(40)).toBeCloseTo(PAPER.minorMm, 12);
    expect(msToMm(200)).toBeCloseTo(PAPER.majorMm, 12);
    expect(mvToMm(0.1)).toBeCloseTo(1, 12);
    expect(mvToMm(0.5)).toBeCloseTo(5, 12);
    expect(mmToMs(250)).toBeCloseTo(10000, 9); // 10 s strip = 250 mm
  });

  it('fits px/mm to the container (limited by the tighter side)', () => {
    expect(fitPxPerMm(500, 1000, 250, 100)).toBeCloseTo(2, 12);
    expect(fitPxPerMm(1000, 200, 250, 100)).toBeCloseTo(2, 12);
    expect(fitPxPerMm(500, 0, 250, 100)).toBeCloseTo(2, 12); // auto height → width decides
    expect(fitPxPerMm(0, 100, 250, 100)).toBe(0);
  });

  it('drops the minor grid when it would be denser than 3 device px', () => {
    expect(gridLevels(1.35, 1)).toEqual({ minor: false, major: true }); // phone width
    expect(gridLevels(1.35, 3)).toEqual({ minor: true, major: true });
    expect(gridLevels(4, 1).minor).toBe(true);
  });

  it('grid lines are half-pixel aligned and every 5th is major', () => {
    const lines = gridLines(10, 4, 60);
    expect(lines[0].pos).toBe(2.5); // i = −2 → 10 − 8
    for (const l of lines) expect(l.pos % 1).toBe(0.5);
    const majors = lines.filter((l) => l.major).map((l) => l.pos);
    expect(majors).toContain(10.5);
    expect(majors).toContain(30.5);
  });

  it('calibration pulse is 1 mV high and 0.2 s wide', () => {
    const p = calibrationPulseMm(20);
    const ys = p.map((q) => q[1]);
    expect(Math.min(...ys)).toBeCloseTo(20 - 10, 12);
    const top = p.filter((q) => q[1] === 10).map((q) => q[0]);
    expect(top[1] - top[0]).toBeCloseTo(5, 12);
  });
});

describe('12-lead sheet layout', () => {
  const L = sheetLayout();
  it('places leads in the standard 3×4 grid (I aVR V1 V4 / II aVL V2 V5 / III aVF V3 V6)', () => {
    expect(L.cells).toHaveLength(12);
    expect(new Set(L.cells.map((c) => c.lead)).size).toBe(12);
    for (const c of L.cells) expect(GRID_3X4[c.row][c.col]).toBe(c.lead);
    const at = (lead: string) => L.cells.find((c) => c.lead === lead)!;
    expect(at('I').row).toBe(0);
    expect(at('aVR').col).toBe(1);
    expect(at('V6')).toMatchObject({ row: 2, col: 3 });
  });
  it('each column is 2.5 s wide (62.5 mm) after the calibration area; rhythm strip is 10 s', () => {
    for (const c of L.cells) {
      expect(c.wMm).toBeCloseTo(62.5, 9);
      expect(c.xMm).toBeCloseTo(L.calMm + c.col * 62.5, 9);
    }
    expect(L.rhythm.wMm).toBeCloseTo(250, 9);
    expect(L.rhythm.lead).toBe('II');
    expect(L.widthMm).toBeGreaterThan(L.calMm + 250);
  });
  it('baselines sit inside their rows and rows do not overlap', () => {
    for (const c of [...L.cells, L.rhythm]) {
      expect(c.baselineMm).toBeGreaterThan(c.topMm);
      expect(c.baselineMm).toBeLessThan(c.topMm + c.hMm);
    }
    expect(L.rhythm.topMm).toBeGreaterThanOrEqual(3 * L.cells[0].hMm);
  });
  it('hit-tests cells', () => {
    const v5 = L.cells.find((c) => c.lead === 'V5')!;
    expect(cellAt(L, v5.xMm + 1, v5.topMm + 1)?.lead).toBe('V5');
    expect(cellAt(L, L.rhythm.xMm + 200, L.rhythm.baselineMm)?.row).toBe(3);
    expect(cellAt(L, 1, 1)).toBeNull(); // calibration area
  });
});

describe('time mapping', () => {
  it('sweep: current data left of the cursor, previous sweep after the eraser gap', () => {
    const s = sweep(3700, 2500, 200);
    expect(s.start).toBe(2500);
    expect(s.cursorFrac).toBeCloseTo(1200 / 2500, 12);
    expect(s.spans).toHaveLength(2);
    expect(s.spans[0]).toEqual({ t0: 2500, t1: 3700, tOrigin: 2500 });
    expect(s.spans[1].t0).toBe(3700 - 2500 + 200);
    expect(s.spans[1].t1).toBe(2500);
  });
  it('sweep time ↔ x round-trips and the gap maps to null', () => {
    const s = sweep(3700, 2500, 200);
    for (const tau of [2500, 3000, 3699, 1400, 2000, 2499]) {
      const f = sweepFracOf(s, tau)!;
      expect(f).not.toBeNull();
      expect(sweepTimeAt(s, f)).toBeCloseTo(tau, 9);
    }
    expect(sweepFracOf(s, 1300)).toBeNull(); // erased
    expect(sweepTimeAt(s, (3750 - 2500) / 2500)).toBeNull(); // inside the gap
    expect(sweepFracOf(s, 3800)).toBeNull(); // future
  });
  it('the same instant sits at the same x in every column (sync layout)', () => {
    const s = sweep(6123, 2500, 150);
    expect(sweepFracOf(s, 6000)).toBeCloseTo((6000 - 5000) / 2500, 12);
  });
  it('clinical layout: columns are consecutive 2.5 s slices of the last 10 s', () => {
    const T = 12500;
    expect(clinicalColumnStart(T, 0)).toBe(2500);
    expect(clinicalColumnStart(T, 3)).toBe(10000);
    expect(clinicalColumnOf(T, 2500)).toBe(0);
    expect(clinicalColumnOf(T, 6000)).toBe(1);
    expect(clinicalColumnOf(T, 12500)).toBe(3);
    expect(clinicalColumnOf(T, 2400)).toBe(-1);
  });
  it('clinical anchor refreshes per column while playing and holds while paused', () => {
    expect(clinicalAnchor(null, 7400, true)).toBe(5000);
    expect(clinicalAnchor(5000, 4000, false)).toBe(5000); // on the sheet → keep
    expect(clinicalAnchor(5000, 9000, false)).toBe(9000); // stepped past → follow
  });
});

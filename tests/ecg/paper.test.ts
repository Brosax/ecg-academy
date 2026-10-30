import { describe, expect, it } from 'vitest';
import {
  calibrationPulseMm,
  calZoneMm,
  ceilMajor,
  fitPxPerMm,
  gridLevels,
  gridLines,
  mmToMs,
  mmToMv,
  msPerSmallSquare,
  msToMm,
  mvPerSmallSquare,
  mvToMm,
  paperBox,
  MIN_FIT_PX_PER_MM,
} from '../../src/ecg/paper';

describe('paper scale', () => {
  it('maps time to paper at 25 and 50 mm/s', () => {
    expect(msToMm(1000, 25)).toBe(25);
    expect(msToMm(1000, 50)).toBe(50);
    expect(msToMm(200, 25)).toBe(5);
    expect(mmToMs(1, 25)).toBe(40);
    expect(mmToMs(1, 50)).toBe(20);
    expect(mmToMs(msToMm(437, 25), 25)).toBeCloseTo(437, 9);
    expect(mmToMs(msToMm(437, 50), 50)).toBeCloseTo(437, 9);
  });

  it('maps voltage to paper at 5, 10 and 20 mm/mV', () => {
    expect(mvToMm(1, 10)).toBe(10);
    expect(mvToMm(1, 5)).toBe(5);
    expect(mvToMm(1, 20)).toBe(20);
    expect(mvToMm(-0.25, 10)).toBe(-2.5);
    for (const g of [5, 10, 20]) expect(mmToMv(mvToMm(0.37, g), g)).toBeCloseTo(0.37, 12);
  });

  it('small-square values', () => {
    expect(msPerSmallSquare(25)).toBe(40);
    expect(msPerSmallSquare(50)).toBe(20);
    expect(mvPerSmallSquare(10)).toBeCloseTo(0.1);
    expect(mvPerSmallSquare(5)).toBeCloseTo(0.2);
    expect(mvPerSmallSquare(20)).toBeCloseTo(0.05);
  });

  it('ceilMajor rounds up to whole 5 mm squares', () => {
    expect(ceilMajor(0)).toBe(0);
    expect(ceilMajor(5)).toBe(5);
    expect(ceilMajor(5.01)).toBe(10);
    expect(ceilMajor(12)).toBe(15);
  });
});

describe('grid', () => {
  it('drops minor lines when they would merge', () => {
    expect(gridLevels(4, 1)).toEqual({ minor: true, major: true });
    expect(gridLevels(2, 1)).toEqual({ minor: false, major: true });
    expect(gridLevels(2, 2)).toEqual({ minor: true, major: true });
    expect(gridLevels(0.5, 1)).toEqual({ minor: false, major: false });
  });

  it('places lines from the origin, every 5th major', () => {
    const lines = gridLines(10, 4, 50);
    // lines at 10 + 4i inside [0, 50]: i = -2..10
    expect(lines.length).toBe(13);
    expect(lines[0].pos).toBe(2.5);
    const origin = lines.find((l) => l.pos === 10.5);
    expect(origin?.major).toBe(true);
    expect(lines.filter((l) => l.major).map((l) => l.pos)).toEqual([10.5, 30.5, 50.5].filter((p) => p <= 50.5));
    expect(gridLines(0, 0, 10)).toEqual([]);
  });

  it('fits a sheet to a box', () => {
    expect(fitPxPerMm(1000, 0, 250, 100)).toBe(4);
    expect(fitPxPerMm(1000, 200, 250, 100)).toBe(2);
    expect(fitPxPerMm(0, 200, 250, 100)).toBe(0);
  });

  it('paper box: proportional, calibrated or fixed height — never below a readable scale', () => {
    // default: the sheet's ratio, at least MIN_FIT_PX_PER_MM wide (a phone scrolls the paper sideways)
    expect(paperBox(265, 140, undefined, null)).toEqual({ aspect: 265 / 140, minWidth: Math.round(265 * MIN_FIT_PX_PER_MM) });
    // calibrated: true physical size
    expect(paperBox(265, 140, undefined, 3.78)).toEqual({ width: 265 * 3.78, height: 140 * 3.78 });
    // fixed height: a long single-lead row keeps the readable scale on a narrow screen…
    expect(paperBox(270, 30, 240, null)).toEqual({ height: 240, minWidth: Math.round(270 * MIN_FIT_PX_PER_MM) });
    // …but never asks for more width than the height can fill (a tall sheet in a short box)
    expect(paperBox(265, 140, 240, null)).toEqual({ height: 240, minWidth: Math.round((265 * 240) / 140) });
    // the height wins over a calibration (the host asked for a fixed size)
    expect(paperBox(100, 40, 200, 3.78).width).toBeUndefined();
  });
});

describe('calibration pulse', () => {
  it('zone width per speed', () => {
    expect(calZoneMm(25)).toBe(10);
    expect(calZoneMm(50)).toBe(15);
  });

  it('plain pulse: 1 mV for 200 ms', () => {
    const pts = calibrationPulseMm(0, 20, 25, [10]);
    const ys = pts.map((p) => p[1]);
    expect(Math.min(...ys)).toBe(10); // 10 mm above the baseline at 20
    const top = pts.filter((p) => p[1] === 10);
    expect(top[top.length - 1][0] - top[0][0]).toBeCloseTo(5); // 200 ms at 25 mm/s
    expect(pts[0]).toEqual([0, 20]);
    expect(pts[pts.length - 1][1]).toBe(20);
  });

  it('stepped pulse for chest half gain, and width at 50 mm/s', () => {
    const pts = calibrationPulseMm(0, 30, 50, [10, 5]);
    const heights = [...new Set(pts.map((p) => 30 - p[1]))].sort((a, b) => a - b);
    expect(heights).toEqual([0, 5, 10]);
    const xs = pts.map((p) => p[0]);
    expect(Math.max(...xs) - 1 - 1).toBeCloseTo(10); // lead-in 1 mm + 10 mm pulse + 1 mm tail
  });

  it('gain 20 doubles the pulse height', () => {
    const pts = calibrationPulseMm(0, 30, 25, [20]);
    expect(Math.min(...pts.map((p) => p[1]))).toBe(10);
  });
});

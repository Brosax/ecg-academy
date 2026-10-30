import { describe, expect, it } from 'vitest';
import { calibrationPulseMm, sweep } from '../../../src/lab/ecg/paper';
import { canStep, DETAIL_ZOOM, gainFactor, speedOf, STANDARD_ZOOM, stepZoom, stripScale, windowForTraceMm } from '../../../src/lab/ecg/zoom';

describe('detail-strip zoom (beats shown, gain)', () => {
  it('detail strips open on 2 beats at 10 mm/mV; the standard is 25 mm/s', () => {
    expect(DETAIL_ZOOM).toEqual({ beats: 2, gain: 10 });
    expect(STANDARD_ZOOM).toEqual({ beats: 0, gain: 10 });
    expect(gainFactor({ beats: 1, gain: 20 })).toBe(2);
  });

  it('steps standard → 4 → 2 → 1 beat and stops at the ends', () => {
    expect(stepZoom(STANDARD_ZOOM, 1).beats).toBe(4);
    expect(stepZoom({ beats: 2, gain: 5 }, 1)).toEqual({ beats: 1, gain: 5 });
    const one = { beats: 1, gain: 10 } as const;
    expect(stepZoom(one, 1)).toBe(one);
    expect(canStep(one, 1)).toBe(false);
    expect(canStep(STANDARD_ZOOM, -1)).toBe(false);
  });

  it('fills the box with n beats: one beat spreads over the whole width', () => {
    // a 400 mm trace (10 s at 25 mm/s cut to the 10 s ceiling), RR 800 ms
    expect(stripScale(STANDARD_ZOOM, 800, 400)).toEqual({ windowMs: 10000, kx: 1 });
    const one = stripScale({ beats: 1, gain: 10 }, 800, 400);
    expect(one.windowMs).toBe(800);
    expect(one.kx).toBeCloseTo(20, 9); // 400 mm / (800 ms × 25 mm/s) → 500 mm/s
    expect(speedOf(one.kx)).toBe(500);
    const two = stripScale(DETAIL_ZOOM, 800, 400);
    expect(two.windowMs).toBe(1600);
    expect(two.kx).toBeCloseTo(10, 9);
  });

  it('at its natural size a zoomed strip is as wide as 3 standard beats', () => {
    expect(stripScale(STANDARD_ZOOM, 800, null)).toEqual({ windowMs: 2400, kx: 1 });
    const one = stripScale({ beats: 1, gain: 10 }, 800, null);
    expect(one.windowMs * one.kx).toBeCloseTo(2400, 9);
  });

  it('standard fill windows round down to 100 ms within 1.5–10 s', () => {
    expect(windowForTraceMm(100)).toBe(4000);
    expect(windowForTraceMm(10)).toBe(1500);
    expect(windowForTraceMm(5000)).toBe(10000);
  });

  it('the calibration pulse is 1 mV at the strip gain', () => {
    const top = (pts: [number, number][]) => Math.min(...pts.map((p) => p[1]));
    expect(20 - top(calibrationPulseMm(20))).toBe(10);
    expect(20 - top(calibrationPulseMm(20, 1, 20))).toBe(20);
  });

  it('a sweep phase moves where sweeps start', () => {
    expect(sweep(1000, 800, 0).start).toBe(800);
    expect(sweep(1000, 800, 0, 100).start).toBe(900);
    expect(sweep(850, 800, 0, 100).start).toBe(100);
  });
});

import { describe, expect, it } from 'vitest';
import {
  caliperReadout,
  defaultCalipers,
  marchOut,
  moveMv,
  moveTime,
  mvStep,
  pickHandle,
  rateFromInterval,
  squaresFromMs,
  timeStep,
} from '../../src/ecg/calipers';

describe('caliper read-out', () => {
  it('Δt in ms, small squares at each speed, and rate', () => {
    const c = { t0: 100, t1: 900, mv0: 0, mv1: 0 };
    const r25 = caliperReadout(c, 25, 10);
    expect(r25.dtMs).toBe(800);
    expect(r25.squares).toBe(20);
    expect(r25.bpm).toBe(75);
    const r50 = caliperReadout(c, 50, 10);
    expect(r50.squares).toBe(40);
    expect(r50.bpm).toBe(75);
    // order of the lines does not matter
    expect(caliperReadout({ ...c, t0: 900, t1: 100 }, 25, 10).dtMs).toBe(800);
  });

  it('classic values: 200 ms = 5 small squares = 1 large square at 25 mm/s; 1 s = 60 bpm', () => {
    expect(squaresFromMs(200, 25)).toBe(5);
    expect(squaresFromMs(200, 50)).toBe(10);
    expect(rateFromInterval(1000)).toBe(60);
    expect(rateFromInterval(0)).toBeNull();
    // shorter than any cycle: no rate (the rate read-out keeps three digits at most)
    expect(rateFromInterval(59)).toBeNull();
    expect(rateFromInterval(60)).toBeNull(); // would print "1000"
    expect(Math.round(rateFromInterval(60.1) ?? 0)).toBe(998);
    expect(rateFromInterval(150)).toBe(400);
    expect(caliperReadout({ t0: 0, t1: 40, mv0: 0, mv1: 0 }, 25, 10).bpm).toBeNull();
    expect(caliperReadout({ t0: 5, t1: 5, mv0: 0, mv1: 0 }, 25, 10).bpm).toBeNull();
  });

  it('amplitude mode: mV and mm at the panel gain', () => {
    const c = { t0: 0, t1: 0, mv0: 0.2, mv1: -0.3 };
    expect(caliperReadout(c, 25, 10).dMv).toBeCloseTo(0.5);
    expect(caliperReadout(c, 25, 10).dMm).toBeCloseTo(5);
    expect(caliperReadout(c, 25, 5).dMm).toBeCloseTo(2.5);
    expect(caliperReadout(c, 25, 20).dMm).toBeCloseTo(10);
  });

  it('default placement is geometric, centred in the panel', () => {
    const d = defaultCalipers(3, 0, 10000);
    expect(d).toEqual({ panel: 3, t0: 4500, t1: 5500, mv0: 0, mv1: 1 });
    const short = defaultCalipers(0, 1000, 2000);
    expect(short.t0).toBe(1300);
    expect(short.t1).toBe(1700);
  });
});

describe('march out', () => {
  it('repeats the interval forward and backward inside the strip', () => {
    const m = marchOut(1000, 1800, 0, 10000);
    expect(m).toEqual([200, 2600, 3400, 4200, 5000, 5800, 6600, 7400, 8200, 9000, 9800]);
    expect(marchOut(1800, 1000, 0, 10000)).toEqual(m);
  });

  it('gives nothing for a sub-cycle interval and respects the cap', () => {
    expect(marchOut(1000, 1030, 0, 10000)).toEqual([]);
    expect(marchOut(0, 100, 0, 100000, 5).length).toBe(5);
  });
});

describe('dragging and nudging', () => {
  const c = { panel: 0, t0: 100, t1: 500, mv0: 0, mv1: 1 };

  it('moving both lines keeps the interval and stays inside the panel', () => {
    expect(moveTime(c, 'both', -300, 0, 1000)).toMatchObject({ t0: 0, t1: 400 });
    expect(moveTime(c, 'both', 800, 0, 1000)).toMatchObject({ t0: 600, t1: 1000 });
    expect(moveTime(c, 'both', 50, 0, 1000)).toMatchObject({ t0: 150, t1: 550 });
  });

  it('moving one line clamps to the panel', () => {
    expect(moveTime(c, 1, 800, 0, 1000).t1).toBe(1000);
    expect(moveTime(c, 0, -800, 0, 1000).t0).toBe(0);
    expect(moveTime(c, 0, 20, 0, 1000)).toMatchObject({ t0: 120, t1: 500 });
  });

  it('amplitude lines move freely', () => {
    expect(moveMv(c, 'both', 0.1)).toMatchObject({ mv0: 0.1, mv1: 1.1 });
    expect(moveMv(c, 1, -0.5).mv1).toBeCloseTo(0.5);
  });

  it('keyboard steps: fine 4 ms / 0.01 mV, coarse one small square', () => {
    expect(timeStep(25, false)).toBe(4);
    expect(timeStep(25, true)).toBe(40);
    expect(timeStep(50, true)).toBe(20);
    expect(mvStep(10, false)).toBe(0.01);
    expect(mvStep(10, true)).toBeCloseTo(0.1);
    expect(mvStep(5, true)).toBeCloseTo(0.2);
  });

  it('pickHandle finds the nearest handle within tolerance', () => {
    expect(pickHandle([10, null, 50], 48, 5)).toBe(2);
    expect(pickHandle([10, 50], 30, 5)).toBe(-1);
    expect(pickHandle([10, 14], 13, 5)).toBe(1);
  });
});

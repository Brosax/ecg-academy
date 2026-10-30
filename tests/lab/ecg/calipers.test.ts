import { describe, expect, it } from 'vitest';
import { caliperReadout, defaultCalipers, pickHandle, qtcBazett, qtcFridericia, rateFromInterval } from '../../../src/lab/ecg/calipers';
import { getHub, rrOfCycle } from '../../../src/lab/ecg/sampler';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';

describe('caliper math', () => {
  it('rate = 60000 / Δt', () => {
    expect(rateFromInterval(800)).toBe(75);
    expect(rateFromInterval(1000)).toBe(60);
    expect(rateFromInterval(0)).toBe(0);
  });
  it('QTc: Bazett QT/√RR, Fridericia QT/∛RR (RR in s)', () => {
    expect(qtcBazett(400, 1000)).toBeCloseTo(400, 9);
    expect(qtcFridericia(400, 1000)).toBeCloseTo(400, 9);
    expect(qtcBazett(360, 640)).toBeCloseTo(450, 9);
    expect(qtcFridericia(360, 512)).toBeCloseTo(450, 9);
    // Bazett over-corrects at fast rates relative to Fridericia.
    expect(qtcBazett(300, 500)).toBeGreaterThan(qtcFridericia(300, 500));
    expect(qtcBazett(440, 1200)).toBeLessThan(qtcFridericia(440, 1200));
  });
  it('readout reports measured and model-truth values', () => {
    const eng = new StubEngine();
    const hub = getHub(eng);
    const [prev, c, next] = hub.cycles.range(1500, 3500);
    const rr = rrOfCycle(c, prev, next)!;
    const r = caliperReadout('qt', c.qrsOn!, c.tEnd!, c, rr);
    expect(r.dtMs).toBeCloseTo(c.tEnd! - c.qrsOn!, 9);
    expect(r.truth.qtMs).toBeCloseTo(r.dtMs, 9);
    expect(r.qtcBazettMs).toBeCloseTo(qtcBazett(r.dtMs, 800), 6);
    expect(r.truth.rateBpm).toBeCloseTo(75, 6);
    const iv = caliperReadout('interval', c.qrsOn! + 800, c.qrsOn!, c, rr);
    expect(iv.dtMs).toBe(800);
    expect(iv.rateBpm).toBe(75);
    expect(iv.qtcBazettMs).toBeNull();
    const d = defaultCalipers('qt', c, rr)!;
    expect(d.t1 - d.t0).toBeCloseTo(c.tEnd! - c.qrsOn!, 9);
    expect(defaultCalipers('interval', c, rr)!.t1 - c.qrsOn!).toBeCloseTo(800, 9);
  });
  it('picks the nearer handle within tolerance', () => {
    expect(pickHandle(100, 200, 105, 10)).toBe(0);
    expect(pickHandle(100, 200, 196, 10)).toBe(1);
    expect(pickHandle(100, 200, 150, 10)).toBe(-1);
    expect(pickHandle(null, 200, 205, 10)).toBe(1);
  });
});

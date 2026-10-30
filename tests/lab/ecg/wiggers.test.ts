import { describe, expect, it } from 'vitest';
import { getHub } from '../../../src/lab/ecg/sampler';
import { timelineModel, timeToX, xToTime } from '../../../src/lab/ecg/timeline';
import { MonotoneCurve, WIGGERS, wiggersModel } from '../../../src/lab/ecg/wiggers';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';

describe('monotone cubic', () => {
  it('passes through knots and never overshoots them', () => {
    const c = new MonotoneCurve([{ t: 0, v: 0 }, { t: 10, v: 10 }, { t: 20, v: 10 }, { t: 30, v: 0 }, { t: 40, v: 5 }]);
    expect(c.at(10)).toBeCloseTo(10, 12);
    expect(c.at(30)).toBeCloseTo(0, 12);
    for (let t = 0; t <= 40; t += 0.25) {
      expect(c.at(t)).toBeLessThanOrEqual(10 + 1e-9);
      expect(c.at(t)).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(c.at(-5)).toBe(0);
    expect(c.at(99)).toBe(5);
  });
});

describe('Wiggers curves driven by cycle truth', () => {
  const eng = new StubEngine();
  const hub = getHub(eng);
  const [prev, c, next] = hub.cycles.range(1500, 3500);
  const m = wiggersModel([prev, c, next], 800);
  const ev = (k: string) => m.events.find((e) => e.kind === k && e.t >= c.qrsOn!)!.t;
  const MC = ev('MC'), AO = ev('AO'), AC = ev('AC'), MO = ev('MO');

  it('valve events follow the truth order MC < AO < AC < MO', () => {
    expect(MC).toBeLessThan(AO);
    expect(AO).toBeLessThan(AC);
    expect(AC).toBeLessThan(MO);
    const mit = c.valves.find((v) => v.id === 'MITRAL')!;
    expect(MC).toBe(mit.closeMs);
  });
  it('LV volume: the beat EDV through isovolumic contraction, its ESV through isovolumic relaxation (near 120 / 50 mL)', () => {
    const b = m.beats.find((x) => x.cycle === c)!;
    for (let t = MC; t <= AO; t += 5) expect(m.lvv.at(t)).toBeCloseTo(b.edvMl, 6);
    for (let t = AC; t <= MO; t += 5) expect(m.lvv.at(t)).toBeCloseTo(b.esvMl, 6);
    expect(Math.abs(b.edvMl - WIGGERS.edvMl)).toBeLessThan(5);
    expect(Math.abs(b.esvMl - WIGGERS.esvMl)).toBeLessThan(2);
    // Volume falls monotonically during ejection.
    for (let t = AO; t < AC; t += 5) expect(m.lvv.at(t + 5)).toBeLessThanOrEqual(m.lvv.at(t) + 1e-9);
  });
  it('LV systolic peak ≈ 120 mmHg during ejection; aortic pressure ≈ 80 at aortic opening', () => {
    let pk = 0;
    for (let t = AO; t <= AC; t += 2) pk = Math.max(pk, m.lvp.at(t));
    expect(pk).toBeGreaterThan(115);
    expect(pk).toBeLessThan(125);
    expect(Math.abs(m.aop.at(AO) - WIGGERS.aoDiaMmHg)).toBeLessThan(3);
    // Aortic pressure stays above LV pressure after closure (the valve is shut).
    for (let t = AC + 15; t < MO; t += 5) expect(m.aop.at(t)).toBeGreaterThan(m.lvp.at(t));
  });
  it('LA pressure exceeds LV pressure during early filling (mitral valve open)', () => {
    for (let t = MO + 10; t < MO + 120; t += 10) expect(m.lap.at(t)).toBeGreaterThan(m.lvp.at(t));
    // and LV pressure exceeds LA pressure during isovolumic contraction (mitral valve closed)
    expect(m.lvp.at((MC + AO) / 2)).toBeGreaterThan(m.lap.at((MC + AO) / 2));
  });
  it('marks the a, c and v waves of the LA pressure', () => {
    const kinds = m.marks.map((x) => x.kind);
    expect(kinds).toContain('a');
    expect(kinds).toContain('c');
    expect(kinds).toContain('v');
  });
});

describe('timeline model', () => {
  const eng = new StubEngine();
  const c = eng.cycleAt(2100)!;
  const tl = timelineModel(c);
  it('covers the whole cycle and maps time ↔ x', () => {
    expect(tl.t0).toBe(c.pOn);
    expect(tl.t1).toBeGreaterThanOrEqual(c.segments[c.segments.length - 1].t1);
    expect(tl.segments.map((s) => s.key)).toEqual(['P', 'PR', 'QRS', 'ST', 'T', 'TP']);
    expect(tl.mech.map((s) => s.key)).toEqual(['atrialSystole', 'isovolumicContraction', 'ejection', 'isovolumicRelaxation', 'filling']);
    expect(xToTime(timeToX(c.qrsOn!, tl.t0, tl.t1, 300), tl.t0, tl.t1, 300)).toBeCloseTo(c.qrsOn!, 9);
    expect(xToTime(-10, tl.t0, tl.t1, 300)).toBe(tl.t0);
  });
  it('S1 at mitral closure, S2 at aortic closure', () => {
    expect(tl.sounds.find((s) => s.id === 'S1')!.t).toBe(c.valves.find((v) => v.id === 'MITRAL')!.closeMs);
    expect(tl.sounds.find((s) => s.id === 'S2')!.t).toBe(c.valves.find((v) => v.id === 'AORTIC')!.closeMs);
    expect(tl.valves).toHaveLength(4);
  });
});

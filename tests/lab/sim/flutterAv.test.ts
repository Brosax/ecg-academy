/**
 * Flutter AV conduction (rhythm/flutterAv.ts) and the flutter mode of ScenarioRhythm: fixed N:1 block, snapping of the
 * heart-rate control to N:1, deterministic variable block with an exact mean ratio.
 */
import { describe, expect, it } from 'vitest';
import { FLUTTER_MAX_RATIO, FlutterAvConduction, flutterRatioFor } from '../../../src/lab/sim/rhythm/flutterAv';
import { ScenarioRhythm } from '../../../src/lab/sim/rhythm/scenarioRhythm';
import type { BeatEvent } from '../../../src/lab/sim/types';

const pattern = (ratio: number, n: number) => {
  const c = new FlutterAvConduction(ratio);
  return Array.from({ length: n }, () => (c.next() ? 1 : 0));
};

describe('FlutterAvConduction', () => {
  it('fixed N:1 — the first wave conducts, then every Nth', () => {
    expect(pattern(2, 8)).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
    expect(pattern(4, 8)).toEqual([1, 0, 0, 0, 1, 0, 0, 0]);
  });

  it('variable block: intervals of ⌊r⌋ and ⌈r⌉ waves in a fixed pattern whose mean is exactly r', () => {
    for (const r of [2.5, 2.3, 3.7]) {
      const p = pattern(r, 2000);
      const idx = p.flatMap((x, i) => (x ? [i] : []));
      const gaps = idx.slice(1).map((x, i) => x - idx[i]);
      expect(new Set(gaps)).toEqual(new Set([Math.floor(r), Math.ceil(r)]));
      expect(Math.abs((idx[idx.length - 1] - idx[0]) / gaps.length - r)).toBeLessThan(2 / gaps.length);
    }
    expect(pattern(2.5, 50)).toEqual(pattern(2.5, 50));
  });

  it('flutterRatioFor: ≥ 2, ≤ max, snaps to an integer ratio near it', () => {
    expect(flutterRatioFor(150, 200)).toBe(2);
    expect(flutterRatioFor(148, 203)).toBe(2);
    expect(flutterRatioFor(100, 200)).toBe(3);
    expect(flutterRatioFor(75, 200)).toBe(4);
    expect(flutterRatioFor(120, 200)).toBeCloseTo(2.5, 10);
    expect(flutterRatioFor(220, 200)).toBe(2);
    expect(flutterRatioFor(20, 200)).toBe(FLUTTER_MAX_RATIO);
  });
});

describe('ScenarioRhythm flutter mode', () => {
  const make = () =>
    new ScenarioRhythm({ flutter: { ratio: 2 } }, {
      bpm: 75, rrRefMs: 800, atrioNodalMs: 40, ahMs: 80, avExp: 0.3, apdExp: 1 / 3, startMs: 100,
      atrialMain: 'flutter', atrialAlt: null, ventricularMain: 'normal', ventricularAlt: null, flutterCycleMs: 200,
    });
  type V = Extract<BeatEvent, { kind: 'V' }>;

  it('one A event per circuit revolution, every 2nd conducts (2:1), blocked waves stop in the AV node', () => {
    const r = make();
    const evs = r.eventsUntil(4100);
    const as = evs.filter((e) => e.kind === 'A');
    const vs = evs.filter((e): e is V => e.kind === 'V');
    expect(as.length).toBe(21);
    expect(as.slice(1).every((a, i) => Math.abs(a.tMs - as[i].tMs - 200) < 1e-9)).toBe(true);
    expect(as.every((a) => a.kind === 'A' && a.rrPrevMs === 200)).toBe(true);
    expect(vs.slice(1).every((v, i) => Math.abs(v.tMs - vs[i].tMs - 400) < 1e-9)).toBe(true);
    expect(vs.every((v) => v.fromA !== null)).toBe(true);
    expect(evs.filter((e) => e.kind === 'block' && e.site === 'AVN').length).toBeGreaterThanOrEqual(9);
    expect(r.heartRate).toBe(150);
  });

  it('the heart-rate control sets the ratio: 75 → 4:1, 120 → variable (mean 2.5), 200 → stays 2:1', () => {
    const r = make();
    r.setHeartRate(75, 0);
    expect(r.heartRate).toBe(75);
    let vs = r.eventsUntil(10000).filter((e): e is V => e.kind === 'V' && e.tMs > 2000);
    expect(vs.slice(1).every((v, i) => Math.abs(v.tMs - vs[i].tMs - 800) < 1e-9)).toBe(true);
    const q = make();
    q.setHeartRate(120, 0);
    expect(q.heartRate).toBeCloseTo(120, 9);
    vs = q.eventsUntil(20000).filter((e): e is V => e.kind === 'V');
    const rr = vs.slice(1).map((v, i) => Math.round(v.tMs - vs[i].tMs));
    expect(new Set(rr)).toEqual(new Set([400, 600]));
    const p = make();
    p.setHeartRate(200, 0);
    expect(p.heartRate).toBe(150);
  });
});

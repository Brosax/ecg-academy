import { describe, expect, it } from 'vitest';
import { CycleIndex, cycleEnd, cycleStart, getHub, isClosedCycle, RingCache, rrOfCycle } from '../../../src/lab/ecg/sampler';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import { LEADS } from '../../../src/lab/sim/types';

/** Fill function whose values encode (channel, sample index, generation). */
function fakeFill(state: { gen: number }) {
  return (k0: number, n: number, out: Float32Array) => {
    for (let ch = 0; ch < 2; ch++) for (let i = 0; i < n; i++) out[ch * n + i] = ch * 1e6 + (k0 + i) + state.gen * 0.5;
  };
}

describe('RingCache', () => {
  it('fills a range and serves cached samples', () => {
    const st = { gen: 0 };
    const r = new RingCache(2, 100, fakeFill(st), 10);
    r.ensure(20, 60);
    expect(r.range).toEqual([20, 60]);
    expect(r.get(0, 20)).toBe(20);
    expect(r.get(1, 59)).toBe(1e6 + 59);
    expect(r.computed).toBe(40);
    r.ensure(30, 50); // already cached → no work
    expect(r.computed).toBe(40);
  });

  it('extends forward re-filling only the trailing guard, and keeps the newest `capacity` samples', () => {
    const st = { gen: 0 };
    const r = new RingCache(2, 100, fakeFill(st), 10);
    r.ensure(0, 50);
    st.gen = 1; // a late beat changed the recent past
    r.ensure(0, 80);
    expect(r.computed).toBe(50 + 40); // guard 10 + 30 new
    expect(r.get(0, 39)).toBe(39); // older than the guard: untouched
    expect(r.get(0, 45)).toBe(45.5); // inside the guard: refreshed
    r.ensure(60, 170);
    expect(r.range).toEqual([70, 170]);
    expect(r.get(0, 169)).toBe(169.5);
    expect(r.get(0, 60)).toBe(0); // evicted
  });

  it('extends backward and resets on a large seek', () => {
    const st = { gen: 0 };
    const r = new RingCache(2, 100, fakeFill(st), 10);
    r.ensure(50, 80);
    r.ensure(20, 80);
    expect(r.range).toEqual([20, 80]);
    expect(r.get(0, 25)).toBe(25);
    r.ensure(5000, 5010);
    expect(r.range).toEqual([5000, 5010]);
    expect(r.get(1, 5005)).toBe(1e6 + 5005);
    r.invalidate();
    expect(r.range).toBeNull();
  });

  it('handles negative sample indices (time before 0)', () => {
    const r = new RingCache(2, 64, fakeFill({ gen: 0 }), 4);
    r.ensure(-30, 10);
    const out = new Float32Array(5);
    r.copy(0, -30, 5, out);
    expect(Array.from(out)).toEqual([-30, -29, -28, -27, -26]);
  });
});

describe('EcgHub on the StubEngine', () => {
  const eng = new StubEngine();
  const hub = getHub(eng);

  it('is shared per engine', () => {
    expect(getHub(eng)).toBe(hub);
  });

  it('ring samples equal direct engine.sampleLeads (one source, cached)', () => {
    hub.ensureLeads(0, 3000);
    const n = 3001;
    const direct = new Float32Array(12 * n);
    eng.sampleLeads(0, n, direct);
    for (let l = 0; l < 12; l++)
      for (let i = 0; i < n; i += 97) expect(hub.leads.get(l, i)).toBeCloseTo(direct[l * n + i], 6);
    expect(hub.leadAt('V4', 1074)).toBeCloseTo(direct[LEADS.indexOf('V4') * n + 1074], 6);
  });

  it('H ring = H_A + H_V and projects to the leads', () => {
    const h = hub.hAt(1074);
    const L = eng.projector.leadVector('II');
    expect(L[0] * h[0] + L[1] * h[1] + L[2] * h[2]).toBeCloseTo(hub.leadAt('II', 1074), 5);
  });

  it('extending the window computes only new samples (plus the guard)', () => {
    const before = hub.leads.computed;
    hub.ensureLeads(0, 3016);
    expect(hub.leads.computed - before).toBeLessThanOrEqual(16 + hub.leads.guard + 1);
  });

  it('invalidates on engine.onChange', () => {
    const v = hub.version;
    eng.setPose(eng.geometry.pose);
    expect(hub.version).toBe(v + 1);
    expect(hub.leads.range).toBeNull();
  });

  it('enumerates consecutive cycles without gaps or duplicates and caches closed ones', () => {
    const cs = hub.cycles.range(500, 6000);
    expect(cs.length).toBeGreaterThanOrEqual(7);
    for (let i = 1; i < cs.length; i++) {
      expect(cycleStart(cs[i])).toBeCloseTo(cycleEnd(cs[i - 1]), 6);
      expect(cs[i].aId).not.toBe(cs[i - 1].aId);
    }
    expect(cs.every(isClosedCycle)).toBe(true);
    const calls = hub.cycles.calls;
    hub.cycles.range(500, 6000);
    expect(hub.cycles.calls).toBe(calls); // served from the cache
  });

  it('RR from cycle truth = 800 ms at 75 bpm', () => {
    const cs = hub.cycles.range(2000, 4000);
    expect(rrOfCycle(cs[1], cs[0], cs[2])).toBeCloseTo(800, 6);
  });

  it('CycleIndex works with a plain function and reports neighbours', () => {
    const idx = new CycleIndex((t) => eng.cycleAt(t));
    const c = idx.at(1300)!;
    expect(idx.next(c)!.aId).toBe(c.aId! + 2);
    expect(idx.prev(c)!.aId).toBe(c.aId! - 2);
  });

  it('beat analysis is memoized per cycle', () => {
    const c = hub.cycles.at(2100)!;
    expect(hub.beat(c)).toBe(hub.beat(c));
    expect(hub.beat(c).rrMs).toBeCloseTo(800, 6);
  });
});

describe('view summaries', () => {
  it('latest complete cycle has its T wave ended before t; the summary carries the measured intervals', async () => {
    const { latestCompleteCycle, beatSummary } = await import('../../../src/lab/ecg/summary');
    const eng = new StubEngine();
    const hub = getHub(eng);
    const t = 3000;
    const c = latestCompleteCycle(hub, t)!;
    expect(c.tEnd! + 40).toBeLessThanOrEqual(t);
    const next = hub.cycles.next(c);
    expect(next === null || next.tEnd === null || next.tEnd + 40 > t).toBe(true);
    const s = beatSummary('en', hub.beat(c));
    expect(s).toContain('75 bpm');
    expect(s).toMatch(/QRS duration \d+ ms/);
    expect(beatSummary('es', null)).toBe('Aún no hay ningún latido completo');
  });
});

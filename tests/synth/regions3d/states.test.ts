/**
 * T8 region states (DECISION §6.11, §8.2): values in [0, 2]; monotone within a beat; ventricles ≈ 1 at QRS end + 10 ms
 * and ≈ 2 at T end + 60 ms; blocked branches stay 0; the sinus node precedes the right atrium; highlights match the
 * scenario; stateAt is cheap enough for a 60 fps 3D view.
 */
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { REGION_LIST, type RegionId } from '../../../src/core/regions';
import { scenarios } from '../../../src/synth';
import { gen } from '../helpers';

const VENT = REGION_LIST.filter((r) => r.group === 'lv' || r.group === 'rv').map((r) => r.id as RegionId);
const idx = (id: RegionId): number => REGION_LIST.findIndex((r) => r.id === id);

function sample(id: string, seed = 1) {
  const r = gen({ scenario: id, seed });
  const st = r.ecg.regions!;
  const out = new Float32Array(st.ids.length);
  return { r, st, at: (t: number): Float32Array => (st.stateAt(t, out), Float32Array.from(out)) };
}

describe('region states (T8)', () => {
  for (const id of ['normal', 'rbbb', 'lbbb', 'wpw', 'vt-monomorphic', 'atrial-fibrillation', 'atrial-flutter', 'hyperkalemia']) {
    it(`${id}: range, ids, depolarised at QRS end, recovered after T, monotone within a beat`, () => {
      const { r, st, at } = sample(id);
      expect(st.ids).toEqual(REGION_LIST.map((x) => x.id));
      for (let t = 0; t < r.ecg.signal.durationMs; t += 7) for (const v of at(t)) expect(v >= 0 && v <= 2).toBe(true);
      const beats = r.ecg.truth!.beats;
      for (let k = 1; k + 1 < beats.length; k++) {
        const b = beats[k], next = beats[k + 1];
        const dep = at(b.qrsOff + 10);
        for (const v of VENT) expect(dep[idx(v)], `${id} beat ${k} ${v} at QRS end + 10`).toBeGreaterThanOrEqual(0.95);
        if (b.tOff + 60 < next.qrsOn) {
          const rec = at(b.tOff + 60);
          for (const v of VENT) expect(rec[idx(v)], `${id} beat ${k} ${v} at T end + 60`).toBeGreaterThanOrEqual(1.95);
        }
        // monotone from each region's activation in this beat (state restarts near 0) until the next beat's onset
        const started = new Set<RegionId>();
        let prev = at(b.qrsOn);
        for (let t = b.qrsOn + 2; t < next.qrsOn - 2; t += 2) {
          const cur = at(t);
          for (const v of VENT) {
            if (!started.has(v)) {
              if (cur[idx(v)] < 1) started.add(v);
              continue;
            }
            expect(cur[idx(v)] + 1e-6, `${id} ${v} decreases at ${t}`).toBeGreaterThanOrEqual(prev[idx(v)]);
          }
          prev = cur;
        }
        expect(started.size, `${id} beat ${k}: every ventricular region activates`).toBe(VENT.length);
      }
    });
  }

  it('blocked branches stay at rest and carry the block highlight', () => {
    const rb = sample('rbbb'), lb = sample('lbbb');
    for (let t = 0; t < 10000; t += 5) {
      expect(rb.at(t)[idx('rbb')]).toBe(0);
      const l = lb.at(t);
      for (const b of ['lbb', 'laf', 'lpf'] as const) expect(l[idx(b)]).toBe(0);
    }
    expect(rb.st.highlights.rbb).toBe('block');
    expect(lb.st.highlights.lbb).toBe('block');
    // and conduct when not blocked
    const n = sample('normal');
    const b = n.r.ecg.truth!.beats[3];
    expect(n.at(b.qrsOn)[idx('rbb')]).toBeGreaterThan(0);
  });

  it('the sinus node fires before the right atrium', () => {
    const n = sample('normal');
    for (const b of n.r.ecg.truth!.beats.slice(1, -1)) {
      const p = b.pOn!;
      expect(n.at(p - 5)[idx('sa-node')]).toBeGreaterThan(0);
      expect(n.at(p - 5)[idx('ra')]).toBe(2); // the RA is still recovered from the previous beat
      expect(n.at(p + 20)[idx('ra')]).toBeGreaterThan(0);
    }
  });

  it('highlights match the scenario', () => {
    for (const d of scenarios()) {
      const st = gen({ scenario: d.id, seed: 1 }).ecg.regions!;
      for (const [k, v] of Object.entries(d.highlights ?? {})) expect(st.highlights[k as RegionId], `${d.id} ${k}`).toBe(v);
    }
  });

  it('stateAt is cheap (< 0.05 ms per frame on a quiet machine; asserted with a 10× margin)', () => {
    const { st } = sample('atrial-fibrillation');
    const out = new Float32Array(st.ids.length);
    for (let i = 0; i < 2000; i++) st.stateAt(i * 5, out);
    const t0 = performance.now();
    for (let i = 0; i < 20000; i++) st.stateAt((i * 0.5) % 10000, out);
    expect((performance.now() - t0) / 20000).toBeLessThan(0.5);
  });
});

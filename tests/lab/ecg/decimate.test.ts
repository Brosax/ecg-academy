import { describe, expect, it } from 'vitest';
import { decimatedCapacity, decimateMinMax } from '../../../src/lab/ecg/decimate';

/** Seeded LCG so the test is deterministic. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('min/max decimation', () => {
  it('keeps every sample when there are fewer samples than ~2 per column', () => {
    const src = Float32Array.from({ length: 50 }, (_, i) => i);
    const out = new Float32Array(2 * decimatedCapacity(50, 2));
    const n = decimateMinMax(src, 0, 50, 10, 2, out);
    expect(n).toBe(50);
    expect(out[0]).toBe(10);
    expect(out[2 * 49]).toBe(10 + 98);
    expect(out[2 * 49 + 1]).toBe(49);
  });

  it('preserves the extremes of every column and bounds the point count', () => {
    const r = rng(7);
    const N = 10000;
    const src = Float32Array.from({ length: N }, () => r() * 2 - 1);
    src[4321] = 5; // a spike must survive
    src[777] = -6;
    const dx = 0.03; // 300 columns
    const out = new Float32Array(2 * decimatedCapacity(N, dx));
    const n = decimateMinMax(src, 0, N, 0, dx, out);
    expect(n).toBeLessThanOrEqual(2 * (Math.ceil(N * dx) + 1));
    let mx = -Infinity, mn = Infinity;
    for (let i = 0; i < n; i++) {
      mx = Math.max(mx, out[2 * i + 1]);
      mn = Math.min(mn, out[2 * i + 1]);
    }
    expect(mx).toBe(5);
    expect(mn).toBe(-6);
    // Per column: decimated min/max equal the true min/max of the samples in that column.
    const cols = new Map<number, { mn: number; mx: number }>();
    for (let i = 0; i < N; i++) {
      const c = Math.floor(i * dx);
      const e = cols.get(c) ?? { mn: Infinity, mx: -Infinity };
      e.mn = Math.min(e.mn, src[i]);
      e.mx = Math.max(e.mx, src[i]);
      cols.set(c, e);
    }
    const got = new Map<number, { mn: number; mx: number }>();
    for (let i = 0; i < n; i++) {
      const c = Math.floor(out[2 * i]);
      const e = got.get(c) ?? { mn: Infinity, mx: -Infinity };
      e.mn = Math.min(e.mn, out[2 * i + 1]);
      e.mx = Math.max(e.mx, out[2 * i + 1]);
      got.set(c, e);
    }
    for (const [c, e] of cols) {
      expect(got.get(c)!.mn).toBe(e.mn);
      expect(got.get(c)!.mx).toBe(e.mx);
    }
  });

  it('x positions are column centres in increasing order', () => {
    const src = Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i / 20));
    const out = new Float32Array(2 * decimatedCapacity(1000, 0.1));
    const n = decimateMinMax(src, 0, 1000, 3, 0.1, out);
    for (let i = 1; i < n; i++) expect(out[2 * i]).toBeGreaterThanOrEqual(out[2 * (i - 1)]);
    expect(out[0]).toBe(3.5);
  });
});

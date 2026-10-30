import { describe, expect, it } from 'vitest';
import { decimatedCapacity, decimateMinMax, scratchBuf } from '../../src/ecg/decimate';

describe('min/max decimation', () => {
  it('keeps every sample when there is room', () => {
    const src = Float32Array.from([0, 1, 2, 3]);
    const out = new Float32Array(2 * decimatedCapacity(4, 2));
    const m = decimateMinMax(src, 0, 4, 10, 2, out);
    expect(m).toBe(4);
    expect(Array.from(out.slice(0, 8))).toEqual([10, 0, 12, 1, 14, 2, 16, 3]);
  });

  it('never loses a narrow spike at low zoom', () => {
    const n = 5000;
    const src = new Float32Array(n);
    src[2500] = 3; // pacing spike, one sample wide
    src[2600] = -2;
    const dx = 0.1; // 10 samples per device column
    const out = new Float32Array(2 * decimatedCapacity(n, dx));
    const m = decimateMinMax(src, 0, n, 0, dx, out);
    expect(m).toBeLessThanOrEqual(decimatedCapacity(n, dx));
    let max = -Infinity, min = Infinity;
    for (let i = 0; i < m; i++) {
      max = Math.max(max, out[2 * i + 1]);
      min = Math.min(min, out[2 * i + 1]);
    }
    expect(max).toBe(3);
    expect(min).toBe(-2);
    // about two points per column
    expect(m).toBeLessThan(2 * (n * dx + 2) + 1);
    // x positions are monotonic
    for (let i = 1; i < m; i++) expect(out[2 * i]).toBeGreaterThanOrEqual(out[2 * i - 2]);
  });

  it('honours an offset into the source', () => {
    const src = Float32Array.from([9, 9, 1, 2]);
    const out = new Float32Array(8);
    expect(decimateMinMax(src, 2, 2, 0, 1, out)).toBe(2);
    expect(out[1]).toBe(1);
    expect(out[3]).toBe(2);
    expect(decimateMinMax(src, 0, 0, 0, 1, out)).toBe(0);
  });

  it('scratch buffers grow and are reused', () => {
    const a = scratchBuf(7, 100);
    expect(a.length).toBeGreaterThanOrEqual(1024);
    expect(scratchBuf(7, 50)).toBe(a);
    expect(scratchBuf(7, 5000).length).toBeGreaterThanOrEqual(5000);
  });

  it('a 10 s 12-lead at 500 Hz decimates in a few ms', () => {
    const n = 5000;
    const leads = Array.from({ length: 12 }, (_, k) => Float32Array.from({ length: n }, (_v, i) => Math.sin((i + k) / 30)));
    const out = new Float32Array(2 * decimatedCapacity(n, 0.4) + 4);
    const t0 = performance.now();
    for (let rep = 0; rep < 10; rep++) for (const a of leads) decimateMinMax(a, 0, n, 0, 0.4, out);
    const per = (performance.now() - t0) / 10;
    expect(per).toBeLessThan(15);
  });
});

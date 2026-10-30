/**
 * T0 (DECISION §8.2): kernel shapes — 2 % edges, analytic tangent end, monotone cdf, areas, plateau and impulse.
 */
import { describe, expect, it } from 'vitest';
import { areaVector, cdfAt, lobeKernel, lobeWithArea, plateauKernel, shapeAt, unitArea, type Lobe } from '../../../src/synth/kernel/kernel';
import { bumpValue, EDGE_U, partialArea, shapeConst, smoother, smootherInt, TANGENT_U } from '../../../src/synth/kernel/shapes';

const lobe = (over: Partial<Lobe> = {}): Lobe => ({
  label: 't', on: 0, peak: 30, end: 80, endRule: 'edge', q: 2, dir: [1, 0, 0], dir2: null, amp: 1, regions: [], loc: null, far: 1, wave: 'QRS',
  ...over,
});

describe('bump shape', () => {
  it('reaches 2 % of the peak at the authored edges (q = 2)', () => {
    expect(bumpValue(EDGE_U, 2)).toBeCloseTo(0.02, 2);
    const k = lobeKernel(lobe(), 0, 0);
    expect(shapeAt(k, 0)).toBeCloseTo(0.02, 2);
    expect(shapeAt(k, 80)).toBeCloseTo(0.02, 2);
    expect(shapeAt(k, 30)).toBe(1);
  });

  it('places the tangent-method end exactly at the authored end (q = 2, analytic)', () => {
    // f(u) = (1 − u²)³: steepest descent at u = 1/√5; the tangent there meets zero at TANGENT_U
    const um = 1 / Math.sqrt(5);
    const f = (u: number): number => (1 - u * u) ** 3;
    const slope = 6 * um * (1 - um * um) ** 2;
    expect(um + f(um) / slope).toBeCloseTo(TANGENT_U, 12);
    const k = lobeKernel(lobe({ endRule: 'tangent', end: 200, peak: 120, on: 40 }), 0, 0);
    // numerical tangent end of the rendered kernel
    let best = 0, tb = 0;
    for (let t = 120; t < k.s1; t += 0.05) {
      const s = (shapeAt(k, t - 0.05) - shapeAt(k, t + 0.05)) / 0.1;
      if (s > best) {
        best = s;
        tb = t;
      }
    }
    expect(tb + shapeAt(k, tb) / best).toBeCloseTo(200, 0);
  });

  it('computes edges and tangent ends numerically for pointed shapes (q < 2)', () => {
    const c = shapeConst(1.4);
    expect(bumpValue(c.edge, 1.4)).toBeCloseTo(0.02, 3);
    expect(c.tangent).toBeGreaterThan(0.3);
    expect(c.tangent).toBeLessThan(1);
    expect(c.half).toBeGreaterThan(0);
  });

  it('has a monotone cdf from 0 to 1 and an area that matches quadrature', () => {
    for (const q of [2, 1.5]) {
      const k = lobeKernel(lobe({ q }), 10, 0);
      let prev = -1;
      let num = 0;
      for (let t = k.s0 - 5; t <= k.s1 + 5; t += 0.1) {
        const c = cdfAt(k, t);
        expect(c).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = c;
        num += shapeAt(k, t) * 0.1;
      }
      expect(cdfAt(k, k.s0 - 1)).toBe(0);
      expect(cdfAt(k, k.s1 + 1)).toBe(1);
      expect(unitArea(k)).toBeCloseTo(num, 1);
    }
    const c2 = shapeConst(2);
    expect(partialArea(c2, 1)).toBeCloseTo(16 / 35, 10);
  });

  it('builds a lobe whose area vector equals the requested one', () => {
    const a: [number, number, number] = [12, -5, 3];
    const l = lobeWithArea({ label: 'x', on: 0, peak: 40, end: 110, endRule: 'tangent', q: 2, regions: [], loc: null, far: 1, wave: 'T' }, a);
    const v = areaVector(lobeKernel(l, 0, 0));
    for (let i = 0; i < 3; i++) expect(v[i]).toBeCloseTo(a[i], 6);
  });
});

describe('plateau and helpers', () => {
  it('rises and falls with a smootherstep and is flat in between', () => {
    const k = plateauKernel({ label: 'p', on: 0, riseEnd: 20, fallStart: 100, end: 140, dir: [0, 1, 0], amp: 1, regions: [], loc: null, far: 1, wave: 'ST' }, 0, 0);
    expect(shapeAt(k, 10)).toBeCloseTo(0.5, 6);
    expect(shapeAt(k, 60)).toBe(1);
    expect(shapeAt(k, 120)).toBeCloseTo(0.5, 6);
    expect(unitArea(k)).toBeCloseTo(10 + 80 + 20, 9);
  });
  it('smootherstep integral is consistent', () => {
    expect(smoother(0.5)).toBeCloseTo(0.5, 12);
    expect(smootherInt(1)).toBeCloseTo(0.5, 12);
  });
});

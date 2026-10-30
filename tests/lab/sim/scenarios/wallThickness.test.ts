/**
 * tissue.hypertrophy → per-voxel factors (src/sim/scenarios/wallThickness.ts) and the transmural speed factor of the
 * conduction graph (fastestRoute transScale): a k-fold thicker wall takes k-fold longer to cross, along-wall
 * conduction is unchanged.
 */
import { describe, expect, it } from 'vitest';
import { fastestRoute } from '../../../../src/lab/sim/conduction/fastestRoute';
import { hypertrophyFields, hypertrophyKernels } from '../../../../src/lab/sim/scenarios/wallThickness';
import { buildKernel, kernelSum } from '../../../../src/lab/sim/source/voxelEdl';
import { COMP, STRUCTURES, TISSUE } from '../../../../src/lab/sim/types';
import { idx, makeGrid } from '../helpers/syntheticGrid';

describe('tissue.hypertrophy fields', () => {
  // x < 6: RV free wall, 6 ≤ x < 12: LV lateral wall, x ≥ 12: right atrium (all with transDir +z)
  const g = makeGrid([16, 6, 6], 1.5, (i) =>
    i < 6
      ? { tissue: TISSUE.RV, region: STRUCTURES.indexOf('RV_FREE'), transDir: [0, 0, 1] }
      : i < 12
        ? { tissue: TISSUE.LV, region: STRUCTURES.indexOf('LV_LATERAL'), transDir: [0, 0, 1] }
        : { tissue: TISSUE.RA, region: STRUCTURES.indexOf('RA') },
  );

  it('no selector → null (the engine keeps the unweighted kernels and the normal activation)', () => {
    expect(hypertrophyFields(g, undefined)).toBeNull();
    expect(hypertrophyFields(g, { hypertrophy: [] })).toBeNull();
  });

  it('ventricular selectors give thickness factors and the transmural speed factor 1/k; atrial selectors a source factor', () => {
    const f = hypertrophyFields(g, { hypertrophy: [{ regions: ['RV_FREE'], factor: 2.5 }, { regions: ['RA'], factor: 3 }] })!;
    const rv = idx(g, 2, 2, 2), lv = idx(g, 8, 2, 2), ra = idx(g, 14, 2, 2);
    expect(f.ventricular![rv]).toBe(2.5);
    expect(f.ventricular![lv]).toBe(1);
    expect(f.transScale![rv]).toBeCloseTo(0.4, 6);
    expect(f.transScale![lv]).toBe(1);
    expect(f.atrial![ra]).toBe(3);
    expect(f.atrial![rv]).toBe(1);
    const k = hypertrophyKernels(g, f);
    expect(kernelSum(k.ventricular)).toEqual([0, 0, 0]);
    expect(kernelSum(k.atrial)).toEqual([0, 0, 0]);
    expect(Array.from(k.ventricular.c)).not.toEqual(Array.from(buildKernel(g, COMP.Ventricular).c));
  });

  it('atrial-only enlargement leaves the ventricles untouched', () => {
    const f = hypertrophyFields(g, { hypertrophy: [{ regions: ['RA'], factor: 2 }] })!;
    expect(f.ventricular).toBeNull();
    expect(f.transScale).toBeNull();
    expect(Array.from(hypertrophyKernels(g, f).ventricular.c)).toEqual(Array.from(buildKernel(g, COMP.Ventricular).c));
  });

  it('rejects a non-positive factor', () => {
    expect(() => hypertrophyFields(g, { hypertrophy: [{ regions: ['RV_FREE'], factor: 0 }] })).toThrow();
  });
});

describe('fastest route: transmural speed factor', () => {
  const n = 41, c = 20;
  const g = makeGrid([n, n, n], 1, () => ({ tissue: TISSUE.LV, transDir: [0, 0, 1] }));
  const center = idx(g, c, c, c);
  const run = (ts?: Float32Array) =>
    fastestRoute({ grid: g, comp: COMP.Ventricular, stencil: 50, vLongMps: 0.85, vTransMps: 0.34, transScale: ts, seeds: [{ voxel: center, tMs: 0 }] }).tAct;

  it('factor 1/k: crossing the wall takes k-fold longer, along the wall unchanged', () => {
    const k = 2;
    const t1 = run(), tk = run(new Float32Array(g.tissue.length).fill(1 / k));
    expect(tk[idx(g, c, c, c + 10)]).toBeCloseTo((k * 10) / 0.34, 4);
    expect(tk[idx(g, c + 10, c, c)]).toBeCloseTo(t1[idx(g, c + 10, c, c)], 6);
    expect(tk[idx(g, c, c + 10, c)]).toBeCloseTo(t1[idx(g, c, c + 10, c)], 6);
  });

  it('factor 1 everywhere is identical to no factor', () => {
    expect(run(new Float32Array(g.tissue.length).fill(1))).toEqual(run());
  });
});

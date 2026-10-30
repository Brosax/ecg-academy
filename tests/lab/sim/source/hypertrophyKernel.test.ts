/**
 * Hypertrophy-weighted voxel-face kernel (src/sim/source/hypertrophyKernel.ts): exact closure, identity at k = 1, and
 * the transmural-stretch geometry (fronts along the wall ×k, fronts across the wall ×1) on a flat slab.
 */
import { describe, expect, it } from 'vitest';
import { weightKernel } from '../../../../src/lab/sim/scenarios/tissue';
import { buildHypertrophyKernel } from '../../../../src/lab/sim/source/hypertrophyKernel';
import { buildKernel, kernelSum } from '../../../../src/lab/sim/source/voxelEdl';
import type { SourceKernel, VoxelGrid } from '../../../../src/lab/sim/types';
import { COMP, TISSUE } from '../../../../src/lab/sim/types';
import { slabGrid } from '../helpers/syntheticGrid';

const ones = (g: VoxelGrid) => new Float32Array(g.tissue.length).fill(1);

/** Σ c over the voxels selected by pred (the source of a front that has depolarized exactly that set). */
const partialSum = (k: SourceKernel, g: VoxelGrid, pred: (i: number, j: number, kk: number) => boolean): [number, number, number] => {
  const [nx, ny] = g.dims;
  const s: [number, number, number] = [0, 0, 0];
  for (let q = 0; q < k.voxels.length; q++) {
    const v = k.voxels[q];
    const i = v % nx, j = Math.floor(v / nx) % ny, kk = Math.floor(v / (nx * ny));
    if (!pred(i, j, kk)) continue;
    s[0] += k.c[3 * q];
    s[1] += k.c[3 * q + 1];
    s[2] += k.c[3 * q + 2];
  }
  return s;
};

describe('hypertrophy-weighted kernel', () => {
  const g = slabGrid(16, 4, 12, 1.5); // LV wall k = 4…11, transDir +z, h = 1.5 mm

  it('k ≡ 1 reproduces buildKernel exactly (both modes)', () => {
    const k0 = buildKernel(g, COMP.Ventricular);
    for (const mode of ['isotropic', 'transmural'] as const) {
      const k1 = buildHypertrophyKernel(g, COMP.Ventricular, ones(g), mode);
      expect(Array.from(k1.voxels)).toEqual(Array.from(k0.voxels));
      expect(Array.from(k1.c)).toEqual(Array.from(k0.c));
    }
  });

  it('Σc = 0 exactly for any weights, including a step and a non-dyadic factor', () => {
    const w = ones(g);
    for (let v = 0; v < w.length; v++) if (v % 16 < 7) w[v] = 2.3; // half the slab thick, the other half normal
    for (const mode of ['isotropic', 'transmural'] as const) expect(kernelSum(buildHypertrophyKernel(g, COMP.Ventricular, w, mode))).toEqual([0, 0, 0]);
  });

  it('a per-VOXEL weight of part of the wall breaks closure (the plateau artefact the face weighting avoids)', () => {
    const k0 = buildKernel(g, COMP.Ventricular);
    const amplitude = ones(g);
    for (let v = 0; v < amplitude.length; v++) if (v % 16 < 7) amplitude[v] = 2;
    const perVoxel = weightKernel(k0, { amplitude, rest: new Float32Array(amplitude.length), any: true });
    expect(Math.hypot(...kernelSum(perVoxel))).toBeGreaterThan(1);
  });

  it('transmural stretch: a front running along the wall is k-fold larger, a front crossing the wall is unchanged', () => {
    const k = 2;
    const k0 = buildKernel(g, COMP.Ventricular);
    const kT = buildHypertrophyKernel(g, COMP.Ventricular, ones(g).fill(k), 'transmural');
    const kI = buildHypertrophyKernel(g, COMP.Ventricular, ones(g).fill(k), 'isotropic');
    // front along the wall: the voxels with i < 8 are depolarized (front surface ⊥ x, spanning the wall thickness)
    const along = (i: number) => i < 8;
    const a0 = partialSum(k0, g, along), aT = partialSum(kT, g, along), aI = partialSum(kI, g, along);
    expect(Math.abs(a0[0])).toBeGreaterThan(0);
    expect(aT[0]).toBe(k * a0[0]);
    expect(aI[0]).toBe(k * a0[0]);
    // front crossing the wall: the inner layers k < 8 are depolarized (front surface ⊥ z, parallel to the wall)
    const across = (_i: number, _j: number, kk: number) => kk < 8;
    const c0 = partialSum(k0, g, across), cT = partialSum(kT, g, across), cI = partialSum(kI, g, across);
    expect(Math.abs(c0[2])).toBeGreaterThan(0);
    expect(cT[2]).toBe(c0[2]);
    expect(cI[2]).toBe(k * c0[2]);
  });

  it('only the selected compartment is weighted (atrial voxels keep their kernel)', () => {
    const g2 = slabGrid(12, 3, 9, 1.5);
    const t = Uint8Array.from(g2.tissue);
    for (let v = 0; v < t.length; v++) if (t[v] === TISSUE.LV && v % 12 < 4) t[v] = TISSUE.RA;
    const gm = { ...g2, tissue: t };
    const kA0 = buildKernel(gm, COMP.Atrial);
    const kA = buildHypertrophyKernel(gm, COMP.Atrial, ones(gm), 'isotropic');
    expect(Array.from(kA.c)).toEqual(Array.from(kA0.c));
    expect(kernelSum(buildHypertrophyKernel(gm, COMP.Atrial, ones(gm).fill(3), 'isotropic'))).toEqual([0, 0, 0]);
  });
});

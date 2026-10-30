/** Small hand-built voxel grids for exact invariant tests (no geometry pipeline involved). */
import type { Vec3, VoxelGrid } from '../../../../src/lab/sim/types';
import { CHAMBER, STRUCTURE_NONE, TISSUE } from '../../../../src/lab/sim/types';

export interface CellSpec {
  readonly tissue: number;
  readonly chamber?: number;
  readonly wallDepth?: number;
  readonly apexBase?: number;
  readonly transDir?: Vec3;
  readonly region?: number;
}

export function makeGrid(dims: [number, number, number], hMm: number, cell: (i: number, j: number, k: number) => CellSpec): VoxelGrid {
  const [nx, ny, nz] = dims;
  const N = nx * ny * nz;
  const tissue = new Uint8Array(N), chamber = new Uint8Array(N), aha = new Uint8Array(N);
  const region = new Uint8Array(N).fill(STRUCTURE_NONE);
  const wallDepth = new Float32Array(N), apexBase = new Float32Array(N), transDir = new Float32Array(3 * N), sdfMm = new Float32Array(N);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        const c = cell(i, j, k);
        tissue[v] = c.tissue;
        chamber[v] = c.chamber ?? 0;
        wallDepth[v] = c.wallDepth ?? 0;
        apexBase[v] = c.apexBase ?? 0.5;
        if (c.region !== undefined) region[v] = c.region;
        if (c.transDir) transDir.set(c.transDir, 3 * v);
      }
  return { dims, hMm, originMm: [0, 0, 0], tissue, chamber, aha, region, wallDepth, apexBase, transDir, sdfMm };
}

/**
 * Ventricular wall slab: Blood (LV cavity) for k < k0, LV myocardium for k0 ≤ k < k1, Out above.
 * wallDepth 0 at the endocardium (k0) … 1 at the epicardium; transDir = +z.
 */
export function slabGrid(n = 16, k0 = 4, k1 = 12, h = 1): VoxelGrid {
  return makeGrid([n, n, n], h, (_i, _j, k) =>
    k < k0
      ? { tissue: TISSUE.Blood, chamber: CHAMBER.LV }
      : k < k1
        ? { tissue: TISSUE.LV, chamber: CHAMBER.LV, wallDepth: (k - k0) / (k1 - 1 - k0), transDir: [0, 0, 1] }
        : { tissue: TISSUE.Out },
  );
}

export const idx = (g: VoxelGrid, i: number, j: number, k: number): number => i + g.dims[0] * (j + g.dims[1] * k);

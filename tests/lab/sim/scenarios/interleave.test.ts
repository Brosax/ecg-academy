/**
 * RegionSelector.interleave (src/sim/scenarios/tissue.ts): an evenly spread voxel subset. The property the
 * hypokalaemia U wave rests on: on the HRA heart the subset's kernel sum Σc is ≈ keep/of · Σc of the selection — a
 * spread subset has no net dipole of its own (a localized subset such as the RV subendocardium does).
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import { interleaveKeeps, selectVoxels } from '../../../../src/lab/sim/scenarios/tissue';
import type { RegionSelector } from '../../../../src/lab/sim/scenarios/types';
import { buildKernel } from '../../../../src/lab/sim/source/voxelEdl';
import type { SourceKernel, StructureId, VoxelGrid } from '../../../../src/lab/sim/types';
import { COMP, STRUCTURES } from '../../../../src/lab/sim/types';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let g: VoxelGrid;
let k: SourceKernel;

beforeAll(async () => {
  g = (await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)))).grid;
  k = buildKernel(g, COMP.Ventricular);
});

/** Σc and Σ|c| of the kernel voxels inside `mask` (optionally restricted to one region). */
function cSum(mask: Uint8Array, region?: number) {
  const s = [0, 0, 0];
  let abs = 0;
  for (let q = 0; q < k.voxels.length; q++) {
    const v = k.voxels[q];
    if (!mask[v] || (region !== undefined && g.region[v] !== region)) continue;
    s[0] += k.c[3 * q];
    s[1] += k.c[3 * q + 1];
    s[2] += k.c[3 * q + 2];
    abs += Math.hypot(k.c[3 * q], k.c[3 * q + 1], k.c[3 * q + 2]);
  }
  return { s, abs };
}

const maskOf = (sel: RegionSelector) => {
  const m = new Uint8Array(g.tissue.length);
  for (const v of selectVoxels(g, sel)) m[v] = 1;
  return m;
};

describe('interleaveKeeps', () => {
  it('keeps exactly `keep` of every `of` consecutive lattice classes, spread evenly (gap ≤ ⌈of/keep⌉)', () => {
    for (const [keep, of] of [[1, 2], [7, 10], [4, 10], [13, 20], [3, 5]] as const) {
      const kept: number[] = [];
      // classes c = 0 … of−1 along the i axis (j = k = 0)
      for (let c = 0; c < of; c++) if (interleaveKeeps(c, 1000, 1000, keep, of)) kept.push(c);
      expect(kept.length).toBe(keep);
      const gaps = kept.map((c, i) => (i + 1 < kept.length ? kept[i + 1] : kept[0] + of) - c);
      expect(Math.max(...gaps)).toBeLessThanOrEqual(Math.ceil(of / keep));
    }
  });
});

describe('interleaved subset on the HRA ventricles (7 of 10)', () => {
  const SEL: RegionSelector = { interleave: { keep: 7, of: 10 } };
  const ALL_V: StructureId[] = ['SEPTUM', 'LV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'RV_FREE', 'RV_APEX', 'RVOT'];

  it('selects 70 % ± 1 % of the voxels of every ventricular region', () => {
    const all = maskOf({}), sub = maskOf(SEL);
    for (const id of ALL_V) {
      const r = STRUCTURES.indexOf(id);
      let n = 0, m = 0;
      for (let v = 0; v < g.tissue.length; v++) if (all[v] && g.region[v] === r) {
        n++;
        m += sub[v];
      }
      if (n < 200) continue;
      expect(Math.abs(m / n - 0.7), id).toBeLessThan(0.01);
    }
  });

  it('no net dipole: |Σc| of the subset < 1 % of its Σ|c|, per region within 2 % of 0.7 · Σc(region); a localized subset (RV subendocardium) is 10× larger', () => {
    const sub = maskOf(SEL), all = maskOf({});
    const whole = cSum(sub);
    const rel = Math.hypot(...whole.s) / whole.abs;
    const loc = cSum(maskOf({ regions: ['RV_FREE', 'RV_APEX'], layer: 'subendocardial' }));
    const relLoc = Math.hypot(...loc.s) / loc.abs;
    const lines = [`interleave 7/10: |Σc|/Σ|c| = ${(100 * rel).toFixed(2)} % (RV subendocardium: ${(100 * relLoc).toFixed(1)} %)`];
    expect(rel).toBeLessThan(0.01);
    expect(relLoc).toBeGreaterThan(10 * rel);
    for (const id of ALL_V) {
      const r = STRUCTURES.indexOf(id);
      const a = cSum(sub, r), b = cSum(all, r);
      if (b.abs === 0) continue;
      const err = Math.hypot(a.s[0] - 0.7 * b.s[0], a.s[1] - 0.7 * b.s[1], a.s[2] - 0.7 * b.s[2]) / b.abs;
      lines.push(`${id}: |Σc(sub) − 0.7·Σc(region)| / Σ|c|(region) = ${(100 * err).toFixed(2)} %`);
      expect(err, id).toBeLessThan(0.02);
    }
    console.log(lines.join('\n'));
  });
});

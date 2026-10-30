/**
 * AHA-segment Purkinje exclusion (VentricularVariantSpec.purkinjeExcludeAha → PurkinjeOptions.excludeAha), the lever of
 * the fascicular blocks: it removes LV endocardial Purkinje coverage segment by segment, leaves the RV (incl. the right
 * septal surface) alone, and is a no-op when absent.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildVentricularActivation } from '../../../../src/lab/sim/conduction/graph';
import { resolveParams } from '../../../../src/lab/sim/conduction/params';
import type { PurkinjeLayer, PurkinjeOptions } from '../../../../src/lab/sim/conduction/purkinje';
import { buildPurkinjeLayer } from '../../../../src/lab/sim/conduction/purkinje';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import { NORMAL_PARAMS } from '../../../../src/lab/sim/scenarios/normal';
import type { GeometryBundle } from '../../../../src/lab/sim/types';
import { CHAMBER } from '../../../../src/lab/sim/types';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;
let opts: PurkinjeOptions;
let base: PurkinjeLayer;
const EX = [3, 4, 5, 9, 10, 11, 15];

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  const p = resolveParams(NORMAL_PARAMS);
  opts = {
    extent: p.purkinjeExtent, exclude: p.purkinjeExclude, stencil: p.stencil,
    vPurkinjeMps: p.vPurkinjeMps, pmjDelayMs: p.pmjDelayMs, retroDelayMs: p.retroDelayMs,
  };
  base = buildPurkinjeLayer(geo.grid, opts);
});

const nodeSet = (pk: PurkinjeLayer, chamber: number) => {
  const s = new Set<number>();
  for (let n = 0; n < pk.size; n++) if (pk.chamber[n] === chamber) s.add(pk.voxel[n]);
  return s;
};

describe('Purkinje exclusion by AHA segment', () => {
  it('absent or empty: the layer is identical to the plain build', () => {
    for (const excludeAha of [undefined, []]) {
      const pk = buildPurkinjeLayer(geo.grid, { ...opts, excludeAha });
      expect(pk.voxel).toEqual(base.voxel);
      expect(pk.adjNode).toEqual(base.adjNode);
      expect(pk.adjMs).toEqual(base.adjMs);
    }
  });

  it('removes every LV node in the listed segments and keeps all other LV nodes', () => {
    const g = geo.grid;
    const pk = buildPurkinjeLayer(g, { ...opts, excludeAha: EX });
    const lv0 = nodeSet(base, CHAMBER.LV), lv1 = nodeSet(pk, CHAMBER.LV);
    let removed = 0;
    for (const v of lv0) {
      if (EX.includes(g.aha[v])) {
        expect(lv1.has(v)).toBe(false);
        removed++;
      } else expect(lv1.has(v)).toBe(true);
    }
    expect(removed).toBeGreaterThan(200);
    expect(lv1.size).toBe(lv0.size - removed);
  });

  it('leaves the RV network, including the right septal surface, untouched', () => {
    const pk = buildPurkinjeLayer(geo.grid, { ...opts, excludeAha: EX });
    const rv0 = nodeSet(base, CHAMBER.RV), rv1 = nodeSet(pk, CHAMBER.RV);
    expect(rv1).toEqual(rv0);
    // the right septal surface carries AHA labels (septal tissue) and must survive the exclusion of 3 and 9
    let septalRv = 0;
    for (const v of rv1) if ([3, 9].includes(geo.grid.aha[v])) septalRv++;
    expect(septalRv).toBeGreaterThan(0);
  });

  it('a variant with purkinjeExcludeAha never reuses a prepared (normal) layer', () => {
    const p = resolveParams(NORMAL_PARAMS);
    const va = buildVentricularActivation(geo, p, 'lpfb', base, { id: 'lpfb', blockTerminals: ['LPF'], purkinjeExcludeAha: EX });
    expect(va.purkinje).not.toBe(base);
    expect(va.purkinje.size).toBeLessThan(base.size);
    const normal = buildVentricularActivation(geo, p, 'normal', base, { id: 'normal' });
    expect(normal.purkinje).toBe(base);
  });
});

/**
 * LVOT (three-chamber) cross-section (src/view3d/core/lvotSlice.ts): the plane through the LV apex and the mitral and
 * aortic valve centres, the RV half cut away, shifted so the left-ventricular outflow stream stays in the kept half.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { add, dot, normalize, scale } from '../../../src/lab/sim/frame';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { buildStubGeometry } from '../../../src/lab/sim/stub/stubGeometry';
import type { GeometryBundle } from '../../../src/lab/sim/types';
import { CHAMBER, VALVES } from '../../../src/lab/sim/types';
import { buildFlowPaths } from '../../../src/lab/view3d/core/flowPaths';
import { LVOT_SHIFT_MM, lvotSlice, lvotSliceKey } from '../../../src/lab/view3d/core/lvotSlice';

function check(geo: GeometryBundle) {
  const p = lvotSlice(geo)!;
  expect(p).not.toBeNull();
  expect(Math.hypot(...p.normal)).toBeCloseTo(1, 5);
  const lv = geo.chambers.find((c) => c.chamber === CHAMBER.LV)!, rv = geo.chambers.find((c) => c.chamber === CHAMBER.RV)!;
  const apex = add(lv.centerMm, scale(normalize(lv.axis), 0.5 * lv.lengthMm));
  const mv = geo.valves.find((v) => v.id === 'MITRAL')!.centerMm, av = geo.valves.find((v) => v.id === 'AORTIC')!.centerMm;
  // apex, mitral and aortic centres lie LVOT_SHIFT_MM on the kept side of the plane (dot ≤ offset is kept)
  for (const q of [apex, mv, av]) expect(dot(p.normal, q) - p.offsetMm).toBeCloseTo(-LVOT_SHIFT_MM, 0);
  // the RV is cut away
  expect(dot(p.normal, rv.centerMm)).toBeGreaterThan(p.offsetMm);
  return p;
}

describe('LVOT cut', () => {
  let hra: GeometryBundle;
  beforeAll(async () => {
    hra = await loadHraGeometry(undefined, new Uint8Array(readFileSync(new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url))));
  });

  it('HRA heart: plane through apex, mitral and aortic valve; RV cut away; the LV outflow stream stays visible', () => {
    const p = check(hra);
    const out = buildFlowPaths(hra)[VALVES.indexOf('AORTIC')];
    const kept = out.pts.filter((q) => dot(p.normal, q) <= p.offsetMm).length;
    expect(kept / out.pts.length).toBeGreaterThan(0.85);
    // most of the mitral inflow too (the three-chamber view shows filling and ejection)
    const inflow = buildFlowPaths(hra)[VALVES.indexOf('MITRAL')];
    expect(inflow.pts.filter((q) => dot(p.normal, q) <= p.offsetMm).length / inflow.pts.length).toBeGreaterThan(0.6);
  });

  it('stub heart: the same construction', () => {
    check(buildStubGeometry());
  });

  it('recognised as a "custom" slice state (the frozen SlicePreset has no lvot member yet)', () => {
    const p = lvotSlice(hra)!;
    expect(lvotSliceKey(hra, { preset: 'custom', normal: p.normal, offsetMm: p.offsetMm })).toBe('lvot');
    expect(lvotSliceKey(hra, { preset: 'fourChamber', normal: p.normal, offsetMm: p.offsetMm })).toBeNull();
    expect(lvotSliceKey(hra, { preset: 'custom', normal: p.normal, offsetMm: p.offsetMm + 3 })).toBeNull();
    expect(lvotSliceKey(hra, { preset: 'custom', normal: [0, 0, 1], offsetMm: p.offsetMm })).toBeNull();
    // missing valves: no plane
    expect(lvotSlice({ chambers: hra.chambers, valves: [] })).toBeNull();
  });
});

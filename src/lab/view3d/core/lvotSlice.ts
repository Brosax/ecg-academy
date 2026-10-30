/**
 * LVOT (three-chamber, apical long-axis) cross-section: the plane through the LV apex, the mitral valve centre and the
 * aortic valve centre, so the cut shows the left atrium, the LV inflow, the LV outflow tract and the aortic root — the
 * ejection path that the four-chamber cut leaves in front of the plane. The removed half is the one holding the RV
 * (the normal points toward the RV centroid); the plane sits LVOT_SHIFT_MM toward the removed half, so the LV streams
 * (about on the plane) stay whole in the kept half and show through the opened cavity.
 *
 * NOTE for the integrator: the frozen SlicePreset union (src/app/store.ts) has no 'lvot' member, so the section panel
 * sets this plane as preset 'custom'; lvotSliceKey() recognises it (the scene then turns the camera to face it).
 */
import { add, cross, dot, normalize, scale, sub } from '../../sim/frame';
import type { GeometryBundle, Vec3 } from '../../sim/types';
import { CHAMBER } from '../../sim/types';

export const LVOT_SHIFT_MM = 4;

export interface SlicePlane {
  readonly normal: Vec3;
  readonly offsetMm: number;
}

/** The LVOT plane of a geometry (heart-local frame), or null without an LV axis or mitral / aortic valve. */
export function lvotSlice(geo: Pick<GeometryBundle, 'chambers' | 'valves'>): SlicePlane | null {
  const lv = geo.chambers.find((c) => c.chamber === CHAMBER.LV);
  const rv = geo.chambers.find((c) => c.chamber === CHAMBER.RV);
  const mv = geo.valves.find((v) => v.id === 'MITRAL'), av = geo.valves.find((v) => v.id === 'AORTIC');
  if (!lv || !mv || !av) return null;
  // ventricular axis runs base → apex
  const apex = add(lv.centerMm, scale(normalize(lv.axis), 0.5 * lv.lengthMm));
  let n = cross(sub(mv.centerMm, apex), sub(av.centerMm, apex));
  if (!(Math.hypot(n[0], n[1], n[2]) > 1e-6)) return null;
  n = normalize(n);
  // cut away the RV side; without an RV axis, the side opposite the LV centre's lateral (+x) direction
  const away = rv ? sub(rv.centerMm, apex) : ([-1, 0, 0] as Vec3);
  if (dot(n, away) < 0) n = scale(n, -1);
  const r = (x: number) => Math.round(x * 1e6) / 1e6;
  const normal: Vec3 = [r(n[0]), r(n[1]), r(n[2])];
  return { normal, offsetMm: Math.round((dot(normal, apex) + LVOT_SHIFT_MM) * 10) / 10 };
}

/** 'lvot' when the slice state is the geometry's LVOT plane (as a 'custom' cut), else null. */
export function lvotSliceKey(
  geo: Pick<GeometryBundle, 'chambers' | 'valves'>, s: { readonly preset: string; readonly normal: Vec3; readonly offsetMm: number },
): 'lvot' | null {
  if (s.preset !== 'custom') return null;
  const p = lvotSlice(geo);
  if (!p) return null;
  // the stored plane is rounded (6 decimals, 0.1 mm): compare per component
  const same = p.normal.every((x, i) => Math.abs(x - s.normal[i]) < 1e-5) && Math.abs(p.offsetMm - s.offsetMm) < 0.05;
  return same ? 'lvot' : null;
}

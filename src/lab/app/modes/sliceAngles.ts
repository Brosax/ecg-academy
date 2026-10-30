/**
 * Custom slice orientation as two angles in the heart-LOCAL frame (+y apex→base, +z anterior, +x LV lateral):
 * tilt θ = angle of the plane normal from the long axis (+y), rotation φ = azimuth of the normal about the long axis,
 * measured from +x toward +z. θ = 0 is a short-axis cut; θ = 90°, φ = 90° the four-chamber cut.
 */
import type { Vec3 } from '../../sim/types';

const RAD = Math.PI / 180;

export function normalFromAngles(tiltDeg: number, rotDeg: number): Vec3 {
  const t = tiltDeg * RAD, p = rotDeg * RAD;
  const r = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x);
  return [r(Math.sin(t) * Math.cos(p)), r(Math.cos(t)), r(Math.sin(t) * Math.sin(p))];
}

/** Inverse of normalFromAngles; rotation is null when the normal lies on the long axis (undefined azimuth). */
export function anglesFromNormal(n: Vec3): { tiltDeg: number; rotDeg: number | null } {
  const len = Math.hypot(n[0], n[1], n[2]) || 1;
  const y = Math.max(-1, Math.min(1, n[1] / len));
  const tiltDeg = Math.acos(y) / RAD;
  const s = Math.hypot(n[0], n[2]) / len;
  return { tiltDeg, rotDeg: s < 1e-3 ? null : Math.atan2(n[2], n[0]) / RAD };
}

export const SLICE_OFFSET_RANGE_MM = { min: -50, max: 60 } as const;

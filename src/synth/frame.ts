/**
 * The only frame conversions of the engine (DECISION §3.6) and small Vec3 helpers.
 *
 * Frank frame (all source positions and directions): +X patient left, +Y inferior, +Z posterior; positions in cm,
 * origin = ventricular centroid; kernel amplitudes in mV.
 * Hexaxial (frontal) angles: lead I = 0°, aVF = +90° (inferior), degrees in (−180, 180].
 * 3D view frame (src/heart3d, HRA mesh): +x patient left, +y superior, +z anterior → (X, −Y, −Z).
 */
import type { Vec3 } from './api';

export type { Vec3 };
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const ZERO: Vec3 = [0, 0, 0];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const madd = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vec3): Vec3 => {
  const n = len(a);
  return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : [1, 0, 0];
};
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const DEG = Math.PI / 180;
/** 2/√3: aVF = (√3/2)·|H_frontal|·sin θ while I = |H_frontal|·cos θ (Einthoven/Goldberger). */
export const HEX_K = 2 / Math.sqrt(3);

/** Frontal angle (degrees, (−180, 180]) from a value of lead I and the same value of aVF (net deflection or area). */
export function hexaxialDeg(leadI: number, aVF: number): number {
  const a = Math.atan2(HEX_K * aVF, leadI) / DEG;
  return a <= -180 ? a + 360 : a;
}

/** Signed difference of two angles in degrees, in (−180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}

/** Rotation matrix applied in the order: about Frank Z (frontal), then Y (transverse), then X (sagittal). */
export function rotationMatrix(frontalDeg = 0, transverseDeg = 0, sagittalDeg = 0): Mat3 {
  const z = frontalDeg * DEG, y = transverseDeg * DEG, x = sagittalDeg * DEG;
  const cz = Math.cos(z), sz = Math.sin(z), cy = Math.cos(y), sy = Math.sin(y), cx = Math.cos(x), sx = Math.sin(x);
  // Rz: positive frontal angle turns +X toward +Y (clockwise on the hexaxial figure = toward inferior = axis grows)
  const Rz: Mat3 = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  // Ry: positive transverse angle turns +Z (posterior) toward +X (left): seen from below (the convention of the
  // horizontal plane) the heart turns counter-clockwise; negative = clockwise rotation (late transition)
  const Ry: Mat3 = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Rx: Mat3 = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  return mul(Rx, mul(Ry, Rz));
}

export function mul(a: Mat3, b: Mat3): Mat3 {
  const o: number[] = new Array<number>(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return o as unknown as Mat3;
}

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Transpose (the inverse of an orthogonal matrix: rotations and reflections). */
export function transpose(a: Mat3): Mat3 {
  return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
}

export function apply(m: Mat3, v: Vec3): Vec3 {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

export function isIdentity(m: Mat3): boolean {
  return m.every((x, i) => Math.abs(x - IDENTITY[i]) < 1e-12);
}

/** Frank → 3D view frame of src/heart3d (+x patient left, +y superior, +z anterior). */
export function frankToView(v: Vec3): Vec3 {
  return [v[0], -v[1], -v[2]];
}

/** Rotate `v` about the unit axis `k` by `deg` degrees (Rodrigues). */
export function rotateAbout(v: Vec3, k: Vec3, deg: number): Vec3 {
  const a = deg * DEG, c = Math.cos(a), s = Math.sin(a);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
}

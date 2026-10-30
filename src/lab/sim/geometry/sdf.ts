/**
 * Signed-distance helpers (negative inside). Formulas after Inigo Quilez (iquilezles.org, MIT-licensed snippets).
 * All functions take scalar coordinates to avoid allocations in the voxel loop.
 */

/** Ellipsoid (lower bound, fine for meshing). Centre (cx,cy,cz), semi-axes (rx,ry,rz), axis-aligned in the given frame. */
export function sdEllipsoid(px: number, py: number, pz: number, rx: number, ry: number, rz: number): number {
  const k0 = Math.sqrt((px / rx) ** 2 + (py / ry) ** 2 + (pz / rz) ** 2);
  const k1 = Math.sqrt((px / (rx * rx)) ** 2 + (py / (ry * ry)) ** 2 + (pz / (rz * rz)) ** 2);
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}

export const sdSphere = (px: number, py: number, pz: number, r: number): number => Math.sqrt(px * px + py * py + pz * pz) - r;

/** Capsule between a and b with radius r. */
export function sdCapsule(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r: number,
): number {
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

/** Quadratic polynomial smooth min; k = maximum thickening (same units as distances). */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const kk = k * 4;
  const h = Math.max(kk - Math.abs(a - b), 0) / kk;
  return Math.min(a, b) - h * h * kk * 0.25;
}
export const smax = (a: number, b: number, k: number): number => -smin(-a, -b, k);

/** Shell of thickness t around the zero set of d (centred on it). */
export const opOnion = (d: number, t: number): number => Math.abs(d) - t * 0.5;

/** Subtract b from a. */
export const opSubtract = (a: number, b: number): number => Math.max(a, -b);

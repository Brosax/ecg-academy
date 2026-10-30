/**
 * Precomputed SDF primitives (negative inside) for the voxel loop: all per-shape constants are computed once, the
 * per-sample methods take scalars and allocate nothing. Formulas after Inigo Quilez (MIT-licensed snippets).
 *
 * Every shape carries an axis-aligned box; `cull(p)` returns the distance to that box. Far from a shape the box
 * distance is a valid lower bound, so callers may use it instead of the exact value (see CULL_MM in grid.ts).
 */
import type { Vec3 } from '../types';

abstract class Boxed {
  lx = 0; ly = 0; lz = 0; hx = 0; hy = 0; hz = 0;
  protected setBox(lo: Vec3, hi: Vec3): void {
    this.lx = lo[0]; this.ly = lo[1]; this.lz = lo[2];
    this.hx = hi[0]; this.hy = hi[1]; this.hz = hi[2];
  }
  /** Distance from p to the bounding box (0 inside). */
  boxDist(px: number, py: number, pz: number): number {
    const dx = Math.max(this.lx - px, 0, px - this.hx);
    const dy = Math.max(this.ly - py, 0, py - this.hy);
    const dz = Math.max(this.lz - pz, 0, pz - this.hz);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  abstract d(px: number, py: number, pz: number): number;
  /** Exact-ish SDF near the shape, box distance (a lower bound) beyond `cull` mm. */
  dc(px: number, py: number, pz: number, cull: number): number {
    const b = this.boxDist(px, py, pz);
    return b > cull ? b : this.d(px, py, pz);
  }
}

/** Ellipsoid with an arbitrary orthonormal frame (axes e0,e1,e2, semi-axes r0,r1,r2). IQ bound (good near the surface). */
export class Ellipsoid extends Boxed {
  readonly cx: number; readonly cy: number; readonly cz: number;
  readonly a00: number; readonly a01: number; readonly a02: number;
  readonly a10: number; readonly a11: number; readonly a12: number;
  readonly a20: number; readonly a21: number; readonly a22: number;
  readonly i0: number; readonly i1: number; readonly i2: number; // 1/r
  readonly j0: number; readonly j1: number; readonly j2: number; // 1/r²
  readonly rMin: number;
  constructor(c: Vec3, semi: Vec3, e0: Vec3 = [1, 0, 0], e1: Vec3 = [0, 1, 0], e2: Vec3 = [0, 0, 1]) {
    super();
    this.cx = c[0]; this.cy = c[1]; this.cz = c[2];
    [this.a00, this.a01, this.a02] = e0;
    [this.a10, this.a11, this.a12] = e1;
    [this.a20, this.a21, this.a22] = e2;
    this.i0 = 1 / semi[0]; this.i1 = 1 / semi[1]; this.i2 = 1 / semi[2];
    this.j0 = this.i0 * this.i0; this.j1 = this.i1 * this.i1; this.j2 = this.i2 * this.i2;
    this.rMin = Math.min(semi[0], semi[1], semi[2]);
    // half-extent along world axis w: sqrt(Σ (r_k e_k[w])²)
    const ext = (w: number) => Math.hypot(semi[0] * e0[w], semi[1] * e1[w], semi[2] * e2[w]);
    const ex = ext(0), ey = ext(1), ez = ext(2);
    this.setBox([c[0] - ex, c[1] - ey, c[2] - ez], [c[0] + ex, c[1] + ey, c[2] + ez]);
  }
  d(px: number, py: number, pz: number): number {
    const qx = px - this.cx, qy = py - this.cy, qz = pz - this.cz;
    const u = qx * this.a00 + qy * this.a01 + qz * this.a02;
    const v = qx * this.a10 + qy * this.a11 + qz * this.a12;
    const w = qx * this.a20 + qy * this.a21 + qz * this.a22;
    const k0 = Math.sqrt(u * u * this.j0 + v * v * this.j1 + w * w * this.j2);
    const k1 = Math.sqrt(u * u * this.j0 * this.j0 + v * v * this.j1 * this.j1 + w * w * this.j2 * this.j2);
    return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -this.rMin;
  }
}

/** Round cone (sphere r1 at a, sphere r2 at b, tangent cone between). Exact. */
export class RoundCone extends Boxed {
  readonly ax: number; readonly ay: number; readonly az: number;
  readonly bx: number; readonly by: number; readonly bz: number;
  readonly l2: number; readonly rr: number; readonly a2: number; readonly il2: number;
  readonly r1: number; readonly r2: number;
  constructor(a: Vec3, b: Vec3, r1: number, r2: number) {
    super();
    this.ax = a[0]; this.ay = a[1]; this.az = a[2];
    this.bx = b[0] - a[0]; this.by = b[1] - a[1]; this.bz = b[2] - a[2];
    this.l2 = this.bx * this.bx + this.by * this.by + this.bz * this.bz;
    this.rr = r1 - r2;
    this.a2 = this.l2 - this.rr * this.rr;
    this.il2 = 1 / this.l2;
    this.r1 = r1; this.r2 = r2;
    const r = Math.max(r1, r2);
    this.setBox(
      [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r],
      [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
    );
  }
  d(px: number, py: number, pz: number): number {
    const pax = px - this.ax, pay = py - this.ay, paz = pz - this.az;
    const y = pax * this.bx + pay * this.by + paz * this.bz;
    const z = y - this.l2;
    const cx = pax * this.l2 - this.bx * y, cy = pay * this.l2 - this.by * y, cz = paz * this.l2 - this.bz * y;
    const x2 = cx * cx + cy * cy + cz * cz;
    const y2 = y * y * this.l2;
    const z2 = z * z * this.l2;
    const k = Math.sign(this.rr) * this.rr * this.rr * x2;
    if (Math.sign(z) * this.a2 * z2 > k) return Math.sqrt(x2 + z2) * this.il2 - this.r2;
    if (Math.sign(y) * this.a2 * y2 < k) return Math.sqrt(x2 + y2) * this.il2 - this.r1;
    return (Math.sqrt(x2 * this.a2 * this.il2) + y * this.rr) * this.il2 - this.r1;
  }
  /** Axial parameter of p along a→b (0 at a, 1 at b), unclamped. */
  axial(px: number, py: number, pz: number): number {
    return ((px - this.ax) * this.bx + (py - this.ay) * this.by + (pz - this.az) * this.bz) * this.il2;
  }
}

/** Flat-capped cylinder between a and b. Exact. */
export class CappedCylinder extends Boxed {
  readonly ax: number; readonly ay: number; readonly az: number;
  readonly bx: number; readonly by: number; readonly bz: number;
  readonly baba: number; readonly r: number;
  constructor(a: Vec3, b: Vec3, r: number) {
    super();
    this.ax = a[0]; this.ay = a[1]; this.az = a[2];
    this.bx = b[0] - a[0]; this.by = b[1] - a[1]; this.bz = b[2] - a[2];
    this.baba = this.bx * this.bx + this.by * this.by + this.bz * this.bz;
    this.r = r;
    this.setBox(
      [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r],
      [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
    );
  }
  d(px: number, py: number, pz: number): number {
    const pax = px - this.ax, pay = py - this.ay, paz = pz - this.az;
    const baba = this.baba;
    const paba = pax * this.bx + pay * this.by + paz * this.bz;
    const qx = pax * baba - this.bx * paba, qy = pay * baba - this.by * paba, qz = paz * baba - this.bz * paba;
    const x = Math.sqrt(qx * qx + qy * qy + qz * qz) - this.r * baba;
    const y = Math.abs(paba - baba * 0.5) - baba * 0.5;
    const x2 = x * x, y2 = y * y * baba;
    const d = Math.max(x, y) < 0 ? -Math.min(x2, y2) : (x > 0 ? x2 : 0) + (y > 0 ? y2 : 0);
    return (Math.sign(d) * Math.sqrt(Math.abs(d))) / baba;
  }
  axial(px: number, py: number, pz: number): number {
    return ((px - this.ax) * this.bx + (py - this.ay) * this.by + (pz - this.az) * this.bz) / this.baba;
  }
}

/** Capsule (segment a–b, radius r). Exact. */
export class Capsule extends Boxed {
  readonly ax: number; readonly ay: number; readonly az: number;
  readonly bx: number; readonly by: number; readonly bz: number;
  readonly ibb: number; readonly r: number;
  constructor(a: Vec3, b: Vec3, r: number) {
    super();
    this.ax = a[0]; this.ay = a[1]; this.az = a[2];
    this.bx = b[0] - a[0]; this.by = b[1] - a[1]; this.bz = b[2] - a[2];
    this.ibb = 1 / (this.bx * this.bx + this.by * this.by + this.bz * this.bz);
    this.r = r;
    this.setBox(
      [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r],
      [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
    );
  }
  d(px: number, py: number, pz: number): number {
    const pax = px - this.ax, pay = py - this.ay, paz = pz - this.az;
    const t = Math.min(1, Math.max(0, (pax * this.bx + pay * this.by + paz * this.bz) * this.ibb));
    const dx = pax - this.bx * t, dy = pay - this.by * t, dz = paz - this.bz * t;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - this.r;
  }
}

/** Half-space { dot(p − c, n) > 0 } as a signed distance (positive on the n side). */
export class Plane {
  readonly nx: number; readonly ny: number; readonly nz: number; readonly off: number;
  constructor(c: Vec3, n: Vec3) {
    const l = Math.hypot(n[0], n[1], n[2]);
    this.nx = n[0] / l; this.ny = n[1] / l; this.nz = n[2] / l;
    this.off = this.nx * c[0] + this.ny * c[1] + this.nz * c[2];
  }
  d(px: number, py: number, pz: number): number {
    return px * this.nx + py * this.ny + pz * this.nz - this.off;
  }
}

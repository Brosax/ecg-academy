/**
 * Cross-section geometry in the heart-LOCAL frame (mm): plane basis, the rectangle that covers the voxel grid on the
 * plane (the slice mesh is a fixed 128² PlaneGeometry placed by uniforms), and propagation arrows (in-plane ∇tAct).
 * Pure helpers — no three import.
 */
import { cross, dot, normalize } from '../../sim/frame';
import type { EngineFields, Vec3, VoxelGrid } from '../../sim/types';
import { compOfTissue, isMyocardium } from '../../sim/types';
import { slotFields } from './attributes';

export interface SliceBasis {
  readonly n: Vec3;
  readonly u: Vec3;
  readonly v: Vec3;
}

/** Orthonormal right-handed basis (u × v = n) for a plane with normal n. u avoids the axis n is closest to. */
export function sliceBasis(normal: Vec3): SliceBasis {
  const n = normalize(normal);
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  // Reference axis least aligned with n; for short-axis planes (n ≈ ±y) this keeps u ≈ x, for 4-chamber (n ≈ z) u ≈ x.
  const ref: Vec3 = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
  const v = normalize(cross(n, ref));
  const u = normalize(cross(v, n));
  return { n, u, v };
}

export interface Box3 {
  readonly min: Vec3;
  readonly max: Vec3;
}

/** Bounding box of the voxel grid (voxel cells, i.e. centres ± h/2), local mm. */
export function gridBox(grid: VoxelGrid): Box3 {
  const h = grid.hMm, o = grid.originMm, d = grid.dims;
  return {
    min: [o[0] - h / 2, o[1] - h / 2, o[2] - h / 2],
    max: [o[0] + (d[0] - 0.5) * h, o[1] + (d[1] - 0.5) * h, o[2] + (d[2] - 0.5) * h],
  };
}

export interface SliceRect extends SliceBasis {
  /** False when the plane misses the grid box. */
  readonly valid: boolean;
  readonly center: Vec3;
  readonly halfU: number;
  readonly halfV: number;
}

/**
 * Rectangle on the plane { p : p·n = d } that covers the plane ∩ box polygon (exact edge intersections), plus a
 * margin. Returns valid = false when the plane does not cut the box.
 */
export function sliceRect(box: Box3, normal: Vec3, offsetMm: number, marginMm = 2): SliceRect {
  const b = sliceBasis(normal);
  const c: Vec3[] = [];
  for (let k = 0; k < 8; k++) c.push([k & 1 ? box.max[0] : box.min[0], k & 2 ? box.max[1] : box.min[1], k & 4 ? box.max[2] : box.min[2]]);
  const p0: Vec3 = [b.n[0] * offsetMm, b.n[1] * offsetMm, b.n[2] * offsetMm];
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  const take = (p: Vec3) => {
    const r: Vec3 = [p[0] - p0[0], p[1] - p0[1], p[2] - p0[2]];
    const pu = dot(r, b.u), pv = dot(r, b.v);
    uMin = Math.min(uMin, pu);
    uMax = Math.max(uMax, pu);
    vMin = Math.min(vMin, pv);
    vMax = Math.max(vMax, pv);
  };
  for (let a = 0; a < 8; a++)
    for (const bit of [1, 2, 4]) {
      if (a & bit) continue;
      const e0 = c[a], e1 = c[a | bit];
      const s0 = dot(e0, b.n) - offsetMm, s1 = dot(e1, b.n) - offsetMm;
      if (s0 === 0) take(e0);
      if (s1 === 0) take(e1);
      if (s0 * s1 < 0) {
        const t = s0 / (s0 - s1);
        take([e0[0] + (e1[0] - e0[0]) * t, e0[1] + (e1[1] - e0[1]) * t, e0[2] + (e1[2] - e0[2]) * t]);
      }
    }
  if (!Number.isFinite(uMin)) return { ...b, valid: false, center: p0, halfU: 0, halfV: 0 };
  const cu = (uMin + uMax) / 2, cv = (vMin + vMax) / 2;
  return {
    ...b,
    valid: true,
    center: [p0[0] + b.u[0] * cu + b.v[0] * cv, p0[1] + b.u[1] * cu + b.v[1] * cv, p0[2] + b.u[2] * cu + b.v[2] * cv],
    halfU: (uMax - uMin) / 2 + marginMm,
    halfV: (vMax - vMin) / 2 + marginMm,
  };
}

// ---------------------------------------------------------------- field sampling on the grid

/** Voxel index containing local point p (nearest centre), or −1 outside the grid. */
export function voxelAt(grid: VoxelGrid, p: Vec3): number {
  const [nx, ny, nz] = grid.dims;
  const i = Math.round((p[0] - grid.originMm[0]) / grid.hMm);
  const j = Math.round((p[1] - grid.originMm[1]) / grid.hMm);
  const k = Math.round((p[2] - grid.originMm[2]) / grid.hMm);
  if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return -1;
  return i + nx * (j + ny * k);
}

/**
 * Trilinear sample of a per-voxel field at p using only voxels of compartment `comp` with finite values (weights
 * renormalised). NaN when less than a quarter of the weight is usable.
 */
export function sampleCompField(grid: VoxelGrid, values: Float32Array, comp: number, p: Vec3): number {
  const [nx, ny, nz] = grid.dims;
  const fx = (p[0] - grid.originMm[0]) / grid.hMm, fy = (p[1] - grid.originMm[1]) / grid.hMm, fz = (p[2] - grid.originMm[2]) / grid.hMm;
  const i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz);
  const tx = fx - i0, ty = fy - j0, tz = fz - k0;
  let sum = 0, wsum = 0;
  for (let c = 0; c < 8; c++) {
    const i = i0 + (c & 1), j = j0 + ((c >> 1) & 1), k = k0 + ((c >> 2) & 1);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
    const v = i + nx * (j + ny * k);
    if (compOfTissue(grid.tissue[v]) !== comp) continue;
    const x = values[v];
    if (!Number.isFinite(x)) continue;
    const w = (c & 1 ? tx : 1 - tx) * ((c >> 1) & 1 ? ty : 1 - ty) * ((c >> 2) & 1 ? tz : 1 - tz);
    sum += w * x;
    wsum += w;
  }
  return wsum >= 0.25 ? sum / wsum : NaN;
}

// ---------------------------------------------------------------- propagation arrows

export interface SliceArrows {
  readonly count: number;
  /** 3 per arrow, local mm, on the plane. */
  readonly pos: Float32Array;
  /** 3 per arrow, unit in-plane propagation direction (∇tAct points from early to late). */
  readonly dir: Float32Array;
  /** 2 per arrow: tAct slot 0 / slot 1 at the arrow (T_NEVER-like 1e9 when missing). */
  readonly tAct: Float32Array;
  /** Compartment (COMP) per arrow. */
  readonly comp: Float32Array;
}

/**
 * Lattice of arrows on the slice (spacing in mm) over myocardium, each pointing along the in-plane gradient of the
 * activation time of its compartment (slot 0 field). Regions activated almost simultaneously (|∇τ| < minGrad, e.g. the
 * Purkinje-fed endocardium) or propagating mostly through the plane get no arrow.
 */
export function computeSliceArrows(
  grid: VoxelGrid,
  fields: EngineFields,
  rect: SliceRect,
  spacingMm = 6,
  maxCount = 900,
  minGradMsPerMm = 0.15,
): SliceArrows {
  const pos: number[] = [], dir: number[] = [], tAct: number[] = [], comp: number[] = [];
  if (!rect.valid) return { count: 0, pos: new Float32Array(0), dir: new Float32Array(0), tAct: new Float32Array(0), comp: new Float32Array(0) };
  const nu = Math.floor((2 * rect.halfU) / spacingMm), nv = Math.floor((2 * rect.halfV) / spacingMm);
  const d = grid.hMm;
  const at = (p: Vec3, a: number, b: number): Vec3 => [
    p[0] + rect.u[0] * a + rect.v[0] * b,
    p[1] + rect.u[1] * a + rect.v[1] * b,
    p[2] + rect.u[2] * a + rect.v[2] * b,
  ];
  for (let a = 0; a <= nu && pos.length / 3 < maxCount; a++)
    for (let b = 0; b <= nv && pos.length / 3 < maxCount; b++) {
      const p = at(rect.center, -rect.halfU + (a + 0.5) * spacingMm, -rect.halfV + (b + 0.5) * spacingMm);
      const vox = voxelAt(grid, p);
      if (vox < 0 || !isMyocardium(grid.tissue[vox])) continue;
      const c = compOfTissue(grid.tissue[vox]);
      const [f0, f1] = slotFields(fields, c);
      if (!f0) continue;
      const t0 = sampleCompField(grid, f0.tAct, c, p);
      if (!Number.isFinite(t0)) continue;
      const s = (da: number, db: number) => sampleCompField(grid, f0.tAct, c, at(p, da, db));
      const pu = s(d, 0), mu = s(-d, 0), pv = s(0, d), mv = s(0, -d);
      const gu = Number.isFinite(pu) && Number.isFinite(mu) ? (pu - mu) / (2 * d) : Number.isFinite(pu) ? (pu - t0) / d : Number.isFinite(mu) ? (t0 - mu) / d : NaN;
      const gv = Number.isFinite(pv) && Number.isFinite(mv) ? (pv - mv) / (2 * d) : Number.isFinite(pv) ? (pv - t0) / d : Number.isFinite(mv) ? (t0 - mv) / d : NaN;
      if (!Number.isFinite(gu) || !Number.isFinite(gv)) continue;
      const g = Math.hypot(gu, gv);
      if (g < minGradMsPerMm) continue;
      pos.push(p[0], p[1], p[2]);
      dir.push((rect.u[0] * gu + rect.v[0] * gv) / g, (rect.u[1] * gu + rect.v[1] * gv) / g, (rect.u[2] * gu + rect.v[2] * gv) / g);
      const t1 = f1 ? sampleCompField(grid, f1.tAct, c, p) : NaN;
      tAct.push(t0, Number.isFinite(t1) ? t1 : 1e9);
      comp.push(c);
    }
  return { count: pos.length / 3, pos: Float32Array.from(pos), dir: Float32Array.from(dir), tAct: Float32Array.from(tAct), comp: Float32Array.from(comp) };
}

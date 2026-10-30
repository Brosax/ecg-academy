/** Small voxel-grid helpers used by the conduction and source code (geometry-agnostic: only VoxelGrid fields). */
import type { Vec3, VoxelGrid } from '../types';
import { CHAMBER, TISSUE, compOfTissue } from '../types';

/** Compartment of every tissue code (lookup table; hot loops index it instead of calling compOfTissue). */
export const COMP_LUT: Uint8Array = Uint8Array.from({ length: 256 }, (_, t) => compOfTissue(t));

/** Per-voxel compartment mask: 1 where the voxel belongs to `comp`. */
export function compMask(g: VoxelGrid, comp: number): Uint8Array {
  const lut = COMP_LUT, tissue = g.tissue, n = tissue.length;
  const m = new Uint8Array(n);
  for (let v = 0; v < n; v++) m[v] = lut[tissue[v]] === comp ? 1 : 0;
  return m;
}

export function voxelCenter(g: VoxelGrid, v: number): Vec3 {
  const [nx, ny] = g.dims;
  const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
  return [g.originMm[0] + i * g.hMm, g.originMm[1] + j * g.hMm, g.originMm[2] + k * g.hMm];
}

/**
 * Nearest voxel to p (Euclidean, voxel centres) satisfying pred, searching a cube of half-width maxRadiusMm.
 * Returns −1 if none. Deterministic tie-break: lowest index.
 */
export function nearestVoxel(g: VoxelGrid, p: Vec3, pred: (v: number) => boolean, maxRadiusMm = 30): { voxel: number; distMm: number } {
  const [nx, ny, nz] = g.dims;
  const fi = (p[0] - g.originMm[0]) / g.hMm, fj = (p[1] - g.originMm[1]) / g.hMm, fk = (p[2] - g.originMm[2]) / g.hMm;
  const r = Math.ceil(maxRadiusMm / g.hMm);
  const i0 = Math.max(0, Math.floor(fi - r)), i1 = Math.min(nx - 1, Math.ceil(fi + r));
  const j0 = Math.max(0, Math.floor(fj - r)), j1 = Math.min(ny - 1, Math.ceil(fj + r));
  const k0 = Math.max(0, Math.floor(fk - r)), k1 = Math.min(nz - 1, Math.ceil(fk + r));
  let best = -1, bestD2 = Infinity;
  for (let k = k0; k <= k1; k++)
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const d2 = (i - fi) ** 2 + (j - fj) ** 2 + (k - fk) ** 2;
        if (d2 >= bestD2) continue;
        const v = i + nx * (j + ny * k);
        if (!pred(v)) continue;
        best = v;
        bestD2 = d2;
      }
  return { voxel: best, distMm: best < 0 ? Infinity : Math.sqrt(bestD2) * g.hMm };
}

/** All voxels within radiusMm of p satisfying pred. */
export function voxelsWithin(g: VoxelGrid, p: Vec3, radiusMm: number, pred: (v: number) => boolean): number[] {
  const [nx, ny, nz] = g.dims;
  const fi = (p[0] - g.originMm[0]) / g.hMm, fj = (p[1] - g.originMm[1]) / g.hMm, fk = (p[2] - g.originMm[2]) / g.hMm;
  const r = radiusMm / g.hMm;
  const out: number[] = [];
  for (let k = Math.max(0, Math.floor(fk - r)); k <= Math.min(nz - 1, Math.ceil(fk + r)); k++)
    for (let j = Math.max(0, Math.floor(fj - r)); j <= Math.min(ny - 1, Math.ceil(fj + r)); j++)
      for (let i = Math.max(0, Math.floor(fi - r)); i <= Math.min(nx - 1, Math.ceil(fi + r)); i++) {
        if ((i - fi) ** 2 + (j - fj) ** 2 + (k - fk) ** 2 > r * r) continue;
        const v = i + nx * (j + ny * k);
        if (pred(v)) out.push(v);
      }
  return out;
}

/** Face-neighbour offsets (6). */
export function faceNeighbours(g: VoxelGrid): { di: number[]; dj: number[]; dk: number[]; dv: number[] } {
  const [nx, ny] = g.dims;
  const di = [1, -1, 0, 0, 0, 0], dj = [0, 0, 1, -1, 0, 0], dk = [0, 0, 0, 0, 1, -1];
  return { di, dj, dk, dv: di.map((_, o) => di[o] + nx * (dj[o] + ny * dk[o])) };
}

/**
 * Subendocardial ventricular voxels: ventricular myocardium with a face neighbour that is LV or RV cavity blood.
 * `chamber` = the cavity it faces (LV chamber wins if both).
 */
export function subendocardium(g: VoxelGrid): { voxel: Uint32Array; chamber: Uint8Array } {
  const [nx, ny, nz] = g.dims;
  const { di, dj, dk, dv } = faceNeighbours(g);
  const LV = TISSUE.LV, RV = TISSUE.RV, SEPT = TISSUE.Septum, BLOOD = TISSUE.Blood, CH_LV = CHAMBER.LV, CH_RV = CHAMBER.RV;
  const tissue = g.tissue, chamber = g.chamber;
  const vox: number[] = [], ch: number[] = [];
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        const t = tissue[v];
        if (t !== LV && t !== RV && t !== SEPT) continue;
        let c = 0;
        for (let o = 0; o < 6; o++) {
          const ii = i + di[o], jj = j + dj[o], kk = k + dk[o];
          if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
          const w = v + dv[o];
          if (tissue[w] !== BLOOD) continue;
          const bc = chamber[w];
          if (bc === CH_LV) c = CH_LV;
          else if (bc === CH_RV && c === 0) c = CH_RV;
        }
        if (c) {
          vox.push(v);
          ch.push(c);
        }
      }
  return { voxel: Uint32Array.from(vox), chamber: Uint8Array.from(ch) };
}

/** Polyline length (mm) and cumulative arc length per vertex. */
export function polylineArc(points: readonly Vec3[]): { cum: number[]; length: number } {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  return { cum, length: cum[cum.length - 1] ?? 0 };
}

/** Closest point on a polyline to p: arc length and distance. */
export function closestOnPolyline(points: readonly Vec3[], p: Vec3): { arcMm: number; distMm: number } {
  if (points.length === 1) return { arcMm: 0, distMm: Math.hypot(p[0] - points[0][0], p[1] - points[0][1], p[2] - points[0][2]) };
  const { cum } = polylineArc(points);
  let best = { arcMm: 0, distMm: Infinity };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
    const u = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2)) : 0;
    const q: Vec3 = [a[0] + u * ab[0], a[1] + u * ab[1], a[2] + u * ab[2]];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (d < best.distMm) best = { arcMm: cum[i - 1] + u * Math.sqrt(l2), distMm: d };
  }
  return best;
}

/** Resamples a polyline at roughly `stepMm` spacing (always keeps both ends). */
export function resamplePolyline(points: readonly Vec3[], stepMm: number): { pts: Vec3[]; arc: number[] } {
  const { cum, length } = polylineArc(points);
  if (points.length < 2 || length === 0) return { pts: points.slice(0, 1) as Vec3[], arc: [0] };
  const n = Math.max(1, Math.ceil(length / stepMm));
  const pts: Vec3[] = [], arc: number[] = [];
  let seg = 1;
  for (let s = 0; s <= n; s++) {
    const a = (length * s) / n;
    while (seg < points.length - 1 && cum[seg] < a) seg++;
    const a0 = cum[seg - 1], a1 = cum[seg];
    const u = a1 > a0 ? (a - a0) / (a1 - a0) : 0;
    const p0 = points[seg - 1], p1 = points[seg];
    pts.push([p0[0] + u * (p1[0] - p0[0]), p0[1] + u * (p1[1] - p0[1]), p0[2] + u * (p1[2] - p0[2])]);
    arc.push(a);
  }
  return { pts, arc };
}

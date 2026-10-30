/**
 * Indexed naive surface nets on a voxel-centred scalar field (negative inside).
 * One vertex per sign-changing cell (average of edge crossings), one quad per sign-changing grid edge.
 * Faces are oriented with outward normals (from negative to positive values).
 * The caller must leave at least one voxel of positive margin on every side so the surface is closed.
 * Hot loops read a precomputed inside-flag array and flat edge tables (no per-cell allocation).
 */
import type { Vec3 } from '../types';

export interface SurfaceNetsResult {
  /** Local-frame mm, 3 per vertex. */
  position: Float32Array;
  index: Uint32Array;
  /** Grid cell (i,j,k of its lowest corner) per vertex, packed as i + nx*(j + ny*k). */
  cell: Uint32Array;
}

// 12 cell edges as corner pairs; corner c = (c&1, (c>>1)&1, (c>>2)&1).
const EA = new Uint8Array([0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3]);
const EB = new Uint8Array([1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7]);

export function surfaceNets(
  field: ArrayLike<number>,
  dims: readonly [number, number, number],
  originMm: Vec3,
  hMm: number,
  iso = 0,
): SurfaceNetsResult {
  const [nx, ny, nz] = dims;
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const N = nx * ny * nz;
  const inside = new Uint8Array(N);
  for (let v = 0; v < N; v++) inside[v] = field[v] - iso < 0 ? 1 : 0;
  const cellVert = new Int32Array(cx * cy * cz).fill(-1);
  const pos: number[] = [];
  const cellOf: number[] = [];
  const corner = new Float64Array(8);
  const sy = nx, sz = nx * ny;
  // corner offsets in the voxel array
  const off = [0, 1, sy, sy + 1, sz, sz + 1, sz + sy, sz + sy + 1];

  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++) {
      const row = nx * (j + ny * k);
      for (let i = 0; i < cx; i++) {
        const v0 = row + i;
        const mask =
          inside[v0] | (inside[v0 + 1] << 1) | (inside[v0 + sy] << 2) | (inside[v0 + sy + 1] << 3) |
          (inside[v0 + sz] << 4) | (inside[v0 + sz + 1] << 5) | (inside[v0 + sz + sy] << 6) | (inside[v0 + sz + sy + 1] << 7);
        if (mask === 0 || mask === 255) continue;
        for (let c = 0; c < 8; c++) corner[c] = field[v0 + off[c]] - iso;
        let sx = 0, syy = 0, szz = 0, cnt = 0;
        for (let e = 0; e < 12; e++) {
          const a = EA[e], b = EB[e];
          if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
          const va = corner[a], vb = corner[b];
          const t = va / (va - vb);
          const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1;
          const bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
          sx += ax + t * (bx - ax);
          syy += ay + t * (by - ay);
          szz += az + t * (bz - az);
          cnt++;
        }
        const ci = i + cx * (j + cy * k);
        cellVert[ci] = pos.length / 3;
        pos.push(
          originMm[0] + hMm * (i + sx / cnt),
          originMm[1] + hMm * (j + syy / cnt),
          originMm[2] + hMm * (k + szz / cnt),
        );
        cellOf.push(v0);
      }
    }

  const tri: number[] = [];
  const cxy = cx * cy;
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tri.push(a, d, c, a, c, b);
    else tri.push(a, b, c, a, c, d);
  };

  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++) {
      const row = nx * (j + ny * k);
      for (let i = 1; i < nx - 1; i++) {
        const v = row + i;
        const in0 = inside[v];
        // cells sharing the edge, as indices into cellVert: c(i', j', k') = i' + cx*(j' + cy*k')
        // +x edge: cells (i, j-1..j, k-1..k); right-hand order in (y,z) gives +x normal.
        if (in0 !== inside[v + 1]) {
          const b = i + cx * (j - 1 + cy * (k - 1));
          quad(cellVert[b], cellVert[b + cx], cellVert[b + cx + cxy], cellVert[b + cxy], in0 === 0);
        }
        // +y edge: cells (i-1..i, j, k-1..k).
        if (in0 !== inside[v + sy]) {
          const b = i - 1 + cx * (j + cy * (k - 1));
          quad(cellVert[b], cellVert[b + cxy], cellVert[b + 1 + cxy], cellVert[b + 1], in0 === 0);
        }
        // +z edge: cells (i-1..i, j-1..j, k).
        if (in0 !== inside[v + sz]) {
          const b = i - 1 + cx * (j - 1 + cy * k);
          quad(cellVert[b], cellVert[b + 1], cellVert[b + 1 + cx], cellVert[b + cx], in0 === 0);
        }
      }
    }

  return { position: new Float32Array(pos), index: new Uint32Array(tri), cell: new Uint32Array(cellOf) };
}

/** Area-weighted vertex normals from the triangle list. */
export function computeNormals(position: Float32Array, index: Uint32Array): Float32Array {
  const n = new Float32Array(position.length);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const e1x = position[b] - position[a], e1y = position[b + 1] - position[a + 1], e1z = position[b + 2] - position[a + 2];
    const e2x = position[c] - position[a], e2y = position[c + 1] - position[a + 1], e2z = position[c + 2] - position[a + 2];
    const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
    n[a] += fx; n[a + 1] += fy; n[a + 2] += fz;
    n[b] += fx; n[b + 1] += fy; n[b + 2] += fz;
    n[c] += fx; n[c + 1] += fy; n[c + 2] += fz;
  }
  for (let v = 0; v < n.length; v += 3) {
    const l = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
    n[v] /= l;
    n[v + 1] /= l;
    n[v + 2] /= l;
  }
  return n;
}

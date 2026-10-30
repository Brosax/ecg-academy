/** Bake-time triangle-mesh utilities for the HRA import (plain arrays, mm). */
import type { Mat3, Vec3 } from '../../types';

export interface Mesh {
  readonly position: Float64Array;
  readonly index: Uint32Array;
}

/** p' = Rᵀ · (s·p − o): body (scaled to mm) → frame whose axes are the columns of R, origin o (mm). */
export function transformMesh(m: Mesh, R: Mat3, o: Vec3, scaleToMm = 1): Mesh {
  const P = m.position, out = new Float64Array(P.length);
  for (let i = 0; i < P.length; i += 3) {
    const x = P[i] * scaleToMm - o[0], y = P[i + 1] * scaleToMm - o[1], z = P[i + 2] * scaleToMm - o[2];
    out[i] = R[0] * x + R[3] * y + R[6] * z;
    out[i + 1] = R[1] * x + R[4] * y + R[7] * z;
    out[i + 2] = R[2] * x + R[5] * y + R[8] * z;
  }
  return { position: out, index: m.index };
}

export function mergeMeshes(ms: readonly Mesh[]): Mesh {
  let nv = 0, ni = 0;
  for (const m of ms) {
    nv += m.position.length;
    ni += m.index.length;
  }
  const position = new Float64Array(nv), index = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const m of ms) {
    position.set(m.position, ov);
    for (let i = 0; i < m.index.length; i++) index[oi + i] = m.index[i] + ov / 3;
    ov += m.position.length;
    oi += m.index.length;
  }
  return { position, index };
}

/** Keeps the triangles for which keep(t) is true and compacts the vertices. */
export function filterTriangles(m: Mesh, keep: (a: number, b: number, c: number) => boolean): Mesh {
  const nv = m.position.length / 3;
  const remap = new Int32Array(nv).fill(-1);
  const pos: number[] = [], idx: number[] = [];
  const I = m.index;
  for (let t = 0; t < I.length; t += 3) {
    if (!keep(I[t], I[t + 1], I[t + 2])) continue;
    for (let e = 0; e < 3; e++) {
      const v = I[t + e];
      if (remap[v] < 0) {
        remap[v] = pos.length / 3;
        pos.push(m.position[3 * v], m.position[3 * v + 1], m.position[3 * v + 2]);
      }
      idx.push(remap[v]);
    }
  }
  return { position: Float64Array.from(pos), index: Uint32Array.from(idx) };
}

/** Boundary loops (edges used by exactly one face), as vertex index cycles. Non-manifold boundaries are split greedily. */
export function boundaryLoops(m: Mesh): number[][] {
  const I = m.index;
  const count = new Map<string, number>();
  const directed: [number, number][] = [];
  for (let t = 0; t < I.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = I[t + e], b = I[t + ((e + 1) % 3)];
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      count.set(k, (count.get(k) ?? 0) + 1);
      directed.push([a, b]);
    }
  // boundary half-edges keep the face orientation; the hole is walked in reverse (b → a) so caps match the winding
  const next = new Map<number, number[]>();
  for (const [a, b] of directed) {
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    if (count.get(k) !== 1) continue;
    const l = next.get(b);
    if (l) l.push(a);
    else next.set(b, [a]);
  }
  const loops: number[][] = [];
  for (const start of [...next.keys()]) {
    let l = next.get(start);
    while (l && l.length) {
      const loop = [start];
      let cur = l.pop()!;
      let guard = 0;
      while (cur !== start && guard++ < 1e6) {
        loop.push(cur);
        const nl = next.get(cur);
        if (!nl || !nl.length) break;
        cur = nl.pop()!;
      }
      if (cur === start && loop.length >= 3) loops.push(loop);
      l = next.get(start);
    }
  }
  return loops;
}

/** Closes every boundary loop with a centroid fan (makes open tubes / holed meshes parity-safe). */
export function capHoles(m: Mesh): Mesh & { readonly caps: number } {
  const loops = boundaryLoops(m);
  if (!loops.length) return { ...m, caps: 0 };
  const pos = Array.from(m.position), idx = Array.from(m.index);
  for (const loop of loops) {
    let cx = 0, cy = 0, cz = 0;
    for (const v of loop) {
      cx += pos[3 * v];
      cy += pos[3 * v + 1];
      cz += pos[3 * v + 2];
    }
    const c = pos.length / 3;
    pos.push(cx / loop.length, cy / loop.length, cz / loop.length);
    for (let i = 0; i < loop.length; i++) idx.push(loop[i], loop[(i + 1) % loop.length], c);
  }
  return { position: Float64Array.from(pos), index: Uint32Array.from(idx), caps: loops.length };
}

/** Area-weighted smooth vertex normals. */
export function vertexNormals(position: ArrayLike<number>, index: ArrayLike<number>): Float32Array {
  const n = new Float64Array(position.length);
  for (let t = 0; t < index.length; t += 3) {
    const a = 3 * index[t], b = 3 * index[t + 1], c = 3 * index[t + 2];
    const ux = position[b] - position[a], uy = position[b + 1] - position[a + 1], uz = position[b + 2] - position[a + 2];
    const vx = position[c] - position[a], vy = position[c + 1] - position[a + 1], vz = position[c + 2] - position[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) {
      n[p] += nx;
      n[p + 1] += ny;
      n[p + 2] += nz;
    }
  }
  const out = new Float32Array(position.length);
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    out[i] = n[i] / l;
    out[i + 1] = n[i + 1] / l;
    out[i + 2] = n[i + 2] / l;
  }
  return out;
}

/** Symmetric 3×3 eigen-decomposition (Jacobi). Eigenvalues ascending, eigenvectors as unit Vec3. */
export function eigSym3(c: readonly [number, number, number, number, number, number]): { values: number[]; vectors: Vec3[] } {
  const a = [[c[0], c[1], c[2]], [c[1], c[3], c[4]], [c[2], c[4], c[5]]];
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < 2; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] * a[p][q];
    if (off < 1e-24) break;
    for (let p = 0; p < 2; p++)
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
        for (let k = 0; k < 3; k++) {
          const x = a[k][p], y = a[k][q];
          a[k][p] = cs * x - sn * y;
          a[k][q] = sn * x + cs * y;
        }
        for (let k = 0; k < 3; k++) {
          const x = a[p][k], y = a[q][k];
          a[p][k] = cs * x - sn * y;
          a[q][k] = sn * x + cs * y;
        }
        for (let k = 0; k < 3; k++) {
          const x = v[k][p], y = v[k][q];
          v[k][p] = cs * x - sn * y;
          v[k][q] = sn * x + cs * y;
        }
      }
  }
  const order = [0, 1, 2].sort((i, j) => a[i][i] - a[j][j]);
  return { values: order.map((i) => a[i][i]), vectors: order.map((i) => [v[0][i], v[1][i], v[2][i]] as Vec3) };
}

/** Centroid and PCA of a point set (3 per point). */
export function pca(points: ArrayLike<number>): { centroid: Vec3; values: number[]; vectors: Vec3[] } {
  const n = points.length / 3;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < points.length; i += 3) {
    cx += points[i];
    cy += points[i + 1];
    cz += points[i + 2];
  }
  cx /= n;
  cy /= n;
  cz /= n;
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i] - cx, y = points[i + 1] - cy, z = points[i + 2] - cz;
    xx += x * x;
    xy += x * y;
    xz += x * z;
    yy += y * y;
    yz += y * z;
    zz += z * z;
  }
  const e = eigSym3([xx / n, xy / n, xz / n, yy / n, yz / n, zz / n]);
  return { centroid: [cx, cy, cz], values: e.values, vectors: e.vectors };
}

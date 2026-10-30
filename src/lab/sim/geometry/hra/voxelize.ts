/**
 * Bake-time voxelization of (imperfect) triangle meshes and small morphology helpers on a regular grid.
 *
 * Inside test: ray parity along each of the three grid axes (one ray per voxel column through the voxel centres,
 * jittered by an irrational sub-voxel offset so rays never hit edges or vertices exactly), majority vote ≥ 2 of 3.
 * A ray that slips through a hole in an open mesh flips a whole column segment on one axis only, so the vote removes
 * most hole artefacts; the caller cleans up the rest morphologically.
 */

export interface GridSpec {
  readonly dims: readonly [number, number, number];
  readonly hMm: number;
  /** Centre of voxel (0,0,0), mm. */
  readonly originMm: readonly [number, number, number];
}

export interface TriMesh {
  /** mm, 3 per vertex, in the grid frame. */
  readonly position: ArrayLike<number>;
  readonly index: ArrayLike<number>;
}

const JITTER = [0.0137, 0.0291, 0.0073];

/** Parity count per voxel along one axis: 1 where the number of crossings below the voxel centre is odd. */
export function parityAlongAxis(mesh: TriMesh, g: GridSpec, axis: 0 | 1 | 2): Uint8Array {
  const [nx, ny, nz] = g.dims;
  const n = [nx, ny, nz];
  const b = (axis + 1) % 3, c = (axis + 2) % 3;
  const nb = n[b], nc = n[c], na = n[axis];
  const h = g.hMm, o = g.originMm;
  const jb = JITTER[b] * h, jc = JITTER[c] * h;
  const cols: number[][] = new Array(nb * nc);
  const P = mesh.position, I = mesh.index;
  for (let t = 0; t < I.length; t += 3) {
    const p0 = 3 * I[t], p1 = 3 * I[t + 1], p2 = 3 * I[t + 2];
    const b0 = P[p0 + b], b1 = P[p1 + b], b2 = P[p2 + b];
    const c0 = P[p0 + c], c1 = P[p1 + c], c2 = P[p2 + c];
    const a0 = P[p0 + axis], a1 = P[p1 + axis], a2 = P[p2 + axis];
    // column index range covered by the triangle's (b, c) bbox; column centre = o + j*h + jitter
    const jb0 = Math.max(0, Math.ceil((Math.min(b0, b1, b2) - o[b] - jb) / h));
    const jb1 = Math.min(nb - 1, Math.floor((Math.max(b0, b1, b2) - o[b] - jb) / h));
    const jc0 = Math.max(0, Math.ceil((Math.min(c0, c1, c2) - o[c] - jc) / h));
    const jc1 = Math.min(nc - 1, Math.floor((Math.max(c0, c1, c2) - o[c] - jc) / h));
    if (jb0 > jb1 || jc0 > jc1) continue;
    const det = (b1 - b0) * (c2 - c0) - (b2 - b0) * (c1 - c0);
    if (det === 0) continue;
    for (let kc = jc0; kc <= jc1; kc++) {
      const pc = o[c] + kc * h + jc;
      for (let kb = jb0; kb <= jb1; kb++) {
        const pb = o[b] + kb * h + jb;
        const u = ((pb - b0) * (c2 - c0) - (b2 - b0) * (pc - c0)) / det;
        const v = ((b1 - b0) * (pc - c0) - (pb - b0) * (c1 - c0)) / det;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const a = a0 + u * (a1 - a0) + v * (a2 - a0);
        const ci = kb + nb * kc;
        (cols[ci] ??= []).push(a);
      }
    }
  }
  const out = new Uint8Array(nx * ny * nz);
  const stride = [1, nx, nx * ny];
  for (let kc = 0; kc < nc; kc++)
    for (let kb = 0; kb < nb; kb++) {
      const list = cols[kb + nb * kc];
      if (!list || list.length < 2) continue;
      list.sort((p, q) => p - q);
      let q = 0, inside = 0;
      const base = kb * stride[b] + kc * stride[c];
      for (let ka = 0; ka < na; ka++) {
        const pa = o[axis] + ka * h;
        while (q < list.length && list[q] < pa) {
          inside ^= 1;
          q++;
        }
        if (inside) out[base + ka * stride[axis]] = 1;
      }
    }
  return out;
}

/** Majority-vote (≥ 2 of 3 axes) parity inside test. */
export function insideMask(mesh: TriMesh, g: GridSpec): Uint8Array {
  const x = parityAlongAxis(mesh, g, 0), y = parityAlongAxis(mesh, g, 1), z = parityAlongAxis(mesh, g, 2);
  const out = new Uint8Array(x.length);
  for (let v = 0; v < out.length; v++) out[v] = x[v] + y[v] + z[v] >= 2 ? 1 : 0;
  return out;
}

/** Marks every voxel whose centre lies within `radiusMm` of any triangle (surface shell; used for thin parts). */
export function shellMask(mesh: TriMesh, g: GridSpec, radiusMm: number): Uint8Array {
  const [nx, ny, nz] = g.dims;
  const out = new Uint8Array(nx * ny * nz);
  const P = mesh.position, I = mesh.index, h = g.hMm, o = g.originMm;
  const r2 = radiusMm * radiusMm;
  const q = [0, 0, 0];
  for (let t = 0; t < I.length; t += 3) {
    const A = [P[3 * I[t]], P[3 * I[t] + 1], P[3 * I[t] + 2]];
    const B = [P[3 * I[t + 1]], P[3 * I[t + 1] + 1], P[3 * I[t + 1] + 2]];
    const C = [P[3 * I[t + 2]], P[3 * I[t + 2] + 1], P[3 * I[t + 2] + 2]];
    const lo = [0, 1, 2].map((d) => Math.max(0, Math.ceil((Math.min(A[d], B[d], C[d]) - radiusMm - o[d]) / h)));
    const hi = [0, 1, 2].map((d) => Math.min(g.dims[d] - 1, Math.floor((Math.max(A[d], B[d], C[d]) + radiusMm - o[d]) / h)));
    for (let k = lo[2]; k <= hi[2]; k++)
      for (let j = lo[1]; j <= hi[1]; j++)
        for (let i = lo[0]; i <= hi[0]; i++) {
          const v = i + nx * (j + ny * k);
          if (out[v]) continue;
          q[0] = o[0] + i * h;
          q[1] = o[1] + j * h;
          q[2] = o[2] + k * h;
          if (pointTriDist2(q, A, B, C) <= r2) out[v] = 1;
        }
  }
  return out;
}

/** Squared distance from point p to triangle ABC (Ericson, Real-Time Collision Detection §5.1.5). */
export function pointTriDist2(p: ArrayLike<number>, a: ArrayLike<number>, b: ArrayLike<number>, c: ArrayLike<number>): number {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2];
  const apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2];
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;
  const bpx = p[0] - b[0], bpy = p[1] - b[1], bpz = p[2] - b[2];
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    const x = apx - v * abx, y = apy - v * aby, z = apz - v * abz;
    return x * x + y * y + z * z;
  }
  const cpx = p[0] - c[0], cpy = p[1] - c[1], cpz = p[2] - c[2];
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    const x = apx - w * acx, y = apy - w * acy, z = apz - w * acz;
    return x * x + y * y + z * z;
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    const x = bpx - w * (c[0] - b[0]), y = bpy - w * (c[1] - b[1]), z = bpz - w * (c[2] - b[2]);
    return x * x + y * y + z * z;
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  const x = apx - abx * v - acx * w, y = apy - aby * v - acy * w, z = apz - abz * v - acz * w;
  return x * x + y * y + z * z;
}

// ---------------------------------------------------------------- morphology (6-connected structuring element)

const OFFS6 = (dims: readonly number[]) => {
  const [nx, ny] = dims;
  return [1, -1, nx, -nx, nx * ny, -nx * ny];
};

/** In-bounds 6-neighbour iteration helper: calls f(w) for each face neighbour of v. */
export function forNeighbours6(dims: readonly number[], v: number, f: (w: number) => void): void {
  const [nx, ny, nz] = dims;
  const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
  if (i > 0) f(v - 1);
  if (i < nx - 1) f(v + 1);
  if (j > 0) f(v - nx);
  if (j < ny - 1) f(v + nx);
  if (k > 0) f(v - nx * ny);
  if (k < nz - 1) f(v + nx * ny);
}

/** Dilation by a ball of radius r voxels (Euclidean, via repeated 6/18/26 passes approximated with an exact EDT). */
export function dilate(mask: Uint8Array, dims: readonly number[], rVox: number): Uint8Array {
  const d2 = edt2(mask, dims, true);
  const out = new Uint8Array(mask.length);
  const r2 = rVox * rVox + 1e-9;
  for (let v = 0; v < out.length; v++) out[v] = d2[v] <= r2 ? 1 : 0;
  return out;
}

export function erode(mask: Uint8Array, dims: readonly number[], rVox: number): Uint8Array {
  const inv = new Uint8Array(mask.length);
  for (let v = 0; v < inv.length; v++) inv[v] = mask[v] ? 0 : 1;
  const d = dilate(inv, dims, rVox);
  for (let v = 0; v < d.length; v++) d[v] = d[v] ? 0 : 1;
  return d;
}

export const closeMask = (m: Uint8Array, dims: readonly number[], r: number) => erode(dilate(m, dims, r), dims, r);
export const openMask = (m: Uint8Array, dims: readonly number[], r: number) => dilate(erode(m, dims, r), dims, r);

/**
 * Exact squared Euclidean distance transform (Felzenszwalb–Huttenlocher), in voxel units², to the nearest voxel with
 * mask = 1 (if `toSet`) or mask = 0 (otherwise). Voxels of the target set get 0. The grid edge is not a boundary.
 */
export function edt2(mask: Uint8Array, dims: readonly number[], toSet: boolean): Float64Array {
  const [nx, ny, nz] = dims;
  const INF = 1e20;
  const d = new Float64Array(nx * ny * nz);
  for (let v = 0; v < d.length; v++) d[v] = (mask[v] !== 0) === toSet ? 0 : INF;
  const maxN = Math.max(nx, ny, nz);
  const f = new Float64Array(maxN), out = new Float64Array(maxN), z = new Float64Array(maxN + 1);
  const vv = new Int32Array(maxN);
  const pass = (n: number, get: (q: number) => number, set: (q: number, x: number) => void) => {
    for (let q = 0; q < n; q++) f[q] = get(q);
    let k = 0;
    vv[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]);
      }
      k++;
      vv[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      out[q] = (q - vv[k]) * (q - vv[k]) + f[vv[k]];
    }
    for (let q = 0; q < n; q++) set(q, out[q]);
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++) {
      const base = nx * (j + ny * k);
      pass(nx, (q) => d[base + q], (q, x) => (d[base + q] = x));
    }
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++) {
      const base = i + nx * ny * k;
      pass(ny, (q) => d[base + nx * q], (q, x) => (d[base + nx * q] = x));
    }
  const sz = nx * ny;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const base = i + nx * j;
      pass(nz, (q) => d[base + sz * q], (q, x) => (d[base + sz * q] = x));
    }
  return d;
}

/** Connected components (6-connectivity) of mask; returns labels (0 = background) and component sizes (index = label). */
export function components6(mask: Uint8Array, dims: readonly number[]): { label: Int32Array; sizes: number[] } {
  const label = new Int32Array(mask.length);
  const sizes = [0];
  const offs = OFFS6(dims);
  const [nx, ny, nz] = dims;
  const stack: number[] = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || label[s]) continue;
    const id = sizes.length;
    let size = 0;
    label[s] = id;
    stack.push(s);
    while (stack.length) {
      const v = stack.pop()!;
      size++;
      const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
      for (let o = 0; o < 6; o++) {
        if ((o === 0 && i === nx - 1) || (o === 1 && i === 0) || (o === 2 && j === ny - 1) || (o === 3 && j === 0) || (o === 4 && k === nz - 1) || (o === 5 && k === 0)) continue;
        const w = v + offs[o];
        if (mask[w] && !label[w]) {
          label[w] = id;
          stack.push(w);
        }
      }
    }
    sizes.push(size);
  }
  return { label, sizes };
}

/** Keeps only components with at least `minSize` voxels (or only the largest if minSize is 'largest'). */
export function removeIslands(mask: Uint8Array, dims: readonly number[], minSize: number | 'largest'): Uint8Array {
  const { label, sizes } = components6(mask, dims);
  let keep: (l: number) => boolean;
  if (minSize === 'largest') {
    let best = 0;
    for (let l = 1; l < sizes.length; l++) if (sizes[l] > sizes[best]) best = l;
    keep = (l) => l === best;
  } else keep = (l) => sizes[l] >= minSize;
  const out = new Uint8Array(mask.length);
  for (let v = 0; v < out.length; v++) out[v] = label[v] && keep(label[v]) ? 1 : 0;
  return out;
}

/** Flood fill (6-connected) over voxels where `passable` = 1, from every passable voxel on the grid boundary. */
export function floodFromBoundary(passable: Uint8Array, dims: readonly number[]): Uint8Array {
  const [nx, ny, nz] = dims;
  const seen = new Uint8Array(passable.length);
  const stack: number[] = [];
  const push = (v: number) => {
    if (passable[v] && !seen[v]) {
      seen[v] = 1;
      stack.push(v);
    }
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) push(i + nx * (j + ny * k));
  while (stack.length) forNeighbours6(dims, stack.pop()!, push);
  return seen;
}

/**
 * Exact 3D Euclidean distance transform (Felzenszwalb & Huttenlocher 2012): a linear two-sweep pass along x, then the
 * lower envelope of parabolas along y and z. Distances in voxel units. Optional crop box: voxels outside it get
 * Infinity (callers crop to where the distance matters). Scratch buffers are reused across calls.
 */
/** "No feature" sentinel: exact in float32 (g is Float32Array) and ≫ any squared voxel distance. */
const INF = 2 ** 30;

/** Inclusive voxel box [i0, j0, k0, i1, j1, k1]. */
export type Box = readonly [number, number, number, number, number, number];

export class Edt {
  private readonly dims: readonly [number, number, number];
  private readonly g: Float32Array;
  private readonly f: Float64Array;
  private readonly d: Float64Array;
  private readonly v: Int32Array;
  private readonly z: Float64Array;

  constructor(dims: readonly [number, number, number]) {
    this.dims = dims;
    const n = Math.max(dims[0], dims[1], dims[2]);
    this.g = new Float32Array(dims[0] * dims[1] * dims[2]);
    this.f = new Float64Array(n);
    this.d = new Float64Array(n);
    this.v = new Int32Array(n);
    this.z = new Float64Array(n + 1);
  }

  /** out[v] = distance (voxels) to the nearest voxel with mask[v] ≠ 0 (0 on features; Infinity if none / outside box). */
  run(mask: Uint8Array, out: Float32Array, box?: Box): void {
    const [nx, ny, nz] = this.dims;
    const [a0, b0, c0, a1, b1, c1] = box ?? [0, 0, 0, nx - 1, ny - 1, nz - 1];
    const mx = a1 - a0 + 1, my = b1 - b0 + 1, mz = c1 - c0 + 1;
    const g = this.g;
    if (box) out.fill(Infinity);
    // x pass: 1D distance to the nearest feature along each row (two sweeps), squared.
    let any = false;
    for (let k = 0; k < mz; k++)
      for (let j = 0; j < my; j++) {
        const src = a0 + nx * (b0 + j + ny * (c0 + k));
        const dst = mx * (j + my * k);
        let dist = INF;
        for (let i = 0; i < mx; i++) {
          if (mask[src + i] !== 0) dist = 0;
          else if (dist < INF) dist++;
          g[dst + i] = dist;
        }
        dist = INF;
        for (let i = mx - 1; i >= 0; i--) {
          const gi = g[dst + i];
          if (gi === 0) dist = 0;
          else if (dist < INF) dist++;
          const m = gi < dist ? gi : dist;
          g[dst + i] = m < INF ? m * m : INF;
          if (m === 0) any = true;
        }
      }
    if (!any) {
      out.fill(Infinity);
      return;
    }
    for (let k = 0; k < mz; k++) for (let i = 0; i < mx; i++) this.line(i + mx * my * k, mx, my);
    const sxy = mx * my;
    for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++) this.line(i + mx * j, sxy, mz);
    for (let k = 0; k < mz; k++)
      for (let j = 0; j < my; j++) {
        const src = mx * (j + my * k);
        const dst = a0 + nx * (b0 + j + ny * (c0 + k));
        for (let i = 0; i < mx; i++) {
          const q = g[src + i];
          out[dst + i] = q >= INF ? Infinity : Math.sqrt(q);
        }
      }
  }

  private line(base: number, stride: number, n: number): void {
    const g = this.g, f = this.f, d = this.d, vv = this.v, zz = this.z;
    let finite = false;
    for (let q = 0, p = base; q < n; q++, p += stride) {
      const x = g[p];
      f[q] = x;
      if (x < INF) finite = true;
    }
    if (!finite) return;
    let k = 0;
    vv[0] = 0;
    zz[0] = -Infinity;
    zz[1] = Infinity;
    for (let q = 1; q < n; q++) {
      const fq = f[q] + q * q;
      let vk = vv[k];
      let s = (fq - (f[vk] + vk * vk)) / (2 * (q - vk));
      while (s <= zz[k]) {
        k--;
        vk = vv[k];
        s = (fq - (f[vk] + vk * vk)) / (2 * (q - vk));
      }
      k++;
      vv[k] = q;
      zz[k] = s;
      zz[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (zz[k + 1] < q) k++;
      const dq = q - vv[k];
      d[q] = dq * dq + f[vv[k]];
    }
    for (let q = 0, p = base; q < n; q++, p += stride) g[p] = d[q];
  }
}

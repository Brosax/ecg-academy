/**
 * Render mesh = zero set of the voxel SDF (surface nets).
 *   1. The SDF is resampled (trilinear) at meshScale·h — the grid stays at h for the simulation, the mesh only needs
 *      ~2 mm facets (keeps the triangle budget at 40–90k with all cavity and vessel surfaces).
 *   2. Topology repair makes the sign field well-composed: cells whose corner pattern is ambiguous (checkerboard face,
 *      or inside / outside corners not edge-connected) get their nearest-to-zero outside corner flipped inside. Surface
 *      nets then yields a closed 2-manifold (every edge in exactly two faces, every vertex a single fan). Only the
 *      mesh's own copy of the field changes; voxel labels and sdfMm are untouched.
 *   3. Normals = fine-grid SDF gradient (trilinear); voxel = nearest tissue voxel of the fine grid (myocardium
 *      preferred on ties, so ring / vessel vertices keep their own tissue).
 */
import type { RenderMesh, Vec3 } from '../types';
import { TISSUE } from '../types';
import { surfaceNets } from './surfaceNets';

const T_OUT = TISSUE.Out, T_BLOOD = TISSUE.Blood;
const T_LV = TISSUE.LV, T_RV = TISSUE.RV, T_SEP = TISSUE.Septum, T_LA = TISSUE.LA, T_RA = TISSUE.RA;
const isMyo = (t: number) => t === T_LV || t === T_RV || t === T_SEP || t === T_LA || t === T_RA;

/** BAD[mask] = 1 when the 8-corner inside mask gives a non-disk surface patch in surface nets. */
const BAD = (() => {
  const faces = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];
  const components = (mask: number, want: number) => {
    let seen = 0, n = 0;
    for (let c = 0; c < 8; c++) {
      if (((mask >> c) & 1) !== want || (seen >> c) & 1) continue;
      n++;
      const stack = [c];
      seen |= 1 << c;
      while (stack.length) {
        const a = stack.pop()!;
        for (const bit of [1, 2, 4]) {
          const b = a ^ bit;
          if (((mask >> b) & 1) === want && !((seen >> b) & 1)) {
            seen |= 1 << b;
            stack.push(b);
          }
        }
      }
    }
    return n;
  };
  const t = new Uint8Array(256);
  for (let m = 1; m < 255; m++) {
    const checker = faces.some(([a, b, c, d]) => {
      const ia = (m >> a) & 1, ib = (m >> b) & 1, ic = (m >> c) & 1, id = (m >> d) & 1;
      return ia === ic && ib === id && ia !== ib;
    });
    t[m] = checker || components(m, 1) > 1 || components(m, 0) > 1 ? 1 : 0;
  }
  return t;
})();

/** Flips ambiguous outside corners to inside until no cell is BAD. Returns the number of flipped samples. */
export function repairTopology(f: Float32Array, dims: readonly [number, number, number]): number {
  const [nx, ny, nz] = dims;
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const sy = nx, sz = nx * ny;
  const off = [0, 1, sy, sy + 1, sz, sz + 1, sz + sy, sz + sy + 1];
  const inside = new Uint8Array(f.length);
  for (let v = 0; v < f.length; v++) inside[v] = f[v] < 0 ? 1 : 0;
  const maskOf = (v0: number) =>
    inside[v0] | (inside[v0 + 1] << 1) | (inside[v0 + sy] << 2) | (inside[v0 + sy + 1] << 3) |
    (inside[v0 + sz] << 4) | (inside[v0 + sz + 1] << 5) | (inside[v0 + sz + sy] << 6) | (inside[v0 + sz + sy + 1] << 7);
  const work: number[] = [];
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        const v0 = i + nx * (j + ny * k);
        if (BAD[maskOf(v0)]) work.push(v0);
      }
  let flips = 0;
  const limit = f.length >> 4;
  while (work.length && flips < limit) {
    const v0 = work.pop()!;
    const m = maskOf(v0);
    if (!BAD[m]) continue;
    let best = -1, bestF = Infinity;
    for (let c = 0; c < 8; c++) {
      if ((m >> c) & 1) continue;
      const u = v0 + off[c];
      if (f[u] < bestF) { bestF = f[u]; best = u; }
    }
    inside[best] = 1;
    f[best] = -1e-3;
    flips++;
    // re-check the 8 cells that contain the flipped sample
    const bi = best % nx, bj = Math.floor(best / nx) % ny, bk = Math.floor(best / sz);
    for (let dk = -1; dk <= 0; dk++)
      for (let dj = -1; dj <= 0; dj++)
        for (let di = -1; di <= 0; di++) {
          const i = bi + di, j = bj + dj, k = bk + dk;
          if (i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz) continue;
          const c0 = i + nx * (j + ny * k);
          if (BAD[maskOf(c0)]) work.push(c0);
        }
  }
  return flips;
}

export interface MeshBuild {
  readonly mesh: RenderMesh;
  readonly meshSpacingMm: number;
  readonly repairedSamples: number;
}

export function buildRenderMesh(
  sdf: Float32Array,
  tissue: Uint8Array,
  dims: readonly [number, number, number],
  origin: Vec3,
  h: number,
  meshScale = 1.25,
): MeshBuild {
  const [nx, ny, nz] = dims;
  const sy = nx, sz = nx * ny;
  // 1. resample
  const hm = h * meshScale;
  const mx = Math.floor(((nx - 1) * h) / hm) + 1, my = Math.floor(((ny - 1) * h) / hm) + 1, mz = Math.floor(((nz - 1) * h) / hm) + 1;
  const f = new Float32Array(mx * my * mz);
  const s = meshScale;
  for (let k = 0, q = 0; k < mz; k++) {
    const fz = Math.min(nz - 1.000001, k * s), k0 = Math.floor(fz), tz = fz - k0;
    for (let j = 0; j < my; j++) {
      const fy = Math.min(ny - 1.000001, j * s), j0 = Math.floor(fy), ty = fy - j0;
      for (let i = 0; i < mx; i++, q++) {
        const fx = Math.min(nx - 1.000001, i * s), i0 = Math.floor(fx), tx = fx - i0;
        const v = i0 + nx * (j0 + ny * k0);
        const a = sdf[v] + (sdf[v + 1] - sdf[v]) * tx;
        const b = sdf[v + sy] + (sdf[v + sy + 1] - sdf[v + sy]) * tx;
        const c = sdf[v + sz] + (sdf[v + sz + 1] - sdf[v + sz]) * tx;
        const d = sdf[v + sz + sy] + (sdf[v + sz + sy + 1] - sdf[v + sz + sy]) * tx;
        const ab = a + (b - a) * ty, cd = c + (d - c) * ty;
        f[q] = ab + (cd - ab) * tz;
      }
    }
  }
  // 2. topology repair, 3. surface nets
  const mdims: [number, number, number] = [mx, my, mz];
  const repaired = repairTopology(f, mdims);
  const sn = surfaceNets(f, mdims, origin, hm);
  // 4. normals from the fine SDF gradient, voxel = nearest fine tissue voxel
  const nv = sn.position.length / 3;
  const normal = new Float32Array(nv * 3);
  const voxel = new Uint32Array(nv);
  for (let p = 0; p < nv; p++) {
    const gxp = (sn.position[3 * p] - origin[0]) / h;
    const gyp = (sn.position[3 * p + 1] - origin[1]) / h;
    const gzp = (sn.position[3 * p + 2] - origin[2]) / h;
    const i = Math.min(nx - 3, Math.max(1, Math.floor(gxp)));
    const j = Math.min(ny - 3, Math.max(1, Math.floor(gyp)));
    const k = Math.min(nz - 3, Math.max(1, Math.floor(gzp)));
    const fx = gxp - i, fy = gyp - j, fz = gzp - k;
    const c = i + nx * (j + ny * k);
    let gx = 0, gy = 0, gz = 0;
    let best = -1, bestD = Infinity, bestMyo = false;
    for (let q = 0; q < 8; q++) {
      const ox = q & 1, oy = (q >> 1) & 1, oz = (q >> 2) & 1;
      const u = c + ox + oy * sy + oz * sz;
      const w = (ox ? fx : 1 - fx) * (oy ? fy : 1 - fy) * (oz ? fz : 1 - fz);
      gx += w * (sdf[u + 1] - sdf[u - 1]);
      gy += w * (sdf[u + sy] - sdf[u - sy]);
      gz += w * (sdf[u + sz] - sdf[u - sz]);
      const t = tissue[u];
      if (t === T_OUT || t === T_BLOOD) continue;
      const myo = isMyo(t);
      const d = (ox - fx) ** 2 + (oy - fy) ** 2 + (oz - fz) ** 2;
      if (d < bestD - 1e-9 || (Math.abs(d - bestD) <= 1e-9 && myo && !bestMyo)) {
        best = u;
        bestD = d;
        bestMyo = myo;
      }
    }
    const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    normal[3 * p] = gx / l;
    normal[3 * p + 1] = gy / l;
    normal[3 * p + 2] = gz / l;
    voxel[p] = best >= 0 ? best : nearestTissue(tissue, dims, gxp, gyp, gzp);
  }
  return {
    mesh: { position: sn.position, normal, index: sn.index, voxel },
    meshSpacingMm: hm,
    repairedSamples: repaired,
  };
}

/** Nearest non-Out, non-Blood voxel to the fractional grid position (searches ±3 voxels). */
function nearestTissue(tissue: Uint8Array, dims: readonly [number, number, number], gx: number, gy: number, gz: number): number {
  const [nx, ny, nz] = dims;
  const ci = Math.round(gx), cj = Math.round(gy), ck = Math.round(gz);
  let best = 0, bestD = Infinity;
  for (let dk = -3; dk <= 3; dk++)
    for (let dj = -3; dj <= 3; dj++)
      for (let di = -3; di <= 3; di++) {
        const a = ci + di, b = cj + dj, c = ck + dk;
        if (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) continue;
        const u = a + nx * (b + ny * c);
        const t = tissue[u];
        if (t === T_OUT || t === T_BLOOD) continue;
        const d = (a - gx) ** 2 + (b - gy) ** 2 + (c - gz) ** 2;
        if (d < bestD) { bestD = d; best = u; }
      }
  return best;
}

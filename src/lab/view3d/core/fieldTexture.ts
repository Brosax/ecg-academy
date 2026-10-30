/**
 * 3D-texture packing for the slice plane and the displacement field (GPU contract):
 *   uFieldTex  RGBA16F (tAct slot 0, tAct slot 1, apdRef, sdfMm) — tAct/apd dilated 2 voxels outward so trilinear
 *              sampling at the wall edge never blends in blood/outside values.
 *   uLabelTex  R8 TISSUE code (NEAREST) — grid.tissue as is.
 *   uChamberTex (internal) RGBA8 membership weights (LA, RA, LV, RV), LINEAR — makes the radial contraction a smooth
 *              field that the heart mesh, the slice plane, the tubes and the valves all evaluate identically.
 * Pure (no three import) so it can be unit-tested in node.
 *
 * Texture mapping: voxel centre i sits at texel centre (i + 0.5) / n, so the texture box starts at originMm − h/2 and
 * spans dims·h (uGridOrigin / uGridSize).
 */
import type { EngineFields, Vec3, VoxelGrid } from '../../sim/types';
import { compOfTissue, isMyocardium, TISSUE } from '../../sim/types';
import { slotFields } from './attributes';

/** Largest finite half float; RGBA16F cannot hold T_NEVER = 1e9. The shader treats anything ≥ 1000 ms as "no value". */
export const HALF_NEVER = 65504;
export const DILATE_VOXELS = 2;

// ---------------------------------------------------------------- half floats

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/** IEEE 754 binary16 bits (round to nearest), clamped to ±65504 without warnings (unlike DataUtils.toHalfFloat). */
export function toHalf(val: number): number {
  if (Number.isNaN(val)) return 0x7e00;
  f32[0] = Math.max(-HALF_NEVER, Math.min(HALF_NEVER, val));
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const exp = (x >>> 23) & 0xff;
  const mant = x & 0x7fffff;
  if (exp < 103) return sign;
  if (exp < 113) {
    const m = mant | 0x800000;
    const shift = 126 - exp;
    let h = m >>> shift;
    if ((m >>> (shift - 1)) & 1) h += 1;
    return sign | h;
  }
  let h = sign | ((exp - 112) << 10) | (mant >>> 13);
  if (mant & 0x1000) h += 1;
  return h;
}

export function fromHalf(h: number): number {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >>> 10) & 0x1f;
  const m = h & 0x3ff;
  if (e === 0) return s * m * 2 ** -24;
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * 2 ** (e - 15);
}

// ---------------------------------------------------------------- dilation

/** 26-neighbourhood offsets (di, dj, dk). */
const NB: readonly (readonly [number, number, number])[] = (() => {
  const o: [number, number, number][] = [];
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j || k) o.push([i, j, k]);
  return o;
})();

/**
 * Generic outward dilation: voxels with stamp 1 are sources; `canFill(v)` selects targets. Each pass fills targets
 * adjacent to already-valid voxels with the average of their valid neighbours (per channel, ignoring NaN).
 * Returns the stamp array (0 = empty, 1 = source, p + 1 = filled in pass p).
 */
export function dilateChannels(
  dims: readonly [number, number, number],
  isSource: (v: number) => boolean,
  canFill: (v: number) => boolean,
  channels: readonly Float32Array[],
  passes: number,
): Uint8Array {
  const [nx, ny, nz] = dims;
  const N = nx * ny * nz;
  const stamp = new Uint8Array(N);
  let frontier: number[] = [];
  for (let v = 0; v < N; v++) if (isSource(v)) {
    stamp[v] = 1;
    frontier.push(v);
  }
  const PENDING = 255;
  for (let pass = 1; pass <= passes; pass++) {
    const next: number[] = [];
    for (const v of frontier) {
      const i = v % nx, j = ((v / nx) | 0) % ny, k = (v / (nx * ny)) | 0;
      for (const [di, dj, dk] of NB) {
        const a = i + di, b = j + dj, c = k + dk;
        if (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) continue;
        const w = a + nx * (b + ny * c);
        if (stamp[w] === 0 && canFill(w)) {
          stamp[w] = PENDING;
          next.push(w);
        }
      }
    }
    const sums = new Float64Array(channels.length);
    const counts = new Uint16Array(channels.length);
    for (const v of next) {
      sums.fill(0);
      counts.fill(0);
      const i = v % nx, j = ((v / nx) | 0) % ny, k = (v / (nx * ny)) | 0;
      for (const [di, dj, dk] of NB) {
        const a = i + di, b = j + dj, c = k + dk;
        if (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) continue;
        const w = a + nx * (b + ny * c);
        const s = stamp[w];
        if (s === 0 || s === PENDING || s > pass) continue;
        for (let ch = 0; ch < channels.length; ch++) {
          const x = channels[ch][w];
          if (!Number.isNaN(x)) {
            sums[ch] += x;
            counts[ch]++;
          }
        }
      }
      for (let ch = 0; ch < channels.length; ch++) channels[ch][v] = counts[ch] ? sums[ch] / counts[ch] : NaN;
    }
    for (const v of next) stamp[v] = pass + 1;
    frontier = next;
  }
  return stamp;
}

// ---------------------------------------------------------------- field channels

export interface FieldChannels {
  readonly tAct0: Float32Array;
  readonly tAct1: Float32Array;
  readonly apd: Float32Array;
  /** 0 empty, 1 myocardium, 2.. dilated in pass (stamp − 1). */
  readonly stamp: Uint8Array;
}

/** Float channels (NaN = no value) before half-float packing. tAct is taken from the voxel's own compartment. */
export function buildFieldChannels(grid: VoxelGrid, fields: EngineFields, dilate = DILATE_VOXELS): FieldChannels {
  const N = grid.tissue.length;
  const tAct0 = new Float32Array(N).fill(NaN);
  const tAct1 = new Float32Array(N).fill(NaN);
  const apd = new Float32Array(N).fill(NaN);
  for (let v = 0; v < N; v++) {
    const t = grid.tissue[v];
    if (!isMyocardium(t)) continue;
    const [f0, f1] = slotFields(fields, compOfTissue(t));
    const a = f0 ? f0.tAct[v] : NaN, b = f1 ? f1.tAct[v] : NaN;
    if (Number.isFinite(a)) tAct0[v] = a;
    if (Number.isFinite(b)) tAct1[v] = b;
    const d = fields.apd.apdRefMs[v];
    if (Number.isFinite(d) && d > 0) apd[v] = d;
  }
  const stamp = dilateChannels(grid.dims, (v) => isMyocardium(grid.tissue[v]), (v) => !isMyocardium(grid.tissue[v]), [tAct0, tAct1, apd], dilate);
  return { tAct0, tAct1, apd, stamp };
}

const halfOrNever = (x: number): number => toHalf(Number.isNaN(x) || x >= HALF_NEVER ? HALF_NEVER : x);

export interface FieldVolume {
  readonly dims: readonly [number, number, number];
  /** RGBA16F texels, x fastest (same order as the voxel grid). */
  readonly rgbaHalf: Uint16Array;
  /** R8 TISSUE codes. */
  readonly label: Uint8Array;
  /** RGBA8 chamber membership (LA, RA, LV, RV). */
  readonly chamberW: Uint8Array;
  /** Texture box min corner (= originMm − h/2) and size (= dims · h), local mm. */
  readonly boxMinMm: Vec3;
  readonly boxSizeMm: Vec3;
}

/** Chamber membership weights, dilated outward into OUT voxels only (ring and vessels do not contract radially). */
export function buildChamberWeights(grid: VoxelGrid, dilate = DILATE_VOXELS): Uint8Array {
  const N = grid.tissue.length;
  const ch: Float32Array[] = [0, 1, 2, 3].map(() => new Float32Array(N));
  for (let v = 0; v < N; v++) {
    const c = grid.chamber[v];
    if (c >= 1 && c <= 4) ch[c - 1][v] = 1;
  }
  dilateChannels(grid.dims, (v) => grid.chamber[v] >= 1 && grid.chamber[v] <= 4, (v) => grid.tissue[v] === TISSUE.Out, ch, dilate);
  const out = new Uint8Array(4 * N);
  for (let v = 0; v < N; v++)
    for (let c = 0; c < 4; c++) {
      const x = ch[c][v];
      out[4 * v + c] = Number.isNaN(x) ? 0 : Math.round(Math.max(0, Math.min(1, x)) * 255);
    }
  return out;
}

export function packFieldVolume(grid: VoxelGrid, fields: EngineFields, dilate = DILATE_VOXELS): FieldVolume {
  const N = grid.tissue.length;
  const c = buildFieldChannels(grid, fields, dilate);
  const rgbaHalf = new Uint16Array(4 * N);
  for (let v = 0; v < N; v++) {
    rgbaHalf[4 * v] = halfOrNever(c.tAct0[v]);
    rgbaHalf[4 * v + 1] = halfOrNever(c.tAct1[v]);
    rgbaHalf[4 * v + 2] = halfOrNever(c.apd[v]);
    rgbaHalf[4 * v + 3] = toHalf(grid.sdfMm[v]);
  }
  const h = grid.hMm;
  const [nx, ny, nz] = grid.dims;
  return {
    dims: grid.dims,
    rgbaHalf,
    label: grid.tissue,
    chamberW: buildChamberWeights(grid, dilate),
    boxMinMm: [grid.originMm[0] - h / 2, grid.originMm[1] - h / 2, grid.originMm[2] - h / 2],
    boxSizeMm: [nx * h, ny * h, nz * h],
  };
}

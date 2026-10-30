/** Test helper: writes label / scalar volume slices as PNG (tests/out/hra/). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { encodePng } from '../../../../../src/lab/sim/calibrate/png';

export type Rgb = readonly [number, number, number];
export const OUT_DIR = new URL('../../../../out/lab/hra/', import.meta.url);

/** Plane through the volume: axis normal (0 x, 1 y, 2 z) at index `at`. Returns width, height and a sampler (u, v) → voxel. */
export function slicePlane(dims: readonly number[], axis: 0 | 1 | 2, at: number) {
  const [nx, ny] = dims;
  // u, v axes chosen for a radiological-style view: axial (normal y) u = x, v = z (down = −z? we flip so +z up)
  const ua = axis === 0 ? 2 : 0;
  const va = axis === 1 ? 2 : 1;
  const w = dims[ua], h = dims[va];
  const voxel = (u: number, v: number) => {
    const idx = [0, 0, 0];
    idx[axis] = at;
    idx[ua] = u;
    idx[va] = h - 1 - v; // image row 0 = top = max coordinate
    return idx[0] + nx * (idx[1] + ny * idx[2]);
  };
  return { w, h, voxel };
}

/** Tiles several slices horizontally, each scaled by `scale`, colours from `color(voxel)`. */
export function writeSlices(name: string, dims: readonly number[], planes: readonly { axis: 0 | 1 | 2; at: number }[], color: (v: number) => Rgb, scale = 3): string {
  const ps = planes.map((p) => slicePlane(dims, p.axis, p.at));
  const W = ps.reduce((s, p) => s + p.w * scale + 4, 0), H = Math.max(...ps.map((p) => p.h)) * scale;
  const rgb = new Uint8Array(W * H * 3).fill(255);
  let x0 = 0;
  for (const p of ps) {
    for (let y = 0; y < p.h * scale; y++)
      for (let x = 0; x < p.w * scale; x++) {
        const c = color(p.voxel(Math.floor(x / scale), Math.floor(y / scale)));
        const o = 3 * (y * W + x0 + x);
        rgb[o] = c[0];
        rgb[o + 1] = c[1];
        rgb[o + 2] = c[2];
      }
    x0 += p.w * scale + 4;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const url = new URL(name, OUT_DIR);
  writeFileSync(url, encodePng(W, H, rgb, (raw) => deflateSync(raw)));
  return url.pathname;
}

export const TISSUE_RGB: readonly Rgb[] = [
  [250, 250, 250], // Out
  [200, 40, 40], // Blood
  [235, 150, 120], // LV
  [120, 160, 230], // RV
  [190, 110, 200], // Septum
  [240, 210, 90], // LA
  [130, 210, 140], // RA
  [60, 60, 60], // Ring
  [150, 90, 60], // Vessel
  [120, 120, 120], // Dead
];

export function ramp(t: number): Rgb {
  const x = Math.max(0, Math.min(1, t));
  // blue → white → red
  return x < 0.5 ? [Math.round(60 + 390 * x), Math.round(80 + 350 * x), 255] : [255, Math.round(255 - 350 * (x - 0.5)), Math.round(255 - 390 * (x - 0.5))];
}

export const CATEGORY_RGB: readonly Rgb[] = [
  [230, 25, 75], [60, 180, 75], [255, 225, 25], [0, 130, 200], [245, 130, 48], [145, 30, 180], [70, 240, 240], [240, 50, 230],
  [210, 245, 60], [250, 190, 212], [0, 128, 128], [220, 190, 255], [170, 110, 40], [255, 250, 200], [128, 0, 0], [170, 255, 195],
  [128, 128, 0], [255, 215, 180], [0, 0, 128], [128, 128, 128], [40, 40, 40], [100, 200, 100], [200, 100, 100], [100, 100, 200],
  [200, 200, 100], [100, 200, 200], [200, 100, 200], [50, 150, 250],
];

/** Zoomed crops (half-width r voxels) of the three axis planes through voxel (i, j, k). */
export function writeCrops(name: string, dims: readonly number[], ijk: readonly number[], r: number, color: (v: number) => Rgb, scale = 6): string {
  const [nx, ny] = dims;
  const W = 3 * ((2 * r + 1) * scale + 6), H = (2 * r + 1) * scale;
  const rgb = new Uint8Array(W * H * 3).fill(255);
  for (let axis = 0; axis < 3; axis++) {
    const ua = axis === 0 ? 2 : 0, va = axis === 1 ? 2 : 1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < (2 * r + 1) * scale; x++) {
        const idx = [ijk[0], ijk[1], ijk[2]];
        idx[ua] = ijk[ua] - r + Math.floor(x / scale);
        idx[va] = ijk[va] + r - Math.floor(y / scale);
        if (idx.some((q, d) => q < 0 || q >= dims[d])) continue;
        let c = color(idx[0] + nx * (idx[1] + ny * idx[2]));
        if (Math.floor(x / scale) === r && Math.floor(y / scale) === r) c = [0, 0, 0];
        const o = 3 * (y * W + axis * ((2 * r + 1) * scale + 6) + x);
        rgb[o] = c[0];
        rgb[o + 1] = c[1];
        rgb[o + 2] = c[2];
      }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const url = new URL(name, OUT_DIR);
  writeFileSync(url, encodePng(W, H, rgb, (raw) => deflateSync(raw)));
  return url.pathname;
}

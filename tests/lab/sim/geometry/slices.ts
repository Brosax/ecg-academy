/** Slice images of a VoxelGrid for visual checks (test helper). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ConductionPath, VoxelGrid } from '../../../../src/lab/sim/types';
import { CHAMBER, TISSUE } from '../../../../src/lab/sim/types';
import { encodePng } from './png';

export type Rgb = readonly [number, number, number];
export type ColorFn = (g: VoxelGrid, v: number) => Rgb;
export type Axis = 'x' | 'y' | 'z';

const BG: Rgb = [250, 250, 250];

export const tissueColor: ColorFn = (g, v) => {
  const t = g.tissue[v];
  switch (t) {
    case TISSUE.Out: return BG;
    case TISSUE.Blood: {
      const c = g.chamber[v];
      return c === CHAMBER.LV ? [255, 200, 200] : c === CHAMBER.RV ? [200, 215, 255] : c === CHAMBER.LA ? [255, 210, 245] : c === CHAMBER.RA ? [200, 245, 240] : [255, 245, 190];
    }
    case TISSUE.LV: return [170, 30, 40];
    case TISSUE.Septum: return [235, 120, 30];
    case TISSUE.RV: return [40, 70, 190];
    case TISSUE.LA: return [170, 40, 170];
    case TISSUE.RA: return [20, 150, 140];
    case TISSUE.Ring: return [30, 30, 30];
    case TISSUE.Vessel: return [200, 170, 60];
    default: return [120, 120, 120];
  }
};

function ramp(x: number): Rgb {
  // dark blue → cyan → yellow → red
  const s = Math.max(0, Math.min(1, x));
  const stops: Rgb[] = [[20, 30, 140], [30, 170, 210], [240, 220, 40], [200, 30, 30]];
  const f = s * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(f));
  const t = f - i;
  return [0, 1, 2].map((c) => Math.round(stops[i][c] + t * (stops[i + 1][c] - stops[i][c]))) as unknown as Rgb;
}

const isMyo = (t: number) => t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum || t === TISSUE.LA || t === TISSUE.RA;
const nonMyo = (g: VoxelGrid, v: number): Rgb => (g.tissue[v] === TISSUE.Out ? BG : g.tissue[v] === TISSUE.Blood ? [235, 235, 235] : [150, 150, 150]);

export const wallDepthColor: ColorFn = (g, v) => (isMyo(g.tissue[v]) ? ramp(g.wallDepth[v]) : nonMyo(g, v));
export const apexBaseColor: ColorFn = (g, v) => (isMyo(g.tissue[v]) ? ramp(g.apexBase[v]) : nonMyo(g, v));

function hsv(hh: number, s: number, val: number): Rgb {
  const i = Math.floor(hh * 6), f = hh * 6 - i;
  const p = val * (1 - s), q = val * (1 - f * s), t = val * (1 - (1 - f) * s);
  const [r, g, b] = [[val, t, p], [q, val, p], [p, val, t], [p, q, val], [t, p, val], [val, p, q]][i % 6];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
const AHA_COLORS: Rgb[] = [[0, 0, 0], ...Array.from({ length: 17 }, (_, i) => hsv(((i * 7) % 17) / 17, 0.75, i < 6 ? 0.95 : i < 12 ? 0.75 : 0.55))];
export const ahaColor: ColorFn = (g, v) => (g.aha[v] ? AHA_COLORS[g.aha[v]] : isMyo(g.tissue[v]) ? [90, 90, 90] : nonMyo(g, v));
export const regionColor: ColorFn = (g, v) => {
  const r = g.region[v];
  if (r === 255) return g.tissue[v] === TISSUE.Out ? BG : g.tissue[v] === TISSUE.Blood ? [235, 235, 235] : [120, 120, 120];
  return hsv(((r * 11) % 29) / 29, 0.7, 0.9);
};

/**
 * Projection along `axis` of all myocardium (light) with every conduction path drawn in its own colour —
 * a quick look at where the SA node, Bachmann, AVN, His, bundle branches and fascicles run.
 */
export function renderPathProjection(g: VoxelGrid, paths: readonly ConductionPath[], axis: Axis, file: string, s = 3): void {
  const [nx, ny, nz] = g.dims;
  const dims = [nx, ny, nz];
  const [uAxis, wAxis] = axis === 'y' ? [0, 2] : axis === 'z' ? [0, 1] : [2, 1];
  const nAxis = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const nu = dims[uAxis], nw = dims[wAxis];
  const W = nu * s, H = nw * s;
  const img = new Uint8Array(W * H * 3).fill(255);
  for (let wv = 0; wv < nw; wv++)
    for (let uv = 0; uv < nu; uv++) {
      let myo = 0, vent = 0;
      for (let n = 0; n < dims[nAxis]; n++) {
        const ijk = [0, 0, 0];
        ijk[uAxis] = uv; ijk[wAxis] = wv; ijk[nAxis] = n;
        const t = g.tissue[ijk[0] + nx * (ijk[1] + ny * ijk[2])];
        if (t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum) vent++;
        else if (t === TISSUE.LA || t === TISSUE.RA) myo++;
      }
      const c: Rgb = vent ? [255 - Math.min(90, vent * 3), 215 - Math.min(90, vent * 3), 215 - Math.min(90, vent * 3)] : myo ? [215, 200, 235] : [250, 250, 250];
      for (let a = 0; a < s; a++)
        for (let b = 0; b < s; b++) {
          const o = 3 * (((nw - 1 - wv) * s + a) * W + uv * s + b);
          img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
        }
    }
  const colors: Record<string, Rgb> = {
    SA: [230, 120, 0], BACHMANN: [240, 170, 0], AVN: [0, 150, 0], HIS: [0, 0, 0], LBB: [200, 0, 0],
    LAF: [255, 0, 160], LPF: [140, 0, 200], LSF: [255, 80, 80], RBB: [0, 90, 255],
  };
  for (const p of paths) {
    const c = colors[p.id] ?? [0, 0, 0];
    for (let q = 0; q < p.pointsMm.length; q++) {
      const a = p.pointsMm[q], b = p.pointsMm[Math.min(q + 1, p.pointsMm.length - 1)];
      for (let t = 0; t <= 1; t += 0.1) {
        const pu = (a[uAxis] + t * (b[uAxis] - a[uAxis]) - g.originMm[uAxis]) / g.hMm;
        const pw = (a[wAxis] + t * (b[wAxis] - a[wAxis]) - g.originMm[wAxis]) / g.hMm;
        const px = Math.round(pu * s + s / 2), py = Math.round((nw - 1 - pw) * s + s / 2);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = px + dx, yy = py + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const o = 3 * (yy * W + xx);
            img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
          }
      }
    }
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(W, H, img));
}

export interface SliceSpec {
  readonly axis: Axis;
  /** Slice position in local mm along the axis. */
  readonly at: readonly number[];
}

/**
 * Renders slices into one tiled image. Axial (y): x right, z up (anterior up). Coronal (z): x right, y up.
 * Sagittal (x): z right (anterior right), y up. Optional polylines (local mm) are projected in black.
 */
export function renderSlices(
  g: VoxelGrid,
  spec: SliceSpec,
  color: ColorFn,
  file: string,
  opts: { scale?: number; cols?: number; paths?: readonly ConductionPath[] } = {},
): void {
  const [nx, ny, nz] = g.dims;
  const s = opts.scale ?? 3;
  const cols = opts.cols ?? Math.min(3, spec.at.length);
  const rows = Math.ceil(spec.at.length / cols);
  // in-plane axes (u right, w up)
  const [uAxis, wAxis] = spec.axis === 'y' ? [0, 2] : spec.axis === 'z' ? [0, 1] : [2, 1];
  const nAxis = spec.axis === 'x' ? 0 : spec.axis === 'y' ? 1 : 2;
  const dims = [nx, ny, nz];
  const nu = dims[uAxis], nw = dims[wAxis];
  const tw = nu * s, th = nw * s, gap = 4;
  const W = cols * tw + (cols + 1) * gap, H = rows * th + (rows + 1) * gap;
  const img = new Uint8Array(W * H * 3).fill(255);
  spec.at.forEach((mm, n) => {
    const ox = gap + (n % cols) * (tw + gap), oy = gap + Math.floor(n / cols) * (th + gap);
    const slice = Math.round((mm - g.originMm[nAxis]) / g.hMm);
    if (slice < 0 || slice >= dims[nAxis]) return;
    for (let wv = 0; wv < nw; wv++)
      for (let uv = 0; uv < nu; uv++) {
        const ijk = [0, 0, 0];
        ijk[uAxis] = uv;
        ijk[wAxis] = wv;
        ijk[nAxis] = slice;
        const v = ijk[0] + nx * (ijk[1] + ny * ijk[2]);
        const c = color(g, v);
        for (let a = 0; a < s; a++)
          for (let b = 0; b < s; b++) {
            const px = ox + uv * s + b, py = oy + (nw - 1 - wv) * s + a;
            const o = 3 * (py * W + px);
            img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
          }
      }
    // polylines within ±3 mm of the slice
    for (const p of opts.paths ?? [])
      for (const q of p.pointsMm) {
        if (Math.abs(q[nAxis] - mm) > 3) continue;
        const uv = (q[uAxis] - g.originMm[uAxis]) / g.hMm, wv = (q[wAxis] - g.originMm[wAxis]) / g.hMm;
        const px = Math.round(ox + uv * s + s / 2), py = Math.round(oy + (nw - 1 - wv) * s + s / 2);
        for (let a = -1; a <= 1; a++)
          for (let b = -1; b <= 1; b++) {
            const xx = px + b, yy = py + a;
            if (xx < ox || yy < oy || xx >= ox + tw || yy >= oy + th) continue;
            const o = 3 * (yy * W + xx);
            img[o] = 0; img[o + 1] = 0; img[o + 2] = 0;
          }
      }
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(W, H, img));
}

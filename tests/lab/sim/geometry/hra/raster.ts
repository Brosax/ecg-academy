/** Test helper: tiny orthographic z-buffer rasterizer (flat Lambert shading) → PNG, for eyeballing meshes. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { encodePng } from '../../../../../src/lab/sim/calibrate/png';
import { OUT_DIR } from './slicePng';
import type { Rgb } from './slicePng';

export interface RasterPart {
  readonly position: ArrayLike<number>;
  readonly index: ArrayLike<number>;
  readonly color: Rgb | ((vertex: number) => Rgb);
  /** Optional clip: keep triangles whose centroid satisfies it. */
  readonly keep?: (x: number, y: number, z: number) => boolean;
}

/** View: camera looks along −dir (dir points from the scene to the camera); up = screen up. */
export function renderViews(name: string, parts: readonly RasterPart[], views: readonly { dir: readonly number[]; up: readonly number[] }[], size = 360, pad = 6): void {
  // bounds
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) for (let i = 0; i < p.position.length; i += 3) for (let d = 0; d < 3; d++) {
    lo[d] = Math.min(lo[d], p.position[i + d]);
    hi[d] = Math.max(hi[d], p.position[i + d]);
  }
  const c = [0, 1, 2].map((d) => (lo[d] + hi[d]) / 2);
  const R = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
  const W = views.length * (size + pad), H = size;
  const rgb = new Uint8Array(W * H * 3).fill(255);
  views.forEach((view, vi) => {
    const f = norm(view.dir);
    const r = norm(cross(view.up, f));
    const u = cross(f, r);
    const zb = new Float32Array(size * size).fill(-Infinity);
    const s = (size / 2 - 4) / R;
    const proj = (P: ArrayLike<number>, i: number) => {
      const x = P[i] - c[0], y = P[i + 1] - c[1], z = P[i + 2] - c[2];
      return [size / 2 + s * (x * r[0] + y * r[1] + z * r[2]), size / 2 - s * (x * u[0] + y * u[1] + z * u[2]), x * f[0] + y * f[1] + z * f[2]];
    };
    for (const p of parts) {
      const P = p.position, I = p.index;
      for (let t = 0; t < I.length; t += 3) {
        const a = 3 * I[t], b = 3 * I[t + 1], cc = 3 * I[t + 2];
        if (p.keep && !p.keep((P[a] + P[b] + P[cc]) / 3, (P[a + 1] + P[b + 1] + P[cc + 1]) / 3, (P[a + 2] + P[b + 2] + P[cc + 2]) / 3)) continue;
        const A = proj(P, a), B = proj(P, b), C = proj(P, cc);
        const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[cc] - P[a], P[cc + 1] - P[a + 1], P[cc + 2] - P[a + 2]];
        const n = norm(cross(e1, e2));
        const lam = 0.35 + 0.65 * Math.abs(n[0] * f[0] + n[1] * f[1] + n[2] * f[2]);
        const col = typeof p.color === 'function' ? p.color(I[t]) : p.color;
        const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(size - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
        const y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(size - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
        const det = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]);
        if (Math.abs(det) < 1e-9) continue;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const l1 = ((B[0] - px) * (C[1] - py) - (C[0] - px) * (B[1] - py)) / det;
          const l2 = ((C[0] - px) * (A[1] - py) - (A[0] - px) * (C[1] - py)) / det;
          const l3 = 1 - l1 - l2;
          if (l1 < 0 || l2 < 0 || l3 < 0) continue;
          const z = l1 * A[2] + l2 * B[2] + l3 * C[2];
          if (z <= zb[y * size + x]) continue;
          zb[y * size + x] = z;
          const o = 3 * (y * W + vi * (size + pad) + x);
          rgb[o] = col[0] * lam;
          rgb[o + 1] = col[1] * lam;
          rgb[o + 2] = col[2] * lam;
        }
      }
    }
  });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(new URL(name, OUT_DIR), encodePng(W, H, rgb, (raw) => deflateSync(raw)));
}

function cross(a: readonly number[], b: readonly number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: readonly number[]): number[] {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

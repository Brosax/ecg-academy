/**
 * Visual check of the baked HRA heart → tests/out/hra/*.png (read them!). Runs with BAKE=1 or HRA_PNG=1.
 *   hra-tissue / hra-wall / hra-aha / hra-region: local-frame slices — short axis (y = −25, 0, 25 mm), four-chamber
 *   (z = 0) and long axis (x = −5); conduction-path points drawn black.
 *   hra-3d-region / hra-3d-4ch / hra-3d-overlays: software renders (anterior, posterior, left lateral; four-chamber cut).
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { mat3MulVec, mat3Transpose } from '../../../src/lab/sim/frame';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import type { Vec3 } from '../../../src/lab/sim/types';
import { renderViews } from '../sim/geometry/hra/raster';
import { CATEGORY_RGB, ramp, TISSUE_RGB, writeSlices } from '../sim/geometry/hra/slicePng';
import type { Rgb } from '../sim/geometry/hra/slicePng';

const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
const RUN = (process.env.BAKE === '1' || process.env.HRA_PNG === '1') && existsSync(ASSET);

function blob(p: Vec3, r: number) {
  const pos = [p[0] + r, p[1], p[2], p[0] - r, p[1], p[2], p[0], p[1] + r, p[2], p[0], p[1] - r, p[2], p[0], p[1], p[2] + r, p[0], p[1], p[2] - r];
  const idx = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5];
  return { pos, idx };
}

describe.runIf(RUN)('HRA visual check', () => {
  it('writes slices and renders', async () => {
    const B = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
    const G = B.grid;
    const [nx, ny] = G.dims;
    const h = G.hMm;
    const at = (axis: 0 | 1 | 2, mm: number) => ({ axis, at: Math.round((mm - G.originMm[axis]) / h) });
    const planes = [at(1, -25), at(1, 0), at(1, 25), at(2, 0), at(0, -5)];
    const onPath = new Set<number>();
    for (const p of B.paths) for (const q of p.pointsMm) onPath.add(Math.round((q[0] - G.originMm[0]) / h) + nx * (Math.round((q[1] - G.originMm[1]) / h) + ny * Math.round((q[2] - G.originMm[2]) / h)));
    const myo = (v: number) => G.tissue[v] >= 2 && G.tissue[v] <= 6;
    const BG: Rgb = [250, 250, 250], BLOOD: Rgb = [255, 228, 228];
    const mark = (f: (v: number) => Rgb) => (v: number): Rgb => (onPath.has(v) ? [0, 0, 0] : f(v));
    writeSlices('hra-tissue.png', G.dims, planes, mark((v) => (G.tissue[v] === 1 ? (([[200, 40, 40], [255, 150, 150], [150, 30, 30], [255, 90, 170], [170, 90, 255]] as const)[G.chamber[v]]) : TISSUE_RGB[G.tissue[v]])), 3);
    writeSlices('hra-wall.png', G.dims, planes, (v) => (myo(v) ? ramp(G.wallDepth[v]) : G.tissue[v] === 1 ? BLOOD : BG), 3);
    writeSlices('hra-aha.png', G.dims, planes, (v) => (G.aha[v] ? CATEGORY_RGB[G.aha[v] - 1] : myo(v) ? [205, 205, 205] : G.tissue[v] === 1 ? BLOOD : BG), 3);
    writeSlices('hra-region.png', G.dims, planes, mark((v) => (G.region[v] < 255 ? CATEGORY_RGB[G.region[v]] : G.tissue[v] === 1 ? BLOOD : BG)), 3);
    writeSlices('hra-apexbase.png', G.dims, planes, (v) => (myo(v) ? ramp(G.apexBase[v]) : BG), 3);

    const Rt = mat3Transpose(B.pose.R);
    const local = (d: Vec3) => mat3MulVec(Rt, d);
    const ANT = { dir: local([0, 0, 1]), up: local([0, 1, 0]) }, POST = { dir: local([0, 0, -1]), up: local([0, 1, 0]) }, LEFT = { dir: local([1, 0, 0]), up: local([0, 1, 0]) };
    const regionCol = (i: number): Rgb => {
      const r = G.region[B.mesh.voxel[i]];
      return r < 255 ? CATEGORY_RGB[r] : [200, 200, 200];
    };
    renderViews('hra-3d-region.png', [{ position: B.mesh.position, index: B.mesh.index, color: regionCol }], [ANT, POST, LEFT], 320);
    const pathParts = B.paths.map((p, i) => {
      const pos: number[] = [], idx: number[] = [];
      for (const q of p.pointsMm) {
        const b = blob(q, 1.4);
        const o = pos.length / 3;
        pos.push(...b.pos);
        idx.push(...b.idx.map((x) => x + o));
      }
      return { position: pos, index: idx, color: CATEGORY_RGB[(i * 3 + 5) % 28] };
    });
    renderViews('hra-3d-4ch.png', [{ position: B.mesh.position, index: B.mesh.index, color: regionCol, keep: (_x: number, _y: number, z: number) => z < 0 }, ...pathParts], [{ dir: [0, 0, 1], up: [0, 1, 0] }], 560);
    const vesselCol = (k: string): Rgb => (k === 'coronaryArtery' ? [210, 30, 30] : k === 'cardiacVein' ? [110, 80, 200] : k === 'pulmonaryVein' ? [200, 110, 110] : [170, 120, 110]);
    renderViews('hra-3d-overlays.png', [{ position: B.mesh.position, index: B.mesh.index, color: [235, 205, 195] as Rgb }, ...B.overlays!.map((o) => ({ position: o.position, index: o.index, color: vesselCol(o.kind) }))], [ANT, POST, LEFT], 360);
  }, 120_000);
});

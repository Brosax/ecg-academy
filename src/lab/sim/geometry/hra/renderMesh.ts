/**
 * Render mesh and overlays of the HRA heart (local frame, mm).
 *   mesh: the REAL heart triangles — chamber walls, septum, papillary muscles and the valve annulus bands.
 *   voxel per vertex: myocardial vertices → nearest myocardium voxel of their own compartment (an atrial vertex never
 *   reads a ventricular voxel across the AV junction, and vice versa); annulus vertices → their own Ring voxel, so
 *   they keep the static ring colour.
 *   overlays: trimmed cardiac vessels (great vessels, coronary arteries, cardiac veins), not electrically active.
 */
import type { OverlayMesh, VoxelGrid } from '../../types';
import { TISSUE, VALVES } from '../../types';
import type { Labelled } from './label';
import { PART } from './label';
import type { Mesh } from './mesh';
import { filterTriangles, mergeMeshes, transformMesh, vertexNormals } from './mesh';
import type { Frame } from './label';
import type { HraSource } from './source';

/** Vertex class: which voxels a vertex may map to. */
export const VCLASS = { Ventricular: 0, Atrial: 1, RingMitral: 2, RingTricuspid: 3, RingAortic: 4, RingPulmonary: 5 } as const;

export interface HeartMeshParts {
  readonly mesh: Mesh;
  /** VCLASS per vertex. */
  readonly vclass: Uint8Array;
}

/** Signed volume of a closed mesh (positive = outward winding). */
function signedVolume(m: Mesh): number {
  let s = 0;
  const P = m.position, I = m.index;
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    s += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]);
  }
  return s / 6;
}

function outward(m: Mesh): Mesh {
  if (signedVolume(m) >= 0) return m;
  const idx = Uint32Array.from(m.index);
  for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  return { position: m.position, index: idx };
}

export function heartMeshParts(src: HraSource, L: Labelled, frame: Frame): HeartMeshParts {
  const tf = (m: Mesh) => outward(transformMesh(m, frame.R, frame.o));
  const parts: { m: Mesh; c: number }[] = [
    { m: tf(src.wallsRender.LV), c: VCLASS.Ventricular },
    { m: tf(src.wallsRender.RV), c: VCLASS.Ventricular },
    { m: tf(src.wallsRender.SEPTUM), c: VCLASS.Ventricular },
    { m: tf(src.wallsRender.LA), c: VCLASS.Atrial },
    { m: tf(src.wallsRender.RA), c: VCLASS.Atrial },
    ...src.papillary.map((p) => ({ m: tf(p.render), c: VCLASS.Ventricular })),
  ];
  const ringClass = { MITRAL: VCLASS.RingMitral, TRICUSPID: VCLASS.RingTricuspid, AORTIC: VCLASS.RingAortic, PULMONARY: VCLASS.RingPulmonary } as const;
  for (const v of VALVES) parts.push({ m: L.rings[v].band, c: ringClass[v] });
  const mesh = mergeMeshes(parts.map((p) => p.m));
  const vclass = new Uint8Array(mesh.position.length / 3);
  let o = 0;
  for (const p of parts) {
    vclass.fill(p.c, o, o + p.m.position.length / 3);
    o += p.m.position.length / 3;
  }
  return { mesh, vclass };
}

const RING_PART_OF_CLASS: Record<number, number> = {
  [VCLASS.RingMitral]: PART.RingMitral, [VCLASS.RingTricuspid]: PART.RingTricuspid,
  [VCLASS.RingAortic]: PART.RingAortic, [VCLASS.RingPulmonary]: PART.RingPulmonary,
};

/**
 * Voxel per vertex. Search grows the cube radius until a matching voxel is found (≤ 8 voxels); ring vertices accept
 * their own annulus Ring voxels first, then any Ring voxel, then myocardium.
 */
export function mapVertexVoxels(grid: VoxelGrid, part: Uint8Array, position: ArrayLike<number>, vclass: Uint8Array): Uint32Array {
  const [nx, ny, nz] = grid.dims;
  const n = position.length / 3;
  const out = new Uint32Array(n);
  const T = grid.tissue;
  const isVent = (t: number) => t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum;
  const isAtr = (t: number) => t === TISSUE.LA || t === TISSUE.RA;
  const isMyo = (t: number) => isVent(t) || isAtr(t);
  for (let p = 0; p < n; p++) {
    const fx = (position[3 * p] - grid.originMm[0]) / grid.hMm;
    const fy = (position[3 * p + 1] - grid.originMm[1]) / grid.hMm;
    const fz = (position[3 * p + 2] - grid.originMm[2]) / grid.hMm;
    const c = vclass[p];
    const preds: ((v: number) => boolean)[] =
      c === VCLASS.Ventricular ? [(v) => isVent(T[v]), (v) => isMyo(T[v])]
      : c === VCLASS.Atrial ? [(v) => isAtr(T[v]), (v) => isMyo(T[v])]
      : [(v) => T[v] === TISSUE.Ring && part[v] === RING_PART_OF_CLASS[c], (v) => T[v] === TISSUE.Ring, (v) => isMyo(T[v])];
    let found = -1;
    for (const pred of preds) {
      for (let r = 1; r <= 8 && found < 0; r++) {
        let bestD = Infinity;
        const i0 = Math.floor(fx) - r + 1, j0 = Math.floor(fy) - r + 1, k0 = Math.floor(fz) - r + 1;
        for (let k = Math.max(0, k0); k <= Math.min(nz - 1, k0 + 2 * r - 1); k++)
          for (let j = Math.max(0, j0); j <= Math.min(ny - 1, j0 + 2 * r - 1); j++)
            for (let i = Math.max(0, i0); i <= Math.min(nx - 1, i0 + 2 * r - 1); i++) {
              const v = i + nx * (j + ny * k);
              if (!pred(v)) continue;
              const d = (i - fx) ** 2 + (j - fy) ** 2 + (k - fz) ** 2;
              if (d < bestD) {
                bestD = d;
                found = v;
              }
            }
      }
      if (found >= 0) break;
    }
    out[p] = found < 0 ? 0 : found;
  }
  return out;
}

/** Overlay meshes (local frame), trimmed in the body frame by each vessel's keep() rule. */
export function overlayMeshes(src: HraSource, frame: Frame): OverlayMesh[] {
  const out: OverlayMesh[] = [];
  for (const v of src.vessels) {
    const keep = v.spec.keep;
    const P = v.render.position;
    const trimmed = keep
      ? filterTriangles(v.render, (a, b, c) => keep((P[3 * a] + P[3 * b] + P[3 * c]) / 3, (P[3 * a + 1] + P[3 * b + 1] + P[3 * c + 1]) / 3, (P[3 * a + 2] + P[3 * b + 2] + P[3 * c + 2]) / 3))
      : v.render;
    if (!trimmed.index.length) continue;
    const m = transformMesh(trimmed, frame.R, frame.o);
    out.push({
      id: v.spec.id,
      kind: v.spec.kind,
      position: Float32Array.from(m.position),
      normal: vertexNormals(m.position, m.index),
      index: Uint32Array.from(m.index),
    });
  }
  return out;
}

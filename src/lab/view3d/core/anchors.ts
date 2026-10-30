/**
 * Label anchor per structure (local mm): geometry.landmarks first, then conduction-path midpoints, valve centres, and
 * finally the centroid of the structure's voxels — so every StructureId the app may highlight can be labelled.
 */
import type { GeometryBundle, StructureId, Vec3 } from '../../sim/types';
import { COMP, compOfTissue, STRUCTURE_NONE, STRUCTURES } from '../../sim/types';

export function structureAnchors(geo: GeometryBundle): Partial<Record<StructureId, Vec3>> {
  const out: Partial<Record<StructureId, Vec3>> = {};
  const g = geo.grid;
  const [nx, ny] = g.dims;
  const sum = new Float64Array(STRUCTURES.length * 4);
  for (let v = 0; v < g.region.length; v++) {
    const r = g.region[v];
    if (r === STRUCTURE_NONE || r >= STRUCTURES.length) continue;
    const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
    sum[4 * r] += g.originMm[0] + i * g.hMm;
    sum[4 * r + 1] += g.originMm[1] + j * g.hMm;
    sum[4 * r + 2] += g.originMm[2] + k * g.hMm;
    sum[4 * r + 3]++;
  }
  STRUCTURES.forEach((id, r) => {
    const n = sum[4 * r + 3];
    if (n > 0) out[id] = [sum[4 * r] / n, sum[4 * r + 1] / n, sum[4 * r + 2] / n];
  });
  for (const v of geo.valves) out[v.id] = v.centerMm;
  for (const p of geo.paths) if (p.pointsMm.length) out[p.id] = p.pointsMm[Math.floor((p.pointsMm.length - 1) / 2)];
  for (const [id, p] of Object.entries(geo.landmarks) as [StructureId, Vec3][]) out[id] = p;
  return out;
}

/** Centroid of ventricular myocardium (local mm) — origin of the heart vector and the lead axes. */
export function ventricularCentroid(geo: GeometryBundle): Vec3 {
  const g = geo.grid;
  const [nx, ny] = g.dims;
  let x = 0, y = 0, z = 0, n = 0;
  for (let v = 0; v < g.tissue.length; v++) {
    if (compOfTissue(g.tissue[v]) !== COMP.Ventricular) continue;
    x += v % nx;
    y += Math.floor(v / nx) % ny;
    z += Math.floor(v / (nx * ny));
    n++;
  }
  if (!n) return [0, 0, 0];
  return [g.originMm[0] + (x / n) * g.hMm, g.originMm[1] + (y / n) * g.hMm, g.originMm[2] + (z / n) * g.hMm];
}

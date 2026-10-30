/**
 * Lookups on the baked region geometry (regionGeom.gen.ts) keyed by core RegionId (src/core/regions.ts).
 * Ventricular ids have the full row; atrial and conduction-system ids have centroids only.
 */
import { REGION_LIST, type RegionId } from '../../core/regions';
import type { RegionWeights, Vec3 } from '../api';
import { add, scale, unit } from '../frame';
import { ATRIAL_CENTROIDS, CONDUCTION_CENTROIDS, VENT_GEOM, VENT_IDS, type VentGeomRow } from './regionGeom.gen';

export type VentRegionId = (typeof VENT_IDS)[number];
export { VENT_IDS };

/** REGION_LIST order (the order of RegionStates.ids and RegionTiming arrays). */
export const REGION_IDS: readonly RegionId[] = REGION_LIST.map((r) => r.id);
export const REGION_INDEX: Readonly<Record<RegionId, number>> = Object.fromEntries(REGION_IDS.map((id, i) => [id, i])) as Record<RegionId, number>;
export const VENT_INDEX: Readonly<Record<string, number>> = Object.fromEntries(VENT_IDS.map((id, i) => [id, i]));

export function isVentricular(id: RegionId): id is VentRegionId {
  return id in VENT_INDEX;
}

export function ventGeom(id: VentRegionId): VentGeomRow {
  return VENT_GEOM[VENT_INDEX[id]];
}

/** Centroid of any region (cm, Frank). */
export function centroidOf(id: RegionId): Vec3 {
  if (isVentricular(id)) return ventGeom(id).c;
  if (id === 'ra' || id === 'la') return ATRIAL_CENTROIDS[id];
  return CONDUCTION_CENTROIDS[id as keyof typeof CONDUCTION_CENTROIDS];
}

/** Weighted centroid of a set of regions (null when the set is empty or all weights are 0). */
export function weightedCentroid(w: RegionWeights): Vec3 | null {
  let s = 0;
  let c: Vec3 = [0, 0, 0];
  for (const [id, x] of w) {
    if (x <= 0) continue;
    c = add(c, scale(centroidOf(id), x));
    s += x;
  }
  return s > 0 ? scale(c, 1 / s) : null;
}

/** Mass-weighted outward normal Σ m_r n_r of ventricular regions (unnormalised). */
export function massNormal(ids: readonly RegionId[]): Vec3 {
  let v: Vec3 = [0, 0, 0];
  for (const id of ids) if (isVentricular(id)) {
    const g = ventGeom(id);
    v = add(v, scale(g.n, g.mass));
  }
  return v;
}

/** Mass-weighted centroid of ventricular regions. */
export function massCentroid(ids: readonly RegionId[]): Vec3 | null {
  let s = 0;
  let c: Vec3 = [0, 0, 0];
  for (const id of ids) if (isVentricular(id)) {
    const g = ventGeom(id);
    c = add(c, scale(g.c, g.mass));
    s += g.mass;
  }
  return s > 0 ? scale(c, 1 / s) : null;
}

export function totalMass(ids: readonly RegionId[]): number {
  let s = 0;
  for (const id of ids) if (isVentricular(id)) s += ventGeom(id).mass;
  return s;
}

/** Unit vector from the ventricular centroid toward a region. */
export function directionTo(id: RegionId): Vec3 {
  return unit(centroidOf(id));
}

export const LV_IDS: readonly VentRegionId[] = VENT_IDS.filter((id) => id.startsWith('lv-'));
export const RV_IDS: readonly VentRegionId[] = VENT_IDS.filter((id) => id.startsWith('rv-'));

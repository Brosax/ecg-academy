/**
 * Regional action-potential-duration map (DECISION §2.1.3, from prototype A's NORMAL_VREP) and APD changes.
 *
 * APD per region and layer at the reference cycle RR = 1000 ms (the QTc reference):
 *   apd = (apd0 + gAB·(min(z, 1.1) − 0.5) + [endo] dTM[kind] + [RV] dRV + dGroup) · (1000/833)^restExp
 * i.e. base outlasts apex, endocardium outlasts epicardium (LV ≈ 34 ms), the RV and the lateral LV repolarise earliest.
 * Uses: centre of each secondary-T lobe (t_k + APD), timing of the primary change lobes, ΔG from regional changes,
 * and the 3D recovery time of each region. Rate adaptation of the whole JT happens per beat (rhythm/rate.ts).
 */
import type { RegionId } from '../../core/regions';
import type { ApdChange } from '../api';
import { REGION_IDS, REGION_INDEX, VENT_IDS, isVentricular, ventGeom } from './anatomy';
import { resolveWhere } from './territories';

export const NORMAL_APD = {
  apd0: 276,
  gAB: 20,
  dTM: { LV: 34, RV: 5.5, SEPT: 3.3 },
  dRV: -24,
  dGroup: { ANT: 5, LAT: -24, INF: -9 },
  restExp: 0.36,
  /** atrial APD (A's NORMAL_ATRIA) and a nominal His–Purkinje APD (3D state only) */
  atrial: 210,
  conduction: 320,
} as const;

const REST_1000 = (1000 / 833) ** NORMAL_APD.restExp;

function group(id: string): 'ANT' | 'LAT' | 'INF' | null {
  if (id.endsWith('lateral')) return 'LAT';
  if (id.endsWith('-anterior')) return 'ANT';
  if (id.endsWith('-inferior')) return 'INF';
  return null;
}

export interface ApdMap {
  /** per REGION_LIST index, ms at RR = 1000 */
  readonly endo: Float32Array;
  readonly epi: Float32Array;
}

function baseMap(): ApdMap {
  const endo = new Float32Array(REGION_IDS.length);
  const epi = new Float32Array(REGION_IDS.length);
  REGION_IDS.forEach((id, i) => {
    if (isVentricular(id)) {
      const g = ventGeom(id);
      const grp = group(id);
      const base = NORMAL_APD.apd0 + NORMAL_APD.gAB * (Math.min(g.z, 1.1) - 0.5) + (g.kind === 'RV' ? NORMAL_APD.dRV : 0) + (grp ? NORMAL_APD.dGroup[grp] : 0);
      epi[i] = base * REST_1000;
      endo[i] = (base + NORMAL_APD.dTM[g.kind]) * REST_1000;
    } else if (id === 'ra' || id === 'la' || id === 'sa-node') {
      endo[i] = epi[i] = NORMAL_APD.atrial * REST_1000;
    } else {
      endo[i] = epi[i] = NORMAL_APD.conduction * REST_1000;
    }
  });
  return { endo, epi };
}

export const NORMAL_APD_MAP: ApdMap = baseMap();

/** Per-region APD deltas (ms) of a list of ApdChanges, by layer. */
export interface ApdDelta {
  readonly endo: Float32Array;
  readonly epi: Float32Array;
  /** the regions that changed (for timing the change lobes and the 3D view) */
  readonly regions: readonly RegionId[];
}

export function apdDelta(changes: readonly ApdChange[] | undefined): ApdDelta {
  const endo = new Float32Array(REGION_IDS.length);
  const epi = new Float32Array(REGION_IDS.length);
  const set = new Set<RegionId>();
  for (const c of changes ?? []) {
    for (const id of resolveWhere(c.where)) {
      if (!isVentricular(id)) continue;
      const i = REGION_INDEX[id];
      if (c.layer !== 'endo') epi[i] += c.deltaMs;
      if (c.layer !== 'epi') endo[i] += c.deltaMs;
      set.add(id);
    }
  }
  return { endo, epi, regions: [...set] };
}

export function applyDelta(m: ApdMap, d: ApdDelta): ApdMap {
  const endo = new Float32Array(m.endo.length), epi = new Float32Array(m.epi.length);
  for (let i = 0; i < endo.length; i++) {
    endo[i] = m.endo[i] + d.endo[i];
    epi[i] = m.epi[i] + d.epi[i];
  }
  return { endo, epi };
}

/** Mean APD (endo/epi average) of a weighted set of ventricular regions. */
export function meanApd(m: ApdMap, regions: readonly (readonly [RegionId, number])[]): number {
  let s = 0, w = 0;
  for (const [id, x] of regions) {
    if (!isVentricular(id) || x <= 0) continue;
    const i = REGION_INDEX[id];
    s += x * 0.5 * (m.endo[i] + m.epi[i]);
    w += x;
  }
  if (w > 0) return s / w;
  // untagged lobe: the ventricular mean
  let t = 0;
  for (const id of VENT_IDS) {
    const i = REGION_INDEX[id];
    t += 0.5 * (m.endo[i] + m.epi[i]);
  }
  return t / VENT_IDS.length;
}

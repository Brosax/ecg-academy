/**
 * Injury currents and necrosis from territories (DECISION §6.5).
 *
 * Injury vector for a territory W: transmural → Σ_{r∈W} m_r n_r (toward the wall); epicardial (pericarditis) → the
 * same direction with one near-field plateau per region (diffuse elevation); subendocardial → the opposite (toward the
 * cavity; for the whole LV this points to the base → ST elevation in aVR with diffuse depression). The plateau runs
 * from the last 30 % of the QRS to the T end (JT-anchored), located at the territory centroid (far = 1). Its amplitude
 * is solved from `stMv` in the reference lead (ventricular.ts: affine, two evaluations).
 *
 * Necrosis (Q waves, `substrate.scar`) arrives with synth-morph: each scar region r with transmurality τ adds a lobe
 * −τ·k_N·m_r·n_r over r's activation window in the beat's pattern.
 */
import type { RegionId } from '../../core/regions';
import type { InjurySpec, Vec3 } from '../api';
import { add, len, scale, unit } from '../frame';
import { massCentroid, massNormal, ventGeom, isVentricular } from '../heart/anatomy';
import { resolveWhere } from '../heart/territories';
import type { Plateau } from '../kernel/kernel';

/** Unit-amplitude injury plateaus (relative to J at RR 1000) for one InjurySpec. */
export function injuryPlateaus(spec: InjurySpec, qrsDur: number, tEnd: number, tPeak: number): Plateau[] {
  const ids = resolveWhere(spec.where).filter(isVentricular);
  if (!ids.length) return [];
  const sign = spec.layer === 'subendocardial' ? -1 : 1;
  const on = -0.3 * qrsDur, riseEnd = 12, fallStart = Math.max(riseEnd + 20, tPeak), end = Math.max(fallStart + 30, tEnd);
  const regions = ids.map((id) => [id, 1] as const);
  if (spec.layer === 'epicardial') {
    // diffuse: one near-field plateau per region, each toward its own wall, amplitude ∝ mass
    const total = ids.reduce((s, id) => s + ventGeom(id).mass, 0);
    return ids.map((id) => {
      const g = ventGeom(id);
      return {
        label: `injury (epicardial) ${id}`, on, riseEnd, fallStart, end, dir: g.n, amp: g.mass / total,
        regions: [[id, 1]] as readonly (readonly [RegionId, number])[], loc: g.cEpi, far: 1, wave: 'ST',
      };
    });
  }
  const n = massNormal(ids);
  const loc = massCentroid(ids);
  const far = posteriorFar(n);
  // an eccentric (posterior) source points from the cavity to its wall: the centroid direction replaces the coarse
  // mesh normal in proportion to the eccentric share (both agree within 45° on the posterior base)
  const w = len(n) > 0 && loc && far < 1 ? add(scale(unit(n), far), scale(unit(loc), 1 - far)) : n;
  const dir: Vec3 = len(w) > 0 ? scale(unit(w), sign) : [0, 0, sign];
  return [{ label: `injury (${spec.layer})`, on, riseEnd, fallStart, end, dir, amp: 1, regions, loc, far, wave: 'ST' }];
}

/**
 * Far-field share of a transmural / subendocardial injury source by the posterior turn of its wall normal. The
 * central-dipole lead table (calibrated on sources facing the precordium) projects a posterobasal source onto the
 * lateral leads as strongly as onto V1–V3; a wall that faces the back (normal ẑ ≥ 0.72: basal inferolateral) is seen
 * by the standard leads only as an eccentric dipole at the wall (far 0): V1–V3 see its mirror, V7–V9 face it, I / aVL /
 * V5–V6 stay near the baseline (isolated posterior MI). The share ramps back to 1 at ẑ ≤ 0.55, so every territory
 * facing the precordium, the inferior wall or the lateral wall (ẑ ≤ 0.53) keeps the calibrated far = 1.
 */
export function posteriorFar(n: Vec3): number {
  const l = len(n);
  if (l <= 0) return 1;
  const z = n[2] / l;
  return Math.min(1, Math.max(0, (0.72 - z) / 0.17));
}

/**
 * Near-field extras (DECISION §6.3, §11): small localised sources that smooth far-field lobes cannot produce.
 *
 *  - brugada: loss of the epicardial action-potential dome in the anterior RVOT → an outward (anterior) local dipole from
 *    the end of the QRS (coved J/ST elevation, slow convex decay), then delayed epicardial repolarisation (the dipole
 *    reverses → negative T). Pure near field (far = 0): large at V1–V2, small at V3, negligible elsewhere, so there is no
 *    reciprocal ST depression. `saddleback` = smaller, later dome and a weak reversal (positive T).
 *  - j-wave: a notch / slur at the end of the QRS from a transient-outward-current gradient in the epicardium of the
 *    tagged regions (early repolarisation pattern, Osborn wave of hypothermia).
 *  - epsilon: a small late deflection after the QRS from delayed activation of the RV free wall (ARVC).
 *  - fragment: a small notch pair in the terminal QRS (fQRS) from a border zone; scar border zones also come from
 *    `substrate.scar[].fragmented` (ventricular.ts).
 * Times are relative to the J point (QRS offset) at RR 1000.
 */
import type { NearFieldSpec, Vec3 } from '../api';
import { len, scale, unit } from '../frame';
import { isVentricular, massNormal, ventGeom } from '../heart/anatomy';
import { resolveWhere } from '../heart/territories';
import type { Lobe } from '../kernel/kernel';

/**
 * Brugada source: the anterior RVOT epicardium where it lies under the 3rd–4th intercostal space, about 2 cm behind the
 * chest wall between V1 and V2 (prototype B's RVOT_EPI). A documented condition-level knob (source depth, DECISION §11):
 * the procedural heart's RVOT centroid sits deeper than the real outflow tract.
 */
export const BRUGADA_SOURCE: Vec3 = [-2.0, -2.5, -5.0];

/**
 * Saddleback (type 2) shape: dome end (ms after J), dome amplitude and reversal as shares of `amp`. A negative reversal
 * share turns the late lobe anterior: the RVOT epicardium keeps its dome and repolarises ahead of the endocardium,
 * so an upright T rises out of the ST trough in V1 as well as V2 (without it V1, whose normal T is flat, decayed into
 * a coved-looking ST). Calibrated (2026-10-29) on the consensus type-2 definition (Bayés de Luna A et al.,
 * J Electrocardiol 2012;45:433): J take-off ≥ 0.2 mV, ST trough ≥ 0.05 mV above the baseline, then an upright T, in
 * V1 and V2.
 */
export const SADDLEBACK = { domeEndMs: 140, domeShare: 0.8, reversalShare: -0.6 } as const;

/**
 * J-wave width: an early-repolarisation notch (spatial amp ≤ 0.3 mV) spans the last 30 ms of the QRS; a larger
 * (Osborn) wave widens by `msPerMv` ms per mV above that into a dome after the R (hypothermia ≈ 30 °C, amp 0.6:
 * ≈ 70 ms). Calibrated (2026-10-29) on the hypothermia scenario: a rounded hump ≥ 0.1 mV after the R in II, aVF,
 * V3–V6, its end read by the oracle within the QRS tolerance of the truth.
 */
export const J_DOME = { amp: 0.3, msPerMv: 120 } as const;

export function nearFieldLobes(specs: readonly NearFieldSpec[] | undefined): { lobes: Lobe[]; jEnd: number | null; domeMs: number } {
  const out: Lobe[] = [];
  let jEnd: number | null = null;
  let domeMs = 0;
  for (const s of specs ?? []) {
    const ids = resolveWhere(s.where).filter(isVentricular);
    const regions = ids.map((id) => [id, 1] as const);
    const lag = s.lagMs ?? 0;
    const epi = (): Vec3 | null => {
      if (!ids.length) return null;
      const c = ids.reduce<Vec3>((a, id) => [a[0] + ventGeom(id).cEpi[0], a[1] + ventGeom(id).cEpi[1], a[2] + ventGeom(id).cEpi[2]], [0, 0, 0]);
      return scale(c, 1 / ids.length);
    };
    const outward = (): Vec3 => {
      const n = massNormal(ids);
      return len(n) > 0 ? unit(n) : [0, 0, -1];
    };
    switch (s.kind) {
      case 'brugada': {
        const far = s.far ?? 0;
        const coved = (s.shape ?? 'coved') === 'coved';
        // coved: the dome loss outlasts the plateau and decays convexly into the delayed (reversed) repolarisation;
        // saddleback: a shorter dome — high take-off, an ST trough that stays above the baseline, then the normal
        // upright T rising out of it (only a weak reversal)
        out.push({
          label: 'RVOT epicardial dome loss', on: -26 + lag, peak: (coved ? 0 : 2) + lag, end: (coved ? 175 : SADDLEBACK.domeEndMs) + lag, endRule: 'edge', q: coved ? 1.5 : 2,
          dir: [-0.25, 0, -1], dir2: null, amp: s.amp * (coved ? 1 : SADDLEBACK.domeShare), regions, loc: BRUGADA_SOURCE, far, wave: 'ST',
        });
        out.push({
          label: 'RVOT delayed epicardial repolarisation', on: (coved ? 60 : 80) + lag, peak: 210 + lag, end: 330 + lag, endRule: 'edge', q: 2,
          dir: [0, 0, 1], dir2: null, amp: s.amp * (coved ? 1.14 : SADDLEBACK.reversalShare), regions, loc: BRUGADA_SOURCE, far, wave: 'T',
        });
        break;
      }
      case 'j-wave': {
        // the notch / slur rides on the terminal R downslope (early repolarisation consensus, Macfarlane 2015: Jp at
        // the end of the QRS) and ends just after it; `lagMs` moves it later. The Osborn wave of hypothermia is the same
        // source, larger (a broader lobe merges into the R downslope and the hump is lost)
        // the Ito gradient that produces it grows with cooling, and so does the wave: above J_DOME.amp the hump widens
        // into the broad dome of the Osborn wave (amplitude and width both proportional to the cold)
        const extra = Math.max(0, s.amp - J_DOME.amp) * J_DOME.msPerMv;
        const on = -30 + lag, peak = -10 + lag + 0.5 * extra, end = 4 + lag + extra;
        out.push({ label: 'J wave', on, peak, end, endRule: 'edge', q: 2, dir: outward(), dir2: null, amp: s.amp, regions, loc: epi(), far: s.far ?? 1, wave: 'J' });
        jEnd = Math.max(jEnd ?? -Infinity, end);
        domeMs = Math.max(domeMs, extra);
        break;
      }
      case 'epsilon': {
        out.push({ label: 'epsilon wave', on: 2 + lag, peak: 14 + lag, end: 28 + lag, endRule: 'edge', q: 1.6, dir: outward(), dir2: null, amp: s.amp, regions, loc: epi(), far: s.far ?? 1, wave: 'J' });
        break;
      }
      case 'fragment': {
        // fQRS: an extra notch in the terminal QRS from slow, zig-zag conduction in a border zone — two small,
        // opposite, near-field deflections of the tagged epicardium (Das MK et al., Circulation 2006;113:2495–2501)
        const c = -36 + lag;
        const d = outward();
        out.push({ label: 'fragment (+)', on: c - 8, peak: c - 2, end: c + 4, endRule: 'edge', q: 2, dir: d, dir2: null, amp: s.amp, regions, loc: epi(), far: s.far ?? 1, wave: 'QRS' });
        out.push({ label: 'fragment (−)', on: c + 2, peak: c + 8, end: c + 14, endRule: 'edge', q: 2, dir: scale(d, -1), dir2: null, amp: s.amp, regions, loc: epi(), far: s.far ?? 1, wave: 'QRS' });
        break;
      }
    }
  }
  return { lobes: out, jEnd, domeMs };
}

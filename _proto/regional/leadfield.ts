/**
 * Lead system: one lead field per electrode, ℓ_e(r) (mV of electrode potential per unit dipole at r), then the 12 leads
 * are formed from the 9 electrode potentials only (Einthoven / Goldberger / Wilson).
 *
 *   ℓ_e(r) = D_e + κ · [ G(x_e − r) − G(x_e − r0) ],   G(d) = d / |d|³   (infinite homogeneous medium)
 *
 * D_e: the electrode's lead vector at the heart centre r0, taken from Dower's image-surface matrix (US 5,711,304; Frank's
 *      torso) in the WCT gauge: D_RA = −(D_I + D_II)/3, D_LA = D_RA + D_I, D_LL = D_RA + D_II, D_Vi = Dower Vi.
 *      This is the bounded-torso correction: it carries the boundary amplification and the real lead directions
 *      (lead I ≈ −20°, II ≈ +78° in the frontal plane), and keeps limb-lead : chest-lead amplitude ratios realistic.
 * κ·[…]: the infinite-medium spatial variation of the lead field around r0 (proximity effect). It vanishes at r0, so the
 *      model reduces exactly to Dower for a centred dipole, and it lets regions close to an electrode (RV/RVOT under
 *      V1–V2, apex under V4) weigh more in that lead. κ = β·|D_V2|·|x_V2 − r0|², β ≈ 0.3–1.
 *
 * Electrode positions (app frame, cm, origin = ventricular centroid) are landmark estimates (Dynamic Electrocardiogram
 * docs/research/lead-geometry-anatomy.md, "Unsourced"); limb electrodes sit where the limbs join the trunk.
 */
import type { V3 } from './vec.ts';
import { add, dot, norm, scale, sub } from './vec.ts';

export const ELECTRODES = ['RA', 'LA', 'LL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type ElectrodeId = (typeof ELECTRODES)[number];
export const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type LeadName = (typeof LEADS)[number];

/** Frank (X left, Y inferior, Z posterior) → app (x left, y superior, z anterior) for a lead vector. */
const fromFrank = (v: V3): V3 => [v[0], -v[1], -v[2]];

const DOWER_FRANK: Record<string, V3> = {
  I: [0.632, -0.235, 0.059],
  II: [0.235, 1.066, -0.132],
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
};

export const ELECTRODE_POS: Record<ElectrodeId, V3> = {
  RA: [-18.5, 16, 0],
  LA: [13.5, 16, 0],
  LL: [6, -30, 0],
  V1: [-4.5, 0.5, 7.0],
  V2: [-0.5, 0.5, 7.0],
  V3: [3.0, -1.0, 6.5],
  V4: [6.5, -2.5, 5.5],
  V5: [10.5, -2.5, 2.5],
  V6: [13.5, -2.5, -2.5],
};

export interface LeadField {
  beta: number;
  kappa: number;
  pos: Record<ElectrodeId, V3>;
  D: Record<ElectrodeId, V3>;
  /** Lead vector of electrode e for a dipole at r. */
  at(e: number, r: V3): V3;
}

export function dowerElectrodes(): Record<ElectrodeId, V3> {
  const I = fromFrank(DOWER_FRANK.I), II = fromFrank(DOWER_FRANK.II);
  const RA = scale(add(I, II), -1 / 3);
  const out = { RA, LA: add(RA, I), LL: add(RA, II) } as Record<ElectrodeId, V3>;
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) out[v] = fromFrank(DOWER_FRANK[v]);
  return out;
}

export function buildLeadField(beta: number, pos: Record<ElectrodeId, V3> = ELECTRODE_POS, swap?: Partial<Record<ElectrodeId, ElectrodeId>>): LeadField {
  const D = dowerElectrodes();
  const r0: V3 = [0, 0, 0];
  const d2 = sub(pos.V2, r0);
  const kappa = beta * norm(D.V2) * dot(d2, d2);
  // electrode cable → physical site (misplacement / reversal is a geometry change, not a waveform edit)
  const site = (e: ElectrodeId): ElectrodeId => (swap && swap[e]) || e;
  const G = (x: V3, r: V3): V3 => {
    const d = sub(x, r);
    const n = norm(d);
    return scale(d, 1 / (n * n * n));
  };
  const ids = ELECTRODES.map(site);
  const Dl = ids.map((s) => D[s]);
  const X = ids.map((s) => pos[s]);
  const G0 = X.map((x) => G(x, r0));
  return {
    beta, kappa, pos, D,
    at(e: number, r: V3): V3 {
      const g = G(X[e], r);
      return [Dl[e][0] + kappa * (g[0] - G0[e][0]), Dl[e][1] + kappa * (g[1] - G0[e][1]), Dl[e][2] + kappa * (g[2] - G0[e][2])];
    },
  };
}

/**
 * 12 leads from the 9 electrode potentials (rows of `phi`, each length n). Computed in float64, stored float32.
 */
export function formLeads(phi: Float64Array[], n: number): Record<LeadName, Float32Array> {
  const [RA, LA, LL, V1, V2, V3, V4, V5, V6] = phi;
  const out = {} as Record<LeadName, Float32Array>;
  for (const l of LEADS) out[l] = new Float32Array(n);
  const Vs = [V1, V2, V3, V4, V5, V6];
  const Vn = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
  for (let i = 0; i < n; i++) {
    const I = LA[i] - RA[i];
    const II = LL[i] - RA[i];
    out.I[i] = I;
    out.II[i] = II;
    out.III[i] = II - I;
    out.aVR[i] = -(I + II) / 2;
    out.aVL[i] = I - II / 2;
    out.aVF[i] = II - I / 2;
    const wct = (RA[i] + LA[i] + LL[i]) / 3;
    for (let k = 0; k < 6; k++) out[Vn[k]][i] = Vs[k][i] - wct;
  }
  return out;
}

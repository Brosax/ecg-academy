/**
 * Lead system: Frank heart vector H(t) → electrode potentials → 12 standard leads.
 *
 * Far field (dipolar): the forward Dower transform, rows from Dower's patent US5711304A (WCT-referenced,
 * Frank axes X left+, Y inferior+, Z posterior+). These rows are the pseudo-inverse of the Edenbrandt & Pahlm (1988)
 * inverse-Dower matrix (agreement within 0.004, see docs/research/lead-geometry-anatomy.md §3a/§3b of the old project),
 * and they already contain torso inhomogeneity and the average proximity of the chest electrodes.
 *
 * Electrode level (so Einthoven/Goldberger hold by construction): in the WCT gauge (Φ_RA + Φ_LA + Φ_LL = 0)
 *   L_RA = −(L_I + L_II)/3,  L_LA = L_RA + L_I,  L_LL = L_RA + L_II,  L_Vk = Dower V_k.
 *
 * Near field (non-dipolar, optional): a kernel with a source location r adds, at electrode e,
 *   Φ_e += κ · p(t) · [ (x_e − r)/|x_e − r|³ − x_e/|x_e|³ ]
 * i.e. the infinite-medium potential of the off-centre dipole minus that of the same dipole at the centre (whose effect
 * the Dower rows already carry). κ is calibrated so that a centred infinite-medium dipole gives the Dower V2 lead-vector
 * length at the V2 electrode. Electrode positions are landmark estimates (no public table exists), so this term is a
 * documented, tunable correction used only for localised sources (RVOT in Brugada; the atrial centroid of the sinus P/Ta).
 *
 * Every lead is then derived from the same nine electrode potentials:
 *   I = Φ_LA − Φ_RA, II = Φ_LL − Φ_RA, III = Φ_LL − Φ_LA, aVR = Φ_RA − (Φ_LA+Φ_LL)/2, …, Vk = Φ_Vk − WCT.
 */
import type { Vec3 } from './kernels.ts';

export const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type LeadName = (typeof LEADS)[number];
export const ELECTRODES = ['RA', 'LA', 'LL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type ElectrodeName = (typeof ELECTRODES)[number];

/** Forward Dower rows (patent US5711304A), lead = a·X + b·Y + c·Z (mV per mV of heart vector). */
export const DOWER = {
  I: [0.632, -0.235, 0.059],
  II: [0.235, 1.066, -0.132],
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
} as const satisfies Record<string, Vec3>;

/** Inverse Dower (Edenbrandt & Pahlm, J Electrocardiol 1988;21:361-7). Rows X,Y,Z; columns I, II, V1..V6. */
export const INVERSE_DOWER = [
  [0.156, -0.01, -0.172, -0.074, 0.122, 0.231, 0.239, 0.194],
  [-0.227, 0.887, 0.057, -0.019, -0.106, -0.022, 0.041, 0.048],
  [0.022, 0.102, -0.229, -0.31, -0.246, -0.063, 0.055, 0.108],
] as const;

/** Kors regression matrix (Kors et al., Eur Heart J 1990;11:1083-92). Rows X,Y,Z; columns I, II, V1..V6. */
export const KORS = [
  [0.38, -0.07, -0.13, 0.05, -0.01, 0.14, 0.06, 0.54],
  [-0.07, 0.93, 0.06, -0.02, -0.05, 0.06, -0.17, 0.13],
  [0.11, -0.23, -0.43, -0.06, -0.14, -0.2, -0.11, 0.31],
] as const;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

const L_RA = scl(add(DOWER.I, DOWER.II), -1 / 3);
export const ELECTRODE_LEAD_VECTORS: Record<ElectrodeName, Vec3> = {
  RA: L_RA,
  LA: add(L_RA, DOWER.I),
  LL: add(L_RA, DOWER.II),
  V1: DOWER.V1, V2: DOWER.V2, V3: DOWER.V3, V4: DOWER.V4, V5: DOWER.V5, V6: DOWER.V6,
};

/**
 * Electrode positions, cm, Frank axes, origin = ventricular centroid (landmark estimates: V1/V2 4th ICS at the sternal
 * margins, V4 5th ICS mid-clavicular, V5/V6 same level on the anterior/mid-axillary lines; limb electrodes at the
 * limb-trunk junctions, since the limbs are equipotential extensions).
 */
export const ELECTRODE_POS: Record<ElectrodeName, Vec3> = {
  V1: [-4.5, -0.5, -7.0],
  V2: [-0.5, -0.5, -7.0],
  V3: [3.0, 1.0, -6.5],
  V4: [6.5, 2.5, -5.5],
  V5: [10.5, 2.5, -2.5],
  V6: [13.5, 2.5, 2.5],
  RA: [-18.5, -16, 0],
  LA: [13.5, -16, 0],
  LL: [6, 30, 0],
};

/** Region centroids (cm, Frank, origin = ventricular centroid) — used for near-field sources and the 3D view. */
export const REGION_POS = {
  RA: [-4.5, -2.5, 0.5],
  LA: [0.5, -3.5, 4.0],
  RVOT: [-1.5, -3.0, -4.0],
  RV: [-3.5, 1.5, -3.5],
  IVS: [0, 0, -0.5],
  LV_ANT: [2.5, 0, -3],
  LV_LAT: [4.5, 0.5, 1],
  LV_INF: [1.5, 3.5, 1.5],
  LV_APEX: [4, 3.5, -2.5],
  LV_BASE: [1, -2, 3],
  /** atrial centroid = midpoint of RA and LA: the near-field location of the sinus atrial kernels (model.ts › AtrialMorph.loc) */
  ATRIA: [-2, -3, 2.25],
} as const satisfies Record<string, Vec3>;

const V2_LEN = Math.hypot(...DOWER.V2);
const V2_R2 = ELECTRODE_POS.V2[0] ** 2 + ELECTRODE_POS.V2[1] ** 2 + ELECTRODE_POS.V2[2] ** 2;
export const KAPPA = V2_LEN * V2_R2; // cm²: infinite-medium centred dipole ≈ Dower |L_V2| at the V2 electrode

/**
 * Electrode gain vectors for a localised source at `loc` (mV at the electrode per mV of local dipole moment).
 *   far = 1: the source's far field is already carried by H(t) through the Dower rows; this adds only the proximity
 *            correction  κ[(x_e − r)/|x_e − r|³ − x_e/|x_e|³]  (off-centre minus centred infinite-medium potential).
 *   far = 0: the source is not added to H at all; every electrode receives the full infinite-medium potential of a
 *            small eccentric dipole  κ(x_e − r)/|x_e − r|³  (decays as 1/d², so distant electrodes see almost nothing).
 *   0 < far < 1 interpolates (κ[(x_e − r)/|x_e − r|³ − far·x_e/|x_e|³], with `far` of the moment added to H).
 */
export function proximityGains(loc: Vec3, far = 1): Record<ElectrodeName, Vec3> {
  const out = {} as Record<ElectrodeName, Vec3>;
  for (const e of ELECTRODES) {
    const x = ELECTRODE_POS[e];
    const d: Vec3 = [x[0] - loc[0], x[1] - loc[1], x[2] - loc[2]];
    const r3 = Math.hypot(...d) ** 3;
    const c3 = Math.hypot(...x) ** 3 / far;
    out[e] = [KAPPA * (d[0] / r3 - x[0] / c3), KAPPA * (d[1] / r3 - x[1] / c3), KAPPA * (d[2] / r3 - x[2] / c3)];
  }
  return out;
}

export type ElectrodePotentials = Record<ElectrodeName, Float64Array>;
export type ElectrodeMap = Record<'RA' | 'LA' | 'LL', ElectrodeName>;
/** Standard hook-up. Electrode misplacement = permute this map (e.g. RA↔LA), nothing else changes. */
export const STANDARD_HOOKUP: ElectrodeMap = { RA: 'RA', LA: 'LA', LL: 'LL' };

/** 12 leads from electrode potentials (Einthoven/Goldberger/Wilson definitions). */
export function leadsFromElectrodes(phi: ElectrodePotentials, hook: ElectrodeMap = STANDARD_HOOKUP): Record<LeadName, Float32Array> {
  const n = phi.RA.length;
  const out = {} as Record<LeadName, Float32Array>;
  for (const l of LEADS) out[l] = new Float32Array(n);
  const RA = phi[hook.RA], LA = phi[hook.LA], LL = phi[hook.LL];
  for (let i = 0; i < n; i++) {
    const r = RA[i]!, l = LA[i]!, f = LL[i]!;
    const wct = (r + l + f) / 3;
    out.I[i] = l - r;
    out.II[i] = f - r;
    out.III[i] = f - l;
    out.aVR[i] = r - (l + f) / 2;
    out.aVL[i] = l - (r + f) / 2;
    out.aVF[i] = f - (r + l) / 2;
    out.V1[i] = phi.V1[i]! - wct;
    out.V2[i] = phi.V2[i]! - wct;
    out.V3[i] = phi.V3[i]! - wct;
    out.V4[i] = phi.V4[i]! - wct;
    out.V5[i] = phi.V5[i]! - wct;
    out.V6[i] = phi.V6[i]! - wct;
  }
  return out;
}

/** Frank XYZ from the 8 independent leads with a 3×8 matrix (inverse Dower or Kors) — used only for checking. */
export function leadsToVcg(m: readonly (readonly number[])[], leads: Record<LeadName, Float32Array>, i: number): Vec3 {
  const v = [leads.I[i]!, leads.II[i]!, leads.V1[i]!, leads.V2[i]!, leads.V3[i]!, leads.V4[i]!, leads.V5[i]!, leads.V6[i]!];
  const r = [0, 0, 0];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 8; b++) r[a]! += m[a]![b]! * v[b]!;
  return [r[0]!, r[1]!, r[2]!];
}

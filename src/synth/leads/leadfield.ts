/**
 * Lead field L(x) of the one lead system (DECISION §2.2, §6.2, §6.8).
 *
 * Standard sites: the forward Dower transform (src/synth/leads/dower.ts; WCT-referenced rows, Frank axes). Electrode
 * vectors in the WCT gauge (Φ_RA + Φ_LA + Φ_LL = 0): L_RA = −(L_I + L_II)/3, L_LA = L_RA + L_I, L_LL = L_RA + L_II,
 * L_Vk = Dower V_k. These nine stay literal constants (every delivered ECG of the catalogue is built on them).
 *
 * Any other chest/back site (V3R–V5R, V7–V9, misplaced, high or low electrodes, Mason–Likar torso sites): the baked
 * BEM table (leadTable.gen.ts, scripts/synth/bake-leadfield.ts) interpolated bilinearly in (azimuth, height), plus a
 * Gaussian radial-basis residual (σ = 4 cm) through the 12 published chest rows — the six standard chest rows and
 * Dower's six extra rows (V3R, V4R, V5R, V7, V8, V9) — so the table reproduces every published row exactly at its
 * site and varies smoothly in between. Mason–Likar limb sites are anchored on the exact Dower limb vectors: the
 * standard limb-junction vector plus the BEM change from the junction to the torso site.
 *
 * Near field (proximity) for a source with a location r and far-field share `far` (A's ℓ_e(r) = D_e + κ[G(x_e − r) −
 * G(x_e − r0)], B's eccentric source):
 *     g_e(r, far) = β κ [ (x_e − r)/|x_e − r|³ − far · x_e/|x_e|³ ]        (r0 = origin = ventricular centroid)
 * κ = |L_V2|·|x_V2|² so that a centred infinite-medium dipole reproduces the Dower V2 lead-vector length at V2; β is the
 * one global near-field scale (β = 0 is pure Dower). far = 1: the dipole lives in H(t) and g adds the proximity
 * correction; far = 0: a small eccentric dipole seen only through its own infinite-medium potential (Brugada RVOT).
 * The near field uses the same electrode positions as the lead vectors (src/synth/leads/torso.ts).
 */
import type { Vec3 } from '../api';
import { add, len, scale } from '../frame';
import { DOWER, DOWER_EXTRA } from './dower';
import { BEM_AT_SITES, LEAD_GRID, LEAD_TABLE_VENT } from './leadTable.gen';
import { ATRIAL_FIELD_LOC, chestSurface, EXTRA_CHEST_SITES, MASON_LIKAR, solveDense, STANDARD_CHEST_SITES, STANDARD_POS, surfacePos, type SurfacePoint } from './torso';

export { ATRIAL_FIELD_LOC, DOWER, DOWER_EXTRA };

const L_RA = scale(add(DOWER.I, DOWER.II), -1 / 3);

/** Electrode lead vectors (WCT gauge) at the nine standard sites. */
export const SITE_LEAD_VECTOR = {
  RA: L_RA,
  LA: add(L_RA, DOWER.I),
  LL: add(L_RA, DOWER.II),
  V1: DOWER.V1,
  V2: DOWER.V2,
  V3: DOWER.V3,
  V4: DOWER.V4,
  V5: DOWER.V5,
  V6: DOWER.V6,
} as const satisfies Readonly<Record<string, Vec3>>;

const V2 = STANDARD_POS.V2;
/** κ = |L_V2|·|x_V2|² (cm²): a centred infinite-medium dipole gives the Dower |L_V2| at the V2 electrode. */
export const KAPPA = len(DOWER.V2) * (V2[0] ** 2 + V2[1] ** 2 + V2[2] ** 2);

/** Global near-field scale β (calibrated with the normal base, DECISION §8.3 step 4). */
export const BETA = 1.0;

/** Near-field gain vector at a site for a source at `loc` with far-field share `far` (mV per mV of local moment). */
export function nearGain(site: Vec3, loc: Vec3, far: number, beta = BETA): Vec3 {
  const dx = site[0] - loc[0], dy = site[1] - loc[1], dz = site[2] - loc[2];
  const r = Math.hypot(dx, dy, dz);
  const r3 = Math.max(r, 0.5) ** 3;
  const c = Math.hypot(site[0], site[1], site[2]) ** 3;
  const k = beta * KAPPA;
  return [k * (dx / r3 - (far * site[0]) / c), k * (dy / r3 - (far * site[1]) / c), k * (dz / r3 - (far * site[2]) / c)];
}

// ── baked table: bilinear in (azimuth, height) ────────────────────────────────────────────────────────────────────
const G = LEAD_GRID;
/** True when a surface point lies inside the baked grid (right mid-axillary line → spine, 1st ICS → iliac crest). */
export function inLeadTable(p: SurfacePoint): boolean {
  const u = (p.thetaDeg - G.theta0) / G.thetaStep, v = (p.y - G.y0) / G.yStep;
  return u >= 0 && u <= G.nTheta - 1 && v >= 0 && v <= G.nY - 1;
}

function tableAt(p: SurfacePoint): Vec3 {
  if (!inLeadTable(p)) {
    throw new Error(`src/synth leads: electrode site (θ ${p.thetaDeg.toFixed(1)}°, Y ${p.y.toFixed(1)} cm) lies outside the baked lead table (θ ${G.theta0}…${G.theta0 + (G.nTheta - 1) * G.thetaStep}°, Y ${G.y0}…${G.y0 + (G.nY - 1) * G.yStep} cm)`);
  }
  const u = (p.thetaDeg - G.theta0) / G.thetaStep, v = (p.y - G.y0) / G.yStep;
  const i = Math.min(G.nTheta - 2, Math.floor(u)), j = Math.min(G.nY - 2, Math.floor(v));
  const fu = u - i, fv = v - j;
  const at = (jj: number, ii: number, c: number): number => LEAD_TABLE_VENT[3 * (jj * G.nTheta + ii) + c];
  const out: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    out[c] = (1 - fv) * ((1 - fu) * at(j, i, c) + fu * at(j, i + 1, c)) + fv * ((1 - fu) * at(j + 1, i, c) + fu * at(j + 1, i + 1, c));
  }
  return out;
}

// ── exact anchors: the 12 published chest rows ───────────────────────────────────────────────────────────────────
const SIGMA_LV = 4;
interface Anchor {
  readonly key: string;
  readonly sp: SurfacePoint;
  readonly pos: Vec3;
  readonly lv: Vec3;
}
const ANCHORS: readonly Anchor[] = [
  ...(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map((k) => ({ key: k, sp: chestSurface(STANDARD_CHEST_SITES[k]), pos: STANDARD_POS[k], lv: DOWER[k] })),
  ...(Object.keys(DOWER_EXTRA) as (keyof typeof DOWER_EXTRA)[]).map((k) => {
    const sp = chestSurface(EXTRA_CHEST_SITES[k]);
    return { key: k, sp, pos: surfacePos(sp), lv: DOWER_EXTRA[k] };
  }),
];
const gauss = (a: Vec3, b: Vec3): number => Math.exp(-((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / (2 * SIGMA_LV * SIGMA_LV));
const ANCHOR_W = solveDense(
  ANCHORS.map((a) => ANCHORS.map((b) => gauss(a.pos, b.pos))),
  ANCHORS.map((a) => {
    const t = tableAt(a.sp);
    return [a.lv[0] - t[0], a.lv[1] - t[1], a.lv[2] - t[2]];
  }),
);

/** WCT-gauge lead vector (ventricular centroid) of an electrode at a chest/back surface point. */
export function chestLeadVector(p: SurfacePoint): Vec3 {
  const t = tableAt(p);
  const x = surfacePos(p);
  const out: [number, number, number] = [t[0], t[1], t[2]];
  ANCHORS.forEach((a, j) => {
    const g = gauss(x, a.pos);
    for (let c = 0; c < 3; c++) out[c] += ANCHOR_W[j][c] * g;
  });
  return out;
}

/** Mason–Likar torso site of a limb electrode: position and WCT-gauge lead vector (the standard junction's Dower vector
 *  plus the BEM change from the junction to the torso site; the legs share the LL junction). */
export function masonLikarSite(limb: 'RA' | 'LA' | 'LL' | 'RL'): { readonly pos: Vec3; readonly lv: Vec3 } {
  const junction = limb === 'RL' ? 'LL' : limb;
  const sp = MASON_LIKAR[limb];
  const t = chestLeadVector(sp);
  const b = BEM_AT_SITES[junction];
  const d = SITE_LEAD_VECTOR[junction];
  return { pos: surfacePos(sp), lv: [d[0] + t[0] - b[0], d[1] + t[1] - b[1], d[2] + t[2] - b[2]] };
}

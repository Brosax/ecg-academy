/**
 * Torso surface model of the one lead system (DECISION §2.2, §6.8): where an electrode sits, in the Frank frame of the
 * engine (cm, +X patient left, +Y inferior, +Z posterior, origin = ventricular centroid).
 *
 * The chest is an elliptic cylinder about a vertical axis. Its parameters are not free: the nine standard electrode
 * positions of prototype B (landmark estimates, DECISION §13.2) lie on it within 0.6 cm, with the axis 2.5 cm right of
 * and 2.5 cm behind the ventricular centroid (half-width 16 cm, half-depth 9.5 cm: the heart centroid is 7 cm behind
 * the anterior chest wall and 12 cm in front of the back). A site is a surface point (azimuth θ, height Y):
 *
 *   θ = 0° anterior midline, +90° left mid-axillary line, 180° posterior midline, negative = patient right
 *   x = xc + a·sin θ,  z = zc − b·cos θ,  plus a smooth correction (Gaussian RBF, σ = 4 cm) that puts the six standard
 *   chest sites exactly on their engine positions, so near field and lead vectors share ONE set of positions.
 *
 * Electrode landmarks (AHA/ACCF/HRS 2007 Part I, Kligfield et al.; criteria.md `extra-chest-leads`):
 *  - intercostal spaces 2.4 cm apart; the rib line drops 0.6 cm from the sternal border to the mid-clavicular line;
 *  - V5, V6 and the posterior V7–V9 lie on the horizontal plane of V4 (the ICS height at the mid-clavicular line);
 *  - right-sided sites mirror the left ones (V3R, V4R, V5R);
 *  - Mason–Likar torso limb sites (Mason RE, Likar I. Am Heart J 1966): arm electrodes in the infraclavicular fossae
 *    (2 cm below the clavicles, 10 cm from the midline), leg electrodes on the anterior axillary lines midway between
 *    the costal margins and the iliac crests.
 */
import type { ChestSite, Vec3 } from '../api';
import { CHEST_LINES } from '../api';

export type ChestLine = (typeof CHEST_LINES)[number];

/** The chest cylinder (cm, Frank). `top` / `bottom`: the trunk ends (shoulder and leg junctions) used by the BEM bake. */
export const TORSO = { xc: -2.5, zc: 2.5, a: 16, b: 9.5, top: -18, bottom: 30 } as const;

/** The nine standard electrode positions (prototype B landmarks; the near field was calibrated with them). Limb
 *  electrodes sit at the limb–trunk junctions (the limbs are equipotential extensions of the trunk). */
export const STANDARD_POS = {
  V1: [-4.5, -0.5, -7.0],
  V2: [-0.5, -0.5, -7.0],
  V3: [3.0, 1.0, -6.5],
  V4: [6.5, 2.5, -5.5],
  V5: [10.5, 2.5, -2.5],
  V6: [13.5, 2.5, 2.5],
  RA: [-18.5, -16, 0],
  LA: [13.5, -16, 0],
  LL: [6, 30, 0],
} as const satisfies Readonly<Record<string, Vec3>>;

/** Electrical centroid of the atria: the location of every atrial kernel's near field (prototype B pass 2) and the
 *  second source point of the BEM bake. */
export const ATRIAL_FIELD_LOC: Vec3 = [-2, -3, 2.25];

/** A point of the chest surface: azimuth θ (degrees, 0 = anterior midline, + = patient left) and height Y (cm). */
export interface SurfacePoint {
  readonly thetaDeg: number;
  readonly y: number;
}

const DEG = Math.PI / 180;
const asinDeg = (x: number): number => Math.asin(x) / DEG;

/** Distance of each chest line from the midline (cm) on the anterior (or, for the last three, posterior) surface. */
const LINE_LATERAL_CM: Readonly<Record<ChestLine, number>> = {
  sternal: 2,
  parasternal: 5.5,
  midclavicular: 9,
  'anterior-axillary': 13,
  'mid-axillary': 16,
  'posterior-axillary': 13,
  scapular: 8.5,
  paravertebral: 3,
};
const POSTERIOR_LINES: readonly ChestLine[] = ['posterior-axillary', 'scapular', 'paravertebral'];

/** Azimuth of a chest line on the patient's left (degrees). */
export function lineThetaDeg(line: ChestLine): number {
  const s = Math.min(1, LINE_LATERAL_CM[line] / TORSO.a);
  return POSTERIOR_LINES.includes(line) ? 180 - asinDeg(s) : asinDeg(s);
}

/** Intercostal-space spacing (cm) and the rib-line drop between the sternal border and the mid-clavicular line (cm). */
export const ICS_STEP_CM = 2.4;
export const RIB_DROP_CM = 0.6;
const MCL_THETA = lineThetaDeg('midclavicular');

/** Height (Frank Y, cm) of an intercostal space at azimuth θ (V4 = 5th ICS at the mid-clavicular line = 2.5 cm). */
export function icsHeight(ics: number, thetaDeg: number): number {
  const yMcl = 2.5 + ICS_STEP_CM * (ics - 5);
  const t = Math.abs(thetaDeg);
  if (t >= MCL_THETA) return yMcl; // V5–V9 convention: the horizontal plane of the mid-clavicular site
  const d = TORSO.a * Math.sin(t * DEG);
  const f = Math.max(0, Math.min(1, (d - LINE_LATERAL_CM.sternal) / (LINE_LATERAL_CM.midclavicular - LINE_LATERAL_CM.sternal)));
  return yMcl - RIB_DROP_CM * (1 - f);
}

/** Surface point of a chest site (intercostal space, line, side). */
export function chestSurface(s: ChestSite): SurfacePoint {
  const th = lineThetaDeg(s.line);
  const thetaDeg = s.side === 'R' ? -th : th;
  return { thetaDeg, y: icsHeight(s.ics, thetaDeg) };
}

/** Point on the bare elliptic cylinder (no correction). */
export function cylinderPos(p: SurfacePoint): Vec3 {
  const t = p.thetaDeg * DEG;
  return [TORSO.xc + TORSO.a * Math.sin(t), p.y, TORSO.zc - TORSO.b * Math.cos(t)];
}

/** Azimuth of a Frank position projected radially (elliptic angle) onto the cylinder. */
export function thetaOf(pos: Vec3): number {
  return Math.atan2((pos[0] - TORSO.xc) / TORSO.a, -(pos[2] - TORSO.zc) / TORSO.b) / DEG;
}

/** The standard chest sites as (intercostal space, line, side). */
export const STANDARD_CHEST_SITES = {
  V1: { ics: 4, line: 'sternal', side: 'R' },
  V2: { ics: 4, line: 'sternal', side: 'L' },
  V3: { ics: 4.5, line: 'parasternal', side: 'L' },
  V4: { ics: 5, line: 'midclavicular', side: 'L' },
  V5: { ics: 5, line: 'anterior-axillary', side: 'L' },
  V6: { ics: 5, line: 'mid-axillary', side: 'L' },
} as const satisfies Readonly<Record<string, ChestSite>>;

/** Extra chest sites of the curriculum (criteria.md `extra-chest-leads`) plus V5R (a Dower patent row). */
export const EXTRA_CHEST_SITES = {
  V3R: { ics: 4.5, line: 'parasternal', side: 'R' },
  V4R: { ics: 5, line: 'midclavicular', side: 'R' },
  V5R: { ics: 5, line: 'anterior-axillary', side: 'R' },
  V7: { ics: 5, line: 'posterior-axillary', side: 'L' },
  V8: { ics: 5, line: 'scapular', side: 'L' },
  V9: { ics: 5, line: 'paravertebral', side: 'L' },
} as const satisfies Readonly<Record<string, ChestSite>>;

/** Mason–Likar torso limb sites (surface points). */
export const MASON_LIKAR = {
  RA: { thetaDeg: -asinDeg(10 / TORSO.a), y: -9 },
  LA: { thetaDeg: asinDeg(10 / TORSO.a), y: -9 },
  LL: { thetaDeg: lineThetaDeg('anterior-axillary'), y: 20 },
  RL: { thetaDeg: -lineThetaDeg('anterior-axillary'), y: 20 },
} as const satisfies Readonly<Record<string, SurfacePoint>>;

// ── position correction: the six standard chest sites land exactly on STANDARD_POS ─────────────────────────────────
const SIGMA_POS = 4;
const ANCHOR_KEYS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
const ANCHOR_CYL = ANCHOR_KEYS.map((k) => cylinderPos(chestSurface(STANDARD_CHEST_SITES[k])));
const gauss = (a: Vec3, b: Vec3, sigma: number): number => Math.exp(-((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / (2 * sigma * sigma));

/** Solve A·w = r (small dense systems; Gaussian elimination with partial pivoting) for several right-hand sides. */
export function solveDense(A: readonly (readonly number[])[], rhs: readonly (readonly number[])[]): number[][] {
  const n = A.length, m = rhs[0]?.length ?? 0;
  const M = A.map((row, i) => [...row, ...rhs[i]]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    [M[k], M[p]] = [M[p], M[k]];
    const d = M[k][k];
    if (Math.abs(d) < 1e-14) throw new Error('src/synth leads: singular interpolation system');
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / d;
      if (f === 0) continue;
      for (let j = k; j < n + m; j++) M[i][j] -= f * M[k][j];
    }
  }
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let c = 0; c < m; c++) {
      let s = M[i][n + c];
      for (let j = i + 1; j < n; j++) s -= M[i][j] * out[j][c];
      out[i][c] = s / M[i][i];
    }
  }
  return out;
}

const POS_W = solveDense(
  ANCHOR_CYL.map((a) => ANCHOR_CYL.map((b) => gauss(a, b, SIGMA_POS))),
  ANCHOR_KEYS.map((k, i) => [0, 1, 2].map((c) => STANDARD_POS[k][c] - ANCHOR_CYL[i][c])),
);

/** Frank position (cm) of a surface point: the cylinder point plus the smooth standard-site correction. */
export function surfacePos(p: SurfacePoint): Vec3 {
  const e = cylinderPos(p);
  const out: [number, number, number] = [e[0], e[1], e[2]];
  ANCHOR_CYL.forEach((a, j) => {
    const g = gauss(e, a, SIGMA_POS);
    for (let c = 0; c < 3; c++) out[c] += POS_W[j][c] * g;
  });
  return out;
}

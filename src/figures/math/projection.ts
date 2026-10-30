/**
 * Projection maths for the hexaxial (frontal) and horizontal-plane figures.
 *
 * Frontal plane: the six limb leads are ideal unit axes at their hexaxial angles (src/core/leads.ts LIMB_ANGLE_DEG:
 * I 0°, II +60°, III +120°, aVF +90°, aVL −30°, aVR −150°). The deflection of a lead is the projection
 * (dot product) of the heart vector on the lead axis: |v|·cos(θ − α).
 *
 * Horizontal plane: a transverse chest section drawn in the radiological (CT) convention — seen from the feet, patient's
 * left on screen right, anterior up — so with SVG y pointing down, +90° = posterior and −90° = anterior. This is the
 * same screen convention as the frontal plane (0° = left, angles grow clockwise) and is shared with the vector-loop
 * figure (Kors X → screen right, Z (posterior) → screen down). The precordial lead directions are the geometric
 * directions from the heart's electrical centre to idealised electrode sites on the section (V1/V2 4th ICS at the
 * sternal borders, V4 midclavicular, V3 between, V5 anterior axillary, V6 mid-axillary). There is no single
 * textbook table of these angles; ours fall within the usual drawings (V1 ≈ −117° … V6 ≈ +5°).
 */
import { LIMB_ANGLE_DEG, LIMB_LEADS, CHEST_LEADS } from '../../core/leads';
import { angleDiff, angleOf, gauss, unit } from './geom';

export type LimbLead = (typeof LIMB_LEADS)[number];
export type ChestLead = (typeof CHEST_LEADS)[number];
export type Vec2 = readonly [number, number];

// ── frontal plane ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Projection of a vector (angle θ, magnitude m) on every limb lead: m·cos(θ − α). */
export function projectFrontal(vectorDeg: number, magnitude = 1): Record<LimbLead, number> {
  const out = {} as Record<LimbLead, number>;
  for (const lead of LIMB_LEADS) out[lead] = magnitude * Math.cos((vectorDeg - LIMB_ANGLE_DEG[lead]) * (Math.PI / 180));
  return out;
}

/** The foot of the perpendicular from the vector tip to a lead axis (screen coordinates, centre at 0,0). */
export function projectionPoint(vectorDeg: number, magnitude: number, leadDeg: number): Vec2 {
  const p = magnitude * Math.cos((vectorDeg - leadDeg) * (Math.PI / 180));
  const [ux, uy] = unit(leadDeg);
  return [p * ux, p * uy];
}

export type AxisClass = 'normal' | 'lad' | 'rad' | 'extreme';

/**
 * Adult frontal QRS axis categories (AHA/ACCF/HRS 2009 standardisation statement, Part I — Kligfield P et al.,
 * Circulation 2007;115:1306-24, and Part III, Surawicz B et al., Circulation 2009;119:e235-40):
 * normal −30° … +90°, left axis deviation −30° … −90°, right axis deviation +90° … +180°, extreme (northwest)
 * −90° … −180°. Edges are assigned deliberately: −30° and +90° are normal, −90° is LAD, ±180° is RAD.
 */
export function classifyAxis(deg: number): AxisClass {
  const a = angleDiff(deg, 0);
  if (a >= -30 && a <= 90) return 'normal';
  if (a >= -90 && a < -30) return 'lad';
  if (a > 90 && a <= 180) return 'rad';
  return 'extreme';
}

/** Sector [from, to] (degrees, increasing clockwise) of each axis category, for shading the wheel. */
export const AXIS_SECTORS: Readonly<Record<AxisClass, readonly [number, number]>> = {
  normal: [-30, 90],
  rad: [90, 180],
  extreme: [-180, -90],
  lad: [-90, -30],
};

export type DeflectionKind = 'positive' | 'negative' | 'equiphasic';

/** A lead within this many degrees of perpendicular to the vector records an equiphasic ("isoelectric") QRS. */
export const ISO_TOL_DEG = 15;

/** Deflection of a lead for a vector: positive when the vector points to the lead's positive half, etc. */
export function deflectionKind(vectorDeg: number, leadDeg: number): DeflectionKind {
  const d = Math.abs(angleDiff(vectorDeg, leadDeg));
  if (Math.abs(d - 90) <= ISO_TOL_DEG) return 'equiphasic';
  return d < 90 ? 'positive' : 'negative';
}

// ── vector loops (mini QRS complexes) ─────────────────────────────────────────────────────────────────────────────

/**
 * One component of a schematic QRS vector loop: a vector whose magnitude follows a Gaussian in loop time s ∈ [0, 1]
 * and whose direction sweeps linearly by `sweep` degrees around `deg` while it is active.
 */
export interface LoopComponent {
  readonly deg: number;
  readonly amp: number;
  readonly center: number;
  readonly width: number;
  readonly sweep?: number;
}

export function loopPoints(components: readonly LoopComponent[], n = 64): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    let x = 0, y = 0;
    for (const c of components) {
      const a = c.amp * gauss(s, c.center, c.width);
      const phi = c.deg + (c.sweep ?? 0) * ((s - c.center) / (4 * c.width));
      const [ux, uy] = unit(phi);
      x += a * ux;
      y += a * uy;
    }
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Frontal QRS loop whose mean (area) vector points exactly at `axisDeg`: a single component sweeping symmetrically
 * ±40° around the axis. The loop is symmetric about the axis, so the net area recorded by a lead is proportional to
 * cos(axis − lead): a lead perpendicular to the axis records an equiphasic complex with zero net area.
 */
export function frontalQrsLoop(axisDeg: number, n = 64): Vec2[] {
  return loopPoints([{ deg: axisDeg, amp: 1, center: 0.5, width: 0.16, sweep: 80 }], n);
}

/**
 * Horizontal QRS loop: a small initial septal vector (anterior and to the right, toward V1), the main left-ventricular
 * vector sweeping around `mainDeg`, and a small terminal basal vector (posterior). This reproduces the textbook
 * rS in V1 (septal r), qR in V6 (septal q) and the R/S progression across V1–V6.
 */
export function horizontalQrsLoop(mainDeg: number, n = 64): Vec2[] {
  return loopPoints(
    [
      { deg: -120, amp: 0.24, center: 0.14, width: 0.06 },
      { deg: mainDeg - 85, amp: 0.6, center: 0.36, width: 0.08 },
      { deg: mainDeg, amp: 1, center: 0.55, width: 0.1, sweep: 40 },
      { deg: mainDeg + 110, amp: 0.2, center: 0.82, width: 0.06 },
    ],
    n,
  );
}

/** Scalar lead trace = projection of every loop point on the lead axis. */
export function projectLoop(points: readonly Vec2[], leadDeg: number): number[] {
  const [ux, uy] = unit(leadDeg);
  return points.map(([x, y]) => x * ux + y * uy);
}

export interface RS {
  /** tallest positive deflection */
  readonly r: number;
  /** deepest negative deflection (positive number) */
  readonly s: number;
  /** net area (sum of samples) */
  readonly net: number;
}

export function measureRS(trace: readonly number[]): RS {
  let r = 0, s = 0, net = 0;
  for (const v of trace) {
    if (v > r) r = v;
    if (-v > s) s = -v;
    net += v;
  }
  return { r, s, net };
}

// ── horizontal plane geometry ─────────────────────────────────────────────────────────────────────────────────────

/** Transverse section (figure units): chest ellipse centred at 0,0 — anterior is negative y. */
export const CHEST = { rx: 150, ry: 105 } as const;
/** Electrical centre of the heart: left of the midline and anterior. */
export const HEART_CENTER: Vec2 = [28, -22];

function chestWall(x: number): Vec2 {
  const f = Math.max(0, 1 - (x / CHEST.rx) ** 2);
  return [x, -CHEST.ry * Math.sqrt(f)];
}

/** Electrode sites on the anterior chest wall of the section. */
export const PRECORDIAL_SITES: Readonly<Record<ChestLead, Vec2>> = {
  V1: chestWall(-14), // 4th ICS, right sternal border
  V2: chestWall(14), // 4th ICS, left sternal border
  V3: chestWall(41), // midway V2–V4
  V4: chestWall(68), // 5th ICS, midclavicular line
  V5: chestWall(125), // anterior axillary line, V4 level
  V6: chestWall(149), // mid-axillary line, V4 level
};

/** Direction of each precordial lead axis (degrees, horizontal-plane convention above). */
export const PRECORDIAL_DEG: Readonly<Record<ChestLead, number>> = Object.fromEntries(
  CHEST_LEADS.map((l) => {
    const [x, y] = PRECORDIAL_SITES[l];
    return [l, angleOf(x - HEART_CENTER[0], y - HEART_CENTER[1])];
  }),
) as Record<ChestLead, number>;

/**
 * Relative recording gain of each precordial electrode: inversely proportional to its distance from the heart's
 * electrical centre (normalised to V3). This is why V2–V4, closest to the heart, record the largest deflections and
 * R is usually tallest in V4–V5 rather than V6. Gains scale R and S together, so R/S ratios are unaffected.
 */
export const PRECORDIAL_GAIN: Readonly<Record<ChestLead, number>> = (() => {
  const dist = (l: ChestLead) => Math.hypot(PRECORDIAL_SITES[l][0] - HEART_CENTER[0], PRECORDIAL_SITES[l][1] - HEART_CENTER[1]);
  const ref = dist('V3');
  return Object.fromEntries(CHEST_LEADS.map((l) => [l, ref / dist(l)])) as Record<ChestLead, number>;
})();

/** Default main horizontal QRS vector: leftward and posterior, giving the normal V3–V4 transition. */
export const DEFAULT_HORIZONTAL_DEG = 40;

export type TransitionClass = 'early' | 'normal' | 'late';

export interface Transition {
  /** R/(R+S) per lead V1…V6 */
  readonly ratios: readonly number[];
  /** first lead where R ≥ S (index 0…5), or null if none */
  readonly firstIndex: number | null;
  /** fractional position (0 = V1 … 5 = V6) where R/(R+S) crosses 0.5, or null */
  readonly crossing: number | null;
  /**
   * early (counter-clockwise rotation): R ≥ S already in V1–V2; normal: first in V3–V4; late (clockwise
   * rotation): only in V5–V6 or never.
   */
  readonly cls: TransitionClass;
}

export function rsTransition(rs: readonly RS[]): Transition {
  const ratios = rs.map((m) => (m.r + m.s > 0 ? m.r / (m.r + m.s) : 0.5));
  let firstIndex: number | null = null;
  for (let i = 0; i < ratios.length; i++) {
    if (ratios[i] >= 0.5) {
      firstIndex = i;
      break;
    }
  }
  let crossing: number | null = null;
  if (ratios[0] >= 0.5) crossing = 0;
  else
    for (let i = 1; i < ratios.length; i++) {
      if (ratios[i - 1] < 0.5 && ratios[i] >= 0.5) {
        crossing = i - 1 + (0.5 - ratios[i - 1]) / (ratios[i] - ratios[i - 1]);
        break;
      }
    }
  const cls: TransitionClass = firstIndex === null || firstIndex >= 4 ? 'late' : firstIndex <= 1 ? 'early' : 'normal';
  return { ratios, firstIndex, crossing, cls };
}

/** Mini complexes and transition for a main horizontal vector. */
export function horizontalComplexes(mainDeg: number, n = 64): { traces: Record<ChestLead, number[]>; rs: RS[]; transition: Transition } {
  const loop = horizontalQrsLoop(mainDeg, n);
  const traces = {} as Record<ChestLead, number[]>;
  const rs: RS[] = [];
  for (const l of CHEST_LEADS) {
    const g = PRECORDIAL_GAIN[l];
    traces[l] = projectLoop(loop, PRECORDIAL_DEG[l]).map((v) => v * g);
    rs.push(measureRS(traces[l]));
  }
  return { traces, rs, transition: rsTransition(rs) };
}

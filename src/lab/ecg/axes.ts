/**
 * Lead-axis geometry for the frontal (hexaxial) and horizontal diagrams — pure.
 *
 * Frank frame: +X patient left, +Y inferior, +Z posterior (src/sim/frame.ts).
 * Frontal diagram (viewed from the front): screen x = +X (patient left on the right), screen y = +Y (inferior drawn
 * downward) — so a Frank (X, Y) pair maps to the screen unchanged and the hexaxial angle is atan2(Y, X).
 * Horizontal diagram (viewed from above / the feet, anterior up): screen x = +X, screen y = +Z (posterior down,
 * anterior up); the angle from +X toward anterior is atan2(−Z, X).
 *
 * Ideal hexaxial angles: I 0°, II +60°, III +120°, aVR −150°, aVL −30°, aVF +90° (docs/research/lead-geometry-anatomy
 * §3c). The Dower lead vectors actually used for every sample point at I ≈ −20°, II ≈ +78°, III ≈ +107° in the frontal
 * plane and V1…V6 ≈ 119°, 88°, 55°, 26°, 4°, −16° in the horizontal plane (§4), which is why the clinical axis
 * atan2(2·aVF/√3, I) reads ≈ 25° more than the true frontal angle of H (plan, "电轴偏差").
 */
import type { FrankVec, LeadName } from '../sim/types';

export const FRONTAL_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] as const;
export type FrontalLead = (typeof FRONTAL_LEADS)[number];

export const HEXAXIAL_DEG: Readonly<Record<FrontalLead, number>> = { I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 };

export const isFrontalLead = (l: LeadName): l is FrontalLead => (FRONTAL_LEADS as readonly string[]).includes(l);

const RAD = Math.PI / 180;
export const deg = (rad: number): number => rad / RAD;

/** Wraps an angle difference to (−180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}

/** Unit direction (Frank X, Y) of a hexaxial angle. */
export const frontalDir = (angleDeg: number): [number, number] => [Math.cos(angleDeg * RAD), Math.sin(angleDeg * RAD)];

/** Hexaxial angle of a Frank vector (0° = left, +90° = inferior). */
export const frontalDeg = (v: FrankVec | readonly number[]): number => deg(Math.atan2(v[1], v[0]));

/** Horizontal-plane angle of a Frank vector, from +X toward anterior (−Z). */
export const horizontalDeg = (v: FrankVec | readonly number[]): number => deg(Math.atan2(-v[2], v[0]));

/** Unit direction (Frank X, Z) in the horizontal plane for an angle measured from +X toward anterior. */
export const horizontalDir = (angleDeg: number): [number, number] => [Math.cos(angleDeg * RAD), -Math.sin(angleDeg * RAD)];

/** Projection of H on an ideal hexaxial lead axis (frontal components only), mV. */
export function hexaxialProjection(h: readonly number[], lead: FrontalLead): number {
  const [ux, uy] = frontalDir(HEXAXIAL_DEG[lead]);
  return h[0] * ux + h[1] * uy;
}

/** Projection of H's horizontal components on the horizontal direction of a lead vector L, mV. */
export function horizontalProjection(h: readonly number[], L: FrankVec): number {
  const n = Math.hypot(L[0], L[2]);
  return n > 0 ? (h[0] * L[0] + h[2] * L[2]) / n : 0;
}

/** Lead sensitivity |L| and the component of H along L̂: voltage = |L| · (H · L̂) (exact for L_A = L_V). */
export function leadDecomposition(h: readonly number[], L: FrankVec): { sens: number; along: number; voltage: number } {
  const sens = Math.hypot(L[0], L[1], L[2]);
  const along = sens > 0 ? (h[0] * L[0] + h[1] * L[1] + h[2] * L[2]) / sens : 0;
  return { sens, along, voltage: sens * along };
}

/** Clinical frontal axis from (net) lead I and aVF values: atan2(2·aVF/√3, I), degrees. */
export const clinicalAxisDeg = (leadI: number, aVF: number): number => deg(Math.atan2((2 * aVF) / Math.sqrt(3), leadI));

/**
 * QRS axes of a beat over sample window [i0, i1]:
 *   clinical — from the net areas of I and aVF (area method, baseline-corrected);
 *   trueDeg  — frontal angle of the mean H vector over the same window.
 */
export function qrsAxes(
  H: Float32Array,
  leadI: ArrayLike<number>,
  leadAVF: ArrayLike<number>,
  i0: number,
  i1: number,
  base: { I: number; aVF: number; H: readonly [number, number, number] },
): { clinicalDeg: number; trueDeg: number; diffDeg: number } {
  let aI = 0, aF = 0, sx = 0, sy = 0;
  for (let i = i0; i <= i1; i++) {
    aI += leadI[i] - base.I;
    aF += leadAVF[i] - base.aVF;
    sx += H[3 * i] - base.H[0];
    sy += H[3 * i + 1] - base.H[1];
  }
  const clinicalDeg = clinicalAxisDeg(aI, aF);
  const trueDeg = deg(Math.atan2(sy, sx));
  return { clinicalDeg, trueDeg, diffDeg: angleDiff(clinicalDeg, trueDeg) };
}

/** Lead whose positive pole is nearest to a screen angle (within tolDeg), or null. */
export function nearestAxis<L extends string>(angleDeg: number, axes: readonly { lead: L; deg: number }[], tolDeg: number): L | null {
  let best: L | null = null, bd = Infinity;
  for (const a of axes) {
    const d = Math.abs(angleDiff(angleDeg, a.deg));
    if (d < bd) {
      bd = d;
      best = a.lead;
    }
  }
  return bd <= tolDeg ? best : null;
}

/** Hexaxial axes as a list (for hit testing and drawing). */
export const HEXAXIAL_AXES: readonly { lead: FrontalLead; deg: number }[] = FRONTAL_LEADS.map((lead) => ({ lead, deg: HEXAXIAL_DEG[lead] }));

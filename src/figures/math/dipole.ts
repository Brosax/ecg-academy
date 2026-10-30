/**
 * The dipole model of a deflection. A strip of myocardium (x ∈ [0, 1], y = 0) is activated by a wavefront moving
 * from left to right. Outside the cells, the activated region is negative and the resting region positive, so the
 * front is a current dipole pointing in the direction of travel. An electrode at E records
 *   φ(E) ∝ p · (E − F) / |E − F|³          (F = front position, p = dipole moment)
 * — positive while the front comes towards it, negative while it moves away, and biphasic when the front passes by.
 *
 * Repolarization travelling in the same direction carries the opposite dipole (recovered tissue, positive outside,
 * is behind the front), so every deflection is inverted. In the ventricles repolarization runs roughly opposite to
 * depolarization (epicardium recovers first), which is why the normal T wave has the same polarity as the QRS.
 *
 * The electrodes sit a few strip-lengths away (as the body-surface electrodes are far from the heart compared with its
 * size); the figure draws them closer, in the same directions. The distance is softened (+ ε²) only for robustness.
 */
export type DipoleMode = 'depolarization' | 'repolarization';

export interface Electrode {
  readonly id: 'A' | 'B' | 'C' | 'D';
  readonly x: number;
  readonly y: number;
}

/** Electrode sites around the strip (units: strip from 0 to 1 on y = 0; y < 0 is above on screen). */
export const DIPOLE_ELECTRODES: readonly Electrode[] = [
  { id: 'A', x: 3, y: 0 }, // the front comes straight at it
  { id: 'B', x: 2, y: -1.5 }, // ahead and above (about 45° from the strip's centre)
  { id: 'C', x: 0.5, y: -1.5 }, // perpendicular, above the middle
  { id: 'D', x: -2, y: 0 }, // the front moves straight away from it
];

const EPS2 = 0.01;

/** Direction (degrees, screen convention) of an electrode seen from the middle of the strip. */
export function electrodeBearing(e: Electrode): number {
  return (Math.atan2(e.y, e.x - 0.5) * 180) / Math.PI;
}

/**
 * Trace padded with baseline before the front starts and after it has crossed (the whole strip is then activated and
 * no current flows), as an electrode would record it: `pad` zero samples on each side.
 */
export function paddedTrace(e: Electrode, n = 121, mode: DipoleMode = 'depolarization', pad = 24): number[] {
  const z = new Array<number>(pad).fill(0);
  return [...z, ...dipoleTrace(e, n, mode), ...z];
}

/** Potential at electrode e when the front is at x = pos (0…1). */
export function dipolePotential(e: Electrode, pos: number, mode: DipoleMode = 'depolarization'): number {
  const dx = e.x - pos;
  const dy = e.y;
  const r2 = dx * dx + dy * dy + EPS2;
  const v = dx / Math.pow(r2, 1.5);
  return mode === 'depolarization' ? v : -v;
}

/**
 * Strength of the front along the sweep: it builds up as activation spreads out from the stimulated end and collapses
 * as it reaches the far end (smooth ramps over the first and last 20 %), so recorded deflections start and end at the
 * baseline as real ones do.
 */
export function frontStrength(pos: number): number {
  const r = 0.2;
  const f = Math.min(1, pos / r, (1 - pos) / r);
  const x = Math.max(0, f);
  return x * x * (3 - 2 * x);
}

/** Trace of an electrode while the front crosses the strip: n samples, front position 0…1. */
export function dipoleTrace(e: Electrode, n = 121, mode: DipoleMode = 'depolarization'): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = i / (n - 1);
    out.push(frontStrength(pos) * dipolePotential(e, pos, mode));
  }
  return out;
}

/** Common scale for all electrodes (largest |φ| over the sweep). */
export function dipoleScale(electrodes: readonly Electrode[] = DIPOLE_ELECTRODES, n = 121): number {
  let m = 0;
  for (const e of electrodes) for (const v of dipoleTrace(e, n)) m = Math.max(m, Math.abs(v));
  return m || 1;
}

export type DeflectionShape = 'positive' | 'negative' | 'biphasic-pos-neg' | 'biphasic-neg-pos';

/** Classify a trace: one polarity dominating (> 4×) or biphasic, named by which comes first. */
export function classifyDeflection(trace: readonly number[]): DeflectionShape {
  let max = 0, min = 0, iMax = 0, iMin = 0;
  trace.forEach((v, i) => {
    if (v > max) {
      max = v;
      iMax = i;
    }
    if (v < min) {
      min = v;
      iMin = i;
    }
  });
  const pos = max, neg = -min;
  if (pos > 4 * neg) return 'positive';
  if (neg > 4 * pos) return 'negative';
  return iMax < iMin ? 'biphasic-pos-neg' : 'biphasic-neg-pos';
}

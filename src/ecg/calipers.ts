/**
 * Caliper math — pure. Time mode: two vertical lines → Δt (ms), the same interval in small squares at the paper speed,
 * and the rate if the span is one cardiac cycle (60 000 / Δt). Amplitude mode: two horizontal lines → ΔV in mV and in
 * mm at the panel's gain. "March out": the interval repeated along the strip to test regularity (RR, PP).
 * Default placement is geometric (centre of the panel) — never on model fiducials, so a measuring exercise is not
 * answered by the tool.
 */
import { msPerSmallSquare } from './paper';

export type CaliperMode = 'time' | 'amplitude';

export interface CaliperState {
  /** index of the panel the calipers were placed in */
  readonly panel: number;
  /** time lines (ms) */
  readonly t0: number;
  readonly t1: number;
  /** amplitude lines (true lead mV) */
  readonly mv0: number;
  readonly mv1: number;
}

export interface CaliperReadout {
  readonly dtMs: number;
  /** Δt in small (1 mm) squares at the paper speed */
  readonly squares: number;
  /** 60 000 / Δt, null when Δt is shorter than any cardiac cycle (rate above MAX_RATE_BPM) */
  readonly bpm: number | null;
  readonly dMv: number;
  /** ΔV in mm at the panel gain */
  readonly dMm: number;
}

/**
 * Highest rate the calipers report (bpm). A shorter interval (under ~60 ms) is no cardiac cycle — even the f waves of
 * atrial fibrillation stay under ~600 /min — so no rate is shown, and the rate box never needs a fourth digit.
 */
export const MAX_RATE_BPM = 999;

export const rateFromInterval = (dtMs: number): number | null => (dtMs > 0 && 60000 / dtMs < MAX_RATE_BPM + 0.5 ? 60000 / dtMs : null);
export const squaresFromMs = (dtMs: number, speed: number): number => dtMs / msPerSmallSquare(speed);

export function caliperReadout(c: Pick<CaliperState, 't0' | 't1' | 'mv0' | 'mv1'>, speed: number, gain: number): CaliperReadout {
  const dtMs = Math.abs(c.t1 - c.t0);
  const dMv = Math.abs(c.mv1 - c.mv0);
  return { dtMs, squares: squaresFromMs(dtMs, speed), bpm: rateFromInterval(dtMs), dMv, dMm: dMv * gain };
}

/** Default calipers for a panel: centred, 1 s apart (or 40 % of a short window); amplitude lines at 0 and 1 mV. */
export function defaultCalipers(panel: number, t0: number, t1: number): CaliperState {
  const span = Math.max(0, t1 - t0);
  const half = Math.min(500, 0.2 * span);
  const mid = (t0 + t1) / 2;
  return { panel, t0: mid - half, t1: mid + half, mv0: 0, mv1: 1 };
}

/**
 * Repeats of the interval beyond both lines ("marching out"): t1 + kΔ forward and t0 − kΔ backward, k ≥ 1, inside
 * [from, to]. Δ under 40 ms gives nothing (that is not a cycle).
 */
export function marchOut(t0: number, t1: number, from: number, to: number, max = 60): number[] {
  const lo = Math.min(t0, t1), hi = Math.max(t0, t1);
  const d = hi - lo;
  if (d < 40) return [];
  const out: number[] = [];
  for (let k = 1, t = hi + d; t <= to + 1e-6 && k <= max; k++, t += d) out.push(t);
  for (let k = 1, t = lo - d; t >= from - 1e-6 && k <= max; k++, t -= d) out.push(t);
  return out.sort((a, b) => a - b);
}

/** Which handle (index into xs) is within `tol` of x, the nearest one; −1 when none. Null entries are off-screen. */
export function pickHandle(xs: readonly (number | null)[], x: number, tol: number): number {
  let best = -1, bd = Infinity;
  xs.forEach((v, i) => {
    if (v === null) return;
    const d = Math.abs(x - v);
    if (d <= tol && d < bd) {
      best = i;
      bd = d;
    }
  });
  return best;
}

/** Keyboard nudge of a time line: 4 ms fine, one small square (40 / 20 ms) coarse. */
export const timeStep = (speed: number, coarse: boolean): number => (coarse ? msPerSmallSquare(speed) : 4);
/** Keyboard nudge of an amplitude line: 0.01 mV fine, one small square coarse. */
export const mvStep = (gain: number, coarse: boolean): number => (coarse ? 1 / gain : 0.01);

/** Move one or both time lines by dt, keeping them inside [lo, hi] (moving both keeps the interval). */
export function moveTime(c: CaliperState, which: 0 | 1 | 'both', dt: number, lo: number, hi: number): CaliperState {
  const clamp = (v: number) => Math.max(lo, Math.min(hi, v));
  if (which === 'both') {
    const d = Math.max(lo - Math.min(c.t0, c.t1), Math.min(hi - Math.max(c.t0, c.t1), dt));
    return { ...c, t0: c.t0 + d, t1: c.t1 + d };
  }
  return which === 0 ? { ...c, t0: clamp(c.t0 + dt) } : { ...c, t1: clamp(c.t1 + dt) };
}

export function moveMv(c: CaliperState, which: 0 | 1 | 'both', dmv: number): CaliperState {
  if (which === 'both') return { ...c, mv0: c.mv0 + dmv, mv1: c.mv1 + dmv };
  return which === 0 ? { ...c, mv0: c.mv0 + dmv } : { ...c, mv1: c.mv1 + dmv };
}

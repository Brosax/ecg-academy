/**
 * Caliper math — pure. QTc formulas from disease-spec normal reference (LITFL QT page):
 *   Bazett QTc = QT / √RR,  Fridericia QTc = QT / ∛RR   (RR in seconds, QT and QTc in ms).
 * Bazett over-corrects above ~100 bpm and under-corrects below ~60 bpm, which is why both are shown.
 */
import type { CycleTruth } from '../sim/types';

export type CaliperMode = 'interval' | 'qt';

export const qtcBazett = (qtMs: number, rrMs: number): number => qtMs / Math.sqrt(rrMs / 1000);
export const qtcFridericia = (qtMs: number, rrMs: number): number => qtMs / Math.cbrt(rrMs / 1000);
/** Rate (bpm) for an interval taken as one cycle. */
export const rateFromInterval = (dtMs: number): number => (dtMs > 0 ? 60000 / dtMs : 0);

export interface CaliperReadout {
  readonly mode: CaliperMode;
  /** |t1 − t0| (ms). */
  readonly dtMs: number;
  /** 60000 / Δt — meaningful when the calipers span one RR. */
  readonly rateBpm: number;
  /** QT mode: the caliper span is the QT; QTc uses the cycle's RR. */
  readonly qtcBazettMs: number | null;
  readonly qtcFridericiaMs: number | null;
  readonly rrMs: number | null;
  /** Model truth for comparison. */
  readonly truth: {
    readonly rrMs: number | null;
    readonly rateBpm: number | null;
    readonly qtMs: number | null;
    readonly qtcBazettMs: number | null;
    readonly qtcFridericiaMs: number | null;
  };
}

/**
 * @param t0, t1   caliper times (ms, any order)
 * @param cycle    cycle truth containing the calipers (for truth QT)
 * @param rrMs     RR of that cycle from cycle truth (ms)
 */
export function caliperReadout(mode: CaliperMode, t0: number, t1: number, cycle: CycleTruth | null, rrMs: number | null): CaliperReadout {
  const dtMs = Math.abs(t1 - t0);
  const truthQt = cycle && cycle.qrsOn !== null && cycle.tEnd !== null ? cycle.tEnd - cycle.qrsOn : null;
  const okRr = rrMs !== null && rrMs > 0 ? rrMs : null;
  return {
    mode,
    dtMs,
    rateBpm: rateFromInterval(dtMs),
    qtcBazettMs: mode === 'qt' && okRr ? qtcBazett(dtMs, okRr) : null,
    qtcFridericiaMs: mode === 'qt' && okRr ? qtcFridericia(dtMs, okRr) : null,
    rrMs: okRr,
    truth: {
      rrMs: okRr,
      rateBpm: okRr ? rateFromInterval(okRr) : null,
      qtMs: truthQt,
      qtcBazettMs: truthQt !== null && okRr ? qtcBazett(truthQt, okRr) : null,
      qtcFridericiaMs: truthQt !== null && okRr ? qtcFridericia(truthQt, okRr) : null,
    },
  };
}

/**
 * Default caliper placement for a mode on a reference beat: interval → QRS onset to the next QRS onset (one RR);
 * QT → QRS onset to T end. Uses model truth so the student starts from a sensible spot and adjusts.
 */
export function defaultCalipers(mode: CaliperMode, cycle: CycleTruth, rrMs: number | null): { t0: number; t1: number } | null {
  if (cycle.qrsOn === null) return null;
  if (mode === 'qt') return cycle.tEnd !== null ? { t0: cycle.qrsOn, t1: cycle.tEnd } : null;
  return { t0: cycle.qrsOn, t1: cycle.qrsOn + (rrMs ?? 800) };
}

/** Which caliper handle (0 / 1) is within `tolPx` of x, preferring the nearer one; −1 when none. */
export function pickHandle(x0: number | null, x1: number | null, x: number, tolPx: number): 0 | 1 | -1 {
  const d0 = x0 === null ? Infinity : Math.abs(x - x0);
  const d1 = x1 === null ? Infinity : Math.abs(x - x1);
  if (Math.min(d0, d1) > tolPx) return -1;
  return d0 <= d1 ? 0 : 1;
}

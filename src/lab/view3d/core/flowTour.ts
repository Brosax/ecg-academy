/**
 * Timing of the blood-route walkthrough (flowControls.FLOW_TOUR): the stretch of sim time a step plays once, read from
 * the model's own valve events (engine.cycleAt), so it follows the rhythm and the disease like everything else.
 */
import type { SimEngine } from '../../sim/types';
import type { FlowTourStep } from '../flowControls';

/** Lead-in before the valve opens and look-ahead of the filling surge (ms of sim time). */
export const TOUR_LEAD_MS = 40;
export const TOUR_FILL_MS = 300;
/** Ejection steps stop just before the semilunar valve shuts, so the last frame still shows blood leaving. */
export const TOUR_EJECT_END_MS = 15;
const PROBE_MS = 100;
const PROBE_N = 40;

/**
 * The window to play for a step at or after tMs: ejection = the semilunar valve opening (after a short lead-in) to
 * just before it shuts; filling = the AV valve opening and the rapid-filling surge after it. Null for a step with
 * nothing to play, or when no beat with valve events lies within 4 s (VF, torsades run): the caller stays paused.
 */
export function tourWindow(engine: Pick<SimEngine, 'cycleAt'>, tMs: number, step: FlowTourStep): { t0: number; t1: number } | null {
  if (step.at === 'none') return null;
  for (let k = 0; k < PROBE_N; k++) {
    const ev = engine.cycleAt(tMs + k * PROBE_MS)?.valves.find((v) => v.id === step.valve);
    if (!ev) continue;
    return step.at === 'ejection'
      ? { t0: ev.openMs - TOUR_LEAD_MS, t1: ev.closeMs - TOUR_EJECT_END_MS }
      : { t0: ev.openMs - TOUR_LEAD_MS, t1: ev.openMs + TOUR_FILL_MS };
  }
  return null;
}

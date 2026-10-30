/**
 * Valve leaflet opening 0..1 from model truth (engine.cycleAt(t).valves). Agrees with valveOpenAt()
 * (src/sim/measure/truth.ts) outside the ≈ 35 ms opening/closing ramps.
 */
import { valveOpenAt } from '../../sim/measure/truth';
import type { ValveEvents, ValveId } from '../../sim/types';

/** Leaflet travel time (ms) — valves open/close within ≈ 30–40 ms. */
export const VALVE_RAMP_MS = 35;

const smooth = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export const isSemilunar = (id: ValveId): boolean => id === 'AORTIC' || id === 'PULMONARY';

/**
 * Openness at tMs for one cycle's valve events. Without events (before the first beat) AV valves rest open and
 * semilunar valves closed (diastole).
 */
export function valveOpenness(id: ValveId, ev: ValveEvents | undefined, tMs: number, rampMs = VALVE_RAMP_MS): number {
  if (!ev) return isSemilunar(id) ? 0 : 1;
  const open = valveOpenAt(ev, tMs);
  if (isSemilunar(id)) {
    if (tMs < ev.openMs) return 0;
    if (open) return smooth((tMs - ev.openMs) / rampMs);
    return 1 - smooth((tMs - ev.closeMs) / rampMs);
  }
  if (tMs < ev.closeMs) return 1;
  if (!open) return 1 - smooth((tMs - ev.closeMs) / rampMs);
  return smooth((tMs - ev.openMs) / rampMs);
}

/**
 * Leaflet openness drawn at tMs from the current cycle and the one before it (the leaflets and the flow jets).
 * engine.cycleAt is A-anchored, and the previous beat's ejection and isovolumic relaxation can outlast the next P onset (P on T,
 * ≥ 135/min): the current cycle alone would then draw the semilunar leaflets shut and the AV leaflets open while that
 * ejection runs. Semilunar: the larger of the two (the previous ejection and its closing ramp show); AV: the smaller
 * (shut until the previous beat's opening). Missing events (a dropped or no cycle) are neutral, since valveOpenness
 * rests AV-open and semilunar-shut without them. Identical to the current cycle alone whenever the beats do not overlap.
 */
export function leafletOpenness(id: ValveId, prevEv: ValveEvents | undefined, curEv: ValveEvents | undefined, tMs: number): number {
  const a = valveOpenness(id, curEv, tMs);
  if (!prevEv) return a;
  const b = valveOpenness(id, prevEv, tMs);
  return isSemilunar(id) ? Math.max(a, b) : Math.min(a, b);
}

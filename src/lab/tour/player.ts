/**
 * Tour player logic, separated from the panel so it can be tested without a DOM. It drives the app only through
 * AppCommands (store.tourStep has no command, so the panel sets it directly).
 */
import type { AppCommands } from '../app/commands';
import type { CycleTruth, SimEngine } from '../sim/types';
import { resolveTourWindow, TOUR_STEPS } from './steps';
import type { TourStep } from './steps';

export interface TourWindow {
  readonly t0: number;
  readonly t1: number;
}

/** Real-time duration a step should take to play (ms): short windows are slowed down so the eye can follow them. */
export const TOUR_TARGET_REAL_MS = 3000;
/** Slowest tour playback (the transport slider itself stops at 0.05). */
export const TOUR_MIN_SPEED = 0.01;
/** Pause after each pass when auto-loop is on (ms, real time). */
export const TOUR_LOOP_HOLD_MS = 1500;

/** Playback speed for a step: never faster than the step's own speed, slow enough that the window lasts ~3 s. */
export function tourSpeed(step: TourStep, win: TourWindow): number {
  const fit = (win.t1 - win.t0) / TOUR_TARGET_REAL_MS;
  return Math.min(1, Math.max(TOUR_MIN_SPEED, Math.min(step.speed, fit)));
}

/** Applies one step: cut, highlight, lead, speed, then seek to the window start and play (once). */
export function applyTourStep(step: TourStep, win: TourWindow, commands: AppCommands): void {
  if (step.slice === 'none') commands.setSlice({ enabled: false });
  else commands.setSlice(step.slice);
  commands.highlight(step.highlight);
  commands.selectLead(step.lead);
  commands.setSpeed(tourSpeed(step, win));
  commands.seek(win.t0);
  commands.play();
}

/** True once playback has run past the end of the step window (then the panel stops on the last frame or loops). */
export function pastWindowEnd(tNow: number, win: TourWindow): boolean {
  return tNow > win.t1;
}

/** Time the step's explanation refers to while it plays: the middle of the window (stable text). */
export const keyMoment = (win: TourWindow): number => (win.t0 + win.t1) / 2;

/** Clamp a step index into the tour. */
export const clampStep = (i: number): number => Math.max(0, Math.min(TOUR_STEPS.length - 1, i));

/**
 * The ONE cycle all ten steps are resolved against (captured at tour start). Re-resolving per step from the current
 * time would make step 1 (which starts before P onset) land in the previous cycle.
 */
export function anchorCycle(engine: SimEngine, tMs: number): CycleTruth | null {
  const ok = (c: CycleTruth | null) => !!c && c.pOn !== null && c.qrsOn !== null && c.tEnd !== null;
  for (const t of [tMs, tMs + 60000 / engine.rhythm.heartRate, 1500]) {
    const c = engine.cycleAt(t);
    if (ok(c)) return c;
  }
  return null;
}

/** Window of step i in the anchor cycle (null if that cycle lacks the anchors). */
export function stepWindow(i: number, cycle: CycleTruth | null): TourWindow | null {
  if (!cycle) return null;
  return resolveTourWindow(TOUR_STEPS[clampStep(i)], cycle);
}

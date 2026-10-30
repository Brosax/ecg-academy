/**
 * Conduction-system pulse timing for the 3D tubes (display only — the ECG never reads this table).
 *
 * TODO(round 2): move this table into the engine (arrival times from the conduction graph), so tubes, blocks and
 * accessory pathways come from the same source as the activation field.
 *
 * Times are ms relative to the A event (SA firing) or the V event (His activation = ventricular field time zero,
 * see src/sim/rhythm/sinus.ts). Sources (docs/research/activation-physiology.md):
 *   §2  Malmivuo & Plonsey Table 6.1: SA 0, RA 5, AV node arrival 50, His 130, bundle branches 145, Purkinje 150,
 *       septal endocardium 175 ms after the SA impulse → His 0, BB 15, Purkinje 20, first myocardium ≈ 45 ms after His.
 *   §2b HV 35–55 ms; His → right bundle 27 ± 6 ms (Denker 1984).
 *   §2c Bachmann's bundle conducts > 1.7 m/s; LA is reached ≈ 40–50 ms after the SA impulse.
 * V-referenced times are stretched by vTimeScale() so the fascicle terminals arrive exactly when the first ventricular
 * myocardium activates in the engine's field — the tube pulse and the wall colour can never disagree.
 */
import type { BeatSnapshot, StructureId } from '../sim/types';

export type TimeRef = 'A' | 'V';
export interface TimePoint {
  readonly ref: TimeRef;
  readonly ms: number;
}
export interface PathTiming {
  /** Arrival at the start (uv.x = 0) and at the end (uv.x = 1) of the path. */
  readonly start: TimePoint;
  readonly end: TimePoint;
  /** Afterglow decay of the pulse (ms). */
  readonly glowMs: number;
}

export const CONDUCTION_IDS = ['SA', 'BACHMANN', 'AVN', 'HIS', 'LBB', 'LAF', 'LPF', 'LSF', 'RBB'] as const;
export type ConductionId = (typeof CONDUCTION_IDS)[number];

export const CONDUCTION_TIMING: Readonly<Record<ConductionId, PathTiming>> = {
  SA: { start: { ref: 'A', ms: 0 }, end: { ref: 'A', ms: 8 }, glowMs: 18 },
  BACHMANN: { start: { ref: 'A', ms: 10 }, end: { ref: 'A', ms: 40 }, glowMs: 14 },
  // AV node: entered ≈ 50 ms after SA, left when the His bundle fires (the V event) — so it follows the rate-dependent AH.
  AVN: { start: { ref: 'A', ms: 50 }, end: { ref: 'V', ms: 0 }, glowMs: 35 },
  HIS: { start: { ref: 'V', ms: 0 }, end: { ref: 'V', ms: 12 }, glowMs: 12 },
  LBB: { start: { ref: 'V', ms: 12 }, end: { ref: 'V', ms: 20 }, glowMs: 12 },
  LAF: { start: { ref: 'V', ms: 20 }, end: { ref: 'V', ms: 40 }, glowMs: 12 },
  LPF: { start: { ref: 'V', ms: 20 }, end: { ref: 'V', ms: 40 }, glowMs: 12 },
  LSF: { start: { ref: 'V', ms: 20 }, end: { ref: 'V', ms: 38 }, glowMs: 12 },
  // Right bundle: longer, unbranched; reaches the RV a little after the LV fascicles (RV starts 5–10 ms later).
  RBB: { start: { ref: 'V', ms: 12 }, end: { ref: 'V', ms: 45 }, glowMs: 12 },
};

/** Table time (rel. to V) at which the fascicles hand over to the first ventricular myocardium. */
export const TABLE_FIRST_MYOCARDIUM_MS = 40;
/** Default A → His gap before one has been observed (≈ 50 + 80 ms at 75 bpm, sinus.ts). */
export const DEFAULT_AV_GAP_MS = 130;

/** Stretch factor for V-referenced times so terminals arrive at the engine's first ventricular activation. */
export function vTimeScale(firstVentricularTActMs: number): number {
  if (!Number.isFinite(firstVentricularTActMs) || firstVentricularTActMs <= 0) return 1;
  return Math.min(2.5, Math.max(0.2, firstVentricularTActMs / TABLE_FIRST_MYOCARDIUM_MS));
}

export interface PulseWindow {
  /** Time since the pulse entered the path (ms, may be negative = not yet). */
  readonly sinceStartMs: number;
  /** Start → end transit time (ms). */
  readonly durMs: number;
}

export const isConductionId = (id: StructureId): id is ConductionId => (CONDUCTION_IDS as readonly string[]).includes(id);

/**
 * Pulse window of a path for the current instant, from the most recent atrial / ventricular beats.
 * `avGap` = A → V time of the latest atrial beat (beats.avGapMs). Returns null when the reference beat is missing.
 */
export function pulseWindow(
  id: ConductionId,
  snap: BeatSnapshot,
  avGap: number,
  vScale: number,
  out: { sinceStartMs: number; durMs: number } = { sinceStartMs: 0, durMs: 0 },
): PulseWindow | null {
  const tm = CONDUCTION_TIMING[id];
  const a = snap.atrial[0], v = snap.ventricular[0];
  if (tm.start.ref === 'V') {
    if (!v) return null;
    const s = tm.start.ms * vScale, e = tm.end.ref === 'V' ? tm.end.ms * vScale : s;
    out.sinceStartMs = v.sinceMs - s;
    out.durMs = Math.max(0, e - s);
    return out;
  }
  if (!a) return null;
  // Both points expressed relative to the A event; a V-referenced end sits avGap after A.
  const s = tm.start.ms;
  const e = tm.end.ref === 'A' ? tm.end.ms : tm.end.ms * vScale + avGap;
  out.sinceStartMs = a.sinceMs - s;
  out.durMs = Math.max(0, e - s);
  return out;
}

/** Pulse intensity at fraction u along the path (same formula as the GLSL in conductionTubes.ts). */
export function pulseIntensity(u: number, w: PulseWindow, glowMs: number): number {
  const age = w.sinceStartMs - u * w.durMs;
  if (age < -1.5) return 0;
  const head = Math.min(1, (age + 1.5) / 1.5);
  return head * Math.exp(-Math.max(age, 0) / glowMs);
}

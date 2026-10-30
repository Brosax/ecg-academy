/**
 * Schematic transmembrane action potentials aligned with the schematic surface beat (src/figures/math/beat.ts,
 * NORMAL_BEAT: P onset 0, QRS 160–245, ST ≈ 245–300, T ≈ 290–500 ms). Shapes follow standard physiology teaching:
 *
 * - Ventricular myocyte: resting −85 mV (phase 4, IK1); fast Na⁺ upstroke to ≈ +25 mV (phase 0, inside the QRS);
 *   early notch (phase 1, Ito); plateau near 0 mV (phase 2, L-type Ca²⁺ in vs K⁺ out — the isoelectric ST segment);
 *   repolarization (phase 3, IKr/IKs — the T wave); back to rest (phase 4 — the TP segment).
 * - Atrial myocyte: resting −80 mV, upstroke at the P wave, short triangular plateau, repolarization during the PR
 *   segment and QRS (the atrial T wave, Ta, is hidden in the QRS).
 * - Sinus-node (nodal) cell: no stable resting potential; maximum diastolic potential ≈ −60 mV, slow diastolic
 *   depolarization (phase 4, funny current If and Ca²⁺) to threshold ≈ −40 mV, slow Ca²⁺ upstroke (phase 0) just before
 *   the P wave, no distinct phases 1–2, repolarization (phase 3). The sinus node's own firing is invisible on the
 *   surface ECG.
 */
import { clamp } from './geom';

export const AP_CELLS = ['ventricular', 'atrial', 'nodal'] as const;
export type ApCell = (typeof AP_CELLS)[number];
export type ApPhase = 0 | 1 | 2 | 3 | 4;

export interface PhaseSpan {
  readonly phase: ApPhase;
  readonly t0: number;
  readonly t1: number;
}

/** Window shown by the figure (ms from P onset). */
export const AP_WINDOW = { t0: -100, t1: 700 } as const;
/** Cycle length of the schematic rhythm (75 /min). */
export const AP_RR = 800;

const smooth = (f: number) => {
  const x = clamp(f, 0, 1);
  return x * x * (3 - 2 * x);
};

// ventricular key times
const V = { up0: 168, up1: 171, n1: 186, plat: 300, rep1: 470, rest: -86, peak: 26, notch: 6, platEnd: -12 };
// atrial key times
const A = { up0: 4, up1: 7, n1: 16, plat: 70, rep1: 215, rest: -80, peak: 20, notch: 2, platEnd: -22 };
// nodal key times (fires just before P onset; next firing one RR later)
const N = { up0: -28, up1: 2, rep1: 150, mdp: -60, thr: -41, peak: 8 };

function ventricular(t: number): number {
  if (t < V.up0 || t >= V.rep1 + 40) return V.rest;
  if (t < V.up1) return V.rest + (V.peak - V.rest) * smooth((t - V.up0) / (V.up1 - V.up0));
  if (t < V.n1) return V.peak + (V.notch - V.peak) * smooth((t - V.up1) / (V.n1 - V.up1));
  if (t < V.plat) return V.notch + (V.platEnd - V.notch) * ((t - V.n1) / (V.plat - V.n1));
  if (t < V.rep1) return V.platEnd + (V.rest - V.platEnd) * smooth((t - V.plat) / (V.rep1 - V.plat));
  return V.rest;
}

function atrial(t: number): number {
  if (t < A.up0 || t >= A.rep1 + 30) return A.rest;
  if (t < A.up1) return A.rest + (A.peak - A.rest) * smooth((t - A.up0) / (A.up1 - A.up0));
  if (t < A.n1) return A.peak + (A.notch - A.peak) * smooth((t - A.up1) / (A.n1 - A.up1));
  if (t < A.plat) return A.notch + (A.platEnd - A.notch) * ((t - A.n1) / (A.plat - A.n1));
  if (t < A.rep1) return A.platEnd + (A.rest - A.platEnd) * smooth((t - A.plat) / (A.rep1 - A.plat));
  return A.rest;
}

/** One nodal cycle starting at the upstroke; `t` relative to this cycle's upstroke start. */
function nodalCycle(dt: number): number {
  const upDur = N.up1 - N.up0;
  const repEnd = N.rep1 - N.up0;
  if (dt < upDur) return N.thr + (N.peak - N.thr) * smooth(dt / upDur);
  if (dt < repEnd) return N.peak + (N.mdp - N.peak) * smooth((dt - upDur) / (repEnd - upDur));
  // phase 4: slow diastolic depolarization from MDP to threshold over the rest of the cycle (slightly accelerating)
  const f = (dt - repEnd) / (AP_RR - repEnd);
  return N.mdp + (N.thr - N.mdp) * Math.pow(clamp(f, 0, 1), 1.35);
}

function nodal(t: number): number {
  const k = Math.floor((t - N.up0) / AP_RR);
  return nodalCycle(t - N.up0 - k * AP_RR);
}

/** Membrane potential (mV) of a cell type at time t (ms from P onset). */
export function apValue(cell: ApCell, t: number): number {
  return cell === 'ventricular' ? ventricular(t) : cell === 'atrial' ? atrial(t) : nodal(t);
}

/** Phase spans inside [t0, t1]. */
export function apPhases(cell: ApCell, t0: number = AP_WINDOW.t0, t1: number = AP_WINDOW.t1): PhaseSpan[] {
  const spans: PhaseSpan[] = [];
  const push = (phase: ApPhase, a: number, b: number) => {
    const lo = Math.max(a, t0), hi = Math.min(b, t1);
    if (hi > lo) spans.push({ phase, t0: lo, t1: hi });
  };
  if (cell === 'ventricular') {
    push(4, -Infinity, V.up0);
    push(0, V.up0, V.up1);
    push(1, V.up1, V.n1);
    push(2, V.n1, V.plat);
    push(3, V.plat, V.rep1);
    push(4, V.rep1, Infinity);
  } else if (cell === 'atrial') {
    push(4, -Infinity, A.up0);
    push(0, A.up0, A.up1);
    push(1, A.up1, A.n1);
    push(2, A.n1, A.plat);
    push(3, A.plat, A.rep1);
    push(4, A.rep1, Infinity);
  } else {
    for (let k = -1; k <= 1; k++) {
      const o = k * AP_RR;
      push(4, N.rep1 + o - AP_RR, N.up0 + o);
      push(0, N.up0 + o, N.up1 + o);
      push(3, N.up1 + o, N.rep1 + o);
    }
    spans.sort((a, b) => a.t0 - b.t0);
  }
  return spans;
}

export function apPhaseAt(cell: ApCell, t: number): ApPhase {
  for (const s of apPhases(cell, -Infinity, Infinity)) if (t >= s.t0 && t < s.t1) return s.phase;
  return 4;
}

/** The surface-ECG part each phase corresponds to (for the alignment labels). */
export type EcgPart = 'p' | 'pr' | 'qrs' | 'st' | 't' | 'tp' | 'pre-p';

export function ecgPartAt(t: number): EcgPart {
  if (t < 0) return 'pre-p';
  if (t < 100) return 'p';
  if (t < 160) return 'pr';
  if (t < 245) return 'qrs';
  if (t < 290) return 'st';
  if (t < 500) return 't';
  return 'tp';
}

// ── following an ECG cursor ─────────────────────────────────────────────────────────────────────────────────────

/** The fiducials needed to anchor a recorded beat on the schematic beat. */
export interface BeatAnchor {
  readonly pOn: number | null;
  readonly qrsOn: number;
}

/** PR of the schematic beat: a beat without a visible P is anchored this long before its QRS onset. */
const SCHEMATIC_PR = 160;

/** Record time that corresponds to time 0 (P onset) of the schematic beat for a recorded beat. */
export function beatZero(b: BeatAnchor): number {
  return b.pOn ?? b.qrsOn - SCHEMATIC_PR;
}

/**
 * Map a record time onto the schematic beat: the latest beat whose window (its time 0 minus 100 ms) has started, and
 * the time relative to that beat's P onset, clamped to the figure's window. Null without beats or cursor.
 */
export function mapToSchematic(beats: readonly BeatAnchor[], t: number | null): { readonly start: number; readonly t: number } | null {
  if (t == null || !beats.length) return null;
  let b = beats[0];
  for (const x of beats) if (beatZero(x) + AP_WINDOW.t0 <= t) b = x;
  const start = beatZero(b);
  return { start, t: clamp(t - start, AP_WINDOW.t0, AP_WINDOW.t1) };
}

/** Inverse of mapToSchematic for a chosen beat: the record time of schematic time `tLocal` (never negative). */
export function mapFromSchematic(start: number, tLocal: number): number {
  return Math.max(0, Math.round(start + clamp(tLocal, AP_WINDOW.t0, AP_WINDOW.t1)));
}

/** Resting / maximum diastolic and peak potentials (mV) for axis labels. */
export const AP_RANGE = { min: -95, max: 35 } as const;

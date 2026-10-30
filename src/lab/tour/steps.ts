/**
 * Guided tour — pure data. Each step is a time window anchored to the CURRENT cycle's model truth (segment + fraction
 * + offset, never hard-coded absolute times), a slice preset, the structures to highlight, a playback speed and a lead
 * to emphasise. The player (TourPanel) only executes these through AppCommands.
 *
 * Timing anchors follow the normal activation sequence (docs/research/activation-physiology.md §1, §2, §2b; Durrer 1970):
 * septum first ≈ first 15–20 ms of a ~90 ms QRS, apex/free walls next, posterobasal LV / RVOT last; HV ≈ 35–55 ms, so the
 * His–Purkinje step takes the second half of the PR segment.
 */
import type { SlicePreset } from '../app/store';
import type { CycleTruth, LeadName, StructureId, WaveSegment } from '../sim/types';

export const TOUR_STEP_IDS = [
  'sa', 'atria', 'avDelay', 'hisPurkinje', 'septum', 'apexFreeWalls', 'baseRvot', 'plateau', 'repolarization', 'diastole',
] as const;
export type TourStepId = (typeof TOUR_STEP_IDS)[number];

export interface TourAnchor {
  readonly seg: WaveSegment;
  /** 0 = segment start, 1 = segment end. */
  readonly frac: number;
  readonly offMs?: number;
}

export interface TourStep {
  readonly id: TourStepId;
  readonly from: TourAnchor;
  readonly to: TourAnchor;
  /** 'none' = whole heart, no cut. */
  readonly slice: SlicePreset | 'none';
  readonly highlight: readonly StructureId[];
  /** Playback speed while looping the window (0.05 … 1). */
  readonly speed: number;
  readonly lead: LeadName;
}

export const TOUR_STEPS: readonly TourStep[] = [
  // SA firing precedes the visible P onset (the node itself is too small to register).
  { id: 'sa', from: { seg: 'P', frac: 0, offMs: -20 }, to: { seg: 'P', frac: 0, offMs: 12 }, slice: 'none', highlight: ['SA', 'RA'], speed: 0.1, lead: 'II' },
  { id: 'atria', from: { seg: 'P', frac: 0 }, to: { seg: 'P', frac: 1 }, slice: 'fourChamber', highlight: ['RA', 'BACHMANN', 'LA', 'LAA'], speed: 0.25, lead: 'II' },
  { id: 'avDelay', from: { seg: 'PR', frac: 0, offMs: -25 }, to: { seg: 'PR', frac: 0.5 }, slice: 'fourChamber', highlight: ['AVN'], speed: 0.25, lead: 'II' },
  {
    id: 'hisPurkinje', from: { seg: 'PR', frac: 0.5 }, to: { seg: 'QRS', frac: 0, offMs: 5 }, slice: 'fourChamber',
    highlight: ['HIS', 'LBB', 'RBB', 'LAF', 'LPF', 'LSF', 'PURKINJE_LV', 'PURKINJE_RV'], speed: 0.1, lead: 'II',
  },
  { id: 'septum', from: { seg: 'QRS', frac: 0 }, to: { seg: 'QRS', frac: 0.22 }, slice: 'shortMid', highlight: ['SEPTUM'], speed: 0.05, lead: 'V1' },
  {
    id: 'apexFreeWalls', from: { seg: 'QRS', frac: 0.2 }, to: { seg: 'QRS', frac: 0.65 }, slice: 'fourChamber',
    highlight: ['LV_APEX', 'RV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'RV_FREE'], speed: 0.05, lead: 'V5',
  },
  { id: 'baseRvot', from: { seg: 'QRS', frac: 0.6 }, to: { seg: 'QRS', frac: 1 }, slice: 'shortBase', highlight: ['LV_POSTEROBASAL', 'RVOT'], speed: 0.05, lead: 'V6' },
  {
    id: 'plateau', from: { seg: 'ST', frac: 0 }, to: { seg: 'ST', frac: 1 }, slice: 'shortMid',
    highlight: ['SEPTUM', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'RV_FREE'], speed: 0.5, lead: 'II',
  },
  {
    id: 'repolarization', from: { seg: 'T', frac: 0 }, to: { seg: 'T', frac: 1 }, slice: 'longAxis',
    highlight: ['LV_APEX', 'LV_LATERAL', 'LV_ANTERIOR', 'LV_INFERIOR', 'LV_POSTEROBASAL'], speed: 0.25, lead: 'V5',
  },
  { id: 'diastole', from: { seg: 'TP', frac: 0 }, to: { seg: 'TP', frac: 1 }, slice: 'fourChamber', highlight: ['MITRAL', 'TRICUSPID'], speed: 0.5, lead: 'II' },
];

/** Shortest window the player will loop (ms of simulated time). */
export const MIN_WINDOW_MS = 4;
/** Used when the truth has no TP (fast rates: the next P starts before T ends). */
const TP_FALLBACK_MS = 120;

/** Segment span of a cycle, synthesizing ST / TP when the truth omits them (they can vanish at high rates). */
export function segmentSpan(cycle: CycleTruth, seg: WaveSegment): { t0: number; t1: number } | null {
  const s = cycle.segments.find((x) => x.seg === seg);
  if (s) return { t0: s.t0, t1: s.t1 };
  if (seg === 'TP' && cycle.tEnd !== null) return { t0: cycle.tEnd, t1: cycle.tEnd + TP_FALLBACK_MS };
  if (seg === 'ST' && cycle.qrsOff !== null) {
    const t = cycle.segments.find((x) => x.seg === 'T');
    if (t && t.t0 > cycle.qrsOff) return { t0: cycle.qrsOff, t1: t.t0 };
    return { t0: cycle.qrsOff, t1: cycle.qrsOff + MIN_WINDOW_MS };
  }
  return null;
}

export function resolveAnchor(cycle: CycleTruth, a: TourAnchor): number | null {
  const s = segmentSpan(cycle, a.seg);
  if (!s) return null;
  return s.t0 + a.frac * (s.t1 - s.t0) + (a.offMs ?? 0);
}

/** Absolute [t0, t1] window of a step in the given cycle; null if the cycle lacks the anchors. */
export function resolveTourWindow(step: TourStep, cycle: CycleTruth): { t0: number; t1: number } | null {
  const t0 = resolveAnchor(cycle, step.from);
  const t1 = resolveAnchor(cycle, step.to);
  if (t0 === null || t1 === null) return null;
  return { t0, t1: Math.max(t1, t0 + MIN_WINDOW_MS) };
}

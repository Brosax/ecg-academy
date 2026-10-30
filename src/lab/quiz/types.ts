/** Quiz question shapes. Every answer is computed from the engine at generation time (never hand-entered). */
import type { FrankVec, LeadName, StructureId, WaveSegment } from '../sim/types';

export const QUIZ_KINDS = ['segment', 'leadGroup', 'projection', 'structure', 'calipers'] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

export const WALLS = ['inferior', 'lateral', 'septal', 'anterior'] as const;
export type Wall = (typeof WALLS)[number];

/** Conventional lead groups (same as tc('leadgroup.*'); docs/research/lead-geometry-anatomy.md "coronary territories"). */
export const WALL_LEADS: Readonly<Record<Wall, readonly LeadName[]>> = {
  inferior: ['II', 'III', 'aVF'],
  lateral: ['I', 'aVL', 'V5', 'V6'],
  septal: ['V1', 'V2'],
  anterior: ['V3', 'V4'],
};

export type Polarity = 'pos' | 'neg' | 'iso';

/** A one-cycle strip of one lead, drawn from engine.sampleLeads (absolute ms). */
export interface StripSpec {
  readonly lead: LeadName;
  readonly t0: number;
  readonly t1: number;
  /** Marked instant (absolute ms), if the question refers to one. */
  readonly mark?: number;
  /** P onset of the strip's cycle — the strip's time axis is labelled relative to it. */
  readonly zeroMs: number;
}

interface QBase {
  readonly id: string;
}

export interface SegmentQuestion extends QBase {
  readonly kind: 'segment';
  readonly seg: WaveSegment;
  readonly strip: StripSpec;
  readonly answer: { readonly t0: number; readonly t1: number };
}

export interface LeadGroupQuestion extends QBase {
  readonly kind: 'leadGroup';
  readonly wall: Wall;
  readonly answer: readonly LeadName[];
}

export interface ProjectionQuestion extends QBase {
  readonly kind: 'projection';
  readonly tMs: number;
  readonly lead: LeadName;
  /** Heart vector at tMs (Frank, mV) — shown to the student. */
  readonly h: FrankVec;
  readonly strip: StripSpec;
  readonly valueMv: number;
  readonly answer: Polarity;
}

export interface StructureQuestion extends QBase {
  readonly kind: 'structure';
  readonly tMs: number;
  readonly strip: StripSpec;
  readonly options: readonly StructureId[];
  readonly answer: StructureId;
}

export interface CalipersQuestion extends QBase {
  readonly kind: 'calipers';
  readonly strip: StripSpec;
  readonly pOn: number;
  readonly qrsOn: number;
  readonly answerMs: number;
  readonly toleranceMs: number;
}

export type Question = SegmentQuestion | LeadGroupQuestion | ProjectionQuestion | StructureQuestion | CalipersQuestion;

export type QuizResponse =
  | { readonly kind: 'segment'; readonly tMs: number }
  | { readonly kind: 'leadGroup'; readonly leads: readonly LeadName[] }
  | { readonly kind: 'projection'; readonly choice: Polarity }
  | { readonly kind: 'structure'; readonly choice: StructureId }
  | { readonly kind: 'calipers'; readonly t0: number; readonly t1: number };

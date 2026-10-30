/**
 * The shared ECG data model: a multi-lead signal plus (optionally) ground truth and per-beat annotations.
 * Produced by the synthetic engine (src/synth) and the real-ECG decoder (src/real); consumed by the viewer (src/ecg),
 * practice graders (src/practice), lessons and the atlas. Times are milliseconds from the start of the record,
 * voltages millivolts.
 */
import type { ExtraLead, StdLead } from './leads';
import type { FindingId } from './findings';
import type { RegionId } from './regions';

export type LeadSignals = Readonly<Record<StdLead, Float32Array>> & Readonly<Partial<Record<ExtraLead, Float32Array>>>;

export interface EcgSignal {
  /** samples per second */
  readonly fs: number;
  readonly durationMs: number;
  /** millivolts; every array has durationMs * fs / 1000 samples */
  readonly leads: LeadSignals;
}

/** What produced the activation of a ventricular complex. */
export const BEAT_KINDS = [
  'sinus', // conducted from a sinus P wave
  'atrial', // conducted from an ectopic atrial beat (PAC, atrial tachycardia, flutter/fibrillation)
  'junctional',
  'ventricular', // PVC, VT, idioventricular
  'escape-junctional',
  'escape-ventricular',
  'paced-atrial',
  'paced-ventricular',
  'fusion',
  'capture',
] as const;
export type BeatKind = (typeof BEAT_KINDS)[number];

/**
 * Fiducial marks of one ventricular beat (ms). Absent marks are null (e.g. no visible P wave).
 * Convention: pOn/pOff mark the atrial wave that conducted this beat, or the beat's own retrograde P′ (whose AtrialEvent
 * has conductedTo null). Every other visible atrial event (blocked P, non-conducted F wave) is labelled from
 * EcgTruth.atrial alone; the viewer never labels the same wave twice.
 */
export interface BeatMarks {
  readonly kind: BeatKind;
  readonly pOn: number | null;
  readonly pOff: number | null;
  readonly qrsOn: number;
  readonly qrsOff: number;
  /** J point = qrsOff unless a separate J deflection exists */
  readonly j: number;
  readonly tPeak: number | null;
  readonly tOff: number;
  readonly uOff: number | null;
  /** QRS conducted with aberrancy / bundle-branch pattern differs from the dominant beat */
  readonly aberrant: boolean;
}

/** One atrial activation (P wave, flutter wave or a fibrillatory wavelet cluster). */
export interface AtrialEvent {
  readonly t: number;
  readonly kind: 'sinus' | 'ectopic' | 'retrograde' | 'flutter' | 'paced' | 'fibrillation';
  /** did it reach the ventricles (index into beats when it did) */
  readonly conductedTo: number | null;
  /** P wave visible on the surface ECG (not buried in QRS/T) */
  readonly visible: boolean;
}

export interface EcgTruth {
  /** the rhythm label (a finding id from the 'rhythm' category) */
  readonly rhythm: FindingId;
  /** every finding present (rhythm, conduction, axis, morphology…) — what a complete report should list */
  readonly findings: readonly FindingId[];
  readonly regular: boolean;
  readonly hrBpm: number;
  readonly atrialRateBpm: number | null;
  /** dominant-beat intervals (null when not applicable, e.g. PR in AF) */
  readonly prMs: number | null;
  readonly qrsMs: number;
  readonly qtMs: number;
  readonly qtcBazettMs: number;
  readonly qtcFridericiaMs: number;
  /** frontal-plane axes, degrees in (−180, 180], +90 = inferior */
  readonly axisDeg: { readonly p: number | null; readonly qrs: number; readonly t: number };
  readonly beats: readonly BeatMarks[];
  readonly atrial: readonly AtrialEvent[];
  /** ST deviation at J+60 ms of the dominant beat per lead (mV), for ST items and overlays */
  readonly stMv: Readonly<Partial<Record<StdLead | ExtraLead, number>>>;
  /** free-form localisation facts (e.g. infarct territory, culprit artery, accessory-pathway site, VT origin) */
  readonly facts: Readonly<Record<string, string>>;
}

/** Per-region state for the small 3D heart, sampled at a time (filled into `out`, one value per region). */
export interface RegionStates {
  readonly ids: readonly RegionId[];
  /** state code per region: 0 rest · (0,1) depolarizing (fraction activated) · 1 depolarized · (1,2) repolarizing (2 = recovered) */
  stateAt(tMs: number, out: Float32Array): void;
  /** static highlights (e.g. infarct, accessory pathway, ectopic focus): region id → tag */
  readonly highlights: Readonly<Partial<Record<RegionId, 'infarct' | 'ischemia' | 'pathway' | 'focus' | 'block' | 'hypertrophy'>>>;
}

/** Where an ECG came from — shown to the learner and used for attribution. */
export type EcgOrigin =
  | { readonly kind: 'synthetic'; readonly scenarioId: string; readonly seed: number }
  | { readonly kind: 'real'; readonly dataset: 'PTB-XL'; readonly ecgId: number };

export interface Ecg {
  readonly origin: EcgOrigin;
  readonly signal: EcgSignal;
  /** synthetic ECGs always have truth; real ECGs have partial truth (labels + reference measurements) */
  readonly truth: EcgTruth | null;
  readonly regions: RegionStates | null;
}

export function sampleCount(sig: EcgSignal): number {
  return Math.round((sig.durationMs * sig.fs) / 1000);
}

export function sampleAt(arr: Float32Array, fs: number, tMs: number): number {
  const x = (tMs * fs) / 1000;
  const i = Math.floor(x);
  if (i < 0) return arr[0] ?? 0;
  if (i >= arr.length - 1) return arr[arr.length - 1] ?? 0;
  const f = x - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
}

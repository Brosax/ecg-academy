/**
 * Fiducial-anchored beat presets (spec §2.4): the course's HeartBlock and the f1 conduction-journey scene step through
 * the same fiducials of the same beat. Pure; built on anchorBeats.
 */
import { anchorBeats, type AnchoredBeatDef, type BeatFiducials, type Timeline } from './timeline';
import type { SceneKey } from './strings';

export type HeartPhaseId = 'sa' | 'p' | 'pr' | 'qrs' | 'st' | 't';
export const HEART_PHASES: readonly AnchoredBeatDef<HeartPhaseId>[] = [
  { id: 'sa', from: 'start', to: 'pOn' },
  { id: 'p', from: 'pOn', to: 'pOff' },
  { id: 'pr', from: 'pOff', to: 'qrsOn' },
  { id: 'qrs', from: 'qrsOn', to: 'qrsOff' },
  { id: 'st', from: 'qrsOff', to: 'tPeak' },
  { id: 't', from: 'tPeak', to: 'end' },
];

export type JourneyPhaseId = 'p' | 'av' | 'his' | 'qrs' | 'st' | 't';
export const JOURNEY_PHASES: readonly AnchoredBeatDef<JourneyPhaseId>[] = [
  { id: 'p', from: 'start', to: 'pOff' },
  { id: 'av', from: 'pOff', to: 'hisOn' },
  { id: 'his', from: 'hisOn', to: 'qrsOn' },
  { id: 'qrs', from: 'qrsOn', to: 'qrsOff' },
  { id: 'st', from: 'qrsOff', to: 'tPeak' },
  { id: 't', from: 'tPeak', to: 'end' },
];

/** Slow-motion factor of "play one beat" (one beat of ≈ 0.6 s takes ≈ 3 s), as the HeartBlock uses today. */
export const PHASE_SLOW_MOTION = 5;

/** anchorBeats with the HeartBlock clamp (1.5–6 s). */
export function phaseBeats<Id extends string>(defs: readonly AnchoredBeatDef<Id>[], beat: BeatFiducials, slow = PHASE_SLOW_MOTION): Timeline<Id> {
  return anchorBeats(defs, beat, { slow });
}

/** Runtime-dictionary key of each phase label (for a beat bar). */
export const PHASE_LABEL_KEY: Readonly<Record<HeartPhaseId | JourneyPhaseId, SceneKey>> = {
  sa: 'ph_sa',
  p: 'ph_p',
  pr: 'ph_pr',
  av: 'ph_av',
  his: 'ph_his',
  qrs: 'ph_qrs',
  st: 'ph_st',
  t: 'ph_t',
};

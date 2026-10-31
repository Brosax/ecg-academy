/**
 * Scene runtime entry. Scene components (src/figures/scenes/*) import from here; the course imports the pieces it
 * needs through src/figures/index.tsx. See README.md in this folder for the scene-author contract.
 */
export { Predict, type PredictOption, type PredictPhase } from './Predict';
export { SceneFrame } from './SceneFrame';
export { SceneStub } from './SceneStub';
export { SceneTransport } from './SceneTransport';
export { HEART_PHASES, JOURNEY_PHASES, PHASE_LABEL_KEY, PHASE_SLOW_MOTION, phaseBeats, type HeartPhaseId, type JourneyPhaseId } from './phases';
export { sceneEn, sceneEs, sceneZh, tsn, type SceneKey } from './strings';
export {
  anchorBeats,
  beatIndexAt,
  beatTarget,
  compileBeats,
  DEFAULT_CLAMP_MS,
  easeInOut,
  easeOut,
  fiducialTimes,
  frameGate,
  gateInterval,
  HIS_LEAD_MS,
  local,
  MIN_BEAT_FRACTION,
  pOfTime,
  revealed,
  seg,
  splitRange,
  timeOfP,
  tween,
  type AnchoredBeatDef,
  type Beat,
  type BeatDef,
  type BeatFiducials,
  type BeatTargetKind,
  type Fid,
  type Timeline,
} from './timeline';
export { useScene, type SceneState, type UseSceneOptions } from './useScene';

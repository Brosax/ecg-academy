/**
 * Shared types for the schematic blood-flow layer (血流示意). Flow is a pure function of sim time, timed only from
 * engine.cycleAt (CycleTruth valves / mech) — the same truth that drives the valve leaflets and the Wiggers panel.
 *
 * Producers: core/flowTiming.ts (FlowState), core/flowPaths.ts (FlowPath). Consumers: bloodFlow.ts, scene.ts, UI.
 */
import type { ValveId, Vec3 } from '../../sim/types';

/** One streamline through a heart side, from the atrial body across the AV valve to the apex and out the semilunar valve. */
export interface FlowPath {
  /** Valve this leg passes through (its timing gates the leg). */
  readonly valve: ValveId;
  readonly side: 'L' | 'R';
  /** 'in' = atrium → AV valve → ventricle apex; 'out' = apex → outflow tract → semilunar valve → great-artery stub. */
  readonly leg: 'in' | 'out';
  /** Polyline in the heart local frame (mm), resampled at roughly even arc length, in flow direction. */
  readonly pts: readonly Vec3[];
  /** Lumen radius estimate per sample (mm). */
  readonly radiusMm: readonly number[];
  readonly lengthMm: number;
}

/**
 * A stream along one geometry.overlays vessel (core/vesselPaths.ts), in flow direction:
 *   leg 'in'  venous inflow: vein (SVC, IVC, PV_*) → its caval / pulmonary-venous orifice → the atrial body, where the
 *             heart side's 'in' path starts; valve = that side's AV valve, timed by core/venousTiming.ts;
 *   leg 'out' great-artery outflow: from the end of the side's 'out' path (the semilunar stub) along AORTA /
 *             PULMONARY_TRUNK (one stream per pulmonary-artery branch); valve = the semilunar valve, timed like it.
 */
export interface VesselFlowPath extends FlowPath {
  /** Overlay id the stream follows ('SVC', 'IVC', 'PV_RI', …, 'AORTA', 'PULMONARY_TRUNK'). */
  readonly vessel: string;
  /** Patient side of a pulmonary-artery branch when the trunk forks. */
  readonly branch?: 'L' | 'R';
  /** Veins: the orifice lies within a wall gap of the atrial blood (no blood↔Vessel face contact), bridged straight. */
  readonly bridged?: boolean;
}

export const isVesselPath = (p: FlowPath): p is VesselFlowPath => typeof (p as Partial<VesselFlowPath>).vessel === 'string';

/**
 * Per-frame flow state written into a Float32Array(FLOW_STATE_LEN), indexed in VALVES order
 * (MITRAL, TRICUSPID, AORTIC, PULMONARY):
 *   [0..3]  A — cumulative advance of the current valve window, 0..1 (held when the valve is shut);
 *   [4..7]  q — normalised instantaneous flow intensity, 0..1 (0 when the valve is shut / no output).
 */
export const FLOW_STATE_LEN = 8;
export const FLOW_A = 0;
export const FLOW_Q = 4;

/** Caption ids for the fixed-size "blood now" chip (i18n keys view3d `flow.now.<id>`). */
export const FLOW_CAPTION_IDS = [
  'ejection', 'ivc', 'ivr', 'rapidFill', 'diastasis', 'kick', 'cannon', 'dropped', 'noKickAf', 'noOutput', 'idle',
] as const;
export type FlowCaptionId = (typeof FLOW_CAPTION_IDS)[number];

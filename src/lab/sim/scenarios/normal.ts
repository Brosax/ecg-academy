/**
 * Scenario descriptors. A scenario may only change the rhythm generator, the conduction graph, voxel/region
 * parameters or geometry (CLAUDE.md). MVP: normal sinus rhythm (docs/research/disease-spec.md `normal-sinus-rhythm`).
 */
import type { Scenario } from './types';

export type { Scenario } from './types';

export const NORMAL_SCENARIO: Scenario = {
  id: 'normal-sinus-rhythm',
  category: 'normal-sinus',
  // Calibrated on the realistic HRA male heart (tests/calibrate, Nelder–Mead, 2 × 220 evals, 2026-10-08):
  // loss 65.2 → 1.81, 42/42 hard oracles, soft: QRS 82 ms, axis +19°, transition V3, QRS–T angle 35°, SVG 101 mV·ms.
  // Pose change vs the data-derived anatomical pose: 13.4° (bound 15°). Every value lies in its cited range (params.ts).
  params: {
    poseRollDeg: -4.9, poseTiltDeg: -6.9, poseAzimuthDeg: 14.7,
    lafOffsetMs: 10.1, lpfOffsetMs: 1.4, lsfOffsetMs: 5.3, rbbOffsetMs: 1.8,
    purkinjeExtent: 0.769, vMyoTransMps: 0.449, gainMvPerMm2: 7.63e-4,
    apdRefMs: 229.4, gAbMs: 44.1, gTmMs: 26.3, vAtrialMps: 1.0, atrialGainFactor: 0.256,
    apVentricular: { tauUpMs: 2.5, tauRepMs: 26.8, plateauSlope: 0.196, lowpassHz: 150 },
  },
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'V1', 'V5'], highlight: [] },
};

/** Calibrated normal parameters — the base every disease scenario starts from. */
export const NORMAL_PARAMS = NORMAL_SCENARIO.params;

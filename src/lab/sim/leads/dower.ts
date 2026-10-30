/**
 * Dower lead vectors (Frank X left+, Y inferior+, Z posterior+), WCT-referenced.
 * Source: Dower patent US5711304A; cross-checked as the pseudo-inverse of the Edenbrandt–Pahlm inverse Dower
 * (docs/research/lead-geometry-anatomy.md §3a). These rows already contain torso and proximity effects.
 */
import type { FrankVec } from '../types';

export const DOWER: Readonly<Record<'I' | 'II' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6', FrankVec>> = {
  I: [0.632, -0.235, 0.059],
  II: [0.235, 1.066, -0.132],
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
};

/** Extra W-referenced leads from the same patent (round 2: right-sided / posterior leads). */
export const DOWER_EXTRA: Readonly<Record<'V3R' | 'V4R' | 'V5R' | 'V7' | 'V8' | 'V9', FrankVec>> = {
  V3R: [-0.566, 0.162, -0.493],
  V4R: [-0.507, 0.051, -0.257],
  V5R: [-0.456, 0.044, -0.132],
  V7: [0.625, -0.103, 0.338],
  V8: [0.434, -0.096, 0.419],
  V9: [0.221, -0.037, 0.471],
};

/**
 * Electrode layer. Lead vectors per electrode in the WCT gauge (L_RA + L_LA + L_LL = 0), derived from Dower rows:
 *   L_RA = −(L_I + L_II)/3, L_LA = L_RA + L_I, L_LL = L_RA + L_II, L_RL ≈ L_LL (legs ≈ equipotential), L_Vi = Dower Vi.
 * Display positions are landmark-based estimates (app frame, cm; docs/research/lead-geometry-anatomy.md "Unsourced").
 */
import type { ElectrodeField, ElectrodeId, FrankVec, Vec3 } from '../types';
import { DOWER } from './dower';

const addF = (a: FrankVec, b: FrankVec): FrankVec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scaleF = (a: FrankVec, s: number): FrankVec => [a[0] * s, a[1] * s, a[2] * s];

export function dowerElectrodeField(): ElectrodeField {
  const RA = scaleF(addF(DOWER.I, DOWER.II), -1 / 3);
  const LA = addF(RA, DOWER.I);
  const LL = addF(RA, DOWER.II);
  return {
    L: {
      RA, LA, LL, RL: LL,
      V1: DOWER.V1, V2: DOWER.V2, V3: DOWER.V3, V4: DOWER.V4, V5: DOWER.V5, V6: DOWER.V6,
    },
  };
}

/**
 * Standard electrode positions for drawing (app frame, cm; origin = ventricular centroid).
 * Precordial: 4th/5th intercostal landmarks. Limb electrodes drawn at wrists/ankles by the torso view; these are the
 * points where each limb joins the trunk (limbs act as conductors, so the potential is the same).
 */
export const ELECTRODE_POS_CM: Readonly<Record<ElectrodeId, Vec3>> = {
  V1: [-4.5, 0.5, 7.0],
  V2: [-0.5, 0.5, 7.0],
  V3: [3.0, -1.0, 6.5],
  V4: [6.5, -2.5, 5.5],
  V5: [10.5, -2.5, 2.5],
  V6: [13.5, -2.5, -2.5],
  RA: [-18.5, 16, 0],
  LA: [13.5, 16, 0],
  LL: [6, -30, 0],
  RL: [-11, -30, 0],
};

/** Electrode colour codes. AHA (North America) and IEC (Europe/China). */
export const ELECTRODE_COLORS: Readonly<Record<'AHA' | 'IEC', Readonly<Record<ElectrodeId, string>>>> = {
  AHA: {
    RA: '#f5f5f5', LA: '#222222', LL: '#d62828', RL: '#2a9d4b',
    V1: '#d62828', V2: '#e9c46a', V3: '#2a9d4b', V4: '#1d4ed8', V5: '#f08c00', V6: '#7c3aed',
  },
  IEC: {
    RA: '#d62828', LA: '#e9c46a', LL: '#2a9d4b', RL: '#222222',
    V1: '#d62828', V2: '#e9c46a', V3: '#2a9d4b', V4: '#8b5a2b', V5: '#222222', V6: '#7c3aed',
  },
};

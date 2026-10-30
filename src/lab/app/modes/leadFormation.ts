/**
 * How each standard lead is formed from the electrodes (docs/research/lead-geometry-anatomy.md "LEAD MATHEMATICS"):
 * bipolar I/II/III = (+) − (−); Goldberger augmented = (+) − mean of the other two limb electrodes;
 * precordial = chest electrode − Wilson central terminal (RA + LA + LL)/3. RL is ground and never enters a lead.
 */
import type { ElectrodeField, ElectrodeId, FrankVec, LeadName } from '../../sim/types';

export type LeadKind = 'bipolar' | 'augmented' | 'precordial';

export interface LeadFormation {
  readonly lead: LeadName;
  readonly kind: LeadKind;
  readonly plus: ElectrodeId;
  /** The reference is the mean of these electrodes. */
  readonly minus: readonly ElectrodeId[];
}

const WCT: readonly ElectrodeId[] = ['RA', 'LA', 'LL'];

export const LEAD_FORMATION: Readonly<Record<LeadName, LeadFormation>> = {
  I: { lead: 'I', kind: 'bipolar', plus: 'LA', minus: ['RA'] },
  II: { lead: 'II', kind: 'bipolar', plus: 'LL', minus: ['RA'] },
  III: { lead: 'III', kind: 'bipolar', plus: 'LL', minus: ['LA'] },
  aVR: { lead: 'aVR', kind: 'augmented', plus: 'RA', minus: ['LA', 'LL'] },
  aVL: { lead: 'aVL', kind: 'augmented', plus: 'LA', minus: ['RA', 'LL'] },
  aVF: { lead: 'aVF', kind: 'augmented', plus: 'LL', minus: ['RA', 'LA'] },
  V1: { lead: 'V1', kind: 'precordial', plus: 'V1', minus: WCT },
  V2: { lead: 'V2', kind: 'precordial', plus: 'V2', minus: WCT },
  V3: { lead: 'V3', kind: 'precordial', plus: 'V3', minus: WCT },
  V4: { lead: 'V4', kind: 'precordial', plus: 'V4', minus: WCT },
  V5: { lead: 'V5', kind: 'precordial', plus: 'V5', minus: WCT },
  V6: { lead: 'V6', kind: 'precordial', plus: 'V6', minus: WCT },
};

export const LEAD_PICKER_GROUPS: readonly { readonly kind: LeadKind; readonly leads: readonly LeadName[] }[] = [
  { kind: 'bipolar', leads: ['I', 'II', 'III'] },
  { kind: 'augmented', leads: ['aVR', 'aVL', 'aVF'] },
  { kind: 'precordial', leads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] },
];

/** Lead vector rebuilt from electrode lead vectors: L(+) − mean(L(−)). */
export function leadVectorFromElectrodes(field: ElectrodeField, f: LeadFormation): FrankVec {
  const p = field.L[f.plus];
  const m: [number, number, number] = [0, 0, 0];
  for (const e of f.minus) for (let k = 0; k < 3; k++) m[k] += field.L[e][k] / f.minus.length;
  return [p[0] - m[0], p[1] - m[1], p[2] - m[2]];
}

/** Electrodes that appear in a lead (for highlighting the 3D electrodes and the colour legend). */
export const electrodesOf = (f: LeadFormation): readonly ElectrodeId[] => [f.plus, ...f.minus];

/** Ideal hexaxial angles (deg, +90° = inferior) used by the frontal diagram, for comparison with the Dower vectors. */
export const HEXAXIAL_DEG: Readonly<Partial<Record<LeadName, number>>> = { I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 };

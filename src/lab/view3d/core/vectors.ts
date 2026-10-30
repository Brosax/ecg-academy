/**
 * Heart-vector arrow and lead-axis maths (pure). Frank → app conversion only through src/sim/frame.ts.
 * Projection on a lead = L_A·H_A + L_V·H_V from the projector rows, i.e. exactly the value the ECG plots, so the 3D
 * projection segment and the ECG readout agree by construction (= |L|·(H·L̂) when L_A = L_V).
 */
import { APP_TO_FRANK, frankToApp, norm, normalize } from '../../sim/frame';
import type { ElectrodeId, FrankVec, LeadName, LeadProjector, Vec3 } from '../../sim/types';
import { LEADS } from '../../sim/types';

/** Display scale for H and its projections: 1 mV ≈ 4 cm in the app frame. */
export const CM_PER_MV = 4;

export interface ArrowSpec {
  /** Unit direction in the app frame ([0,0,0] when |H| = 0). */
  readonly dir: Vec3;
  readonly mv: number;
  readonly lengthCm: number;
}

/**
 * Allocation-free Frank → app for the frame loop: app = Fᵀ·frank with F = APP_TO_FRANK from frame.ts (orthonormal).
 * Same result as frankToApp (tested).
 */
export function frankToAppInto(out: { [i: number]: number }, x: number, y: number, z: number): void {
  const F = APP_TO_FRANK;
  out[0] = F[0] * x + F[3] * y + F[6] * z;
  out[1] = F[1] * x + F[4] * y + F[7] * z;
  out[2] = F[2] * x + F[5] * y + F[8] * z;
}

/** H = H_A + H_V (Frank, mV, read at offset o of interleaved buffers) → app-frame arrow. */
export function heartVectorArrow(hA: ArrayLike<number>, hV: ArrayLike<number>, o = 0, cmPerMv = CM_PER_MV): ArrowSpec {
  const h: FrankVec = [hA[o] + hV[o], hA[o + 1] + hV[o + 1], hA[o + 2] + hV[o + 2]];
  const app = frankToApp(h);
  const mv = norm(app);
  return { dir: mv > 0 ? normalize(app) : [0, 0, 0], mv, lengthCm: mv * cmPerMv };
}

export type LeadKind = 'bipolar' | 'augmented' | 'precordial';

export interface LeadAxisSpec {
  readonly lead: LeadName;
  readonly kind: LeadKind;
  /** Unit lead direction (ventricular lead vector), app frame. */
  readonly dirApp: Vec3;
  /** |L| — lead "sensitivity" (mV shown per mV of H along L̂). */
  readonly sensitivity: number;
  readonly positive: ElectrodeId;
  /** Electrodes forming the negative pole (averaged when more than one). */
  readonly negative: readonly ElectrodeId[];
  /** Negative pole is Wilson's central terminal (precordial leads). */
  readonly wct: boolean;
}

const POLES: Readonly<Record<LeadName, { kind: LeadKind; pos: ElectrodeId; neg: readonly ElectrodeId[] }>> = {
  I: { kind: 'bipolar', pos: 'LA', neg: ['RA'] },
  II: { kind: 'bipolar', pos: 'LL', neg: ['RA'] },
  III: { kind: 'bipolar', pos: 'LL', neg: ['LA'] },
  aVR: { kind: 'augmented', pos: 'RA', neg: ['LA', 'LL'] },
  aVL: { kind: 'augmented', pos: 'LA', neg: ['RA', 'LL'] },
  aVF: { kind: 'augmented', pos: 'LL', neg: ['RA', 'LA'] },
  V1: { kind: 'precordial', pos: 'V1', neg: ['RA', 'LA', 'LL'] },
  V2: { kind: 'precordial', pos: 'V2', neg: ['RA', 'LA', 'LL'] },
  V3: { kind: 'precordial', pos: 'V3', neg: ['RA', 'LA', 'LL'] },
  V4: { kind: 'precordial', pos: 'V4', neg: ['RA', 'LA', 'LL'] },
  V5: { kind: 'precordial', pos: 'V5', neg: ['RA', 'LA', 'LL'] },
  V6: { kind: 'precordial', pos: 'V6', neg: ['RA', 'LA', 'LL'] },
};

export function leadAxisSpec(projector: LeadProjector, lead: LeadName): LeadAxisSpec {
  const L = projector.leadVector(lead);
  const app = frankToApp(L);
  const p = POLES[lead];
  return { lead, kind: p.kind, dirApp: normalize(app), sensitivity: norm(app), positive: p.pos, negative: p.neg, wct: p.kind === 'precordial' };
}

/** Lead voltage (mV) produced by H_A, H_V (Frank, interleaved at offset o) — identical to the ECG sample. */
export function leadValue(projector: LeadProjector, lead: LeadName, hA: ArrayLike<number>, hV: ArrayLike<number>, o = 0): number {
  const r = LEADS.indexOf(lead) * 3;
  const a = projector.mA, v = projector.mV;
  return a[r] * hA[o] + a[r + 1] * hA[o + 1] + a[r + 2] * hA[o + 2] + v[r] * hV[o] + v[r + 1] * hV[o + 1] + v[r + 2] * hV[o + 2];
}

/** Signed length (cm) of the projection segment drawn along L̂: lead voltage × display scale. */
export const projectionLengthCm = (mv: number, cmPerMv = CM_PER_MV): number => mv * cmPerMv;

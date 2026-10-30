/**
 * Which rate the heart-rate control sets in a scenario — always the pacemaker that drives the ventricles when there
 * is one (sinus node, junction, VT focus, AV-node output in AF); in complete heart block the escape rate is fixed by
 * the escape focus, so the control sets the (dissociated) atrial rate. In atrial flutter the circuit fixes the atrial
 * rate, so the control sets the mean ventricular rate through the AV conduction ratio; in AV-nodal re-entry (AVNRT) it
 * sets the tachycardia rate ('svt'). In VF no pacemaker drives the ventricles: the control is disabled ('none'). In
 * torsades de pointes it sets the underlying sinus rate between the runs (faster rates shorten the QT and suppress the
 * pause-dependent episodes; the run rate is the rotor's own).
 */
import type { Scenario } from './types';

export type RateKind = 'sinus' | 'meanVentricular' | 'vt' | 'junctional' | 'svt' | 'atrial' | 'none' | 'underlyingSinus';

export function rateKind(sc: Scenario): RateKind {
  const r = sc.rhythm;
  if (r.vf) return r.vf.episodes ? 'underlyingSinus' : 'none';
  if (r.af || r.flutter) return 'meanVentricular';
  if (r.vt) return 'vt';
  if (r.junctional) return r.junctional.reentry ? 'svt' : 'junctional';
  if (r.av?.mode === 'complete') return 'atrial';
  return 'sinus';
}

/** The scenario sets its own rate: switching to it must not adopt (or overwrite) the student's sinus rate. */
export const ownsRate = (sc: Scenario): boolean => sc.rhythm.bpm !== undefined || !['sinus', 'atrial'].includes(rateKind(sc));

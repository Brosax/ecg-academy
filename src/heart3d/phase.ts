/**
 * Which part of the cardiac cycle the heart is in at the cursor — the link the 3D view makes to the ECG
 * (atrial depolarization ↔ P wave, AV conduction ↔ PR segment, ventricular depolarization ↔ QRS, plateau ↔ ST segment,
 * ventricular repolarization ↔ T wave, electrical diastole ↔ TP segment). Pure.
 */
import { REGIONS, type RegionId } from '../core/regions';
import { classifyState } from './colors';

export const CARDIAC_PHASES = ['rest', 'atrial', 'av', 'qrs', 'st', 't'] as const;
export type CardiacPhase = (typeof CARDIAC_PHASES)[number];

/** Classify the phase from one RegionStates sample (`states[i]` belongs to `ids[i]`). */
export function cardiacPhase(ids: readonly RegionId[], states: ArrayLike<number>): CardiacPhase {
  let vDep = false, vPlateau = false, vRepol = false, aDep = false, aDone = false, cond = false, condDone = false, hasCond = false;
  for (let i = 0; i < ids.length; i++) {
    const def = REGIONS[ids[i]];
    if (!def) continue;
    const { phase } = classifyState(states[i]);
    if (def.group === 'lv' || def.group === 'rv') {
      if (phase === 'depolarizing') vDep = true;
      else if (phase === 'depolarized') vPlateau = true;
      else if (phase === 'repolarizing') vRepol = true;
    } else if (def.group === 'atria') {
      if (phase === 'depolarizing') aDep = true;
      else if (phase === 'depolarized' || phase === 'repolarizing') aDone = true;
    } else if (ids[i] !== 'sa-node' && ids[i] !== 'purkinje') {
      // AV node, His bundle and bundle branches carry the impulse during the PR segment
      hasCond = true;
      if (phase === 'depolarizing') cond = true;
      else if (phase === 'depolarized') condDone = true;
    }
  }
  if (vDep) return 'qrs';
  if (aDep) return 'atrial';
  if (vRepol) return 't';
  if (vPlateau) return 'st';
  // the impulse travelling through the AV junction (or, without conduction states, atria done and ventricles waiting)
  if (cond || (aDone && (condDone || !hasCond))) return 'av';
  return 'rest';
}

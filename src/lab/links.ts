/**
 * Deep links into the Heart Lab: which ECG Academy finding (src/core/findings.ts) the lab's voxel engine can show, and
 * the lab scenario (src/lab/sim/scenarios/library.ts) that shows it. Several findings may open the same scenario when
 * that scenario's tracing demonstrates them (e.g. complete heart block → AV dissociation, ventricular escape rhythm).
 * Kept free of runtime imports so pages can link to the lab without loading the engine; tests/lab/links.test.ts checks
 * every value against the scenario library.
 */
import type { FindingId } from '../core/findings';
import type { DiseaseId } from './app/modes/diseaseCatalog';

/** Checked at compile time: keys are finding ids, values are ids of the lab's disease catalogue. */
const TABLE = {
  // ── normal & sinus rhythms
  'normal-ecg': 'normal-sinus-rhythm',
  'sinus-rhythm': 'normal-sinus-rhythm',
  'sinus-bradycardia': 'sinus-bradycardia',
  'sinus-tachycardia': 'sinus-tachycardia',
  'sinus-arrhythmia': 'sinus-arrhythmia',

  // ── premature beats, supraventricular and ventricular rhythms
  pac: 'premature-atrial-contraction',
  pvc: 'premature-ventricular-contraction',
  'atrial-fibrillation': 'atrial-fibrillation',
  'atrial-flutter': 'atrial-flutter-typical',
  avnrt: 'avnrt',
  /** the lab's regular narrow-complex SVT is AV nodal re-entry */
  svt: 'avnrt',
  'junctional-escape-rhythm': 'junctional-escape-rhythm',
  'vt-monomorphic': 'monomorphic-vt',
  torsades: 'torsades-de-pointes',
  /** torsades de pointes is the polymorphic VT the lab simulates */
  'vt-polymorphic': 'torsades-de-pointes',
  'ventricular-fibrillation': 'ventricular-fibrillation',

  // ── AV conduction
  'av-block-1': 'first-degree-av-block',
  'av-block-2-mobitz1': 'mobitz-i-wenckebach',
  'av-block-2-mobitz2': 'mobitz-ii',
  'av-block-3': 'complete-heart-block',
  /** complete heart block: P waves and the escape rhythm march independently */
  'av-dissociation': 'complete-heart-block',
  /** complete heart block's escape focus is ventricular (LV apex, 35/min, wide QRS) */
  'ventricular-escape-rhythm': 'complete-heart-block',

  // ── intraventricular conduction, pre-excitation, axis
  rbbb: 'rbbb',
  lbbb: 'lbbb',
  lafb: 'lafb',
  lpfb: 'lpfb',
  wpw: 'wpw-left-lateral',
  /** the short PR of pre-excitation (with the delta wave) */
  'short-pr': 'wpw-left-lateral',
  /** left anterior fascicular block swings the frontal axis left */
  lad: 'lafb',
  /** left posterior fascicular block swings the frontal axis right */
  rad: 'lpfb',

  // ── ischaemia & infarction
  'stemi-anterior': 'anterior-stemi-lad',
  /** proximal LAD: anterior, anteroseptal and apical segments injured */
  'stemi-anteroseptal': 'anterior-stemi-lad',
  'stemi-inferior': 'inferior-stemi-rca',
  /** inferior STEMI: reciprocal ST depression in I and aVL by projection of the same injury vector */
  'reciprocal-changes': 'inferior-stemi-rca',
  'stemi-lateral': 'lateral-stemi',
  'stemi-posterior': 'posterior-mi',
  'st-depression-ischemic': 'subendocardial-ischemia-nstemi',
  /** circumferential subendocardial injury: diffuse ST depression with ST elevation in aVR */
  'avr-elevation-diffuse-std': 'subendocardial-ischemia-nstemi',
  'pathological-q': 'old-mi-q-waves',
  'old-mi-inferior': 'old-mi-q-waves',

  // ── chambers
  lvh: 'lvh',
  /** the lab's LVH scenario includes the secondary ("strain") ST-T changes */
  'lvh-strain': 'lvh',
  rvh: 'rvh',

  // ── repolarization, electrolytes, drugs, other
  hyperkalemia: 'hyperkalemia',
  'peaked-t': 'hyperkalemia',
  hypokalemia: 'hypokalemia',
  'u-waves': 'hypokalemia',
  hypercalcemia: 'hypercalcemia',
  hypocalcemia: 'hypocalcemia',
  'long-qt': 'long-qt-syndrome',
  'digoxin-effect': 'digoxin-effect',
  hypothermia: 'hypothermia',
  'osborn-waves': 'hypothermia',
  pericarditis: 'acute-pericarditis',
  'brugada-type1': 'brugada-type-1',
  'pulmonary-embolism': 'pulmonary-embolism-s1q3t3',
} as const satisfies Partial<Record<FindingId, DiseaseId>>;

/** Finding → lab scenario id. */
export const LAB_SCENARIOS: Readonly<Partial<Record<FindingId, string>>> = TABLE;

/** The Heart Lab route for a finding (`#/lab/<scenarioId>`), or null when the lab cannot show it. */
export function labHref(findingId: FindingId): string | null {
  const id = LAB_SCENARIOS[findingId];
  return id ? `#/lab/${id}` : null;
}

/**
 * Planned disease library (round 2) — ids, categories and priorities copied from docs/research/disease-spec.json
 * (a test keeps them in sync). Names live in src/i18n/modes as 'dz.<id>'. Nothing here is simulated yet.
 */
export const DISEASE_CATEGORIES = [
  'normal-sinus', 'supraventricular', 'ventricular', 'av-conduction', 'intraventricular-conduction', 'pre-excitation',
  'ischemia-infarction', 'hypertrophy', 'electrolyte-drug-qt', 'other',
] as const;
export type DiseaseCategory = (typeof DISEASE_CATEGORIES)[number];

export const DISEASE_IDS = [
  'normal-sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia', 'premature-atrial-contraction',
  'premature-ventricular-contraction', 'atrial-fibrillation', 'atrial-flutter-typical', 'avnrt', 'monomorphic-vt',
  'ventricular-fibrillation', 'torsades-de-pointes', 'junctional-escape-rhythm', 'first-degree-av-block',
  'mobitz-i-wenckebach', 'mobitz-ii', 'complete-heart-block', 'rbbb', 'lbbb', 'lafb', 'lpfb', 'wpw-left-lateral',
  'anterior-stemi-lad', 'inferior-stemi-rca', 'lateral-stemi', 'posterior-mi', 'subendocardial-ischemia-nstemi',
  'old-mi-q-waves', 'lvh', 'rvh', 'hyperkalemia', 'hypokalemia', 'hypercalcemia', 'hypocalcemia', 'long-qt-syndrome',
  'acute-pericarditis', 'brugada-type-1', 'hypothermia', 'digoxin-effect', 'pulmonary-embolism-s1q3t3',
] as const;
export type DiseaseId = (typeof DISEASE_IDS)[number];

export type DiseasePriority = 'P1' | 'P2' | 'P3';

export interface DiseaseEntry {
  readonly id: DiseaseId;
  readonly category: DiseaseCategory;
  readonly priority: DiseasePriority;
}

const E = (id: DiseaseId, category: DiseaseCategory, priority: DiseasePriority): DiseaseEntry => ({ id, category, priority });

export const DISEASES: readonly DiseaseEntry[] = [
  E('normal-sinus-rhythm', 'normal-sinus', 'P1'),
  E('sinus-bradycardia', 'normal-sinus', 'P1'),
  E('sinus-tachycardia', 'normal-sinus', 'P1'),
  E('sinus-arrhythmia', 'normal-sinus', 'P2'),
  E('premature-atrial-contraction', 'supraventricular', 'P1'),
  E('premature-ventricular-contraction', 'ventricular', 'P1'),
  E('atrial-fibrillation', 'supraventricular', 'P1'),
  E('atrial-flutter-typical', 'supraventricular', 'P1'),
  E('avnrt', 'supraventricular', 'P2'),
  E('monomorphic-vt', 'ventricular', 'P1'),
  E('ventricular-fibrillation', 'ventricular', 'P1'),
  E('torsades-de-pointes', 'ventricular', 'P2'),
  E('junctional-escape-rhythm', 'supraventricular', 'P2'),
  E('first-degree-av-block', 'av-conduction', 'P1'),
  E('mobitz-i-wenckebach', 'av-conduction', 'P1'),
  E('mobitz-ii', 'av-conduction', 'P1'),
  E('complete-heart-block', 'av-conduction', 'P1'),
  E('rbbb', 'intraventricular-conduction', 'P1'),
  E('lbbb', 'intraventricular-conduction', 'P1'),
  E('lafb', 'intraventricular-conduction', 'P2'),
  E('lpfb', 'intraventricular-conduction', 'P2'),
  E('wpw-left-lateral', 'pre-excitation', 'P1'),
  E('anterior-stemi-lad', 'ischemia-infarction', 'P1'),
  E('inferior-stemi-rca', 'ischemia-infarction', 'P1'),
  E('lateral-stemi', 'ischemia-infarction', 'P1'),
  E('posterior-mi', 'ischemia-infarction', 'P2'),
  E('subendocardial-ischemia-nstemi', 'ischemia-infarction', 'P2'),
  E('old-mi-q-waves', 'ischemia-infarction', 'P2'),
  E('lvh', 'hypertrophy', 'P1'),
  E('rvh', 'hypertrophy', 'P2'),
  E('hyperkalemia', 'electrolyte-drug-qt', 'P1'),
  E('hypokalemia', 'electrolyte-drug-qt', 'P2'),
  E('hypercalcemia', 'electrolyte-drug-qt', 'P3'),
  E('hypocalcemia', 'electrolyte-drug-qt', 'P3'),
  E('long-qt-syndrome', 'electrolyte-drug-qt', 'P2'),
  E('acute-pericarditis', 'other', 'P2'),
  E('brugada-type-1', 'other', 'P2'),
  E('hypothermia', 'other', 'P3'),
  E('digoxin-effect', 'electrolyte-drug-qt', 'P3'),
  E('pulmonary-embolism-s1q3t3', 'other', 'P3'),
];

/** The rhythm the MVP actually simulates. */
export const CURRENT_MODEL: DiseaseId = 'normal-sinus-rhythm';

export function diseasesByCategory(): { readonly category: DiseaseCategory; readonly items: readonly DiseaseEntry[] }[] {
  return DISEASE_CATEGORIES.map((category) => ({ category, items: DISEASES.filter((d) => d.category === category) })).filter(
    (g) => g.items.length > 0,
  );
}

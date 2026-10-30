/**
 * Lead definitions shared by the synthetic engine, the real-ECG decoder and the viewer.
 * Standard 12 leads + optional extra leads (right-sided V3R/V4R, posterior V7–V9) that only the synthetic engine can
 * produce — used to teach RV and posterior infarction.
 */
export const STD_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type StdLead = (typeof STD_LEADS)[number];

export const EXTRA_LEADS = ['V3R', 'V4R', 'V7', 'V8', 'V9'] as const;
export type ExtraLead = (typeof EXTRA_LEADS)[number];

export type Lead = StdLead | ExtraLead;

export const LIMB_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] as const satisfies readonly StdLead[];
export const CHEST_LEADS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const satisfies readonly StdLead[];

/** Cabrera (orderly) sequence of the limb leads: aVL, I, −aVR, II, aVF, III. */
export const CABRERA_LIMB = ['aVL', 'I', '-aVR', 'II', 'aVF', 'III'] as const;

/** Frontal-plane angle of each limb lead's positive pole (hexaxial reference system, degrees, +90° = inferior). */
export const LIMB_ANGLE_DEG: Readonly<Record<(typeof LIMB_LEADS)[number], number>> = {
  I: 0,
  II: 60,
  III: 120,
  aVR: -150,
  aVL: -30,
  aVF: 90,
};

/** Contiguous lead groups (territories) used for ST criteria and infarct localisation. */
export const LEAD_GROUPS = {
  inferior: ['II', 'III', 'aVF'],
  highLateral: ['I', 'aVL'],
  lowLateral: ['V5', 'V6'],
  septal: ['V1', 'V2'],
  anterior: ['V3', 'V4'],
  rightVentricular: ['V3R', 'V4R'],
  posterior: ['V7', 'V8', 'V9'],
} as const satisfies Readonly<Record<string, readonly Lead[]>>;

/**
 * Derive III, aVR, aVL, aVF from I and II (Einthoven / Goldberger). Used by the real-ECG decoder (PTB-XL stores
 * derived limb leads that agree with these to ±1.5 µV) and as the identity checked by the synthetic-engine tests.
 */
export function deriveLimbLeads(I: Float32Array, II: Float32Array): {
  III: Float32Array;
  aVR: Float32Array;
  aVL: Float32Array;
  aVF: Float32Array;
} {
  const n = I.length;
  const III = new Float32Array(n), aVR = new Float32Array(n), aVL = new Float32Array(n), aVF = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const a = I[k], b = II[k];
    III[k] = b - a;
    aVR[k] = -(a + b) / 2;
    aVL[k] = a - b / 2;
    aVF[k] = b - a / 2;
  }
  return { III, aVR, aVL, aVF };
}

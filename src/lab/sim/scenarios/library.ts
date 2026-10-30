/**
 * Implemented disease scenarios (round 2). Each starts from the calibrated normal parameters and changes only what
 * its mechanism changes (docs/research/disease-spec.md for criteria, mechanism and test oracles).
 */
import { BRUGADA_TYPE_1, HYPOTHERMIA } from './batch3/apNotch';
import { LAFB, LPFB } from './batch3/fascicles';
import { LVH, RVH } from './batch3/hypertrophy';
import { HYPOKALEMIA } from './batch3/hypokalemia';
import { ATRIAL_FLUTTER_TYPICAL, AVNRT } from './batch3/supraventricularReentry';
import { TORSADES_DE_POINTES, VENTRICULAR_FIBRILLATION } from './batch3/ventricularField';
import { defineScenario } from './define';
import { NORMAL_PARAMS, NORMAL_SCENARIO } from './normal';
import type { Scenario, VentricularVariantSpec } from './types';

const sc = defineScenario;

/**
 * Left bundle branch block: the left bundle (all three left fascicles) does not conduct. The septum is activated from
 * the right side (no septal q in I / aVL / V5–V6), the LV free wall late through the muscle; its Purkinje network is
 * entered retrogradely once the transseptal front reaches it. Transseptal conduction is slow (right → left over
 * ≈ 40–60 ms; septum ×0.35) and LV free-wall conduction modestly reduced (×0.8), as measured in LBBB patients; on the
 * small HRA heart this gives QRS ≈ 135 ms. APD map unchanged — the discordant ST-T follows from the reversed activation
 * order (secondary repolarization change).
 */
export const LBBB = sc({
  id: 'lbbb',
  category: 'intraventricular-conduction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: {
    main: {
      id: 'lbbb',
      blockTerminals: ['LAF', 'LPF', 'LSF'],
      retroDelayMs: 4,
      speed: [
        { regions: ['SEPTUM'], factor: 0.35 },
        { regions: ['LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'LV_APEX'], factor: 0.8 },
      ],
    },
  },
  teach: { keyLeads: ['V1', 'V6', 'I', 'aVL'], highlight: ['LBB', 'SEPTUM', 'LV_LATERAL', 'LV_POSTEROBASAL'] },
});

/**
 * Acute inferior STEMI (RCA occlusion). Transmural current of injury in the RCA territory: mid/apical inferior and
 * inferoseptal segments (9, 10, 15) fully, basal inferior / inferoseptal (3, 4) partially. Plateau reduction ε and
 * resting depolarization r scale those voxels' source (a = 1 − ε − r); the residual Σ c·a ≠ 0 at the plateau is the ST
 * injury vector — it points from the healthy toward the injured epicardium (inferior, slightly posterior), giving ST
 * elevation in II, III, aVF (III > II) and reciprocal depression in I and aVL purely by projection.
 * ε/r chosen for clinical magnitudes (0.1–0.5 mV) on the HRA heart.
 */
export const INFERIOR_STEMI = sc({
  id: 'inferior-stemi-rca',
  category: 'ischemia-infarction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: {
    injury: [
      { aha: [9, 10, 15], plateauDrop: 0.35, restRise: 0.15 },
      { aha: [3, 4], plateauDrop: 0.15, restRise: 0.07 },
    ],
  },
  teach: { keyLeads: ['II', 'III', 'aVF', 'aVL', 'I', 'V2'], highlight: ['LV_INFERIOR', 'SEPTUM'], overlays: ['RCA', 'PDA'] },
});

/**
 * Atrial fibrillation: five meandering rotors (three in the LA, two in the RA; cycle length 135–170 ms → 350–440/min,
 * dominant atrial frequency ≈ 6–7.5 Hz) replace the sinus beats; remodelled short atrial APD. The AV node filters the
 * bombardment (ERP + stochastic recovery + concealed conduction) → irregularly irregular, narrow-QRS rhythm whose mean
 * rate is the heart-rate slider. No P waves; no atrial systole.
 */
export const ATRIAL_FIBRILLATION = sc({
  id: 'atrial-fibrillation',
  category: 'supraventricular',
  rhythm: {
    bpm: 110,
    af: {
      cycleMs: [135, 150, 162, 142, 170],
      nLa: 3,
      cvMmPerMs: 0.5,
      meanderMm: 5,
      meanderTurns: [2, 3, 2, 3, 4],
      apdFrac: 0.5,
      tauRepMs: 15,
      amplitude: 1,
      periodMs: 10000,
      avn: { spreadFrac: 0.8, concealFrac: 0.35, decrementMs: 40, decayMs: 150, minRrMs: 300 },
      seed: 7,
    },
  },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  // the fibrillating atria are the visual; only the AV node (the filter) is highlighted
  teach: { keyLeads: ['V1', 'II', 'aVF', 'V6'], highlight: ['AVN'] },
});

// ---------------------------------------------------------------- batch 1: sinus rhythms

/**
 * Right-bundle-branch conduction failure: the RBB does not conduct and the RV Purkinje network is not engaged, so the RV
 * is activated cell to cell from the septum; RV muscle factor 0.8 compensates the small HRA heart (normal QRS 78 ms).
 */
const RBB_BLOCK = {
  blockTerminals: ['RBB'],
  retroDelayMs: 4,
  purkinjeExclude: ['RV_FREE', 'RV_APEX', 'RVOT'],
  speed: [{ regions: ['RV_FREE', 'RV_APEX', 'RVOT'], factor: 0.8 }],
} as const satisfies Omit<VentricularVariantSpec, 'id'>;

/** Sinus bradycardia: the SA node fires at 48/min; conduction normal; absolute QT longer, QTc normal (rate adaptation). */
export const SINUS_BRADYCARDIA = sc({
  id: 'sinus-bradycardia',
  category: 'normal-sinus',
  rhythm: { bpm: 48 },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'I', 'aVF', 'V1'], highlight: ['SA'] },
});

/** Sinus tachycardia: the SA node fires at 125/min; AV-node delay and APD shorten with the rate (PR and QT shorter). */
export const SINUS_TACHYCARDIA = sc({
  id: 'sinus-tachycardia',
  category: 'normal-sinus',
  rhythm: { bpm: 125 },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'I', 'aVF', 'V1'], highlight: ['SA'] },
});

/** Respiratory sinus arrhythmia: the SA cycle is modulated ±12 % with a 4 s breathing period (PP range ≈ 200 ms). */
export const SINUS_ARRHYTHMIA = sc({
  id: 'sinus-arrhythmia',
  category: 'normal-sinus',
  rhythm: { bpm: 70, respiratory: { depth: 0.12, periodMs: 4000 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'I', 'aVF'], highlight: ['SA'] },
});

// ---------------------------------------------------------------- batch 1: premature beats

/**
 * Premature atrial contraction from the low right atrium near the coronary-sinus ostium (every 4th beat, coupling 0.65):
 * the atria activate from below → different P′ axis; the AV node conducts it a little slower (not fully recovered);
 * the SA node is reset → non-compensatory pause.
 */
export const PREMATURE_ATRIAL_CONTRACTION = sc({
  id: 'premature-atrial-contraction',
  category: 'supraventricular',
  rhythm: { ectopy: { comp: 'A', variant: 'pac', every: 4, couplingFrac: 0.65 } },
  atrial: { main: { id: 'sinus' }, alt: { id: 'pac', origin: [-25, 28, -18] } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'III', 'aVF', 'V1'], highlight: ['RA'], overlays: ['CORONARY_SINUS'] },
});

/**
 * Premature ventricular contraction from the right ventricular outflow tract (every 4th beat, coupling 0.55): the beat
 * starts in the muscle (no His–Purkinje) → wide LBBB-like QRS with an inferior axis and discordant ST-T; the next sinus
 * P finds the AV node / ventricles refractory → compensatory pause.
 */
export const PREMATURE_VENTRICULAR_CONTRACTION = sc({
  id: 'premature-ventricular-contraction',
  category: 'ventricular',
  rhythm: { ectopy: { comp: 'V', variant: 'pvc', every: 4, couplingFrac: 0.55 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' }, alt: { id: 'pvc', ectopic: { at: 'RVOT', layer: 'endo' } } },
  teach: { keyLeads: ['V1', 'II', 'III', 'aVF', 'aVL'], highlight: ['RVOT'] },
});

// ---------------------------------------------------------------- batch 1: AV conduction

/** First-degree AV block: every P conducts, with a constant PR of 280 ms (slow AV-node conduction). */
export const FIRST_DEGREE_AV_BLOCK = sc({
  id: 'first-degree-av-block',
  category: 'av-conduction',
  rhythm: { av: { mode: 'first-degree', prMs: 280 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'V1'], highlight: ['AVN'] },
});

/**
 * Second-degree AV block, Mobitz I (Wenckebach) 4:3: the PR grows by decreasing increments (180 → 270 → 315 ms) until a
 * P is blocked in the AV node; the PR after the pause is the shortest again.
 */
export const MOBITZ_I_WENCKEBACH = sc({
  id: 'mobitz-i-wenckebach',
  category: 'av-conduction',
  rhythm: { av: { mode: 'wenckebach', ratio: 4, prMs: 180, incrementMs: 90 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'V1'], highlight: ['AVN'] },
});

/**
 * Second-degree AV block, Mobitz II 4:3: constant PR, every 4th P blocked below the His bundle, on a background right
 * bundle branch block (infra-Hisian disease → wide QRS). The spec's RBBB + LAFB teaching configuration is not used:
 * blocking the left anterior fascicle on this heart does not produce the left axis deviation of LAFB.
 */
export const MOBITZ_II = sc({
  id: 'mobitz-ii',
  category: 'av-conduction',
  rhythm: { av: { mode: 'mobitz2', ratio: 4, site: 'His' } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { ...RBB_BLOCK, id: 'rbbb' } },
  teach: { keyLeads: ['II', 'V1', 'I', 'V6'], highlight: ['HIS', 'RBB'] },
});

/**
 * Complete (third-degree) AV block: no P conducts; the sinus node keeps its rate while a ventricular escape focus
 * (LV apex) fires independently at 35/min → AV dissociation with wide escape complexes.
 */
export const COMPLETE_HEART_BLOCK = sc({
  id: 'complete-heart-block',
  category: 'av-conduction',
  rhythm: { av: { mode: 'complete', escape: { variant: 'ventricular-escape', bpm: 35 } } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' }, alt: { id: 'ventricular-escape', ectopic: { at: 'LV_APEX', layer: 'endo' } } },
  teach: { keyLeads: ['II', 'V1', 'aVF'], highlight: ['AVN', 'HIS', 'LV_APEX'] },
});

// ---------------------------------------------------------------- batch 1: intraventricular conduction / pre-excitation

/**
 * Right bundle branch block: the RBB does not conduct; the septum still activates left → right, then the RV is reached
 * through the muscle late → terminal rightward-anterior forces (rsR′ in V1, wide S in I and V6), secondary T inversion V1–V3.
 */
export const RBBB = sc({
  id: 'rbbb',
  category: 'intraventricular-conduction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { ...RBB_BLOCK, id: 'rbbb' } },
  teach: { keyLeads: ['V1', 'V2', 'I', 'V6'], highlight: ['RBB', 'RV_FREE', 'RVOT'] },
});

/**
 * Wolff–Parkinson–White, left lateral accessory pathway: the LV base next to the lateral mitral annulus is activated
 * through the pathway before the AV node delivers the impulse → short PR, delta wave, fusion QRS (type A: R in V1;
 * negative delta in I/aVL), secondary ST-T changes.
 */
export const WPW_LEFT_LATERAL = sc({
  id: 'wpw-left-lateral',
  category: 'pre-excitation',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'wpw', accessory: { at: [26, 41, -3], tMs: -20 } } },
  teach: { keyLeads: ['V1', 'I', 'aVL', 'V4', 'II'], highlight: ['LV_LATERAL', 'MITRAL'] },
});

// ---------------------------------------------------------------- batch 1: ischaemia / infarction

/** Anterior STEMI (proximal LAD): current of injury in the anterior, anteroseptal and apical segments. */
export const ANTERIOR_STEMI = sc({
  id: 'anterior-stemi-lad',
  category: 'ischemia-infarction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  // core anterior/apical segments, septal ones (2, 8, 14) less severely injured
  tissue: {
    injury: [
      { aha: [1, 7, 13, 17], plateauDrop: 0.45, restRise: 0.2 },
      { aha: [2, 8, 14], plateauDrop: 0.3, restRise: 0.12 },
    ],
  },
  teach: { keyLeads: ['V2', 'V3', 'V4', 'V1', 'I', 'aVL', 'III'], highlight: ['LV_ANTERIOR', 'SEPTUM', 'LV_APEX'], overlays: ['LAD'] },
});

/**
 * Lateral STEMI (circumflex / obtuse marginal): current of injury in the anterolateral and apical-lateral segments
 * (6, 12, 16). The injury vector points left and slightly back → elevation in I, aVL, V5, V6, depression in III, aVF
 * and V1–V3.
 */
export const LATERAL_STEMI = sc({
  id: 'lateral-stemi',
  category: 'ischemia-infarction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: { injury: [{ aha: [6, 12, 16], plateauDrop: 0.35, restRise: 0.15 }] },
  teach: { keyLeads: ['I', 'aVL', 'V5', 'V6', 'III', 'aVF'], highlight: ['LV_LATERAL'], overlays: ['LCX_OM'] },
});

/**
 * Old inferior myocardial infarction: the inferior segments are scar (non-excitable, insulating) → the missing
 * inferior wavefront leaves the opposite forces unopposed → pathological Q waves in II, III, aVF; no current of injury.
 */
export const OLD_MI_Q_WAVES = sc({
  id: 'old-mi-q-waves',
  category: 'ischemia-infarction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: { dead: [{ aha: [4, 10, 15] }] },
  // the grey scar is the visual (a region highlight would tint it); the culprit artery glows
  teach: { keyLeads: ['II', 'III', 'aVF'], highlight: [], overlays: ['RCA', 'PDA'] },
});

// ---------------------------------------------------------------- batch 2: ectopic and escape rhythms

/**
 * Sustained monomorphic VT from the border of an old apical scar: every beat exits at the same LV apical site and
 * spreads through the muscle (wide QRS, negative precordial concordance); the sinus node keeps firing (AV dissociation).
 */
export const MONOMORPHIC_VT = sc({
  id: 'monomorphic-vt',
  category: 'ventricular',
  rhythm: { bpm: 75, vt: { variant: 'vt', bpm: 150 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' }, alt: { id: 'vt', ectopic: { at: 'LV_APEX', layer: 'endo' } } },
  tissue: { dead: [{ aha: [17] }] },
  teach: { keyLeads: ['V1', 'V3', 'V6', 'II', 'aVR'], highlight: ['LV_APEX'] },
});

/**
 * Junctional escape rhythm: the sinus node is silent (sinus arrest); the AV junction takes over at 50/min, activating
 * the ventricles through the His bundle (narrow QRS) and the atria retrogradely (inverted P′ in II, III, aVF right
 * after the QRS).
 */
export const JUNCTIONAL_ESCAPE = sc({
  id: 'junctional-escape-rhythm',
  category: 'supraventricular',
  // retrograde conduction junction → atria ≈ 110 ms after the His event: P′ right after the QRS
  rhythm: { junctional: { bpm: 50, retroVariant: 'retrograde', retroDelayMs: 110 } },
  atrial: { main: { id: 'sinus' }, alt: { id: 'retrograde', origin: 'AVN' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'III', 'aVF', 'aVR'], highlight: ['AVN', 'HIS'] },
});

// ---------------------------------------------------------------- batch 2: ischaemia / pericardium

/**
 * Posterior (inferolateral) STEMI: current of injury in the basal and mid inferolateral segments (circumflex or a
 * dominant right coronary artery) → posterior injury vector → mirror-image ST depression in V1–V3.
 */
export const POSTERIOR_MI = sc({
  id: 'posterior-mi',
  category: 'ischemia-infarction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: { injury: [{ aha: [5, 11], plateauDrop: 0.35, restRise: 0.15 }] },
  teach: { keyLeads: ['V1', 'V2', 'V3', 'V6'], highlight: ['LV_POSTEROBASAL'], overlays: ['LCX_OM'] },
});

/**
 * Subendocardial ischaemia (NSTEMI pattern): the inner third of the whole LV wall is injured (circumferential, e.g.
 * left main or three-vessel disease) → injury vector into the cavity → widespread ST depression, ST elevation in aVR.
 */
export const NSTEMI = sc({
  id: 'subendocardial-ischemia-nstemi',
  category: 'ischemia-infarction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: { injury: [{ aha: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], layer: 'subendocardial', plateauDrop: 0.3, restRise: 0.12 }] },
  teach: { keyLeads: ['V5', 'V6', 'I', 'II', 'aVR', 'V4'], highlight: [] },
});

/**
 * Acute pericarditis: superficial (epicardial) injury of both ventricles and both atria. The open "cup" of injured
 * ventricular epicardium gives an injury vector toward the apex (diffuse ST elevation, depression in aVR); the injured
 * atrial epicardium does the same during the atrial plateau, pointing up (PR depression, PR elevation in aVR). The thin
 * RV wall is less injured (0.05 vs 0.15), otherwise the anterior RV surface would dominate the vector. The atrial injury
 * is kept mild (0.1): its current builds up while the atria depolarize and a stronger one cancels the P wave.
 */
export const ACUTE_PERICARDITIS = sc({
  id: 'acute-pericarditis',
  category: 'other',
  rhythm: { bpm: 100 },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: {
    injury: [
      { aha: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], layer: 'epicardial', plateauDrop: 0.15, restRise: 0.05 },
      { regions: ['RV_FREE', 'RV_APEX', 'RVOT'], layer: 'epicardial', plateauDrop: 0.05, restRise: 0.017 },
      { regions: ['RA', 'LA', 'LAA'], layer: 'epicardial', plateauDrop: 0.1, restRise: 0.025 },
    ],
  },
  teach: { keyLeads: ['II', 'aVR', 'V5', 'V6', 'I'], highlight: [] },
});

// ---------------------------------------------------------------- batch 2: electrolytes and drugs (parameters only)

/**
 * Hyperkalaemia (≈ 7 mmol/L): faster, steeper ventricular repolarization (shorter APD, τr 26.8 → 12 ms) → tall, narrow,
 * symmetric "tented" T waves; slower, weaker atrial conduction (flat, wide P) and slower AV conduction (PR 220 ms).
 */
export const HYPERKALEMIA = sc({
  id: 'hyperkalemia',
  category: 'electrolyte-drug-qt',
  params: {
    apdRefMs: 200,
    apVentricular: { ...NORMAL_PARAMS.apVentricular!, tauRepMs: 12 },
    vAtrialMps: 0.55,
    atrialGainFactor: 0.08,
  },
  rhythm: { av: { mode: 'first-degree', prMs: 220 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['V2', 'V3', 'V4', 'II'], highlight: [] },
});

/**
 * Hypercalcaemia: the ventricular plateau (phase 2) is shorter, phase 3 unchanged → the T wave follows the QRS almost
 * at once (short ST, short QT).
 */
export const HYPERCALCEMIA = sc({
  id: 'hypercalcemia',
  category: 'electrolyte-drug-qt',
  params: { apdRefMs: 155 },
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'V2', 'V5'], highlight: [] },
});

/** Hypocalcaemia: the ventricular plateau is longer, phase 3 unchanged → long isoelectric ST, normal T, long QT. */
export const HYPOCALCEMIA = sc({
  id: 'hypocalcemia',
  category: 'electrolyte-drug-qt',
  params: { apdRefMs: 330 },
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'V2', 'V5'], highlight: [] },
});

/**
 * Long QT syndrome type 1 (loss of the slow delayed-rectifier current IKs, KCNQ1): longer ventricular APD and a slower
 * phase 3 (τr 26.8 → 40 ms) → long QT with a broad-based T wave; QT still adapts to the rate.
 */
export const LONG_QT = sc({
  id: 'long-qt-syndrome',
  category: 'electrolyte-drug-qt',
  params: { apdRefMs: 290, apVentricular: { ...NORMAL_PARAMS.apVentricular!, tauRepMs: 40 } },
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['II', 'V5', 'V2'], highlight: [] },
});

/**
 * Digoxin effect: shorter ventricular APD (short QT) and a plateau that decays faster (slope 0.196 → 0.95): cells that
 * activated first start to repolarize during the ST segment, giving a sagging ("reverse tick") ST depression opposite
 * to the QRS; slower AV-node conduction (PR 220 ms).
 */
export const DIGOXIN_EFFECT = sc({
  id: 'digoxin-effect',
  category: 'electrolyte-drug-qt',
  params: { apdRefMs: 195, apVentricular: { ...NORMAL_PARAMS.apVentricular!, plateauSlope: 0.95 } },
  rhythm: { av: { mode: 'first-degree', prMs: 220 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['V5', 'V6', 'I', 'II'], highlight: [] },
});

/**
 * Acute pulmonary embolism (right heart strain): sinus tachycardia; the pressure-loaded RV rotates the heart clockwise
 * (deep S in I, Q in III) and slows right-bundle conduction; strained subepicardium of the RV and the inferior wall
 * repolarizes late (T inversion in V1–V3 and III); enlarged right atrium (taller P).
 */
export const PULMONARY_EMBOLISM = sc({
  id: 'pulmonary-embolism-s1q3t3',
  category: 'other',
  params: { poseAzimuthDeg: NORMAL_PARAMS.poseAzimuthDeg! - 15, poseRollDeg: NORMAL_PARAMS.poseRollDeg! + 20 },
  rhythm: { bpm: 115 },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'rv-strain', terminalDelayMs: { RBB: 25 } } },
  tissue: {
    gain: [{ regions: ['RA'], factor: 1.5 }],
    apd: [
      { regions: ['RV_FREE', 'RV_APEX', 'RVOT'], layer: 'epicardial', deltaMs: 60 },
      { aha: [4, 10, 15], layer: 'epicardial', deltaMs: 40 },
    ],
  },
  teach: { keyLeads: ['I', 'III', 'V1', 'V2', 'V3'], highlight: ['RV_FREE', 'RVOT', 'RA'] },
});

export const SCENARIOS: Readonly<Record<string, Scenario>> = {
  [NORMAL_SCENARIO.id]: NORMAL_SCENARIO,
  [LBBB.id]: LBBB,
  [INFERIOR_STEMI.id]: INFERIOR_STEMI,
  [ATRIAL_FIBRILLATION.id]: ATRIAL_FIBRILLATION,
  [SINUS_BRADYCARDIA.id]: SINUS_BRADYCARDIA,
  [SINUS_TACHYCARDIA.id]: SINUS_TACHYCARDIA,
  [SINUS_ARRHYTHMIA.id]: SINUS_ARRHYTHMIA,
  [PREMATURE_ATRIAL_CONTRACTION.id]: PREMATURE_ATRIAL_CONTRACTION,
  [PREMATURE_VENTRICULAR_CONTRACTION.id]: PREMATURE_VENTRICULAR_CONTRACTION,
  [FIRST_DEGREE_AV_BLOCK.id]: FIRST_DEGREE_AV_BLOCK,
  [MOBITZ_I_WENCKEBACH.id]: MOBITZ_I_WENCKEBACH,
  [MOBITZ_II.id]: MOBITZ_II,
  [COMPLETE_HEART_BLOCK.id]: COMPLETE_HEART_BLOCK,
  [RBBB.id]: RBBB,
  [WPW_LEFT_LATERAL.id]: WPW_LEFT_LATERAL,
  [ANTERIOR_STEMI.id]: ANTERIOR_STEMI,
  [LATERAL_STEMI.id]: LATERAL_STEMI,
  [OLD_MI_Q_WAVES.id]: OLD_MI_Q_WAVES,
  [MONOMORPHIC_VT.id]: MONOMORPHIC_VT,
  [JUNCTIONAL_ESCAPE.id]: JUNCTIONAL_ESCAPE,
  [POSTERIOR_MI.id]: POSTERIOR_MI,
  [NSTEMI.id]: NSTEMI,
  [ACUTE_PERICARDITIS.id]: ACUTE_PERICARDITIS,
  [HYPERKALEMIA.id]: HYPERKALEMIA,
  [HYPERCALCEMIA.id]: HYPERCALCEMIA,
  [HYPOCALCEMIA.id]: HYPOCALCEMIA,
  [LONG_QT.id]: LONG_QT,
  [DIGOXIN_EFFECT.id]: DIGOXIN_EFFECT,
  [PULMONARY_EMBOLISM.id]: PULMONARY_EMBOLISM,
  // batch 3 (scenarios/batch3/*)
  [ATRIAL_FLUTTER_TYPICAL.id]: ATRIAL_FLUTTER_TYPICAL,
  [AVNRT.id]: AVNRT,
  [VENTRICULAR_FIBRILLATION.id]: VENTRICULAR_FIBRILLATION,
  [TORSADES_DE_POINTES.id]: TORSADES_DE_POINTES,
  [LAFB.id]: LAFB,
  [LPFB.id]: LPFB,
  [LVH.id]: LVH,
  [RVH.id]: RVH,
  [HYPOKALEMIA.id]: HYPOKALEMIA,
  [BRUGADA_TYPE_1.id]: BRUGADA_TYPE_1,
  [HYPOTHERMIA.id]: HYPOTHERMIA,
};

export const scenarioIds = (): readonly string[] => Object.keys(SCENARIOS);

/**
 * §9.8 Chambers and voltage. Atrial abnormalities change the two sinus P lobes (morph/atrial.ts: RA / LA scale, LA
 * delay, interatrial block); ventricular hypertrophy is a substrate operator (ventricular.ts: lvMass, rvMass) whose
 * secondary repolarisation change ("strain") is a primary ApdChange; voltage and position findings are geometry
 * (torso transfer gain, rotation, mirror, a swinging heart). Hallmark criteria: tests/synth/oracle/criteria/chambers.ts.
 */
import { l } from '../../core/l10n';
import { defineGroup } from './define';

const SINUS = (rateBpm: number, hrv = 0.02) => ({ kind: 'sinus', rateBpm, hrv }) as const;
const AVN = (ahMinMs: number) => ({ avn: { ahMinMs, ahExtMs: 60, tauMs: 70, erpMs: 280, jitter: 0, conceal: 0 } }) as const;
const LATERAL = ['lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-basal-inferolateral'] as const;
const LV_HYPERTROPHY = {
  'lv-mid-anterolateral': 'hypertrophy', 'lv-mid-inferolateral': 'hypertrophy', 'lv-apical-lateral': 'hypertrophy', 'lv-basal-anterolateral': 'hypertrophy',
  'lv-basal-inferolateral': 'hypertrophy', 'lv-mid-inferior': 'hypertrophy', 'lv-apical-inferior': 'hypertrophy', 'lv-apex': 'hypertrophy',
} as const;
/** position of the hypertrophied LV: rotated leftward (frontal) and clockwise about the long axis (transverse) */
const LVH_GEOMETRY = { frontalDeg: -12, transverseDeg: -14 } as const;
const RV_HYPERTROPHY = { 'rv-basal': 'hypertrophy', 'rv-mid': 'hypertrophy', 'rv-apical': 'hypertrophy', 'rv-outflow': 'hypertrophy' } as const;

export const CHAMBER_SCENARIOS = defineGroup('chambers', [
  // ── atria ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'lae',
    group: 'chambers',
    findings: ['lae', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 68 },
    // larger, later and more posterior LA force: broad notched P in II, deep terminal negative P in V1
    source: { rhythm: SINUS(72), activation: { kind: 'conducted' }, atria: { raScale: 1.6, laScale: 3.1, laDelayMs: 8 } },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 160, max: 210 } },
    highlights: {},
  },
  {
    id: 'rae',
    group: 'chambers',
    findings: ['rae', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 59 },
    source: { rhythm: SINUS(84), activation: { kind: 'conducted' }, atria: { raScale: 3.2 } },
    dials: { rate: { min: 65, max: 105 } },
  },
  {
    id: 'biatrial-abnormality',
    group: 'chambers',
    findings: ['biatrial-abnormality', 'lae', 'rae', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 57 },
    source: { rhythm: SINUS(80), activation: { kind: 'conducted' }, atria: { raScale: 3.0, laScale: 3.0, laDelayMs: 0 } },
    dials: { rate: { min: 60, max: 100 } },
  },
  {
    id: 'interatrial-block',
    group: 'chambers',
    findings: ['interatrial-block', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 76 },
    source: { rhythm: SINUS(70), activation: { kind: 'conducted' }, atria: { iab: 'partial', laScale: 1.3, laDelayMs: 4 }, junction: AVN(100) },
    dials: { rate: { min: 55, max: 90 } },
    variants: {
      advanced: {
        label: l('高度房间传导阻滞（Bayés 综合征）', 'advanced interatrial block (Bayés syndrome)', 'bloqueo interauricular avanzado (síndrome de Bayés)'),
        patch: { atria: { iab: 'advanced', laScale: 1.2, laDelayMs: 4 } },
      },
    },
  },
  // ── ventricles ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'lvh',
    group: 'chambers',
    findings: ['lvh', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 52 },
    // a hypertrophied LV turns leftward and posterior (horizontal heart, clockwise transition): tall R in aVL and
    // V5–V6 with deep S in V1–V4 — Sokolow–Lyon, Cornell and Peguero–Lo Presti all met in the classic exemplar
    source: { rhythm: SINUS(68), activation: { kind: 'conducted' }, substrate: { lvMass: 2.0 }, geometry: LVH_GEOMETRY },
    dials: { rate: { min: 55, max: 90 } },
    highlights: LV_HYPERTROPHY,
  },
  {
    id: 'lvh-strain',
    group: 'chambers',
    findings: ['lvh-strain', 'secondary-st-t', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 67 },
    source: {
      rhythm: SINUS(70),
      activation: { kind: 'conducted' },
      atria: { laScale: 1.18 },
      junction: AVN(90),
      substrate: { lvMass: 2.0 },
      geometry: LVH_GEOMETRY,
      repol: {
        gScale: 0.25, plateauSlope: 0.155, tShape: { stMs: 30, riseFrac: 0.7 },
        // strain = loss / reversal of the lateral transmural gradient: in hypertrophied myocardium the epicardial APD
        // lengthens more than the endocardial one (DECISION §6.4 wrote 'endocardial prolongation', which by its own ΔG rule
        // would make the lateral T more upright)
        apd: [{ where: [...LATERAL], layer: 'epi', deltaMs: 52 }],
      },
    },
    dials: { rate: { min: 55, max: 95 } },
    highlights: LV_HYPERTROPHY,
  },
  {
    id: 'rvh',
    group: 'chambers',
    findings: ['rvh', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 34 },
    source: {
      rhythm: SINUS(82),
      activation: { kind: 'conducted' },
      atria: { raScale: 1.5 },
      substrate: { rvMass: 3.6 },
      // the RV-loaded heart sits vertical (frontal rotation): QRS axis beyond +110°
      geometry: { frontalDeg: 14 },
    },
    dials: { rate: { min: 65, max: 105 } },
    variants: {
      strain: {
        label: l('伴继发性ST-T改变（右心室“劳损”）', 'with secondary ST–T changes ("strain")', 'con alteraciones secundarias del ST-T («sobrecarga»)'),
        // secondary ST–T of the hypertrophied RV: phase-2 slope (ST depression discordant to the tall R in V1–V3) and
        // longer RV / septal epicardial APD (asymmetric T inversion V1–V3)
        patch: { repol: { plateauSlope: 0.26, gScale: 0.6, apd: [{ where: ['rv-mid', 'rv-basal', 'rv-apical', 'rv-outflow', 'lv-mid-anteroseptal', 'lv-basal-anteroseptal'], layer: 'epi', deltaMs: 40 }] } },
        findings: ['rvh', 'secondary-st-t', 'sinus-rhythm'],
      },
    },
    facts: { cause: 'pulmonary hypertension' },
    highlights: RV_HYPERTROPHY,
  },
  {
    id: 'biventricular-hypertrophy',
    group: 'chambers',
    findings: ['biventricular-hypertrophy', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 45 },
    // the two hypertrophied walls cancel each other's net force (why BVH is insensitive on the ECG): only a large RV
    // force shows through the LV voltage as a right axis and a tall R in V1
    source: { rhythm: SINUS(78), activation: { kind: 'conducted' }, atria: { laScale: 1.3 }, substrate: { lvMass: 2.3, rvMass: 4.9 } },
    dials: { rate: { min: 60, max: 100 } },
    highlights: { ...LV_HYPERTROPHY, ...RV_HYPERTROPHY },
  },
  // ── voltage and position ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'low-voltage',
    group: 'chambers',
    findings: ['low-voltage', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 66 },
    // a poor torso transfer (fluid, fat or air between the heart and the electrodes) scales every lead vector
    // (teaching choice: the P stays readable, ≥ 0.05 mV in II, so the PR can still be measured and graded)
    source: { rhythm: SINUS(80), activation: { kind: 'conducted' }, atria: { gain: 1.55 }, geometry: { torsoGain: 0.45 } },
    dials: { rate: { min: 60, max: 100 } },
    variants: {
      obesity: {
        label: l('肥胖', 'obesity', 'obesidad'),
        patch: { geometry: { torsoGain: 0.5, frontalDeg: -18 } },
      },
      emphysema: {
        label: l('肺气肿', 'emphysema', 'enfisema'),
        patch: { geometry: { torsoGain: 0.38, frontalDeg: 38, shiftCm: [0, 1.5, 0] }, atria: { raScale: 2.4 } },
      },
    },
    facts: { cause: 'pericardial effusion, obesity or emphysema (variants)' },
  },
  {
    id: 'electrical-alternans',
    group: 'chambers',
    findings: ['electrical-alternans', 'pericardial-effusion', 'sinus-tachycardia'],
    patient: { sex: 'female', ageY: 49 },
    // the heart swings in a large effusion: every other beat it sits rotated and closer to the chest wall
    source: {
      rhythm: SINUS(112, 0.01),
      activation: { kind: 'conducted' },
      junction: AVN(70),
      atria: { gain: 2.0 },
      geometry: { torsoGain: 0.4, swing: { rotDeg: 0, shiftCm: [0.3, 0, -2.2], everyBeats: 1 } },
    },
    dials: { rate: { min: 102, max: 130 } },
  },
  {
    id: 'poor-r-progression',
    group: 'chambers',
    findings: ['poor-r-progression', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 61 },
    // clockwise rotation about the long axis (seen from below): the transition moves to V5
    source: { rhythm: SINUS(74), activation: { kind: 'conducted' }, geometry: { transverseDeg: -42 } },
    dials: { rate: { min: 60, max: 95 } },
    facts: { cause: 'clockwise rotation (no infarct)' },
  },
  {
    id: 'dextrocardia',
    group: 'chambers',
    findings: ['dextrocardia', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 27 },
    // situs inversus: the whole source is mirrored (atria too); the electrodes stay in place (contrast: an RA/LA cable
    // reversal mirrors only the limb leads)
    source: { rhythm: SINUS(72), activation: { kind: 'conducted' }, geometry: { mirror: true } },
    dials: { rate: { min: 60, max: 95 } },
    facts: { contrast: 'electrode-reversal-la-ra' },
  },
  {
    id: 'copd-pattern',
    group: 'chambers',
    findings: ['copd-pattern', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 71 },
    // hyperinflation: vertical, lower heart behind more air (low voltage), RA abnormality, mild RV pressure load
    source: {
      rhythm: SINUS(84, 0.01),
      activation: { kind: 'conducted' },
      atria: { raScale: 5.4 },
      substrate: { rvMass: 1.5 },
      repol: { gScale: 1.4 },
      geometry: { frontalDeg: 42, transverseDeg: -30, shiftCm: [0, 2, 0], torsoGain: 0.5 },
    },
    dials: { rate: { min: 70, max: 95 } },
  },
]);

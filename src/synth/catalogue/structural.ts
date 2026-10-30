/**
 * §9.10 Structural heart disease, channelopathies and systemic conditions. Each scenario is expressed through the
 * SourceSpec only:
 *  - Brugada type 1 / type 2: a pure near-field RVOT epicardial source (dome loss → coved or saddleback ST; delayed
 *    epicardial repolarisation → negative T in type 1), activation and gradient unchanged;
 *  - HCM: septal hypertrophy (deep, narrow septal q in the lateral leads) + LV mass (voltage); apical HCM: LV mass +
 *    apical epicardial APD prolongation (giant precordial T inversion);
 *  - ARVC: slow conduction of the RV outflow / inflow (prolonged terminal activation), a near-field epsilon wave and RV
 *    epicardial APD prolongation (right precordial T inversion without RBBB);
 *  - acute pericarditis: diffuse epicardial injury (near-field plateaus, no reciprocal depression except aVR / V1) +
 *    atrial injury (PR depression); effusion: torso transfer (low voltage) + sinus tachycardia;
 *  - acute pulmonary embolism: sinus tachycardia + acute RV pressure overload (reversed septal activation → Q in III,
 *    RV force → S in I, RV / septal epicardial APD prolongation → T↓ III and V1–V3, clockwise frontal shift).
 * The Brugada high-lead manoeuvre (V1–V2 in the 2nd ICS) needs a per-variant RecordingSpec (contract request): it is a
 * fact here, not a variant.
 * Hallmark criteria: tests/synth/oracle/criteria/structural.ts.
 */
import type { RegionId } from '../../core/regions';
import { l } from '../../core/l10n';
import { defineGroup } from './define';

const SINUS = (rateBpm: number, hrv = 0.02) => ({ kind: 'sinus', rateBpm, hrv }) as const;
const AVN = (ahMinMs: number) => ({ avn: { ahMinMs, ahExtMs: 60, tauMs: 70, erpMs: 280, jitter: 0, conceal: 0 } }) as const;
const LATERAL: readonly RegionId[] = ['lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-basal-inferolateral'];
const SEPTUM: readonly RegionId[] = ['lv-basal-anteroseptal', 'lv-basal-inferoseptal', 'lv-mid-anteroseptal', 'lv-mid-inferoseptal', 'lv-apical-septal'];
const APICAL: readonly RegionId[] = ['lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex'];
/** apical HCM: the apex with the adjoining mid anterior and anterolateral walls (the leads V3–V5 face) */
const APICAL_HCM: readonly RegionId[] = [...APICAL, 'lv-mid-anterior', 'lv-mid-anterolateral'];
/** RV outflow and inflow (two corners of the 'triangle of dysplasia'): the slowly conducting RV of ARVC */
const RV_SLOW: readonly RegionId[] = ['rv-outflow', 'rv-basal'];
const RV_ALL: readonly RegionId[] = ['rv-outflow', 'rv-basal', 'rv-mid', 'rv-apical'];
/** the inflamed epicardium of pericarditis: the free walls facing the precordium, apex and inferolateral wall */
const PERICARDIAL: readonly RegionId[] = [
  'lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex', 'lv-mid-anterior', 'lv-mid-anterolateral',
  'lv-mid-inferolateral', 'lv-basal-anterolateral', 'lv-mid-inferior', 'rv-apical', 'rv-mid', 'lv-basal-anterior', 'lv-basal-inferolateral',
  'lv-basal-inferior',
];

const mark = (ids: readonly RegionId[], h: 'hypertrophy' | 'block' | 'ischemia') => Object.fromEntries(ids.map((id) => [id, h])) as Partial<Record<RegionId, typeof h>>;

export const STRUCTURAL_SCENARIOS = defineGroup('structural', [
  // ── channelopathies ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'brugada-type1',
    group: 'structural',
    findings: ['brugada-type1', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 38 },
    source: {
      rhythm: SINUS(70),
      activation: { kind: 'conducted' },
      junction: AVN(90),
      nearField: [{ kind: 'brugada', where: ['rv-outflow'], amp: 0.105, shape: 'coved', far: 0 }],
      repol: { u: { ratio: 0 } },
    },
    dials: { rate: { min: 55, max: 90 } },
    facts: { diagnostic: 'type 1 (coved) is the only diagnostic Brugada pattern', phenocopies: 'fever, hyperkalaemia, Na-channel-blocker toxicity' },
    highlights: { 'rv-outflow': 'ischemia' },
  },
  {
    id: 'brugada-type2',
    group: 'structural',
    findings: ['brugada-type2', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 41 },
    // a shorter RVOT epicardial dome (morph/nearfield.ts SADDLEBACK): high take-off, an ST trough that stays above the
    // baseline, then the normal upright T
    source: {
      rhythm: SINUS(68),
      activation: { kind: 'conducted' },
      junction: AVN(90),
      nearField: [{ kind: 'brugada', where: ['rv-outflow'], amp: 0.12, shape: 'saddleback', far: 0 }],
      repol: { u: { ratio: 0 } },
    },
    dials: { rate: { min: 55, max: 90 } },
    facts: {
      diagnostic: 'type 2 (saddleback) is not diagnostic: record V1–V2 in the 2nd–3rd intercostal space, where it may become type 1',
      highLeads: 'high-lead recording needs a per-variant electrode placement (synth contract request); shown in lessons with the type-1 scenario',
    },
    highlights: { 'rv-outflow': 'ischemia' },
  },
  // ── cardiomyopathies ────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hcm',
    group: 'structural',
    findings: ['hcm', 'lvh', 'sinus-rhythm'],
    title: l('肥厚型心肌病（室间隔肥厚）', 'Hypertrophic cardiomyopathy (septal hypertrophy)', 'Miocardiopatía hipertrófica (hipertrofia septal)'),
    patient: { sex: 'male', ageY: 24 },
    // the hypertrophied septum makes the septal (left → right) force large: deep, narrow q waves in I, aVL, V5–V6; the
    // thick LV free wall gives the voltage; the LA is enlarged by the stiff ventricle
    source: { rhythm: SINUS(66), activation: { kind: 'conducted' }, atria: { laScale: 1.15 }, substrate: { septum: 6, lvMass: 1.8 } },
    dials: { rate: { min: 55, max: 85 } },
    variants: {
      repolarization: {
        label: l('伴复极异常（侧壁 ST 压低、T 波倒置）', 'with repolarisation abnormality (lateral ST depression, T inversion)', 'con alteración de la repolarización (descenso del ST y T negativa laterales)'),
        patch: { repol: { gScale: 0.35, plateauSlope: 0.15, apd: [{ where: [...LATERAL], layer: 'epi', deltaMs: 45 }] } },
      },
    },
    facts: { pitfall: 'deep narrow septal q waves are not infarct Q waves (< 40 ms, with LVH voltage)', redFlags: 'short PR / pre-excitation or low voltage suggest a phenocopy' },
    highlights: { ...mark(SEPTUM, 'hypertrophy'), 'lv-mid-anterolateral': 'hypertrophy', 'lv-mid-inferolateral': 'hypertrophy' },
  },
  {
    id: 'apical-hcm',
    group: 'structural',
    findings: ['apical-hcm', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 52 },
    // hypertrophy confined to the apex: tall mid-precordial R and a long apical epicardial APD → giant negative T
    // (Yamaguchi syndrome)
    // the hypertrophied apex and the adjoining mid anterior / anterolateral walls repolarise late on the epicardial
    // side and early on the endocardial side (reversed transmural gradient): giant symmetric T inversion V3–V5
    source: { rhythm: SINUS(64), activation: { kind: 'conducted' }, substrate: { lvMass: 1.8 }, repol: { qtcMs: 440, apd: [{ where: [...APICAL_HCM], layer: 'epi', deltaMs: 210 }, { where: [...APICAL_HCM], layer: 'endo', deltaMs: -70 }] } },
    dials: { rate: { min: 55, max: 85 } },
    facts: { pitfall: 'giant T inversion with tall R in V3–V5 and no chest pain: apical HCM, not Wellens or an NSTEMI' },
    highlights: mark(APICAL, 'hypertrophy'),
  },
  {
    id: 'arvc',
    group: 'structural',
    findings: ['arvc', 'epsilon-wave', 'sinus-rhythm'],
    title: l('致心律失常性右室心肌病', 'Arrhythmogenic right ventricular cardiomyopathy', 'Miocardiopatía arritmogénica del ventrículo derecho'),
    patient: { sex: 'male', ageY: 29 },
    // fibro-fatty RV outflow and inflow conduct slowly: the right-precordial terminal activation is prolonged (S-wave
    // upstroke ≥ 55 ms) and the latest RV activation shows as a small near-field wiggle after the QRS (epsilon wave);
    // RV epicardial APD prolongation inverts the T in V1–V3 without RBBB
    source: {
      rhythm: SINUS(68),
      activation: { kind: 'conducted' },
      substrate: { slow: [{ where: [...RV_SLOW], delayMs: 20 }] },
      nearField: [{ kind: 'epsilon', where: [...RV_SLOW], amp: 0.045, lagMs: 14, far: 0 }],
      repol: { apd: [{ where: [...RV_ALL], layer: 'epi', deltaMs: 40 }, { where: ['lv-apical-septal', 'lv-apical-anterior', 'rv-apical'], layer: 'epi', deltaMs: 28 }] },
    },
    dials: { rate: { min: 55, max: 90 } },
    facts: { criteria: '2010 Task Force / 2020 Padua: T inversion V1–V3 (major), epsilon wave (minor since 2020), terminal activation ≥ 55 ms' },
    highlights: mark(RV_SLOW, 'block'),
  },
  // ── pericardium ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pericarditis',
    group: 'structural',
    findings: ['pericarditis', 'sinus-rhythm'],
    title: l('急性心包炎（I 期）', 'Acute pericarditis (stage I)', 'Pericarditis aguda (estadio I)'),
    patient: { sex: 'male', ageY: 32 },
    // inflamed epicardium everywhere (one near-field plateau per region: concave, diffuse ST elevation, depression only
    // in aVR / V1) + atrial epicardial injury (PR depression, PR elevation in aVR); fever / pain → faster sinus rate and
    // a taller sinus P
    source: {
      rhythm: SINUS(96, 0.01),
      activation: { kind: 'conducted' },
      junction: AVN(90),
      atria: { gain: 3.0, injuryMv: 0.08 },
      // solved in lead II (J+60 ≈ 1.7 mm above the TP segment): the ST elevation in II clearly exceeds its PR
      // depression (≈ 1.1 mm), as in the textbook tracing
      injury: [{ where: [...PERICARDIAL], layer: 'epicardial', stMv: 0.18, ref: 'II' }],
    },
    dials: { rate: { min: 80, max: 100 } },
    facts: { differential: 'vs STEMI: diffuse, no reciprocal depression (except aVR, V1), PR depression, no Q; vs early repolarisation: ST/T in V6 > 0.25' },
  },
  {
    id: 'pericardial-effusion',
    group: 'structural',
    findings: ['pericardial-effusion', 'low-voltage', 'sinus-tachycardia'],
    patient: { sex: 'female', ageY: 57 },
    // fluid around the heart shunts its field (every lead vector scaled down) and the stroke volume falls (sinus
    // tachycardia); the swinging heart of a large effusion is the electrical-alternans scenario (chambers)
    source: { rhythm: SINUS(106, 0.01), activation: { kind: 'conducted' }, junction: AVN(70), atria: { gain: 1.9 }, geometry: { torsoGain: 0.45 } },
    dials: { rate: { min: 101, max: 118 } },
    facts: { teaching: 'low voltage + tachycardia: think effusion / tamponade; alternans makes tamponade likely' },
  },
  // ── acute right-heart strain ────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pulmonary-embolism',
    group: 'structural',
    findings: ['pulmonary-embolism', 'sinus-tachycardia'],
    title: l('急性肺栓塞（右心室负荷：S1Q3T3）', 'Acute pulmonary embolism (RV strain: S1Q3T3)', 'Tromboembolismo pulmonar agudo (sobrecarga del VD: S1Q3T3)'),
    patient: { sex: 'female', ageY: 58 },
    // acute RV pressure overload: the septum is activated from the RV side (reversed initial force → Q in III), the
    // loaded RV adds a late rightward force (S in I), RV and septal epicardial APD prolongation invert the T in III and
    // V1–V3, and the heart turns clockwise (rightward axis shift)
    source: {
      rhythm: SINUS(102, 0.01),
      activation: { kind: 'conducted' },
      junction: AVN(70),
      substrate: { septum: -2.4, rvMass: 2 },
      geometry: { frontalDeg: 25 },
      repol: {
        qtcMs: 400, u: { ratio: 0 },
        apd: [
          { where: [...RV_ALL, 'lv-basal-inferoseptal', 'lv-mid-inferoseptal', 'lv-basal-inferior', 'lv-mid-inferior'], layer: 'epi', deltaMs: 35 },
          { where: ['lv-apical-septal', 'lv-apical-anterior', 'lv-mid-anteroseptal'], layer: 'epi', deltaMs: 15 },
        ],
      },
    },
    dials: { rate: { min: 100, max: 115 } },
    facts: { insensitive: 'the ECG neither rules PE in nor out: sinus tachycardia is the commonest sign, S1Q3T3 is seen in a minority', severity: 'T inversion V1–V4, RBBB and QR in V1 mark RV strain (worse outcome)' },
  },
]);

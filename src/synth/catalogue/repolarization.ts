/**
 * §9.9 Repolarisation, electrolytes, drugs, temperature. Every scenario changes repolarisation through RepolSpec
 * (QTc → JT, primary gradient scale, T shape, U wave, split primary, regional APD changes, cardiac memory), plus the
 * conduction stretch and near-field J waves where the mechanism needs them. Hallmark criteria:
 * tests/synth/oracle/criteria/repolarization.ts.
 *
 * Severe hyperkalaemia is its own scenario: its intervals are not measurable (no P, QRS merging into the T), which is a
 * scenario-level declaration (`intervals: 'not-applicable'`).
 */
import type { RegionId } from '../../core/regions';
import { l } from '../../core/l10n';
import { hyperkalemiaStage } from '../morph/stage';
import { defineGroup } from './define';

const SINUS = (rateBpm: number, hrv = 0.02) => ({ kind: 'sinus', rateBpm, hrv }) as const;
const AVN = (ahMinMs: number) => ({ avn: { ahMinMs, ahExtMs: 60, tauMs: 70, erpMs: 280, jitter: 0, conceal: 0 } }) as const;
const LATERAL: readonly RegionId[] = ['lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-basal-inferolateral', 'lv-basal-anterior'];
/** mid and apical LV walls (the regions a catecholamine storm prolongs most) */
const MID_APICAL: readonly RegionId[] = [
  'lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-mid-inferoseptal', 'lv-mid-inferior', 'lv-mid-inferolateral', 'lv-mid-anterolateral',
  'lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex',
];
const SEVERE_K = hyperkalemiaStage(0.95);

export const REPOLARIZATION_SCENARIOS = defineGroup('repolarization', [
  {
    id: 'hyperkalemia',
    group: 'repolarization',
    findings: ['hyperkalemia', 'peaked-t', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 61 },
    source: {
      rhythm: SINUS(75, 0.015),
      activation: { kind: 'conducted' },
      atria: { gain: 0.7 },
      junction: AVN(125),
      substrate: { conduction: 1.22 },
      // faster phase 3 everywhere (tented T), epicardium of the apex and lateral wall shortest: the tent reaches V5–V6
      repol: {
        qtcMs: 370, gScale: 1.25, tShape: { q: 1.35, widthMs: 150, riseFrac: 0.62 }, u: { ratio: 0 },
        apd: [{ where: 'apical', layer: 'epi', deltaMs: -20 }, { where: ['lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral'], layer: 'epi', deltaMs: -40 }],
      },
    },
    dials: { rate: { min: 60, max: 95 } },
    facts: { stage: '1–2 (moderate)' },
  },
  {
    id: 'hyperkalemia-severe',
    group: 'repolarization',
    findings: ['hyperkalemia', 'peaked-t'],
    title: l('重度高钾血症（正弦波前期）', 'Severe hyperkalaemia (pre-sine-wave)', 'Hiperpotasemia grave (preonda sinusoidal)'),
    patient: { sex: 'male', ageY: 68 },
    // P flattened to invisibility, very wide QRS merging into the tented T: the reader can no longer measure PR / QRS /
    // QT reliably — the pattern itself is the diagnosis and the emergency
    source: {
      rhythm: SINUS(62, 0.01),
      activation: { kind: 'conducted' },
      atria: SEVERE_K.atria,
      junction: AVN(125 + SEVERE_K.ahExtraMs),
      substrate: SEVERE_K.substrate,
      repol: { ...SEVERE_K.repol, apd: [{ where: 'apical', layer: 'epi', deltaMs: -20 }] },
    },
    dials: { rate: { min: 50, max: 80 } },
    intervals: 'not-applicable',
    facts: { stage: '3 (severe: QRS widening into the T, P lost)' },
  },
  {
    id: 'hypokalemia',
    group: 'repolarization',
    findings: ['hypokalemia', 'u-waves', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 54 },
    // slower phase 3 and a low gradient (flat T, kept upright by electrotonic coupling), a prominent U (late
    // repolarising Purkinje / M cells) taller than the T in V2, and a slight ST sag. Rate ≤ 68/min: the U ends before
    // the next P (at faster rates T, U and P merge — the 'apparent long QT' pitfall becomes a 'where is the P' pitfall)
    source: { rhythm: SINUS(60), activation: { kind: 'conducted' }, repol: { gScale: 0.45, coupling: 0.35, plateauSlope: 0.12, u: { ratio: 0.95, lagMs: 20 } } },
    dials: { rate: { min: 52, max: 68 } },
    facts: { pitfall: 'T–U fusion: measure the QT to the end of the T, not of the U (an apparent long QT is a QU)' },
  },
  {
    id: 'hypercalcemia',
    group: 'repolarization',
    findings: ['hypercalcemia', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 66 },
    // short phase 2: the T starts at the J point (no ST segment), short QT; T width normal
    source: { rhythm: SINUS(74), activation: { kind: 'conducted' }, repol: { qtcMs: 335, tShape: { stMs: 4, riseFrac: 0.6 } } },
    dials: { rate: { min: 60, max: 95 } },
  },
  {
    id: 'hypocalcemia',
    group: 'repolarization',
    findings: ['hypocalcemia', 'long-qt', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 47 },
    // long phase 2: a long isoelectric ST segment, the T itself keeps its normal width
    source: { rhythm: SINUS(70), activation: { kind: 'conducted' }, repol: { qtcMs: 505, tShape: { widthMs: 150 } } },
    dials: { rate: { min: 55, max: 90 } },
  },
  {
    id: 'digoxin-effect',
    group: 'repolarization',
    findings: ['digoxin-effect', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 79 },
    // shortened plateau with a steep decline (sagging, scooped ST opposite the QRS), low T, short QT, slightly longer PR
    source: { rhythm: SINUS(68), activation: { kind: 'conducted' }, junction: AVN(110), repol: { qtcMs: 368, gScale: 0.55, plateauSlope: 0.42, tShape: { stMs: 10, riseFrac: 0.55 }, u: { ratio: 0.15 } } },
    // (rate ≤ 72/min: at faster rates the short JT pulls the phase-2 sag into the J point — digoxin also slows the
    // sinus rate)
    dials: { rate: { min: 55, max: 72 } },
    facts: { pitfall: 'drug effect, not toxicity; mimics ischaemic ST depression' },
  },
  {
    id: 'long-qt',
    group: 'repolarization',
    findings: ['long-qt', 'sinus-rhythm'],
    title: l('QT 间期延长（1 型：T 波宽大）', 'Long QT (type 1 pattern: broad-based T)', 'QT largo (patrón tipo 1: onda T de base ancha)'),
    patient: { sex: 'female', ageY: 23 },
    source: { rhythm: SINUS(64), activation: { kind: 'conducted' }, repol: { qtcMs: 515, tShape: { widthMs: 270, riseFrac: 0.6 } } },
    dials: { rate: { min: 50, max: 80 }, qtc: { min: 490, max: 560 } },
    variants: {
      lqt2: {
        label: l('2 型（低平、双峰 T 波）', 'type 2 pattern (low, bifid T)', 'patrón tipo 2 (T baja y bífida)'),
        // the second (late) repolarising population is the second hump; it also carries the T end, so the base QTc is
        // set lower and the split lag brings the QTcF to ≈ 520 ms
        patch: { repol: { gScale: 0.75, tShape: { widthMs: 150, riseFrac: 0.6 }, split: { where: 'global', lagMs: 110, share: 0.5 } } },
      },
      lqt3: {
        label: l('3 型（ST 段延长、T 波窄而迟）', 'type 3 pattern (long ST, late narrow T)', 'patrón tipo 3 (ST largo, T tardía y estrecha)'),
        patch: { repol: { tShape: { widthMs: 140, riseFrac: 0.62 } } },
      },
      drug: {
        label: l('药物性（hERG 阻滞，类 2 型）', 'drug-induced (hERG block, type-2-like)', 'farmacológico (bloqueo hERG, similar al tipo 2)'),
        patch: { repol: { gScale: 0.7, tShape: { widthMs: 150, riseFrac: 0.6 }, split: { where: 'global', lagMs: 110, share: 0.55 }, u: { ratio: 0.3 } } },
      },
    },
    facts: { risk: 'QTc > 500 ms: high risk of torsades de pointes' },
  },
  {
    id: 'short-qt',
    group: 'repolarization',
    findings: ['short-qt', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 26 },
    // short repolarisation everywhere: tall, narrow, peaked symmetric T with almost no ST segment
    source: { rhythm: SINUS(66), activation: { kind: 'conducted' }, repol: { qtcMs: 318, gScale: 1.3, tShape: { q: 1.6, stMs: 6, riseFrac: 0.56 } } },
    dials: { rate: { min: 55, max: 80 } },
    facts: { threshold: 'short QT syndrome: QTc ≤ 360 ms with clinical criteria; consider at ≤ 320 ms' },
  },
  {
    id: 'na-channel-blockade',
    group: 'repolarization',
    findings: ['na-channel-blockade', 'sinus-tachycardia'],
    patient: { sex: 'female', ageY: 31 },
    // slower conduction everywhere (wide QRS) and most where the conduction reserve is lowest — the RV outflow, basal RV
    // and basal septum, activated last and out of phase: a terminal rightward-superior force (terminal R in aVR, S in
    // I). Rate 101–112/min: faster, the P sinks into the T (the anticholinergic tachycardia of a tricyclic overdose)
    source: {
      rhythm: SINUS(104, 0.01),
      activation: { kind: 'conducted' },
      junction: AVN(80),
      substrate: { conduction: 1.1, slow: [{ where: ['rv-outflow', 'rv-basal', 'lv-basal-anteroseptal', 'lv-basal-inferoseptal'], delayMs: 22 }] },
      repol: { qtcMs: 410, u: { ratio: 0 } },
    },
    dials: { rate: { min: 101, max: 112 } },
    variants: {
      brugada: {
        label: l('伴 Brugada 样 ST 段（药物诱发 1 型）', 'with a Brugada-type ST (drug-induced type 1 pattern)', 'con ST de tipo Brugada (patrón tipo 1 inducido por fármacos)'),
        // the Na-channel block also unmasks the RVOT epicardial dome loss: coved ST elevation with a negative T in V1–V2
        patch: { nearField: [{ kind: 'brugada', where: ['rv-outflow'], amp: 0.1, shape: 'coved', far: 0 }] },
        findings: ['na-channel-blockade', 'brugada-type1', 'sinus-tachycardia'],
      },
    },
    facts: { cause: 'tricyclic antidepressant overdose (or another Na-channel blocker)' },
  },
  {
    id: 'hypothermia',
    group: 'repolarization',
    findings: ['hypothermia', 'osborn-waves', 'sinus-bradycardia'],
    patient: { sex: 'male', ageY: 72 },
    // transient-outward-current gradient of the LV epicardium at low temperature: a dome at the J point (Osborn wave)
    source: {
      rhythm: SINUS(46, 0.01),
      activation: { kind: 'conducted' },
      junction: AVN(150),
      substrate: { conduction: 1.08 },
      // the hump sits on the QRS–ST junction (it ends with the QRS: a reader measures the QRS to the J point, the Osborn
      // wave is the junction itself)
      nearField: [{ kind: 'j-wave', where: ['lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral', 'lv-mid-inferior', 'lv-apical-inferior', 'lv-apex', 'lv-mid-anterior'], amp: 0.6, lagMs: 0 }],
      repol: { qtcMs: 490 },
    },
    dials: { rate: { min: 38, max: 56 } },
    facts: { temperature: 'about 30 °C (moderate hypothermia)' },
  },
  {
    id: 'cerebral-t',
    group: 'repolarization',
    findings: ['cerebral-t', 'long-qt', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 58 },
    // sympathetic storm (subarachnoid haemorrhage): long APD of the whole LV epicardium → giant inverted T, long QT
    // (a uniform change of every LV region largely cancels — the opposite walls push G in opposite directions — so the
    // giant inversion needs the apex-to-base heterogeneity of the catecholamine storm: mid and apical walls most)
    source: { rhythm: SINUS(68), activation: { kind: 'conducted' }, repol: { qtcMs: 560, apd: [{ where: [...MID_APICAL], layer: 'epi', deltaMs: 220 }, { where: ['lv-basal-anterior', 'lv-basal-anteroseptal'], layer: 'epi', deltaMs: 200 }], u: { ratio: 0 } } },
    dials: { rate: { min: 55, max: 90 } },
    facts: { cause: 'subarachnoid haemorrhage / acute brain injury' },
  },
  {
    id: 'cardiac-memory',
    group: 'repolarization',
    findings: ['nonspecific-st-t', 'sinus-rhythm'],
    title: l('心脏记忆现象（起搏后 T 波倒置）', 'Cardiac memory (post-pacing T inversion)', 'Memoria cardiaca (inversión de la T tras la estimulación)'),
    patient: { sex: 'female', ageY: 74 },
    // after weeks of RV apical pacing the sinus T follows the vector of the paced QRS (inferior and anterior T
    // inversion with a normal QRS); taxonomy: the proposed `cardiac-memory` finding is not in src/core yet
    source: { rhythm: SINUS(66), activation: { kind: 'conducted' }, repol: { memory: { from: 'rv-apex', weight: 0.45 } } },
    dials: { rate: { min: 55, max: 85 } },
    facts: { mechanism: 'cardiac memory after RV apical pacing', pitfall: 'mimics anterior ischaemia; T in aVL upright, T in I upright or isoelectric' },
  },
  {
    id: 'nonspecific-st-t',
    group: 'repolarization',
    findings: ['nonspecific-st-t', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 63 },
    // a lateral epicardial APD lengthening that flattens the lateral T without ST depression
    source: { rhythm: SINUS(72), activation: { kind: 'conducted' }, repol: { gScale: 0.75, apd: [{ where: [...LATERAL], layer: 'epi', deltaMs: 28 }] } },
    dials: { rate: { min: 55, max: 95 } },
  },
]);

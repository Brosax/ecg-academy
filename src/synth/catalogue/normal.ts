/**
 * §9.1 Normal and normal variants. Every scenario inherits the calibrated normal base (morph/patterns/normal.ts,
 * morph/atrial.ts SINUS_P, repol.ts defaults); the variants change only rhythm, activation, substrate, repolarisation
 * or near-field parameters. Hallmark criteria live in tests/synth/oracle/criteria/normal.ts.
 */
import { l } from '../../core/l10n';
import { defineGroup } from './define';

/** Dial ranges of a normal ECG (lessons and live blocks); drills draw the T5-validated sub-ranges of dials/ranges.ts. */
const NORMAL_DIALS = {
  rate: { min: 60, max: 100 },
  pr: { min: 120, max: 200 },
  qrs: { min: 80, max: 105 },
  qtc: { min: 380, max: 430 },
  axis: { min: 0, max: 80 },
  pAxis: { min: 20, max: 70 },
  tAmp: { min: 0.8, max: 1.2 },
  hrv: { min: 0, max: 0.04 },
} as const;

export const NORMAL_SCENARIOS = defineGroup('normal', [
  {
    id: 'normal',
    group: 'normal',
    findings: ['normal-ecg', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 35 },
    source: { rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.02 }, activation: { kind: 'conducted' } },
    dials: NORMAL_DIALS,
    facts: {},
  },
  {
    id: 'sinus-bradycardia',
    group: 'normal',
    findings: ['sinus-bradycardia'],
    patient: { sex: 'male', ageY: 28 },
    source: { rhythm: { kind: 'sinus', rateBpm: 50, hrv: 0.02 }, activation: { kind: 'conducted' } },
    dials: { ...NORMAL_DIALS, rate: { min: 38, max: 58 } },
  },
  {
    id: 'sinus-tachycardia',
    group: 'normal',
    findings: ['sinus-tachycardia'],
    patient: { sex: 'female', ageY: 30 },
    source: { rhythm: { kind: 'sinus', rateBpm: 118, hrv: 0.01 }, activation: { kind: 'conducted' }, junction: { avn: { ahMinMs: 65, ahExtMs: 40, tauMs: 70, erpMs: 260, jitter: 0, conceal: 0 } } },
    dials: { ...NORMAL_DIALS, rate: { min: 102, max: 150 }, pr: { min: 120, max: 180 } },
  },
  {
    id: 'sinus-arrhythmia',
    group: 'normal',
    findings: ['sinus-arrhythmia'],
    patient: { sex: 'female', ageY: 19 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 70, hrv: 0.13 },
      activation: { kind: 'conducted' },
      geometry: { respiration: { rotDeg: 5, gain: 0.05 } },
    },
    dials: { ...NORMAL_DIALS, rate: { min: 60, max: 85 }, hrv: { min: 0.1, max: 0.18 } },
  },
  {
    id: 'early-repolarization',
    group: 'normal',
    findings: ['early-repolarization', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 24 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 62, hrv: 0.03 },
      activation: { kind: 'conducted' },
      // inferolateral early repolarisation (Macfarlane 2015 consensus: Jp ≥ 0.1 mV in ≥ 2 contiguous inferior / lateral
      // leads): an inferior and a lateral J-wave source, each toward its own wall, and inferior / lateral epicardial ST
      // shares (J ≈ 0.13–0.16 mV in II, aVF, V4–V5, ≈ 0.11 in V6); the diffuse share (the `st` dial, set in V2; the
      // dial scales the three shares together) keeps V1–V3 slightly raised with an upright T. A shorter lateral
      // epicardial APD gives the broad, tall lateral T of the young male heart, so the V6 ST/T ratio stays ≈ 0.17
      // (< 0.25: early repolarisation, not pericarditis — Ginzton 1982). The precordial T stays proportionate to the QRS
      // (T/QRS ≈ 0.45 in V2, 0.65–0.8 in V3), clearly below the hyperacute T of stemi-anterior-subtle (≈ 1.05 / 1.1–1.25)
      nearField: [
        { kind: 'j-wave', where: ['lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferior'], amp: 0.3 },
        { kind: 'j-wave', where: ['lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-mid-inferolateral'], amp: 0.3 },
      ],
      injury: [
        { where: 'global', layer: 'epicardial', stMv: 0.14, ref: 'V2' },
        { where: ['lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferior'], layer: 'epicardial', stMv: 0.16, ref: 'II' },
        { where: ['lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-mid-inferolateral'], layer: 'epicardial', stMv: 0.11, ref: 'V6' },
      ],
      repol: { gScale: 1.25, apd: [{ where: ['lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-mid-inferolateral'], layer: 'epi', deltaMs: -40 }] },
    },
    dials: { rate: { min: 50, max: 80 }, st: { min: 0.06, max: 0.14 } },
    facts: { distribution: 'inferolateral' },
  },
  {
    id: 'juvenile-t',
    group: 'normal',
    findings: ['juvenile-t', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 16 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 78, hrv: 0.04 },
      activation: { kind: 'conducted' },
      // persistent juvenile pattern: longer epicardial APD over the RV and the anteroseptal LV (the territory V1–V3
      // face) → the local T vector turns away from those leads
      repol: { apd: [{ where: ['rv-outflow', 'rv-apical', 'lv-basal-anteroseptal', 'lv-mid-anteroseptal', 'lv-apical-septal', 'lv-basal-anterior', 'lv-mid-anterior', 'lv-apical-anterior'], layer: 'epi', deltaMs: 48 }] },
    },
    dials: { rate: { min: 65, max: 95 } },
  },
  {
    id: 'athlete',
    group: 'normal',
    findings: ['athlete-changes', 'sinus-bradycardia', 'irbbb', 'early-repolarization'],
    patient: { sex: 'male', ageY: 22 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 48, hrv: 0.06 },
      activation: { kind: 'conducted', blocks: { rbb: 'delay' } },
      substrate: { lvMass: 1.55 },
      // lean chest wall: the same LV mass gives higher surface voltages (isolated voltage criteria are common in athletes)
      geometry: { torsoGain: 1.25 },
      // training-related early repolarisation (common in athletes, ESC 2020 sports cardiology: a "normal, training-related"
      // finding): a modest inferolateral J notch / slur with ≈ 1 mm J-point elevation, upright T
      nearField: [
        { kind: 'j-wave', where: ['lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferior'], amp: 0.25 },
        { kind: 'j-wave', where: ['lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-mid-inferolateral'], amp: 0.25 },
      ],
      injury: [
        // diffuse epicardial share: V1–V3 keep an isoelectric-to-slightly-raised ST (no reciprocal depression)
        { where: 'global', layer: 'epicardial', stMv: 0.05, ref: 'V3' },
        { where: ['lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferior'], layer: 'epicardial', stMv: 0.1, ref: 'II' },
        { where: ['lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-mid-inferolateral'], layer: 'epicardial', stMv: 0.11, ref: 'V6' },
      ],
      // shorter lateral epicardial APD: tall, broad lateral T (V6 ST/T ≈ 0.17, clearly < 0.25)
      repol: { gScale: 1.1, apd: [{ where: ['lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral', 'lv-mid-inferolateral'], layer: 'epi', deltaMs: -30 }] },
    },
    dials: { rate: { min: 40, max: 58 } },
    variants: {
      'first-degree': {
        label: l('伴一度房室传导阻滞', 'with first-degree AV block', 'con bloqueo AV de primer grado'),
        patch: { junction: { avn: { ahMinMs: 140, ahExtMs: 60, tauMs: 70, erpMs: 280, jitter: 0, conceal: 0 } } },
        findings: ['athlete-changes', 'sinus-bradycardia', 'irbbb', 'early-repolarization', 'av-block-1'],
      },
    },
  },
  {
    id: 'irbbb',
    group: 'normal',
    findings: ['irbbb', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 26 },
    source: { rhythm: { kind: 'sinus', rateBpm: 68, hrv: 0.03 }, activation: { kind: 'conducted', blocks: { rbb: 'delay' } } },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 120, max: 200 } },
  },
]);

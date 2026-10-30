/**
 * Dial definitions (DECISION §7): what each dial changes, its exactness class, its widest physiological range, the
 * clinical thresholds a value can cross and the exclusion band around each threshold. Scenarios narrow the ranges
 * (ScenarioDef.dials) to keep their identity. Labels live in src/i18n/synth.ts; units follow src/course/live.ts.
 *
 * Exactness classes (what `SynthResult.applied` reports and how close the truth is to it):
 *  - 'forward'     the mapped model parameter realises the value exactly (rate: mean RR without HRV; qrs: the base
 *                  pattern's edges; qtc: the JT law at the base QRS; st: the injury solve in its reference lead);
 *  - 'analytic'    solved in closed form (pr: AV-node ahMin at the beat RR, exact per beat);
 *  - 'solve'       1-D root-find, residual reported (axis ≤ 1°, pAxis ≤ 2°);
 *  - 'statistic'   the realised statistic is reported (hrv, ventricularResponse, noise);
 *  - 'categorical' integer or class values (conductionRatio N:1, stage, site).
 * Natural jitter (dials/jitter.ts) moves lobe edges by ≤ 3 ms and directions by ≤ 6° on top of a dial; the truth is
 * always read from the instantiated model, so graders use truth, never the request.
 *
 * Exclusion bands (§7 rule 6): band = max(oracle gate, ½ × grading tolerance). Oracle gates are the T2 gates of
 * tests/synth/truth/truth-vs-oracle.test.ts; grading tolerances are src/practice/core/grade.ts › TOL (HR ±10 %,
 * min ±5 bpm; PR / QRS ±20 ms; QT / QTc ±30 ms; axis ±20°). ST has no numeric grading tolerance: its band is the
 * oracle gate (0.03 mV). Thresholds are the "current value" column of docs/curriculum/criteria.md (row ids beside).
 */
import type { DialId, DialRange, ScenarioDef } from '../api';
import { qtcLongLimit, stemiThresholdMv, THRESHOLDS } from '../truth/findings';

export type Exactness = 'forward' | 'analytic' | 'solve' | 'statistic' | 'categorical';

export interface DialDef {
  readonly id: DialId;
  readonly unit: string;
  readonly exactness: Exactness;
  readonly mechanism: string;
  readonly range: DialRange;
  /** realised by the engine (an unimplemented dial is ignored and absent from SynthResult.applied) */
  readonly implemented: boolean;
  /** draws are rounded to this step */
  readonly step: number;
  /** clinical thresholds this dial can cross for a scenario (criteria.md row ids in the comments) */
  readonly thresholds: (def: ScenarioDef) => readonly number[];
  /** half-width of the exclusion band around threshold `t` */
  readonly band: (t: number) => number;
}

/** T2 oracle gates (tests/synth/truth/truth-vs-oracle.test.ts) and practice grading tolerances (grade.ts › TOL). */
export const ORACLE_GATE = { hr: 2, interval: 10, qrs: 8, qt: 15, axis: 5, pAxis: 10, st: 0.03 } as const;
export const GRADING_TOL = { hrPct: 10, hrMinBpm: 5, intervalMs: 20, qtcMs: 30, axisDeg: 20 } as const;

const none = (): readonly number[] => [];
const rateBand = (t: number): number => Math.max(ORACLE_GATE.hr, 0.5 * Math.max(GRADING_TOL.hrMinBpm, (GRADING_TOL.hrPct / 100) * t));
const sexOf = (d: ScenarioDef) => d.patient?.sex ?? null;
const ageOf = (d: ScenarioDef) => d.patient?.ageY ?? null;

export const DIALS: Readonly<Record<DialId, DialDef>> = {
  rate: {
    id: 'rate', unit: 'bpm', exactness: 'forward', mechanism: 'clock rate (sinus, ectopic atrial, junctional, ventricular focus); the JT follows the rate law (QTc kept)',
    range: { min: 30, max: 250 }, implemented: true, step: 1,
    // sinus-pr-rate-rr: bradycardia < 60, tachycardia > 100 (also the escape / accelerated / tachycardia boundaries)
    thresholds: () => [THRESHOLDS.sinusBrady, THRESHOLDS.sinusTachy], band: rateBand,
  },
  pr: {
    id: 'pr', unit: 'ms', exactness: 'analytic', mechanism: 'AV-node ahMin solved at the beat RR (PR = intra-atrial + AH + HV)',
    range: { min: 100, max: 400 }, implemented: true, step: 1,
    // pr-normal / first-degree-avb: short < 120, long > 200
    thresholds: () => [THRESHOLDS.prShort, THRESHOLDS.prLong], band: () => Math.max(ORACLE_GATE.interval, GRADING_TOL.intervalMs / 2),
  },
  qrs: {
    id: 'qrs', unit: 'ms', exactness: 'forward', mechanism: 'conduction stretch about the QRS onset (the QT grows by the same ms, the axis is unchanged)',
    range: { min: 70, max: 200 }, implemented: true, step: 1,
    // bbb-qrs-cutoff: incomplete block 110–119, complete ≥ 120
    thresholds: () => [110, THRESHOLDS.qrsWide], band: () => Math.max(ORACLE_GATE.qrs, GRADING_TOL.intervalMs / 2),
  },
  qtc: {
    id: 'qtc', unit: 'ms', exactness: 'forward', mechanism: 'JT from the Fridericia QTc target at the base QRS',
    range: { min: 300, max: 600 }, implemented: true, step: 1,
    // qtc-bazett / qt-max-table: short ≤ 390, prolonged ≥ 450 (men) / 460 (women), marked > 500
    thresholds: (d) => [THRESHOLDS.qtcShort, qtcLongLimit(sexOf(d)), THRESHOLDS.qtcMarked], band: () => Math.max(ORACLE_GATE.qt, GRADING_TOL.qtcMs / 2),
  },
  axis: {
    id: 'axis', unit: 'deg', exactness: 'solve', mechanism: 'heart rotation about Frank Z, bisection on the ventricular-only net-deflection axis (residual ≤ 1°)',
    range: { min: -180, max: 180 }, implemented: true, step: 1,
    // qrs-axis-adult: normal −30…+90; LAFB −45…−90 (lafb); extreme beyond −90 / +180
    thresholds: () => [-90, -45, THRESHOLDS.axisNormalLo, THRESHOLDS.axisNormalHi, 180], band: () => Math.max(ORACLE_GATE.axis, GRADING_TOL.axisDeg / 2),
  },
  pAxis: {
    id: 'pAxis', unit: 'deg', exactness: 'solve', mechanism: 'rotation of the sinus P (and its Ta / atrial injury) about Frank Z, bisection on the atrial-only area axis (residual ≤ 2°)',
    range: { min: -90, max: 120 }, implemented: true, step: 1,
    // p-wave-normal: P axis 0…+75 (RA abnormality > +75; ectopic low atrial < 0)
    thresholds: () => [0, 75], band: () => Math.max(ORACLE_GATE.pAxis, GRADING_TOL.axisDeg / 2),
  },
  st: {
    id: 'st', unit: 'mV', exactness: 'forward', mechanism: 'injury amplitude, solved to the ST at J+60 in the injury reference lead (first injury of the source; its other injuries scale by the same factor)',
    range: { min: -0.5, max: 0.8 }, implemented: true, step: 0.01,
    // STEMI thresholds by lead / sex / age (stemiThresholdMv); ST depression ≥ 0.05 mV (st-depression)
    thresholds: (d) => {
      const inj = d.source.injury?.[0];
      if (!inj) return [];
      return inj.stMv >= 0 ? [stemiThresholdMv(inj.ref ?? 'II', sexOf(d), ageOf(d))] : [-THRESHOLDS.posteriorStDepressionMv];
    },
    band: () => ORACLE_GATE.st,
  },
  tAmp: {
    id: 'tAmp', unit: '×', exactness: 'forward', mechanism: 'primary repolarisation gradient scale |G| (the secondary T of the QRS stays)',
    range: { min: 0, max: 3 }, implemented: true, step: 0.01, thresholds: none, band: () => 0,
  },
  voltage: {
    id: 'voltage', unit: '×', exactness: 'forward', mechanism: 'torso transfer gain (body habitus): scales every lead; the voltage criteria are truth facts',
    range: { min: 0.3, max: 2 }, implemented: true, step: 0.01, thresholds: none, band: () => 0,
  },
  hrv: {
    id: 'hrv', unit: '', exactness: 'statistic', mechanism: 'sinus respiratory modulation depth (the realised PP range is truth.facts.ppRangeMs)',
    range: { min: 0, max: 0.25 }, implemented: true, step: 0.005, thresholds: none, band: () => 0,
  },
  conductionRatio: {
    id: 'conductionRatio', unit: 'N:1', exactness: 'categorical', mechanism: 'flutter / atrial tachycardia: AV-node ERP placed inside the N:1 window (junction.ts › erpForRatio)',
    range: { min: 1, max: 6 }, implemented: true, step: 1, thresholds: none, band: () => 0,
  },
  ventricularResponse: {
    id: 'ventricularResponse', unit: 'bpm', exactness: 'statistic', mechanism: 'AF: AV-node ERP from the calibrated ERP → mean ventricular rate map (AF_RESPONSE_MAP); the realised mean rate is reported',
    range: { min: 40, max: 180 }, implemented: true, step: 1,
    // atrial-fibrillation: slow < 60, rapid ventricular response > 100
    thresholds: () => [THRESHOLDS.sinusBrady, THRESHOLDS.sinusTachy], band: rateBand,
  },
  fCoarseness: {
    id: 'fCoarseness', unit: '', exactness: 'forward', mechanism: 'fibrillatory wavelet amplitude (AF f waves, VF coarse → fine)',
    range: { min: 0, max: 1 }, implemented: true, step: 0.01, thresholds: none, band: () => 0,
  },
  stage: {
    id: 'stage', unit: '', exactness: 'categorical', mechanism: 'infarct age / hyperkalaemia stage: expressed as scenario variants (stemi-evolution, hyperkalemia-severe), not as a dial',
    range: { min: 0, max: 1 }, implemented: false, step: 1, thresholds: none, band: () => 0,
  },
  site: {
    id: 'site', unit: '', exactness: 'categorical', mechanism: 'origin / pathway / territory: expressed as scenario variants (pvc, stemi-inferior, old-mi…), not as a dial',
    range: { min: 0, max: 1 }, implemented: false, step: 1, thresholds: none, band: () => 0,
  },
  noise: {
    id: 'noise', unit: 'mV', exactness: 'statistic', mechanism: 'recording-chain noise level: respiratory wander of this amplitude plus EMG (1/15) and mains (1/6) on the diagnostic filter; the realised noise RMS is reported',
    range: { min: 0, max: 0.5 }, implemented: true, step: 0.01, thresholds: none, band: () => 0,
  },
};

/**
 * AF ventricular response: AV-node ERP (ms) → mean ventricular rate (bpm) of the AF scenario's node (jitter 0.16,
 * concealment 0.35, f-wave cycle 150 ms), measured over 12 seeds × 10 s (scripts/synth/sweep.ts --af-map). Monotone;
 * the seed-to-seed SD of a 10 s strip is 6–12 bpm, which is why the dial is a statistic.
 */
export const AF_RESPONSE_MAP: readonly (readonly [erpMs: number, bpm: number])[] = [
  [240, 161.7], [270, 139.4], [300, 118.9], [330, 102.5], [380, 87.4], [440, 67.8], [520, 49.1],
];

/** ERP (ms) for a mean AF ventricular rate (linear interpolation in the map, clamped to its ends). */
export function erpForVentricularResponse(bpm: number): number {
  const M = AF_RESPONSE_MAP;
  if (bpm >= M[0][1]) return M[0][0];
  if (bpm <= M[M.length - 1][1]) return M[M.length - 1][0];
  for (let i = 1; i < M.length; i++) {
    const [e0, b0] = M[i - 1], [e1, b1] = M[i];
    if (bpm <= b0 && bpm >= b1) return e0 + ((bpm - b0) / (b1 - b0)) * (e1 - e0);
  }
  return M[M.length - 1][0];
}

/**
 * Slow AF response: ERP (ms) → mean ventricular rate (bpm) of the 'slow' variant's node (jitter 0.05, concealment 0.08,
 * f-wave cycle 150 ms), measured over 12 seeds × 10 s (2026-10-29, as AF_RESPONSE_MAP). Seed-to-seed range ±8 bpm.
 */
export const AF_SLOW_RESPONSE_MAP: readonly (readonly [erpMs: number, bpm: number])[] = [
  [760, 63.6], [810, 58.2], [910, 52.1], [1010, 44.8], [1160, 39.3],
];

/** ERP (ms) of the slow-variant node for a mean AF ventricular rate (interpolation, clamped to the map). */
export function erpForSlowResponse(bpm: number): number {
  const M = AF_SLOW_RESPONSE_MAP;
  if (bpm >= M[0][1]) return M[0][0];
  for (let i = 1; i < M.length; i++) {
    const [e0, b0] = M[i - 1], [e1, b1] = M[i];
    if (bpm >= b1) return e0 + ((bpm - b0) / (b1 - b0)) * (e1 - e0);
  }
  return M[M.length - 1][0];
}

/** Mean ventricular rate (bpm) AF_RESPONSE_MAP gives for an ERP (inverse; extrapolated past its slow end: only the
 *  response class of a variant's node is read from it). */
export function ventricularResponseAt(erpMs: number): number {
  const M = AF_RESPONSE_MAP;
  if (erpMs <= M[0][0]) return M[0][1];
  for (let i = 1; i < M.length; i++) {
    const [e0, b0] = M[i - 1], [e1, b1] = M[i];
    if (erpMs <= e1) return b0 + ((erpMs - e0) / (e1 - e0)) * (b1 - b0);
  }
  const [e0, b0] = M[M.length - 2], [e1, b1] = M[M.length - 1];
  return b1 + ((erpMs - e1) / (e1 - e0)) * (b1 - b0);
}

/** The noise spec of the `noise` dial (and of the 'noisy' difficulty at 0.3 mV). */
export function noiseForLevel(mv: number) {
  return { wanderMv: mv, emgMv: mv / 15, mains: { mv: mv / 6, hz: 50 as const, imbalance: 0.25 } };
}

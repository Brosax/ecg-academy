/**
 * Hallmark criteria, group 'structural' (DECISION §9.10). Thresholds: criteria.md rows named in each `source`
 * (`hcm`, `pulmonary-embolism`, `early-repolarization` and the bullets "Brugada pattern / syndrome — Type 1 ECG",
 * "Brugada pattern — Type 2", "Arrhythmogenic (right ventricular) cardiomyopathy", "Acute pericarditis / tamponade",
 * "Pulmonary embolism — Most frequent finding and RV-strain markers"). Criteria read only the oracle's measurement.
 */
import { STD_LEADS, type StdLead } from '../../../../src/core/leads';
import { at, cornellMm, crit, f, fmt, rOf, sokolowMm, stJ, type Criterion, type CriterionCtx, type ScenarioCriteria } from './types';

const ALL: readonly StdLead[] = STD_LEADS;
const LIMBS: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const CHEST: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const count = (ls: readonly StdLead[], p: (l: StdLead) => boolean): number => ls.filter(p).length;
const n = (c: CriterionCtx, msv: number): number => Math.max(1, Math.round((msv * c.fs) / 1000));
const jList = (c: CriterionCtx, ls: readonly StdLead[]): string => ls.map((l) => `${l} ${fmt(stJ(c, l))}`).join(' ');
const tList = (c: CriterionCtx, ls: readonly StdLead[]): string => ls.map((l) => `${l} ${fmt(f(c, l).t)}`).join(' ');

/** Saddleback shape of one lead: J level, the ST trough before the T peak, the T peak (J+100 ms … T end). */
export function saddle(c: CriterionCtx, l: StdLead): { j: number; trough: number; t: number } {
  const x = c.m.median[l];
  const j0 = c.m.medianOff;
  const end = c.m.medianTOff ?? j0 + n(c, 400);
  let t = -Infinity, ti = j0 + n(c, 100);
  for (let k = j0 + n(c, 100); k <= end; k++) if (x[k] > t) {
    t = x[k];
    ti = k;
  }
  let trough = Infinity;
  for (let k = j0 + n(c, 10); k < ti; k++) trough = Math.min(trough, x[k]);
  return { j: x[j0], trough, t };
}

/** Terminal activation duration (ms): from the nadir of the S wave to the end of the QRS (2010 Task Force). */
export function tadMs(c: CriterionCtx, l: StdLead): number {
  const x = c.m.median[l];
  let mi = c.m.medianOn, mv = Infinity;
  for (let k = c.m.medianOn; k <= c.m.medianOff; k++) if (x[k] < mv) {
    mv = x[k];
    mi = k;
  }
  return ((c.m.medianOff - mi) * 1000) / c.fs;
}

/** Epsilon wave: prominence (mV) of the largest small positive wiggle within 60 ms after the QRS end. */
export function epsilon(c: CriterionCtx, l: StdLead): number {
  const x = c.m.median[l];
  const a = c.m.medianOff - n(c, 4), b = c.m.medianOff + n(c, 60);
  let best = 0;
  for (let i = a + 1; i < b; i++) {
    if (!(x[i] >= x[i - 1] && x[i] > x[i + 1])) continue;
    let lo1 = x[i], lo2 = x[i];
    for (let k = i; k >= a; k--) lo1 = Math.min(lo1, x[k]);
    for (let k = i; k <= b; k++) lo2 = Math.min(lo2, x[k]);
    best = Math.max(best, Math.min(x[i] - lo1, x[i] - lo2));
  }
  return best;
}

/** PR-segment displacement against the TP baseline (mV): mean of QRS on −30…−10 ms minus mean of P on −30…−10 ms. */
export function prShift(c: CriterionCtx, l: StdLead): number | null {
  if (c.m.medianPOn === null) return null;
  const x = c.m.median[l];
  const mean = (a: number, b: number): number => {
    let s = 0;
    for (let k = a; k <= b; k++) s += x[k];
    return s / (b - a + 1);
  };
  return mean(c.m.medianOn - n(c, 30), c.m.medianOn - n(c, 10)) - mean(c.m.medianPOn - n(c, 30), c.m.medianPOn - n(c, 10));
}

const pathQ = (c: CriterionCtx, l: StdLead): boolean => f(c, l).q <= -0.1 && f(c, l).qDur >= 40;
const NO_RECIPROCAL = (except: readonly StdLead[]) => crit(`no reciprocal ST↓ (≥ −0.05 mV) except ${except.join(', ')}`, 'Acute pericarditis / tamponade (no reciprocal depression except aVR and often V1)', (c) => {
  const bad = ALL.filter((l) => !except.includes(l) && (stJ(c, l) < -0.05 || f(c, l).st60 < -0.05));
  return [bad.length === 0, bad.map((l) => `${l} J ${fmt(stJ(c, l))} ST60 ${fmt(f(c, l).st60)}`).join(' ')];
});

export const STRUCTURAL_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  'brugada-type1': {
    hallmarks: [
      crit('coved J ≥ 0.2 mV followed by a negative T in V1 or V2', 'Brugada pattern / syndrome — Type 1 ECG', (c) => {
        const ok = (['V1', 'V2'] as const).some((l) => stJ(c, l) >= 0.2 && f(c, l).tMin < -0.05);
        return [ok, (['V1', 'V2'] as const).map((l) => `${l} J ${fmt(stJ(c, l))} Tmin ${fmt(f(c, l).tMin)}`).join(', ')];
      }),
      crit('coved descent starts at the J peak (no flat top: J+40 below J)', 'DECISION §12.2 (brugada)', (c) => {
        const l: StdLead = stJ(c, 'V1') >= stJ(c, 'V2') ? 'V1' : 'V2';
        const j = (c.m.medianOff - c.m.medianOn) * (1000 / c.fs);
        return [at(c, l, j + 40) < at(c, l, j) - 0.03, `${l} J ${fmt(at(c, l, j))} J+40 ${fmt(at(c, l, j + 40))}`];
      }),
      crit('no reciprocal ST↓ (every lead ≥ −0.05 mV)', 'Brugada pattern / syndrome — Type 1 ECG; DECISION §9.10', (c) => {
        const bad = ALL.filter((l) => l !== 'aVR' && (f(c, l).st60 < -0.05 || stJ(c, l) < -0.05));
        return [bad.length === 0, bad.map((l) => `${l} J ${fmt(stJ(c, l))} ST ${fmt(f(c, l).st60)}`).join(' ')];
      }),
      crit('V3 J < 0.15 mV', 'DECISION §9.10', (c) => [stJ(c, 'V3') < 0.15, `V3 J ${fmt(stJ(c, 'V3'))}`]),
      crit('narrow, small initial r in V1 (< 0.3 mV)', 'DECISION §12.2 (brugada)', (c) => [rOf(c, 'V1') < 0.3, `V1 r ${fmt(rOf(c, 'V1'))}`]),
    ],
    optOut: { 'st-segment': 'coved ST elevation in V1–V2', 't-asymmetry': 'coved ST-T in V1–V2', 'qt-dispersion': 'delayed right-precordial repolarisation (V1–V2) is the finding' },
  },
  'brugada-type2': {
    hallmarks: [
      crit('saddleback in V1 and V2: J take-off ≥ 0.2 mV, ST trough ≥ 0.05 mV above the baseline, then an upright T rising above the trough', 'Brugada pattern — Type 2 (saddleback; Bayés de Luna 2012)', (c) => {
        const ok = (l: StdLead): boolean => {
          const s = saddle(c, l);
          return s.j >= 0.2 && s.trough >= 0.05 && s.trough < s.j - 0.05 && s.t >= s.trough + 0.03;
        };
        const sv = (l: StdLead): string => {
          const s = saddle(c, l);
          return `${l} J ${fmt(s.j)} trough ${fmt(s.trough)} T ${fmt(s.t)}`;
        };
        return [ok('V1') && ok('V2'), `${sv('V1')}; ${sv('V2')}`];
      }),
      crit('not coved in V1: no negative T after the elevated ST in V1', 'Brugada pattern — Type 2 vs type 1', (c) => [f(c, 'V1').tMin > -0.05, `V1 Tmin ${fmt(f(c, 'V1').tMin)}`]),
      crit('not type 1: no negative T after the elevated ST in V2', 'Brugada pattern — Type 2 (positive or flat T in V2)', (c) => [f(c, 'V2').tMin > -0.05, `V2 Tmin ${fmt(f(c, 'V2').tMin)}`]),
      crit('right-precordial only: V3 J < 0.15 mV and no reciprocal ST↓', 'Brugada pattern — Type 2; DECISION §9.10', (c) => {
        const bad = ALL.filter((l) => l !== 'aVR' && (f(c, l).st60 < -0.05 || stJ(c, l) < -0.05));
        return [stJ(c, 'V3') < 0.15 && bad.length === 0, `V3 J ${fmt(stJ(c, 'V3'))}; ${bad.join(' ')}`];
      }),
    ],
    optOut: { 'st-segment': 'saddleback ST elevation in V1–V2', 't-asymmetry': 'saddleback ST-T in V1–V2' },
  },
  hcm: {
    hallmarks: [
      crit('deep, narrow septal q (≥ 0.3 mV, < 40 ms) in ≥ 2 of I, aVL, V5, V6 (or of II, III, aVF)', 'hcm (deep narrow Q > 3 mm and/or > 40 ms)', (c) => {
        const q = (l: StdLead): boolean => f(c, l).q <= -0.3 && f(c, l).qDur < 40;
        const lat = count(['I', 'aVL', 'V5', 'V6'], q), inf = count(['II', 'III', 'aVF'], q);
        return [lat >= 2 || inf >= 2, (['I', 'aVL', 'V5', 'V6', 'II', 'III', 'aVF'] as const).map((l) => `${l} q ${fmt(f(c, l).q)}/${fmt(f(c, l).qDur, 0)}`).join(' ')];
      }),
      crit('LVH voltage: Sokolow–Lyon > 35 mm or Cornell > 28 / 20 mm (sex)', 'hcm (LVH voltage); lvh-axis-voltage', (c) => {
        const corn = c.def.patient?.sex === 'female' ? 20 : 28;
        return [sokolowMm(c) > 35 || cornellMm(c) > corn, `Sokolow ${fmt(sokolowMm(c), 0)} Cornell ${fmt(cornellMm(c), 0)}`];
      }),
      crit('narrow QRS (< 120 ms)', 'hcm (LBBB is uncommon in untreated HCM)', (c) => [c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
    ],
  },
  'apical-hcm': {
    hallmarks: [
      crit('giant negative T: ≥ 1.0 mV in at least one of V3–V5 and ≥ 0.5 mV in ≥ 3 of V2–V6', 'hcm (giant negative T ≥ 10 mm in V2–V5 in apical HCM)', (c) => {
        const giant = count(['V3', 'V4', 'V5'], (l) => f(c, l).tMin <= -1.0);
        // (giant inversion across V3–V5, not in one lead: criteria.md HCM red flags "≥ 10 mm in V2–V5")
        if (giant < 3) return [false, `giant (≤ −1.0 mV) in ${giant} of V3–V5; ${tList(c, CHEST)}`];
        const deep = count(['V2', 'V3', 'V4', 'V5', 'V6'], (l) => f(c, l).tMin <= -0.5);
        return [giant >= 1 && deep >= 3, tList(c, CHEST)];
      }),
      crit('tall R in V4–V5 (≥ 1.2 mV in one of them)', 'hcm (LVH voltage with repolarisation abnormality)', (c) => [Math.max(rOf(c, 'V4'), rOf(c, 'V5')) >= 1.2, `R V4 ${fmt(rOf(c, 'V4'))} V5 ${fmt(rOf(c, 'V5'))}`]),
      crit('no pathological Q in V2–V6 (not an infarct)', 'pathological-q', (c) => [!(['V2', 'V3', 'V4', 'V5', 'V6'] as const).some((l) => pathQ(c, l)), CHEST.map((l) => `${l} q ${fmt(f(c, l).q)}`).join(' ')]),
    ],
    optOut: { 't-asymmetry': 'giant inverted T', 'qt-dispersion': 'apical repolarisation delay', 't-over-r-v5v6': 'giant T' },
  },
  arvc: {
    hallmarks: [
      crit('T inversion (≥ 0.1 mV) in V1, V2 and V3', 'Arrhythmogenic (right ventricular) cardiomyopathy (T inversion V1–V3, major)', (c) => [(['V1', 'V2', 'V3'] as const).every((l) => f(c, l).tMin <= -0.1 && f(c, l).t < 0), tList(c, ['V1', 'V2', 'V3'])]),
      crit('no complete RBBB (QRS < 120 ms)', 'Arrhythmogenic (right ventricular) cardiomyopathy ("without complete RBBB")', (c) => [c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('terminal activation duration ≥ 55 ms in V1, V2 or V3', 'Arrhythmogenic (right ventricular) cardiomyopathy (TAD ≥ 55 ms)', (c) => [(['V1', 'V2', 'V3'] as const).some((l) => tadMs(c, l) >= 55), (['V1', 'V2', 'V3'] as const).map((l) => `${l} ${fmt(tadMs(c, l), 0)}`).join(' ')]),
      crit('epsilon wave: a small wiggle (≥ 0.02 mV) after the QRS end in V1 or V2, not in V5–V6', 'Arrhythmogenic (right ventricular) cardiomyopathy (epsilon wave)', (c) => [Math.max(epsilon(c, 'V1'), epsilon(c, 'V2')) >= 0.02 && Math.max(epsilon(c, 'V5'), epsilon(c, 'V6')) < 0.015, (['V1', 'V2', 'V5', 'V6'] as const).map((l) => `${l} ${fmt(epsilon(c, l), 3)}`).join(' ')]),
    ],
    optOut: { 't-asymmetry': 'inverted right-precordial T', 'qt-dispersion': 'RV repolarisation delay', 'no-spikes': 'epsilon wiggle after the QRS' },
  },
  pericarditis: {
    hallmarks: [
      crit('diffuse ST↑ (J ≥ 0.1 mV) in ≥ 6 leads', 'Acute pericarditis / tamponade (widespread concave ST elevation)', (c) => [count(ALL, (l) => stJ(c, l) >= 0.1) >= 6, jList(c, ALL)]),
      crit('ST↓ in aVR', 'Acute pericarditis / tamponade (reciprocal depression only in aVR)', (c) => [stJ(c, 'aVR') <= -0.05, jList(c, ['aVR'])]),
      NO_RECIPROCAL(['aVR', 'V1']),
      crit('PR depression ≥ 0.1 mV (1 mm) in II with PR elevation in aVR (against the TP baseline)', 'Acute pericarditis / tamponade (PR depression, PR elevation in aVR)', (c) => {
        const ii = prShift(c, 'II'), avr = prShift(c, 'aVR');
        return [ii !== null && avr !== null && ii <= -0.1 && avr >= 0.05, `PR shift II ${fmt(ii)} aVR ${fmt(avr)}`];
      }),
      crit('ST/T ratio in V6 ≥ 0.25 (pericarditis rather than early repolarisation)', 'early-repolarization; Acute pericarditis (ST/T V6 ratio, Ginzton 1982)', (c) => {
        const r = stJ(c, 'V6') / Math.max(1e-6, f(c, 'V6').t);
        return [r >= 0.25, `V6 ST ${fmt(stJ(c, 'V6'))} T ${fmt(f(c, 'V6').t)} ratio ${fmt(r)}`];
      }),
      crit('no pathological Q waves', 'pathological-q (pericarditis does not cause Q waves)', (c) => [!ALL.some((l) => l !== 'aVR' && l !== 'III' && pathQ(c, l)), ALL.map((l) => `${l} ${fmt(f(c, l).q)}`).join(' ')]),
    ],
    optOut: { 'st-segment': 'diffuse epicardial injury current', 't-asymmetry': 'ST-T merged by the injury current', 'tp-level': 'PR depression against the TP baseline' },
  },
  'pericardial-effusion': {
    hallmarks: [
      crit('low voltage: every limb lead < 0.5 mV or every chest lead < 1.0 mV (peak to peak)', 'Acute pericarditis / tamponade (low QRS voltage)', (c) => [LIMBS.every((l) => f(c, l).p2p < 0.5) || CHEST.every((l) => f(c, l).p2p < 1.0), ALL.map((l) => `${l} ${fmt(f(c, l).p2p)}`).join(' ')]),
      crit('sinus tachycardia (> 100/min)', 'Acute pericarditis / tamponade (sinus tachycardia)', (c) => [c.m.hrBpm > 100, `HR ${fmt(c.m.hrBpm, 0)}`]),
    ],
    optOut: { 'limb-voltage': 'low voltage is the finding' },
  },
  'pulmonary-embolism': {
    hallmarks: [
      crit('sinus tachycardia (> 100/min)', 'pulmonary-embolism (sinus tachycardia: the commonest abnormality)', (c) => [c.m.hrBpm > 100, `HR ${fmt(c.m.hrBpm, 0)}`]),
      crit('S1Q3T3: S in I ≥ 0.15 mV, Q in III ≥ 0.1 mV, T inverted in III', 'pulmonary-embolism (S1Q3T3)', (c) => [f(c, 'I').s <= -0.15 && f(c, 'III').q <= -0.1 && f(c, 'III').t < 0, `I S ${fmt(f(c, 'I').s)}; III q ${fmt(f(c, 'III').q)} T ${fmt(f(c, 'III').t)}`]),
      crit('right-precordial T inversion (≥ 0.1 mV) in ≥ 2 of V1–V3', 'pulmonary-embolism (T inversion V1–V4: RV strain)', (c) => [count(['V1', 'V2', 'V3'], (l) => f(c, l).tMin <= -0.1) >= 2, tList(c, ['V1', 'V2', 'V3', 'V4'])]),
      crit('rightward axis (≥ +75°)', 'pulmonary-embolism (right axis shift)', (c) => [c.m.axisDeg >= 75 || c.m.axisDeg <= -150, `axis ${fmt(c.m.axisDeg, 0)}`]),
    ],
    optOut: { 't-asymmetry': 'inverted right-precordial T', 'qt-dispersion': 'RV repolarisation delay' },
  },
};

/** Variant additions of the structural group. */
export const STRUCTURAL_VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  hcm: {
    repolarization: [crit('lateral repolarisation abnormality: T↓ ≥ 0.1 mV in ≥ 2 of I, aVL, V5, V6', 'hcm (repolarisation abnormalities, often lateral)', (c) => [count(['I', 'aVL', 'V5', 'V6'], (l) => f(c, l).tMin <= -0.1) >= 2, tList(c, ['I', 'aVL', 'V5', 'V6'])])],
  },
};

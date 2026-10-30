/**
 * Hallmark criteria, group 'repolarization' (DECISION §9.9). Thresholds: criteria.md rows named in each `source`
 * (electrolytes-drugs-misc-conditions: `qt-causes`, `digitalis-effect`, the bullets "Hyperkalaemia — ECG progression",
 * "Hypokalaemia — ECG signs", "Calcium disorders — QT mechanism", "QT interval — Measurement, correction and
 * thresholds", "Congenital long QT syndrome", "Short QT syndrome", "Sodium-channel blocker toxicity", "Hypothermia").
 * Every criterion reads only the oracle's measurement of the delivered ECG.
 */
import type { StdLead } from '../../../../src/core/leads';
import { hexDeg } from '../measure';
import { crit, f, fmt, rOf, stJ, type Criterion, type CriterionCtx, type ScenarioCriteria } from './types';

const ALL: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const PRECORDIAL: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const count = (ls: readonly StdLead[], p: (l: StdLead) => boolean): number => ls.filter(p).length;
const ms = (c: CriterionCtx, samples: number): number => (samples * 1000) / c.fs;
const idx = (c: CriterionCtx, msAfterOn: number): number => c.m.medianOn + Math.round((msAfterOn * c.fs) / 1000);

/** Fridericia QTc of the oracle (ms) from its QT and mean heart rate. */
export const qtcF = (c: CriterionCtx): number | null => (c.m.qtMs === null ? null : c.m.qtMs / Math.cbrt(60 / c.m.hrBpm));

/** Peak of the T (signed, largest |x|) in J+40 … T end of the representative beat, and its sample index. */
export function tPeak(c: CriterionCtx, l: StdLead): { v: number; i: number } {
  const x = c.m.median[l];
  const a = c.m.medianOff + Math.round(0.04 * c.fs);
  const b = c.m.medianTOff ?? Math.min(x.length - 1, a + Math.round(0.4 * c.fs));
  let v = 0, i = a;
  for (let k = a; k <= b; k++) if (Math.abs(x[k]) > Math.abs(v)) {
    v = x[k];
    i = k;
  }
  return { v, i };
}

/** ms after the J point at which the T first reaches `frac` of its peak (same sign); null without a T. */
export function tOnsetAfterJ(c: CriterionCtx, l: StdLead, frac = 0.15): number | null {
  const x = c.m.median[l];
  const p = tPeak(c, l);
  if (Math.abs(p.v) < 0.03) return null;
  for (let k = c.m.medianOff; k <= p.i; k++) if (Math.sign(p.v) * x[k] >= frac * Math.abs(p.v)) return ms(c, k - c.m.medianOff);
  return null;
}

/** Duration (ms) from the T onset (`frac` of its peak) to the oracle's T end. */
export function tDurationMs(c: CriterionCtx, l: StdLead, frac = 0.1): number | null {
  const on = tOnsetAfterJ(c, l, frac);
  if (on === null || c.m.medianTOff === null) return null;
  return ms(c, c.m.medianTOff - c.m.medianOff) - on;
}

/** U wave of a lead: the largest |deflection| in T end + 10 … + 240 ms (signed). */
export function uWave(c: CriterionCtx, l: StdLead): number {
  if (c.m.medianTOff === null) return 0;
  const x = c.m.median[l];
  let v = 0;
  for (let k = c.m.medianTOff + Math.round(0.01 * c.fs); k < Math.min(x.length, c.m.medianTOff + Math.round(0.24 * c.fs)); k++) if (Math.abs(x[k]) > Math.abs(v)) v = x[k];
  return v;
}

/** Humps of the T (local maxima of the T-signed signal ≥ 0.05 mV, separated by a dip of ≥ 0.02 mV): a bifid T has 2. */
export function tHumps(c: CriterionCtx, l: StdLead): number {
  const x = c.m.median[l];
  const sg = Math.sign(tPeak(c, l).v) || 1;
  const a = c.m.medianOff + Math.round(0.04 * c.fs);
  const b = c.m.medianTOff ?? a + Math.round(0.4 * c.fs);
  const peaks: number[] = [];
  let minSince = Infinity;
  for (let k = a + 1; k < b; k++) {
    const y = sg * x[k];
    minSince = Math.min(minSince, y);
    if (!(y > sg * x[k - 1] && y >= sg * x[k + 1] && y >= 0.05)) continue;
    const last = peaks[peaks.length - 1];
    if (last !== undefined && (last - minSince < 0.02 || y - minSince < 0.02)) peaks[peaks.length - 1] = Math.max(last, y);
    else peaks.push(y);
    minSince = Infinity;
  }
  return peaks.length;
}

/** Frontal axis of the terminal 40 ms of the QRS (area of I and aVF), degrees. */
export function terminalAxis(c: CriterionCtx): number {
  const a = c.m.medianOff - Math.round(0.04 * c.fs);
  let i = 0, v = 0;
  for (let k = a; k <= c.m.medianOff; k++) {
    i += c.m.median.I[k];
    v += c.m.median.aVF[k];
  }
  return hexDeg(i, v);
}

const tList = (c: CriterionCtx, ls: readonly StdLead[]): string => ls.map((l) => `${l} ${fmt(f(c, l).t)}`).join(' ');
const qtcMsg = (c: CriterionCtx): string => `QTcF ${fmt(qtcF(c), 0)} (QT ${fmt(c.m.qtMs, 0)} HR ${fmt(c.m.hrBpm, 0)})`;
const female = (c: CriterionCtx): boolean => c.def.patient?.sex === 'female';
/** criteria.md "QT interval — thresholds": prolonged ≥ 450 ms (men) / ≥ 460 ms (women) */
const qtcLimit = (c: CriterionCtx): number => (female(c) ? 460 : 450);

export const REPOLARIZATION_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  hyperkalemia: {
    hallmarks: [
      crit('peaked T ≥ 1.0 mV in ≥ 2 of V2–V4', 'qt-causes; Hyperkalaemia — ECG progression (tented T)', (c) => {
        const n = (['V2', 'V3', 'V4'] as const).filter((l) => f(c, l).t >= 1.0).length;
        return [n >= 2, `T V2–V4 ${(['V2', 'V3', 'V4'] as const).map((l) => fmt(f(c, l).t)).join(' ')}`];
      }),
      crit('symmetric (0.8 < rise/fall < 1.25) and narrow (FWHM < 110 ms) T in V3–V4', 'DECISION §9.9 (hyperkalemia)', (c) => {
        const bad = (['V3', 'V4'] as const).filter((l) => !(f(c, l).tAsym > 0.8 && f(c, l).tAsym < 1.25 && f(c, l).tFwhm < 110));
        return [bad.length === 0, bad.map((l) => `${l} asym ${fmt(f(c, l).tAsym)} FWHM ${fmt(f(c, l).tFwhm, 0)}`).join(', ')];
      }),
      crit('tented T also in the inferior leads (II ≥ 0.5 mV) and not fading laterally (V6 ≥ ½ V4)', 'DECISION §12.2 (hyperk)', (c) => [f(c, 'II').t >= 0.5 && f(c, 'V6').t >= 0.5 * f(c, 'V4').t, `T II ${fmt(f(c, 'II').t)} V4 ${fmt(f(c, 'V4').t)} V6 ${fmt(f(c, 'V6').t)}`]),
      crit('QTc normal or short (Fridericia < 440 ms)', 'qt-causes', (c) => {
        const q = qtcF(c);
        return [q !== null && q < 440, qtcMsg(c)];
      }),
      crit('stage 2: P still visible but flattened (0.05–0.1 mV in II), PR 185–240, QRS 100–130', 'DECISION §9.9 (hyperkalemia stage 2); §12.2 (P visible)', (c) => {
        const p = f(c, 'II').p;
        return [p >= 0.05 && p < 0.1 && c.m.prMs !== null && c.m.prMs >= 185 && c.m.prMs <= 240 && c.m.qrsMs >= 100 && c.m.qrsMs <= 130, `P II ${fmt(p)} PR ${fmt(c.m.prMs, 0)} QRS ${fmt(c.m.qrsMs, 0)}`];
      }),
    ],
    optOut: { 't-asymmetry': 'tented symmetric T is the finding', 't-over-r-v5v6': 'peaked T may exceed R', 'st-segment': 'tall early T' },
  },
  'hyperkalemia-severe': {
    hallmarks: [
      crit('no visible P (< 0.05 mV in II and V1)', 'Hyperkalaemia — ECG progression (loss of P waves)', (c) => [f(c, 'II').p < 0.05 && f(c, 'V1').p < 0.05, `P II ${fmt(f(c, 'II').p)} V1 ${fmt(f(c, 'V1').p)}`]),
      crit('very wide QRS (> 150 ms)', 'Hyperkalaemia — ECG progression (QRS widening → sine wave)', (c) => [c.m.qrsMs > 150, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('tall tented T ≥ 0.8 mV in V3 or V4', 'Hyperkalaemia — ECG progression', (c) => [Math.max(f(c, 'V3').t, f(c, 'V4').t) >= 0.8, tList(c, ['V3', 'V4'])]),
      crit('no isoelectric ST: the T leaves the J point within 50 ms in V3–V4', 'DECISION §9.9 (stage 3: QRS merging into T)', (c) => {
        const on = (['V3', 'V4'] as const).map((l) => tOnsetAfterJ(c, l));
        return [on.every((x) => x !== null && x <= 50), `T onset after J V3 ${fmt(on[0], 0)} V4 ${fmt(on[1], 0)} ms`];
      }),
    ],
    optOut: { 'sinus-p': 'P flattened to invisibility (the emergency pattern)', 't-asymmetry': 'tented symmetric T', 't-over-r-v5v6': 'peaked T may exceed R', 'st-segment': 'no ST segment (QRS merges into T)', 'qt-dispersion': 'the wide QRS merges into the T: T ends are ill-defined' },
  },
  hypokalemia: {
    hallmarks: [
      crit('flat T (|T| ≤ 0.1 mV) in ≥ 4 leads', 'Hypokalaemia — ECG signs (T flattening)', (c) => [count(ALL, (l) => Math.abs(f(c, l).t) <= 0.1) >= 4, tList(c, ALL)]),
      crit('prominent U ≥ 0.1 mV in V2 and V3, taller than the T in at least one of them', 'Hypokalaemia — ECG signs ("often taller than the T in V2–V3")', (c) => {
        const u2 = uWave(c, 'V2'), u3 = uWave(c, 'V3');
        return [u2 >= 0.1 && u3 >= 0.1 && (u2 > f(c, 'V2').t || u3 > f(c, 'V3').t), `U V2 ${fmt(u2)} V3 ${fmt(u3)}; ${tList(c, ['V2', 'V3'])}`];
      }),
      crit('slight ST depression (J+60 ≤ −0.02 mV) in ≥ 2 of II, V4–V6, none deeper than 0.1 mV', 'Hypokalaemia — ECG signs (ST depression)', (c) => {
        const ls = ['II', 'V4', 'V5', 'V6'] as const;
        return [count(ls, (l) => f(c, l).st60 <= -0.02) >= 2 && ALL.every((l) => f(c, l).st60 > -0.1), ls.map((l) => `${l} ${fmt(f(c, l).st60)}`).join(' ')];
      }),
      crit('the QT (to the end of the T, not the U) stays normal: QTcF < 450 ms', 'Hypokalaemia — ECG signs (apparent long QT is a QU)', (c) => {
        const q = qtcF(c);
        return [q !== null && q < 450, qtcMsg(c)];
      }),
    ],
    optOut: { 't-asymmetry': 'flat T', 'tp-level': 'the U wave runs into the TP segment' },
  },
  hypercalcemia: {
    hallmarks: [
      crit('short QT: QTcF < 360 ms', 'Calcium disorders — QT mechanism (hypercalcaemia)', (c) => {
        const q = qtcF(c);
        return [q !== null && q < 360, qtcMsg(c)];
      }),
      crit('no ST segment: the T leaves the J point within 45 ms in V3 and V4 (normal ≈ 70–100 ms)', 'Calcium disorders — QT mechanism ("T wave seems to start at the end of the QRS")', (c) => {
        const on = (['V3', 'V4'] as const).map((l) => tOnsetAfterJ(c, l));
        return [on.every((x) => x !== null && x <= 45), `T onset after J V3 ${fmt(on[0], 0)} V4 ${fmt(on[1], 0)} ms`];
      }),
      crit('T of normal shape and height (upright 0.2–1.2 mV in V3–V4)', 'Calcium disorders — QT mechanism', (c) => [(['V3', 'V4'] as const).every((l) => f(c, l).t >= 0.2 && f(c, l).t <= 1.2), tList(c, ['V3', 'V4'])]),
    ],
    optOut: { 'st-segment': 'no ST segment is the finding', 't-asymmetry': 'T starts at the J point' },
  },
  hypocalcemia: {
    hallmarks: [
      crit('long QT: QTcF ≥ the sex-specific limit (460 ms women / 450 ms men)', 'Calcium disorders — QT mechanism; QT interval — thresholds', (c) => {
        const q = qtcF(c);
        return [q !== null && q >= qtcLimit(c), `${qtcMsg(c)} limit ${qtcLimit(c)}`];
      }),
      crit('long isoelectric ST: the T starts ≥ 140 ms after J in V3–V4, ST within ±0.05 mV', 'Calcium disorders — QT mechanism (QT lengthened by the ST segment)', (c) => {
        const on = (['V3', 'V4'] as const).map((l) => tOnsetAfterJ(c, l));
        return [on.every((x) => x !== null && x >= 140) && (['V3', 'V4'] as const).every((l) => Math.abs(f(c, l).st60) <= 0.05), `T onset after J V3 ${fmt(on[0], 0)} V4 ${fmt(on[1], 0)} ms; ST60 V3 ${fmt(f(c, 'V3').st60)} V4 ${fmt(f(c, 'V4').st60)}`];
      }),
      crit('the T itself keeps a normal width (onset → end < 200 ms in V4)', 'Calcium disorders — QT mechanism ("the T wave keeps a normal width")', (c) => {
        const d = tDurationMs(c, 'V4');
        return [d !== null && d < 200, `T V4 ${fmt(d, 0)} ms`];
      }),
    ],
    optOut: { 't-asymmetry': 'late T after a long ST' },
  },
  'digoxin-effect': {
    hallmarks: [
      crit('sagging ST depression (J+60 ≤ −0.04 mV) in ≥ 2 leads with a tall R (≥ 0.8 mV)', 'digitalis-effect (scooped "reverse tick" ST)', (c) => {
        const tall = ALL.filter((l) => rOf(c, l) >= 0.8);
        return [count(tall, (l) => f(c, l).st60 <= -0.04) >= 2, tall.map((l) => `${l} ST60 ${fmt(f(c, l).st60)}`).join(' ')];
      }),
      crit('visible sag: ST↓ (J+60) ≥ 0.06 mV in V5 and V6 and ≥ 0.02 mV in II', 'digitalis-effect (scooped ST, lateral and inferior)', (c) => [f(c, 'V5').st60 <= -0.06 && f(c, 'V6').st60 <= -0.06 && f(c, 'II').st60 <= -0.02, (['II', 'V5', 'V6'] as const).map((l) => `${l} ST60 ${fmt(f(c, l).st60)}`).join(' ')]),
      crit('the ST curves down before the T (J+60 below the J level) in V5 or V6', 'digitalis-effect (scooped ST)', (c) => [(['V5', 'V6'] as const).some((l) => f(c, l).st60 < stJ(c, l) - 0.005), (['V5', 'V6'] as const).map((l) => `${l} J ${fmt(stJ(c, l))} ST60 ${fmt(f(c, l).st60)}`).join(' ')]),
      crit('low T in V5–V6 and I (< 0.25 mV)', 'digitalis-effect (low, flat or inverted T)', (c) => [(['I', 'V5', 'V6'] as const).every((l) => f(c, l).t < 0.25), tList(c, ['I', 'V5', 'V6'])]),
      crit('shortened QT: QTcF < 390 ms', 'digitalis-effect (shortened QT); qt-causes (short QT: digitalis)', (c) => {
        const q = qtcF(c);
        return [q !== null && q < 390, qtcMsg(c)];
      }),
    ],
    optOut: { 'st-segment': 'scooped ST is the finding', 't-asymmetry': 'low T after a sagging ST' },
  },
  'long-qt': {
    hallmarks: [
      crit('QTcF ≥ 480 ms (LQTS diagnostic threshold) and above the sex-specific limit', 'Congenital long QT syndrome (QTc ≥ 480 ms); QT interval — thresholds', (c) => {
        const q = qtcF(c);
        return [q !== null && q >= 480 && q >= qtcLimit(c), qtcMsg(c)];
      }),
      // the genotype patterns (each variant pins its own): LQT1 broad-based T, LQT2 bifid T, LQT3 long ST + late T
      crit('a genotype T pattern: broad-based T (onset → end ≥ 200 ms in V4), bifid T in ≥ 2 leads, or a long ST (T onset ≥ 150 ms after J)', 'Congenital long QT syndrome (typical T patterns by genotype)', (c) => {
        const d = tDurationMs(c, 'V4');
        const bifid = count(ALL, (l) => tHumps(c, l) >= 2);
        const on = tOnsetAfterJ(c, 'V4');
        return [(d !== null && d >= 200) || bifid >= 2 || (on !== null && on >= 150), `T V4 ${fmt(d, 0)} ms; bifid leads ${bifid}; T onset V4 ${fmt(on, 0)} ms`];
      }),
    ],
    optOut: { 't-asymmetry': 'genotype-specific T morphology', 'st-segment': 'long ST (LQT3 pattern)', 'qt-dispersion': 'bifid LQT2 T: the tangent end jumps between the humps from lead to lead' },
  },
  'short-qt': {
    hallmarks: [
      crit('QTcF ≤ 340 ms', 'Short QT syndrome (consider at QTc ≤ 320–360 ms)', (c) => {
        const q = qtcF(c);
        return [q !== null && q <= 340, qtcMsg(c)];
      }),
      crit('tall, peaked T ≥ 0.6 mV in V3 or V4, nearly symmetric (rise/fall < 1.25)', 'Short QT syndrome (tall, peaked, symmetric T)', (c) => [(['V3', 'V4'] as const).some((l) => f(c, l).t >= 0.6 && f(c, l).tAsym < 1.25), (['V3', 'V4'] as const).map((l) => `${l} T ${fmt(f(c, l).t)} asym ${fmt(f(c, l).tAsym)}`).join(' ')]),
      crit('little or no ST segment (T onset ≤ 45 ms after J in V3–V4)', 'Short QT syndrome', (c) => {
        const on = (['V3', 'V4'] as const).map((l) => tOnsetAfterJ(c, l));
        return [on.every((x) => x !== null && x <= 45), `T onset after J V3 ${fmt(on[0], 0)} V4 ${fmt(on[1], 0)} ms`];
      }),
    ],
    optOut: { 'st-segment': 'no ST segment', 't-asymmetry': 'symmetric peaked T', 't-over-r-v5v6': 'tall T' },
  },
  'na-channel-blockade': {
    hallmarks: [
      crit('sinus tachycardia (> 100/min)', 'Sodium-channel blocker toxicity (sinus tachycardia)', (c) => [c.m.hrBpm > 100, `HR ${fmt(c.m.hrBpm, 0)}`]),
      crit('QRS ≥ 100 ms', 'Sodium-channel blocker toxicity (QRS ≥ 100 ms)', (c) => [c.m.qrsMs >= 100, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('terminal R in aVR ≥ 0.3 mV with R/S ≥ 0.7', 'Sodium-channel blocker toxicity (terminal R in aVR ≥ 3 mm or R/S ≥ 0.7)', (c) => {
        const r = rOf(c, 'aVR');
        const s = -Math.min(f(c, 'aVR').q, f(c, 'aVR').s);
        return [r >= 0.3 && r / Math.max(1e-6, s) >= 0.7, `aVR R ${fmt(r)} Q/S ${fmt(s)} R/S ${fmt(r / Math.max(1e-6, s))}`];
      }),
      crit('rightward terminal 40-ms QRS axis (|axis| > 120°): S in I', 'Sodium-channel blocker toxicity (rightward terminal 40-ms axis)', (c) => {
        const a = terminalAxis(c);
        return [Math.abs(a) > 120 && f(c, 'I').s <= -0.1, `terminal axis ${fmt(a, 0)}°, S in I ${fmt(f(c, 'I').s)}`];
      }),
    ],
  },
  hypothermia: {
    hallmarks: [
      crit('Osborn (J) wave: a terminal positive hump ≥ 0.1 mV after the main R in ≥ 2 of II, III, aVF, V3–V6', 'Hypothermia — ECG findings (Osborn waves); early-repolarization (J-wave definition)', (c) => {
        const ls = ['II', 'III', 'aVF', 'V3', 'V4', 'V5', 'V6'] as const;
        return [count(ls, (l) => f(c, l).r2 >= 0.1) >= 2, ls.map((l) => `${l} ${fmt(f(c, l).r2)}`).join(' ')];
      }),
      crit('sinus bradycardia (< 60/min)', 'Hypothermia — ECG findings', (c) => [c.m.hrBpm < 60, `HR ${fmt(c.m.hrBpm, 0)}`]),
      crit('long QT (QTcF ≥ the sex-specific limit)', 'Hypothermia — ECG findings (prolonged QT)', (c) => {
        const q = qtcF(c);
        return [q !== null && q >= qtcLimit(c), qtcMsg(c)];
      }),
    ],
    optOut: { 'no-spikes': 'the Osborn hump notches the terminal QRS' },
  },
  'cerebral-t': {
    hallmarks: [
      crit('giant inverted T ≥ 0.5 mV in ≥ 4 precordial leads', 'qt-causes (intracranial events); DECISION §9.9 (cerebral T)', (c) => [count(PRECORDIAL, (l) => f(c, l).tMin <= -0.5 && f(c, l).t < 0) >= 4, tList(c, PRECORDIAL)]),
      crit('marked QT prolongation: QTcF ≥ 500 ms', 'qt-causes; QT interval — thresholds (> 500 ms)', (c) => {
        const q = qtcF(c);
        return [q !== null && q >= 500, qtcMsg(c)];
      }),
      crit('broad T (FWHM ≥ 100 ms in V3–V4)', 'DECISION §9.9 (cerebral T: wide, deep)', (c) => [(['V3', 'V4'] as const).every((l) => f(c, l).tFwhm >= 100), (['V3', 'V4'] as const).map((l) => `${l} FWHM ${fmt(f(c, l).tFwhm, 0)}`).join(' ')]),
    ],
    optOut: { 't-asymmetry': 'giant inverted T', 'qt-dispersion': 'regional repolarisation delay (apex > base)' },
  },
  'cardiac-memory': {
    hallmarks: [
      crit('normal sinus QRS (< 110 ms, axis −30…+90°)', 'DECISION §9.9 (memory T with a normal QRS)', (c) => [c.m.qrsMs < 110 && c.m.axisDeg >= -30 && c.m.axisDeg <= 90, `QRS ${fmt(c.m.qrsMs, 0)} axis ${fmt(c.m.axisDeg, 0)}`]),
      crit('T↓ ≥ 0.1 mV in III and aVF and in ≥ 2 of V1–V4 (where the paced QRS was negative)', 'DECISION §9.9 (cardiac memory; Rosenbaum 1982)', (c) => [f(c, 'III').tMin <= -0.1 && f(c, 'aVF').tMin <= -0.1 && count(['V1', 'V2', 'V3', 'V4'], (l) => f(c, l).tMin <= -0.1) >= 2, tList(c, ['III', 'aVF', 'V1', 'V2', 'V3', 'V4'])]),
      crit('upright T in I and aVL (the memory signature that argues against anterior ischaemia)', 'DECISION §9.9 (cardiac memory vs ischaemia)', (c) => [f(c, 'I').t >= 0.1 && f(c, 'aVL').t >= 0.1, tList(c, ['I', 'aVL'])]),
    ],
    optOut: { 't-asymmetry': 'inverted T', 'qt-dispersion': 'T vector of the remembered paced QRS' },
  },
  'nonspecific-st-t': {
    hallmarks: [
      crit('low, flat or minimally inverted T (−0.15 … +0.1 mV) in I, aVL, V5, V6', 'DECISION §9.9 (nonspecific ST-T)', (c) => [(['I', 'aVL', 'V5', 'V6'] as const).every((l) => f(c, l).t < 0.1 && f(c, l).t > -0.15), tList(c, ['I', 'aVL', 'V5', 'V6'])]),
      crit('no ST depression ≥ 0.05 mV', 'DECISION §9.9 (nonspecific: no ischaemic ST depression)', (c) => [ALL.every((l) => stJ(c, l) > -0.05 && f(c, l).st60 > -0.05), ALL.map((l) => `${l} ${fmt(f(c, l).st60)}`).join(' ')]),
    ],
    optOut: { 't-asymmetry': 'flat lateral T', 'qt-dispersion': 'lateral repolarisation change' },
  },
};

/** Variant additions of the repolarization group. */
export const REPOLARIZATION_VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  'na-channel-blockade': {
    brugada: [crit('drug-induced Brugada-type ST: J ≥ 0.2 mV in V1 or V2 followed by a negative T (≤ −0.1 mV)', 'Brugada pattern — Type 1 (phenocopies: Na-channel blockers)', (c) => [(['V1', 'V2'] as const).some((l) => stJ(c, l) >= 0.2 && f(c, l).tMin <= -0.1), (['V1', 'V2'] as const).map((l) => `${l} J ${fmt(stJ(c, l))} Tmin ${fmt(f(c, l).tMin)}`).join(' ')])],
  },
  'long-qt': {
    lqt2: [crit('LQT2 pattern: low, notched / bifid T (two humps) in ≥ 2 leads', 'Congenital long QT syndrome (LQT2: low-amplitude, notched or bifid T)', (c) => [count(ALL, (l) => tHumps(c, l) >= 2) >= 2, ALL.map((l) => `${l} ${tHumps(c, l)}`).join(' ')]),
      crit('the bifid T ends at the QTc of the source: QTcF ≥ 490 ms', 'Congenital long QT syndrome (QTc ≥ 480 ms)', (c) => [(qtcF(c) ?? 0) >= 490, qtcMsg(c)])],
    lqt3: [crit('LQT3 pattern: long isoelectric ST (T onset ≥ 150 ms after J in V3–V4) with a late, narrow T', 'Congenital long QT syndrome (LQT3: long isoelectric ST, late peaked T)', (c) => {
      const on = (['V3', 'V4'] as const).map((l) => tOnsetAfterJ(c, l));
      return [on.every((x) => x !== null && x >= 150) && f(c, 'V4').tFwhm < 140, `T onset after J V3 ${fmt(on[0], 0)} V4 ${fmt(on[1], 0)} ms; FWHM V4 ${fmt(f(c, 'V4').tFwhm, 0)}`];
    })],
    drug: [crit('drug-induced: QTcF > 500 ms (high torsade risk) with a notched / bifid T in ≥ 2 leads', 'qt-causes; torsades-causes (QTc > 500 ms)', (c) => {
      const q = qtcF(c);
      return [q !== null && q > 500 && count(ALL, (l) => tHumps(c, l) >= 2) >= 2, `${qtcMsg(c)}; humps ${ALL.map((l) => `${l} ${tHumps(c, l)}`).join(' ')}`];
    })],
  },
};

/**
 * Textbook criteria per benchmark condition, evaluated on the measured median beat (amplitudes in mV; printed in mm at
 * 10 mm/mV). Thresholds follow the benchmark brief; they are deliberately lenient where the brief says "acceptable".
 */
import { LEADS, type LeadName } from './leads.ts';
import { atrialActivity, type LeadFeat, type Measurement } from './measure.ts';
import type { Truth } from './synth.ts';

export type Crit = { name: string; ok: boolean; val: string };
type Leads = Record<LeadName, Float32Array>;

export const mm = (v: number): number => Math.round(v * 100) / 10;
const F = (m: Measurement, l: LeadName): LeadFeat => m.feats[l];
const c = (name: string, ok: boolean, val: string | number): Crit => ({ name, ok, val: String(val) });
const LAT: LeadName[] = ['I', 'aVL', 'V5', 'V6'];
const all = (m: Measurement, ls: readonly LeadName[], f: (x: LeadFeat) => boolean): boolean => ls.every((l) => f(F(m, l)));
const list = (m: Measurement, ls: readonly LeadName[], f: (x: LeadFeat) => number): string => ls.map((l) => `${l} ${mm(f(F(m, l)))}`).join(', ');
const morphs = (m: Measurement, ls: readonly LeadName[]): string => ls.map((l) => `${l} ${F(m, l).morph}`).join(', ');
const sinus = (m: Measurement, t: Truth): Crit => c('sinus: P before each QRS, constant PR', m.prMs !== null && t.prMs !== null, `PR ${m.prMs?.toFixed(0) ?? '-'}`);
const rs = (m: Measurement, l: LeadName): string => `${mm(F(m, l).r)}/${mm(F(m, l).s)}`;
/** mean of a lead over one atrial cycle starting 40 ms after each measured T end (TQ segments), averaged over beats */
const cycleMean = (L: Leads, fs: number, m: Measurement, l: LeadName, cycMs: number): number => {
  const xs: number[] = [];
  const n = Math.round((cycMs * fs) / 1000);
  for (let b = 0; b + 1 < m.beats.length; b++) {
    const t = m.beats[b]!.tOff;
    if (t === null) continue;
    const a = Math.round(t + 0.04 * fs);
    if (a + n >= m.beats[b + 1]!.qrsOn) continue;
    let s = 0;
    for (let i = a; i < a + n; i++) s += L[l][i]!;
    xs.push(s / n);
  }
  return xs.length ? xs.reduce((p, q) => p + q, 0) / xs.length : NaN;
};

export const CRITERIA: Record<string, (m: Measurement, t: Truth, L: Leads, fs: number) => Crit[]> = {
  normal: (m) => [
    c('HR 60-100', m.hrBpm > 60 && m.hrBpm < 100, m.hrBpm.toFixed(0)),
    c('PR 120-200', m.prMs !== null && m.prMs >= 120 && m.prMs <= 200, m.prMs ?? '-'),
    c('QRS < 110', m.qrsMs < 110, m.qrsMs),
    c('QRS axis +30..+80', m.axisDeg > 30 && m.axisDeg < 80, m.axisDeg.toFixed(0)),
    c('P axis +30..+70', m.pAxisDeg !== null && m.pAxisDeg > 30 && m.pAxisDeg < 70, m.pAxisDeg?.toFixed(0) ?? '-'),
    c('T axis +20..+60', m.tAxisDeg !== null && m.tAxisDeg > 20 && m.tAxisDeg < 60, m.tAxisDeg?.toFixed(0) ?? '-'),
    c('small septal q in I, aVL, V5, V6 (present, < 2 mm)', all(m, LAT, (f) => f.q < -0.02 && f.q > -0.2), list(m, LAT, (f) => f.q)),
    c('rS in V1', F(m, 'V1').r > 0.03 && F(m, 'V1').r < -F(m, 'V1').s, F(m, 'V1').morph),
    c('R grows V1→V5', (['V2', 'V3', 'V4', 'V5'] as const).every((l, i) => F(m, l).r > F(m, (['V1', 'V2', 'V3', 'V4'] as const)[i]!).r), list(m, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'], (f) => f.r)),
    c('R/S transition V3-V4 (R<S in V2, R>S in V4)', F(m, 'V2').r < -F(m, 'V2').s && F(m, 'V4').r > -F(m, 'V4').s, `V2 ${rs(m, 'V2')} V3 ${rs(m, 'V3')} V4 ${rs(m, 'V4')}`),
    c('T upright I, II, aVF, V2-V6', all(m, ['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'], (f) => f.t > 0.05), ''),
    c('T inverted aVR', F(m, 'aVR').t < -0.03, mm(F(m, 'aVR').t)),
    c('P upright I, II, aVF; inverted aVR', F(m, 'I').p > 0.02 && F(m, 'II').p > 0.05 && F(m, 'aVF').p > 0.03 && F(m, 'aVR').pNeg < -0.03, `II ${mm(F(m, 'II').p)}`),
    c('P in V1 small/biphasic', F(m, 'V1').p < 0.15 && F(m, 'V1').pNeg < -0.01, `${mm(F(m, 'V1').p)}/${mm(F(m, 'V1').pNeg)}`),
    c('ST isoelectric (|J| < 1 mm; |ST60| < 1 mm chest, 0.5 mm limb)', LEADS.every((l) => Math.abs(F(m, l).st60) < (l.startsWith('V') ? 0.1 : 0.05) && Math.abs(F(m, l).j) < 0.1), ''),
    c('SV1 + RV5 < 35 mm', -F(m, 'V1').s + F(m, 'V5').r < 3.5, mm(-F(m, 'V1').s + F(m, 'V5').r)),
  ],
  rbbb: (m, t) => [
    sinus(m, t),
    c('QRS >= 120', m.qrsMs >= 120, m.qrsMs),
    c("rsR' in V1 with R' > r", F(m, 'V1').r2 > F(m, 'V1').r && F(m, 'V1').s < -0.03, `${F(m, 'V1').morph} r ${mm(F(m, 'V1').r)} R' ${mm(F(m, 'V1').r2)}`),
    c("rsR' in V2", F(m, 'V2').r2 > 0.1, F(m, 'V2').morph),
    c('wide slurred S in I, V5, V6 (>= 40 ms)', all(m, ['I', 'V5', 'V6'], (f) => f.sDur >= 40), (['I', 'aVL', 'V5', 'V6'] as const).map((l) => `${l} ${F(m, l).sDur.toFixed(0)}`).join(', ')),
    c('R peak time V1 > 50 ms', F(m, 'V1').rPeakMs > 50, F(m, 'V1').rPeakMs.toFixed(0)),
    c("M-shaped V1: the s is shallower than R' (rsR', not rS + R')", -F(m, 'V1').s < F(m, 'V1').r2, `s ${mm(F(m, 'V1').s)}, R' ${mm(F(m, 'V1').r2)}`),
    c('secondary T inversion V1-V2 (>= 1 mm each)', F(m, 'V1').t <= -0.1 && F(m, 'V2').t <= -0.1, list(m, ['V1', 'V2', 'V3'], (f) => f.t)),
    c('axis normal (-30..+90)', m.axisDeg > -30 && m.axisDeg < 90, m.axisDeg.toFixed(0)),
  ],
  lbbb: (m, t) => [
    sinus(m, t),
    c('QRS >= 140', m.qrsMs >= 140, m.qrsMs),
    c('no septal q in I, V5, V6', all(m, ['I', 'V5', 'V6'], (f) => f.q > -0.03), list(m, ['I', 'V5', 'V6'], (f) => f.q)),
    c('broad notched R I, aVL, V5, V6; R peak time V5-V6 > 60 ms', F(m, 'V5').rPeakMs > 60 && F(m, 'V6').rPeakMs > 60, `RPT ${F(m, 'V5').rPeakMs.toFixed(0)}/${F(m, 'V6').rPeakMs.toFixed(0)}; ${morphs(m, LAT)}`),
    c('QS or rS (tiny r) in V1-V3', all(m, ['V1', 'V2', 'V3'], (f) => f.r < 0.3 && f.s < -0.5), morphs(m, ['V1', 'V2', 'V3'])),
    c('discordant ST elevation + upright T V1-V3', all(m, ['V1', 'V2', 'V3'], (f) => f.st60 > 0.1 && f.t > 0.1), list(m, ['V1', 'V2', 'V3'], (f) => f.st60)),
    c('discordant ST depression + T inversion I, aVL, V5, V6', all(m, LAT, (f) => f.st60 < -0.03 && f.t < -0.08), list(m, LAT, (f) => f.t)),
    c('axis normal or left (-45..+60)', m.axisDeg > -45 && m.axisDeg < 60, m.axisDeg.toFixed(0)),
  ],
  'anterior-stemi': (m, t) => [
    sinus(m, t),
    c('QRS narrow (< 110)', m.qrsMs < 110, m.qrsMs),
    c('J-point ST elevation >= 2 mm V2-V3', all(m, ['V2', 'V3'], (f) => f.j >= 0.2), list(m, ['V1', 'V2', 'V3', 'V4'], (f) => f.j)),
    c('ST elevation >= 1 mm V1-V4', all(m, ['V1', 'V2', 'V3', 'V4'], (f) => f.j >= 0.1), ''),
    c('reciprocal ST depression III, aVF', F(m, 'III').st60 < -0.03 && F(m, 'aVF').st60 < 0, list(m, ['III', 'aVF', 'I', 'aVL'], (f) => f.st60)),
    c('hyperacute T V2-V4 (> 8 mm)', all(m, ['V2', 'V3', 'V4'], (f) => f.t > 0.8), list(m, ['V2', 'V3', 'V4'], (f) => f.t)),
  ],
  'inferior-stemi': (m, t) => [
    sinus(m, t),
    c('QRS narrow (< 110)', m.qrsMs < 110, m.qrsMs),
    c('ST elevation II, III, aVF (J >= 1 mm)', all(m, ['II', 'III', 'aVF'], (f) => f.j >= 0.1), list(m, ['II', 'III', 'aVF'], (f) => f.j)),
    c('ST elevation III > II', F(m, 'III').j > F(m, 'II').j, ''),
    c('reciprocal ST depression I and aVL, aVL deepest of the limb leads', F(m, 'I').j < -0.02 && (['I', 'II', 'III', 'aVR', 'aVF'] as const).every((l) => F(m, 'aVL').j <= F(m, l).j), list(m, ['I', 'aVL'], (f) => f.j)),
    c('ST depression V1-V3 (posterior extension, optional)', F(m, 'V2').st60 < 0 || F(m, 'V3').st60 < 0, list(m, ['V1', 'V2', 'V3'], (f) => f.st60)),
  ],
  'lvh-strain': (m, t) => [
    sinus(m, t),
    c('SV1 + max(RV5,RV6) >= 35 mm (aim 40-45)', -F(m, 'V1').s + Math.max(F(m, 'V5').r, F(m, 'V6').r) >= 3.5, mm(-F(m, 'V1').s + Math.max(F(m, 'V5').r, F(m, 'V6').r))),
    c('R aVL tall (>= 11 mm, optional)', F(m, 'aVL').r >= 1.1, mm(F(m, 'aVL').r)),
    c('QRS 95-115', m.qrsMs >= 95 && m.qrsMs <= 115, m.qrsMs),
    c('R peak time V5-V6 > 50 ms', F(m, 'V5').rPeakMs > 50 || F(m, 'V6').rPeakMs > 50, `${F(m, 'V5').rPeakMs.toFixed(0)}/${F(m, 'V6').rPeakMs.toFixed(0)}`),
    c('downsloping ST depression + asymmetric T inversion I, aVL, V5, V6', all(m, LAT, (f) => f.st60 < -0.03 && f.t < -0.1 && f.tAsym > 1.3), list(m, LAT, (f) => f.t)),
    c('mild left axis tendency (-30..+30)', m.axisDeg > -30 && m.axisDeg < 30, m.axisDeg.toFixed(0)),
  ],
  wpw: (m) => [
    c('PR < 120', m.prMs !== null && m.prMs < 120, m.prMs ?? '-'),
    c('QRS >= 110', m.qrsMs >= 110, m.qrsMs),
    c('delta wave: slow initial 30 ms in II, V1-V3 (index < 0.32)', all(m, ['II', 'V1', 'V2', 'V3'], (f) => f.init30 < 0.32), (['II', 'V1', 'V2', 'V3', 'V4', 'I'] as const).map((l) => `${l} ${F(m, l).init30.toFixed(2)}`).join(', ')),
    c('positive delta and dominant R in V1 (type A)', F(m, 'V1').r > -F(m, 'V1').s, rs(m, 'V1')),
    c('secondary ST-T opposite to QRS (V1, III)', F(m, 'V1').t < 0 && F(m, 'III').t < 0, list(m, ['V1', 'V2', 'III'], (f) => f.t)),
  ],
  'brugada-type1': (m, t) => [
    sinus(m, t),
    c('coved J/ST elevation >= 2 mm V1 and V2', all(m, ['V1', 'V2'], (f) => f.j >= 0.2), list(m, ['V1', 'V2', 'V3'], (f) => f.j)),
    c('coved: ST descends from the J point (J >= ST60 >= 1 mm) into a negative T V1-V2', all(m, ['V1', 'V2'], (f) => f.j >= f.st60 && f.st60 >= 0.1 && f.tMin < -0.05), list(m, ['V1', 'V2', 'V3'], (f) => f.tMin)),
    c('V3 at most mildly involved (J < 1.5 mm)', F(m, 'V3').j < 0.15, mm(F(m, 'V3').j)),
    c('no reciprocal ST depression (all J, ST60 > -0.5 mm)', LEADS.every((l) => F(m, l).st60 > -0.05 && F(m, l).j > -0.05), ''),
    c('other leads essentially normal (T upright I, II, V4-V6)', all(m, ['I', 'II', 'V4', 'V5', 'V6'], (f) => f.t > 0.05), list(m, ['I', 'II', 'V4', 'V5', 'V6'], (f) => f.t)),
  ],
  aflutter: (m, _t, L, fs) => {
    const a = atrialActivity(L, fs, m, 'II', 1);
    const v1 = atrialActivity(L, fs, m, 'V1', -1);
    return [
      c('atrial cycle ~200 ms (troughs in II)', a.cycleMs !== null && a.cycleMs > 180 && a.cycleMs < 220, a.cycleMs?.toFixed(0) ?? '-'),
      c('ventricular rate ~75, regular', Math.abs(m.hrBpm - 75) < 4 && m.rrCv < 0.03, `${m.hrBpm.toFixed(0)}, CV ${(m.rrCv * 100).toFixed(1)} %`),
      c('narrow QRS', m.qrsMs < 110, m.qrsMs),
      c('flutter waves in II >= 1.5 mm peak-to-peak', a.p2p >= 0.15, mm(a.p2p)),
      c('F waves predominantly negative in II, III, aVF (downward excursion > 1.3 x upward)', (['II', 'III', 'aVF'] as const).every((l) => atrialActivity(L, fs, m, l, 1).negRatio > 1.3), (['II', 'III', 'aVF', 'V1'] as const).map((l) => `${l} ${atrialActivity(L, fs, m, l, 1).negRatio.toFixed(2)}`).join(', ')),
      c('F waves positive in V1 (upward excursion > downward)', v1.negRatio < 1, v1.negRatio.toFixed(2)),
      c('discrete positive waves in V1', v1.count > 0, `${v1.count} peaks, cycle ${v1.cycleMs?.toFixed(0) ?? '-'}`),
      c('F-wave baseline has no DC offset (mean over one 200 ms cycle in each TQ, |mean| < 0.1 mm in II, III, aVF, V1)', (['II', 'III', 'aVF', 'V1'] as const).every((l) => Math.abs(cycleMean(L, fs, m, l, 200)) < 0.01), (['II', 'III', 'aVF', 'V1'] as const).map((l) => `${l} ${mm(cycleMean(L, fs, m, l, 200))}`).join(', ')),
    ];
  },
  hyperk: (m, t) => [
    sinus(m, t),
    c('tall peaked T >= 10 mm in V2-V4', all(m, ['V2', 'V3', 'V4'], (f) => f.t >= 1.0), list(m, ['V2', 'V3', 'V4'], (f) => f.t)),
    c('narrow-based symmetric T (asym 0.8-1.25, FWHM < 110 ms)', all(m, ['V2', 'V3', 'V4'], (f) => f.tAsym > 0.8 && f.tAsym < 1.25 && f.tFwhm < 110), (['V2', 'V3', 'V4'] as const).map((l) => `${F(m, l).tAsym.toFixed(2)}/${F(m, l).tFwhm.toFixed(0)}`).join(' ')),
    c('flattened P (II < 1 mm)', F(m, 'II').p < 0.1, mm(F(m, 'II').p)),
    c('PR slightly prolonged (185-240)', m.prMs !== null && m.prMs >= 185 && m.prMs <= 240, m.prMs ?? '-'),
    c('QRS mildly widened (100-120)', m.qrsMs >= 100 && m.qrsMs <= 120, m.qrsMs),
    c('QT normal/short (QTc Bazett < 440)', m.qtMs !== null && m.qtMs / Math.sqrt(60 / m.hrBpm) < 440, m.qtMs !== null ? (m.qtMs / Math.sqrt(60 / m.hrBpm)).toFixed(0) : '-'),
  ],
  afib: (m, _t, L, fs) => {
    const f = atrialActivity(L, fs, m, 'V1', 1);
    return [
      c('irregularly irregular RR (CV > 10 %)', m.rrCv > 0.1, `${(m.rrCv * 100).toFixed(1)} %`),
      c('mean ventricular rate 85-115', m.hrBpm > 85 && m.hrBpm < 115, m.hrBpm.toFixed(0)),
      c('no P waves (no consistent PR: none found or SD > 20 ms)', m.prMs === null || (m.prSdMs ?? 0) > 20, m.prMs === null ? 'none' : `SD ${m.prSdMs?.toFixed(0)} ms`),
      c('fibrillatory baseline V1 (0.3-2 mm p2p, cycle 100-170 ms by zero crossings)', f.p2p > 0.03 && f.p2p < 0.2 && f.zcCycleMs !== null && f.zcCycleMs > 100 && f.zcCycleMs < 170, `${mm(f.p2p)} mm, ${f.zcCycleMs?.toFixed(0) ?? '-'} ms`),
      c('narrow QRS', m.qrsMs < 110, m.qrsMs),
    ];
  },
  vt: (m, t) => [
    c('rate 150-190, regular', m.hrBpm > 150 && m.hrBpm < 190 && m.rrCv < 0.03, m.hrBpm.toFixed(0)),
    c('QRS >= 140', m.qrsMs >= 140, m.qrsMs),
    c('RBBB-like: dominant R in V1', F(m, 'V1').r > -F(m, 'V1').s, `${F(m, 'V1').morph} ${rs(m, 'V1')}`),
    c('superior axis (-30..-180)', m.axisDeg < -30 && m.axisDeg > -180, m.axisDeg.toFixed(0)),
    c('R/S < 1 in V6 (QS counts)', F(m, 'V6').morph === 'QS' || F(m, 'V6').r < -F(m, 'V6').s, `${F(m, 'V6').morph} ${rs(m, 'V6')}`),
    c('QRS dominates T: |QRS| peak-to-peak > |T| in II, V1, V6', all(m, ['II', 'V1', 'V6'], (f) => Math.max(f.r, f.r2) - Math.min(f.q, f.s) > Math.max(f.tMax, -f.tMin)), list(m, ['II', 'V1', 'V6'], (f) => Math.max(f.r, f.r2) - Math.min(f.q, f.s))),
    c('AV dissociation (independent sinus clock in the model)', t.rhythm.includes('ventricular') && t.prMs === null, ''),
  ],
};

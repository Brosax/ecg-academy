/**
 * Hallmark criteria, group 'conduction' (DECISION §9.6). Thresholds: criteria.md rows named in each `source`.
 */
import type { StdLead } from '../../../../src/core/leads';
import { sgarbossaParts } from './ischemia';
import { crit, f, fmt, positivePeaks, rOf, type Criterion, type CriterionCtx, type ScenarioCriteria } from './types';

const SECONDARY = { 't-asymmetry': 'secondary T', 'st-segment': 'secondary ST-T' } as const;
const list = (c: CriterionCtx, ls: readonly StdLead[], k: 'q' | 'r' | 's' | 'rPeakMs' | 't'): string =>
  ls.map((l) => `${l} ${fmt(f(c, l)[k], k === 'rPeakMs' ? 0 : 2)}`).join(' ');

/** RBBB morphology (criteria.md rbbb-complete), shared by the bifascicular scenarios. */
/** lowest value of a lead between its first and its last positive QRS peak (the s of an rsR′; +∞ with one peak) */
function interPeakMin(c: CriterionCtx, l: StdLead): number {
  const x = c.m.median[l];
  const idx: number[] = [];
  for (let i = c.m.medianOn + 1; i < c.m.medianOff; i++) if (x[i] > x[i - 1] && x[i] >= x[i + 1] && x[i] >= 0.05) idx.push(i);
  if (idx.length < 2) return Infinity;
  let m = Infinity;
  for (let i = idx[0]; i <= idx[idx.length - 1]; i++) m = Math.min(m, x[i]);
  return m;
}

const RBBB_CORE: readonly Criterion[] = [
  crit('QRS ≥ 120 ms', 'rbbb-complete; bbb-qrs-cutoff', (c) => [c.m.qrsMs >= 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
  crit('rsR′ (or notched rR′) in V1 or V2 with R′ > r', 'rbbb-complete', (c) => {
    const pk = (l: 'V1' | 'V2'): number[] => positivePeaks(c, l);
    const ok = (['V1', 'V2'] as const).some((l) => pk(l).length >= 2 && pk(l)[pk(l).length - 1] > pk(l)[0]);
    return [ok, `positive peaks V1 ${pk('V1').map((x) => fmt(x)).join('/')} V2 ${pk('V2').map((x) => fmt(x)).join('/')}`];
  }),
  crit('R-peak time in V1 > 50 ms', 'rbbb-complete; intrinsicoid-deflection', (c) => [f(c, 'V1').rPeakMs > 50, `V1 R-peak time ${fmt(f(c, 'V1').rPeakMs, 0)} ms`]),
  crit('rsR′: the s between r and R′ dips below the baseline (≤ −0.05 mV) in V1 or V2', 'rbbb-complete (rsR′, not an M with the notch above baseline)', (c) => [(['V1', 'V2'] as const).some((l) => interPeakMin(c, l) <= -0.05), `s between r and R′ V1 ${fmt(interPeakMin(c, 'V1'))} V2 ${fmt(interPeakMin(c, 'V2'))}`]),
  crit('wide terminal S (≥ 40 ms) in V6', 'rbbb-complete', (c) => [f(c, 'V6').sDur >= 40, `S duration V6 ${fmt(f(c, 'V6').sDur, 0)} ms`]),
  crit('secondary T inverted in V1 (≤ −0.1 mV)', 'rbbb-complete', (c) => [f(c, 'V1').t <= -0.1, `T V1 ${fmt(f(c, 'V1').t)}`]),
];
const LAFB_AXIS = crit('axis −45…−90°', 'lafb; qrs-axis-adult', (c) => [c.m.axisDeg <= -45 && c.m.axisDeg >= -90, `axis ${fmt(c.m.axisDeg, 0)}`]);
const LPFB_AXIS = crit('axis +90…+180°', 'lpfb; qrs-axis-adult', (c) => [c.m.axisDeg >= 90 && c.m.axisDeg <= 180, `axis ${fmt(c.m.axisDeg, 0)}`]);
const LAFB_CORE: readonly Criterion[] = [
  LAFB_AXIS,
  crit('qR in aVL with R-peak time ≥ 45 ms', 'lafb', (c) => {
    const a = f(c, 'aVL');
    return [a.q < 0 && a.r > -2 * a.q && a.rPeakMs >= 45, `aVL q ${fmt(a.q)} R ${fmt(a.r)} R-peak time ${fmt(a.rPeakMs, 0)}`];
  }),
  crit('rS in II, III and aVF', 'lafb', (c) => {
    const bad = (['II', 'III', 'aVF'] as const).filter((l) => !(f(c, l).r > 0.02 && f(c, l).s < -2 * f(c, l).r));
    return [bad.length === 0, `${list(c, ['II', 'III', 'aVF'], 'r')} | ${list(c, ['II', 'III', 'aVF'], 's')}`];
  }),
];
const LPFB_CORE: readonly Criterion[] = [
  LPFB_AXIS,
  crit('rS in I and aVL', 'lpfb', (c) => {
    const bad = (['I', 'aVL'] as const).filter((l) => !(f(c, l).r > 0.02 && f(c, l).s < -f(c, l).r));
    return [bad.length === 0, `${list(c, ['I', 'aVL'], 'r')} | ${list(c, ['I', 'aVL'], 's')}`];
  }),
  crit('qR in III and aVF', 'lpfb', (c) => {
    const bad = (['III', 'aVF'] as const).filter((l) => !(f(c, l).q < -0.03 && f(c, l).r > -3 * f(c, l).q));
    return [bad.length === 0, `${list(c, ['III', 'aVF'], 'q')} | ${list(c, ['III', 'aVF'], 'r')}`];
  }),
];
const NARROW = crit('QRS < 120 ms', 'lafb; lpfb', (c) => [c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]);

/** Per-beat QRS duration (ms) and the cycle that preceded it, from the oracle's beats. */
function beatWidths(c: CriterionCtx): { qrs: number; rr: number }[] {
  const b = c.m.beats;
  const out: { qrs: number; rr: number }[] = [];
  for (let i = 1; i < b.length; i++) out.push({ qrs: ((b[i].qrsOff - b[i].qrsOn) * 1000) / c.fs, rr: ((b[i].qrsOn - b[i - 1].qrsOn) * 1000) / c.fs });
  return out;
}

const RATE_DEPENDENT_BBB: readonly Criterion[] = [
  crit('two QRS populations: wide beats (≥ 120 ms) and narrow beats (< 110 ms)', 'rate-dependent-bbb (intermittent BBB)', (c) => {
    const w = beatWidths(c);
    return [w.some((x) => x.qrs >= 120) && w.some((x) => x.qrs < 110), `QRS ${w.map((x) => fmt(x.qrs, 0)).join(' ')}`];
  }),
  crit('the block appears only after the shorter cycles: every wide beat follows a shorter RR than every narrow beat', 'rate-dependent-bbb (acceleration-dependent)', (c) => {
    const w = beatWidths(c);
    const wide = w.filter((x) => x.qrs >= 120).map((x) => x.rr), narrow = w.filter((x) => x.qrs < 110).map((x) => x.rr);
    return [wide.length > 0 && narrow.length > 0 && Math.max(...wide) < Math.min(...narrow) + 4, `RR before wide ${wide.map((x) => fmt(x, 0)).join(' ')} | narrow ${narrow.map((x) => fmt(x, 0)).join(' ')}`];
  }),
  crit('every QRS (wide or narrow) follows a sinus P with a normal PR (supraventricular, not ventricular ectopy)', 'rate-dependent-bbb; aberrant-conduction', (c) => {
    const withP = c.m.beats.filter((b) => b.pOn !== null).length;
    return [c.m.prMs !== null && c.m.prMs >= 120 && c.m.prMs <= 200 && withP >= c.m.beats.length - 1, `PR ${fmt(c.m.prMs, 0)}, P before ${withP}/${c.m.beats.length} beats`];
  }),
];

export const CONDUCTION_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  rbbb: {
    hallmarks: [
      crit('QRS ≥ 120 ms', 'rbbb-complete; bbb-qrs-cutoff', (c) => [c.m.qrsMs >= 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('rsR′ (or notched rR′) in V1 or V2 with R′ > r', 'rbbb-complete', (c) => {
        const pk = (l: 'V1' | 'V2'): number[] => positivePeaks(c, l);
        const ok = (['V1', 'V2'] as const).some((l) => pk(l).length >= 2 && pk(l)[pk(l).length - 1] > pk(l)[0]);
        return [ok, `positive peaks V1 ${pk('V1').map((x) => fmt(x)).join('/')} V2 ${pk('V2').map((x) => fmt(x)).join('/')}`];
      }),
      crit('R-peak time in V1 > 50 ms', 'rbbb-complete; intrinsicoid-deflection', (c) => [f(c, 'V1').rPeakMs > 50, `V1 R-peak time ${fmt(f(c, 'V1').rPeakMs, 0)} ms`]),
  crit('rsR′: the s between r and R′ dips below the baseline (≤ −0.05 mV) in V1 or V2', 'rbbb-complete (rsR′, not an M with the notch above baseline)', (c) => [(['V1', 'V2'] as const).some((l) => interPeakMin(c, l) <= -0.05), `s between r and R′ V1 ${fmt(interPeakMin(c, 'V1'))} V2 ${fmt(interPeakMin(c, 'V2'))}`]),
      crit('wide S (≥ 40 ms) in I and V6', 'rbbb-complete', (c) => [f(c, 'I').sDur >= 40 && f(c, 'V6').sDur >= 40, `S duration I ${fmt(f(c, 'I').sDur, 0)} V6 ${fmt(f(c, 'V6').sDur, 0)} ms`]),
      crit('secondary T inverted in V1 (≤ −0.1 mV)', 'rbbb-complete', (c) => [f(c, 'V1').t <= -0.1, `T V1 ${fmt(f(c, 'V1').t)}`]),
      crit('axis −30…+90', 'rbbb-complete; DECISION §9.6', (c) => [c.m.axisDeg >= -30 && c.m.axisDeg <= 90, `axis ${fmt(c.m.axisDeg, 0)}`]),
      crit('no terminal r′ in V4 and no notched R′ in V3 (judges)', 'DECISION §12.2 (rbbb)', (c) => [positivePeaks(c, 'V4').length <= 1 && positivePeaks(c, 'V3').length <= 1, `positive peaks V3 ${positivePeaks(c, 'V3').map((x) => fmt(x)).join('/')} V4 ${positivePeaks(c, 'V4').map((x) => fmt(x)).join('/')}`]),
    ],
    optOut: { 't-asymmetry': 'secondary T', 'st-segment': 'secondary ST-T' },
  },
  lbbb: {
    hallmarks: [
      crit('QRS ≥ 120 ms (default 140–160)', 'lbbb-complete; bbb-qrs-cutoff', (c) => [c.m.qrsMs >= 130, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('no q in I, V5, V6', 'lbbb-complete', (c) => {
        const bad = (['I', 'V5', 'V6'] as const).filter((l) => f(c, l).q < -0.03);
        return [bad.length === 0, bad.map((l) => `${l} q ${fmt(f(c, l).q)}`).join(' ')];
      }),
      crit('R-peak time in V5–V6 > 60 ms', 'lbbb-complete; intrinsicoid-deflection', (c) => [f(c, 'V5').rPeakMs > 60 && f(c, 'V6').rPeakMs > 60, `R-peak time V5 ${fmt(f(c, 'V5').rPeakMs, 0)} V6 ${fmt(f(c, 'V6').rPeakMs, 0)}`]),
      crit('QS or rS in V1–V3 with r < 0.3 mV', 'lbbb-complete', (c) => {
        const bad = (['V1', 'V2', 'V3'] as const).filter((l) => rOf(c, l) >= 0.3 || rOf(c, l) > -f(c, l).s);
        return [bad.length === 0, bad.map((l) => `${l} r ${fmt(rOf(c, l))} S ${fmt(f(c, l).s)}`).join(', ')];
      }),
      crit('discordant ST-T: ST↑ and T↑ in V1–V3; ST↓ and T↓ in I, aVL, V5, V6', 'lbbb-complete', (c) => {
        const up = (['V1', 'V2', 'V3'] as const).filter((l) => !(f(c, l).st60 > 0 && f(c, l).t > 0));
        const dn = (['I', 'aVL', 'V5', 'V6'] as const).filter((l) => !(f(c, l).st60 < 0 && f(c, l).t < 0));
        return [up.length + dn.length === 0, [...up, ...dn].map((l) => `${l} ST ${fmt(f(c, l).st60)} T ${fmt(f(c, l).t)}`).join(', ')];
      }),
      crit('V4 not concordant (judges): no ST↑ with a positive QRS', 'DECISION §12.2 (lbbb)', (c) => [!(f(c, 'V4').net > 0.1 && f(c, 'V4').st60 > 0.05), `V4 net ${fmt(f(c, 'V4').net)} ST ${fmt(f(c, 'V4').st60)}`]),
      crit('axis −45…+60', 'DECISION §9.6 (lbbb)', (c) => [c.m.axisDeg >= -45 && c.m.axisDeg <= 60, `axis ${fmt(c.m.axisDeg, 0)}`]),
      // the baseline a reader must know before applying Sgarbossa: ST elevation in V1–V2 is expected (gallery review M6)
      crit('appropriate discordance: ST60 ≥ 0.1 mV in V1–V2 and ≤ −0.05 mV in V5–V6', 'lbbb-complete (ST-T usually discordant)', (c) => {
        const ok = f(c, 'V1').st60 >= 0.1 && f(c, 'V2').st60 >= 0.1 && f(c, 'V5').st60 <= -0.05 && f(c, 'V6').st60 <= -0.05;
        return [ok, (['V1', 'V2', 'V5', 'V6'] as const).map((l) => `${l} ST60 ${fmt(f(c, l).st60)}`).join(' ')];
      }),
      crit('uncomplicated: Sgarbossa and Smith negative (no concordant ST↑, no ST↓ in V1–V3, ST/S > −0.25)', 'Sgarbossa 1996; Smith 2012 (criteria.md MI in LBBB)', (c) => {
        const p = sgarbossaParts(c);
        return [p.concordantUp.length + p.concordantDown.length + p.smith.length === 0, `up ${p.concordantUp.join(',')} down ${p.concordantDown.join(',')} smith ${p.smith.join(',')}`];
      }),
    ],
    optOut: { 't-asymmetry': 'secondary T', 'st-segment': 'secondary ST-T' },
  },
  ilbbb: {
    hallmarks: [
      crit('QRS 110–119 ms', 'lbbb-grades; bbb-qrs-cutoff', (c) => [c.m.qrsMs >= 108 && c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('no septal q in I, V5, V6', 'lbbb-grades', (c) => [(['I', 'V5', 'V6'] as const).every((l) => f(c, l).q >= -0.03), list(c, ['I', 'V5', 'V6'], 'q')]),
      crit('R-peak time > 60 ms in V5–V6', 'lbbb-grades; intrinsicoid-deflection', (c) => [f(c, 'V5').rPeakMs > 60 && f(c, 'V6').rPeakMs > 60, list(c, ['V5', 'V6'], 'rPeakMs')]),
      crit('rS / QS in V1 (no RBBB R′)', 'lbbb-grades', (c) => [f(c, 'V1').s < -0.5 && positivePeaks(c, 'V1').length <= 1, `V1 r ${fmt(f(c, 'V1').r)} S ${fmt(f(c, 'V1').s)}`]),
    ],
    optOut: SECONDARY,
  },
  lafb: {
    hallmarks: [
      ...LAFB_CORE,
      NARROW,
      crit('initial q in I or aVL (start from the posterior fascicle)', 'lafb', (c) => [f(c, 'I').q < -0.02 || f(c, 'aVL').q < -0.02, list(c, ['I', 'aVL'], 'q')]),
    ],
  },
  lpfb: { hallmarks: [...LPFB_CORE, NARROW] },
  'bifascicular-block': {
    // base: RBBB + LAFB (the variant lpfb replaces the LAFB axis by the LPFB axis: CONDUCTION_VARIANT_CRITERIA)
    hallmarks: [
      ...RBBB_CORE,
      crit('fascicular axis: −45…−90° (LAFB) or +90…+180° (LPFB)', 'bifascicular; lafb; lpfb', (c) => [(c.m.axisDeg <= -45 && c.m.axisDeg >= -90) || (c.m.axisDeg >= 90 && c.m.axisDeg <= 180), `axis ${fmt(c.m.axisDeg, 0)}`]),
    ],
    optOut: SECONDARY,
  },
  'trifascicular-block': {
    hallmarks: [
      ...RBBB_CORE,
      LAFB_AXIS,
      crit('PR > 200 ms in the conducted beats (first-degree AV block)', 'first-degree-avb; trifascicular', (c) => [c.m.prMs !== null && c.m.prMs > 200, `PR ${fmt(c.m.prMs, 0)}`]),
    ],
    optOut: SECONDARY,
  },
  'rate-dependent-bbb': {
    hallmarks: RATE_DEPENDENT_BBB,
    optOut: { 'qt-dispersion': 'two QRS populations in the strip (the averaged beat mixes them)', 't-asymmetry': 'secondary T of the LBBB beats', 'st-segment': 'secondary ST of the LBBB beats' },
  },
  ivcd: {
    hallmarks: [
      crit('QRS ≥ 110 ms', 'bbb-qrs-cutoff (IVCD)', (c) => [c.m.qrsMs >= 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('not RBBB: no R′ in V1–V2, V1 R-peak time ≤ 50 ms', 'rbbb-complete (excluded)', (c) => [positivePeaks(c, 'V1').length <= 1 && positivePeaks(c, 'V2').length <= 1 && f(c, 'V1').rPeakMs <= 50, `V1 peaks ${positivePeaks(c, 'V1').length} R-peak ${fmt(f(c, 'V1').rPeakMs, 0)}`]),
      crit('not LBBB: septal q present in I and V6 (≥ 0.04 mV)', 'lbbb-complete (excluded)', (c) => [f(c, 'I').q <= -0.04 && f(c, 'V6').q <= -0.04, list(c, ['I', 'V6'], 'q')]),
      crit('not LBBB: R-peak time ≤ 60 ms in V5 or V6 (≤ 0.5 × QRS)', 'lbbb-complete (excluded: R-peak time > 60 ms in V5 and V6)', (c) => [Math.min(f(c, 'V5').rPeakMs, f(c, 'V6').rPeakMs) <= Math.min(60, 0.5 * c.m.qrsMs), list(c, ['V5', 'V6'], 'rPeakMs')]),
    ],
    optOut: { 'no-spikes': 'the border-zone fragment notches the terminal QRS (nonspecific IVCD)' },
  },
};

/** Variant additions (merged by criteria/index.ts). */
export const CONDUCTION_VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  'bifascicular-block': { lpfb: [LPFB_AXIS] },
  'trifascicular-block': {
    mobitz2: [crit('dropped beats (a pause ≈ 2 PP) with a constant PR in the conducted beats (Mobitz II, infra-His)', 'trifascicular (evidence of disease in the remaining fascicle); second-degree AV block Mobitz II', (c) => {
      const rr = [...c.m.rrMs].sort((a, b) => a - b);
      const med = rr[rr.length >> 1];
      const pauses = c.m.rrMs.filter((x) => x >= 1.8 * med).length;
      return [pauses >= 1 && c.m.prSdMs !== null && c.m.prSdMs <= 10, `pauses ${pauses} (RR median ${fmt(med, 0)}), PR SD ${fmt(c.m.prSdMs, 0)}`];
    })],
  },
};

/**
 * Hallmark criteria, group 'normal' (DECISION §9.1). Thresholds: criteria.md rows named in each `source`.
 */
import type { StdLead } from '../../../../src/core/leads';
import { crit, f, fmt, rOf, sokolowMm, stJ, type Criterion, type CriterionCtx, type ScenarioCriteria } from './types';

const CHEST: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const INFERIOR: readonly StdLead[] = ['II', 'III', 'aVF'];
const LATERAL: readonly StdLead[] = ['I', 'aVL', 'V5', 'V6'];

const rate = (lo: number, hi: number, source = 'sinus-pr-rate-rr'): Criterion =>
  crit(`rate ${lo}–${hi}`, source, (c) => [c.m.hrBpm >= lo && c.m.hrBpm <= hi, `rate ${fmt(c.m.hrBpm, 0)}`]);
const constantPr = crit('constant PR (SD ≤ 10 ms), a P before every QRS', 'sinus-pr-rate-rr', (c) => [
  c.m.prMs !== null && (c.m.prSdMs ?? 0) <= 10, `PR ${fmt(c.m.prMs, 0)} SD ${fmt(c.m.prSdMs, 1)}`,
]);
/** transition lead: first chest lead with R ≥ |S| */
export function transition(c: CriterionCtx): StdLead | null {
  return CHEST.find((l) => rOf(c, l) >= -f(c, l).s) ?? null;
}
/** contiguous runs of ≥ 2 leads (in the given order) meeting a condition */
export function contiguous(c: CriterionCtx, leads: readonly StdLead[], ok: (l: StdLead) => boolean): boolean {
  for (let i = 0; i + 1 < leads.length; i++) if (ok(leads[i]) && ok(leads[i + 1])) return true;
  return false;
}
/**
 * Jp, the peak of the terminal notch or the level of the slur (consensus: on the downslope of a prominent R): the
 * terminal r′ when it peaks in the last 40 ms of the QRS, otherwise the level at the QRS end.
 */
export function jPeak(c: CriterionCtx, l: StdLead): number {
  const x = f(c, l);
  const terminalNotch = x.r2 > 0 && c.m.qrsMs - x.rPeakMs <= 40 ? x.r2 : 0;
  return Math.max(x.j, terminalNotch);
}
const jWave = crit('J notch / slur (Jp) ≥ 0.1 mV in ≥ 2 contiguous inferior or lateral leads', 'early-repolarization', (c) => {
  const ok = (l: StdLead): boolean => jPeak(c, l) >= 0.1;
  return [contiguous(c, INFERIOR, ok) || contiguous(c, LATERAL, ok), `Jp: ${[...INFERIOR, ...LATERAL].map((l) => `${l} ${fmt(jPeak(c, l))}`).join(' ')}`];
});
/** Ginzton 1982 (criteria.md early-repolarization / pericarditis): ST/T in V6 < 0.25 favours early repolarisation (the
 *  pericarditis hallmark asks ≥ 0.25 with the same formula, criteria/structural.ts); 0.22 keeps a visible margin. */
const v6StT = crit('ST/T ratio in V6 < 0.22 (early repolarisation, not pericarditis: < 0.25)', 'early-repolarization; Acute pericarditis (ST/T V6 ratio, Ginzton 1982)', (c) => {
  const r = stJ(c, 'V6') / Math.max(1e-6, f(c, 'V6').t);
  return [f(c, 'V6').t > 0 && r < 0.22, `V6 ST ${fmt(stJ(c, 'V6'))} T ${fmt(f(c, 'V6').t)} ratio ${fmt(r)}`];
});

export const NORMAL_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  normal: {
    hallmarks: [
      rate(60, 100),
      crit('PR 120–200 ms', 'pr-normal', (c) => [c.m.prMs !== null && c.m.prMs >= 120 && c.m.prMs <= 200, `PR ${fmt(c.m.prMs, 0)}`]),
      crit('QRS < 110 ms', 'qrs-duration-normal', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      // the axis dial spans horizontal to vertical normal hearts (+10…+80°); the calibrated base sits at ≈ +40°
      crit('QRS axis normal (−30…+90°)', 'qrs-axis-adult', (c) => [c.m.axisDeg >= -30 && c.m.axisDeg <= 90, `axis ${fmt(c.m.axisDeg, 0)}`]),
      // heart-position: a vertical heart (axis > +60°) shows rS / QS in aVL — no septal-q rule there
      crit('septal q in I / aVL / V5 / V6 < 25 % of R and < 40 ms (aVL: horizontal and intermediate hearts)', 'precordial-progression; heart-position; DECISION §12.2 (normal)', (c) => {
        const leads = c.m.axisDeg > 60 ? (['I', 'V5', 'V6'] as const) : (['I', 'aVL', 'V5', 'V6'] as const);
        const bad = leads.filter((l) => f(c, l).q < 0 && (-f(c, l).q >= 0.25 * rOf(c, l) || f(c, l).qDur >= 40));
        return [bad.length === 0, `q: ${bad.map((l) => `${l} q ${fmt(f(c, l).q)} R ${fmt(rOf(c, l))} ${fmt(f(c, l).qDur, 0)} ms`).join(', ')}`];
      }),
      crit('rS in V1 (r < S)', 'precordial-progression', (c) => [rOf(c, 'V1') < -f(c, 'V1').s, `V1 r ${fmt(rOf(c, 'V1'))} S ${fmt(f(c, 'V1').s)}`]),
      crit('R grows V1 → V4', 'precordial-progression', (c) => {
        const r = (['V1', 'V2', 'V3', 'V4'] as const).map((l) => rOf(c, l));
        return [r.every((x, i) => i === 0 || x > r[i - 1]), `R V1–V4 ${r.map((x) => fmt(x)).join(' ')}`];
      }),
      crit('transition V3–V4', 'precordial-progression; DECISION §12.2 (normal)', (c) => [['V3', 'V4'].includes(transition(c) ?? ''), `transition ${transition(c) ?? 'none'}`]),
      crit('T upright in I, II, aVF, V2–V6 and inverted in aVR', 'st-t-u-normal', (c) => {
        const bad = (['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).filter((l) => f(c, l).t <= 0);
        return [bad.length === 0 && f(c, 'aVR').t < 0, `T: ${bad.map((l) => `${l} ${fmt(f(c, l).t)}`).join(' ')} aVR ${fmt(f(c, 'aVR').t)}`];
      }),
      crit('|J| < 0.1 mV in every lead', 'st-t-u-normal', (c) => {
        const bad = (Object.keys(c.m.feats) as StdLead[]).filter((l) => Math.abs(f(c, l).j) >= 0.1);
        return [bad.length === 0, `J: ${bad.map((l) => `${l} ${fmt(f(c, l).j)}`).join(' ')}`];
      }),
      // the judges asked for T ≤ ½ R in V3–V4; the PTB-XL+ NORM medians give V3 T/R ≈ 0.55 (0.45 / 0.82 mV) and V4 0.28,
      // so V3 keeps T clearly below R and V4 keeps T ≤ ½ R
      crit('T < ¾ R in V3 and ≤ ½ R in V4 (judges, NORM envelope)', 'DECISION §12.2 (normal); PTB-XL+ NORM envelope', (c) => {
        const bad = ([['V3', 0.75], ['V4', 0.5]] as const).filter(([l, k]) => f(c, l).t > k * rOf(c, l)).map(([l]) => l);
        return [bad.length === 0, bad.map((l) => `${l} T ${fmt(f(c, l).t)} R ${fmt(rOf(c, l))}`).join(', ')];
      }),
      crit('SV1 + RV5/6 < 35 mm', 'lvh-axis-voltage', (c) => [sokolowMm(c) < 35, `Sokolow–Lyon ${fmt(sokolowMm(c), 1)} mm`]),
      crit('P axis 0…+75', 'p-wave-normal', (c) => [c.m.pAxisDeg !== null && c.m.pAxisDeg >= 0 && c.m.pAxisDeg <= 75, `P axis ${fmt(c.m.pAxisDeg, 0)}`]),
    ],
  },
  'sinus-bradycardia': { hallmarks: [rate(30, 59.9), constantPr] },
  'sinus-tachycardia': {
    hallmarks: [
      rate(100.1, 180),
      crit('sinus P upright in II', 'p-wave-normal', (c) => [f(c, 'II').p >= 0.05, `P in II ${fmt(f(c, 'II').p)}`]),
      crit('QTc (Fridericia) normal < 450 ms', 'qtc-bazett', (c) => {
        const q = c.m.qtMs === null ? null : c.m.qtMs / Math.cbrt(60 / c.m.hrBpm);
        return [q !== null && q < 450, `QTcF ${fmt(q, 0)}`];
      }),
    ],
  },
  'sinus-arrhythmia': {
    hallmarks: [
      crit('PP (= RR, constant PR) max − min > 120 ms', 'sinus-pr-rate-rr', (c) => {
        const r = c.m.rrMs;
        return [r.length > 2 && Math.max(...r) - Math.min(...r) > 120, `RR range ${fmt(Math.max(...r) - Math.min(...r), 0)} ms`];
      }),
      constantPr,
    ],
  },
  'early-repolarization': {
    hallmarks: [
      jWave,
      crit('ST elevation ≤ 0.2 mV (V2–V3 < 0.25 mV, men < 40 y)', 'early-repolarization; rate-rhythm-intervals-axis "Normal ST elevation"', (c) => {
        const bad = (Object.keys(c.m.feats) as StdLead[]).filter((l) => f(c, l).st60 > (l === 'V2' || l === 'V3' ? 0.25 : 0.2));
        return [bad.length === 0, bad.map((l) => `${l} ${fmt(f(c, l).st60)}`).join(' ')];
      }),
      crit('no reciprocal ST depression except aVR / V1', 'early-repolarization', (c) => {
        const bad = (Object.keys(c.m.feats) as StdLead[]).filter((l) => l !== 'aVR' && l !== 'V1' && f(c, l).st60 < -0.05);
        return [bad.length === 0, bad.map((l) => `${l} ${fmt(f(c, l).st60)}`).join(' ')];
      }),
      crit('QRS < 120 ms', 'early-repolarization', (c) => [c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      v6StT,
      crit('upright T in I, II and V2–V6', 'early-repolarization (upright T)', (c) => {
        const ls = ['I', 'II', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
        return [ls.every((l) => f(c, l).t > 0.1), ls.map((l) => `${l} ${fmt(f(c, l).t)}`).join(' ')];
      }),
    ],
  },
  'juvenile-t': {
    hallmarks: [
      crit('T inverted in V1–V3', 't-juvenile-variant', (c) => [(['V1', 'V2', 'V3'] as const).every((l) => f(c, l).t < 0), `T V1–V3 ${(['V1', 'V2', 'V3'] as const).map((l) => fmt(f(c, l).t)).join(' ')}`]),
      crit('T upright in V4–V6', 't-juvenile-variant', (c) => [(['V4', 'V5', 'V6'] as const).every((l) => f(c, l).t > 0), `T V4–V6 ${(['V4', 'V5', 'V6'] as const).map((l) => fmt(f(c, l).t)).join(' ')}`]),
      crit('ST isoelectric in V1–V3 (|J| < 0.1 mV)', 't-juvenile-variant', (c) => [(['V1', 'V2', 'V3'] as const).every((l) => Math.abs(f(c, l).j) < 0.1), `J V1–V3 ${(['V1', 'V2', 'V3'] as const).map((l) => fmt(f(c, l).j)).join(' ')}`]),
      crit('shallow inversion (≥ −0.6 mV): not Wellens- or strain-deep', 't-juvenile-variant', (c) => [(['V1', 'V2', 'V3'] as const).every((l) => f(c, l).t >= -0.6), `T V1–V3 ${(['V1', 'V2', 'V3'] as const).map((l) => fmt(f(c, l).t)).join(' ')}`]),
    ],
    optOut: { 'qt-dispersion': 'V4 is the biphasic T-transition lead of the pattern; its tangent end is not comparable with V5' },
  },
  athlete: {
    hallmarks: [
      rate(30, 59.9),
      crit('LVH voltage (Sokolow–Lyon ≥ 35 mm)', 'lvh-axis-voltage', (c) => [sokolowMm(c) >= 35, `Sokolow–Lyon ${fmt(sokolowMm(c), 1)} mm`]),
      crit('no strain: T upright in I, V5, V6', 'lv-systolic-overload', (c) => [(['I', 'V5', 'V6'] as const).every((l) => f(c, l).t > 0), `T ${(['I', 'V5', 'V6'] as const).map((l) => `${l} ${fmt(f(c, l).t)}`).join(' ')}`]),
      crit('incomplete RBBB: rsr′ in V1', 'rbbb-incomplete', (c) => [f(c, 'V1').r2 > 0.03, `V1 ${f(c, 'V1').morph}`]),
      jWave,
      v6StT,
    ],
  },
  irbbb: {
    hallmarks: [
      crit('QRS 110–119 ms', 'rbbb-incomplete; bbb-qrs-cutoff', (c) => [c.m.qrsMs >= 110 && c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('rsr′ in V1', 'rbbb-incomplete', (c) => [f(c, 'V1').r2 > 0.03, `V1 ${f(c, 'V1').morph} r′ ${fmt(f(c, 'V1').r2)}`]),
      crit('terminal slurred S in I and V6', 'rbbb-incomplete', (c) => [f(c, 'I').s < -0.05 && f(c, 'V6').s < -0.05, `S I ${fmt(f(c, 'I').s)} V6 ${fmt(f(c, 'V6').s)}`]),
    ],
  },
};

/** Variant-specific additions (scenario id → variant → hallmarks), on top of the scenario's own. */
export const NORMAL_VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  athlete: {
    'first-degree': [crit('PR > 200 ms', 'first-degree-avb', (c) => [c.m.prMs !== null && c.m.prMs > 200, `PR ${fmt(c.m.prMs, 0)}`])],
  },
};


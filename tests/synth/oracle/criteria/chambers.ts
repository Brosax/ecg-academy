/**
 * Hallmark criteria, group 'chambers' (§9.8); 'repolarization' (§9.9) and 'structural' (§9.10) live in their own
 * files and are re-exported below.
 * Thresholds: criteria.md rows named in each `source`.
 */
import { STD_LEADS, type StdLead } from '../../../../src/core/leads';
import { REPOLARIZATION_VARIANT_CRITERIA } from './repolarization';
import { STRUCTURAL_VARIANT_CRITERIA } from './structural';
import { at, cornellMm, crit, f, fmt, mm, rOf, sokolowMm, stJ, type Criterion, type CriterionCtx, type ScenarioCriteria } from './types';

const STRAIN: readonly StdLead[] = ['I', 'aVL', 'V5', 'V6'];
const LIMBS: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const CHEST: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/**
 * P wave of the representative beat in one lead (oracle median beat): extent from the oracle's P onset to where the
 * deflection last exceeds 0.02 mV against the onset level, positive / negative peaks, humps (local maxima ≥ 0.03 mV
 * separated by a dip of ≥ 0.01 mV) and the V1-style terminal force (depth mm × duration s of the negative part after
 * the positive peak).
 */
export interface PWave {
  readonly durMs: number; readonly pos: number; readonly neg: number; readonly humps: readonly number[]; readonly ptf: number; readonly initPos: number;
  /** sample indices of the edges in this lead (per-beat results only) */
  readonly on?: number; readonly off?: number;
}

/** One P wave between the previous T end and the QRS onset (sample indices), against the quietest 20 ms of the TP. */
function pOfBeat(x: Float32Array, lo: number, hi: number, fs: number): PWave | null {
  const n = (ms: number): number => Math.max(1, Math.round((ms * fs) / 1000));
  const w = n(20);
  let qi = lo, qv = Infinity;
  for (let i = lo; i + w <= lo + Math.floor((hi - lo) / 2); i++) {
    let a = 0;
    for (let k = i + 1; k < i + w; k++) a += Math.abs(x[k] - x[k - 1]);
    if (a < qv) {
      qv = a;
      qi = i;
    }
  }
  let base = 0;
  for (let k = qi; k < qi + w; k++) base += x[k] / w;
  let peak = 0;
  for (let i = qi + w; i <= hi; i++) peak = Math.max(peak, Math.abs(x[i] - base));
  if (peak < 0.02) return null;
  // edges: 12 % of the largest deflection (the atrial repolarisation keeps the PR segment slightly off the TP level)
  const thr = Math.max(0.012, 0.12 * peak);
  let on = -1, off = -1;
  for (let i = qi + w; i <= hi; i++) if (Math.abs(x[i] - base) > thr) {
    if (on < 0) on = i;
    off = i;
  }
  if (on < 0) return null;
  const ms = (i: number): number => (i * 1000) / fs;
  let pos = 0, neg = 0, iPos = on;
  for (let i = on; i <= off; i++) {
    const v = x[i] - base;
    if (v > pos) {
      pos = v;
      iPos = i;
    }
    neg = Math.min(neg, v);
  }
  // humps: local maxima ≥ 0.03 mV separated by a dip of ≥ 0.01 mV
  const humps: number[] = [];
  let lastV = -Infinity, dip = Infinity;
  for (let i = on + 1; i < off; i++) {
    const v = x[i] - base;
    dip = Math.min(dip, v);
    if (v >= 0.03 && v >= x[i - 1] - base && v >= x[i + 1] - base) {
      if (!humps.length || (lastV - dip >= 0.01 && v - dip >= 0.01)) {
        humps.push(ms(i - on));
        lastV = v;
      } else if (v > lastV) lastV = v;
      dip = Infinity;
    }
  }
  // terminal negative force (V1): depth (mm) × duration (s) of the negative part after the positive peak
  let negN = 0, depth = 0;
  for (let i = iPos; i <= off; i++) if (x[i] - base < -0.01) {
    negN++;
    depth = Math.min(depth, x[i] - base);
  }
  let initPos = 0;
  for (let i = on; i <= Math.min(off, on + n(50)); i++) initPos = Math.max(initPos, x[i] - base);
  return { durMs: ms(off - on), pos, neg, humps, ptf: -depth * 10 * (negN / fs), initPos, on, off };
}

/** Per-beat windows between the previous T end and the QRS onset (sample indices). */
function pWindows(c: CriterionCtx): { lo: number; hi: number }[] {
  const n = (ms: number): number => Math.round((ms * c.fs) / 1000);
  const out: { lo: number; hi: number }[] = [];
  for (let k = 1; k < c.m.beats.length; k++) {
    const b = c.m.beats[k], pb = c.m.beats[k - 1];
    const lo = Math.round((pb.tOff ?? pb.qrsOff + n(250)) + n(20)), hi = Math.round(b.qrsOn - n(4));
    if (hi - lo >= n(90)) out.push({ lo, hi });
  }
  return out;
}

/** Global P duration (ms): earliest onset to latest offset over the limb and right precordial leads, median over beats. */
export function pDurationMs(c: CriterionCtx): number | null {
  const leads: readonly StdLead[] = ['I', 'II', 'III', 'aVF', 'V1', 'V2'];
  const ds: number[] = [];
  for (const w of pWindows(c)) {
    let on = Infinity, off = -Infinity;
    for (const l of leads) {
      const p = pOfBeat(c.leads[l], w.lo, w.hi, c.fs);
      if (!p || p.on === undefined || p.off === undefined) continue;
      on = Math.min(on, p.on);
      off = Math.max(off, p.off);
    }
    if (Number.isFinite(on)) ds.push(((off - on) * 1000) / c.fs);
  }
  return ds.length ? [...ds].sort((a, b) => a - b)[ds.length >> 1] : null;
}

/**
 * P wave of one lead: measured on every beat between the previous T end and the QRS onset (oracle beats), then the
 * median feature over beats (humps: those of the beat with the median duration).
 */
export function pWave(c: CriterionCtx, l: StdLead): PWave | null {
  const ps: PWave[] = [];
  for (const w of pWindows(c)) {
    const p = pOfBeat(c.leads[l], w.lo, w.hi, c.fs);
    if (p) ps.push(p);
  }
  if (!ps.length) return null;
  const med = (k: 'durMs' | 'pos' | 'neg' | 'ptf' | 'initPos'): number => [...ps].map((p) => p[k]).sort((a, b) => a - b)[ps.length >> 1];
  const byDur = [...ps].sort((a, b) => a.durMs - b.durMs)[ps.length >> 1];
  return { durMs: med('durMs'), pos: med('pos'), neg: med('neg'), humps: byDur.humps, ptf: med('ptf'), initPos: med('initPos') };
}
const pStr = (c: CriterionCtx, l: StdLead): string => {
  const p = pWave(c, l);
  return p ? `${l} P ${fmt(p.pos)}/${fmt(p.neg)} dur ${fmt(p.durMs, 0)} humps ${p.humps.map((h) => fmt(h, 0)).join('/')} ptf ${fmt(p.ptf, 3)}` : `${l} P —`;
};
/** QRS peak-to-peak (mV) of the representative beat. */
const p2p = (c: CriterionCtx, l: StdLead): number => f(c, l).p2p;
/** Peguero–Lo Presti (mm): deepest S in any lead + S in V4 (Peguero JG et al., JACC 2017;69:1694) */
const pegueroMm = (c: CriterionCtx): number => mm(-Math.min(...STD_LEADS.map((l) => f(c, l).s)) - f(c, 'V4').s);
/** Per-beat QRS peak-to-peak (mV) in a lead, from the oracle's beat onsets (100 ms window). */
function beatP2p(c: CriterionCtx, l: StdLead): number[] {
  const x = c.leads[l];
  const w = Math.round(0.1 * c.fs);
  return c.m.beats.map((b) => {
    let lo = Infinity, hi = -Infinity;
    for (let i = b.qrsOn; i < Math.min(x.length, b.qrsOn + w); i++) {
      lo = Math.min(lo, x[i]);
      hi = Math.max(hi, x[i]);
    }
    return hi - lo;
  });
}

const P_RAE: readonly Criterion[] = [
  crit('P ≥ 0.25 mV in II, III or aVF', 'rae-criteria', (c) => [(['II', 'III', 'aVF'] as const).some((l) => (pWave(c, l)?.pos ?? 0) >= 0.25), (['II', 'III', 'aVF'] as const).map((l) => pStr(c, l)).join('; ')]),
  crit('P axis > +75° (vertical)', 'rae-criteria', (c) => [c.m.pAxisDeg !== null && c.m.pAxisDeg > 75, `P axis ${fmt(c.m.pAxisDeg, 0)}`]),
];
const P_LAE: readonly Criterion[] = [
  crit('P ≥ 120 ms (global, earliest onset to latest offset)', 'lae-criteria', (c) => [(pDurationMs(c) ?? 0) >= 120, `P ${fmt(pDurationMs(c), 0)} ms`]),
  crit('V1 terminal negative P force ≥ 0.04 mm·s', 'lae-criteria', (c) => [(pWave(c, 'V1')?.ptf ?? 0) >= 0.04, pStr(c, 'V1')]),
];

export const CHAMBER_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  lae: {
    hallmarks: [
      ...P_LAE,
      crit('V1 terminal negative P ≥ 0.1 mV deep (≥ 1 mm)', 'lae-criteria (V1 terminal P ≥ 1 mm deep and ≥ 40 ms)', (c) => [(pWave(c, 'V1')?.neg ?? 0) <= -0.098, pStr(c, 'V1')]),
      crit('notched (bifid) P in II with humps ≥ 40 ms apart', 'lae-criteria', (c) => {
        const h = pWave(c, 'II')?.humps ?? [];
        return [h.length >= 2 && h[h.length - 1] - h[0] >= 40, pStr(c, 'II')];
      }),
    ],
  },
  rae: {
    hallmarks: [
      ...P_RAE,
      crit('initial positive P ≥ 0.15 mV in V1 or V2', 'rae-criteria', (c) => [(['V1', 'V2'] as const).some((l) => (pWave(c, l)?.initPos ?? 0) >= 0.15), `${pStr(c, 'V1')}; ${pStr(c, 'V2')}`]),
      crit('P duration < 120 ms', 'rae-criteria', (c) => [(pDurationMs(c) ?? 999) < 120, `P ${fmt(pDurationMs(c), 0)} ms`]),
    ],
    optOut: { 'sinus-p': 'vertical P axis (> +75°) is the finding' },
  },
  'biatrial-abnormality': { hallmarks: [...P_RAE.slice(0, 1), ...P_LAE], optOut: { 'sinus-p': 'vertical P axis of the RA component' } },
  'interatrial-block': {
    hallmarks: [crit('P ≥ 120 ms (global)', 'lae-criteria (interatrial block: P ≥ 120 ms)', (c) => [(pDurationMs(c) ?? 0) >= 120, `P ${fmt(pDurationMs(c), 0)} ms; ${pStr(c, 'II')}`])],
    optOut: { 'sinus-p': 'advanced variant: biphasic (+/−) inferior P from caudo-cranial LA activation' },
  },
  lvh: {
    hallmarks: [
      crit('classic exemplar: Sokolow–Lyon > 35 mm, Cornell > 28 / 20 mm and Peguero–Lo Presti ≥ 28 / 23 mm (all three)', 'lvh-axis-voltage; LVH bullet "Peguero-Lo Presti" (Peguero 2017)', (c) => {
        const fem = c.def.patient?.sex === 'female';
        const peg = pegueroMm(c);
        return [sokolowMm(c) > 35 && cornellMm(c) > (fem ? 20 : 28) && peg >= (fem ? 23 : 28), `Sokolow ${fmt(sokolowMm(c), 1)} Cornell ${fmt(cornellMm(c), 1)} Peguero ${fmt(peg, 1)} mm`];
      }),
      crit('LVH voltage: Sokolow–Lyon ≥ 35 mm or Cornell > 28 mm (men) / 20 mm (women)', 'lvh-axis-voltage', (c) => {
        const corn = c.def.patient?.sex === 'female' ? 20 : 28;
        return [sokolowMm(c) >= 35 || cornellMm(c) > corn, `Sokolow ${fmt(sokolowMm(c), 1)} mm, Cornell ${fmt(cornellMm(c), 1)} mm`];
      }),
      crit('QRS < 110 ms', 'lvh-axis-voltage', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('no strain: T upright in I, V5, V6 and no ST↓ ≥ 0.05 mV there', 'lv-systolic-overload (absent)', (c) => {
        const bad = (['I', 'V5', 'V6'] as const).filter((l) => f(c, l).t <= 0.05 || f(c, l).st60 <= -0.05);
        return [bad.length === 0, bad.map((l) => `${l} ST ${fmt(f(c, l).st60)} T ${fmt(f(c, l).t)}`).join(', ')];
      }),
    ],
  },
  'lvh-strain': {
    hallmarks: [
      crit('classic exemplar: Sokolow–Lyon > 35 mm, Cornell > 28 / 20 mm and Peguero–Lo Presti ≥ 28 / 23 mm (all three)', 'lvh-axis-voltage; LVH bullet "Peguero-Lo Presti" (Peguero 2017)', (c) => {
        const fem = c.def.patient?.sex === 'female';
        const peg = pegueroMm(c);
        return [sokolowMm(c) > 35 && cornellMm(c) > (fem ? 20 : 28) && peg >= (fem ? 23 : 28), `Sokolow ${fmt(sokolowMm(c), 1)} Cornell ${fmt(cornellMm(c), 1)} Peguero ${fmt(peg, 1)} mm`];
      }),
      crit('LVH voltage: Sokolow–Lyon ≥ 35 mm or Cornell > 28 mm (men) / 20 mm (women)', 'lvh-axis-voltage', (c) => {
        const corn = c.def.patient?.sex === 'female' ? 20 : 28;
        return [sokolowMm(c) >= 35 || cornellMm(c) > corn, `Sokolow ${fmt(sokolowMm(c), 1)} mm, Cornell ${fmt(cornellMm(c), 1)} mm`];
      }),
      crit('R-peak time in V5–V6 ≥ 50 ms', 'intrinsicoid-deflection', (c) => [Math.max(f(c, 'V5').rPeakMs, f(c, 'V6').rPeakMs) >= 50, `R-peak time V5 ${fmt(f(c, 'V5').rPeakMs, 0)} V6 ${fmt(f(c, 'V6').rPeakMs, 0)}`]),
      crit('QRS < 120 ms (no bundle-branch block)', 'lvh-axis-voltage; PTB-XL LVH envelope 80–120 ms', (c) => [c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('strain: ST↓ and inverted T in V5, V6 and in I or aVL', 'lv-systolic-overload', (c) => {
        const ok = (l: StdLead): boolean => f(c, l).st60 <= -0.03 && f(c, l).t <= -0.08;
        return [ok('V5') && ok('V6') && (ok('I') || ok('aVL')), STRAIN.map((l) => `${l} ST ${fmt(f(c, l).st60)} T ${fmt(f(c, l).t)}`).join(', ')];
      }),
      crit('strain T asymmetric (slow descent, fast return: ≥ 1.3) in V5–V6', 'lv-systolic-overload; DECISION §9.8', (c) => [f(c, 'V5').tAsym >= 1.3 && f(c, 'V6').tAsym >= 1.3, `T asymmetry V5 ${fmt(f(c, 'V5').tAsym)} V6 ${fmt(f(c, 'V6').tAsym)}`]),
      crit('J depression 0.05–0.1 mV laterally (judges: 0.5–1 mm)', 'DECISION §12.2 (lvh-strain)', (c) => {
        const j = Math.min(stJ(c, 'V5'), stJ(c, 'V6'));
        return [j <= -0.03 && j >= -0.15, `J V5 ${fmt(stJ(c, 'V5'))} V6 ${fmt(stJ(c, 'V6'))}`];
      }),
      crit('axis −30…+30', 'DECISION §9.8 (lvh-strain)', (c) => [c.m.axisDeg >= -30 && c.m.axisDeg <= 30, `axis ${fmt(c.m.axisDeg, 0)}`]),
    ],
    optOut: { 'st-segment': 'secondary ST-T (strain)', 't-asymmetry': 'inverted lateral T' },
  },
  rvh: {
    hallmarks: [
      crit('R/S in V1 > 1 with R ≥ 0.7 mV', 'rvh-criteria', (c) => [rOf(c, 'V1') >= 0.7 && rOf(c, 'V1') > -f(c, 'V1').s, `V1 R ${fmt(rOf(c, 'V1'))} S ${fmt(f(c, 'V1').s)}`]),
      crit('right axis deviation ≥ +110° (adult RVH constellation)', 'rvh-criteria; qrs-axis-adult', (c) => [c.m.axisDeg >= 110 && c.m.axisDeg <= 180, `axis ${fmt(c.m.axisDeg, 0)}`]),
      crit('deep S in V5 or V6 (≥ 0.7 mV) and an R in aVR (≥ 0.2 mV)', 'rvh-criteria (S V5/V6 ≥ 7 mm; tall R aVR)', (c) => [Math.min(f(c, 'V5').s, f(c, 'V6').s) <= -0.7 && rOf(c, 'aVR') >= 0.2, `S V5 ${fmt(f(c, 'V5').s)} V6 ${fmt(f(c, 'V6').s)} R aVR ${fmt(rOf(c, 'aVR'))}`]),
      crit('R V1 + S V6 > 1.05 mV, S in V5–V6 present', 'rvh-criteria', (c) => [rOf(c, 'V1') - f(c, 'V6').s > 1.05 && f(c, 'V5').s < -0.2 && f(c, 'V6').s < -0.2, `V1 R ${fmt(rOf(c, 'V1'))} V5 S ${fmt(f(c, 'V5').s)} V6 S ${fmt(f(c, 'V6').s)}`]),
      crit('QRS < 120 ms (not RBBB)', 'rvh-criteria (exclude RBBB)', (c) => [c.m.qrsMs < 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
    ],
  },
  'biventricular-hypertrophy': {
    hallmarks: [
      crit('LV signs reach the lateral leads: R ≥ 1.2 mV in V6 with deep S (≥ 0.5 mV) in V5–V6', 'biventricular-hypertrophy (LVH with deep S in V5–V6)', (c) => [rOf(c, 'V6') >= 1.2 && Math.min(f(c, 'V5').s, f(c, 'V6').s) <= -0.5, `V6 R ${fmt(rOf(c, 'V6'))} S V5 ${fmt(f(c, 'V5').s)} V6 ${fmt(f(c, 'V6').s)}`]),
      crit('LVH voltage (Sokolow–Lyon ≥ 35 mm or Cornell > 28 / 20 mm)', 'biventricular-hypertrophy; lvh-axis-voltage', (c) => {
        const corn = c.def.patient?.sex === 'female' ? 20 : 28;
        return [sokolowMm(c) >= 35 || cornellMm(c) > corn, `Sokolow ${fmt(sokolowMm(c), 1)} mm, Cornell ${fmt(cornellMm(c), 1)} mm`];
      }),
      crit('with RV signs: right axis (> +90°) and tall R in V1 (R/S ≥ 1)', 'biventricular-hypertrophy', (c) => [c.m.axisDeg > 90 && rOf(c, 'V1') >= -f(c, 'V1').s, `axis ${fmt(c.m.axisDeg, 0)} V1 R ${fmt(rOf(c, 'V1'))} S ${fmt(f(c, 'V1').s)}`]),
    ],
    optOut: { 'qt-dispersion': 'secondary T of the dominant RV force: the low, inverted V1–V2 T moves the tangent end from lead to lead' },
  },
  'low-voltage': {
    hallmarks: [
      crit('every limb-lead QRS < 0.5 mV p2p (or every chest lead < 1.0 mV)', 'h4 low voltage (truth/findings.ts THRESHOLDS)', (c) => [LIMBS.every((l) => p2p(c, l) < 0.5) || CHEST.every((l) => p2p(c, l) < 1.0), LIMBS.map((l) => `${l} ${fmt(p2p(c, l))}`).join(' ')]),
      crit('P still visible (≥ 0.05 mV in II)', 'DECISION §6.10 (visible P)', (c) => [(pWave(c, 'II')?.pos ?? 0) >= 0.05, pStr(c, 'II')]),
    ],
    optOut: { 'limb-voltage': 'low voltage is the finding', 'sinus-p': 'emphysema variant: the vertical P axis (> +75°) of the hyperinflated chest is part of the pattern (criteria.md RVH in COPD/emphysema)' },
  },
  'electrical-alternans': {
    hallmarks: [
      crit('QRS amplitude alternates ≥ 10 % beat to beat in ≥ 3 leads', 'DECISION §9.8 (electrical alternans)', (c) => {
        const alt = (l: StdLead): number => {
          const a = beatP2p(c, l).slice(1, -1);
          if (a.length < 4) return 0;
          let s = 0, signOk = 0;
          for (let i = 1; i < a.length; i++) {
            s += Math.abs(a[i] - a[i - 1]);
            if (i > 1 && Math.sign(a[i] - a[i - 1]) !== Math.sign(a[i - 1] - a[i - 2])) signOk++;
          }
          const mean = a.reduce((p, q) => p + q, 0) / a.length;
          return signOk >= (a.length - 2) * 0.8 ? s / (a.length - 1) / mean : 0;
        };
        const leads = STD_LEADS.filter((l) => alt(l) >= 0.1);
        // (most leads, limb and chest: the whole heart swings, not one electrode)
        if (leads.length < 8 || LIMBS.filter((l) => leads.includes(l)).length < 3) return [false, `alternating leads ${leads.join(' ')} (need ≥ 8 incl. ≥ 3 limb leads)`];
        return [leads.length >= 3, STD_LEADS.map((l) => `${l} ${fmt(alt(l))}`).join(' ')];
      }),
      crit('rate > 100/min', 'electrical alternans with effusion: sinus tachycardia', (c) => [c.m.hrBpm > 100, `HR ${fmt(c.m.hrBpm, 0)}`]),
      crit('low voltage (every limb lead < 0.5 mV or every chest lead < 1.0 mV)', 'h4 low voltage', (c) => [LIMBS.every((l) => p2p(c, l) < 0.5) || CHEST.every((l) => p2p(c, l) < 1.0), CHEST.map((l) => `${l} ${fmt(p2p(c, l))}`).join(' ')]),
    ],
    optOut: { 't-over-r-v5v6': 'swinging heart: small QRS', 'limb-voltage': 'low voltage of the effusion is part of the finding' },
  },
  'poor-r-progression': {
    hallmarks: [
      crit('R in V3 ≤ 0.3 mV', 'precordial-progression (truth/findings.ts prwpV3)', (c) => [f(c, 'V3').r <= 0.3, `V3 R ${fmt(f(c, 'V3').r)}`]),
      crit('no Q ≥ 40 ms in V1–V4 (rotation, not infarction)', 'pathological-q (absent)', (c) => [(['V1', 'V2', 'V3', 'V4'] as const).every((l) => f(c, l).qDur < 40), (['V1', 'V2', 'V3', 'V4'] as const).map((l) => `${l} q ${fmt(f(c, l).qDur, 0)} ms`).join(' ')]),
      crit('transition late: R < S through V3, R > S by V6', 'precordial-progression', (c) => [rOf(c, 'V3') < -f(c, 'V3').s && rOf(c, 'V6') > -f(c, 'V6').s, `V3 ${fmt(rOf(c, 'V3'))}/${fmt(f(c, 'V3').s)} V6 ${fmt(rOf(c, 'V6'))}/${fmt(f(c, 'V6').s)}`]),
    ],
  },
  dextrocardia: {
    hallmarks: [
      crit('P, QRS and T negative in I', 'situs-p; DECISION §9.8 (dextrocardia)', (c) => [f(c, 'I').p < 0.03 && f(c, 'I').pNeg < -0.03 && f(c, 'I').net < 0 && f(c, 'I').t < 0, `I P ${fmt(f(c, 'I').p)}/${fmt(f(c, 'I').pNeg)} net ${fmt(f(c, 'I').net)} T ${fmt(f(c, 'I').t)}`]),
      crit('aVR upright (P and QRS)', 'situs-p', (c) => [f(c, 'aVR').p > 0.02 && f(c, 'aVR').net > 0, `aVR P ${fmt(f(c, 'aVR').p)} net ${fmt(f(c, 'aVR').net)}`]),
      crit('R falls from V1 to V6 (reverse progression, unlike a cable reversal)', 'DECISION §9.8 (contrast with electrode-reversal-la-ra)', (c) => [rOf(c, 'V1') > rOf(c, 'V4') && rOf(c, 'V4') >= rOf(c, 'V6') - 0.05, CHEST.map((l) => `${l} ${fmt(rOf(c, l))}`).join(' ')]),
    ],
    optOut: { 'sinus-p': 'mirror-image sinus P (situs inversus): negative in I', 't-over-r-v5v6': 'V5–V6 face away from the heart: tiny R with an inverted T' },

  },
  'copd-pattern': {
    hallmarks: [
      ...P_RAE,
      crit('right axis (> +90°)', 'cor-pulmonale-chronic', (c) => [c.m.axisDeg > 90, `axis ${fmt(c.m.axisDeg, 0)}`]),
      crit('low limb voltage: I, aVR, aVL < 0.5 mV p2p and every limb lead < 0.7 mV', 'cor-pulmonale-chronic (low limb-lead voltage)', (c) => [(['I', 'aVR', 'aVL'] as const).every((l) => p2p(c, l) < 0.5) && LIMBS.every((l) => p2p(c, l) < 0.7), LIMBS.map((l) => `${l} ${fmt(p2p(c, l))}`).join(' ')]),
      crit('small R and persistent S across V1–V6 (clockwise rotation)', 'cor-pulmonale-chronic', (c) => [rOf(c, 'V3') < 0.5 && f(c, 'V5').s < -0.1 && f(c, 'V6').s < -0.05, `V3 R ${fmt(rOf(c, 'V3'))} V5 S ${fmt(f(c, 'V5').s)} V6 S ${fmt(f(c, 'V6').s)}`]),
    ],
    optOut: { 'sinus-p': 'vertical P axis (> +75°) is the finding' },
  },
};

// the repolarization and structural groups have their own files; re-exported here so criteria/index.ts keeps its
// imports (one file per catalogue group, README "Declaring oracle criteria")
export { REPOLARIZATION_CRITERIA } from './repolarization';
export { STRUCTURAL_CRITERIA } from './structural';

/** Variant additions of the chambers, repolarization and structural groups (merged by criteria/index.ts). */
export const CHAMBER_VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  ...REPOLARIZATION_VARIANT_CRITERIA,
  ...STRUCTURAL_VARIANT_CRITERIA,
  rvh: {
    strain: [crit('RVH with secondary ST–T: ST↓ (J+60 ≤ −0.05 mV) and T↓ (≤ −0.3 mV) in V1 and V2', 'rv-systolic-overload', (c) => [(['V1', 'V2'] as const).every((l) => f(c, l).st60 <= -0.05 && f(c, l).tMin <= -0.3), (['V1', 'V2'] as const).map((l) => `${l} ST60 ${fmt(f(c, l).st60)} T ${fmt(f(c, l).tMin)}`).join(' ')])],
  },
  'low-voltage': {
    emphysema: [crit('emphysema: vertical axes (QRS and P ≥ +75°) with a P ≥ 0.12 mV in II', 'RVH in COPD/emphysema (tall P with vertical P axis, rightward QRS axis)', (c) => [c.m.axisDeg >= 75 && (c.m.pAxisDeg ?? 0) >= 75 && (pWave(c, 'II')?.pos ?? 0) >= 0.12, `axis ${fmt(c.m.axisDeg, 0)} P axis ${fmt(c.m.pAxisDeg, 0)}; ${pStr(c, 'II')}`])],
  },
};

/**
 * Hallmark criteria, group 'ischemia' (DECISION §9.7). Thresholds: criteria.md rows named in each `source`; the STEMI
 * thresholds are the UDMI-4 / ESC 2023 limits of criteria.md (rate-rhythm-intervals-axis, "Normal ST elevation":
 * V2–V3 ≥ 2 mm in men ≥ 40 y, ≥ 2.5 mm in men < 40 y, ≥ 1.5 mm in women; other leads ≥ 1 mm).
 *
 * The hallmarks of a scenario hold for every variant of it (criteria.test.ts); what pins a variant (a stage, a
 * culprit) is in ISCHEMIA_VARIANT_CRITERIA.
 */
import type { StdLead } from '../../../../src/core/leads';
import { crit, f, fmt, rOf, stJ, type Criterion, type CriterionCtx, type ScenarioCriteria } from './types';

/** sex / age-specific V2–V3 STEMI threshold (mV) */
export function v2v3Threshold(c: CriterionCtx): number {
  const p = c.def.patient;
  if (p?.sex === 'female') return 0.15;
  return (p?.ageY ?? 50) < 40 ? 0.25 : 0.2;
}
const jList = (c: CriterionCtx, ls: readonly StdLead[]): string => ls.map((l) => `${l} ${fmt(stJ(c, l))}`).join(' ');
const tList = (c: CriterionCtx, ls: readonly StdLead[]): string => ls.map((l) => `${l} ${fmt(f(c, l).tMin)}/${fmt(f(c, l).tMax)}`).join(' ');
const LIMBS: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const ALL: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const V1V3: readonly StdLead[] = ['V1', 'V2', 'V3'];
const V1V4: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4'];
const V2V4: readonly StdLead[] = ['V2', 'V3', 'V4'];
const INF: readonly StdLead[] = ['II', 'III', 'aVF'];
const count = (ls: readonly StdLead[], p: (l: StdLead) => boolean): number => ls.filter(p).length;
/** QRS amplitude (largest of R and |S| or |Q|) of the representative beat */
const qrsAmp = (c: CriterionCtx, l: StdLead): number => Math.max(rOf(c, l), -f(c, l).s, -f(c, l).q);
/** T / QRS amplitude ratio (largest positive T over the QRS amplitude) */
const tqr = (c: CriterionCtx, l: StdLead): number => f(c, l).tMax / Math.max(1e-6, qrsAmp(c, l));
/** pathological Q (criteria.md pathological-q): QS, or Q ≥ 30 ms and ≥ 0.1 mV; in V2–V3 any Q ≥ 20 ms */
const pathQ = (c: CriterionCtx, l: StdLead): boolean => {
  const x = f(c, l);
  // QS (or a QS-like complex with an initial r < 0.05 mV)
  const qs = rOf(c, l) < 0.05 && (x.q < -0.1 || x.s < -0.1);
  if (l === 'V2' || l === 'V3') return qs || (x.q < -0.05 && x.qDur >= 20);
  return qs || (x.q <= -0.1 && x.qDur >= 30);
};
const qList = (c: CriterionCtx, ls: readonly StdLead[]): string => ls.map((l) => `${l} q ${fmt(f(c, l).q)} (${fmt(f(c, l).qDur, 0)} ms) R ${fmt(rOf(c, l))}`).join('; ');

/** Sgarbossa (and Smith-modified Sgarbossa) for a QRS ≥ 120 ms LBBB baseline (criteria.md pacing / LBBB MI rows). */
export const sgarbossaParts = (c: CriterionCtx): { concordantUp: StdLead[]; concordantDown: StdLead[]; smith: StdLead[] } => ({
  concordantUp: ALL.filter((l) => f(c, l).net > 0.1 && stJ(c, l) >= 0.1),
  concordantDown: V1V3.filter((l) => stJ(c, l) <= -0.1),
  smith: ALL.filter((l) => f(c, l).net < -0.1 && stJ(c, l) >= 0.1 && f(c, l).s < 0 && stJ(c, l) / f(c, l).s <= -0.25),
});

const NO_ST_SEGMENT = { 'st-segment': 'injury current: the ST is displaced, not isoelectric', 't-asymmetry': 'ST-T merged by the injury current' } as const;

const INFERIOR_STE = crit('J-point ST↑ ≥ 0.1 mV in II, III, aVF', 'injury-st; mi-territories', (c) => [INF.every((l) => stJ(c, l) >= 0.1), jList(c, INF)]);
const AVL_RECIPROCAL = crit('reciprocal ST↓ in aVL', 'reciprocal-changes', (c) => [stJ(c, 'aVL') <= -0.05, jList(c, ['aVL'])]);

export const ISCHEMIA_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  // ── acute occlusion by territory ────────────────────────────────────────────────────────────────────────────
  'stemi-anterior': {
    hallmarks: [
      crit('J-point ST↑ ≥ the sex/age threshold in V2 and V3', 'injury-st; UDMI-4 (criteria.md "Normal ST elevation")', (c) => {
        const th = v2v3Threshold(c);
        return [stJ(c, 'V2') >= th && stJ(c, 'V3') >= th, `threshold ${th}: ${jList(c, ['V2', 'V3'])}`];
      }),
      crit('J-point ST↑ ≥ 0.1 mV in V1 and V4', 'injury-st; mi-territories', (c) => [stJ(c, 'V1') >= 0.1 && stJ(c, 'V4') >= 0.1, jList(c, ['V1', 'V4'])]),
      crit('proximal LAD: ST↑ ≥ 0.05 mV in aVL, lead I not depressed', 'mi-territories; DECISION §9.7', (c) => [stJ(c, 'aVL') >= 0.05 && stJ(c, 'I') >= 0, jList(c, ['I', 'aVL'])]),
      crit('reciprocal ST↓ in III and aVF', 'reciprocal-changes', (c) => [stJ(c, 'III') <= -0.05 && stJ(c, 'aVF') <= -0.03, jList(c, ['III', 'aVF'])]),
      crit('QRS < 110 ms (no conduction defect)', 'DECISION §9.7', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('hyperacute T not oversized: T ≤ 1.0 mV in V2–V4 (judges: 0.6–0.9 mV)', 'ischaemia-t; DECISION §12.2 (anterior STEMI)', (c) => {
        const bad = V2V4.filter((l) => f(c, l).t > 1.0);
        return [bad.length === 0, bad.map((l) => `${l} T ${fmt(f(c, l).t)}`).join(' ')];
      }),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'stemi-anterior-subtle': {
    hallmarks: [
      crit('ST↑ in V2–V3 below the sex/age STEMI threshold, but ≥ 0.05 mV in V2 or V3', 'injury-st; UDMI-4 thresholds not met', (c) => {
        const th = v2v3Threshold(c);
        const mx = Math.max(stJ(c, 'V2'), stJ(c, 'V3'));
        return [mx >= 0.05 && mx < th, `threshold ${th}: ${jList(c, ['V2', 'V3'])}`];
      }),
      crit('disproportionate, bulky T: T / QRS ≥ 1.0 in V2 and V3', 'ischaemia-t (hyperacute T); proportionality vs early repolarisation', (c) => [tqr(c, 'V2') >= 1.0 && tqr(c, 'V3') >= 1.0, V2V4.map((l) => `${l} ${fmt(tqr(c, l))}`).join(' ')]),
      crit('reciprocal ST↓ (J+60) in III', 'reciprocal-changes', (c) => [f(c, 'III').st60 <= -0.03, `III ST60 ${fmt(f(c, 'III').st60)}`]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'stemi-anteroseptal': {
    hallmarks: [
      crit('J-point ST↑ ≥ the sex/age threshold in V2 and ≥ 0.1 mV in V1 and V3', 'injury-st; mi-territories (anteroseptal V1–V4)', (c) => [stJ(c, 'V2') >= v2v3Threshold(c) && stJ(c, 'V1') >= 0.1 && stJ(c, 'V3') >= 0.1, `threshold ${v2v3Threshold(c)}: ${jList(c, V1V4)}`]),
      crit('no ST↑ ≥ 0.1 mV in I, aVL, V5, V6 (not proximal / lateral)', 'mi-territories', (c) => [(['I', 'aVL', 'V5', 'V6'] as const).every((l) => stJ(c, l) < 0.1), jList(c, ['I', 'aVL', 'V5', 'V6'])]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'stemi-anterolateral': {
    hallmarks: [
      crit('J-point ST↑ ≥ 0.1 mV in ≥ 3 of V3–V6', 'injury-st; mi-territories', (c) => [count(['V3', 'V4', 'V5', 'V6'], (l) => stJ(c, l) >= 0.1) >= 3, jList(c, ['V3', 'V4', 'V5', 'V6'])]),
      crit('J-point ST↑ ≥ 0.1 mV in I and aVL', 'mi-territories (lateral)', (c) => [stJ(c, 'I') >= 0.1 && stJ(c, 'aVL') >= 0.1, jList(c, ['I', 'aVL'])]),
      crit('reciprocal ST↓ in III', 'reciprocal-changes', (c) => [stJ(c, 'III') <= -0.05, jList(c, ['III'])]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'stemi-high-lateral': {
    hallmarks: [
      // first-diagonal occlusion ("South African flag", Littmann 2016): ST↑ I, aVL and V2; ST↓ III and aVF
      // over the whole st dial (aVL 0.15–0.28 mV); at the default dial I, aVL and V2 are ≥ 0.1 mV (exemplars B14)
      crit('J-point ST↑ ≥ 0.1 mV in aVL and ≥ 0.06 mV in I', 'injury-st; mi-territories (high lateral)', (c) => [stJ(c, 'aVL') >= 0.1 && stJ(c, 'I') >= 0.06, jList(c, ['I', 'aVL'])]),
      crit('D1 pattern: ST↑ ≥ 0.05 mV in V2, the precordial maximum (V1 within 0.02 mV), V3 lower and V4 < 0.1 mV', 'mi-territories (first diagonal: I, aVL, V2; V3–V4 spared)', (c) => {
        const ch = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
        const v2 = stJ(c, 'V2');
        return [v2 >= 0.05 && ch.every((l) => stJ(c, l) <= v2 + 0.02) && stJ(c, 'V3') < v2 && stJ(c, 'V4') < 0.1, jList(c, ch)];
      }),
      crit('reciprocal ST↓ ≥ 0.1 mV in III, deeper than in aVF', 'reciprocal-changes', (c) => [stJ(c, 'III') <= -0.1 && stJ(c, 'III') < stJ(c, 'aVF'), jList(c, ['III', 'aVF'])]),
      crit('no inferior ST↑ (II < 0.05 mV)', 'mi-territories', (c) => [stJ(c, 'II') < 0.05, jList(c, ['II'])]),
      crit('lateral precordial leads below the STEMI limit (V5, V6 < 0.1 mV)', 'mi-territories (high lateral, not LCx)', (c) => [stJ(c, 'V5') < 0.1 && stJ(c, 'V6') < 0.1, jList(c, ['V5', 'V6'])]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'stemi-lateral': {
    hallmarks: [
      crit('J-point ST↑ ≥ 0.1 mV in V5 and V6', 'injury-st; mi-territories (lateral)', (c) => [stJ(c, 'V5') >= 0.1 && stJ(c, 'V6') >= 0.1, jList(c, ['V5', 'V6'])]),
      crit('ST↑ ≥ 0.07 mV in I and aVL (≈ 1 mm at the default ST)', 'mi-territories (lateral: I, aVL, V5, V6)', (c) => [stJ(c, 'I') >= 0.07 && stJ(c, 'aVL') >= 0.07, jList(c, ['I', 'aVL'])]),
      crit('inferior reciprocal ST↓ (III ≤ −0.05 mV, aVF ≤ −0.03 mV)', 'reciprocal-changes', (c) => [stJ(c, 'III') <= -0.05 && stJ(c, 'aVF') <= -0.03, jList(c, ['III', 'aVF'])]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'stemi-inferior': {
    hallmarks: [
      INFERIOR_STE,
      AVL_RECIPROCAL,
      crit('culprit pattern: RCA (III > II, aVL the deepest limb-lead ST↓) or LCx (II ≥ III with ST↑ in V5–V6)', 'rca-vs-cx', (c) => {
        const mn = Math.min(...LIMBS.map((l) => stJ(c, l)));
        const rca = stJ(c, 'III') > stJ(c, 'II') + 0.02 && stJ(c, 'aVL') === mn;
        const lcx = stJ(c, 'II') >= stJ(c, 'III') && stJ(c, 'V6') >= 0.05;
        return [rca || lcx, jList(c, [...LIMBS, 'V6'])];
      }),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'rv-infarction': {
    hallmarks: [
      INFERIOR_STE,
      AVL_RECIPROCAL,
      crit('ST↑ in V1 (≥ 0.05 mV), more than in V2', 'rv-infarction (V1 accompanies V4R)', (c) => [stJ(c, 'V1') >= 0.05 && stJ(c, 'V1') > stJ(c, 'V2'), jList(c, ['V1', 'V2'])]),
      crit('RCA: ST↑ III > II', 'rca-vs-cx', (c) => [stJ(c, 'III') > stJ(c, 'II'), jList(c, ['II', 'III'])]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'stemi-posterior': {
    hallmarks: [
      crit('horizontal ST↓ ≥ 0.05 mV (J and J+60) in ≥ 2 of V1–V3', 'posterior-mi', (c) => [count(V1V3, (l) => stJ(c, l) <= -0.05 && f(c, l).st60 <= -0.04) >= 2, `${jList(c, V1V3)}; ST60 ${V1V3.map((l) => fmt(f(c, l).st60)).join(' ')}`]),
      crit('the precordial ST↓ is in V1–V3, not in V4–V6', 'posterior-mi (mirror of V7–V9)', (c) => [Math.min(...V1V3.map((l) => stJ(c, l))) < Math.min(...(['V4', 'V5', 'V6'] as const).map((l) => stJ(c, l))), jList(c, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'])]),
      crit('upright terminal T in V2 or V3', 'posterior-mi', (c) => [f(c, 'V2').tMax >= 0.05 || f(c, 'V3').tMax >= 0.05, tList(c, ['V2', 'V3'])]),
      crit('the mirror T is upright: T peak ≥ 0.1 mV in V1, and in V2–V3 above the depth of the ST depression', 'posterior-mi (horizontal ST↓ with upright T in V1–V3)', (c) => [f(c, 'V1').tMax >= 0.1 && (['V2', 'V3'] as const).every((l) => f(c, l).tMax >= -f(c, l).tMin), tList(c, V1V3)]),
      crit('no inferior STEMI (II, III, aVF < 0.1 mV)', 'mi-territories', (c) => [INF.every((l) => stJ(c, l) < 0.1), jList(c, INF)]),
      crit('the mirror ends upright: terminal T ≥ 0.1 mV in V2', 'posterior-mi (upright terminal T)', (c) => [f(c, 'V2').tMax >= 0.1, tList(c, ['V1', 'V2', 'V3'])]),
    ],
    optOut: { ...NO_ST_SEGMENT, 'qt-dispersion': 'regional repolarisation of the posterior wall (the upright mirror T)' },
  },
  // ── STEMI equivalents and non-occlusion patterns ───────────────────────────────────────────────────────────
  'hyperacute-t': {
    hallmarks: [
      crit('broad, bulky T: T / QRS > 0.75 in ≥ 2 of V2–V4', 'ischaemia-t (hyperacute T)', (c) => [count(V2V4, (l) => tqr(c, l) > 0.75) >= 2, V2V4.map((l) => `${l} ${fmt(tqr(c, l))}`).join(' ')]),
      crit('ST↑ < 0.1 mV in V1–V4 (before the ST elevation)', 'mi-time-course', (c) => [V1V4.every((l) => stJ(c, l) < 0.1), jList(c, V1V4)]),
      crit('T ≥ 0.5 mV in V2–V4', 'ischaemia-t', (c) => [V2V4.every((l) => f(c, l).tMax >= 0.5), tList(c, V2V4)]),
    ],
    optOut: { 't-asymmetry': 'hyperacute T is broad and more symmetric' },
  },
  'de-winter': {
    hallmarks: [
      crit('J-point ST↓ 0.1–0.35 mV in ≥ 3 of V2–V5', 'ischaemia-t (de Winter); DECISION §9.7', (c) => [count(['V2', 'V3', 'V4', 'V5'], (l) => stJ(c, l) <= -0.1 && stJ(c, l) >= -0.35) >= 3, jList(c, ['V2', 'V3', 'V4', 'V5'])]),
      crit('upsloping ST into a tall T (J+60 above J; T ≥ 0.4 mV in ≥ 2 of V2–V4)', 'de Winter', (c) => [count(['V3', 'V4'], (l) => f(c, l).st60 > stJ(c, l)) >= 1 && count(V2V4, (l) => f(c, l).tMax >= 0.4) >= 2, `${jList(c, V2V4)}; ST60 ${V2V4.map((l) => fmt(f(c, l).st60)).join(' ')}; ${tList(c, V2V4)}`]),
      crit('ST↑ ≥ 0.05 mV in aVR', 'de Winter; diffuse-st-depression-avr', (c) => [stJ(c, 'aVR') >= 0.05, jList(c, ['aVR'])]),
      crit('no precordial ST↑ ≥ 0.1 mV', 'de Winter (no STEMI criteria)', (c) => [(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).every((l) => stJ(c, l) < 0.1), jList(c, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'])]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  wellens: {
    hallmarks: [
      crit('T inversion (terminal or complete) ≥ 0.1 mV in V2 or V3', 'ischaemia-t (Wellens)', (c) => [f(c, 'V2').tMin <= -0.1 || f(c, 'V3').tMin <= -0.1, tList(c, ['V2', 'V3'])]),
      crit('no ST elevation ≥ 0.1 mV in V1–V4', 'ischaemia-t (Wellens: no STEMI criteria)', (c) => [V1V4.every((l) => stJ(c, l) < 0.1), jList(c, V1V4)]),
      crit('R preserved and no pathological Q in V2–V3', 'ischaemia-t (Wellens: no infarction)', (c) => [(['V2', 'V3'] as const).every((l) => !pathQ(c, l) && rOf(c, l) >= 0.15), qList(c, ['V2', 'V3'])]),
    ],
    optOut: { 't-asymmetry': 'inverted / biphasic precordial T', 'qt-dispersion': 'regional repolarisation delay of the LAD territory' },
  },
  'avr-elevation-diffuse-std': {
    hallmarks: [
      crit('ST↓ ≥ 0.1 mV in ≥ 6 leads', 'diffuse-st-depression-avr', (c) => [count(ALL, (l) => stJ(c, l) <= -0.1) >= 6, jList(c, ALL)]),
      // (the subendocardial injury current is fully developed by J+60: read the elevation there, as for ST depression)
      crit('ST↑ ≥ 0.1 mV in aVR (or V1), at J or J+60', 'diffuse-st-depression-avr', (c) => [(['aVR', 'V1'] as const).some((l) => Math.max(stJ(c, l), f(c, l).st60) >= 0.1), `${jList(c, ['aVR', 'V1'])}; ST60 aVR ${fmt(f(c, 'aVR').st60)} V1 ${fmt(f(c, 'V1').st60)}`]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  'st-depression-ischemic': {
    hallmarks: [
      crit('horizontal or downsloping ST↓ ≥ 0.05 mV in ≥ 2 contiguous leads', 'non-q-mi; injury-st', (c) => {
        const dep = (l: StdLead): boolean => stJ(c, l) <= -0.05 && f(c, l).st60 <= stJ(c, l) + 0.02;
        const pairs: readonly (readonly [StdLead, StdLead])[] = [['I', 'aVL'], ['II', 'aVF'], ['III', 'aVF'], ['V3', 'V4'], ['V4', 'V5'], ['V5', 'V6']];
        return [pairs.some(([a, b]) => dep(a) && dep(b)), `${jList(c, ALL)}`];
      }),
      crit('no ST↑ ≥ 0.1 mV except aVR', 'injury-st (subendocardial)', (c) => [ALL.filter((l) => l !== 'aVR').every((l) => stJ(c, l) < 0.1), jList(c, ALL)]),
    ],
    optOut: NO_ST_SEGMENT,
  },
  't-inversion-ischemic': {
    hallmarks: [
      crit('T↓ ≥ 0.1 mV in ≥ 2 contiguous leads with a prominent R (R/S > 1)', 'ischaemia-t', (c) => {
        const inv = (l: StdLead): boolean => f(c, l).tMin <= -0.1 && f(c, l).t < 0 && rOf(c, l) > -f(c, l).s;
        const pairs: readonly (readonly [StdLead, StdLead])[] = [['I', 'aVL'], ['II', 'aVF'], ['V4', 'V5'], ['V5', 'V6']];
        return [pairs.some(([a, b]) => inv(a) && inv(b)), tList(c, ['I', 'aVL', 'II', 'aVF', 'V4', 'V5', 'V6'])];
      }),
      crit('ST within ±0.05 mV', 'ischaemia-t (no injury)', (c) => [ALL.every((l) => Math.abs(stJ(c, l)) <= 0.05), jList(c, ALL)]),
    ],
    optOut: { 't-asymmetry': 'inverted lateral T', 'qt-dispersion': 'regional repolarisation delay of the ischaemic wall' },
  },
  // ── course, old MI, aneurysm ───────────────────────────────────────────────────────────────────────────────
  'stemi-evolution': {
    // every stage shows the anterior wall: ST elevation, Q waves or a bulky T (the stage itself is pinned per variant)
    hallmarks: [
      crit('anterior involvement: ST↑ ≥ 0.1 mV in V2–V3, pathological Q in ≥ 2 of V1–V3, or T / QRS > 0.75 in V2–V4', 'mi-time-course; mi-territories', (c) => {
        const st = stJ(c, 'V2') >= 0.1 && stJ(c, 'V3') >= 0.1;
        const q = count(V1V3, (l) => pathQ(c, l)) >= 2;
        const t = count(V2V4, (l) => tqr(c, l) > 0.75) >= 1;
        return [st || q || t, `${jList(c, V1V3)}; ${qList(c, V1V3)}`];
      }),
    ],
    optOut: { ...NO_ST_SEGMENT, 'qt-dispersion': 'regional repolarisation of the infarct' },
  },
  'old-mi': {
    hallmarks: [
      crit('pathological Q (QS, or ≥ 30 ms and ≥ 0.1 mV) in ≥ 2 contiguous leads of one group', 'pathological-q', (c) => {
        const groups: readonly (readonly StdLead[])[] = [['V1', 'V2', 'V3', 'V4'], ['II', 'III', 'aVF'], ['I', 'aVL', 'V5', 'V6']];
        return [groups.some((g) => count(g, (l) => pathQ(c, l)) >= 2), qList(c, ALL)];
      }),
      crit('ST within ±0.05 mV (no acute injury)', 'mi-time-course (old)', (c) => [ALL.every((l) => Math.abs(stJ(c, l)) <= 0.05), jList(c, ALL)]),
    ],
    optOut: { 'no-spikes': 'fragmented QRS of the scar (variant)' },
  },
  'lv-aneurysm': {
    hallmarks: [
      crit('QS in ≥ 2 of V1–V4', 'pathological-q (anterior)', (c) => [count(V1V4, (l) => f(c, l).q < -0.1 && rOf(c, l) < 0.05) >= 2, qList(c, V1V4)]),
      crit('persistent ST↑ 0.1–0.3 mV in ≥ 2 of V1–V4', 'lv-aneurysm (persistent ST elevation)', (c) => [count(V1V4, (l) => stJ(c, l) >= 0.1 && stJ(c, l) <= 0.3) >= 2, jList(c, V1V4)]),
      crit('small T relative to the QRS: T / QRS ≤ 0.36 in every lead V1–V4 (aneurysm, not acute anterior STEMI)', 'lv-aneurysm; LV aneurysm vs acute STEMI — T/QRS amplitude ratio (Klein 2015)', (c) => {
        const r = V1V4.map((l) => Math.max(0, f(c, l).tMax) / Math.max(1e-6, qrsAmp(c, l)));
        return [r.every((x) => x <= 0.36), V1V4.map((l, i) => `${l} ${fmt(r[i])}`).join(' ')];
      }),
    ],
    optOut: NO_ST_SEGMENT,
  },
  // ── MI in LBBB ─────────────────────────────────────────────────────────────────────────────────────────────
  sgarbossa: {
    hallmarks: [
      crit('LBBB baseline: QRS ≥ 120 ms, QS / rS in V1', 'lbbb-complete', (c) => [c.m.qrsMs >= 120 && f(c, 'V1').s < -0.5 && rOf(c, 'V1') < 0.3, `QRS ${fmt(c.m.qrsMs, 0)} V1 r ${fmt(rOf(c, 'V1'))} S ${fmt(f(c, 'V1').s)}`]),
      crit('Sgarbossa / Smith positive: concordant ST↑ ≥ 0.1 mV, concordant ST↓ ≥ 0.1 mV in V1–V3, or ST/S ≤ −0.25', 'Sgarbossa 1996; Smith-modified Sgarbossa 2012 (criteria.md: LBBB / paced MI)', (c) => {
        const p = sgarbossaParts(c);
        return [p.concordantUp.length + p.concordantDown.length + p.smith.length > 0, `up ${p.concordantUp.join(',')} down ${p.concordantDown.join(',')} smith ${p.smith.join(',')}; ${jList(c, ALL)}`];
      }),
    ],
    optOut: { ...NO_ST_SEGMENT, 'qt-dispersion': 'regional injury on a bundle-branch-block repolarisation' },
  },
  takotsubo: {
    hallmarks: [
      crit('apical pattern: ST↑ ≥ 0.1 mV in ≥ 3 of V2–V5 and II, or T↓ in ≥ 2 of V4–V6 with QTc_F > 470 ms', 'takotsubo (DECISION §9.7)', (c) => {
        const acute = count(['V2', 'V3', 'V4', 'V5'], (l) => stJ(c, l) >= 0.1) >= 3 && stJ(c, 'II') >= 0.05;
        const qtc = c.m.qtMs === null ? 0 : c.m.qtMs / Math.cbrt(60 / c.m.hrBpm);
        const late = count(['V4', 'V5', 'V6'], (l) => f(c, l).tMin <= -0.1 && f(c, l).t < 0) >= 2 && qtc > 470;
        return [acute || late, `${jList(c, ['II', 'V2', 'V3', 'V4', 'V5'])}; ${tList(c, ['V4', 'V5', 'V6'])}; QTcF ${fmt(qtc, 0)}`];
      }),
      crit('no reciprocal ST↓ ≤ −0.1 mV except aVR and V1', 'takotsubo (diffuse, non-territorial)', (c) => [ALL.filter((l) => l !== 'aVR' && l !== 'V1').every((l) => stJ(c, l) > -0.1), jList(c, ALL)]),
    ],
    optOut: { ...NO_ST_SEGMENT, 'qt-dispersion': 'apical repolarisation delay (late stage)' },
  },
};

/** Variant additions (merged by criteria/index.ts). */
export const ISCHEMIA_VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  'stemi-inferior': {
    lcx: [crit('LCx: II ≥ III and ST↑ ≥ 0.05 mV in V5–V6', 'rca-vs-cx', (c) => [stJ(c, 'II') >= stJ(c, 'III') && stJ(c, 'V5') >= 0.05 && stJ(c, 'V6') >= 0.05, jList(c, ['II', 'III', 'V5', 'V6'])])],
    posterior: [crit('posterior extension: ST↓ ≥ 0.05 mV in ≥ 2 of V1–V3', 'posterior-mi', (c) => [count(V1V3, (l) => stJ(c, l) <= -0.05) >= 2, jList(c, V1V3)])],
  },
  'stemi-posterior': {
    isolated: [
      crit('isolated posterior: ST↓ ≥ 0.1 mV (J) in V1–V3, the deepest in V1–V4', 'posterior-mi (isolated ST depression V1–V3)', (c) => [V1V3.every((l) => stJ(c, l) <= -0.1) && Math.min(...V1V4.map((l) => stJ(c, l))) <= Math.min(...(['V5', 'V6'] as const).map((l) => stJ(c, l))), jList(c, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'])]),
      crit('lateral leads flat: |ST| ≤ 0.06 mV in I, aVL, V5 and < 0.1 mV in V6', 'posterior-mi (isolated, not posterolateral)', (c) => [(['I', 'aVL', 'V5'] as const).every((l) => Math.abs(stJ(c, l)) <= 0.06) && Math.abs(stJ(c, 'V6')) < 0.1, jList(c, ['I', 'aVL', 'V5', 'V6'])]),
      crit('upright T in V1–V3: T peak ≥ 0.1 mV, and in V2–V3 above the depth of the ST depression', 'posterior-mi (upright terminal T)', (c) => [V1V3.every((l) => f(c, l).tMax >= 0.1) && (['V2', 'V3'] as const).every((l) => f(c, l).tMax >= -f(c, l).tMin), tList(c, V1V3)]),
    ],
    evolved: [crit('posterior "Q-wave equivalent": R/S ≥ 1 in V2 (R ≥ 0.3 mV) with an upright T', 'posterior-mi (old); pathological-q', (c) => [rOf(c, 'V2') >= 0.3 && rOf(c, 'V2') >= -f(c, 'V2').s && f(c, 'V2').tMax > 0.05, `V2 R ${fmt(rOf(c, 'V2'))} S ${fmt(f(c, 'V2').s)} ${tList(c, ['V2'])}`])],
  },
  wellens: {
    b: [crit('type B: deep symmetric T↓ ≥ 0.5 mV in V2 and V3 with no upright part (T max < 0.1 mV)', 'ischaemia-t (Wellens B)', (c) => [(['V2', 'V3'] as const).every((l) => f(c, l).tMin <= -0.5 && f(c, l).tMax < 0.1), tList(c, ['V2', 'V3'])])],
  },
  'avr-elevation-diffuse-std': {
    'left-main': [crit('left main: ST↑ in aVR ≥ V1, both ≥ 0.05 mV', 'diffuse-st-depression-avr', (c) => [stJ(c, 'aVR') >= stJ(c, 'V1') && stJ(c, 'V1') >= 0.05, jList(c, ['aVR', 'V1'])])],
  },
  'stemi-evolution': {
    hyperacute: [crit('hyperacute: ST↑ < 0.1 mV and T ≥ 0.5 mV in V2–V4', 'mi-time-course (minutes)', (c) => [V2V4.every((l) => stJ(c, l) < 0.1 && f(c, l).tMax >= 0.5), `${jList(c, V2V4)}; ${tList(c, V2V4)}`])],
    evolving: [
      crit('evolving: pathological Q in ≥ 2 of V1–V3 with residual ST↑ ≥ 0.05 mV in V2', 'mi-time-course (hours to days)', (c) => [count(V1V3, (l) => pathQ(c, l)) >= 2 && stJ(c, 'V2') >= 0.05, `${qList(c, V1V3)}; ${jList(c, ['V2'])}`]),
      crit('T inversion beginning in V1–V2 (≤ −0.1 mV)', 'mi-time-course', (c) => [f(c, 'V1').tMin <= -0.1 && f(c, 'V2').tMin <= -0.1, tList(c, ['V1', 'V2'])]),
    ],
    old: [crit('old: pathological Q in ≥ 2 of V1–V3 and |ST| < 0.05 mV in V1–V4', 'mi-time-course (weeks to months)', (c) => [count(V1V3, (l) => pathQ(c, l)) >= 2 && V1V4.every((l) => Math.abs(stJ(c, l)) < 0.05), `${qList(c, V1V3)}; ${jList(c, V1V4)}`])],
  },
  'old-mi': {
    inferior: [crit('inferior Q waves in III and aVF', 'pathological-q (II, III, aVF)', (c) => [pathQ(c, 'III') && pathQ(c, 'aVF'), qList(c, INF)])],
    lateral: [crit('lateral Q waves in two of I, aVL, V5, V6', 'pathological-q (I, aVL, V5–V6)', (c) => [count(['I', 'aVL', 'V5', 'V6'], (l) => pathQ(c, l)) >= 2, qList(c, ['I', 'aVL', 'V5', 'V6'])])],
    fragmented: [crit('fragmented QRS: ≥ 1 extra notch in ≥ 2 of V1–V4', 'DECISION §11 (fragmentation)', (c) => [count(V1V4, (l) => f(c, l).notches >= 1) >= 2, V1V4.map((l) => `${l} ${f(c, l).notches}`).join(' ')])],
  },
  sgarbossa: {
    'concordant-depression': [
      crit('concordant ST↓ ≥ 0.1 mV in V1–V3', 'Sgarbossa criterion 2', (c) => [sgarbossaParts(c).concordantDown.length > 0, jList(c, V1V3)]),
      crit('isolated criterion 2: no concordant ST↑ ≥ 0.1 mV anywhere', 'Sgarbossa criterion 1 negative', (c) => [sgarbossaParts(c).concordantUp.length === 0, `up ${sgarbossaParts(c).concordantUp.join(',')}; ${jList(c, ALL)}`]),
    ],
    smith: [
      crit('excessive discordance: ST/S ≤ −0.25 with ST ≥ 0.1 mV in V2 and V3', 'Smith-modified Sgarbossa', (c) => [(['V2', 'V3'] as const).every((l) => sgarbossaParts(c).smith.includes(l)), V1V4.map((l) => `${l} ST ${fmt(stJ(c, l))} S ${fmt(f(c, l).s)}`).join(' ')]),
      crit('Smith only: no concordant ST↑ and no concordant ST↓ in V1–V3 (original criteria 1–2 negative)', 'Sgarbossa 1996 (criteria 1–2); Smith 2012', (c) => {
        const p = sgarbossaParts(c);
        return [p.concordantUp.length === 0 && p.concordantDown.length === 0, `up ${p.concordantUp.join(',')} down ${p.concordantDown.join(',')}; ${jList(c, ALL)}`];
      }),
    ],
  },
  takotsubo: {
    late: [crit('late: deep (≥ 0.5 mV), widespread T↓ (V3–V6 and I, II) and QTc_F > 470 ms', 'takotsubo', (c) => {
      const qtc = c.m.qtMs === null ? 0 : c.m.qtMs / Math.cbrt(60 / c.m.hrBpm);
      const ls = ['V3', 'V4', 'V5', 'V6', 'I', 'II'] as const;
      return [count(['V4', 'V5'], (l) => f(c, l).tMin <= -0.5) === 2 && ls.every((l) => f(c, l).tMin <= -0.2) && qtc > 470, `${tList(c, ls)} QTcF ${fmt(qtc, 0)}`];
    })],
  },
};

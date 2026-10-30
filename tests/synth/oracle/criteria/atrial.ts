/**
 * Hallmark criteria, group 'atrial' (DECISION §9.2; synth-rhythm M3). Every criterion reads the oracle's measurement and
 * the delivered signal only, through the rhythm readers of tests/synth/rhythm/readers.ts (complexes, P waves of the
 * QRST-subtracted residual, RR / PP / PR sequences, shape groups). Thresholds: the criteria.md rows named in `source`
 * (current values). Hallmarks that differ by variant switch on `c.variant`.
 */
import type { StdLead } from '../../../../src/core/leads';
import {
  beatsMs, beatWidth, extremumIn, f0, f2, median, pPeaks, pPolarity, pShapeCount, qrsCorr, rrList, type RBeat,
} from '../../rhythm/readers';
import { atrialResidual, windowP2p } from './svt';
import { crit, f, fmt, mm, type CriterionCtx, type ScenarioCriteria } from './types';

// ── shared rhythm helpers (also used by the other rhythm groups) ─────────────────────────────────────────────────
/** Median RR of the strip (ms). */
export const cycle = (c: CriterionCtx): number => median(rrList(c));
/** P peaks of the residual away from the strip edges (the first complex has no template before it): from 400 ms. */
const inner = (c: CriterionCtx): number[] => pPeaks(c).filter((p) => p >= 400 && p <= (c.leads.I.length * 1000) / c.fs - 100);
/** P peaks with a visible deflection (≥ 0.04 mV in II or V1), in time order. */
export function realP(c: CriterionCtx, min = 0.04): number[] {
  return inner(c).filter((p) => Math.abs(pPolarity(c, 'II', p)) >= min || Math.abs(pPolarity(c, 'V1', p)) >= min);
}
/** P waves found before the complexes (the oracle's P onset after the previous T end), as peak times ≈ onset + 45 ms. */
export const conductedP = (c: CriterionCtx): number[] => beatsMs(c).filter((b) => b.pOn !== null).map((b) => (b.pOn as number) + 45);
/** P peaks upright in II (sinus P). */
export const uprightP = (c: CriterionCtx): number[] => inner(c).filter((p) => pPolarity(c, 'II', p) >= 0.05);
/** P–P intervals of a peak list (ms). */
export const ppOf = (ps: readonly number[]): number[] => ps.slice(1).map((p, i) => p - ps[i]);
/** Premature complexes: RR before < frac × the median RR. */
export const premature = (c: CriterionCtx, frac = 0.85): RBeat[] => {
  const cyc = cycle(c);
  return beatsMs(c).filter((b) => b.rrPre !== null && b.rrPre < frac * cyc);
};
/** The complexes that are not premature (the dominant rhythm). */
export const regularBeats = (c: CriterionCtx, frac = 0.85): RBeat[] => {
  const cyc = cycle(c);
  return beatsMs(c).filter((b) => b.rrPre === null || b.rrPre >= frac * cyc);
};
/** Median own width of a set of complexes (ms). */
export const widthOf = (c: CriterionCtx, bs: readonly RBeat[]): number => median(bs.map((b) => beatWidth(c, b)));
/** The P peak that precedes a complex within `win` ms (the one closest to it), or null. */
export const pBefore = (ps: readonly number[], b: RBeat, win = 320): number | null => {
  const cand = ps.filter((p) => p < b.on - 40 && p > b.on - win);
  return cand.length ? cand[cand.length - 1] : null;
};
/** A complex like the dominant ones: own width within 15 ms and QRS correlation ≥ 0.9 with a regular complex. */
export function likeDominant(c: CriterionCtx, b: RBeat): boolean {
  const reg = regularBeats(c).filter((x) => x !== b);
  if (!reg.length) return false;
  const ref = reg[reg.length >> 1];
  return Math.abs(beatWidth(c, b) - widthOf(c, reg)) <= 15 && qrsCorr(c, ref, b) >= 0.9;
}
/** Local maxima of the median beat of a lead in a window (ms after the representative QRS onset), prominence ≥ p. */
export function humps(c: CriterionCtx, l: StdLead, a: number, z: number, p = 0.015): number {
  const x = c.m.median[l];
  const i0 = Math.max(1, c.m.medianOn + Math.round((a * c.fs) / 1000)), i1 = Math.min(x.length - 2, c.m.medianOn + Math.round((z * c.fs) / 1000));
  let n = 0, lastMin = Infinity, lastMax = -Infinity;
  for (let i = i0; i <= i1; i++) {
    lastMin = Math.min(lastMin, x[i]);
    if (x[i] > x[i - 1] && x[i] >= x[i + 1]) {
      if (x[i] - lastMin >= p && (n === 0 || lastMax - lastMin >= p)) n++;
      lastMax = x[i];
      lastMin = x[i];
    }
  }
  return n;
}

const rateOf = (c: CriterionCtx): number => c.m.hrBpm;
const pNegative = (c: CriterionCtx, l: StdLead): boolean => f(c, l).pNeg <= -0.03 && f(c, l).p < 0.5 * -f(c, l).pNeg;

// ── criteria ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const ATRIAL_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  'sinus-pause': {
    hallmarks: [
      crit('sinus pause: a P–P gap ≥ 2 s', 'sinus-pause-types; DECISION §9.2', (c) => {
        const pp = ppOf(conductedP(c));
        return [pp.length > 2 && Math.max(...pp) >= 2000, `longest P–P ${f0(Math.max(...pp))} ms`];
      }),
      crit('the pause is not a multiple of the P–P cycle (± 10 %): sinus arrest, not exit block', 'sinus-pause-types', (c) => {
        const pp = ppOf(conductedP(c));
        const r = Math.max(...pp) / median(pp);
        return [Math.abs(r - Math.round(r)) >= 0.1, `pause / P–P = ${f2(r)}`];
      }),
      crit('the same sinus P before and after the pause', 'sinus-pause-types', (c) => {
        const ps = conductedP(c);
        const pp = ppOf(ps);
        const k = pp.indexOf(Math.max(...pp));
        return [k >= 0 && pShapeCount(c, [ps[k], ps[k + 1]]) === 1, `P shapes around the pause: ${pShapeCount(c, [ps[k], ps[k + 1]])}`];
      }),
      crit('base: no complex during the pause (RR ≥ 2 s); escape variant: a narrow complex without a P ends it', 'sinus-pause-types; escape-site', (c) => {
        const b = beatsMs(c);
        if (c.variant === 'escape') {
          const esc = b.filter((x) => x.rrPre !== null && x.rrPre >= 1200 && (x.pr === null || x.pr < 120) && beatWidth(c, x) < 110);
          return [esc.length >= 1, `escape complexes: ${esc.map((x) => f0(x.on)).join(', ') || 'none'}`];
        }
        const rr = rrList(c);
        return [Math.max(...rr) >= 2000, `longest RR ${f0(Math.max(...rr))} ms`];
      }),
    ],
  },
  'sa-exit-block': {
    hallmarks: [
      crit('type II: the pause is two P–P cycles (± 8 %); type I: P–P shortens, then a pause < 2 P–P', 'sinus-pause-types', (c) => {
        const ps = conductedP(c);
        const pp = ppOf(ps);
        const base = median(pp.filter((x) => x < 1.4 * Math.min(...pp)));
        const pauses = pp.map((x, i) => ({ x, i })).filter((y) => y.x > 1.4 * base);
        if (!pauses.length) return [false, `no pause (P–P ${pp.map(f0).join(' ')})`];
        if (c.variant === 'type-1') {
          const bad = pauses.filter((y) => y.i >= 2 && !(y.x < 2 * pp[y.i - 1] && pp[y.i - 1] < pp[y.i - 2]));
          return [bad.length === 0 && pauses.some((y) => y.i >= 2), `P–P ${pp.map(f0).join(' ')}`];
        }
        const bad = pauses.filter((y) => Math.abs(y.x - 2 * base) > 0.08 * base);
        return [bad.length === 0, `pauses ${pauses.map((y) => f0(y.x)).join(', ')} vs 2 × ${f0(base)}`];
      }),
      crit('same sinus P throughout (one P morphology)', 'sinus-pause-types', (c) => [pShapeCount(c, conductedP(c)) === 1, `${pShapeCount(c, conductedP(c))} P shapes`]),
    ],
  },
  'sinus-node-dysfunction': {
    hallmarks: [
      crit('an atrial tachycardia burst (≥ 3 consecutive RR < 600 ms)', 'sick-sinus', (c) => {
        const rr = rrList(c);
        let run = 0, best = 0;
        for (const x of rr) {
          run = x < 600 ? run + 1 : 0;
          best = Math.max(best, run);
        }
        return [best >= 3, `longest run of RR < 600 ms: ${best}`];
      }),
      crit('then a pause ≥ 2 s (overdrive suppression), then a slow rhythm (RR > 1000 ms)', 'sick-sinus; sinus-pause-types', (c) => {
        const rr = rrList(c);
        const k = rr.indexOf(Math.max(...rr));
        const fastBefore = rr.slice(0, k).some((x) => x < 600);
        const slowAfter = rr.slice(k + 1).length > 0 && rr.slice(k + 1).every((x) => x > 1000);
        return [rr[k] >= 2000 && fastBefore && slowAfter, `RR ${rr.map(f0).join(' ')}`];
      }),
    ],
    optOut: { 'qt-dispersion': 'the QT of the averaged beat mixes the tachycardia and the post-pause beats', 't-asymmetry': 'averaged T over abrupt rate changes' },
  },
  'ectopic-atrial-rhythm': {
    hallmarks: [
      crit('regular rate < 100', 'low-atrial-rhythm', (c) => [rateOf(c) < 100 && c.m.rrCv < 0.05, `rate ${fmt(rateOf(c), 0)}, RR CV ${fmt(100 * c.m.rrCv, 1)} %`]),
      crit('PR ≥ 120 ms', 'low-atrial-rhythm', (c) => [c.m.prMs !== null && c.m.prMs >= 120, `PR ${fmt(c.m.prMs, 0)}`]),
      crit('P axis outside the sinus range 0…+75°', 'low-atrial-rhythm; p-wave-normal', (c) => [c.m.pAxisDeg !== null && (c.m.pAxisDeg < 0 || c.m.pAxisDeg > 75), `P axis ${fmt(c.m.pAxisDeg, 0)}`]),
      crit('low RA: P negative in II, III, aVF; left atrial: P negative or flat in I and positive in V1', 'low-atrial-rhythm', (c) => {
        if (c.variant === 'left-atrial') {
          const ok = f(c, 'I').p <= 0.02 && f(c, 'V1').p >= 0.03;
          return [ok, `P in I +${fmt(f(c, 'I').p)}/${fmt(f(c, 'I').pNeg)}, V1 +${fmt(f(c, 'V1').p)}`];
        }
        const bad = (['II', 'III', 'aVF'] as const).filter((l) => !pNegative(c, l));
        return [bad.length === 0, bad.map((l) => `${l} P +${fmt(f(c, l).p)}/${fmt(f(c, l).pNeg)}`).join(', ')];
      }),
    ],
  },
  'wandering-atrial-pacemaker': {
    hallmarks: [
      crit('≥ 3 P-wave morphologies', 'blocked-at-mat; DECISION §9.2', (c) => [pShapeCount(c, conductedP(c)) >= 3, `${pShapeCount(c, conductedP(c))} P shapes`]),
      crit('rate < 100', 'blocked-at-mat (MAT is > 100)', (c) => [rateOf(c) < 100, `rate ${fmt(rateOf(c), 0)}`]),
      crit('narrow QRS (< 110 ms)', 'qrs-duration-normal', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
    ],
    optOut: { 'sinus-p': 'the pacemaker wanders out of the sinus node: P waves of several sites' },
  },
  pac: {
    hallmarks: [
      crit('a premature complex (RR < 85 % of the cycle) with the narrow QRS of the other beats', 'pac-criteria', (c) => {
        const pre = premature(c);
        return [pre.length >= 1 && pre.every((b) => likeDominant(c, b)), `premature: ${pre.map((b) => `${f0(b.on)} (${f0(beatWidth(c, b))} ms)`).join(', ') || 'none'}`];
      }),
      crit('preceded by a premature P′ of another shape', 'pac-criteria', (c) => {
        const pre = premature(c)[0];
        const pp = pre && pre.pOn !== null ? pre.pOn + 45 : null;
        const ref = regularBeats(c).filter((b) => b.pOn !== null).map((b) => (b.pOn as number) + 45);
        return [pp !== null && ref.length > 0 && pShapeCount(c, [ref[ref.length >> 1], pp]) === 2, `P′ ${f0(pp)}, sinus P ${f0(ref[ref.length >> 1])}`];
      }),
      crit('non-compensatory pause (RR before + RR after < 2 cycles − 40 ms)', 'pac-criteria', (c) => {
        const pre = premature(c)[0];
        const cyc = median(regularBeats(c).map((b) => b.rrPre).filter((x): x is number => x !== null && x < 1.15 * cycle(c)));
        const s = pre && pre.rrPre !== null && pre.rrPost !== null ? pre.rrPre + pre.rrPost : NaN;
        return [s < 2 * cyc - 40, `RR before + after ${f0(s)} vs 2 × ${f0(cyc)}`];
      }),
    ],
  },
  'pac-blocked': {
    hallmarks: [
      crit('narrow QRS (< 110 ms)', 'pac-criteria', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('a premature P′ inside the T is not followed by a QRS (a pause); bigeminy: a P′ deforms every T', 'pac-criteria; blocked-at-mat', (c) => {
        const b = beatsMs(c);
        if (c.variant === 'bigeminy') {
          const bifid = (['II', 'V5', 'V6'] as const).filter((l) => humps(c, l, 160, 520) >= 2);
          return [rateOf(c) < 60 && bifid.length >= 1, `rate ${fmt(rateOf(c), 0)} (mimics sinus bradycardia), T humps in ${bifid.join(', ') || 'no lead'}`];
        }
        const cyc = cycle(c);
        const blocked = realP(c).filter((p) => {
          const prev = [...b].reverse().find((x) => x.off < p);
          const next = b.find((x) => x.on > p);
          return prev && next && p - prev.on < 0.6 * cyc && next.on - p > 450 && next.on - prev.on > 1.3 * cyc;
        });
        return [blocked.length >= 1, `blocked P′: ${blocked.map(f0).join(', ') || 'none'}`];
      }),
    ],
    optOut: { 't-asymmetry': 'the blocked P′ rides on the T (bigeminy: on every T)', 'qt-dispersion': 'the P′ on the T moves the T end in some leads' },
  },
  'pac-aberrant': {
    hallmarks: [
      crit('a premature complex preceded by a P′', 'pac-criteria; aberrancy-vs-pvc', (c) => {
        // an early P′ lands on the preceding T: it is found on the QRST-subtracted residual when the oracle's P search
        // (after the T end) misses it
        const pre = premature(c);
        const ps = realP(c);
        const pOf = (b: RBeat): number | null => (b.pOn !== null ? b.pOn + 45 : pBefore(ps, b));
        return [pre.length >= 1 && pre.every((b) => pOf(b) !== null), `premature: ${pre.map((b) => `${f0(b.on)} P′ ${f0(pOf(b))}`).join(', ') || 'none'}`];
      }),
      crit('that complex is wide (≥ 120 ms) with a right bundle-branch pattern (terminal R′ in V1)', 'aberrancy-vs-pvc; rbbb-complete', (c) => {
        const pre = premature(c)[0];
        if (!pre) return [false, 'no premature complex'];
        const w = beatWidth(c, pre);
        const term = extremumIn(c, 'V1', pre.on + w - 50, pre.on + w, pre.on);
        return [w >= 120 && term >= 0.15, `width ${f0(w)} ms, V1 terminal ${f2(term)} mV`];
      }),
      crit('the other complexes narrow (< 110 ms)', 'aberrancy-vs-pvc', (c) => [widthOf(c, regularBeats(c)) < 110, `${f0(widthOf(c, regularBeats(c)))} ms`]),
    ],
  },
  'atrial-tachycardia': {
    hallmarks: [
      crit('a P′ before every QRS at a constant P′R (≥ 80 % of them within ± 15 ms of the median)', 'atrial-tachycardia', (c) => {
        const b = beatsMs(c);
        const prs = b.map((x) => x.pr).filter((x): x is number => x !== null);
        const m = median(prs);
        const near = prs.filter((x) => Math.abs(x - m) <= 15).length;
        return [prs.length >= 0.9 * b.length && near >= 0.8 * prs.length, `${prs.length}/${b.length} complexes with a P′, ${near} at P′R ${f0(m)} ± 15 ms`];
      }),
      crit('atrial rate 100–250: 1:1 (base); block variant: a second P′ midway between the conducted ones (2:1)', 'atrial-tachycardia; blocked-at-mat', (c) => {
        if (c.variant !== 'block') return [rateOf(c) >= 100 && rateOf(c) <= 250, `atrial = ventricular rate ${fmt(rateOf(c), 0)}`];
        // on the averaged beat the blocked P′ is a hump half a cycle after the conducted one, in the ST segment
        // (≈ RR − P′R − RR/2 after the QRS onset): a local maximum ± 40 ms of there in II, aVF or V1
        const half = cycle(c) / 2;
        const at = cycle(c) - (c.m.prMs ?? 0) - half + 45;
        const leads = (['II', 'aVF', 'V1'] as const).filter((l) => humps(c, l, at - 40, at + 40, 0.01) >= 1);
        const atrial = 120000 / cycle(c);
        return [atrial >= 150 && atrial <= 250 && leads.length >= 1, `atrial rate ${f0(atrial)}, blocked P′ hump at QRS + ${f0(at)} ms in ${leads.join(', ') || 'no lead'}`];
      }),
      crit('P′ unlike sinus: negative or flat in I and aVL (left pulmonary-vein focus), upright inferiorly', 'atrial-tachycardia; DECISION §9.2', (c) => {
        const ok = f(c, 'I').p <= 0.03 && f(c, 'aVL').pNeg <= -0.02 && f(c, 'aVF').p >= 0.03;
        return [ok, `P′ I +${fmt(f(c, 'I').p)}/${fmt(f(c, 'I').pNeg)}, aVL ${fmt(f(c, 'aVL').pNeg)}, aVF +${fmt(f(c, 'aVF').p)}`];
      }),
    ],
    optOut: { 'sinus-p': 'ectopic atrial focus', 'qt-dispersion': 'block variant: the blocked P′ sits on the T' },
  },
  mat: {
    hallmarks: [
      crit('≥ 3 P-wave morphologies', 'blocked-at-mat', (c) => [pShapeCount(c, conductedP(c)) >= 3, `${pShapeCount(c, conductedP(c))} P shapes`]),
      crit('rate > 100', 'blocked-at-mat', (c) => [rateOf(c) > 100, `rate ${fmt(rateOf(c), 0)}`]),
      crit('irregular P–P (CV ≥ 5 %) and variable PR (range ≥ 20 ms)', 'blocked-at-mat', (c) => {
        const pp = ppOf(conductedP(c));
        const prs = beatsMs(c).map((b) => b.pr).filter((x): x is number => x !== null);
        const m = median(pp);
        const cvpp = Math.sqrt(pp.reduce((a, x) => a + (x - m) ** 2, 0) / pp.length) / m;
        return [cvpp >= 0.05 && Math.max(...prs) - Math.min(...prs) >= 20, `P–P CV ${f0(100 * cvpp)} %, PR ${f0(Math.min(...prs))}–${f0(Math.max(...prs))}`];
      }),
    ],
    optOut: { 'sinus-p': 'multifocal atrial rhythm' },
  },
  pjc: {
    hallmarks: [
      crit('a premature narrow complex like the others', 'junctional-rhythm; pac-criteria', (c) => {
        const pre = premature(c);
        return [pre.length >= 1 && pre.every((b) => likeDominant(c, b)), `premature: ${pre.map((b) => `${f0(b.on)} (${f0(beatWidth(c, b))} ms)`).join(', ') || 'none'}`];
      }),
      crit('no P before it (a retrograde P′, if any, follows the QRS)', 'junctional-rhythm', (c) => {
        const pre = premature(c)[0];
        return [pre !== undefined && pre.pOn === null, `P before the premature complex at ${f0(pre?.pOn)}`];
      }),
    ],
  },
  'junctional-escape-rhythm': {
    hallmarks: [
      crit('rate 40–60', 'junctional-rhythm; intrinsic-rates', (c) => [rateOf(c) >= 40 && rateOf(c) <= 60, `rate ${fmt(rateOf(c), 0)}`]),
      crit('narrow QRS (< 110 ms)', 'junctional-rhythm', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('retrograde P′: before the QRS with P′R < 120 ms and negative in II, III, aVF; hidden; or after the QRS', 'junctional-rhythm', (c) => {
        const b = beatsMs(c);
        const withP = b.filter((x) => x.pr !== null).length / Math.max(1, b.length);
        if (c.variant === 'hidden' || c.variant === 'after') return [withP <= 0.2, `${f0(100 * withP)} % of complexes with a P before them`];
        const neg = (['II', 'III', 'aVF'] as const).filter((l) => pNegative(c, l));
        return [c.m.prMs !== null && c.m.prMs < 120 && neg.length === 3, `P′R ${fmt(c.m.prMs, 0)}, negative P′ in ${neg.join(', ')}`];
      }),
    ],
    optOut: { 'sinus-p': 'junctional rhythm: retrograde or no P' },
  },
  'accelerated-junctional-rhythm': {
    hallmarks: [
      crit('rate 61–100', 'junctional-rhythm', (c) => [rateOf(c) > 60 && rateOf(c) <= 100, `rate ${fmt(rateOf(c), 0)}`]),
      crit('narrow QRS (< 110 ms)', 'junctional-rhythm', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('no sinus P before the QRS (retrograde P′ after it); isorhythmic: P waves drift through the QRS (dissociation)', 'junctional-rhythm; av-dissociation', (c) => {
        const b = beatsMs(c);
        if (c.variant === 'isorhythmic') {
          const prs = b.map((x) => x.pr).filter((x): x is number => x !== null);
          const without = b.filter((x) => x.pr === null).length;
          const drift = prs.length ? Math.max(...prs) - Math.min(...prs) : 0;
          return [without >= 1 || drift >= 40, `complexes without P ${without}, PR range ${f0(drift)} ms`];
        }
        const withP = b.filter((x) => x.pr !== null).length / Math.max(1, b.length);
        return [withP <= 0.2, `${f0(100 * withP)} % of complexes with a P before them`];
      }),
    ],
    optOut: { 'sinus-p': 'junctional rhythm (isorhythmic variant: the P drifts into the QRS)', 'tp-level': 'isorhythmic variant: the dissociated P waves fall into the TP and PR windows' },
  },
  'af-regularised': {
    hallmarks: [
      // a regular ventricular rhythm in AF: no wavelet conducts (complete AV block), a junctional pacemaker escapes
      crit('regular ventricular rhythm (RR CV < 5 %) at an escape rate 35–60 /min', 'complete-avb; af-criteria; junctional-rhythm', (c) => [c.m.rrCv < 0.05 && rateOf(c) >= 35 && rateOf(c) <= 60, `RR CV ${fmt(100 * c.m.rrCv, 1)} %, rate ${fmt(rateOf(c), 0)}`]),
      crit('narrow QRS (< 110 ms): junctional escape', 'escape-site; junctional-rhythm', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('f waves, no P: atrial activity ≥ 0.2 mm p2p in every 1 s window of V1 and no consistent PR', 'af-criteria', (c) => {
        const r = atrialResidual(c, 'V1');
        const low: string[] = [];
        for (let s = 0; s + c.fs <= r.length; s += c.fs) {
          const p = mm(windowP2p(c, r, s, s + c.fs));
          if (p < 0.2) low.push(`${s / c.fs}–${s / c.fs + 1} s ${fmt(p, 2)} mm`);
        }
        const noPr = c.m.prMs === null || (c.m.prSdMs ?? 0) > 30;
        return [low.length === 0 && noPr, `${low.length ? `low f: ${low.join(', ')}; ` : ''}PR ${fmt(c.m.prMs, 0)} SD ${fmt(c.m.prSdMs, 0)}`];
      }),
    ],
    optOut: { 'sinus-p': 'atrial fibrillation: f waves, no P', 'tp-level': 'f waves run through the TP and PR windows', 'qt-dispersion': 'f waves on the T end' },
  },
};


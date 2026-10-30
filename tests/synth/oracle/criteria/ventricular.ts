/**
 * Hallmark criteria, group 'ventricular' (DECISION §9.4). Thresholds: criteria.md rows named in each `source`.
 * Rhythm readers (complexes, own widths, shape groups, curvature-detected complexes of disorganised rhythms, dominant
 * frequency): tests/synth/rhythm/readers.ts. Hallmarks that differ by variant switch on `c.variant`.
 */
import type { StdLead } from '../../../../src/core/leads';
import { residualPWaves } from '../measure';
import {
  beatsMs, beatWidth, complexAround, curvaturePeaks, dominantHz, extremumIn, f0, f2, median, netOf, p2pIn, p2pOf,
  qrsCorr, shapeGroups, sig, type RBeat,
} from '../../rhythm/readers';
import { cycle, premature, regularBeats } from './atrial';
import { crit, f, fmt, rOf, type Criterion, type CriterionCtx, type ScenarioCriteria } from './types';

/** Largest |deviation| of a lead from its own 600 ms moving mean (the slow respiratory / electrode drift removed). */
function maxAbsDetrended(c: CriterionCtx, l: StdLead): number {
  const x = sig(c)[l];
  const h = Math.round(0.3 * c.fs);
  let a = 0;
  for (let i = 0; i < x.length; i++) {
    const lo = Math.max(0, i - h), hi = Math.min(x.length - 1, i + h);
    let s = 0;
    for (let j = lo; j <= hi; j++) s += x[j];
    a = Math.max(a, Math.abs(x[i] - s / (hi - lo + 1)));
  }
  return a;
}

export const VENTRICULAR_VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  'vt-monomorphic': {
    teaching: [
      crit('≥ 1 visible dissociated P wave in the strip (rate ≤ 160)', 'vt-dissociation; DECISION §9.4 / §11', (c) => {
        const n = residualPWaves(c.leads, c.m).length;
        return [n >= 1 && c.m.hrBpm <= 160, `${n} residual P waves, rate ${fmt(c.m.hrBpm, 0)}`];
      }),
    ],
    captures: [
      crit('a capture beat (narrow, < 110 ms, early) and a fusion beat (intermediate width) among the VT complexes', 'vt-dissociation', (c) => {
        const b = beatsMs(c);
        const w = b.map((x) => beatWidth(c, x));
        const vt = median(w.filter((x) => x >= 130));
        const narrow = b.filter((x, i) => w[i] < 110 && x.rrPre !== null && x.rrPre < 0.95 * cycle(c));
        const fusion = b.filter((x, i) => w[i] >= 110 && w[i] < vt - 20);
        return [narrow.length >= 1 && fusion.length + narrow.length >= 2, `captures ${narrow.map((x) => f0(x.on)).join(', ') || 'none'}, intermediate ${fusion.map((x) => f0(x.on)).join(', ') || 'none'} (VT ${f0(vt)} ms)`];
      }),
    ],
  },
};

/** Wide complexes (own width ≥ 120 ms). */
const wideBeats = (c: CriterionCtx): RBeat[] => beatsMs(c).filter((b) => beatWidth(c, b) >= 120);
/** Complexes of a renewal rhythm found by curvature (polymorphic VT, flutter, fibrillation), with their own edges. */
function curvBeats(c: CriterionCtx, refractoryMs = 180, frac = 0.35): RBeat[] {
  return curvaturePeaks(c, refractoryMs, frac).map((t, i, a) => {
    const e = complexAround(c, t);
    return { i, on: e.on, off: e.off, width: e.width, pOn: null, pr: null, rrPre: i > 0 ? t - a[i - 1] : null, rrPost: i + 1 < a.length ? a[i + 1] - t : null };
  });
}
/** The run of a polymorphic tachycardia: the longest stretch of curvature complexes each < 520 ms after the previous
 *  one (a missed small complex at a torsades node leaves a gap of two short cycles). */
function run(c: CriterionCtx): RBeat[] {
  const bs = curvBeats(c, 160, 0.15);
  let best: RBeat[] = [], cur: RBeat[] = [];
  for (const b of bs) {
    if (b.rrPre !== null && b.rrPre < 520) cur.push(b);
    else cur = [];
    if (cur.length > best.length) best = [...cur];
  }
  return best;
}
/** T polarity of one complex in a lead: the extremum 60–300 ms after its QRS end (against the level before it). */
const tOf = (c: CriterionCtx, l: StdLead, b: RBeat, w: number): number => extremumIn(c, l, b.on + w + 60, b.on + w + 300, b.on);
/** Sign of the main QRS deflection of one complex in a lead. */
const mainSign = (c: CriterionCtx, l: StdLead, b: RBeat): number => Math.sign(netOf(c, l, b));

/** PVC origin: RVOT (LBBB-like, inferior axis), LV lateral (RBBB-like, negative in I), posterior fascicle (RBBB-like, QRS 110–140, superior axis). */
function pvcOrigin(c: CriterionCtx, b: RBeat): [boolean, string] {
  const w = beatWidth(c, b);
  const v1 = netOf(c, 'V1', b), i1 = netOf(c, 'I', b), avf = netOf(c, 'aVF', b), ii = netOf(c, 'II', b), iii = netOf(c, 'III', b);
  const desc = `V1 ${f2(v1)}, I ${f2(i1)}, II ${f2(ii)}, III ${f2(iii)}, aVF ${f2(avf)} mV, ${f0(w)} ms`;
  if (c.variant === 'lv-lateral') return [v1 > 0 && i1 < 0, `RBBB-like V1, negative I: ${desc}`];
  if (c.variant === 'fascicular') return [v1 > 0 && avf < 0 && w >= 100 && w <= 145, `RBBB-like V1, superior axis, 110–140 ms: ${desc}`];
  return [v1 < 0 && ii > 0 && iii > 0 && avf > 0, `LBBB-like V1, inferior axis: ${desc}`];
}

export const VENTRICULAR_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  'vt-monomorphic': {
    hallmarks: [
      crit('regular 120–250 /min (RR CV < 3 %; captures variant: the VT cycle between consecutive wide complexes)', 'vt-criteria', (c) => {
        if (c.variant === 'captures') {
          const b = beatsMs(c);
          const rr = b.slice(1).filter((x, i) => beatWidth(c, x) >= 130 && beatWidth(c, b[i]) >= 130).map((x, i) => x.rrPre as number);
          const m = median(rr);
          const cvv = Math.sqrt(rr.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, rr.length)) / m;
          return [60000 / m >= 120 && 60000 / m <= 250 && cvv < 0.03, `VT cycle ${f0(m)} ms (${f0(60000 / m)} /min), CV ${fmt(100 * cvv, 1)} %`];
        }
        return [c.m.hrBpm >= 120 && c.m.hrBpm <= 250 && c.m.rrCv < 0.03, `rate ${fmt(c.m.hrBpm, 0)} CV ${fmt(100 * c.m.rrCv, 1)} %`];
      }),
      crit('QRS ≥ 140 ms', 'vt-criteria; DECISION §9.4', (c) => [c.m.qrsMs >= 140, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('QRS p2p > |T| in II, V1, V6', 'DECISION §9.4 (vt)', (c) => {
        const bad = (['II', 'V1', 'V6'] as const).filter((l) => f(c, l).p2p <= Math.abs(f(c, l).t));
        return [bad.length === 0, bad.map((l) => `${l} QRS ${fmt(f(c, l).p2p)} T ${fmt(f(c, l).t)}`).join(', ')];
      }),
      crit('LV inferior exit: dominant R in V1, superior axis, rS / QS in V6', 'wct-morphology; DECISION §9.4 (vt)', (c) => {
        // a QS complex carries its negative deflection as q (no R): count it as the S
        const neg = (l: 'V1' | 'V6'): number => -Math.min(f(c, l).s, f(c, l).q);
        const v1 = rOf(c, 'V1') > neg('V1'), sup = c.m.axisDeg < -30 || c.m.axisDeg > 150, v6 = rOf(c, 'V6') < neg('V6');
        return [v1 && sup && v6, `V1 R ${fmt(rOf(c, 'V1'))}/S ${fmt(-neg('V1'))}, axis ${fmt(c.m.axisDeg, 0)}, V6 ${f(c, 'V6').morph} R ${fmt(rOf(c, 'V6'))}/S ${fmt(-neg('V6'))}`];
      }),
    ],
    optOut: { 'sinus-p': 'AV dissociation', 't-asymmetry': 'secondary T', 'st-segment': 'no ST segment in VT', 'tp-level': 'no TP segment', 'qt-dispersion': 'T of VT', 't-over-r-v5v6': 'QS in V6' },
  },
  pvc: {
    hallmarks: [
      crit('a premature wide complex (≥ 120 ms; fascicular origin ≥ 100 ms) without a premature P before it', 'pvc-criteria; vt-criteria (fascicular 110–140)', (c) => {
        const pre = premature(c);
        const min = c.variant === 'fascicular' ? 100 : 120;
        const ok = pre.filter((b) => beatWidth(c, b) >= min && b.pOn === null);
        return [pre.length >= 1 && ok.length === pre.length, `premature: ${pre.map((b) => `${f0(b.on)} ${f0(beatWidth(c, b))} ms ${b.pOn !== null ? 'with P' : ''}`).join(', ') || 'none'}`];
      }),
      crit('fully compensatory pause (RR before + after = 2 cycles ± 40 ms)', 'pvc-criteria', (c) => {
        const pre = premature(c)[0];
        const cyc = median(regularBeats(c).map((b) => b.rrPre).filter((x): x is number => x !== null && x < 1.15 * cycle(c)));
        const s = pre && pre.rrPre !== null && pre.rrPost !== null ? pre.rrPre + pre.rrPost : NaN;
        return [Math.abs(s - 2 * cyc) <= 40, `RR before + after ${f0(s)} vs 2 × ${f0(cyc)}`];
      }),
      crit('T opposite to the main QRS deflection of the premature complex (V1 and V6)', 'pvc-criteria', (c) => {
        const pre = premature(c)[0];
        if (!pre) return [false, 'no premature complex'];
        const w = beatWidth(c, pre);
        // leads where the QRS has a clear main deflection (|net| ≥ 0.2 mV) and the T is clear
        const bad = (['V1', 'V6'] as const).filter((l) => Math.abs(netOf(c, l, pre)) >= 0.2 && Math.abs(tOf(c, l, pre, w)) >= 0.1 && Math.sign(tOf(c, l, pre, w)) === mainSign(c, l, pre));
        return [bad.length === 0, bad.map((l) => `${l} QRS ${f2(netOf(c, l, pre))} T ${f2(tOf(c, l, pre, w))}`).join(', ')];
      }),
      crit('origin pattern: RVOT LBBB-like with an inferior axis; LV lateral RBBB-like with a negative I; posterior fascicle RBBB-like, superior axis, 110–140 ms', 'pvc-origin', (c) => {
        const pre = premature(c)[0];
        return pre ? pvcOrigin(c, pre) : [false, 'no premature complex'];
      }),
    ],
  },
  'ventricular-bigeminy': {
    hallmarks: [
      crit('every second complex is premature and wide for ≥ 4 cycles', 'pvc-grouping-lown', (c) => {
        const b = beatsMs(c);
        const wide = b.map((x) => beatWidth(c, x) >= 120);
        let run = 1, best = 1;
        for (let i = 1; i < wide.length; i++) {
          run = wide[i] !== wide[i - 1] ? run + 1 : 1;
          best = Math.max(best, run);
        }
        return [best >= 8, `alternating narrow / wide run of ${best} complexes (${wide.map((x) => (x ? 'W' : 'n')).join('')})`];
      }),
      crit('the wide complexes are premature, without a P before them', 'pvc-criteria', (c) => {
        const w = beatsMs(c).filter((b) => beatWidth(c, b) >= 120 && b.rrPre !== null);
        const bad = w.filter((b) => b.pOn !== null || (b.rrPost !== null && (b.rrPre as number) >= b.rrPost));
        return [w.length >= 3 && bad.length === 0, `${w.length} wide complexes, ${bad.length} not premature or with a P`];
      }),
    ],
  },
  'pvc-patterns': {
    hallmarks: [
      crit('couplet: two consecutive premature wide complexes; trigeminy / multifocal: every third complex wide', 'pvc-grouping-lown', (c) => {
        const wide = beatsMs(c).map((x) => beatWidth(c, x) >= 120);
        const seq = wide.map((x) => (x ? 'W' : 'n')).join('');
        if (c.variant === 'trigeminy' || c.variant === 'multifocal') return [/(nnW){3}/.test(seq), seq];
        return [/nWWn/.test(seq), seq];
      }),
      crit('multifocal: ≥ 2 PVC morphologies; otherwise one', 'pvc-criteria; pvc-grouping-lown', (c) => {
        const g = shapeGroups(c, wideBeats(c), 0.9);
        return [c.variant === 'multifocal' ? g.length >= 2 : g.length === 1, `${g.length} wide-complex shapes`];
      }),
    ],
  },
  aivr: {
    hallmarks: [
      crit('a wide (≥ 120 ms) ventricular rhythm at 60–110 /min', 'aivr; escape-idioventricular', (c) => {
        const w = wideBeats(c);
        const rr = w.slice(1).map((b, i) => b.on - w[i].on).filter((x) => x < 1100);
        const r = 60000 / median(rr);
        return [w.length >= 4 && r >= 60 && r <= 110, `${w.length} wide complexes at ${f0(r)} /min`];
      }),
      crit('fusion or capture beats at the transitions with the sinus rhythm (complexes of another shape)', 'aivr', (c) => {
        const b = beatsMs(c);
        const w = b.map((x) => beatWidth(c, x));
        const vt = median(w.filter((x) => x >= 120));
        const other = b.filter((_, i) => w[i] < vt - 15);
        return [other.length >= 1, `narrower complexes at ${other.map((x) => f0(x.on)).join(', ') || 'none'} (ventricular ${f0(vt)} ms)`];
      }),
    ],
    optOut: { 't-over-r-v5v6': 'QS of the ventricular complexes in V5–V6', 'sinus-p': 'AV dissociation', 't-asymmetry': 'secondary T', 'qt-dispersion': 'secondary T', 'st-segment': 'secondary ST-T' },
  },
  'ventricular-escape-rhythm': {
    hallmarks: [
      crit('a regular wide (≥ 120 ms) rhythm at 20–40 /min', 'escape-idioventricular; escape-site', (c) => {
        const ok = c.m.hrBpm >= 20 && c.m.hrBpm <= 40 && c.m.qrsMs >= 120 && c.m.rrCv < 0.05;
        return [ok, `rate ${fmt(c.m.hrBpm, 0)}, QRS ${fmt(c.m.qrsMs, 0)}, RR CV ${fmt(100 * c.m.rrCv, 1)} %`];
      }),
      crit('P waves march through, faster than the complexes (complete AV block)', 'complete-avb', (c) => {
        const ps = residualPWaves(sig(c), c.m);
        const pp = ps.slice(1).map((p, i) => p - ps[i]).filter((x) => x > 450 && x < 1100);
        const atrial = 60000 / median(pp);
        return [ps.length > beatsMs(c).length && atrial > c.m.hrBpm, `${ps.length} P waves (atrial ${f0(atrial)} /min) vs ${beatsMs(c).length} complexes`];
      }),
    ],
    optOut: { 't-over-r-v5v6': 'QS of the escape complexes in V5–V6', 'sinus-p': 'complete AV block: the P waves do not conduct', 't-asymmetry': 'secondary T' },
  },
  'vt-polymorphic': {
    hallmarks: [
      crit('a run of ≥ 8 complexes at 150–300 /min', 'vt-criteria; torsades', (c) => {
        const r = run(c);
        const rate = 60000 / median(r.slice(1).map((b) => b.rrPre as number));
        return [r.length >= 8 && rate >= 150 && rate <= 300, `run of ${r.length} at ${f0(rate)} /min`];
      }),
      crit('the QRS changes from beat to beat (median correlation of consecutive complexes < 0.8)', 'vt-criteria; DECISION §9.4', (c) => {
        const r = run(c);
        const cs = r.slice(1).map((b, i) => qrsCorr(c, r[i], b));
        return [median(cs) < 0.8, `median consecutive correlation ${f2(median(cs))}`];
      }),
      crit('narrow conducted complexes before the run', 'vt-criteria', (c) => {
        const r = run(c);
        const before = beatsMs(c).filter((b) => r.length && b.on < r[0].on - 300 && beatWidth(c, b) < 110 && b.pOn !== null);
        return [before.length >= 1, `${before.length} narrow complexes with a P before the run`];
      }),
    ],
    optOut: {
      'sinus-p': 'the averaged beat mixes the run and the sinus beats', 't-over-r-v5v6': 'polymorphic complexes', 't-asymmetry': 'polymorphic complexes',
      'qt-dispersion': 'polymorphic complexes', 'tp-level': 'no TP segment in the run', 'st-segment': 'no ST segment in the run',
    },
  },
  torsades: {
    hallmarks: [
      crit('QTc ≥ 500 ms in the sinus beats before the run', 'torsades; qtc-bazett', (c) => {
        const b = beatsMs(c);
        const sinus = b.filter((x) => x.pOn !== null && beatWidth(c, x) < 110 && x.rrPost !== null && x.rrPost > 700 && c.m.beats[x.i].tOff !== null);
        const qtc = sinus.map((x) => ((((c.m.beats[x.i].tOff as number) * 1000) / c.fs - x.on) / Math.sqrt((x.rrPre ?? x.rrPost as number) / 1000)));
        return [qtc.length >= 1 && median(qtc) >= 500, `QTc ${qtc.map(f0).join(', ') || 'none'} ms`];
      }),
      crit('short–long–short onset: a premature complex, a pause, one sinus beat, then the run starts on its T', 'torsades', (c) => {
        const r = run(c);
        const all = curvBeats(c, 160, 0.15);
        const k = r.length ? all.findIndex((b) => Math.abs(b.on - r[0].on) < 1) : -1;
        // the run's first complex (k) comes early after the post-pause sinus beat (k − 1), which ends the long pause
        // that followed a premature complex (k − 2)
        const rr = (i: number): number => (i > 0 ? all[i].on - all[i - 1].on : NaN);
        const ok = k >= 3 && rr(k - 2) < 0.7 * rr(k - 1) && rr(k) < 0.6 * rr(k - 1);
        return [ok, `RR into the run: ${k >= 3 ? [rr(k - 2), rr(k - 1), rr(k)].map(f0).join(', ') : '—'} (short–long–short)`];
      }),
      crit('twisting: the QRS amplitude waxes and wanes in the run (max / min ≥ 2.5 in II or V1), 160–250 /min', 'torsades', (c) => {
        const r = run(c);
        const rate = 60000 / median(r.slice(1).map((b) => b.rrPre as number));
        const ratios = (['II', 'V1', 'aVF'] as const).map((l) => {
          const a = r.map((b) => p2pOf(c, l, b));
          return Math.max(...a) / Math.max(1e-6, Math.min(...a));
        });
        return [Math.max(...ratios) >= 2.5 && rate >= 150 && rate <= 260, `amplitude max/min ${ratios.map(f2).join(', ')}, rate ${f0(rate)}`];
      }),
    ],
    optOut: {
      'sinus-p': 'the averaged beat mixes the run and the sinus beats', 't-over-r-v5v6': 'polymorphic complexes', 't-asymmetry': 'long-QT T and polymorphic complexes',
      'qt-dispersion': 'polymorphic complexes', 'tp-level': 'no TP segment in the run', 'st-segment': 'no ST segment in the run',
    },
  },
  'ventricular-flutter': {
    hallmarks: [
      crit('a regular sine-wave oscillation at 250–350 /min (dominant frequency 4.2–5.8 Hz in II)', 'vflutter-vf', (c) => {
        const hz = dominantHz(c, 'II', 2, 10);
        const bs = curvBeats(c, 150);
        const rr = bs.slice(1).map((b) => b.rrPre as number);
        const m = median(rr);
        const dev = rr.filter((x) => Math.abs(x - m) > 30).length;
        return [hz >= 4.2 && hz <= 5.8 && dev <= 0.1 * rr.length, `${hz.toFixed(1)} Hz, cycle ${f0(m)} ms, ${dev}/${rr.length} cycles off by > 30 ms`];
      }),
      crit('no isoelectric segment (II never stays within ± 0.05 mV of its median for 60 ms)', 'vflutter-vf', (c) => {
        const x = sig(c).II;
        const m = median(Array.from(x));
        let run = 0, best = 0;
        for (let i = Math.round(0.2 * c.fs); i < x.length - Math.round(0.2 * c.fs); i++) {
          run = Math.abs(x[i] - m) < 0.05 ? run + 1 : 0;
          best = Math.max(best, run);
        }
        return [(best * 1000) / c.fs < 60, `longest flat stretch ${f0((best * 1000) / c.fs)} ms`];
      }),
    ],
    optOut: { 'sinus-p': 'no P waves', 't-over-r-v5v6': 'QRS and T indistinguishable', 't-asymmetry': 'QRS and T indistinguishable', 'qt-dispersion': 'no T', 'tp-level': 'no TP', 'st-segment': 'no ST', 'no-spikes': 'continuous oscillation' },
  },
  'ventricular-fibrillation': {
    hallmarks: [
      crit('dominant frequency 4–8 Hz in II and V1', 'vflutter-vf', (c) => {
        const a = dominantHz(c, 'II', 2, 12), b = dominantHz(c, 'V1', 2, 12);
        return [a >= 4 && a <= 8 && b >= 4 && b <= 8, `II ${a.toFixed(1)} Hz, V1 ${b.toFixed(1)} Hz`];
      }),
      crit('no organised complexes (< 3 alike) and grossly irregular cycles (CV > 20 %)', 'vflutter-vf', (c) => {
        const bs = curvBeats(c, 120);
        const g = shapeGroups(c, bs, 0.9);
        const rr = bs.slice(1).map((b) => b.rrPre as number);
        const m = rr.reduce((s, x) => s + x, 0) / rr.length;
        const cvv = Math.sqrt(rr.reduce((s, x) => s + (x - m) ** 2, 0) / rr.length) / m;
        return [g[0].length < 3 && cvv > 0.2, `largest shape group ${g[0].length}, cycle CV ${f0(100 * cvv)} %`];
      }),
      crit('coarse: > 0.5 mV peak to peak in II (median of 1 s windows); fine variant: < 0.3 mV', 'vflutter-vf', (c) => {
        const ws: number[] = [];
        for (let a = 0; a + 1000 <= (c.leads.I.length * 1000) / c.fs; a += 1000) ws.push(p2pIn(c, 'II', a, a + 1000));
        const p = median(ws);
        return [c.variant === 'fine' ? p < 0.3 && p > 0.05 : p > 0.5, `II ${f2(p)} mV p2p`];
      }),
    ],
    optOut: { 'sinus-p': 'no P waves', 't-over-r-v5v6': 'no QRS or T', 't-asymmetry': 'no T', 'qt-dispersion': 'no T', 'tp-level': 'no TP', 'st-segment': 'no ST', 'limb-voltage': 'fine variant: low amplitude', 'no-spikes': 'chaotic activity' },
  },
  asystole: {
    hallmarks: [
      crit('no ventricular complex: |signal| < 0.05 mV in every lead apart from the slow drift (P-wave variant: only P waves, < 0.3 mV, no wide deflection)', 'vflutter-vf (fine VF vs asystole); DECISION §9.4', (c) => {
        const leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
        const mx = Math.max(...leads.map((l) => maxAbsDetrended(c, l)));
        return [c.variant === 'p-wave' ? mx < 0.3 : mx < 0.05, `largest deflection ${f2(mx)} mV (drift removed)`];
      }),
      crit('a recorded asystole is not a ruler-straight line: slight drift / noise (SD of II ≥ 0.005 mV), below the artefact level (II p2p < 0.3 mV)', 'DECISION §9.4', (c) => {
        const x = Array.from(c.leads.II);
        const m = x.reduce((a, b) => a + b, 0) / x.length;
        const sd = Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / x.length);
        const p2p = Math.max(...x) - Math.min(...x);
        return [sd >= 0.005 && p2p < 0.3, `II SD ${fmt(sd, 3)} mV, p2p ${f2(p2p)} mV`];
      }),
      crit('P-wave variant: regular P waves (40–80 /min) with nothing after them', 'complete-avb; DECISION §9.4', (c) => {
        if (c.variant !== 'p-wave') return [true, ''];
        const ps = curvaturePeaks(c, 400, 0.5);
        const pp = ps.slice(1).map((p, i) => p - ps[i]);
        const r = 60000 / median(pp);
        return [ps.length >= 4 && r >= 40 && r <= 80, `${ps.length} P waves at ${f0(r)} /min`];
      }),
    ],
    optOut: { 'sinus-p': 'no ventricular activity', 't-over-r-v5v6': 'no QRS', 'limb-voltage': 'no QRS', 't-asymmetry': 'no T', 'qt-dispersion': 'no T', 'tp-level': 'no complexes', 'st-segment': 'no ST' },
  },
};

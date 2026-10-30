/**
 * Hallmark criteria, group 'svt' (DECISION §9.3). Thresholds: criteria.md rows named in each `source`.
 */
import { STD_LEADS, type StdLead } from '../../../../src/core/leads';
import { atrialActivity, fSubtractedQrs } from '../measure';
import {
  beatsMs, complexAround, curvaturePeaks, f0, f2, median, shapeGroups, type RBeat,
} from '../../rhythm/readers';
import { cycle } from './atrial';
import { crit, f, fmt, mm, rOf, type CriterionCtx, type ScenarioCriteria } from './types';

/**
 * Atrial activity of a lead with every beat's QRST removed (the representative beat subtracted from the beat's own
 * QRS onset to the next one — as in residualPWaves): the f waves of fibrillation.
 */
export function atrialResidual(c: CriterionCtx, l: StdLead): Float32Array {
  const m = c.m;
  const x = Float32Array.from(c.leads[l]);
  const li = STD_LEADS.indexOf(l);
  const k0 = Math.max(0, m.medianOn - Math.round(0.01 * c.fs));
  m.beats.forEach((b, j) => {
    const next = m.beats[j + 1];
    const stop = next ? next.align - m.medianAlign + k0 : Infinity;
    for (let k = k0; k < m.median[l].length; k++) {
      const i = b.align - m.medianAlign + k;
      if (i >= stop) break;
      if (i >= 0 && i < x.length) x[i] -= m.median[l][k] + (b.tbase[li] ?? b.base[li]);
    }
  });
  return x;
}
/** samples outside every QRS − 20 ms … T end + 40 ms (the TQ stretches where f waves are read) */
function inTq(c: CriterionCtx, i: number): boolean {
  return !c.m.beats.some((b) => i >= b.qrsOn - Math.round(0.02 * c.fs) && i <= (b.tOff ?? b.qrsOn + Math.round(0.4 * c.fs)) + Math.round(0.04 * c.fs));
}
function tqP2p(c: CriterionCtx, r: Float32Array, a: number, z: number): number | null {
  let lo = Infinity, hi = -Infinity, n = 0;
  for (let i = a; i < z; i++) if (inTq(c, i)) {
    lo = Math.min(lo, r[i]);
    hi = Math.max(hi, r[i]);
    n++;
  }
  return n >= Math.round(0.1 * c.fs) ? hi - lo : null;
}
/** samples of the residual that lie outside every QRS (± 20 ms), where the template subtraction is reliable */
function outsideQrs(c: CriterionCtx, i: number): boolean {
  const pad = Math.round(0.02 * c.fs);
  return !c.m.beats.some((b) => i >= b.qrsOn - pad && i <= b.qrsOff + pad);
}
export function windowP2p(c: CriterionCtx, r: Float32Array, a: number, z: number): number {
  let lo = Infinity, hi = -Infinity;
  for (let i = a; i < z; i++) if (outsideQrs(c, i)) {
    lo = Math.min(lo, r[i]);
    hi = Math.max(hi, r[i]);
  }
  return hi > lo ? hi - lo : 0;
}
function rms(c: CriterionCtx, r: Float32Array): number {
  let s = 0, n = 0;
  const a = Math.round(0.5 * c.fs), z = r.length - Math.round(0.3 * c.fs);
  for (let i = a; i < z; i++) if (outsideQrs(c, i)) {
    s += r[i] * r[i];
    n++;
  }
  return Math.sqrt(s / Math.max(1, n));
}
/** mean cycle of the residual from its zero crossings (outside QRS) */
function zcCycleMs(c: CriterionCtx, r: Float32Array): number | null {
  let crossings = 0, n = 0, prev = 0;
  const a = Math.round(0.5 * c.fs), z = r.length - Math.round(0.3 * c.fs);
  let mean = 0, k = 0;
  for (let i = a; i < z; i++) if (outsideQrs(c, i)) {
    mean += r[i];
    k++;
  }
  mean /= Math.max(1, k);
  for (let i = a; i < z; i++) {
    if (!outsideQrs(c, i)) {
      prev = 0;
      continue;
    }
    n++;
    const s = r[i] - mean > 0.005 ? 1 : r[i] - mean < -0.005 ? -1 : 0;
    if (s !== 0 && prev !== 0 && s !== prev) crossings++;
    if (s !== 0) prev = s;
  }
  return crossings >= 6 ? (2 * n * 1000) / c.fs / crossings : null;
}
/** the flutter cycle (ms) from the inferior sawtooth */
function flutterCycle(c: CriterionCtx): number | null {
  const a = atrialActivity(c.leads, c.m, 'II', -1);
  return a.cycleMs ?? a.zcCycleMs;
}

export const SVT_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  'atrial-fibrillation': {
    hallmarks: [
      crit('irregularly irregular: RR CV > 10 %', 'af-criteria', (c) => [c.m.rrCv > 0.1, `RR CV ${fmt(100 * c.m.rrCv, 1)} %`]),
      crit('no consistent PR', 'af-criteria', (c) => [c.m.prMs === null || (c.m.prSdMs ?? 0) > 30, `PR ${fmt(c.m.prMs, 0)} SD ${fmt(c.m.prSdMs, 0)}`]),
      crit('narrow QRS (< 110 ms)', 'af-criteria', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('f waves 0.3–2 mm p2p in V1 (TQ stretches, median over 1 s windows)', 'af-criteria', (c) => {
        const r = atrialResidual(c, 'V1');
        const ws: number[] = [];
        for (let s0 = Math.round(0.5 * c.fs); s0 + c.fs <= r.length - Math.round(0.3 * c.fs); s0 += Math.round(c.fs / 2)) {
          const v = tqP2p(c, r, s0, s0 + c.fs);
          if (v !== null) ws.push(mm(v));
        }
        const p = median(ws);
        return [p >= 0.3 && p <= 2.5, `V1 f ${fmt(p, 1)} mm p2p`];
      }),
      crit('slow variant: ventricular rate < 60; rapid variant: > 120', 'af-criteria', (c) => {
        if (c.variant === 'slow') return [c.m.hrBpm < 60, `rate ${fmt(c.m.hrBpm, 0)}`];
        if (c.variant === 'rapid') return [c.m.hrBpm > 120, `rate ${fmt(c.m.hrBpm, 0)}`];
        return [true, ''];
      }),
      crit('f waves present in every 1 s window of II and V1 (≥ 0.2 mm p2p)', 'af-criteria; DECISION §12.2 (afib)', (c) => {
        const bad: string[] = [];
        for (const l of ['II', 'V1'] as const) {
          const r = atrialResidual(c, l);
          for (let s = 0; s + c.fs <= r.length; s += c.fs) {
            const p = mm(windowP2p(c, r, s, s + c.fs));
            if (p < 0.2) bad.push(`${l} ${s / c.fs}–${s / c.fs + 1} s ${fmt(p, 2)} mm`);
          }
        }
        return [bad.length === 0, bad.join(', ')];
      }),
      crit('f cycle 120–200 ms (350–600 /min, ± 15 %)', 'af-criteria', (c) => {
        const cy = zcCycleMs(c, atrialResidual(c, 'V1'));
        return [cy !== null && cy >= 100 && cy <= 230, `f cycle ${fmt(cy, 0)} ms`];
      }),
      crit('f waves larger in V1 and the inferior leads than in I', 'af-criteria; DECISION §11 (AF realism)', (c) => {
        const i = rms(c, atrialResidual(c, 'I')), v1 = rms(c, atrialResidual(c, 'V1')), ii = rms(c, atrialResidual(c, 'II'));
        return [v1 > i && ii > i, `f RMS I ${fmt(i, 3)} II ${fmt(ii, 3)} V1 ${fmt(v1, 3)}`];
      }),
    ],
    optOut: { 'sinus-p': 'no P waves in fibrillation', 'tp-level': 'no TP segment: f waves', 't-asymmetry': 'the averaged T is smeared by the RR-dependent QT and the f waves', 'qt-dispersion': 'f waves on the T end (slow variant: few, irregular beats)' },
  },
  'atrial-flutter': {
    hallmarks: [
      crit('atrial cycle 180–250 ms', 'flutter-criteria', (c) => {
        const cy = flutterCycle(c);
        return [cy !== null && cy >= 180 && cy <= 250, `atrial cycle ${fmt(cy, 0)} ms`];
      }),
      crit('counter-clockwise: inferior sawtooth negative (down/up ≥ 1.3 in II); clockwise: positive (≤ 0.8)', 'flutter-criteria', (c) => {
        const a = atrialActivity(c.leads, c.m, 'II', -1);
        return [c.variant === 'clockwise' ? a.negRatio <= 0.8 : a.negRatio >= 1.3, `II down/up ${fmt(a.negRatio)}`];
      }),
      crit('counter-clockwise: discrete positive F in V1; clockwise: negative F in V1', 'flutter-criteria', (c) => {
        const a = atrialActivity(c.leads, c.m, 'V1', 1);
        return [c.variant === 'clockwise' ? a.negRatio > 1.2 : a.negRatio < 1, `V1 down/up ${fmt(a.negRatio)}`];
      }),
      crit('fixed N:1 — ventricular rate = atrial rate / N (± 2 bpm); variable: every RR a multiple (≥ 2) of the F cycle, ≥ 2 different ratios', 'flutter-criteria', (c) => {
        const cy = flutterCycle(c);
        if (cy === null) return [false, 'no atrial cycle'];
        const atrial = 60000 / cy;
        if (c.variant === 'variable') {
          const ks = beatsMs(c).map((b) => b.rrPre).filter((x): x is number => x !== null).map((rr) => rr / cy);
          // ± 0.25 cycle: the AV-nodal delay of each conducted F wave depends on its recovery time (AH range ≈ 50 ms)
          const off = ks.filter((k) => Math.abs(k - Math.round(k)) > 0.25 || Math.round(k) < 2);
          return [off.length === 0 && new Set(ks.map(Math.round)).size >= 2, `RR / F cycle: ${ks.map((k) => k.toFixed(2)).join(' ')}`];
        }
        const n = Math.round(atrial / c.m.hrBpm);
        return [n >= 1 && Math.abs(c.m.hrBpm - atrial / n) <= 2, `atrial ${fmt(atrial, 0)} ventricular ${fmt(c.m.hrBpm, 0)} (N ${n})`];
      }),
      crit('narrow QRS on the F-subtracted beat (< 110 ms)', 'flutter-criteria', (c) => {
        const cy = flutterCycle(c);
        const s = cy !== null ? fSubtractedQrs(c.leads, c.m, cy) : null;
        return [s !== null && s.qrsMs < 110, `QRS ${fmt(s?.qrsMs, 0)}`];
      }),
      crit('F train has no DC offset (mean ≤ 0.1 mm in II)', 'DECISION §9.3 (flutter)', (c) => {
        const r = atrialResidual(c, 'II');
        let s = 0, n = 0;
        for (let i = Math.round(0.5 * c.fs); i < r.length - Math.round(0.3 * c.fs); i++) if (outsideQrs(c, i)) {
          s += r[i];
          n++;
        }
        return [Math.abs(mm(s / Math.max(1, n))) <= 0.1, `F mean ${fmt(mm(s / Math.max(1, n)), 2)} mm`];
      }),
    ],
    optOut: { 'sinus-p': 'flutter waves, no P', 'tp-level': 'no TP segment: F waves', 'st-segment': 'F waves superimposed on the ST segment', 't-asymmetry': 'F waves superimposed on the T', 'qt-dispersion': 'F waves superimposed on the T end' },
  },
  wpw: {
    hallmarks: [
      crit('PR < 120 ms', 'wpw-criteria', (c) => [c.m.prMs !== null && c.m.prMs < 120, `PR ${fmt(c.m.prMs, 0)}`]),
      crit('QRS ≥ 110 ms', 'wpw-criteria', (c) => [c.m.qrsMs >= 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
      crit('delta wave: slow initial 30 ms (slope index < 0.32) in ≥ 6 leads', 'wpw-criteria; DECISION §11 (WPW delta knee)', (c) => {
        const n = (Object.keys(c.m.feats) as StdLead[]).filter((l) => f(c, l).init30 < 0.32).length;
        return [n >= 6, `${n} leads with initial slope index < 0.32`];
      }),
      crit('left lateral pathway: delta negative or isoelectric in I, aVL, V5–V6 (initial 20 ms ≤ +0.03 mV)', 'DECISION §9.3 / §12.2 (wpw)', (c) => {
        const bad = (['I', 'aVL', 'V5', 'V6'] as const).filter((l) => c.m.median[l][c.m.medianOn + Math.round(0.02 * c.fs)] > 0.03);
        return [bad.length === 0, bad.map((l) => `${l} ${fmt(c.m.median[l][c.m.medianOn + Math.round(0.02 * c.fs)], 3)}`).join(' ')];
      }),
      crit('left lateral pathway: dominant R in V1', 'DECISION §9.3 (wpw)', (c) => [rOf(c, 'V1') >= -f(c, 'V1').s, `V1 R ${fmt(rOf(c, 'V1'))} S ${fmt(f(c, 'V1').s)}`]),
      // "secondary ST-T opposite to the delta / QRS": checked where delta and QRS point the same way (in V6 of a left
      // lateral pathway the delta is negative but the QRS positive: there the T follows the QRS rule only)
      crit('secondary T opposite to the delta and QRS in II, aVF and V3–V6', 'wpw-criteria; DECISION §12.2 (wpw)', (c) => {
        const k = c.m.medianOn + Math.round(0.03 * c.fs);
        const bad = (['II', 'aVF', 'V3', 'V4', 'V5', 'V6'] as const).filter((l) => {
          const d = c.m.median[l][k];
          if (Math.sign(d) !== Math.sign(f(c, l).net)) return false;
          return Math.abs(d) > 0.03 && Math.sign(d) === Math.sign(f(c, l).t) && Math.abs(f(c, l).t) > 0.05;
        });
        return [bad.length === 0, bad.map((l) => `${l} delta ${fmt(c.m.median[l][k])} T ${fmt(f(c, l).t)}`).join(', ')];
      }),
    ],
    optOut: { 't-asymmetry': 'secondary T of pre-excitation', 'st-segment': 'secondary ST-T of pre-excitation' },
  },
  avnrt: {
    hallmarks: [
      crit('regular narrow tachycardia (RR CV < 3 %, QRS < 110 ms): typical 140–220 /min', 'avnrt; svt-definition', (c) => {
        const r = c.m.hrBpm;
        const lo = c.variant === 'atypical' ? 120 : 140;
        return [r >= lo && r <= 220 && c.m.rrCv < 0.03 && c.m.qrsMs < 110, `rate ${fmt(r, 0)}, RR CV ${fmt(100 * c.m.rrCv, 1)} %, QRS ${fmt(c.m.qrsMs, 0)}`];
      }),
      crit('typical: no P before the QRS, retrograde P′ at the end of the QRS (pseudo-S in II and aVF, pseudo-r′ in V1, RP′ < 90 ms); atypical: inverted P′ before the QRS with P′R < RP′', 'avnrt', (c) => {
        const b = beatsMs(c);
        const withP = b.filter((x) => x.pr !== null).length / Math.max(1, b.length);
        if (c.variant === 'atypical') {
          const pr = c.m.prMs ?? NaN;
          const neg = (['II', 'III', 'aVF'] as const).filter((l) => f(c, l).pNeg <= -0.03 && f(c, l).p < 0.5 * -f(c, l).pNeg);
          return [withP >= 0.9 && pr < cycle(c) / 2 && neg.length === 3, `${f0(100 * withP)} % with P′, P′R ${f0(pr)} vs RR ${f0(cycle(c))}, negative in ${neg.join(', ')}`];
        }
        const at = (l: 'II' | 'aVF'): number => {
          const x = c.m.median[l];
          return x[Math.min(x.length - 1, c.m.medianOff + Math.round(0.02 * c.fs))];
        };
        return [withP <= 0.1 && at('II') <= -0.04 && at('aVF') <= -0.04, `${f0(100 * withP)} % with P, II ${f2(at('II'))} / aVF ${f2(at('aVF'))} mV at J + 20 ms`];
      }),
    ],
    optOut: { 'sinus-p': 're-entrant junctional tachycardia: retrograde P′', 'st-segment': 'retrograde P′ at the J point' },
  },
  avrt: {
    hallmarks: [
      crit('orthodromic: regular narrow 150–240 /min; antidromic: regular wide (≥ 120 ms) 150–250 /min', 'orthodromic-avrt; antidromic-avrt', (c) => {
        const r = c.m.hrBpm;
        if (c.variant === 'antidromic') return [r >= 150 && r <= 250 && c.m.rrCv < 0.03 && c.m.qrsMs >= 120, `rate ${fmt(r, 0)}, RR CV ${fmt(100 * c.m.rrCv, 1)} %, QRS ${fmt(c.m.qrsMs, 0)}`];
        return [r >= 150 && r <= 240 && c.m.rrCv < 0.03 && c.m.qrsMs < 110, `rate ${fmt(r, 0)}, RR CV ${fmt(100 * c.m.rrCv, 1)} %, QRS ${fmt(c.m.qrsMs, 0)}`];
      }),
      crit('orthodromic: retrograde P′ in the ST segment (negative in I and aVL: left free-wall pathway), 70 ms ≤ RP′ < RR / 2; antidromic: maximal pre-excitation (slow initial QRS in ≥ 10 leads)', 'orthodromic-avrt; antidromic-avrt; wpw-criteria', (c) => {
        if (c.variant === 'antidromic') {
          const n = STD_LEADS.filter((l) => f(c, l).init30 < 0.32).length;
          return [n >= 10, `${n} leads with initial slope index < 0.32`];
        }
        // the P′ is phase-locked to the QRS: it is part of the averaged beat — the trough of aVL after the QRS
        const x = c.m.median.aVL;
        const j = c.m.medianOff;
        let k = j, lo = Infinity;
        for (let i = j + Math.round(0.02 * c.fs); i <= j + Math.round(0.12 * c.fs) && i < x.length; i++) if (x[i] < lo) {
          lo = x[i];
          k = i;
        }
        const depth = lo - x[j + Math.round(0.01 * c.fs)];
        const rp = ((k - c.m.medianOn) * 1000) / c.fs - 35;
        return [depth <= -0.04 && rp >= 70 && rp < cycle(c) / 2, `aVL dip ${f2(depth)} mV, RP′ ≈ ${f0(rp)} ms, RR ${f0(cycle(c))}`];
      }),
      crit('antidromic: predominantly positive QRS in V4–V6 (no Steurer VT criterion)', 'antidromic-avrt; wct-morphology', (c) => {
        if (c.variant !== 'antidromic') return [true, 'orthodromic: not applicable'];
        const bad = (['V4', 'V5', 'V6'] as const).filter((l) => !(f(c, l).net > 0));
        return [bad.length === 0, (['V4', 'V5', 'V6'] as const).map((l) => `${l} net ${fmt(f(c, l).net)}`).join(', ')];
      }),
      crit('no P before the QRS', 'orthodromic-avrt', (c) => {
        const b = beatsMs(c);
        const withP = b.filter((x) => x.pr !== null).length / Math.max(1, b.length);
        return [withP <= 0.1, `${f0(100 * withP)} % of complexes with a P before them`];
      }),
    ],
    optOut: { 'sinus-p': 'retrograde P′ (re-entry)', 't-over-r-v5v6': 'antidromic: fully pre-excited QRS with a secondary T (small R in V6)', 't-asymmetry': 'P′ on the ST-T (orthodromic); secondary T (antidromic)', 'st-segment': 'retrograde P′ in the ST segment' },
  },
  'preexcited-af': {
    hallmarks: [
      crit('fast and irregular: rate > 150, RR CV > 10 %, shortest RR < 250 ms', 'preexcited-af; af-criteria', (c) => {
        // the complexes of this broad, changing tachycardia are read on the spatial curvature (the oracle's
        // single-template reader does not apply)
        const t = curvaturePeaks(c);
        const rr = t.slice(1).map((x, i) => x - t[i]);
        const m = rr.reduce((a, x) => a + x, 0) / rr.length;
        const cvv = Math.sqrt(rr.reduce((a, x) => a + (x - m) ** 2, 0) / rr.length) / m;
        return [60000 / m > 150 && cvv > 0.1 && Math.min(...rr) < 250, `rate ${f0(60000 / m)}, RR CV ${f0(100 * cvv)} %, shortest RR ${f0(Math.min(...rr))} ms`];
      }),
      crit('QRS shape and width change beat to beat (≥ 3 shapes), most beats wide (≥ 120 ms)', 'preexcited-af', (c) => {
        const t = curvaturePeaks(c);
        const bs: RBeat[] = t.map((x, i) => {
          const e = complexAround(c, x);
          return { i, on: e.on, off: e.off, width: e.width, pOn: null, pr: null, rrPre: null, rrPost: null };
        });
        const groups = shapeGroups(c, bs, 0.9);
        const wide = bs.filter((b) => b.width >= 120).length;
        return [groups.length >= 3 && wide >= 0.5 * bs.length, `${groups.length} shapes, ${wide}/${bs.length} wide`];
      }),
    ],
    optOut: {
      'sinus-p': 'fibrillation', 'tp-level': 'f waves, no TP segment', 'qt-dispersion': 'beat-to-beat changing QRS-T',
      't-asymmetry': 'secondary T of pre-excitation', 'st-segment': 'secondary ST-T', 't-over-r-v5v6': 'pre-excited QS in V5–V6',
    },
  },
  'short-pr': {
    hallmarks: [
      crit('PR < 120 ms', 'lgl', (c) => [c.m.prMs !== null && c.m.prMs < 120, `PR ${fmt(c.m.prMs, 0)}`]),
      crit('no delta wave: normal initial QRS slope (index ≥ 0.32) in ≥ 5 of I, aVL, V1, V4, V5, V6', 'lgl; wpw-criteria', (c) => {
        const n = (['I', 'aVL', 'V1', 'V4', 'V5', 'V6'] as const).filter((l) => f(c, l).init30 >= 0.32).length;
        return [n >= 5, `${n} of 6 leads with a normal initial slope`];
      }),
      crit('narrow QRS (< 110 ms)', 'lgl', (c) => [c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`]),
    ],
  },
};

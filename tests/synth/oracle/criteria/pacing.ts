/**
 * Hallmark criteria, group 'pacing' (DECISION §9.11; synth-rhythm M3). The pacing stimuli are the one-sample impulses
 * the oracle finds and blanks before measuring (`c.m.spikes`); everything else is read on the blanked signal through
 * the rhythm readers (tests/synth/rhythm/readers.ts). Thresholds: criteria.md rows `paced-qrs`, `ddd-behaviour`,
 * `pacing-threshold-impedance` and DECISION §9.11.
 */
import { beatsMs, beatWidth, extremumIn, f0, f2, median, netOf, spikeAmp, stimuli, type RBeat } from '../../rhythm/readers';
import { crit, fmt, type CriterionCtx, type ScenarioCriteria } from './types';

/** The complex that starts within `win` ms after a stimulus (a captured stimulus), or null. */
const capturedBy = (bs: readonly RBeat[], t: number, win = 30): RBeat | null => bs.find((b) => b.on >= t - 5 && b.on <= t + win) ?? null;
/** Ventricular stimuli: those followed by a complex within 30 ms, or (no capture) by none within 300 ms. */
function vStim(c: CriterionCtx): number[] {
  const bs = beatsMs(c);
  return stimuli(c).filter((t) => capturedBy(bs, t) !== null || !bs.some((b) => b.on > t + 30 && b.on < t + 300));
}
/** Atrial stimuli: followed by a P and, after the AV delay, by a QRS or a ventricular stimulus (not by a QRS at once). */
const aStim = (c: CriterionCtx): number[] => {
  const bs = beatsMs(c);
  return stimuli(c).filter((t) => capturedBy(bs, t) === null && bs.some((b) => b.on > t + 80 && b.on < t + 300));
};
/** T polarity of a paced complex in a lead (extremum 60–300 ms after its end). */
const tAfter = (c: CriterionCtx, l: 'V1' | 'V6', b: RBeat): number => {
  const w = beatWidth(c, b);
  return extremumIn(c, l, b.on + w + 60, b.on + w + 300, b.on);
};

export const PACING_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  'paced-aai': {
    hallmarks: [
      crit('an atrial stimulus before every P, at the lower rate (70 ± 2 /min)', 'paced-qrs; DECISION §9.11', (c) => {
        const st = stimuli(c);
        const b = beatsMs(c).filter((x) => x.on > 400);
        const preceded = b.filter((x) => st.some((t) => x.on - t > 100 && x.on - t < 260 && (x.pOn === null || x.pOn >= t))).length;
        const rr = st.slice(1).map((t, i) => t - st[i]);
        const rate = 60000 / median(rr);
        return [preceded === b.length && Math.abs(rate - 70) <= 2, `${preceded}/${b.length} complexes after an atrial stimulus, stimulus rate ${f0(rate)} /min`];
      }),
      crit('normal conducted QRS (< 110 ms), no ventricular stimulus', 'paced-qrs', (c) => {
        const bs = beatsMs(c);
        const v = stimuli(c).filter((t) => capturedBy(bs, t) !== null).length;
        return [c.m.qrsMs < 110 && v === 0, `QRS ${fmt(c.m.qrsMs, 0)}, ${v} stimuli right before a QRS`];
      }),
    ],
    optOut: { 'no-jumps': 'pacing stimuli', 'no-spikes': 'pacing stimuli', 'sinus-p': 'atrial-paced P′ from the right atrial appendage', 'tp-level': 'atrial repolarisation of the paced P′ in the PR window' },
  },
  'paced-vvi': {
    hallmarks: [
      crit('a stimulus before every complex, at the lower rate (60 ± 2 /min)', 'paced-qrs; DECISION §9.11', (c) => {
        const b = beatsMs(c);
        const st = stimuli(c);
        const ok = b.filter((x) => st.some((t) => x.on - t >= -5 && x.on - t <= 30)).length;
        const rate = 60000 / median(st.slice(1).map((t, i) => t - st[i]));
        return [ok === b.length && Math.abs(rate - 60) <= 2, `${ok}/${b.length} complexes paced, ${f0(rate)} /min`];
      }),
      crit('RV-apex pattern: QRS ≥ 140 ms, LBBB-like (V1 negative), superior axis (< −30°), discordant T in V1', 'paced-qrs', (c) => {
        const b = beatsMs(c)[2] ?? beatsMs(c)[0];
        const v1 = netOf(c, 'V1', b), t1 = tAfter(c, 'V1', b);
        const ok = c.m.qrsMs >= 140 && v1 < 0 && c.m.axisDeg < -30 && c.m.axisDeg > -120 && t1 > 0;
        return [ok, `QRS ${fmt(c.m.qrsMs, 0)}, V1 net ${f2(v1)}, axis ${fmt(c.m.axisDeg, 0)}, V1 T ${f2(t1)}`];
      }),
      crit('unipolar: large stimuli (≥ 2 mV); bipolar variant: small stimuli (< 2 mV)', 'pacing-threshold-impedance; DECISION §6.7', (c) => {
        const a = median(stimuli(c).map((t) => spikeAmp(c, t)));
        return [c.variant === 'bipolar' ? a < 2 && a > 0.25 : a >= 2, `stimulus ${f2(a)} mV`];
      }),
    ],
    optOut: {
      'no-jumps': 'pacing stimuli', 'no-spikes': 'pacing stimuli', 'sinus-p': 'atrial fibrillation under VVI pacing', 'tp-level': 'f waves',
      't-over-r-v5v6': 'paced complex with a small R in V5–V6', 't-asymmetry': 'secondary T of the paced complex', 'qt-dispersion': 'secondary T of the paced complex',
    },
  },
  'paced-ddd': {
    hallmarks: [
      crit('atrial and ventricular stimuli, AV interval = programmed (170 ms ± 3); tracking: no atrial stimulus, P onset → ventricular stimulus = 150 ± 15 ms', 'ddd-behaviour', (c) => {
        const bs = beatsMs(c);
        const vs = stimuli(c).filter((t) => capturedBy(bs, t) !== null);
        if (c.variant === 'tracking') {
          const as = aStim(c);
          const avs = bs.filter((b) => b.pOn !== null && vs.some((t) => Math.abs(t - b.on) <= 10)).map((b) => (vs.find((t) => Math.abs(t - b.on) <= 10) as number) - (b.pOn as number));
          return [as.length === 0 && avs.length >= 3 && Math.abs(median(avs) - 150) <= 15, `${as.length} atrial stimuli, P → V ${f0(median(avs))} ms`];
        }
        const as = aStim(c);
        const av = as.map((a) => vs.find((v) => v > a && v < a + 300)).filter((v): v is number => v !== undefined).map((v, i) => v - as[i]);
        return [as.length >= 3 && av.length >= 3 && av.every((x) => Math.abs(x - 170) <= 3), `${as.length} atrial, ${vs.length} ventricular stimuli, AV ${av.map(f0).join(', ')} ms`];
      }),
      crit('every complex paced from the RV apex (≥ 140 ms, superior axis)', 'paced-qrs', (c) => {
        const bs = beatsMs(c);
        const st = stimuli(c);
        const paced = bs.filter((b) => st.some((t) => Math.abs(b.on - t) <= 10)).length;
        return [paced === bs.length && c.m.qrsMs >= 140 && c.m.axisDeg < -30, `${paced}/${bs.length} paced, QRS ${fmt(c.m.qrsMs, 0)}, axis ${fmt(c.m.axisDeg, 0)}`];
      }),
    ],
    optOut: {
      'no-jumps': 'pacing stimuli', 'no-spikes': 'pacing stimuli', 'sinus-p': 'atrial-paced P′', 'tp-level': 'atrial repolarisation of the paced P′ in the PR window',
      't-over-r-v5v6': 'paced complex with a small R in V5–V6', 't-asymmetry': 'secondary T of the paced complex', 'qt-dispersion': 'secondary T of the paced complex',
    },
  },
  'paced-biv': {
    hallmarks: [
      crit('a stimulus before every complex', 'paced-qrs; DECISION §9.11', (c) => {
        const b = beatsMs(c);
        const st = stimuli(c);
        const ok = b.filter((x) => st.some((t) => x.on - t >= -5 && x.on - t <= 30)).length;
        return [ok === b.length, `${ok}/${b.length} complexes paced`];
      }),
      crit('biventricular fusion: dominant R or QR in V1 or a negative lead I, QRS narrower than RV pacing (< 150 ms)', 'paced-qrs; DECISION §9.11', (c) => {
        const b = beatsMs(c)[2] ?? beatsMs(c)[0];
        const v1 = netOf(c, 'V1', b), i1 = netOf(c, 'I', b);
        return [(v1 > 0 || i1 < 0) && c.m.qrsMs < 150, `V1 net ${f2(v1)}, I net ${f2(i1)}, QRS ${fmt(c.m.qrsMs, 0)}`];
      }),
    ],
    optOut: {
      'no-jumps': 'pacing stimuli', 'no-spikes': 'pacing stimuli', 't-over-r-v5v6': 'paced complex', 't-asymmetry': 'secondary T of the paced complex',
      'qt-dispersion': 'secondary T of the paced complex', 'st-segment': 'secondary ST-T of the paced complex',
    },
  },
  'pacing-failure-capture': {
    hallmarks: [
      crit('stimuli at the lower rate, some not followed by a QRS (no capture)', 'pacing-threshold-impedance; DECISION §9.11', (c) => {
        const bs = beatsMs(c);
        const st = stimuli(c);
        const lost = st.filter((t) => t < (c.leads.I.length * 1000) / c.fs - 300 && capturedBy(bs, t) === null && !bs.some((b) => b.on > t && b.on < t + 200));
        return [lost.length >= 1 && lost.length < st.length, `${lost.length}/${st.length} stimuli without a QRS`];
      }),
      crit('the captured stimuli give a wide paced QRS (≥ 140 ms)', 'paced-qrs', (c) => {
        const bs = beatsMs(c);
        const cap = stimuli(c).map((t) => capturedBy(bs, t)).filter((b): b is RBeat => b !== null);
        return [cap.length >= 2 && median(cap.map((b) => beatWidth(c, b))) >= 140, `${cap.length} captured, ${f0(median(cap.map((b) => beatWidth(c, b))))} ms`];
      }),
    ],
    optOut: {
      'no-jumps': 'pacing stimuli', 'no-spikes': 'pacing stimuli', 'sinus-p': 'complete AV block under the pacemaker', 't-over-r-v5v6': 'paced complex',
      't-asymmetry': 'secondary T of the paced complex', 'qt-dispersion': 'secondary T of the paced complex',
    },
  },
  'pacing-undersensing': {
    hallmarks: [
      crit('stimuli at a fixed interval (1000 ± 10 ms), ignoring the native complexes', 'DECISION §9.11', (c) => {
        const st = stimuli(c);
        const rr = st.slice(1).map((t, i) => t - st[i]);
        return [rr.length >= 5 && rr.every((x) => Math.abs(x - 1000) <= 10), `stimulus intervals ${rr.map(f0).join(' ')}`];
      }),
      crit('stimuli inside native QRS / T windows (≤ 400 ms after a native QRS onset)', 'DECISION §9.11', (c) => {
        const bs = beatsMs(c);
        const st = stimuli(c);
        const inside = st.filter((t) => bs.some((b) => b.pOn !== null && t - b.on > 20 && t - b.on <= 400));
        return [inside.length >= 1, `${inside.length} stimuli inside native complexes: ${inside.map(f0).join(', ')}`];
      }),
    ],
    optOut: {
      'no-jumps': 'pacing stimuli', 'no-spikes': 'pacing stimuli', 't-over-r-v5v6': 'paced complexes among the native ones', 't-asymmetry': 'paced and native complexes mixed',
      'qt-dispersion': 'paced and native complexes mixed', 'st-segment': 'paced and native complexes mixed', 'sinus-p': 'paced complexes among the native ones',
    },
  },
  'pacing-oversensing': {
    hallmarks: [
      crit('a pause longer than the lower-rate interval (> 1300 ms) with no stimulus in it', 'DECISION §9.11', (c) => {
        const st = stimuli(c);
        const rr = st.slice(1).map((t, i) => t - st[i]);
        const long = rr.filter((x) => x > 1300);
        return [long.length >= 1, `stimulus intervals ${rr.map(f0).join(' ')}`];
      }),
      crit('otherwise paced at the lower rate (1000 ± 10 ms)', 'DECISION §9.11', (c) => {
        const st = stimuli(c);
        const rr = st.slice(1).map((t, i) => t - st[i]).filter((x) => x <= 1300);
        return [rr.length >= 4 && rr.every((x) => Math.abs(x - 1000) <= 10), `regular intervals ${rr.map(f0).join(' ')}`];
      }),
    ],
    optOut: {
      'no-jumps': 'pacing stimuli', 'no-spikes': 'pacing stimuli', 'sinus-p': 'complete AV block under the pacemaker', 't-over-r-v5v6': 'paced complex',
      't-asymmetry': 'secondary T of the paced complex', 'qt-dispersion': 'secondary T of the paced complex',
    },
  },
};

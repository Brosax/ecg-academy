/**
 * Hallmark criteria, group 'technical' (DECISION §9.12). Each reads only the oracle's measurement of the delivered ECG
 * (and the delivered samples): what a reader can see on this one tracing. Sources: criteria.md `arm-cable-reversal`,
 * "Other limb cable reversals", "Electrode misplacement", "Technical artefacts" (artefact mimics; finding the faulty
 * electrode), "Mains (AC) interference", "Baseline wander", `precordial-progression` (Batchvarov et al. Europace 2007;
 * Harrigan et al. J Emerg Med 2012; Knight et al. NEJM 1999; Kligfield et al. Circulation 2007).
 * The artefact scenarios are graded on the delivered (noisy) tracing: the artefact itself is the hallmark.
 */
import type { LeadSignals } from '../../../../src/core/ecg';
import { STD_LEADS, type StdLead } from '../../../../src/core/leads';
import { measure, type Measurement } from '../measure';
import { crit, f, fmt, rOf, type CriterionCtx, type ScenarioCriteria } from './types';

const LIMB: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];

/** R progression of a normal heart: V1 small, growing to a tall lateral R (the dextrocardia discriminator). */
const chestProgressionNormal = crit('chest leads normal: R grows V1 → V3 → V5, R in V5 ≥ 0.8 mV', 'arm-cable-reversal; criteria.md "Electrode misplacement"', (c) => [
  rOf(c, 'V1') < rOf(c, 'V3') && rOf(c, 'V3') < rOf(c, 'V5') && rOf(c, 'V5') >= 0.8,
  `R V1 ${fmt(rOf(c, 'V1'))} V3 ${fmt(rOf(c, 'V3'))} V5 ${fmt(rOf(c, 'V5'))}`,
]);

/** P sign of a lead on the representative beat: the larger of the positive and negative P deflections. */
const pSign = (c: CriterionCtx, l: StdLead): number => (f(c, l).p >= -f(c, l).pNeg ? f(c, l).p : f(c, l).pNeg);

// ── signal helpers (delivered samples) ──────────────────────────────────────────────────────────────────────────
/** The delivered lead minus the representative beat placed on every measured beat (what is not the heart). */
export function residual(c: CriterionCtx, l: StdLead): Float32Array {
  const x = c.leads[l], m = c.m, med = m.median[l];
  const li = STD_LEADS.indexOf(l);
  const out = Float32Array.from(x);
  const covered = new Uint8Array(x.length);
  for (const b of m.beats) {
    const s0 = b.align - m.medianAlign;
    for (let k = 0; k < med.length; k++) {
      const i = s0 + k;
      if (i < 0 || i >= x.length || covered[i]) continue;
      out[i] = x[i] - (med[k] + (b.tbase[li] ?? 0));
      covered[i] = 1;
    }
  }
  // samples no template covers (strip edges) carry no information: zero them
  for (let i = 0; i < x.length; i++) if (!covered[i]) out[i] = 0;
  return out;
}

/** RMS of the high-frequency part (> ≈ 20 Hz: the lead minus its 25 ms moving average) outside the QRS complexes
 *  (± 40 ms around the QRS of the smoothed re-measure): P, ST and T of the heart are smooth, so this is the noise. */
export function hfRms(c: CriterionCtx, l: StdLead): number {
  const x = c.leads[l];
  const m = smoothedMeasure(c);
  const pad = Math.round(0.04 * c.fs);
  const mask = new Uint8Array(x.length);
  for (const b of m.beats) for (let i = Math.max(0, b.qrsOn - pad); i <= Math.min(x.length - 1, b.qrsOff + pad); i++) mask[i] = 1;
  const h = Math.max(1, Math.round(0.0125 * c.fs));
  let s = 0, n = 0;
  for (let i = h; i < x.length - h; i++) {
    if (mask[i]) continue;
    let a = 0;
    for (let j = i - h; j <= i + h; j++) a += x[j];
    const y = x[i] - a / (2 * h + 1);
    s += y * y;
    n++;
  }
  return n ? Math.sqrt(s / n) : 0;
}

/** Amplitude (peak, mV) of the sinusoidal component at `hz` over the whole strip (single-bin DFT). */
export function toneAmp(x: ArrayLike<number>, hz: number, fs: number): number {
  let re = 0, im = 0;
  const w = (2 * Math.PI * hz) / fs;
  for (let i = 0; i < x.length; i++) {
    re += x[i] * Math.cos(w * i);
    im -= x[i] * Math.sin(w * i);
  }
  return (2 * Math.hypot(re, im)) / x.length;
}

/** Dominant frequency (Hz) of a residual in [lo, hi] and its amplitude (DFT scan, 0.1 Hz steps). */
export function dominantTone(x: ArrayLike<number>, lo: number, hi: number, fs: number): { hz: number; amp: number } {
  let best = { hz: lo, amp: 0 };
  for (let hz = lo; hz <= hi + 1e-9; hz += 0.1) {
    const a = toneAmp(x, hz, fs);
    if (a > best.amp) best = { hz, amp: a };
  }
  return best;
}

/** Range (mV) of the PR-segment level across the measured beats in a lead (baseline drift). */
const prDrift = (c: CriterionCtx, l: StdLead): number => {
  const li = STD_LEADS.indexOf(l);
  const v = c.m.beats.map((b) => b.base[li]).filter(Number.isFinite);
  return v.length ? Math.max(...v) - Math.min(...v) : 0;
};

const p2pOf = (x: ArrayLike<number>): number => {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < x.length; i++) {
    lo = Math.min(lo, x[i]);
    hi = Math.max(hi, x[i]);
  }
  return hi - lo;
};

/**
 * The reader's view through a muscle / mains filter: a 20 ms moving average (zeros at 50, 100, 150 Hz) of every lead,
 * re-measured by the oracle. The oracle is a clean-signal delineator; a reader of a noisy tracing smooths it by eye.
 */
const SMOOTHED = new WeakMap<LeadSignals, Measurement>();
export function smoothedMeasure(c: CriterionCtx): Measurement {
  let m = SMOOTHED.get(c.leads);
  if (!m) {
    const h = Math.max(1, Math.round(c.fs / 50));
    const box = (x: Float32Array): Float32Array => {
      const y = new Float32Array(x.length);
      let s = 0;
      for (let i = 0; i < x.length; i++) {
        s += x[i];
        if (i >= h) s -= x[i - h];
        y[i] = s / Math.min(i + 1, h);
      }
      // centre the window (h / 2 samples of delay)
      const d = Math.floor(h / 2);
      return Float32Array.from(y, (_, i) => y[Math.min(x.length - 1, i + d)]);
    };
    const L = Object.fromEntries(STD_LEADS.map((l) => [l, box(c.leads[l])])) as unknown as LeadSignals;
    m = measure(L, c.fs, { baseline: 'median' });
    SMOOTHED.set(c.leads, m);
  }
  return m;
}

/** The native rhythm continues under the artefact; `smooth`: read through the 50 Hz / muscle smoothing (fast noise). */
const regularNarrow = (rate: [number, number], smooth = true) =>
  crit(`the native QRS marches through: regular RR (CV ≤ 8 %), narrow QRS (< 120 ms), sinus rate${smooth ? ' — read through a 50 Hz / muscle smoothing' : ''}`, 'criteria.md "Technical artefacts" (Knight 1999)', (c) => {
    const m = smooth ? smoothedMeasure(c) : c.m;
    return [
      m.rrCv <= 0.08 && m.qrsMs < 120 && m.hrBpm >= rate[0] && m.hrBpm <= rate[1],
      `RR CV ${fmt(100 * m.rrCv, 1)} %, QRS ${fmt(m.qrsMs, 0)} ms, rate ${fmt(m.hrBpm, 0)}`,
    ];
  });

/** Root-sum-square amplitude (mV) of the residual's components in a frequency band (0.1 Hz bins of a 10 s strip). */
export function bandAmp(x: ArrayLike<number>, lo: number, hi: number, fs: number): number {
  const T = x.length / fs, df = 1 / T;
  let s = 0;
  for (let hz = Math.ceil(lo / df) * df; hz <= hi + 1e-9; hz += df) s += toneAmp(x, hz, fs) ** 2;
  return Math.sqrt(s);
}

export const TECHNICAL_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  'electrode-reversal-la-ra': {
    hallmarks: [
      crit('lead I fully inverted: negative P, negative QRS, negative T', 'arm-cable-reversal', (c) => [
        pSign(c, 'I') <= -0.03 && f(c, 'I').net < -0.2 && f(c, 'I').t < 0,
        `I: P ${fmt(pSign(c, 'I'))} QRS net ${fmt(f(c, 'I').net)} T ${fmt(f(c, 'I').t)}`,
      ]),
      crit('aVR upright: positive P and positive QRS', 'arm-cable-reversal', (c) => [
        pSign(c, 'aVR') >= 0.03 && f(c, 'aVR').net > 0.1,
        `aVR: P ${fmt(pSign(c, 'aVR'))} QRS net ${fmt(f(c, 'aVR').net)}`,
      ]),
      chestProgressionNormal,
    ],
    optOut: { 'sinus-p': 'the arm cables are swapped: the recorded P axis points rightward (≈ +120°) although the rhythm is sinus' },
  },
  'electrode-reversal-la-ll': {
    hallmarks: [
      crit('P in I larger than in II', 'criteria.md "Other limb cable reversals" (Batchvarov 2007)', (c) => [
        pSign(c, 'I') >= 1.3 * Math.max(0.01, pSign(c, 'II')) && pSign(c, 'I') >= 0.08,
        `P I ${fmt(pSign(c, 'I'))} II ${fmt(pSign(c, 'II'))}`,
      ]),
      crit('III inverted: negative P (or terminal-positive biphasic) and negative T in III', 'criteria.md "Other limb cable reversals"', (c) => [
        f(c, 'III').pNeg <= -0.04 && f(c, 'III').t < 0,
        `III: P ${fmt(f(c, 'III').p)}/${fmt(f(c, 'III').pNeg)} T ${fmt(f(c, 'III').t)}`,
      ]),
      crit('aVR unchanged: negative P and QRS', 'criteria.md "Other limb cable reversals"', (c) => [
        pSign(c, 'aVR') < 0 && f(c, 'aVR').net < 0,
        `aVR: P ${fmt(pSign(c, 'aVR'))} QRS net ${fmt(f(c, 'aVR').net)}`,
      ]),
      chestProgressionNormal,
    ],
  },
  'electrode-reversal-ra-ll': {
    hallmarks: [
      crit('P and QRS negative in II, III and aVF (looks like a low atrial rhythm with inferior Q waves)', 'criteria.md "Other limb cable reversals"', (c) => {
        const inf: StdLead[] = ['II', 'III', 'aVF'];
        return [inf.every((l) => pSign(c, l) <= -0.03 && f(c, l).net < 0), inf.map((l) => `${l} P ${fmt(pSign(c, l))} QRS ${fmt(f(c, l).net)}`).join(', ')];
      }),
      crit('aVR upright: positive P and QRS', 'criteria.md "Other limb cable reversals"', (c) => [
        pSign(c, 'aVR') >= 0.03 && f(c, 'aVR').net > 0.1,
        `aVR: P ${fmt(pSign(c, 'aVR'))} QRS net ${fmt(f(c, 'aVR').net)}`,
      ]),
      chestProgressionNormal,
    ],
    optOut: { 'sinus-p': 'RA and LL cables swapped: the recorded P axis is superior (≈ −110°) although the rhythm is sinus' },
  },
  'neutral-cable-reversal': {
    hallmarks: [
      crit('one limb lead almost flat: III < 0.05 mV peak to peak', 'criteria.md "Other limb cable reversals" (LA/RL)', (c) => [
        p2pOf(c.leads.III) < 0.05,
        `III p2p ${fmt(p2pOf(c.leads.III), 3)} mV`,
      ]),
      crit('I and II identical (and aVL = aVF): both record left leg − right arm', 'criteria.md "Other limb cable reversals"', (c) => {
        let d = 0, e = 0;
        for (let i = 0; i < c.leads.I.length; i++) {
          d = Math.max(d, Math.abs(c.leads.I[i] - c.leads.II[i]));
          e = Math.max(e, Math.abs(c.leads.aVL[i] - c.leads.aVF[i]));
        }
        return [d < 0.02 && e < 0.02, `max |I − II| ${fmt(d, 3)}, |aVL − aVF| ${fmt(e, 3)} mV`];
      }),
      chestProgressionNormal,
    ],
  },
  'precordial-misplacement': {
    hallmarks: [
      crit('R-wave regression: R in V3 < 60 % of R in V2, then R in V4 > R in V3', 'precordial-progression; criteria.md "Electrode misplacement"', (c) => [
        rOf(c, 'V3') < 0.6 * rOf(c, 'V2') && rOf(c, 'V4') > rOf(c, 'V3'),
        `R V2 ${fmt(rOf(c, 'V2'))} V3 ${fmt(rOf(c, 'V3'))} V4 ${fmt(rOf(c, 'V4'))}`,
      ]),
      crit('limb leads normal: P upright in I and II, normal QRS axis', 'precordial-progression', (c) => [
        pSign(c, 'I') > 0.03 && pSign(c, 'II') > 0.05 && c.m.axisDeg >= -30 && c.m.axisDeg <= 90,
        `P I ${fmt(pSign(c, 'I'))} II ${fmt(pSign(c, 'II'))}, axis ${fmt(c.m.axisDeg, 0)}`,
      ]),
    ],
  },

  // criteria.md also names rSr′ in high V1–V2; the normal base has no superior terminal force to show it (terminal
  // Frank Y ≈ −0.05 mV), so that hallmark is a known deviation recorded in the scenario (not a lead-field matter)
  'precordial-misplacement-high': {
    hallmarks: [
      crit('negative P in V1 (dominant negative deflection), flat or negative P in V2 (upright part ≤ 0.03 mV)', 'criteria.md "Electrode misplacement" (high V1–V2)', (c) => [
        f(c, 'V1').pNeg <= -0.03 && -f(c, 'V1').pNeg > f(c, 'V1').p && f(c, 'V2').p <= 0.03,
        `V1 P ${fmt(f(c, 'V1').p)}/${fmt(f(c, 'V1').pNeg)}, V2 P ${fmt(f(c, 'V2').p)}/${fmt(f(c, 'V2').pNeg)}`,
      ]),
      crit('inverted T in V1, low T in V2 (< 0.15 mV)', 'criteria.md "Electrode misplacement" (high V1–V2)', (c) => [
        f(c, 'V1').t < 0 && f(c, 'V2').t < 0.15,
        `T V1 ${fmt(f(c, 'V1').t)} V2 ${fmt(f(c, 'V2').t)}`,
      ]),
      crit('poor R progression from V2 to V3 (R in V2 ≤ 0.2 mV)', 'criteria.md "Electrode misplacement"', (c) => [
        rOf(c, 'V2') <= 0.2 && rOf(c, 'V3') > 2 * rOf(c, 'V2'),
        `R V2 ${fmt(rOf(c, 'V2'))} V3 ${fmt(rOf(c, 'V3'))}`,
      ]),
    ],
  },
  'limbs-on-torso': {
    // the hallmark is a comparison with the standard placement of the same heart: tests/synth/catalogue/technical.test.ts
    hallmarks: [
      crit('a plausible limb-lead tracing: P upright in I and II, QRS axis −30…+90°', 'exercise-lead-system', (c) => [
        pSign(c, 'I') > 0.03 && pSign(c, 'II') > 0.05 && c.m.axisDeg >= -30 && c.m.axisDeg <= 90,
        `P I ${fmt(pSign(c, 'I'))} II ${fmt(pSign(c, 'II'))}, axis ${fmt(c.m.axisDeg, 0)}`,
      ]),
    ],
  },
  'baseline-wander': {
    hallmarks: [
      crit('low-frequency excursion ≥ 0.2 mV: the PR level drifts ≥ 0.2 mV across the strip in at least one lead', 'criteria.md "Baseline wander"', (c) => {
        const d = Math.max(...STD_LEADS.map((l) => prDrift(c, l)));
        return [d >= 0.2, `largest PR-level drift ${fmt(d)} mV`];
      }),
      regularNarrow([60, 100]),
    ],
    optOut: {
      'tp-level': 'baseline wander moves the TP level against the PR level by design',
      'qt-dispersion': 'tangent T ends ride on a drifting baseline (the heart is the normal base, checked in normal)',
      'sinus-p': 'the P waves ride on the respiratory drift: their area axis is not read on the unfiltered tracing (the heart is the normal base, checked in normal)',
    },
  },
  'muscle-tremor': {
    hallmarks: [
      crit('high-frequency noise in I, III and aVL (the leads of the left-arm electrode), largest in aVL; lead II spared', 'criteria.md "Technical artefacts" (finding the faulty electrode)', (c) => {
        const h = Object.fromEntries(LIMB.map((l) => [l, hfRms(c, l)])) as Record<StdLead, number>;
        return [
          h.I >= 0.015 && h.III >= 0.015 && h.aVL >= Math.max(h.I, h.III) * 0.9 && h.II <= 0.25 * Math.min(h.I, h.III),
          LIMB.map((l) => `${l} ${fmt(h[l], 3)}`).join(' '),
        ];
      }),
      regularNarrow([60, 100]),
    ],
    optOut: {
      'no-spikes': 'muscle noise is made of fast slope reversals',
      'tp-level': 'measured on a noisy baseline',
      'sinus-p': 'a clean-signal P detector cannot find the P under the noise (the heart is the normal base, checked in normal)',
      'st-segment': 'the ST / T onset is read on noisy samples',
      'qt-dispersion': 'tangent T ends on noisy samples',
    },
  },
  'muscle-tremor-parkinsonian': {
    hallmarks: [
      crit('4–7 Hz oscillation ≥ 0.05 mV in II, III and aVF (the left-leg electrode), absent from lead I', 'criteria.md "Technical artefacts" (tremor mimicking flutter)', (c) => {
        const ls = ['I', 'II', 'III', 'aVF'] as const;
        const t = Object.fromEntries(ls.map((l) => {
          const r = residual(c, l);
          return [l, { hz: dominantTone(r, 3.5, 7.5, c.fs).hz, amp: bandAmp(r, 3.5, 7.5, c.fs) }];
        })) as Record<(typeof ls)[number], { hz: number; amp: number }>;
        const inRange = (['II', 'III', 'aVF'] as const).every((l) => t[l].hz >= 4 && t[l].hz <= 7 && t[l].amp >= 0.05);
        return [inRange && t.I.amp <= 0.2 * t.III.amp, ls.map((l) => `${l} ${fmt(t[l].hz, 1)} Hz ${fmt(t[l].amp, 3)}`).join(', ')];
      }),
      regularNarrow([60, 100]),
    ],
    optOut: {
      'tp-level': 'the tremor runs through the TP segment',
      'sinus-p': 'the tremor on the leg electrode overlies the P in II, III and aVF (the P is read in I and aVL)',
      'qt-dispersion': 'tangent T ends in II, III and aVF ride on the 5 Hz oscillation',
    },
  },
  'ac-interference': {
    hallmarks: [
      crit('spectral peak at 50 Hz ≥ 0.02 mV peak to peak in at least one lead', 'criteria.md "Mains (AC) interference"', (c) => {
        const a = Math.max(...STD_LEADS.map((l) => toneAmp(c.leads[l], 50, c.fs)));
        return [2 * a >= 0.02, `largest 50 Hz component ${fmt(2 * a, 3)} mV p2p`];
      }),
      regularNarrow([60, 100]),
    ],
    optOut: {
      'no-spikes': 'a 50 Hz oscillation reverses its slope every 10 ms',
      'tp-level': 'measured on a noisy baseline',
      'sinus-p': 'a clean-signal P detector cannot find the P under the noise (the heart is the normal base, checked in normal)',
      'st-segment': 'the ST / T onset is read on noisy samples',
      'qt-dispersion': 'tangent T ends on noisy samples',
      't-asymmetry': 'the T shape is read on samples carrying the 50 Hz oscillation',
      'limb-voltage': 'the averaged beat is aligned on curvature peaks the 50 Hz oscillation shifts (the heart is the normal base, checked in normal)',
    },
  },
  'motion-artefact': {
    hallmarks: [
      crit('large broad deflections ≥ 0.8 mV p2p in I, II and aVR (the right-arm electrode); lead III spared', 'criteria.md "Technical artefacts" (finding the faulty electrode)', (c) => {
        const a = Object.fromEntries((['I', 'II', 'III', 'aVR'] as const).map((l) => [l, p2pOf(residual(c, l))])) as Record<'I' | 'II' | 'III' | 'aVR', number>;
        return [a.I >= 0.8 && a.II >= 0.8 && a.aVR >= 0.8 && a.III <= 0.2 * Math.min(a.I, a.II), (['I', 'II', 'III', 'aVR'] as const).map((l) => `${l} ${fmt(a[l])}`).join(', ')];
      }),
      regularNarrow([60, 100], false),
    ],
    optOut: { 'tp-level': 'the artefact runs through the TP segments of the beats it covers' },
  },
};

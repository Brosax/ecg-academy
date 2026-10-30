/**
 * ORACLE delineator (DECISION §8.1): measures an ECG from its signals alone, independently of the engine (it imports
 * only src/core). Port of prototype B's measure.ts (QRS energy detection, Pan–Tompkins T discrimination, slope-minimum
 * P→delta guard, tangent T end, per-lead features on the median beat) with the additions of A and C: baseline handling
 * (zero for clean synthetic signals, median-filter baseline for real records), net-deflection hexaxial axis against the
 * PR level, QRS width on the signal-averaged (median) beat, template subtraction to find P waves hidden in dissociated
 * rhythms, sawtooth / f-wave analysis of the TQ windows. It is validated on the 300 PTB-XL records shipped in
 * src/data/real against the GE 12SL reference (tests/synth/oracle/real.test.ts) before it may grade synthetic ECGs.
 *
 * Representative beat: aligned on the curvature fiducial refined by template cross-correlation (± 50 ms), one common
 * PR-level reference (re-referenced to its own isoelectric PR window, or to the TQ level in fibrillation); QRS edges,
 * PR (P onset against the quietest stretch after the previous T), QT (tangent method in the dominant-T lead; per-beat
 * median in irregular rhythms) and axes are read on it. Beats matching its morphology (r ≥ 0.8) take its QRS edges.
 * Rhythm-specific readers: fSubtractedQrs (flutter), residualPWaves (AV dissociation), tqReferenced (fibrillation).
 * Edge thresholds (DEFAULT_TUNE) were set on the real records and clean synthetic beats together.
 *
 * Rhythm additions (synth-rhythm, M3), neutral for a uniform rhythm: one-sample pacing stimuli are detected and blanked
 * before anything else (`pacingSpikes`, as recorders do), broad complexes are also found by their slope energy (a wide
 * PVC has less curvature than a sinus QRS), and the representative beat is the median of the dominant morphology
 * cluster (largest group of beats whose QRSs correlate ≥ 0.8; ties go to the cluster preceded by P waves, then the
 * narrower one), so ectopic beats keep their own edges and do not smear the template.
 */
import { STD_LEADS, type StdLead } from '../../../src/core/leads';

export type Leads = Readonly<Record<StdLead, Float32Array>>;
const IND: readonly StdLead[] = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
/** leads of the spatial P amplitude (P onset) */
const P_LEADS: readonly StdLead[] = ['II', 'V1', 'I'];

export interface BeatMeas {
  /** sample indices */
  readonly fid: number;
  /** alignment point in the representative beat (the fiducial refined by template correlation) */
  align: number;
  qrsOn: number;
  qrsOff: number;
  tOff: number | null;
  pOn: number | null;
  /** PR-segment level per lead index of STD_LEADS (mV) */
  base: number[];
  /** level subtracted from this beat when the representative beat was averaged (template subtraction uses it) */
  tbase: number[];
}

export interface LeadFeat {
  readonly p: number;
  readonly pNeg: number;
  readonly q: number;
  readonly qDur: number;
  readonly r: number;
  readonly s: number;
  readonly r2: number;
  readonly morph: string;
  readonly rPeakMs: number;
  /** level at the J point and at J+60 ms (relative to the PR level) */
  readonly j: number;
  readonly st60: number;
  /** largest |T| value in J+60 … T end, with its sign */
  readonly t: number;
  readonly tMin: number;
  readonly tMax: number;
  /** (half-amplitude rise duration) / (half-amplitude fall duration) of the T */
  readonly tAsym: number;
  readonly tFwhm: number;
  readonly qrsArea: number;
  /** duration (ms) of the terminal negative deflection after the last R peak */
  readonly sDur: number;
  /** mean |slope| over the first 30 ms of the QRS relative to the max |slope| in the QRS (delta-wave index) */
  readonly init30: number;
  /** net QRS deflection (largest positive + largest negative) */
  readonly net: number;
  /** peak-to-peak QRS amplitude */
  readonly p2p: number;
  /** number of slope reversals inside the QRS with > 0.05 mV excursion */
  readonly notches: number;
}

export interface Measurement {
  readonly fs: number;
  readonly beats: readonly BeatMeas[];
  readonly hrBpm: number;
  readonly rrMs: readonly number[];
  readonly rrCv: number;
  readonly prMs: number | null;
  readonly prSdMs: number | null;
  readonly qrsMs: number;
  /** QT: tangent-method T end in the lead with the largest T (median beat) */
  readonly qtMs: number | null;
  /** QT in the lead with the longest QT (tangent method, leads with a clear T) */
  readonly qtMaxMs: number | null;
  /** net-deflection hexaxial axis on the median beat; area axis */
  readonly axisDeg: number;
  readonly axisAreaDeg: number;
  readonly pAxisDeg: number | null;
  readonly tAxisDeg: number | null;
  readonly median: Leads;
  /** index of the fiducial in the median beat (beat sample = fid − medianAlign + k) */
  readonly medianAlign: number;
  readonly medianOn: number;
  readonly medianOff: number;
  readonly medianTOff: number | null;
  readonly medianPOn: number | null;
  readonly medianPOff: number | null;
  readonly feats: Readonly<Record<StdLead, LeadFeat>>;
  /** fraction of beats with no quiet segment before them (QRS and T fused) */
  readonly fused: number;
  /** pacing stimuli found and blanked before measuring (sample indices) */
  readonly spikes: readonly number[];
  /** beats of the dominant morphology (the representative beat's cluster) */
  readonly dominant: readonly BeatMeas[];
}

export interface MeasureOptions {
  /** 'none' (clean synthetic signal: the resting level is 0) or 'median' (real records: 200/600 ms median filters) */
  readonly baseline?: 'none' | 'median';
  /** QRS-edge thresholds (fractions of the complex's peak slope / curvature energy); calibration only */
  readonly tune?: Partial<Tune>;
}

export interface Tune {
  readonly onThr: number;
  readonly offThr: number;
  readonly offEThr: number;
  readonly offEMs: number;
  readonly pThr: number;
}

/** Calibrated on the shipped PTB-XL records against 12SL (scripts/synth/oracle-real.ts) and on clean synthetic beats. */
export const DEFAULT_TUNE: Tune = { onThr: 0.05, offThr: 0.035, offEThr: 0.035, offEMs: 4, pThr: 0.13 };

const HEX_K = 2 / Math.sqrt(3);
export const hexDeg = (i: number, f: number): number => (Math.atan2(HEX_K * f, i) * 180) / Math.PI;

const median = (xs: readonly number[]): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function medianFilter(x: Float64Array, w: number): Float64Array {
  const n = x.length, h = Math.max(1, w >> 1);
  const out = new Float64Array(n);
  const buf: number[] = [];
  for (let i = 0; i < n; i++) {
    buf.length = 0;
    for (let k = Math.max(0, i - h); k <= Math.min(n - 1, i + h); k++) buf.push(x[k]);
    buf.sort((a, b) => a - b);
    out[i] = buf[buf.length >> 1];
  }
  return out;
}

/**
 * Remove baseline wander: subtract the 200 ms → 600 ms median-filtered baseline (de Chazal et al. 2004). The medians
 * run on a 100 Hz decimated copy (the baseline has no content above ~1 Hz) and are linearly interpolated back.
 */
export function removeBaseline(L: Leads, fs: number): Leads {
  const out = {} as Record<StdLead, Float32Array>;
  const step = Math.max(1, Math.round(fs / 100));
  const fd = fs / step;
  for (const l of STD_LEADS) {
    const x = L[l];
    const m = Math.ceil(x.length / step);
    const d = new Float64Array(m);
    for (let j = 0; j < m; j++) d[j] = x[Math.min(x.length - 1, j * step)];
    const b = medianFilter(medianFilter(d, Math.round(0.2 * fd)), Math.round(0.6 * fd));
    out[l] = x.map((v, i) => {
      const u = i / step, j = Math.min(m - 2, Math.floor(u)), f = u - j;
      return v - (b[j] * (1 - f) + b[j + 1] * f);
    });
  }
  return out;
}

/**
 * Pacing stimuli: isolated one-sample impulses (second difference ≥ 0.25 mV against both neighbours, opposite to the
 * neighbours' own second differences) seen at the same sample in ≥ 3 of the 8 independent leads. Returns their sample
 * indices; `blankSpikes` replaces each by the mean of its neighbours in every lead.
 */
export function pacingSpikes(L: Leads): number[] {
  const n = L.I.length;
  const out: number[] = [];
  for (let i = 2; i < n - 2; i++) {
    let hits = 0;
    for (const l of IND) {
      const x = L[l];
      const d = x[i] - 0.5 * (x[i - 1] + x[i + 1]);
      if (Math.abs(d) < 0.25) continue;
      const dl = x[i - 1] - 0.5 * (x[i - 2] + x[i]);
      const dr = x[i + 1] - 0.5 * (x[i] + x[i + 2]);
      // the impulse sample itself: its second difference is the largest of the three and opposite to its neighbours'
      if (Math.sign(dl) !== Math.sign(d) && Math.sign(dr) !== Math.sign(d) && Math.abs(d) > Math.abs(dl) && Math.abs(d) >= Math.abs(dr)) hits++;
    }
    if (hits >= 3) out.push(i);
  }
  return out;
}

export function blankSpikes(L: Leads, spikes: readonly number[]): Leads {
  if (!spikes.length) return L;
  const out = {} as Record<StdLead, Float32Array>;
  for (const l of STD_LEADS) {
    const x = Float32Array.from(L[l]);
    for (const i of spikes) x[i] = 0.5 * (x[i - 1] + x[i + 1]);
    out[l] = x;
  }
  return out;
}

function slopeEnergy(L: Leads, w: number): Float64Array {
  const n = L.I.length;
  const s = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) {
    let a = 0;
    for (const l of IND) a += Math.abs(L[l][i + 1] - L[l][i - 1]);
    s[i] = a;
  }
  const out = new Float64Array(n);
  for (let i = w; i < n - w; i++) {
    let a = 0;
    for (let k = -w; k <= w; k++) a += s[i + k];
    out[i] = a / (2 * w + 1);
  }
  return out;
}

/** curvature energy: Σ over 8 leads of |x[i+k] − 2x[i] + x[i−k]| (k = 8 ms), smoothed ±6 ms */
function hfEnergy(L: Leads, fs: number): Float64Array {
  const n = L.I.length;
  const k = Math.max(1, Math.round(0.008 * fs));
  const e = new Float64Array(n);
  for (const l of IND) {
    const x = L[l];
    for (let i = k; i < n - k; i++) e[i] += Math.abs(x[i + k] - 2 * x[i] + x[i - k]);
  }
  const out = new Float64Array(n);
  const w = Math.max(1, Math.round(0.006 * fs));
  for (let i = w; i < n - w; i++) {
    let a = 0;
    for (let j = -w; j <= w; j++) a += e[i + j];
    out[i] = a / (2 * w + 1);
  }
  return out;
}

/** QRS onset / offset around a fiducial f from the slope (S, S1) and curvature (E) energies of the same signal. */
function qrsEdges(S: Float64Array, S1: Float64Array, E: Float64Array, f: number, fs: number, tune: Tune): { on: number; off: number; sp: number; ep: number } {
  const n = S.length;
  const hold = (m: number): number => Math.max(1, Math.round((m * fs) / 1000));
  const w3 = Math.max(1, Math.round(0.006 * fs));
  let sp = 0, ep = 0;
  for (let i = Math.max(0, f - hold(60)); i <= Math.min(n - 1, f + hold(60)); i++) {
    sp = Math.max(sp, S[i]);
    ep = Math.max(ep, E[i]);
  }
  let firstE = f;
  for (let i = f; i > Math.max(1, f - hold(200)); i--) {
    if (E[i] > 0.06 * ep) firstE = i;
    else if (firstE - i > hold(40)) break;
  }
  let on = f, c = 0, lmin = -1;
  const onLimit = Math.max(1, firstE - hold(10));
  while (on > onLimit && c < hold(12)) {
    on--;
    c = S[on] < tune.onThr * sp ? c + 1 : 0;
    if (lmin < 0 && f - on > hold(20) && on <= firstE && S1[on] < 0.08 * sp && S1[on] <= S1[on - 1] && S1[on] <= S1[on + 1] && S1[on - 1] > S1[on] * 1.02) lmin = on;
  }
  if (c >= hold(12)) on += hold(12) - 1 + w3;
  if (lmin > on) on = lmin;
  let lastE = f;
  for (let i = f; i < Math.min(n - 1, f + hold(200)); i++) {
    if (E[i] > tune.offEThr * ep) lastE = i;
    else if (i - lastE > hold(40)) break;
  }
  let off = f;
  c = 0;
  while (off < n - 2 && c < hold(16)) {
    off++;
    c = S[off] < tune.offThr * sp ? c + 1 : 0;
  }
  off -= hold(16) - 1 + w3;
  off = Math.min(off, lastE - hold(tune.offEMs));
  return { on, off, sp, ep };
}

export function measure(raw0: Leads, fs: number, opts: MeasureOptions = {}): Measurement {
  const spikes = pacingSpikes(raw0);
  const raw = blankSpikes(raw0, spikes);
  const L = opts.baseline === 'median' ? removeBaseline(raw, fs) : raw;
  const tune: Tune = { ...DEFAULT_TUNE, ...opts.tune };
  const n = L.I.length;
  const ms = (i: number): number => (i * 1000) / fs;
  const hold = (m: number): number => Math.max(1, Math.round((m * fs) / 1000));
  const w3 = Math.max(1, Math.round(0.006 * fs));
  const S = slopeEnergy(L, w3);
  const S1 = slopeEnergy(L, 1);
  const E = hfEnergy(L, fs);
  // fiducials: local maxima of the curvature energy above 30 % of a robust maximum (98th percentile), merged within 200 ms
  const sortedE = Array.from(E).sort((a, b) => a - b);
  const emax = sortedE[Math.floor(0.995 * (n - 1))];
  const fids: number[] = [];
  const refr = hold(200);
  let clusterStart = -Infinity;
  for (let i = 1; i < n - 1; i++) {
    if (E[i] < 0.3 * emax || E[i] < E[i - 1] || E[i] < E[i + 1]) continue;
    if (i - clusterStart < refr) {
      const last = fids[fids.length - 1];
      if (E[i] > E[last]) fids[fids.length - 1] = i;
    } else {
      fids.push(i);
      clusterStart = i;
    }
  }
  // broad complexes (ectopic, paced) carry less curvature than a narrow QRS: a slope-energy peak ≥ 45 % of the robust
  // slope maximum at ≥ 250 ms from every curvature fiducial, whose curvature still reaches 20 % of the robust maximum
  // (a T wave's does not), is a complex too (fiducial: its largest curvature ± 40 ms)
  {
    const sortedS = Array.from(S).sort((a, b) => a - b);
    const smax = sortedS[Math.floor(0.995 * (n - 1))];
    const far = hold(250);
    const extra: number[] = [];
    for (let i = 1; i < n - 1; i++) {
      if (S[i] < 0.45 * smax || S[i] < S[i - 1] || S[i] < S[i + 1]) continue;
      if (fids.some((f) => Math.abs(f - i) < far) || extra.some((f) => Math.abs(f - i) < hold(200))) continue;
      let best = i;
      for (let j = Math.max(1, i - hold(40)); j <= Math.min(n - 2, i + hold(40)); j++) if (E[j] > E[best]) best = j;
      if (E[best] >= 0.2 * emax) extra.push(best);
    }
    if (extra.length) {
      fids.push(...extra);
      fids.sort((a, b) => a - b);
    }
  }
  // T-wave discrimination (Pan & Tompkins 1985: a candidate within 360 ms with less than half the slope of the
  // previous complex is a T) plus a width rule for tented T waves, whose slope and apex curvature rival the QRS: within
  // 450 ms, a candidate whose slope-energy peak is clearly broader and not steeper than the previous complex is a T.
  const peakS = (f: number): number => {
    let v = 0;
    for (let i = Math.max(0, f - hold(30)); i <= Math.min(n - 1, f + hold(30)); i++) v = Math.max(v, S[i]);
    return v;
  };
  const widthS = (f: number): number => {
    const v = peakS(f);
    let c = 0;
    for (let i = Math.max(0, f - hold(80)); i <= Math.min(n - 1, f + hold(80)); i++) if (S[i] > 0.5 * v) c++;
    return c;
  };
  for (let k = 1; k < fids.length; k++) {
    const prev = fids[k - 1];
    const dt = fids[k] - prev;
    const ratio = peakS(fids[k]) / Math.max(1e-12, peakS(prev));
    if ((dt < hold(360) && ratio < 0.5) || (dt < hold(450) && ratio < 0.85 && widthS(fids[k]) > 1.3 * widthS(prev))) {
      fids.splice(k, 1);
      k--;
    }
  }
  // the first candidate has no predecessor in the strip: it may be the T of a beat before the strip — judged against
  // the next complex by the same slope / width rule
  if (fids.length >= 2 && fids[0] < hold(450)) {
    const ratio = peakS(fids[0]) / Math.max(1e-12, peakS(fids[1]));
    if (ratio < 0.5 || (ratio < 0.85 && widthS(fids[0]) > 1.3 * widthS(fids[1]))) fids.shift();
  }
  const beats: BeatMeas[] = [];
  let nFused = 0;
  for (let bi = 0; bi < fids.length; bi++) {
    const f = fids[bi];
    const { on, off, sp, ep } = qrsEdges(S, S1, E, f, fs, tune);
    let quiet = false;
    const prevF = fids[bi - 1];
    let run = 0;
    for (let i = prevF !== undefined ? prevF + hold(60) : Math.max(1, f - hold(400)); i < f - hold(20) && !quiet; i++) {
      run = S[i] < 0.1 * sp && E[i] < 0.1 * ep ? run + 1 : 0;
      if (run >= hold(30)) quiet = true;
    }
    if (!quiet) nFused++;
    if (on < 0.05 * fs || off > n - 0.05 * fs) continue;
    // a paced complex starts at its stimulus (see the template onset below)
    const stim = spikes.filter((x) => x <= on + hold(2) && x >= on - hold(20));
    beats.push({ fid: f, align: f, qrsOn: stim.length ? stim[stim.length - 1] : on, qrsOff: off, tOff: null, pOn: null, base: [], tbase: [] });
  }
  // two fiducials of one complex (a curvature peak and a slope peak ≥ 200 ms apart on a broad paced or fused complex)
  // can delineate the same QRS: no two QRS onsets lie within 120 ms (ventricular refractoriness) — keep the fiducial
  // with the larger curvature energy
  for (let k = 1; k < beats.length; k++) {
    if (beats[k].qrsOn - beats[k - 1].qrsOn >= hold(120)) continue;
    const drop = E[beats[k].fid] > E[beats[k - 1].fid] ? k - 1 : k;
    fids.splice(fids.indexOf(beats[drop].fid), 1);
    beats.splice(drop, 1);
    k--;
  }
  // T end (tangent method) on the lead with the largest T, per beat
  for (let b = 0; b < beats.length; b++) {
    const bt = beats[b];
    const next = beats[b + 1];
    const w0 = bt.qrsOff + hold(40);
    const w1 = Math.min(n - 2, next ? next.qrsOn - hold(10) : bt.qrsOn + hold(650), bt.qrsOn + hold(650));
    if (w1 - w0 < hold(80)) continue;
    // the lead with the largest T (relative to the PR level), bounded tangent search inside [w0, w1]
    let best: { end: number; amp: number } | null = null;
    for (const l of IND) {
      const ref = L[l][bt.qrsOn - hold(20)] ?? 0;
      const seg = Float32Array.from(L[l].subarray(bt.qrsOn, w1 + 1), (v) => v - ref);
      const e = tangentEnd(seg, w0 - bt.qrsOn, w1 - bt.qrsOn, fs);
      if (e && (!best || e.amp > best.amp)) best = e;
    }
    if (!best || best.amp < 0.05) continue;
    bt.tOff = bt.qrsOn + Math.min(best.end, w1 - bt.qrsOn);
  }
  // per-beat P onset (smoothed II, V1, I; see pOnsetIn): searched after the previous T end; used for the PR spread
  const sm = (x: Float32Array): Float32Array => {
    const h = Math.max(1, Math.round(0.004 * fs));
    const o = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) {
      let s = 0, k = 0;
      for (let j = Math.max(0, i - h); j <= Math.min(x.length - 1, i + h); j++) {
        s += x[j];
        k++;
      }
      o[i] = s / k;
    }
    return o;
  };
  const PL = P_LEADS.map((l) => sm(L[l]));
  for (let b = 0; b < beats.length; b++) {
    const bt = beats[b];
    const prev = beats[b - 1];
    const lo = Math.max(2, bt.qrsOn - hold(330), prev && prev.tOff !== null ? Math.ceil(prev.tOff) : 2);
    bt.pOn = pOnsetIn(PL, lo, bt.qrsOn, fs, tune.pThr);
  }
  // PR-segment level per lead (mean of qrsOn − 30 … −10 ms) where that window is isoelectric (range ≤ 0.04 mV);
  // without an isoelectric PR segment (VT, f / F waves, P on the T) the level of the isoelectric beats, else 0
  const rawLevel = (x: Float32Array, on: number): number => {
    let s = 0, k = 0, lo = Infinity, hi = -Infinity;
    for (let i = on - hold(30); i <= on - hold(10); i++) if (i >= 0) {
      s += x[i];
      k++;
      lo = Math.min(lo, x[i]);
      hi = Math.max(hi, x[i]);
    }
    return k && hi - lo <= 0.04 ? s / k : NaN;
  };
  const fallback = STD_LEADS.map((l) => {
    const q = beats.map((b) => rawLevel(L[l], b.qrsOn)).filter(Number.isFinite);
    return q.length ? median(q) : 0;
  });
  const levelOf = (li: number, on: number): number => {
    const v = rawLevel(L[STD_LEADS[li]], on);
    return Number.isFinite(v) ? v : fallback[li];
  };
  for (const bt of beats) bt.base = STD_LEADS.map((_, li) => levelOf(li, bt.qrsOn));
  // RR over every detected complex whose QRS starts inside the strip (beats near the edges are not measured but are
  // counted: the rate is a property of the whole strip)
  const fidOff0 = beats.length ? Math.round(median(beats.map((b) => b.fid - b.qrsOn))) : 0;
  const stripFids = fids.filter((f) => f - fidOff0 >= 0);
  const rr = stripFids.slice(1).map((f, i) => ms(f - stripFids[i]));
  const mrr = rr.length ? rr.reduce((a, b) => a + b, 0) / rr.length : NaN;
  const sd = rr.length ? Math.sqrt(rr.reduce((a, b) => a + (b - mrr) ** 2, 0) / rr.length) : NaN;
  const irregular = sd / mrr > 0.08;
  // ── signal-averaged representative beat, aligned on the fiducial (the curvature-energy peak is stable for a constant
  // morphology, whereas per-beat onsets wander with f / F waves and noise); 12SL measures on the representative complex
  // template length from a low RR percentile (the curvature fiducial of a wide QRS can jump between two peaks, so the
  // minimum fiducial interval understates the cycle)
  const minRr = rr.length ? [...rr].sort((a, b) => a - b)[Math.floor(0.25 * (rr.length - 1))] : 800;
  const fidOff = Math.round(median(beats.map((b) => b.fid - b.qrsOn)));
  const pre = hold(Math.min(400, 0.6 * minRr)) + fidOff;
  // after the onset the template covers a little more than one (long-ish) cycle, so template subtraction leaves no gap
  const rrHigh = rr.length ? [...rr].sort((a, b) => a - b)[Math.floor(0.75 * (rr.length - 1))] : 800;
  const post = hold(Math.min(700, 1.05 * rrHigh)) - fidOff;
  const len = pre + post;
  const med = {} as Record<StdLead, Float32Array>;
  const fitting = beats.filter((b) => b.fid - pre >= 0 && b.fid + post < n);
  // morphology clusters (QRS window around the fiducial, 8 independent leads, each beat against its PR level)
  const corr = (a: BeatMeas, b: BeatMeas): number => {
    let sxy = 0, sxx = 0, syy = 0;
    const w0 = hold(60), w1 = hold(100);
    for (const l of IND) {
      const li = STD_LEADS.indexOf(l);
      for (let k = -w0; k <= w1; k++) {
        const x = (L[l][a.fid + k] ?? 0) - a.base[li], y = (L[l][b.fid + k] ?? 0) - b.base[li];
        sxy += x * y;
        sxx += x * x;
        syy += y * y;
      }
    }
    return sxy / Math.sqrt(Math.max(1e-12, sxx * syy));
  };
  const clusters: BeatMeas[][] = [];
  for (const b of fitting) {
    const c = clusters.find((cl) => corr(cl[0], b) >= 0.8);
    if (c) c.push(b);
    else clusters.push([b]);
  }
  const width = (cl: BeatMeas[]): number => median(cl.map((b) => b.qrsOff - b.qrsOn));
  const withP = (cl: BeatMeas[]): number => cl.filter((b) => b.pOn !== null).length / cl.length;
  clusters.sort((a, b) => (Math.abs(b.length - a.length) > 1 ? b.length - a.length : withP(b) - withP(a) || width(a) - width(b)));
  const use = clusters.length > 1 ? clusters[0] : fitting;
  // PR-segment level of each beat at its template-estimated onset
  const levelAt = (_b: BeatMeas, li: number, on: number): number => levelOf(li, on);
  // alignment point of each beat: the fiducial, refined by cross-correlation with a first template (± 50 ms) so that a
  // fiducial jumping between two similar peaks (R vs S) does not smear the average
  const al = new Map<BeatMeas, number>(beats.map((b) => [b, b.fid]));
  const build = (): void => {
    // one common level per lead (the median of the beats' PR levels): a dissociated P or an f wave that lands in one
    // beat's PR window must not shift that beat against the others
    const common = STD_LEADS.map((_, li) => median(use.map((b) => levelAt(b, li, al.get(b)! - fidOff))));
    for (const b of beats) b.tbase = common;
    STD_LEADS.forEach((l, li) => {
      const m = new Float32Array(len);
      for (let k = 0; k < len; k++) m[k] = median(use.map((b) => L[l][al.get(b)! - pre + k] - b.tbase[li]));
      med[l] = m;
    });
  };
  build();
  {
    const w0 = Math.max(0, pre - hold(60)), w1 = Math.min(len - 1, pre + hold(80));
    const sh = hold(50);
    let moved = false;
    // every beat is aligned (beats too close to the strip edges for the average still get template-refined edges)
    for (const b of beats) {
      let best = 0, bv = -Infinity;
      for (let d = -sh; d <= sh; d++) {
        const a = b.fid + d;
        if (a - pre + w0 < 0 || a - pre + w1 >= n) continue;
        let c = 0;
        for (const l of IND) for (let k = w0; k <= w1; k++) c += L[l][a - pre + k] * med[l][k];
        if (c > bv) {
          bv = c;
          best = d;
        }
      }
      if (best !== 0) {
        al.set(b, b.fid + best);
        b.align = b.fid + best;
        if (use.includes(b)) moved = true;
      }
    }
    if (moved) build();
  }
  const mS = slopeEnergy(med, w3), mS1 = slopeEnergy(med, 1), mE = hfEnergy(med, fs);
  let mf = pre;
  for (let i = Math.max(1, pre - hold(20)); i <= Math.min(len - 2, pre + hold(20)); i++) if (mE[i] > mE[mf]) mf = i;
  const me = use.length ? qrsEdges(mS, mS1, mE, mf, fs, tune) : { on: pre - fidOff, off: pre };
  // paced complexes: the QRS onset is the stimulus (the clinical convention for the paced QRS duration and the AV
  // interval) when most template beats carry a spike within 20 ms before their delineated onset
  let spikeOn: number | null = null;
  if (spikes.length && use.length) {
    const rel: number[] = [];
    for (const b of use) {
      const sp = spikes.filter((x) => x <= al.get(b)! - pre + me.on + hold(2) && x >= al.get(b)! - pre + me.on - hold(20));
      if (sp.length) rel.push(sp[sp.length - 1] - (al.get(b)! - pre));
    }
    if (rel.length > use.length / 2) spikeOn = Math.round(median(rel));
  }
  const mOn = Math.max(1, spikeOn ?? me.on);
  const mOff = Math.max(mOn + 1, me.off);
  // re-reference the averaged beat to its own PR window where that is isoelectric (f / F waves and noise average out
  // there); the per-beat template level follows, so template subtraction stays consistent
  STD_LEADS.forEach((l, li) => {
    const x = med[l];
    let s = 0, k = 0, lo = Infinity, hi = -Infinity;
    for (let i = Math.max(0, mOn - hold(30)); i <= Math.max(0, mOn - hold(10)); i++) {
      s += x[i];
      k++;
      lo = Math.min(lo, x[i]);
      hi = Math.max(hi, x[i]);
    }
    if (!k || hi - lo > 0.04) return;
    const z = s / k;
    for (let i = 0; i < x.length; i++) x[i] -= z;
    for (const b of beats) b.tbase = b.tbase.map((v, j) => (j === li ? v + z : v));
  });
  // fibrillation (irregular, no P before most beats): f waves are partly phase-locked to the conducted QRS, so the
  // averaged PR window is biased; the reference becomes the median TQ level (previous T end + 40 ms … QRS − 20 ms),
  // over which the f waves average out
  if (irregular && beats.filter((b) => b.pOn !== null).length <= beats.length / 2) {
    STD_LEADS.forEach((l, li) => {
      const lv: number[] = [];
      for (let j = 1; j < beats.length; j++) {
        const b = beats[j], p = beats[j - 1];
        if (p.tOff === null || !use.includes(b)) continue;
        const a = Math.ceil(p.tOff) + hold(40), z = b.qrsOn - hold(20);
        if (z - a < hold(120)) continue;
        let s = 0;
        for (let i = a; i < z; i++) s += L[l][i];
        lv.push(s / (z - a) - b.tbase[li]);
      }
      if (lv.length < 3) return;
      const z = median(lv);
      const x = med[l];
      for (let i = 0; i < x.length; i++) x[i] -= z;
      for (const b of beats) b.tbase = b.tbase.map((v, j) => (j === li ? v + z : v));
    });
  }
  // beats that match the representative morphology (correlation ≥ 0.8 over the QRS, 8 independent leads) take their
  // QRS edges from it; other beats (ectopic, aberrant) keep the detector's edges
  for (const b of beats) {
    const a0 = al.get(b)! - pre;
    if (a0 + mOn < 0 || a0 + mOff >= n) continue;
    let sxy = 0, sxx = 0, syy = 0;
    for (const l of IND) {
      const li = STD_LEADS.indexOf(l);
      for (let k = mOn; k <= mOff; k++) {
        const x = L[l][al.get(b)! - pre + k] - b.base[li], y = med[l][k];
        sxy += x * y;
        sxx += x * x;
        syy += y * y;
      }
    }
    if (sxy / Math.sqrt(Math.max(1e-12, sxx * syy)) >= 0.8) {
      b.qrsOn = al.get(b)! - pre + mOn;
      b.qrsOff = al.get(b)! - pre + mOff;
      b.base = STD_LEADS.map((_, li) => levelAt(b, li, b.qrsOn));
    }
  }
  const prs = beats.filter((b) => b.pOn !== null).map((b) => ms(b.qrsOn - b.pOn!));
  const prMean = prs.length ? prs.reduce((a, b) => a + b, 0) / prs.length : NaN;
  const prSd = prs.length > 1 ? Math.sqrt(prs.reduce((a, b) => a + (b - prMean) ** 2, 0) / prs.length) : null;
  // irregular rhythms: the QT follows each beat's RR, so the representative QT is the median of the per-beat QTs
  // (the T of an averaged beat would be smeared)
  const qts = beats.filter((b) => b.tOff !== null).map((b) => ms(b.tOff! - b.qrsOn));
  const tOffs = use.filter((b) => b.tOff !== null).map((b) => b.tOff! - al.get(b)!);
  const mT = tOffs.length ? pre + Math.round(median(tOffs)) : null;
  const pOns = use.filter((b) => b.pOn !== null).map((b) => b.pOn! - al.get(b)!);
  // P onset on the median beat, only when a P precedes most beats; the search starts after the previous T
  const gaps = use.map((b) => {
    const k = beats.indexOf(b);
    const pt = k > 0 ? beats[k - 1].tOff : null;
    return pt === null ? NaN : b.qrsOn - pt;
  }).filter(Number.isFinite);
  const pLo = Math.max(2, gaps.length ? mOn - Math.round(median(gaps)) : 2);
  const mP = pOns.length > use.length / 2 ? (pOnsetIn(P_LEADS.map((l) => med[l]), pLo, mOn, fs, tune.pThr) ?? pre + Math.round(median(pOns))) : null;
  // P offset: the spatial P amplitude (against the level at its onset) falls back under 13 % of its peak
  let mPoff: number | null = null;
  if (mP !== null) {
    const z = P_LEADS.map((l) => med[l][mP]);
    const pa = (i: number): number => Math.hypot(...P_LEADS.map((l, j) => med[l][i] - z[j]));
    let pk = mP, pv = 0;
    for (let i = mP; i < mOn - hold(10); i++) if (pa(i) > pv) {
      pv = pa(i);
      pk = i;
    }
    let i = pk;
    while (i < mOn - hold(10) && pa(i) > 0.13 * pv) i++;
    mPoff = i;
  }
  /** area of a lead over [a, b] against its level just before a (mean of a − 15 … a − 5 ms) */
  const areaFrom = (l: StdLead, a: number, b: number): number => {
    const i0 = Math.max(0, Math.floor(a) - hold(15)), i1 = Math.max(i0, Math.floor(a) - hold(5));
    let z = 0;
    for (let i = i0; i <= i1; i++) z += med[l][i];
    z /= i1 - i0 + 1;
    let s = 0;
    for (let i = Math.max(0, Math.floor(a)); i <= Math.min(len - 1, Math.ceil(b)); i++) s += med[l][i] - z;
    return s;
  };
  const area = (l: StdLead, a: number, b: number): number => {
    let s = 0;
    for (let i = Math.max(0, Math.floor(a)); i <= Math.min(len - 1, Math.ceil(b)); i++) s += med[l][i];
    return s;
  };
  const netOf = (l: StdLead): number => {
    let mx = 0, mn = 0;
    for (let i = mOn; i <= mOff; i++) {
      mx = Math.max(mx, med[l][i]);
      mn = Math.min(mn, med[l][i]);
    }
    return mx + mn;
  };
  // QT on the median beat (criteria.md `qtc-bazett`, tangent method): qtMs in the lead with the largest T (the
  // convention of the synthetic truth: the dominant primary T); qtMaxMs = the latest end among leads with a clear T
  // ("the lead with the longest QT"), which exceeds it by the QT dispersion
  let qtMed: number | null = null;
  let qtMax: number | null = null;
  {
    // T window: after the J point, ending before the next beat's P (median per-beat T end + 120 ms at most)
    const t0 = mOff + hold(40);
    const t1 = Math.min(len - 2, mT !== null ? mT + hold(120) : len - 2);
    const ends: { end: number; amp: number; peak: number }[] = [];
    for (const l of IND) {
      const e = tangentEnd(med[l], t0, t1, fs);
      if (e) ends.push(e);
    }
    const big = Math.max(0, ...ends.map((e) => e.amp));
    const dom = ends.find((e) => e.amp === big);
    // same T wave: a clear T whose peak lies within 100 ms of the dominant T peak
    const ok = ends.filter((e) => e.amp >= Math.max(0.08, 0.3 * big) && dom && Math.abs(e.peak - dom.peak) <= hold(100));
    if (ok.length) qtMax = ms(Math.max(...ok.map((e) => e.end)) - mOn);
    if (dom) qtMed = ms(dom.end - mOn);
  }
  const feats = {} as Record<StdLead, LeadFeat>;
  for (const l of STD_LEADS) feats[l] = leadFeatures(med[l], mOn, mOff, mT, mP, fs);
  // reported RR from the template-aligned positions (the curvature fiducial of a wide QRS can jump between peaks); a
  // beat of another morphology (capture, fusion, ectopic) has no meaningful alignment to the template: its position
  // is its own delineated onset + the template's fiducial offset
  const inUse = new Set(use), fit = new Set(fitting);
  const sameMorph = (b: BeatMeas): boolean => clusters.length <= 1 || inUse.has(b) || (!fit.has(b) && use.length > 0 && corr(use[0], b) >= 0.8);
  const alignOf = new Map(beats.map((b) => [b.fid, sameMorph(b) ? b.align : b.qrsOn + fidOff]));
  const pos = stripFids.map((x) => alignOf.get(x) ?? x);
  const rrA = pos.slice(1).map((p, i) => ms(p - pos[i]));
  const mrrA = rrA.length ? rrA.reduce((a, b) => a + b, 0) / rrA.length : NaN;
  const sdA = rrA.length ? Math.sqrt(rrA.reduce((a, b) => a + (b - mrrA) ** 2, 0) / rrA.length) : NaN;
  return {
    fs,
    beats,
    hrBpm: 60000 / mrrA,
    rrMs: rrA,
    rrCv: sdA / mrrA,
    prMs: mP !== null && use.filter((b) => b.pOn !== null).length > use.length / 2 ? ms(mOn - mP) : null,
    prSdMs: prSd,
    qrsMs: ms(mOff - mOn),
    qtMs: irregular && qts.length >= 4 ? median(qts) : (qtMed ?? (qts.length ? median(qts) : null)),
    qtMaxMs: qtMax,
    axisDeg: hexDeg(netOf('I'), netOf('aVF')),
    axisAreaDeg: hexDeg(area('I', mOn, mOff), area('aVF', mOn, mOff)),
    // P area against the level at the P onset (the TP level): a short PR leaves no isoelectric PR segment
    pAxisDeg: mP !== null ? hexDeg(areaFrom('I', mP, mPoff ?? mOn - 0.02 * fs), areaFrom('aVF', mP, mPoff ?? mOn - 0.02 * fs)) : null,
    tAxisDeg: mT !== null ? hexDeg(area('I', mOff, mT), area('aVF', mOff, mT)) : null,
    median: med,
    medianAlign: pre,
    medianOn: mOn,
    medianOff: mOff,
    medianTOff: mT,
    medianPOn: mP,
    medianPOff: mPoff,
    feats,
    fused: fids.length ? nFused / fids.length : 0,
    spikes,
    dominant: use,
  };
}

/**
 * Tangent-method T end of one lead of the median beat (level 0 = PR level): the tangent at the steepest descent after
 * the T peak, intersected with the baseline. Returns the end (fractional sample) and |T peak|, or null.
 */
export function tangentEnd(x: Float32Array, from: number, to: number, fs: number): { end: number; amp: number; peak: number } | null {
  let ti = -1, tv = 0;
  for (let i = from; i <= to; i++) if (Math.abs(x[i]) > Math.abs(tv)) {
    tv = x[i];
    ti = i;
  }
  if (ti < 0 || Math.abs(tv) < 0.03) return null;
  const sg = Math.sign(tv);
  const h = Math.max(1, Math.round(0.004 * fs));
  let mi = -1, mslope = 0;
  for (let i = ti + h; i < Math.min(to, x.length - 1 - h); i++) {
    const d = (-sg * (x[i + h] - x[i - h])) / (2 * h);
    if (d > mslope) {
      mslope = d;
      mi = i;
    }
    if (sg * x[i] < 0.1 * Math.abs(tv)) break;
  }
  if (mi < 0 || mslope <= 0) return null;
  return { end: mi + (sg * x[mi]) / mslope, amp: Math.abs(tv), peak: ti };
}

/**
 * P onset in [lo, hi) of three leads (II, V1, I): spatial amplitude against the isoelectric level of the quietest
 * 30 ms stretch before the P peak; onset = last crossing of max(thr × P peak, 1.5 × the stretch's noise) walking back
 * from the peak. Null without a clear P (peak < 0.04 mV or < 3 × noise).
 */
export function pOnsetIn(leads: readonly Float32Array[], lo: number, qrsOn: number, fs: number, thr: number): number | null {
  const hold = (m: number): number => Math.max(1, Math.round((m * fs) / 1000));
  const hi = qrsOn - hold(20);
  const w = hold(30);
  if (hi - lo < hold(60)) return null;
  // 1. provisional P peak against the window median (robust to where the isoelectric stretch is)
  const medOf = (y: Float32Array): number => {
    const v = Array.from(y.subarray(lo, hi + 1)).sort((p, q) => p - q);
    return v[v.length >> 1];
  };
  const r0 = leads.map(medOf);
  const amp0 = (i: number): number => Math.hypot(...leads.map((y, j) => y[i] - r0[j]));
  let pk0 = -1, pv0 = 0;
  for (let i = lo + w; i <= hi; i++) if (amp0(i) > pv0) {
    pv0 = amp0(i);
    pk0 = i;
  }
  if (pk0 < 0) return null;
  // 2. isoelectric reference: the quietest 30 ms stretch before that peak (sum of |slope| over the three leads)
  const qEnd = pk0 - hold(20);
  let qi = -1, qv = Infinity;
  for (let i = lo; i + w <= qEnd; i++) {
    let a = 0;
    for (let k = i + 1; k < i + w; k++) for (const y of leads) a += Math.abs(y[k] - y[k - 1]);
    if (a < qv) {
      qv = a;
      qi = i;
    }
  }
  const r = qi < 0 ? r0 : leads.map((y) => {
    let t = 0;
    for (let k = qi; k < qi + w; k++) t += y[k];
    return t / w;
  });
  const start = qi < 0 ? lo : qi;
  const amp = (i: number): number => Math.hypot(...leads.map((y, j) => y[i] - r[j]));
  let noise = 0;
  if (qi >= 0) for (let k = qi; k < qi + w; k++) noise = Math.max(noise, amp(k));
  let pk = -1, pv = 0;
  for (let i = start + (qi < 0 ? 0 : w); i <= hi; i++) if (amp(i) > pv) {
    pv = amp(i);
    pk = i;
  }
  if (pk < 0 || pv < 0.04 || pv < 3 * noise) return null;
  // a visible P: ≥ 0.05 mV in II or V1 (the first two leads) near its peak — the truth's visibility rule
  let lead = 0;
  for (let j = Math.max(start, pk - hold(30)); j <= Math.min(hi, pk + hold(30)); j++) lead = Math.max(lead, Math.abs(leads[0][j] - r[0]), Math.abs(leads[1][j] - r[1]));
  if (lead < 0.05) return null;
  const t = Math.max(thr * pv, 1.5 * noise);
  // 3. walk back from the peak until the amplitude falls under the threshold, or stops falling for 10 ms (a residual
  // T tail or a drifting baseline: the P starts at that local floor)
  const flat = hold(10);
  let i = pk, floor = pk, run = 0;
  while (i > start && amp(i) > t) {
    i--;
    if (amp(i) < amp(floor)) {
      floor = i;
      run = 0;
    } else if (++run >= flat) {
      i = floor;
      break;
    }
  }
  // refine: the tangent at the steepest rise of the P, intersected with the level at that point (a P that rises from
  // a T / U tail starts where its upstroke leaves the tail, not where the tail and the upstroke meet)
  const h = Math.max(1, hold(4));
  let k = -1, sl = 0;
  for (let j = i + h; j <= pk - h; j++) {
    const d = (amp(j + h) - amp(j - h)) / (2 * h);
    if (d > sl) {
      sl = d;
      k = j;
    }
  }
  if (k < 0 || sl <= 0) return i;
  const tan = k - (amp(k) - amp(i)) / sl;
  return Math.max(start, Math.min(i, Math.round(tan)));
}

function leadFeatures(x: Float32Array, on: number, off: number, tEnd: number | null, pOn: number | null, fs: number): LeadFeat {
  const ms = (i: number): number => (i * 1000) / fs;
  let p = 0, pNeg = 0;
  if (pOn !== null) for (let i = pOn; i < on - 0.02 * fs; i++) {
    p = Math.max(p, x[i]);
    pNeg = Math.min(pNeg, x[i]);
  }
  const ext: { i: number; v: number }[] = [];
  for (let i = on + 1; i < off; i++) {
    const v = x[i];
    if ((v > x[i - 1] && v >= x[i + 1]) || (v < x[i - 1] && v <= x[i + 1])) {
      if (Math.abs(v) < 0.03) continue;
      const last = ext[ext.length - 1];
      if (last && Math.sign(last.v) === Math.sign(v)) {
        if (Math.abs(v) > Math.abs(last.v)) ext[ext.length - 1] = { i, v };
      } else ext.push({ i, v });
    }
  }
  let q = 0, r = 0, s = 0, r2 = 0, rPeak = on, qEnd = on;
  let morph = '';
  let seenR = false, seenS = false;
  for (const e of ext) {
    const big = Math.abs(e.v) >= 0.5;
    if (e.v > 0) {
      if (!seenR) {
        r = e.v;
        rPeak = e.i;
        seenR = true;
        morph += big ? 'R' : 'r';
      } else {
        r2 = Math.max(r2, e.v);
        rPeak = e.i;
        morph += big ? "R'" : "r'";
      }
    } else if (!seenR) {
      q = e.v;
      morph += big ? 'Q' : 'q';
    } else {
      if (!seenS || e.v < s) s = Math.min(s, e.v);
      seenS = true;
      morph += big ? 'S' : 's';
    }
  }
  if (!seenR && q < 0) morph = 'QS';
  // q duration: from QRS onset to the zero crossing after the q nadir
  if (q < 0) {
    let i = on;
    while (i < off && x[i] > -0.01) i++;
    while (i < off && x[i] <= 0) i++;
    qEnd = i;
  }
  const j = x[Math.min(x.length - 1, off)];
  const st60 = x[Math.min(x.length - 1, off + Math.round(0.06 * fs))];
  let t = 0, ti = off;
  const t0 = off + Math.round(0.06 * fs);
  const t1 = tEnd !== null ? Math.round(tEnd) : Math.min(x.length - 1, off + Math.round(0.35 * fs));
  let tMin = 0, tMax = 0;
  for (let i = t0; i <= t1 && i < x.length; i++) {
    if (Math.abs(x[i]) > Math.abs(t)) {
      t = x[i];
      ti = i;
    }
    tMin = Math.min(tMin, x[i]);
    tMax = Math.max(tMax, x[i]);
  }
  let a = ti, b = ti;
  while (a > off && Math.abs(x[a]) > Math.abs(t) / 2) a--;
  while (b < x.length - 1 && Math.abs(x[b]) > Math.abs(t) / 2) b++;
  let qa = 0, mx = 0, mn = 0;
  for (let i = on; i <= off; i++) {
    qa += x[i];
    mx = Math.max(mx, x[i]);
    mn = Math.min(mn, x[i]);
  }
  let sEnd = rPeak, sStart = -1;
  for (let i = rPeak; i <= off + Math.round(0.01 * fs) && i < x.length; i++) {
    if (x[i] < -0.05) {
      if (sStart < 0) sStart = i;
      sEnd = i;
    }
  }
  let maxSl = 1e-9, init = 0;
  const n30 = Math.round(0.03 * fs);
  for (let i = on + 1; i < off; i++) {
    const sl = Math.abs(x[i + 1] - x[i - 1]);
    maxSl = Math.max(maxSl, sl);
    if (i <= on + n30) init += sl / n30;
  }
  // notches: slope reversals inside the QRS whose excursion exceeds 0.05 mV
  let notches = 0, lastExt = x[on], dirUp = x[on + 1] >= x[on];
  for (let i = on + 1; i < off; i++) {
    const up = x[i + 1] >= x[i];
    if (up !== dirUp) {
      if (Math.abs(x[i] - lastExt) > 0.05) notches++;
      lastExt = x[i];
      dirUp = up;
    }
  }
  return {
    p, pNeg, q, qDur: q < 0 ? ms(qEnd - on) : 0, r, s, r2, morph: morph || '-', rPeakMs: ms(rPeak - on), j, st60, t, tMin, tMax,
    tAsym: (ti - a) / Math.max(1, b - ti), tFwhm: ms(b - a), qrsArea: (qa * 1000) / fs, sDur: sStart < 0 ? 0 : ms(sEnd - sStart),
    init30: init / maxSl, net: mx + mn, p2p: mx - mn, notches,
  };
}

/**
 * Atrial activity between ventricular complexes (T end + 40 ms … next QRS onset − 20 ms): troughs of a lead with
 * prominence > 0.04 mV; median trough-to-trough interval, the cycle implied by zero crossings, the median p2p, and
 * negRatio = (median − min) / (max − median) summed over windows (> 1: deflections point downward, as the negative
 * sawtooth of typical flutter in II).
 */
export function atrialActivity(L: Leads, m: Measurement, lead: StdLead, polarity: 1 | -1): { cycleMs: number | null; zcCycleMs: number | null; p2p: number; count: number; negRatio: number } {
  const fs = m.fs;
  const x = L[lead];
  const ints: number[] = [];
  const p2ps: number[] = [];
  let count = 0, span = 0, crossings = 0, neg = 0, pos = 0;
  for (let b = 0; b + 1 < m.beats.length; b++) {
    const bt = m.beats[b];
    const nx = m.beats[b + 1];
    const a = Math.round((bt.tOff ?? bt.qrsOff + 0.3 * fs) + 0.04 * fs);
    const z = nx.qrsOn - Math.round(0.02 * fs);
    if (z - a < 0.15 * fs) continue;
    let lo = Infinity, hi = -Infinity;
    const ex: number[] = [];
    for (let i = a + 2; i < z - 2; i++) {
      const v = polarity * x[i];
      lo = Math.min(lo, x[i]);
      hi = Math.max(hi, x[i]);
      if (v < polarity * x[i - 1] && v <= polarity * x[i + 1] && v < polarity * x[i - 2] && v <= polarity * x[i + 2]) {
        const w = Math.round(0.1 * fs);
        let l = -Infinity, r = -Infinity;
        for (let k = Math.max(a, i - w); k < i; k++) l = Math.max(l, polarity * x[k]);
        for (let k = i + 1; k <= Math.min(z, i + w); k++) r = Math.max(r, polarity * x[k]);
        if (Math.min(l, r) - v > 0.04) ex.push(i);
      }
    }
    count += ex.length;
    span += ((z - a) * 1000) / fs;
    let mean = 0;
    for (let i = a; i < z; i++) mean += x[i];
    mean /= z - a;
    const sorted = Array.from(x.subarray(a, z)).sort((p, q) => p - q);
    const md = sorted[sorted.length >> 1];
    neg += md - sorted[0];
    pos += sorted[sorted.length - 1] - md;
    let state = 0;
    for (let i = a; i < z; i++) {
      const v = x[i] - mean;
      const s2 = v > 0.01 ? 1 : v < -0.01 ? -1 : 0;
      if (s2 !== 0 && s2 !== state) {
        if (state !== 0) crossings++;
        state = s2;
      }
    }
    for (let k = 1; k < ex.length; k++) ints.push(((ex[k] - ex[k - 1]) * 1000) / fs);
    p2ps.push(hi - lo);
  }
  const cycleMs = ints.length >= 5 ? median(ints) : count >= 5 ? span / count : null;
  return { cycleMs, zcCycleMs: crossings >= 6 ? (2 * span) / crossings : null, p2p: p2ps.length ? median(p2ps) : 0, count, negRatio: neg / Math.max(1e-9, pos) };
}

/**
 * P waves hidden in a dissociated rhythm (C's technique): subtract the median QRST template from each beat, then find
 * peaks of |II| + |V1| in the residual (≥ 0.04 mV, ≥ 200 ms apart). Returns P peak times (ms).
 */
export function residualPWaves(L: Leads, m: Measurement): number[] {
  const fs = m.fs;
  const n = L.I.length;
  const res = { II: Float32Array.from(L.II), V1: Float32Array.from(L.V1) };
  const pre = m.medianAlign;
  const len = m.median.I.length;
  // each beat subtracts its QRST only, from its QRS onset (− 10 ms) up to the next beat's: at fast rates the template
  // windows of neighbouring beats overlap and must not be subtracted twice
  const k0 = Math.max(0, m.medianOn - Math.round(0.01 * fs));
  // synth-rhythm M3: the template is valid for beats of the dominant morphology at the dominant cycle only. A beat of
  // another morphology (capture, fusion, ectopic) or a premature / late one of the same morphology (its T is shortened
  // or lengthened by restitution and the rate law) is masked from its onset to its own T end + 40 ms instead of
  // subtracted, so its ST-T leaves no residual that could pass for a P wave
  const rrBefore = (j: number): number | null => (j > 0 ? m.beats[j].qrsOn - m.beats[j - 1].qrsOn : null);
  const domRr = median(m.beats.map((_, j) => (m.dominant.includes(m.beats[j]) ? rrBefore(j) : null)).filter((x): x is number => x !== null));
  const kk0 = Math.max(0, m.medianOn - Math.round(0.01 * fs)), kk1 = Math.min(len - 1, m.medianOff + Math.round(0.01 * fs));
  const matches = m.beats.map((b, j) => {
    let sxy = 0, sxx = 0, syy = 0;
    for (const l of IND) {
      const li = STD_LEADS.indexOf(l);
      for (let k = kk0; k <= kk1; k++) {
        const i = b.align - pre + k;
        if (i < 0 || i >= n) continue;
        const x = L[l][i] - (b.tbase[li] ?? b.base[li]), y = m.median[l][k];
        sxy += x * y;
        sxx += x * x;
        syy += y * y;
      }
    }
    if (sxy / Math.sqrt(Math.max(1e-12, sxx * syy)) < 0.8) return false;
    const rr = rrBefore(j);
    return rr === null || !Number.isFinite(domRr) || Math.abs(rr - domRr) <= 0.15 * domRr;
  });
  m.beats.forEach((b, j) => {
    if (!matches[j]) return;
    const next = m.beats[j + 1];
    // up to where the next beat's own subtraction starts, or (a masked beat, whose template alignment is unreliable)
    // to its QRS onset − 10 ms
    const stop = !next ? Infinity : matches[j + 1] ? next.align - pre + k0 : next.qrsOn - Math.round(0.01 * fs);
    for (const l of ['II', 'V1'] as const) {
      const li = STD_LEADS.indexOf(l);
      for (let k = k0; k < len; k++) {
        const i = b.align - pre + k;
        if (i >= stop) break;
        if (i >= 0 && i < n) res[l][i] -= m.median[l][k] + (b.tbase[li] ?? b.base[li]);
      }
    }
  });
  const masked = new Uint8Array(n);
  m.beats.forEach((b, j) => {
    if (matches[j]) return;
    const next = m.beats[j + 1];
    // its own T end, but no later than 1.1 × the dominant QT (a P right after the T would otherwise be taken for it)
    const cap = b.qrsOn + Math.round(((m.qtMs !== null ? 1.1 * m.qtMs : 450) * fs) / 1000);
    const end = Math.min(b.tOff !== null ? b.tOff : cap, cap) + Math.round(0.04 * fs);
    const stop = Math.min(n, next ? next.qrsOn - Math.round(0.01 * fs) : n, end);
    for (let i = Math.max(0, b.qrsOn - Math.round(0.01 * fs)); i < stop; i++) masked[i] = 1;
  });
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) e[i] = masked[i] ? 0 : Math.abs(res.II[i]) + Math.abs(res.V1[i]);
  const out: number[] = [];
  const minGap = Math.round(0.2 * fs);
  const win = Math.round(0.03 * fs);
  for (let i = win; i < n - win; i++) {
    let isMax = true;
    for (let k = -win; k <= win && isMax; k++) if (e[i + k] > e[i]) isMax = false;
    if (!isMax || e[i] < 0.06) continue;
    // a P that overlaps a QRS (± 10 ms) anywhere along its extent (residual above 10 % of its peak, ≤ 80 ms each
    // side) is not visible — the truth's rule — and the template residual there is unreliable anyway
    let a = i, z = i;
    while (a > 0 && i - a < Math.round(0.08 * fs) && e[a - 1] > 0.1 * e[i]) a--;
    while (z < n - 1 && z - i < Math.round(0.08 * fs) && e[z + 1] > 0.1 * e[i]) z++;
    const pad = Math.round(0.01 * fs);
    if (m.beats.some((b) => a <= b.qrsOff + pad && z >= b.qrsOn - pad)) continue;
    // synth-rhythm M3: a peak in the last 20 ms before a QRS onset, or within 20 ms of a masked stretch, is the edge of
    // a complex the template does not explain (a visible P peaks ≥ 40 ms after its onset and ≥ 60 ms before the QRS)
    if (m.beats.some((b) => i >= b.qrsOn - 2 * pad && i < b.qrsOn)) continue;
    let nearMask = false;
    for (let k = Math.max(0, i - 2 * pad); k <= Math.min(n - 1, i + 2 * pad) && !nearMask; k++) nearMask = masked[k] === 1;
    if (nearMask) continue;
    const t = (i * 1000) / fs;
    if (out.length && i - Math.round((out[out.length - 1] * fs) / 1000) < minGap) continue;
    out.push(t);
  }
  return out;
}

/**
 * QRS of a flutter recording read on the F-subtracted signal (prototype C's technique, DECISION §2.2.5):
 * y(t) = x(t) − x(t − c) cancels the periodic F waves inside the QRS window when the stretch one atrial cycle earlier
 * holds only F waves (3:1 and slower). c starts at `cycleMs` (from atrialActivity) and is refined (± 12 ms) by
 * minimising the residual in the F-only stretch before each QRS. Returns the QRS duration and the net-deflection axis
 * of the averaged F-free QRS, or null when the windows do not fit.
 */
export interface FSubtracted {
  readonly qrsMs: number;
  readonly axisDeg: number;
  readonly cycleMs: number;
  /** the averaged F-free beat (index of its QRS onset: on) and its PR-level per lead */
  readonly template: Readonly<Record<StdLead, Float32Array>>;
  readonly on: number;
  readonly level: Readonly<Record<StdLead, number>>;
}

export function fSubtractedQrs(L: Leads, m: Measurement, cycleMs: number): FSubtracted | null {
  const fs = m.fs;
  const n = L.I.length;
  const hold = (x: number): number => Math.max(1, Math.round((x * fs) / 1000));
  const pre = m.medianAlign;
  const k0 = m.medianOn - hold(60), k1 = m.medianOff + hold(80);
  // refine the cycle on the F-only stretch before each QRS
  let best = Math.round((cycleMs * fs) / 1000), bestR = Infinity;
  for (let c = best - hold(12); c <= best + hold(12); c++) {
    let r = 0;
    for (const b of m.beats) {
      const on = b.qrsOn;
      for (let i = on - hold(120); i < on - hold(20); i++) {
        if (i - c < 0) continue;
        for (const l of IND) r += (L[l][i] - L[l][i - c]) ** 2;
      }
    }
    if (r < bestR) {
      bestR = r;
      best = c;
    }
  }
  const c = best;
  const use = m.beats.filter((b) => b.align - pre + k0 - c >= 0 && b.align - pre + k1 < n);
  if (use.length < 2) return null;
  const len = k1 - k0 + 1;
  const Y = {} as Record<StdLead, Float32Array>;
  for (const l of STD_LEADS) {
    const y = new Float32Array(len);
    for (let k = 0; k < len; k++) {
      y[k] = median(use.map((b) => {
        const i = b.align - pre + k0 + k;
        return L[l][i] - L[l][i - c];
      }));
    }
    Y[l] = y;
  }
  const w3 = Math.max(1, Math.round(0.006 * fs));
  const S = slopeEnergy(Y, w3), S1 = slopeEnergy(Y, 1), E = hfEnergy(Y, fs);
  let f = hold(60);
  for (let i = hold(40); i < len - hold(40); i++) if (E[i] > E[f]) f = i;
  const e = qrsEdges(S, S1, E, f, fs, DEFAULT_TUNE);
  const level = (x: Float32Array): number => {
    let s = 0, k = 0;
    for (let i = Math.max(0, e.on - hold(30)); i <= Math.max(0, e.on - hold(10)); i++) {
      s += x[i];
      k++;
    }
    return k ? s / k : 0;
  };
  const net = (x: Float32Array): number => {
    const z = level(x);
    let mx = 0, mn = 0;
    for (let i = e.on; i <= e.off; i++) {
      mx = Math.max(mx, x[i] - z);
      mn = Math.min(mn, x[i] - z);
    }
    return mx + mn;
  };
  const lv = Object.fromEntries(STD_LEADS.map((l) => [l, level(Y[l])])) as Record<StdLead, number>;
  return { qrsMs: ((e.off - e.on) * 1000) / fs, axisDeg: hexDeg(net(Y.I), net(Y.aVF)), cycleMs: (c * 1000) / fs, template: Y, on: e.on, level: lv };
}

/**
 * Flutter F-wave cancellation: the signal outside the ventricular complexes (QRS onset − 20 ms … T end + 40 ms) is
 * folded modulo the atrial cycle (refined ± 6 % by the folded variance it explains), the folded F template is
 * subtracted everywhere, and what remains is the ventricular activity. Valid for a stable flutter cycle.
 */
export function cancelFlutter(L: Leads, m: Measurement, cycleMs: number): { leads: Leads; cycleMs: number } | null {
  const fs = m.fs;
  const n = L.I.length;
  const free = new Uint8Array(n).fill(1);
  m.beats.forEach((b, j) => {
    const next = m.beats[j + 1];
    const end = b.tOff !== null ? b.tOff + 0.04 * fs : Math.min(n, b.qrsOn + 0.45 * fs, next ? next.qrsOn : n);
    for (let i = Math.max(0, b.qrsOn - Math.round(0.02 * fs)); i < Math.min(n, Math.round(end)); i++) free[i] = 0;
  });
  const bins = (c: number): number => Math.max(8, Math.round((c * fs) / 1000));
  const fold = (x: Float32Array, c: number): { tpl: Float64Array; resid: number } => {
    const nb = bins(c);
    const per = (c * fs) / 1000;
    const sum = new Float64Array(nb), cnt = new Float64Array(nb);
    for (let i = 0; i < n; i++) if (free[i]) {
      const k = Math.floor(((i % per) / per) * nb) % nb;
      sum[k] += x[i];
      cnt[k]++;
    }
    const tpl = sum.map((s, k) => (cnt[k] ? s / cnt[k] : 0));
    let resid = 0;
    for (let i = 0; i < n; i++) if (free[i]) resid += (x[i] - tpl[Math.floor(((i % per) / per) * nb) % nb]) ** 2;
    return { tpl, resid };
  };
  let best = cycleMs, bestR = Infinity;
  for (let c = 0.94 * cycleMs; c <= 1.06 * cycleMs; c += 0.25) {
    let r = 0;
    for (const l of ['II', 'V1', 'aVF'] as const) r += fold(L[l], c).resid;
    if (r < bestR) {
      bestR = r;
      best = c;
    }
  }
  if (!Number.isFinite(bestR)) return null;
  const per = (best * fs) / 1000, nb = bins(best);
  const out = {} as Record<StdLead, Float32Array>;
  for (const l of STD_LEADS) {
    const { tpl } = fold(L[l], best);
    out[l] = L[l].map((v, i) => v - tpl[Math.floor(((i % per) / per) * nb) % nb]);
  }
  return { leads: out, cycleMs: best };
}

/**
 * Fibrillation readings against each beat's TQ mean (no PR segment; f waves are partly phase-locked to the conducted QRS
 * through the AV node, so an averaged PR window is biased). Per beat the reference is the mean of its TQ stretch
 * (previous T end + 40 ms … QRS onset − 20 ms, ≥ 120 ms), over which the f waves average out.
 *  - st: the value afterOnsetMs after each beat's QRS onset minus that reference, median over beats;
 *  - stSe: the standard error of that median from the f-wave RMS in the TQ stretches (1.25 σ / √n): the oracle's own
 *    uncertainty, since the random f value at the instant does not average out over a 10 s strip;
 *  - tAxisDeg: T area axis from the per-beat T windows (QRS offset … T end), TQ-referenced and summed over beats.
 * Null with fewer than 3 usable beats.
 */
export function tqReferenced(L: Leads, m: Measurement, afterOnsetMs: number): { st: Record<StdLead, number>; stSe: Record<StdLead, number>; tAxisDeg: number | null } | null {
  const fs = m.fs;
  const hold = (x: number): number => Math.max(1, Math.round((x * fs) / 1000));
  const vals = Object.fromEntries(STD_LEADS.map((l) => [l, [] as number[]])) as Record<StdLead, number[]>;
  const rms = Object.fromEntries(STD_LEADS.map((l) => [l, [] as number[]])) as Record<StdLead, number[]>;
  let aI = 0, aF = 0;
  for (let k = 1; k < m.beats.length; k++) {
    const b = m.beats[k], p = m.beats[k - 1];
    if (p.tOff === null) continue;
    const a = Math.ceil(p.tOff) + hold(40), z = b.qrsOn - hold(20);
    const at = b.qrsOn + hold(afterOnsetMs);
    if (z - a < hold(120) || at >= L.I.length) continue;
    for (const l of STD_LEADS) {
      let s = 0, s2 = 0;
      for (let i = a; i < z; i++) s += L[l][i];
      const lv = s / (z - a);
      for (let i = a; i < z; i++) s2 += (L[l][i] - lv) ** 2;
      vals[l].push(L[l][at] - lv);
      rms[l].push(Math.sqrt(s2 / (z - a)));
      if (b.tOff !== null && (l === 'I' || l === 'aVF')) {
        let ar = 0;
        for (let i = b.qrsOff; i <= Math.min(L.I.length - 1, Math.round(b.tOff)); i++) ar += L[l][i] - lv;
        if (l === 'I') aI += ar;
        else aF += ar;
      }
    }
  }
  if (vals.I.length < 3) return null;
  const n = vals.I.length;
  const st = Object.fromEntries(STD_LEADS.map((l) => [l, median(vals[l])])) as Record<StdLead, number>;
  const stSe = Object.fromEntries(STD_LEADS.map((l) => [l, (1.25 * median(rms[l])) / Math.sqrt(n)])) as Record<StdLead, number>;
  return { st, stSe, tAxisDeg: Math.hypot(aI, aF) > 0 ? hexDeg(aI, aF) : null };
}

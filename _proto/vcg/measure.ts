/**
 * Signal-side measurement (independent of the model's truth): QRS detection, onsets/offsets, tangent-method T end,
 * P onset, frontal axis and a per-lead feature table on the median beat. Noise-free input is assumed (baseline = 0 mV,
 * the model's resting level); a real-data version would estimate the PR-segment baseline.
 */
import { LEADS, type LeadName } from './leads.ts';

export type Leads = Record<LeadName, Float32Array>;
const IND: readonly LeadName[] = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export type BeatMeas = { fid: number; qrsOn: number; qrsOff: number; tOff: number | null; pOn: number | null };
export type LeadFeat = {
  p: number; pNeg: number; q: number; r: number; s: number; r2: number; morph: string; rPeakMs: number;
  j: number; st60: number; t: number; tAsym: number; qrsArea: number;
  /** width (ms) of the terminal negative deflection after the last R peak */
  sDur: number;
  /** mean |slope| over the first 30 ms of the QRS relative to the max |slope| in the QRS (delta-wave index) */
  init30: number;
  /** full width at half amplitude of T (ms) */
  tFwhm: number;
  /** most negative / most positive value in the T window (J + 60 ms .. T end) */
  tMin: number;
  tMax: number;
};
export type Measurement = {
  beats: BeatMeas[];
  hrBpm: number;
  rrCv: number;
  prMs: number | null;
  /** SD of the beat-to-beat "PR" (whatever atrial deflection precedes each QRS): small for conducted P waves */
  prSdMs: number | null;
  qrsMs: number;
  qtMs: number | null;
  axisDeg: number;
  pAxisDeg: number | null;
  tAxisDeg: number | null;
  median: Leads;
  medianOn: number; // sample index of QRS onset in the median beat
  medianOff: number;
  medianTOff: number | null;
  medianPOn: number | null;
  feats: Record<LeadName, LeadFeat>;
  /** fraction of beats with no quiet (low slope and low curvature) segment before them */
  fused: number;
};

function slopeEnergy(L: Leads, w = 3): Float64Array {
  const n = L.I.length;
  const s = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) {
    let a = 0;
    for (const l of IND) a += Math.abs(L[l][i + 1]! - L[l][i - 1]!);
    s[i] = a;
  }
  // moving average ±w samples (w = 3: 14 ms at 500 Hz)
  const out = new Float64Array(n);
  for (let i = w; i < n - w; i++) {
    let a = 0;
    for (let k = -w; k <= w; k++) a += s[i + k]!;
    out[i] = a / (2 * w + 1);
  }
  return out;
}

/** curvature energy: Σ over 8 leads of |x[i+k] − 2x[i] + x[i−k]| (k = 8 ms), smoothed ±6 ms. QRS lobes are short
 *  (σ ≈ 10 ms) and score high; P, T and ST (σ ≥ 30 ms) score low even when tall or overlapping. */
function hfEnergy(L: Leads, fs: number): Float64Array {
  const n = L.I.length;
  const k = Math.max(1, Math.round(0.008 * fs));
  const e = new Float64Array(n);
  for (const l of IND) {
    const x = L[l];
    for (let i = k; i < n - k; i++) e[i] = e[i]! + Math.abs(x[i + k]! - 2 * x[i]! + x[i - k]!);
  }
  const out = new Float64Array(n);
  const w = Math.round(0.006 * fs);
  for (let i = w; i < n - w; i++) {
    let a = 0;
    for (let j = -w; j <= w; j++) a += e[i + j]!;
    out[i] = a / (2 * w + 1);
  }
  return out;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length === 0 ? NaN : s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * @param windows optional QRS windows (ms) to use instead of automatic delineation — only for rhythms where QRS and T
 *   fuse with no quiet segment (e.g. VT at 170/min), which `measure` reports through `fused`.
 */
export function measure(L: Leads, fs: number, windows?: readonly { qrsOnMs: number; qrsOffMs: number }[]): Measurement {
  const n = L.I.length;
  const ms = (i: number): number => (i * 1000) / fs;
  const S = slopeEnergy(L);
  // lightly smoothed (±1 sample) copy for the P→delta junction guard: the ±3-sample average can erase the shallow slope
  // minimum where a P wave's descent hands over to a delta wave with no PR segment
  const S1 = slopeEnergy(L, 1);
  const E = hfEnergy(L, fs);
  let emax = 0;
  for (let i = 0; i < n; i++) emax = Math.max(emax, E[i]!);
  // fiducials: local maxima of the high-frequency energy (QRS has much more HF content than P or T) above 30 % of
  // the record maximum, merged within 200 ms
  const fids: number[] = [];
  const ref = Math.round(0.2 * fs);
  let clusterStart = -Infinity;
  for (let i = 1; i < n - 1; i++) {
    if (E[i]! < 0.3 * emax || E[i]! < E[i - 1]! || E[i]! < E[i + 1]!) continue;
    if (i - clusterStart < ref) {
      const last = fids[fids.length - 1]!;
      if (E[i]! > E[last]!) fids[fids.length - 1] = i;
    } else {
      fids.push(i);
      clusterStart = i;
    }
  }
  // T-wave discrimination (Pan & Tompkins 1985): a candidate within 360 ms of the previous accepted complex whose peak
  // broadband slope is < 50 % of that complex's is a T wave (tall peaked T in hyperkalaemia has QRS-like curvature).
  const peakS = (f: number): number => {
    let v = 0;
    for (let i = Math.max(0, f - Math.round(0.03 * fs)); i <= Math.min(n - 1, f + Math.round(0.03 * fs)); i++) v = Math.max(v, S[i]!);
    return v;
  };
  for (let k = 1; k < fids.length; k++) {
    const prev = fids[k - 1]!;
    if (fids[k]! - prev < 0.36 * fs && peakS(fids[k]!) < 0.5 * peakS(prev)) {
      fids.splice(k, 1);
      k--;
    }
  }
  const beats: BeatMeas[] = [];
  let nFused = 0;
  // Delineation: broadband slope energy S must stay below 4 % (onset, 12 ms) / 6 % (offset, 16 ms) of the beat's peak.
  // Guards: onset stops at a slope minimum (a P wave running straight into a delta wave, no PR segment); offset is
  // capped 10 ms after the last sample where the curvature energy E exceeds 6 % of its beat peak (a T wave that starts
  // before the QRS has ended — LBBB, VT — has low curvature, so it cannot drag the J point into the T wave).
  const hold = (ms_: number): number => Math.round((ms_ * fs) / 1000);
  for (const f of fids) {
    let sp = 0, ep = 0;
    for (let i = Math.max(0, f - hold(60)); i <= Math.min(n - 1, f + hold(60)); i++) { sp = Math.max(sp, S[i]!); ep = Math.max(ep, E[i]!); }
    let firstE = f;
    for (let i = f; i > Math.max(1, f - hold(200)); i--) {
      if (E[i]! > 0.06 * ep) firstE = i;
      else if (firstE - i > hold(40)) break;
    }
    let on = f, c = 0, lmin = -1;
    const onLimit = Math.max(1, firstE - hold(10));
    while (on > onLimit && c < hold(12)) {
      on--;
      c = S[on]! < 0.04 * sp ? c + 1 : 0;
      if (lmin < 0 && f - on > hold(20) && on <= firstE && S1[on]! < 0.08 * sp && S1[on]! <= S1[on - 1]! && S1[on]! <= S1[on + 1]! && S1[on - 1]! > S1[on]! * 1.02) lmin = on;
    }
    if (c >= hold(12)) on += hold(12) - 1 + 3; // + MA half-width: S is smoothed ±3 samples, so it rises before the signal does
    if (lmin > on) on = lmin;
    let lastE = f;
    for (let i = f; i < Math.min(n - 1, f + hold(200)); i++) {
      if (E[i]! > 0.06 * ep) lastE = i;
      else if (i - lastE > hold(40)) break;
    }
    let off = f;
    c = 0;
    while (off < n - 2 && c < hold(16)) { off++; c = S[off]! < 0.06 * sp ? c + 1 : 0; }
    off -= hold(16) - 1 + 3; // − MA half-width (see onset)
    off = Math.min(off, lastE - hold(4)); // E is spread ≈ 14 ms beyond the last sharp corner (8 ms second difference + 6 ms smoothing)
    // quiet segment before this beat?
    // quiet = at least 30 ms of low slope and low curvature (a real baseline segment, not just the apex of a T wave)
    let quiet = false;
    const prevF = fids[fids.indexOf(f) - 1];
    let run = 0;
    for (let i = prevF !== undefined ? prevF + hold(60) : Math.max(1, f - hold(400)); i < f - hold(20) && !quiet; i++) {
      run = S[i]! < 0.1 * sp && E[i]! < 0.1 * ep ? run + 1 : 0;
      if (run >= hold(30)) quiet = true;
    }
    if (!quiet) nFused++;
    if (on < 0.05 * fs || off > n - 0.05 * fs) continue; // incomplete at the strip edges
    beats.push({ fid: f, qrsOn: on, qrsOff: off, tOff: null, pOn: null });
  }
  if (windows) {
    beats.length = 0;
    for (const w of windows) {
      const on = Math.round((w.qrsOnMs * fs) / 1000), off = Math.round((w.qrsOffMs * fs) / 1000);
      if (on < 0.05 * fs || off > n - 0.05 * fs) continue;
      beats.push({ fid: Math.round((on + off) / 2), qrsOn: on, qrsOff: off, tOff: null, pOn: null });
    }
  }
  // T end (tangent method) on the lead with the largest T, per beat
  for (let b = 0; b < beats.length; b++) {
    const bt = beats[b]!;
    const next = beats[b + 1];
    const w0 = bt.qrsOff + Math.round(0.04 * fs);
    const w1 = Math.min(n - 2, next ? next.qrsOn - Math.round(0.01 * fs) : bt.qrsOn + Math.round(0.65 * fs), bt.qrsOn + Math.round(0.65 * fs));
    if (w1 - w0 < 0.08 * fs) continue;
    let best: { lead: LeadName; i: number; v: number } | null = null;
    for (const l of ['II', 'V2', 'V3', 'V4', 'V5', 'V6', 'I', 'V1'] as const) {
      for (let i = w0; i <= w1; i++) {
        const v = L[l][i]!;
        if (!best || Math.abs(v) > Math.abs(best.v)) best = { lead: l, i, v };
      }
    }
    if (!best || Math.abs(best.v) < 0.05) continue;
    const x = L[best.lead];
    const sg = Math.sign(best.v);
    let mi = best.i, mslope = 0;
    for (let i = best.i; i < Math.min(w1 + Math.round(0.1 * fs), n - 1); i++) {
      const d = (x[i + 1]! - x[i - 1]!) * sg * -1;
      if (d > mslope) {
        mslope = d;
        mi = i;
      }
      if (sg * x[i]! < 0.02) break;
    }
    if (mslope <= 0) continue;
    const slopePerSample = mslope / 2;
    const tEnd = mi + (sg * x[mi]!) / slopePerSample;
    bt.tOff = tEnd;
  }
  // P onset: spatial amplitude in a window before QRS onset
  for (let b = 0; b < beats.length; b++) {
    const bt = beats[b]!;
    const prev = beats[b - 1];
    const lo = Math.max(1, bt.qrsOn - Math.round(0.33 * fs), prev && prev.tOff !== null ? Math.ceil(prev.tOff) + 1 : 1);
    const hi = bt.qrsOn - Math.round(0.02 * fs);
    if (hi - lo < 0.04 * fs) continue;
    const amp = (i: number): number => Math.hypot(L.II[i]!, L.V1[i]!, L.I[i]!);
    let pk = lo, pv = 0;
    for (let i = lo; i <= hi; i++) if (amp(i) > pv) { pv = amp(i); pk = i; }
    if (pv < 0.04) continue;
    let i = pk;
    while (i > lo && amp(i) > 0.1 * pv) i--;
    if (i > lo) bt.pOn = i;
  }
  // RR from the QRS energy peaks (fiducials): robust to a P wave that happens to sit on a QRS onset (AV dissociation)
  const rr = beats.slice(1).map((b, i) => ms(b.fid - beats[i]!.fid));
  const mrr = rr.reduce((a, b) => a + b, 0) / Math.max(1, rr.length);
  const sd = Math.sqrt(rr.reduce((a, b) => a + (b - mrr) ** 2, 0) / Math.max(1, rr.length));
  const prs = beats.filter((b) => b.pOn !== null).map((b) => ms(b.qrsOn - b.pOn!));
  const prMean = prs.reduce((a, b) => a + b, 0) / Math.max(1, prs.length);
  const prSd = Math.sqrt(prs.reduce((a, b) => a + (b - prMean) ** 2, 0) / Math.max(1, prs.length));
  const qts = beats.filter((b) => b.tOff !== null).map((b) => ms(b.tOff! - b.qrsOn));

  // median beat aligned on QRS onset
  const minRr = rr.length ? Math.min(...rr) : 800;
  const pre = Math.round((Math.min(400, 0.6 * minRr) * fs) / 1000);
  const post = Math.round((Math.min(700, 0.95 * minRr) * fs) / 1000);
  const len = pre + post;
  const med = {} as Leads;
  const use = beats.filter((b) => b.qrsOn - pre >= 0 && b.qrsOn + post < n);
  for (const l of LEADS) {
    const m = new Float32Array(len);
    for (let k = 0; k < len; k++) m[k] = median(use.map((b) => L[l][b.qrsOn - pre + k]!));
    med[l] = m;
  }
  const mOn = pre;
  const mOff = pre + median(use.map((b) => b.qrsOff - b.qrsOn));
  const tOffs = use.filter((b) => b.tOff !== null).map((b) => b.tOff! - b.qrsOn);
  const mT = tOffs.length ? pre + Math.round(median(tOffs)) : null;
  const pOns = use.filter((b) => b.pOn !== null).map((b) => b.pOn! - b.qrsOn);
  const mP = pOns.length > use.length / 2 ? pre + Math.round(median(pOns)) : null;

  const area = (l: LeadName, a: number, b: number): number => {
    let s = 0;
    for (let i = Math.max(0, Math.floor(a)); i <= Math.min(len - 1, Math.ceil(b)); i++) s += med[l][i]!;
    return s;
  };
  const axis = (a: number, b: number): number => (Math.atan2(area('aVF', a, b), area('I', a, b)) * 180) / Math.PI;
  const feats = {} as Record<LeadName, LeadFeat>;
  for (const l of LEADS) feats[l] = leadFeatures(med[l], mOn, Math.round(mOff), mT, mP, fs);
  return {
    beats,
    hrBpm: 60000 / mrr,
    rrCv: sd / mrr,
    prMs: prs.length > beats.length / 2 ? median(prs) : null,
    prSdMs: prs.length > 1 ? prSd : null,
    qrsMs: median(beats.map((b) => ms(b.qrsOff - b.qrsOn))),
    qtMs: qts.length ? median(qts) : null,
    axisDeg: axis(mOn, mOff),
    pAxisDeg: mP !== null ? axis(mP, mOn - 0.03 * fs) : null,
    tAxisDeg: mT !== null ? axis(mOff + 0.04 * fs, mT) : null,
    median: med,
    medianOn: mOn,
    medianOff: mOff,
    medianTOff: mT,
    medianPOn: mP,
    feats,
    fused: nFused / Math.max(1, fids.length),
  };
}

function leadFeatures(x: Float32Array, on: number, off: number, tEnd: number | null, pOn: number | null, fs: number): LeadFeat {
  const ms = (i: number): number => (i * 1000) / fs;
  let p = 0, pNeg = 0;
  if (pOn !== null) for (let i = pOn; i < on - 0.02 * fs; i++) { p = Math.max(p, x[i]!); pNeg = Math.min(pNeg, x[i]!); }
  // QRS extrema sequence
  const ext: { i: number; v: number }[] = [];
  for (let i = on + 1; i < off; i++) {
    const v = x[i]!;
    if ((v > x[i - 1]! && v >= x[i + 1]!) || (v < x[i - 1]! && v <= x[i + 1]!)) {
      if (Math.abs(v) < 0.03) continue;
      const last = ext[ext.length - 1];
      if (last && Math.sign(last.v) === Math.sign(v)) {
        if (Math.abs(v) > Math.abs(last.v)) ext[ext.length - 1] = { i, v };
      } else ext.push({ i, v });
    }
  }
  let q = 0, r = 0, s = 0, r2 = 0, rPeak = on;
  let morph = '';
  let seenR = false, seenS = false;
  for (const e of ext) {
    const big = Math.abs(e.v) >= 0.5;
    if (e.v > 0) {
      if (!seenR) { r = e.v; rPeak = e.i; seenR = true; morph += big ? 'R' : 'r'; }
      else { r2 = Math.max(r2, e.v); rPeak = e.i; morph += big ? "R'" : "r'"; }
    } else if (!seenR) { q = e.v; morph += big ? 'Q' : 'q'; }
    else { if (!seenS || e.v < s) s = Math.min(s, e.v); seenS = true; morph += big ? 'S' : 's'; }
  }
  if (!seenR && q < 0) morph = 'QS';
  const j = x[Math.min(x.length - 1, off)]!;
  const st60 = x[Math.min(x.length - 1, off + Math.round(0.06 * fs))]!;
  let t = 0, ti = off;
  const t0 = off + Math.round(0.06 * fs);
  const t1 = tEnd !== null ? Math.round(tEnd) : Math.min(x.length - 1, off + Math.round(0.35 * fs));
  let tMin = 0, tMax = 0;
  for (let i = t0; i <= t1 && i < x.length; i++) {
    if (Math.abs(x[i]!) > Math.abs(t)) { t = x[i]!; ti = i; }
    tMin = Math.min(tMin, x[i]!);
    tMax = Math.max(tMax, x[i]!);
  }
  // T asymmetry: (time from half-amplitude on the way up to peak) / (peak to half-amplitude on the way down)
  let a = ti, b = ti;
  while (a > off && Math.abs(x[a]!) > Math.abs(t) / 2) a--;
  while (b < x.length - 1 && Math.abs(x[b]!) > Math.abs(t) / 2) b++;
  let qa = 0;
  for (let i = on; i <= off; i++) qa += x[i]!;
  let sEnd = rPeak, sStart = -1;
  for (let i = rPeak; i <= off + Math.round(0.01 * fs) && i < x.length; i++) {
    if (x[i]! < -0.05) { if (sStart < 0) sStart = i; sEnd = i; }
  }
  const sDur = sStart < 0 ? 0 : ms(sEnd - sStart);
  let maxSl = 1e-9, init = 0;
  const n30 = Math.round(0.03 * fs);
  for (let i = on + 1; i < off; i++) {
    const sl = Math.abs(x[i + 1]! - x[i - 1]!);
    maxSl = Math.max(maxSl, sl);
    if (i <= on + n30) init += sl / n30;
  }
  return {
    p, pNeg, q, r, s, r2, morph: morph || '-', rPeakMs: ms(rPeak - on), j, st60, t, tAsym: (ti - a) / Math.max(1, b - ti),
    qrsArea: (qa * 1000) / fs, sDur, init30: init / maxSl, tFwhm: ms(b - a), tMin, tMax,
  };
}

/** Atrial activity between ventricular complexes (T end + 40 ms .. next QRS onset − 20 ms): troughs of a lead with
 *  prominence > 0.04 mV; returns the median trough-to-trough interval (ms), the cycle implied by zero crossings, the
 *  median peak-to-peak amplitude and negRatio = (median − min) / (max − median) summed over windows (> 1: the
 *  deflections point downward, as the negative sawtooth of typical flutter in II). */
export function atrialActivity(L: Leads, fs: number, m: Measurement, lead: LeadName, polarity: 1 | -1): { cycleMs: number | null; zcCycleMs: number | null; p2p: number; count: number; negRatio: number } {
  const x = L[lead];
  const ints: number[] = [];
  const p2ps: number[] = [];
  let count = 0;
  let span = 0;
  let crossings = 0;
  let neg = 0, pos = 0;
  for (let b = 0; b + 1 < m.beats.length; b++) {
    const bt = m.beats[b]!;
    const nx = m.beats[b + 1]!;
    const a = Math.round((bt.tOff ?? bt.qrsOff + 0.3 * fs) + 0.04 * fs);
    const z = nx.qrsOn - Math.round(0.02 * fs);
    if (z - a < 0.15 * fs) continue;
    let lo = Infinity, hi = -Infinity;
    const ex: number[] = [];
    for (let i = a + 2; i < z - 2; i++) {
      const v = polarity * x[i]!;
      lo = Math.min(lo, x[i]!);
      hi = Math.max(hi, x[i]!);
      if (v < polarity * x[i - 1]! && v <= polarity * x[i + 1]! && v < polarity * x[i - 2]! && v <= polarity * x[i + 2]!) {
        // prominence: rise on both sides within 60 ms
        const w = Math.round(0.1 * fs);
        let l = -Infinity, r = -Infinity;
        for (let k = Math.max(a, i - w); k < i; k++) l = Math.max(l, polarity * x[k]!);
        for (let k = i + 1; k <= Math.min(z, i + w); k++) r = Math.max(r, polarity * x[k]!);
        if (Math.min(l, r) - v > 0.04) ex.push(i);
      }
    }
    count += ex.length;
    span += ((z - a) * 1000) / fs;
    // zero crossings of the de-meaned window with ±0.01 mV hysteresis (two per cycle of a quasi-periodic baseline)
    let mean = 0;
    for (let i = a; i < z; i++) mean += x[i]!;
    mean /= z - a;
    const sorted = Array.from(x.subarray(a, z)).sort((p, q) => p - q);
    const med = sorted[sorted.length >> 1]!;
    neg += med - sorted[0]!;
    pos += sorted[sorted.length - 1]! - med;
    let state = 0;
    for (let i = a; i < z; i++) {
      const v = x[i]! - mean;
      const s2 = v > 0.01 ? 1 : v < -0.01 ? -1 : 0;
      if (s2 !== 0 && s2 !== state) {
        if (state !== 0) crossings++;
        state = s2;
      }
    }
    for (let k = 1; k < ex.length; k++) ints.push(((ex[k]! - ex[k - 1]!) * 1000) / fs);
    p2ps.push(hi - lo);
  }
  // cycle: median trough-to-trough interval when windows hold several troughs; otherwise the mean cycle implied by the
  // trough density (window time / troughs) — at ventricular rates near 100/min a TQ window holds only one or two f waves
  const cycleMs = ints.length >= 5 ? median(ints) : count >= 5 ? span / count : null;
  return { cycleMs, zcCycleMs: crossings >= 6 ? (2 * span) / crossings : null, p2p: p2ps.length ? median(p2ps) : 0, count, negRatio: neg / Math.max(1e-9, pos) };
}

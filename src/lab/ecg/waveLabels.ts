/**
 * Interval measurement and wave labelling — pure. Measurements follow the plan's method (validation §3):
 *   QRS onset / J point from the spatial velocity |dH/dt| (quiet for ≥ 10 ms), T end by the tangent method on |H|.
 * Labels (P, Q, R, S, T, J) are placed from the model-truth windows widened by the measured QRS, at local extrema of
 * the lead; Q and S only when deeper than 0.03 mV (detection floor used by the oracles, disease-spec normal reference).
 * Intervals are global (one measurement per beat from H, as on a 12-lead cart), never per lead.
 */
import type { CycleTruth, WaveSegment } from '../sim/types';

/** Q / S / R detection floor (mV). */
export const QRS_WAVE_MIN_MV = 0.03;
/** P / T labelling floor (mV) — flatter waves are left unlabelled. */
export const PT_WAVE_MIN_MV = 0.02;
/** Quiet run required at QRS onset and the J point (ms). */
export const QUIET_MS = 10;
/** Relative |dH/dt| threshold for the QRS boundaries (fraction of the QRS peak speed). */
export const QRS_SPEED_FRAC = 0.04;
/** Relative |dH/dt| threshold for the P boundaries (fraction of the P peak speed; the P wave is slow). */
export const P_SPEED_FRAC = 0.1;

export interface HWindow {
  /** Absolute time of sample 0 (ms). */
  readonly t0: number;
  /** Sample spacing (ms). */
  readonly dt: number;
  readonly n: number;
  /** Total heart vector H = H_A + H_V, Frank, 3·n interleaved. */
  readonly H: Float32Array;
}

export interface MeasuredBeat {
  readonly pOn: number | null;
  readonly pOff: number | null;
  readonly qrsOn: number | null;
  /** J point. */
  readonly qrsOff: number | null;
  readonly tPeak: number | null;
  readonly tEnd: number | null;
  readonly prMs: number | null;
  readonly qrsMs: number | null;
  readonly qtMs: number | null;
}

export const segSpan = (c: CycleTruth, seg: WaveSegment): { t0: number; t1: number } | null => {
  const s = c.segments.find((x) => x.seg === seg);
  return s ? { t0: s.t0, t1: s.t1 } : null;
};

const clampI = (i: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, i));

/** Spatial speed |dH/dt| (mV/ms), central difference, 5-sample moving average. */
export function spatialSpeed(w: HWindow): Float32Array {
  const { n, H, dt } = w;
  const raw = new Float32Array(n);
  for (let i = 1; i < n - 1; i++) {
    const a = 3 * (i - 1), b = 3 * (i + 1);
    raw[i] = Math.hypot(H[b] - H[a], H[b + 1] - H[a + 1], H[b + 2] - H[a + 2]) / (2 * dt);
  }
  if (n > 1) {
    raw[0] = raw[1];
    raw[n - 1] = raw[n - 2];
  }
  return movingAverage(raw, 5);
}

export function movingAverage(x: ArrayLike<number>, k: number): Float32Array {
  const n = x.length, h = k >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(n - 1, i + h); j++) {
      s += x[j];
      c++;
    }
    out[i] = s / c;
  }
  return out;
}

export function measureBeat(w: HWindow, truth: CycleTruth): MeasuredBeat {
  const { t0, dt, n } = w;
  const idx = (t: number) => clampI(Math.round((t - t0) / dt), 0, n - 1);
  const time = (i: number) => t0 + i * dt;
  const sp = spatialSpeed(w);
  const quiet = Math.max(1, Math.round(QUIET_MS / dt));

  let qrsOn: number | null = null, qrsOff: number | null = null;
  if (truth.qrsOn !== null) {
    const iA = idx(truth.qrsOn - 30), iB = idx((truth.qrsOff ?? truth.qrsOn + 120) + 30);
    let iPk = iA, sMax = 0;
    for (let i = iA; i <= iB; i++) if (sp[i] > sMax) { sMax = sp[i]; iPk = i; }
    const thr = Math.max(QRS_SPEED_FRAC * sMax, 1e-6);
    const quietFrom = (i: number, dir: 1 | -1) => {
      for (let k = 0; k < quiet; k++) {
        const j = i + dir * k;
        if (j < 0 || j >= n || sp[j] >= thr) return false;
      }
      return true;
    };
    // Bounded scans: a tall P (short PR) or the T upstroke must never be taken as a QRS boundary.
    const iLo = Math.max(quiet, iA - 20), iHi = Math.min(n - quiet, iB + 50);
    for (let i = iPk; i >= iLo; i--) if (quietFrom(i, -1)) { qrsOn = time(i); break; }
    for (let i = iPk; i < iHi; i++) if (quietFrom(i, 1)) { qrsOff = time(i); break; }
  }

  let pOn: number | null = null, pOff: number | null = null;
  if (truth.pOn !== null && truth.pOff !== null) {
    const iA = idx(truth.pOn - 30);
    let iB = idx(truth.pOff + 30);
    if (qrsOn !== null) iB = Math.min(iB, idx(qrsOn - 5));
    let sP = 0;
    for (let i = iA; i <= iB; i++) sP = Math.max(sP, sp[i]);
    const thr = Math.max(P_SPEED_FRAC * sP, 1e-7);
    for (let i = iA; i <= iB; i++) if (sp[i] >= thr) { pOn = time(i); break; }
    for (let i = iB; i >= iA; i--) if (sp[i] >= thr) { pOff = time(i); break; }
    if (sP === 0) pOn = pOff = null;
  }

  let tPeak: number | null = null, tEnd: number | null = null;
  if (qrsOn !== null && qrsOff !== null) {
    // Isoelectric reference: PR segment if measured, else the 10 ms before QRS onset.
    const bA = pOff !== null && idx(qrsOn) - idx(pOff) > 6 ? idx(pOff) + 3 : idx(qrsOn - 12);
    const bB = Math.max(bA, idx(qrsOn) - 2);
    const hb = [0, 0, 0];
    for (let i = bA; i <= bB; i++) for (let k = 0; k < 3; k++) hb[k] += w.H[3 * i + k] / (bB - bA + 1);
    const mag = new Float32Array(n);
    for (let i = 0; i < n; i++) mag[i] = Math.hypot(w.H[3 * i] - hb[0], w.H[3 * i + 1] - hb[1], w.H[3 * i + 2] - hb[2]);
    const m = movingAverage(mag, 5);
    const iA = idx(qrsOff + 40);
    const iB = idx(truth.tEnd !== null ? truth.tEnd + 100 : qrsOff + 500);
    let iTp = -1, mMax = 0;
    for (let i = iA; i <= iB; i++) if (m[i] > mMax) { mMax = m[i]; iTp = i; }
    if (iTp >= 0 && mMax > 0) {
      tPeak = time(iTp);
      // Steepest descent between the T peak and the next rise (e.g. a following P wave).
      let iStop = iB, lowest = m[iTp];
      for (let i = iTp; i <= iB; i++) {
        if (m[i] < lowest) lowest = m[i];
        if (m[i] > lowest + 0.02 * mMax) { iStop = i; break; }
      }
      let iS = -1, dMin = 0;
      for (let i = Math.max(iTp, 2); i <= Math.min(iStop, n - 3); i++) {
        const d = (m[i + 2] - m[i - 2]) / (4 * dt);
        if (d < dMin) { dMin = d; iS = i; }
      }
      if (iS >= 0 && dMin < 0) tEnd = Math.min(time(iB), Math.max(time(iS), time(iS) - m[iS] / dMin));
    }
  }

  return {
    pOn, pOff, qrsOn, qrsOff, tPeak, tEnd,
    prMs: pOn !== null && qrsOn !== null ? qrsOn - pOn : null,
    qrsMs: qrsOn !== null && qrsOff !== null ? qrsOff - qrsOn : null,
    qtMs: qrsOn !== null && tEnd !== null ? tEnd - qrsOn : null,
  };
}

// ---------------------------------------------------------------- per-lead labels

export const WAVE_KINDS = ['P', 'Q', 'R', 'S', 'QS', 'J', 'T'] as const;
export type WaveKind = (typeof WAVE_KINDS)[number];

export interface WaveLabel {
  readonly kind: WaveKind;
  /** Absolute time (ms). */
  readonly t: number;
  /** Lead value at t (mV). */
  readonly v: number;
  /** Deflection relative to the isoelectric baseline (mV). */
  readonly amp: number;
}

/**
 * Labels one lead of one beat. `samples[i]` is the lead at time t0 + i·dt.
 * Returns labels sorted by time, plus the baseline used.
 */
export function labelLead(
  samples: ArrayLike<number>,
  t0: number,
  dt: number,
  truth: CycleTruth,
  m: MeasuredBeat,
): { labels: WaveLabel[]; baseline: number } {
  const n = samples.length;
  const idx = (t: number) => clampI(Math.round((t - t0) / dt), 0, n - 1);
  const time = (i: number) => t0 + i * dt;
  const labels: WaveLabel[] = [];

  const qOn = m.qrsOn ?? truth.qrsOn;
  let baseline = 0;
  if (qOn !== null) {
    const pEnd = m.pOff ?? truth.pOff;
    let a = pEnd !== null ? idx(pEnd) + 3 : idx(qOn - 12);
    const b = idx(qOn) - 2;
    if (b - a < 4) a = idx(qOn - 12);
    let s = 0, c = 0;
    for (let i = a; i <= b; i++) { s += samples[i]; c++; }
    baseline = c ? s / c : samples[idx(qOn)];
  }
  const rel = (i: number) => samples[i] - baseline;
  const push = (kind: WaveKind, i: number) => labels.push({ kind, t: time(i), v: samples[i], amp: rel(i) });
  const extremum = (a: number, b: number, sign: 1 | -1 | 0): number => {
    let best = -1, bv = -Infinity;
    for (let i = a; i <= b; i++) {
      const r = rel(i);
      const score = sign === 0 ? Math.abs(r) : sign * r;
      if (score > bv) { bv = score; best = i; }
    }
    return best;
  };

  // P
  const pA = minNum(truth.pOn, m.pOn), pB = maxNum(truth.pOff, m.pOff);
  if (pA !== null && pB !== null && pB > pA) {
    const i = extremum(idx(pA), idx(pB), 0);
    if (i >= 0 && Math.abs(rel(i)) >= PT_WAVE_MIN_MV) push('P', i);
  }

  // QRS: truth window widened to the measured complex (the source may start a few ms before the truth onset).
  const qA = minNum(truth.qrsOn, m.qrsOn);
  const qB = m.qrsOff ?? truth.qrsOff;
  if (qA !== null && qB !== null && qB > qA) {
    const a = idx(qA - 2), b = idx(qB + 2);
    const iR = extremum(a, b, 1);
    if (iR >= 0 && rel(iR) >= QRS_WAVE_MIN_MV) {
      const iQ = iR > a ? extremum(a, iR - 1, -1) : -1;
      if (iQ >= 0 && rel(iQ) <= -QRS_WAVE_MIN_MV) {
        // A Q wave is the initial deflection: nothing positive above the floor before it.
        let initial = true;
        for (let i = a; i < iQ; i++) if (rel(i) >= QRS_WAVE_MIN_MV) { initial = false; break; }
        if (initial) push('Q', iQ);
      }
      push('R', iR);
      const iS = iR < b ? extremum(iR + 1, b, -1) : -1;
      if (iS >= 0 && rel(iS) <= -QRS_WAVE_MIN_MV) push('S', iS);
    } else {
      const iQS = extremum(a, b, -1);
      if (iQS >= 0 && rel(iQS) <= -QRS_WAVE_MIN_MV) push('QS', iQS);
    }
  }

  // J point
  if (m.qrsOff !== null) push('J', idx(m.qrsOff));

  // T
  const tTruth = segSpan(truth, 'T');
  const tA = m.qrsOff !== null ? m.qrsOff + 40 : tTruth?.t0 ?? null;
  const tB = maxNum(truth.tEnd, m.tEnd);
  if (tA !== null && tB !== null && tB > tA) {
    const i = extremum(idx(tA), idx(tB), 0);
    if (i >= 0 && Math.abs(rel(i)) >= PT_WAVE_MIN_MV) push('T', i);
  }

  labels.sort((x, y) => x.t - y.t);
  return { labels, baseline };
}

function minNum(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}
function maxNum(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

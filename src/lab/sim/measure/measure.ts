/**
 * Blind ECG measurement of one beat from the 12 leads and the heart vector (no model truth used; the window only says
 * which beat to look at). Definitions (docs/research/disease-spec.md normal_reference; plan "测量准确性"):
 *  - QRS onset: first sample after the V event where the spatial velocity |dH/dt| of H = H_A + H_V exceeds
 *    QRS_ON_FRAC × its QRS peak.
 *  - J point (QRS end): first time after the QRS peak (max |H|) where |dH/dt| stays below QRS_OFF_FRAC × peak for
 *    ≥ 10 ms.
 *  - T end: tangent method (steepest descent after the T peak, intersected with the PR baseline) on the lead with the
 *    largest T; also reported on |H| (tEndH).
 *  - P onset / offset: same velocity rule on H_A (atrial component), as allowed by the plan.
 *  - Per lead (relative to the lead's value at QRS onset; P relative to its value at P onset): q = initial negative
 *    deflection before the first positive one, counted only if ≥ 0.03 mV and ≤ 40 ms; R = max positive; S = deepest
 *    negative after the R peak (or the whole QRS if there is no R). qAmp, rAmp, sAmp are MAGNITUDES (≥ 0).
 *    ST at J and J+60 ms; T = signed extreme between J+40 ms and T end; net areas in mV·ms.
 *  - Axes: clinical frontal axis atan2(2·aVF/√3, I) from net areas (QRS, P, T).
 *  - VCG: peak |H| in QRS and T, spatial QRS–T angle between the mean (area) vectors, SVG = |∫H dt| from QRS onset to
 *    T end (mV·ms). QTc Bazett QT/√RR and Fridericia QT/∛RR (RR in s).
 */
import type { BeatMeasurement, LeadMeasure, LeadName } from '../types';
import { LEADS, PRECORDIAL_LEADS } from '../types';

export interface LeadSignals {
  /** 12 × n, lead-major in LEADS order (as SimEngine.sampleLeads). */
  readonly data: Float32Array;
  readonly n: number;
  readonly fsHz: number;
  /** Absolute time of sample 0 (ms). */
  readonly t0Ms: number;
}

export interface VectorSignals {
  /** Frank, 3·n interleaved, same timing as the leads. */
  readonly hA: Float32Array;
  readonly hV: Float32Array;
}

export interface BeatWindow {
  /** A event (SA firing) of the measured beat, or null. */
  readonly aMs: number | null;
  /** V event (His activation). */
  readonly vMs: number;
  /** Cycle length used for HR and QTc (ms). */
  readonly rrMs: number;
  /** Last sample to search for the T end (default: vMs + 0.95·RR). */
  readonly endMs?: number;
}

export interface Fiducials {
  readonly pOn: number | null;
  readonly pOff: number | null;
  readonly qrsOn: number;
  /** J point. */
  readonly qrsOff: number;
  readonly qrsPeak: number;
  readonly tPeak: number;
  /** Tangent T end on the lead with the largest T. */
  readonly tEnd: number;
  /** Tangent T end on |H|. */
  readonly tEndH: number;
  readonly tEndLead: LeadName;
}

export interface BeatMeasurementEx extends BeatMeasurement {
  readonly fiducials: Fiducials;
  /** Net P area per lead (mV·ms) and signed P extreme (mV). */
  readonly pArea: Readonly<Record<LeadName, number>>;
  /** R/S ratio per precordial lead (Infinity when S = 0). */
  readonly rsRatio: Readonly<Record<LeadName, number>>;
  /** Mean QRS / T vectors (Frank, mV·ms). */
  readonly qrsArea: readonly [number, number, number];
  readonly tArea: readonly [number, number, number];
}

export const QRS_ON_FRAC = 0.02;
export const QRS_OFF_FRAC = 0.02;
export const P_FRAC = 0.08;
export const Q_FLOOR_MV = 0.03;
export const Q_MAX_MS = 40;

const DEG = 180 / Math.PI;

export function measureBeat(leads: LeadSignals, h: VectorSignals, win: BeatWindow): BeatMeasurementEx {
  const { n, fsHz, t0Ms } = leads;
  const dt = 1000 / fsHz;
  const idx = (t: number) => Math.max(0, Math.min(n - 1, Math.round((t - t0Ms) / dt)));
  const tim = (i: number) => t0Ms + i * dt;
  const H = new Float64Array(3 * n);
  for (let i = 0; i < 3 * n; i++) H[i] = h.hA[i] + h.hV[i];
  const mag = (arr: ArrayLike<number>, i: number) => Math.hypot(arr[3 * i], arr[3 * i + 1], arr[3 * i + 2]);
  const vel = velocity(H, n, dt);
  const velA = velocity(h.hA, n, dt);

  // ---------------------------------------------------------------- QRS
  const iV = idx(win.vMs);
  const iSearchEnd = idx(win.vMs + 200);
  let pk = 0, iPkVel = iV;
  for (let i = iV; i <= iSearchEnd; i++)
    if (vel[i] > pk) {
      pk = vel[i];
      iPkVel = i;
    }
  let iOn = iV;
  while (iOn < iPkVel && vel[iOn] < QRS_ON_FRAC * pk) iOn++;
  // QRS peak = max |H| between onset and onset + 150 ms
  let iQpk = iOn, mQ = 0;
  for (let i = iOn; i <= Math.min(n - 1, iOn + Math.round(150 / dt)); i++) {
    const m = mag(H, i);
    if (m > mQ) {
      mQ = m;
      iQpk = i;
    }
  }
  const hold = Math.round(10 / dt);
  let iJ = Math.max(iQpk, iPkVel);
  for (; iJ < n - hold; iJ++) {
    let ok = true;
    for (let k = 0; k < hold; k++)
      if (vel[iJ + k] >= QRS_OFF_FRAC * pk) {
        ok = false;
        break;
      }
    if (ok) break;
  }

  // ---------------------------------------------------------------- P (atrial component)
  let pOn: number | null = null, pOff: number | null = null;
  let iPOn = -1, iPOff = -1;
  if (win.aMs !== null) {
    const i0 = idx(win.aMs - 10), i1 = Math.min(iOn, idx(win.vMs));
    let pkA = 0, iPk = i0;
    for (let i = i0; i < i1; i++)
      if (velA[i] > pkA) {
        pkA = velA[i];
        iPk = i;
      }
    if (pkA > 0) {
      let a = i0;
      while (a < iPk && velA[a] < P_FRAC * pkA) a++;
      let iMax = a, mMax = 0;
      for (let i = a; i < i1; i++) {
        const m = mag(h.hA, i);
        if (m > mMax) {
          mMax = m;
          iMax = i;
        }
      }
      let b = Math.max(iMax, iPk);
      for (; b < i1; b++) {
        let ok = true;
        for (let k = 0; k < hold && b + k < n; k++)
          if (velA[b + k] >= P_FRAC * pkA) {
            ok = false;
            break;
          }
        if (ok) break;
      }
      iPOn = a;
      iPOff = Math.min(b, i1);
      pOn = tim(iPOn);
      pOff = tim(iPOff);
    }
  }

  // ---------------------------------------------------------------- T
  const iEnd = idx(win.endMs ?? win.vMs + 0.95 * win.rrMs);
  const iT0 = Math.min(iEnd - 1, iJ + Math.round(40 / dt));
  const lead = (l: number) => leads.data.subarray(l * n, (l + 1) * n);
  const base = LEADS.map((_, l) => lead(l)[iOn]);
  const tAmpAbs = LEADS.map((_, l) => {
    const x = lead(l);
    let a = 0;
    for (let i = iT0; i < iEnd; i++) a = Math.max(a, Math.abs(x[i] - base[l]));
    return a;
  });
  const tMax = Math.max(...tAmpAbs);
  // Global T end: latest tangent end among leads whose T is ≥ half the largest (the largest-T lead always qualifies);
  // low-amplitude T waves have shallow slopes and unreliable tangents.
  const magH = new Float64Array(n), magV = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    magH[i] = mag(H, i);
    magV[i] = mag(h.hV, i);
  }
  // |H| tangent on the ventricular component so a following P wave (fast rates) cannot bias it
  const tEndH = tangentEnd(magV, 0, iT0, iEnd, dt);
  let bestL = tAmpAbs.indexOf(tMax);
  let tEndLead = tangentEnd(lead(bestL), base[bestL], iT0, iEnd, dt);
  for (let l = 0; l < 12; l++) {
    if (tAmpAbs[l] < 0.5 * tMax || l === bestL) continue;
    const te = tangentEnd(lead(l), base[l], iT0, iEnd, dt);
    if (te.valid && (!tEndLead.valid || te.tEndIdx > tEndLead.tEndIdx)) {
      tEndLead = te;
      bestL = l;
    }
  }
  // no lead has a usable descending T limb (flat / clipped T): fall back to the |H_V| tangent
  if (!tEndLead.valid && tEndH.valid) tEndLead = tEndH;
  const iTEnd = Math.min(iEnd, Math.max(iT0 + 1, Math.round(tEndLead.tEndIdx)));

  // ---------------------------------------------------------------- per-lead
  const out = {} as Record<LeadName, LeadMeasure>;
  const pArea = {} as Record<LeadName, number>;
  const rsRatio = {} as Record<LeadName, number>;
  const i60 = Math.min(n - 1, iJ + Math.round(60 / dt));
  const iQmax = iOn + Math.round(Q_MAX_MS / dt);
  for (let l = 0; l < 12; l++) {
    const x = lead(l);
    const b = base[l];
    let rAmp = 0, iR = -1;
    for (let i = iOn; i <= iJ; i++)
      if (x[i] - b > rAmp) {
        rAmp = x[i] - b;
        iR = i;
      }
    // q: the first significant deflection is negative and an R follows it within the 40 ms window
    let qAmp = 0, qDur = 0;
    let iFirst = iOn;
    while (iFirst <= iJ && Math.abs(x[iFirst] - b) < Q_FLOOR_MV) iFirst++;
    if (iFirst <= iJ && x[iFirst] - b < 0) {
      let iCross = iFirst, mn = 0;
      while (iCross <= iJ && x[iCross] - b < 0) {
        mn = Math.min(mn, x[iCross] - b);
        iCross++;
      }
      if (iCross <= iQmax && iR > iCross && rAmp >= Q_FLOOR_MV) {
        qAmp = -mn;
        qDur = (iCross - iOn) * dt;
      }
    }
    let sAmp = 0;
    const sFrom = iR >= 0 ? iR : iOn;
    for (let i = sFrom; i <= iJ; i++) sAmp = Math.max(sAmp, b - x[i]);
    if (rAmp < Q_FLOOR_MV) rAmp = Math.max(0, rAmp);
    let tAmp = 0;
    for (let i = iT0; i <= iTEnd; i++) if (Math.abs(x[i] - b) > Math.abs(tAmp)) tAmp = x[i] - b;
    let netQ = 0, netT = 0;
    for (let i = iOn; i < iJ; i++) netQ += (x[i] - b) * dt;
    for (let i = iJ; i < iTEnd; i++) netT += (x[i] - b) * dt;
    let pAmp = 0, pA = 0;
    if (iPOn >= 0) {
      const bp = x[iPOn];
      for (let i = iPOn; i <= iPOff; i++) {
        if (Math.abs(x[i] - bp) > Math.abs(pAmp)) pAmp = x[i] - bp;
        pA += (x[i] - bp) * dt;
      }
    }
    const name = LEADS[l];
    out[name] = {
      lead: name, pAmp, qAmp, qDurMs: qDur, rAmp, sAmp,
      stJ: x[iJ] - b, stJ60: x[i60] - b, tAmp, netQrsArea: netQ, netTArea: netT,
    };
    pArea[name] = pA;
    rsRatio[name] = sAmp > 0 ? rAmp / sAmp : Infinity;
  }

  // ---------------------------------------------------------------- global
  const qrsArea = integrate(H, iOn, iJ, dt);
  const tArea = integrate(H, iJ, iTEnd, dt);
  const svg = integrate(H, iOn, iTEnd, dt);
  let qrsPeak = 0, tPeak = 0, iTpk = iT0;
  for (let i = iOn; i <= iJ; i++) qrsPeak = Math.max(qrsPeak, magH[i]);
  for (let i = iJ; i <= iTEnd; i++)
    if (magH[i] > tPeak) {
      tPeak = magH[i];
      iTpk = i;
    }
  const angle = (a: readonly number[], b: readonly number[]) => {
    const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const m = Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]);
    return m > 0 ? Math.acos(Math.max(-1, Math.min(1, d / m))) * DEG : 0;
  };
  const axis = (I: number, aVF: number) => Math.atan2((2 * aVF) / Math.sqrt(3), I) * DEG;
  let transition: LeadName | null = null;
  for (const l of PRECORDIAL_LEADS)
    if (rsRatio[l] >= 1) {
      transition = l;
      break;
    }
  const qrsOn = tim(iOn), qrsOff = tim(iJ), tEnd = t0Ms + tEndLead.tEndIdx * dt;
  const qt = tEnd - qrsOn;
  const rrS = win.rrMs / 1000;
  return {
    hrBpm: 60000 / win.rrMs,
    prMs: pOn !== null ? qrsOn - pOn : NaN,
    pDurMs: pOn !== null && pOff !== null ? pOff - pOn : NaN,
    qrsMs: qrsOff - qrsOn,
    qtMs: qt,
    qtcBazettMs: qt / Math.sqrt(rrS),
    qtcFridericiaMs: qt / Math.cbrt(rrS),
    axisQrsDeg: axis(out.I.netQrsArea, out.aVF.netQrsArea),
    axisPDeg: axis(pArea.I, pArea.aVF),
    axisTDeg: axis(out.I.netTArea, out.aVF.netTArea),
    leads: out,
    transitionLead: transition,
    vcg: { qrsPeakMv: qrsPeak, tPeakMv: tPeak, qrsTAngleDeg: angle(qrsArea, tArea), svgMvMs: Math.hypot(svg[0], svg[1], svg[2]) },
    fiducials: {
      pOn, pOff, qrsOn, qrsOff, qrsPeak: tim(iQpk), tPeak: tim(iTpk), tEnd,
      tEndH: t0Ms + tEndH.tEndIdx * dt, tEndLead: LEADS[bestL],
    },
    pArea, rsRatio, qrsArea, tArea,
  };
}

function velocity(h: ArrayLike<number>, n: number, dt: number): Float64Array {
  const v = new Float64Array(n);
  for (let i = 1; i < n - 1; i++)
    v[i] = Math.hypot(h[3 * i + 3] - h[3 * i - 3], h[3 * i + 4] - h[3 * i - 2], h[3 * i + 5] - h[3 * i - 1]) / (2 * dt);
  return v;
}

function integrate(h: ArrayLike<number>, i0: number, i1: number, dt: number): [number, number, number] {
  const s: [number, number, number] = [0, 0, 0];
  for (let i = i0; i < i1; i++) {
    s[0] += h[3 * i] * dt;
    s[1] += h[3 * i + 1] * dt;
    s[2] += h[3 * i + 2] * dt;
  }
  return s;
}

/**
 * Tangent-method end of a hump in x (relative to `base`) between i0 and i1: tangent at the steepest return toward the
 * baseline after the extreme (searched only while the hump lasts, so a following P wave cannot be picked), intersected
 * with the baseline. Returns a fractional sample index; valid = a descending limb exists inside the window.
 */
export function tangentEnd(x: ArrayLike<number>, base: number, i0: number, i1: number, dt: number): { tEndIdx: number; peakIdx: number; valid: boolean } {
  let iPk = i0, best = 0;
  for (let i = i0; i < i1; i++) {
    const a = Math.abs(x[i] - base);
    if (a > best) {
      best = a;
      iPk = i;
    }
  }
  const sign = x[iPk] - base >= 0 ? 1 : -1;
  let iM = iPk, steep = 0;
  for (let i = iPk + 1; i < i1 - 1 && sign * (x[i] - base) > 0.02 * best; i++) {
    const slope = (x[i + 1] - x[i - 1]) / (2 * dt); // toward baseline = −sign
    if (-sign * slope > steep) {
      steep = -sign * slope;
      iM = i;
    }
  }
  if (steep <= 0 || iPk >= i1 - 2) return { tEndIdx: i1, peakIdx: iPk, valid: false };
  const slope = (x[iM + 1] - x[iM - 1]) / (2 * dt);
  const tEndIdx = iM + ((base - x[iM]) / slope) / dt;
  return { tEndIdx: Math.min(i1, Math.max(iPk, tEndIdx)), peakIdx: iPk, valid: tEndIdx < i1 };
}

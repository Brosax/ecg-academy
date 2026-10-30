/**
 * Signal-only measurements (no access to the model): beat detection, global QRS onset/offset, T end (tangent),
 * P onset, frontal axis, per-lead amplitudes. Used by check.ts to compare against the model's truth.
 */
export const IND = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

export interface LeadSet { [k: string]: Float32Array | number[] }

export interface MeasuredBeat {
  peak: number; // sample index
  qrsOn: number; // ms
  qrsOff: number;
  tPeak: number;
  tOff: number;
  pOn: number | null;
}

const ms = (i: number, fs: number) => (i * 1000) / fs;

/** Spatial velocity Σ|dx/dt| over the 8 independent leads (mV/ms). */
export function spatialVelocity(L: LeadSet, fs: number): Float64Array {
  const n = L.I.length;
  const sv = new Float64Array(n);
  for (const l of IND) {
    const x = L[l];
    for (let i = 1; i < n - 1; i++) sv[i] += Math.abs(x[i + 1] - x[i - 1]) * fs / 2000;
  }
  return sv;
}

/** Smooth with a centred moving average of half-width h samples. */
function smoothArr(a: Float64Array, h: number): Float64Array {
  const n = a.length;
  const o = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < Math.min(n, h); i++) s += a[i];
  for (let i = 0; i < n; i++) {
    if (i + h < n) s += a[i + h];
    if (i - h - 1 >= 0) s -= a[i - h - 1];
    const lo = Math.max(0, i - h), hi = Math.min(n - 1, i + h);
    o[i] = s / (hi - lo + 1);
  }
  return o;
}

/** Dominant cycle length (ms) of a signal from its autocorrelation between 230 and 2000 ms. */
function dominantPeriod(x: Float64Array, fs: number): number {
  const n = x.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  const lo = Math.round(0.23 * fs), hi = Math.min(n - 1, Math.round(2.0 * fs));
  let best = lo, bv = -Infinity;
  const ac = new Float64Array(hi + 1);
  for (let lag = lo; lag <= hi; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += (x[i] - mean) * (x[i + lag] - mean);
    ac[lag] = s / (n - lag);
  }
  // first strong local maximum (avoids picking a multiple of the true period)
  let gmax = -Infinity;
  for (let lag = lo; lag <= hi; lag++) gmax = Math.max(gmax, ac[lag]);
  for (let lag = lo + 1; lag < hi; lag++) {
    if (ac[lag] >= ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] > 0.6 * gmax) { best = lag; bv = ac[lag]; break; }
  }
  if (bv === -Infinity) for (let lag = lo; lag <= hi; lag++) if (ac[lag] > bv) { bv = ac[lag]; best = lag; }
  return (best * 1000) / fs;
}

/**
 * QRS detection on the spatial velocity of the 8 independent leads, smoothed over ~16 ms (slope energy, Pan–Tompkins
 * style). Refractory period adapts to the dominant cycle (0.55 × autocorrelation period, 180–300 ms), so fast regular
 * tachycardias and irregular rhythms are both handled. QRS onset / offset: the slope energy falls below
 * 8 % of the beat's peak above the local floor (10th percentile of the cycle) for 8 ms.
 */
export function detectBeats(L: LeadSet, fs: number, opts: { refractoryMs?: number; pWave?: boolean } = {}): MeasuredBeat[] {
  const n = L.I.length;
  const sv = smoothArr(spatialVelocity(L, fs), Math.round(fs * 0.008));
  // per-lead smoothed slope (for the per-lead boundary refinement)
  const ld: Record<string, Float64Array> = {};
  for (const l of IND) {
    const x = L[l];
    const d = new Float64Array(n);
    for (let i = 1; i < n - 1; i++) d[i] = Math.abs(x[i + 1] - x[i - 1]) * fs / 2000;
    ld[l] = smoothArr(d, Math.round(fs * 0.006));
  }
  const sorted = Array.from(sv).sort((a, b) => a - b);
  const hiv = sorted[Math.floor(sorted.length * 0.995)];
  const thr = 0.4 * hiv;
  const period = dominantPeriod(sv, fs);
  const refrMs = opts.refractoryMs ?? Math.max(180, Math.min(300, 0.55 * period));
  const refr = Math.round((refrMs * fs) / 1000);
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (sv[i] > thr && sv[i] >= sv[i - 1] && sv[i] >= sv[i + 1]) {
      if (peaks.length && i - peaks[peaks.length - 1] < refr) {
        if (sv[i] > sv[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = i;
      } else peaks.push(i);
    }
  }
  const out: MeasuredBeat[] = [];
  const hold = Math.round(fs * 0.008);
  for (let b = 0; b < peaks.length; b++) {
    const p = peaks[b];
    const lim0 = b > 0 ? Math.round((peaks[b - 1] + p) / 2) : Math.max(0, p - refr);
    const lim1 = b + 1 < peaks.length ? Math.round((p + peaks[b + 1]) / 2) : Math.min(n - 1, p + refr);
    // local floor: 10th percentile of the slope energy between neighbouring beats
    const seg = Array.from(sv.subarray(lim0, lim1)).sort((x, y) => x - y);
    const floor = seg[Math.floor(seg.length * 0.1)] ?? 0;
    const on = floor + 0.08 * (sv[p] - floor);
    let i = p;
    while (i > lim0) {
      let ok = true;
      for (let k = 0; k < hold; k++) if (sv[i - k] > on) { ok = false; break; }
      if (ok) break;
      i--;
    }
    let j = p;
    while (j < lim1) {
      let ok = true;
      for (let k = 0; k < hold; k++) if (sv[j + k] > on) { ok = false; break; }
      if (ok) break;
      j++;
    }
    // no quiet interval (fused T / QRS in a tachycardia): fall back to the slope-energy minimum on that side
    if (i <= lim0) { i = p; for (let k = p; k > lim0; k--) if (sv[k] < sv[i]) i = k; }
    if (j >= lim1) { j = p; for (let k = p; k < lim1; k++) if (sv[k] < sv[j]) j = k; }
    // per-lead refinement: each lead with a substantial QRS gives its own on / off (8 % of its own peak slope); the
    // global fiducials are the 3rd earliest / 3rd latest of those, so one or two leads carrying atrial waves
    // (flutter, fibrillation) cannot stretch the QRS
    const ons: number[] = [], offs: number[] = [], pk: number[] = [];
    for (const l of IND) {
      let m = 0;
      for (let k = Math.max(lim0, i - 10); k <= Math.min(lim1, j + 10); k++) m = Math.max(m, ld[l][k]);
      pk.push(m);
    }
    const pmax = Math.max(...pk);
    IND.forEach((l, li) => {
      if (pk[li] < 0.25 * pmax) return;
      const thrL = 0.08 * pk[li];
      let a = i + Math.round(0.01 * fs), z = j - Math.round(0.01 * fs);
      a = Math.min(a, p); z = Math.max(z, p);
      while (a > lim0) { let ok = true; for (let k = 0; k < hold; k++) if (ld[l][a - k] > thrL) { ok = false; break; } if (ok) break; a--; }
      while (z < lim1) { let ok = true; for (let k = 0; k < hold; k++) if (ld[l][z + k] > thrL) { ok = false; break; } if (ok) break; z++; }
      ons.push(a); offs.push(z);
    });
    if (ons.length >= 3) {
      ons.sort((x, y) => x - y); offs.sort((x, y) => y - x);
      i = ons[2]; j = offs[2];
    }
    const qOn = i, qOff = j;
    if (qOn <= 2 || qOff >= n - 3) continue;
    // T wave: spatial magnitude relative to the baseline at QRS onset; tangent at the steepest descent after the peak
    const base: Record<string, number> = {};
    for (const l of IND) base[l] = L[l][qOn] as number;
    const tEndLim = b + 1 < peaks.length ? Math.min(n - 1, peaks[b + 1] - Math.round(0.06 * fs)) : Math.min(n - 1, qOff + Math.round(0.6 * fs));
    const t0 = qOff + Math.round(0.06 * fs);
    let tPeak = NaN, tOff = NaN;
    if (tEndLim - t0 >= Math.round(0.08 * fs)) {
      const mag = new Float64Array(tEndLim - t0);
      for (let k = t0; k < tEndLim; k++) {
        let s2 = 0;
        for (const l of IND) { const d = (L[l][k] as number) - base[l]; s2 += d * d; }
        mag[k - t0] = Math.sqrt(s2);
      }
      let tp = 0;
      for (let k = 1; k < mag.length; k++) if (mag[k] > mag[tp]) tp = k;
      let sl = 0, sk = tp;
      for (let k = tp + 1; k < mag.length - 1; k++) {
        const d = (mag[k + 1] - mag[k - 1]) / 2;
        if (d < sl) { sl = d; sk = k; }
      }
      // only a T wave that returns to the baseline before the next beat is measurable
      const tOffIdx = sl < 0 ? sk + mag[sk] / -sl : Infinity;
      if (tOffIdx < mag.length) { tPeak = ms(t0 + tp, fs); tOff = ms(t0 + tOffIdx, fs); }
    }
    out.push({ peak: p, qrsOn: ms(qOn, fs), qrsOff: ms(qOff, fs), tPeak, tOff, pOn: null });
  }
  if (opts.pWave) {
    for (const bt of out) {
      const qOn = Math.round((bt.qrsOn * fs) / 1000);
      const a = Math.max(0, qOn - Math.round(0.3 * fs)), z = qOn - Math.round(0.01 * fs);
      if (z - a < Math.round(0.1 * fs)) continue;
      // baseline = mean of the first 30 ms of the search window (TP segment); P = spatial magnitude excursion
      const nb = Math.round(0.03 * fs);
      const base: Record<string, number> = {};
      for (const l of IND) { let s = 0; for (let k = a; k < a + nb; k++) s += L[l][k] as number; base[l] = s / nb; }
      const mag: number[] = [];
      for (let k = a; k < z; k++) {
        let s = 0;
        for (const l of IND) { const d = (L[l][k] as number) - base[l]; s += d * d; }
        mag.push(Math.sqrt(s));
      }
      let mx = 0, mi = 0;
      for (let k = 0; k < mag.length; k++) if (mag[k] > mx) { mx = mag[k]; mi = k; }
      if (mx < 0.03) continue;
      let k = mi;
      while (k > 0 && mag[k] > 0.1 * mx) k--;
      bt.pOn = ms(a + k, fs);
    }
  }
  return out;
}

/** Frontal QRS axis (deg) from net areas of I and aVF between onset and offset (ms). */
export function qrsAxis(L: LeadSet, fs: number, onMs: number, offMs: number): number {
  const a = Math.round((onMs * fs) / 1000), z = Math.round((offMs * fs) / 1000);
  let sI = 0, sF = 0;
  for (let i = a; i <= z; i++) { sI += (L.I[i] as number) - (L.I[a] as number); sF += (L.aVF[i] as number) - (L.aVF[a] as number); }
  return (Math.atan2(sF, sI) * 180) / Math.PI;
}

export interface LeadAmp { q: number; r: number; s: number; rPeakMs: number; j: number; st60: number; t: number; p: number; qrsArea: number }

/** Amplitudes (mV) of one lead for a beat (times in ms). Baseline = mean of the 20 ms before QRS onset. */
export function leadAmplitudes(x: Float32Array | number[], fs: number, qrsOn: number, qrsOff: number, tOff: number, pOn: number | null): LeadAmp {
  const I = (t: number) => Math.round((t * fs) / 1000);
  const a = I(qrsOn), z = I(qrsOff);
  let base = 0, nb = 0;
  for (let i = I(qrsOn - 20); i < a; i++) { base += x[i] as number; nb++; }
  base /= Math.max(1, nb);
  let r = 0, ri = a;
  for (let i = a; i <= z; i++) if ((x[i] as number) - base > r) { r = (x[i] as number) - base; ri = i; }
  let q = 0;
  for (let i = a; i < ri; i++) q = Math.min(q, (x[i] as number) - base);
  let s = 0;
  for (let i = ri; i <= z; i++) s = Math.min(s, (x[i] as number) - base);
  if (r === 0) { // QS complex
    for (let i = a; i <= z; i++) q = Math.min(q, (x[i] as number) - base);
    s = 0;
  }
  let area = 0;
  for (let i = a; i <= z; i++) area += (x[i] as number) - base;
  const j = (x[z] as number) - base;
  const st60 = (x[Math.min(x.length - 1, z + I(60))] as number) - base;
  let t = 0;
  for (let i = z + I(60); i < Math.min(x.length, I(tOff)); i++) if (Math.abs((x[i] as number) - base) > Math.abs(t)) t = (x[i] as number) - base;
  let p = 0;
  if (pOn !== null) for (let i = I(pOn); i < a - I(10); i++) if (Math.abs((x[i] as number) - base) > Math.abs(p)) p = (x[i] as number) - base;
  return { q, r, s, rPeakMs: ((ri - a) * 1000) / fs, j, st60, t, p, qrsArea: (area * 1000) / fs };
}

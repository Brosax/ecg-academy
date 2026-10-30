// measure.ts — signal-side measurements (used by check.ts and the dev scripts). Works on the leads only, using the
// truth beat list only to pick which beat to look at (not to place fiducials).
export type Leads = Record<string, Float32Array>;
export const LEAD_ORDER = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export interface Fid { pOn: number | null; qrsOn: number; qrsOff: number; tOff: number; rPeak: number; }

// global fiducials of one beat from all 12 leads: spatial velocity / magnitude based
export function fiducials(L: Leads, fs: number, approxQrsMs: number, prevQrsMs: number | null, nextQrsMs: number | null): Fid {
  const n = L.I.length; const k0 = Math.round(approxQrsMs * fs / 1000);
  const lo = Math.max(1, prevQrsMs === null ? k0 - Math.round(0.45 * fs) : Math.round((prevQrsMs + 0.45 * (approxQrsMs - prevQrsMs)) * fs / 1000));
  const hi = Math.min(n - 2, nextQrsMs === null ? k0 + Math.round(0.6 * fs) : Math.round((approxQrsMs + 0.9 * (nextQrsMs - approxQrsMs)) * fs / 1000));
  const names = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  const vel = new Float64Array(n), mag = new Float64Array(n);
  for (let k = lo; k <= hi; k++) {
    let s = 0, m = 0;
    for (const nm of names) { const x = L[nm]; const d = (x[k + 1] - x[k - 1]) * fs / 2000; s += d * d; m += x[k] * x[k]; }
    vel[k] = Math.sqrt(s); mag[k] = Math.sqrt(m);
  }
  // QRS: region around the max spatial velocity near k0
  let kmax = k0; for (let k = Math.max(lo, k0 - 40); k <= Math.min(hi, k0 + 60); k++) if (vel[k] > vel[kmax]) kmax = k;
  const vmax = vel[kmax];
  // baseline: median of mag in the 100 ms before the QRS (PR or TP)
  const thr = 0.06 * vmax;
  let on = kmax; while (on > lo + 1 && !(vel[on] < thr && vel[on - 1] < thr && vel[on - 2] < thr)) on--;
  let off = kmax; while (off < hi - 2 && !(vel[off] < thr && vel[off + 1] < thr && vel[off + 2] < thr)) off++;
  // T end: tangent method on the lead with the largest T (after QRS off + 80 ms)
  let bestLead = 'II', bestAmp = 0, bestK = off;
  const tStart = off + Math.round(0.06 * fs), tEnd = Math.min(hi, off + Math.round(0.5 * fs));
  for (const nm of LEAD_ORDER) {
    const x = L[nm]; const base = x[on];
    for (let k = tStart; k < tEnd; k++) { const a = Math.abs(x[k] - base); if (a > bestAmp) { bestAmp = a; bestLead = nm; bestK = k; } }
  }
  const x = L[bestLead]; const base = x[on];
  let steep = bestK, sl = 0;
  for (let k = bestK; k < tEnd; k++) { const d = Math.abs(x[k + 1] - x[k - 1]); if (d > sl) { sl = d; steep = k; } }
  const slope = (x[steep + 1] - x[steep - 1]) / 2;
  let tOff = steep;
  if (Math.abs(slope) > 1e-9) tOff = Math.round(steep - (x[steep] - base) / slope);
  // P onset: search back from QRS on for atrial activity in the spatial velocity
  let pOn: number | null = null;
  const pv = (k: number) => vel[k];
  let pk = -1, pmax = 0;
  for (let k = Math.max(lo, on - Math.round(0.3 * fs)); k < on - Math.round(0.03 * fs); k++) if (pv(k) > pmax) { pmax = pv(k); pk = k; }
  if (pk > 0 && pmax > 0.04 * vmax) {
    const pthr = 0.15 * pmax;
    let p = pk; while (p > lo + 1 && pv(p) > pthr) p--;
    pOn = p;
  }
  const ms = (k: number) => k * 1000 / fs;
  return { pOn: pOn === null ? null : ms(pOn), qrsOn: ms(on), qrsOff: ms(off), tOff: ms(tOff), rPeak: ms(kmax) };
}

export interface LeadMeas { q: number; r: number; s: number; rp: number; j: number; st60: number; t: number; p: number; pNeg: number; rPeakTime: number; area: number; }
// per-lead amplitudes (mV) relative to the PR/TP baseline at QRS onset
export function leadMeasures(x: Float32Array, fs: number, f: Fid): LeadMeas {
  const K = (ms: number) => Math.round(ms * fs / 1000);
  const on = K(f.qrsOn), off = K(f.qrsOff);
  const base = x[Math.max(0, on - 2)];
  let r = 0, rk = on, s = 0, q = 0, area = 0;
  for (let k = on; k <= off; k++) { const v = x[k] - base; area += v / fs * 1000; if (v > r) { r = v; rk = k; } }
  for (let k = on; k <= off; k++) { const v = x[k] - base; if (k < rk && v < q) q = v; if (k > rk && v < s) s = v; }
  // r' : second positive peak after an S
  let rp = 0; let sawS = false;
  for (let k = rk + 1; k <= off; k++) { const v = x[k] - base; if (v < -0.05 || v < r * 0.3) sawS = true; if (sawS && v > rp) rp = v; }
  const j = x[off] - base, st60 = x[Math.min(x.length - 1, off + K(60))] - base;
  let t = 0; for (let k = off + K(80); k < Math.min(x.length, K(f.tOff)); k++) { const v = x[k] - base; if (Math.abs(v) > Math.abs(t)) t = v; }
  let p = 0, pNeg = 0;
  if (f.pOn !== null) for (let k = K(f.pOn); k < on - K(10); k++) { const v = x[k] - base; if (v > p) p = v; if (v < pNeg) pNeg = v; }
  return { q, r, s, rp: sawS ? rp : 0, j, st60, t, p, pNeg, rPeakTime: (rk - on) * 1000 / fs, area };
}

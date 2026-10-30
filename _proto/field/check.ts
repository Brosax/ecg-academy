// check.ts — self-check: measures rate, PR, QRS, QT and frontal QRS axis from the generated SIGNALS (out/<id>.json)
// with a simple, independent 12-lead fiducial detector, and compares them with the model's truth (out/<id>.truth.json).
// Also verifies the lead-system identities exactly (Einthoven / Goldberger).
// usage: node check.ts [id ...]        (exit code 1 if any check fails)
import { readFileSync, existsSync } from 'node:fs';
import { CONDITIONS } from './conditions.ts';

type Leads = Record<string, number[]>;
interface TruthBeat { pOnMs: number | null; qrsOnMs: number; qrsOffMs: number; tOffMs: number; }
interface Truth { hrBpm: number; prMs: number | null; qrsMs: number; qtMs: number; qrsAxisDeg: number; rhythm: string; beats: TruthBeat[]; }

const ALL = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const IND = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']; // the 8 independent leads

function median(a: number[]): number { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; }
function mean(a: number[]): number { return a.reduce((s, v) => s + v, 0) / Math.max(1, a.length); }

// spatial velocity (mV/s) of the 8 independent leads, lightly smoothed
function spatialVelocity(L: Leads, fs: number): Float64Array {
  const n = L.I.length; const v = new Float64Array(n);
  for (let k = 1; k < n - 1; k++) { let s = 0; for (const nm of IND) { const d = (L[nm][k + 1] - L[nm][k - 1]) * fs / 2; s += d * d; } v[k] = Math.sqrt(s); }
  const o = new Float64Array(n); for (let k = 2; k < n - 2; k++) o[k] = (v[k - 2] + 2 * v[k - 1] + 3 * v[k] + 2 * v[k + 1] + v[k + 2]) / 9;
  return o;
}

// QRS detection on high-passed leads (x minus its 60 ms moving average, which suppresses P and T waves): peaks of the
// spatial velocity above 35% of its 99th percentile, 240 ms refractory
function detectQrs(L: Leads, fs: number): number[] {
  const n = L.I.length; const w = Math.round(0.03 * fs); const H: Leads = {};
  for (const nm of IND) { const x = L[nm]; const h = new Array<number>(n).fill(0); let s = 0; const c: number[] = [0]; for (let k = 0; k < n; k++) { s += x[k]; c.push(s); } for (let k = 0; k < n; k++) { const a = Math.max(0, k - w), b = Math.min(n, k + w + 1); h[k] = x[k] - (c[b] - c[a]) / (b - a); } H[nm] = h; }
  const vel = spatialVelocity(H, fs);
  const p99 = [...vel].sort((a, b) => a - b)[Math.floor(0.99 * vel.length)];
  const thr = 0.35 * p99; const ref = Math.round(0.24 * fs); const out: number[] = [];
  let k = 0;
  while (k < vel.length) {
    if (vel[k] > thr) { let best = k; for (let j = k; j < Math.min(vel.length, k + Math.round(0.08 * fs)); j++) if (vel[j] > vel[best]) best = j; out.push(best); k = best + ref; } else k++;
  }
  return out;
}

// Regular continuous atrial activity (flutter waves): a reader "marches out" the F waves and reads the QRS through
// them. Here: estimate the atrial cycle CL from the TQ segments (autocorrelation of the lead derivatives); if the
// TQ signal is strongly periodic, the QRS boundaries and the axis are measured on x(t) - x(t - CL), i.e. with the F
// wave of the previous atrial cycle (which lies in the TQ segment) subtracted. Returns CL in samples or null.
function atrialCycle(L: Leads, fs: number, pks: number[]): number | null {
  const segs: [number, number][] = [];
  for (let i = 1; i < pks.length; i++) { const a = pks[i - 1] + Math.round(0.45 * fs), b = pks[i] - Math.round(0.07 * fs); if (b - a > Math.round(0.2 * fs)) segs.push([a, b]); }
  if (segs.length < 3) return null;
  const d = (nm: string, k: number) => L[nm][k + 1] - L[nm][k - 1];
  const corr = (lag: number) => {
    let sxy = 0, sxx = 0, syy = 0;
    for (const [a, b] of segs) for (let k = a + lag + 1; k < b; k++) for (const nm of IND) { const x = d(nm, k), y = d(nm, k - lag); sxy += x * y; sxx += x * x; syy += y * y; }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  };
  let best = -1, bestLag = 0; const cs: number[] = [];
  for (let lag = Math.round(0.12 * fs); lag <= Math.round(0.35 * fs); lag++) { const c = corr(lag); cs[lag] = c; if (c > best) { best = c; bestLag = lag; } }
  if (best < 0.8) return null;
  // parabolic refinement of the peak
  const c0 = cs[bestLag - 1] ?? best, c2 = cs[bestLag + 1] ?? best; const den = c0 - 2 * best + c2;
  return bestLag + (den < 0 ? 0.5 * (c0 - c2) / den : 0);
}
function subtractCycle(L: Leads, cl: number): Leads {
  const o: Leads = {}; const i0 = Math.floor(cl), f = cl - i0;
  for (const nm of ALL) { const x = L[nm]; const y = new Array<number>(x.length).fill(0); for (let k = i0 + 1; k < x.length; k++) y[k] = x[k] - ((1 - f) * x[k - i0] + f * x[k - i0 - 1]); o[nm] = y; }
  return o;
}

interface Meas { qrsOn: number; qrsOff: number; tOff: number | null; pOn: number | null; }
// velQ: spatial velocity used for the QRS boundaries (of the F-wave-subtracted leads when cycleSub is set)
function measureBeat(L: Leads, vel: Float64Array, fs: number, pk: number, prevPk: number | null, nextPk: number | null, velQ = vel, cycleSub = false): Meas {
  const n = vel.length;
  const lo = prevPk === null ? Math.max(2, pk - Math.round(0.35 * fs)) : Math.round(prevPk + 0.55 * (pk - prevPk));
  const hi = nextPk === null ? Math.min(n - 3, pk + Math.round(0.6 * fs)) : Math.round(pk + 0.85 * (nextPk - pk));
  // local QRS velocity scale = max within +-60 ms of the detected peak; thresholds are relative to it but never below
  // 1.5x the background velocity of the neighbouring P/PR and ST-T segments (so slurred QRS parts still count)
  let vmax = 0; for (let k = Math.max(lo, pk - 30); k <= Math.min(hi, pk + 30); k++) vmax = Math.max(vmax, velQ[k]);
  const med = (a: number, b: number) => { const v: number[] = []; for (let k = Math.max(lo, a); k <= Math.min(hi, b); k++) v.push(velQ[k]); return v.length ? median(v) : 0; };
  const stEnd = nextPk === null ? pk + Math.round(0.4 * fs) : Math.min(pk + Math.round(0.4 * fs), nextPk - Math.round(0.08 * fs));
  // with the cycle subtracted, only the segments whose previous atrial cycle lies in the TQ segment are clean: the
  // 50 ms before the QRS and the early ST segment
  const thrOn = Math.max(0.025 * vmax, 1.5 * (cycleSub ? med(pk - Math.round(0.12 * fs), pk - Math.round(0.07 * fs)) : med(pk - Math.round(0.26 * fs), pk - Math.round(0.12 * fs))));
  const thrOff = Math.max(0.02 * vmax, 1.2 * (cycleSub ? med(pk + Math.round(0.09 * fs), pk + Math.round(0.13 * fs)) : med(pk + Math.round(0.16 * fs), stEnd)));
  const velP = vel; vel = velQ;
  const quietOn = Math.round(0.016 * fs), quietOff = Math.round(0.03 * fs);
  const below = (k0: number, len: number, thr: number) => { for (let j = 0; j < len; j++) if (vel[k0 + j] >= thr) return false; return true; };
  let on = pk; while (on > lo + quietOn && !below(on - quietOn + 1, quietOn, thrOn)) on--;
  on = on - quietOn + 1 + Math.round(0.006 * fs); // back to where the quiet run ends (+ a few ms of kernel tail)
  let off = pk; while (off < hi - quietOff && !below(off, quietOff, thrOff)) off++;
  // T end: lead with the largest |T| (vs the PR/TP level at QRS onset), tangent at the steepest point of the descending limb
  let tOff: number | null = null;
  const t0 = off + Math.round(0.05 * fs), t1 = Math.min(hi, off + Math.round(0.5 * fs));
  if (t1 > t0 + 10) {
    let bestLead = 'II', bestAmp = 0, bestK = t0;
    for (const nm of ALL) { const x = L[nm]; const base = x[on - 2]; for (let k = t0; k < t1; k++) { const a = Math.abs(x[k] - base); if (a > bestAmp) { bestAmp = a; bestLead = nm; bestK = k; } } }
    const x = L[bestLead]; const base = x[on - 2];
    // tangent at the steepest point of the limb that returns from the lobe peaking at pk0 towards the baseline
    const tangentEnd = (pk0: number): number | null => {
      const sgn = Math.sign(x[pk0] - base); let steep = pk0, sl = 0;
      for (let k = pk0; k < t1 - 1; k++) { if (Math.sign(x[k] - base) !== sgn) break; const d = -sgn * (x[k + 1] - x[k - 1]); if (d > sl) { sl = d; steep = k; } }
      const slope = (x[steep + 1] - x[steep - 1]) / 2;
      return Math.abs(slope) > 1e-9 ? steep - (x[steep] - base) / slope : null;
    };
    tOff = tangentEnd(bestK);
    // biphasic T (e.g. secondary T changes): if a lobe of opposite sign worth >= 35 % of the main one follows, the T
    // ends after that lobe
    // (not with continuous atrial waves, whose deflections would be taken for a second lobe)
    if (tOff !== null && !cycleSub) {
      const sgn = Math.sign(x[bestK] - base); let k2 = -1, a2 = 0;
      for (let k = Math.max(bestK, Math.floor(tOff)); k < Math.min(t1, Math.floor(tOff) + Math.round(0.15 * fs)); k++) { const a = -sgn * (x[k] - base); if (a > a2) { a2 = a; k2 = k; } }
      if (k2 > 0 && a2 >= 0.35 * bestAmp) { const t2 = tangentEnd(k2); if (t2 !== null) tOff = t2; }
    }
  }
  // P onset: search the 300 ms before the QRS for a P wave in the spatial velocity
  let pOn: number | null = null;
  let pk2 = -1, pmax = 0;
  for (let k = Math.max(lo, on - Math.round(0.3 * fs)); k < on - Math.round(0.035 * fs); k++) if (velP[k] > pmax) { pmax = velP[k]; pk2 = k; }
  if (pk2 > 0 && pmax > 0.02 * vmax) { const thr = 0.2 * pmax; let p = pk2; while (p > lo + 1 && velP[p] > thr) p--; pOn = p; }
  return { qrsOn: on, qrsOff: off, tOff, pOn };
}

interface Row { id: string; ok: boolean; lines: string[]; }
function check(id: string): Row {
  const lines: string[] = []; let ok = true;
  const fj = new URL('./out/' + id + '.json', import.meta.url), ft = new URL('./out/' + id + '.truth.json', import.meta.url);
  if (!existsSync(fj) || !existsSync(ft)) return { id, ok: false, lines: ['missing output (run node gen.ts first)'] };
  const d = JSON.parse(readFileSync(fj, 'utf8')) as { fs: number; leads: Leads };
  const tr = JSON.parse(readFileSync(ft, 'utf8')) as Truth;
  const L = d.leads, fs = d.fs, ms = (k: number) => k * 1000 / fs;
  const cmp = (name: string, meas: number | null, truth: number | null, tol: number, unit = 'ms') => {
    // a truth value the detector could not measure on the signal is a failure, not a skip
    if (meas !== null && truth !== null && Number.isNaN(meas)) { ok = false; lines.push(`  ${name.padEnd(6)} meas -  truth ${truth.toFixed(0)}  not measurable on the signal  FAIL`); return; }
    if (meas === null || truth === null || Number.isNaN(meas)) { lines.push(`  ${name.padEnd(6)} meas ${meas === null ? '-' : meas.toFixed(0)}  truth ${truth === null ? '-' : truth.toFixed(0)}  (not compared)`); return; }
    const good = Math.abs(meas - truth) <= tol; if (!good) ok = false;
    lines.push(`  ${name.padEnd(6)} meas ${meas.toFixed(0).padStart(5)}  truth ${truth.toFixed(0).padStart(5)}  tol ±${tol}${unit}  ${good ? 'ok' : 'FAIL'}`);
  };
  // 1. lead-system identities (exact up to the 1e-5 mV rounding of the JSON)
  let e1 = 0;
  for (let k = 0; k < L.I.length; k++) {
    e1 = Math.max(e1, Math.abs(L.III[k] - (L.II[k] - L.I[k])), Math.abs(L.aVR[k] + (L.I[k] + L.II[k]) / 2), Math.abs(L.aVL[k] - (L.I[k] - L.II[k] / 2)), Math.abs(L.aVF[k] - (L.II[k] - L.I[k] / 2)));
  }
  const idOk = e1 < 5e-5; if (!idOk) ok = false;
  lines.push(`  limb-lead identities  max error ${e1.toExponential(1)} mV  ${idOk ? 'ok' : 'FAIL'}`);
  // 2. beats
  const vel = spatialVelocity(L, fs); const pks = detectQrs(L, fs);
  const cl = atrialCycle(L, fs, pks);
  const Lq = cl === null ? L : subtractCycle(L, cl); const velQ = cl === null ? vel : spatialVelocity(Lq, fs);
  if (cl !== null) lines.push(`  regular atrial activity, cycle ${ms(cl).toFixed(0)} ms (${(60000 / ms(cl)).toFixed(0)}/min): QRS and axis read with the previous F-wave cycle subtracted`);
  const tb = tr.beats.filter((b) => b.qrsOnMs > 150 && b.tOffMs < ms(L.I.length) - 50);
  const pairs: { m: Meas; t: TruthBeat }[] = [];
  pks.forEach((pk, i) => {
    const m = measureBeat(L, vel, fs, pk, i > 0 ? pks[i - 1] : null, i + 1 < pks.length ? pks[i + 1] : null, velQ, cl !== null);
    const t = tb.find((b) => Math.abs(b.qrsOnMs - ms(m.qrsOn)) < 60);
    if (t) pairs.push({ m, t });
    if (t && process.env.CHECK_VERBOSE) lines.push(`    beat: QRS meas ${ms(m.qrsOn).toFixed(0)}..${ms(m.qrsOff).toFixed(0)} truth ${t.qrsOnMs.toFixed(0)}..${t.qrsOffMs.toFixed(0)}  T end meas ${m.tOff === null ? '-' : ms(m.tOff).toFixed(0)} truth ${t.tOffMs.toFixed(0)}`);
  });
  lines.push(`  beats  detected ${pks.length}  matched to truth ${pairs.length} / ${tb.length}`);
  if (pairs.length < Math.max(1, tb.length - 1)) ok = false;
  const rr = pks.slice(1).map((p, i) => ms(p - pks[i]));
  cmp('HR', rr.length ? 60000 / mean(rr) : null, tr.hrBpm, Math.max(3, 0.04 * tr.hrBpm), ' bpm');
  const pr = pairs.filter((p) => p.m.pOn !== null && p.t.pOnMs !== null).map((p) => ms(p.m.qrsOn - (p.m.pOn as number)));
  cmp('PR', tr.prMs === null ? null : (pr.length ? median(pr) : NaN), tr.prMs, 25);
  if (tr.prMs === null) { const withP = pairs.filter((p) => p.m.pOn !== null).length; lines.push(`  (no PR in truth; detector found a P-like wave before ${withP}/${pairs.length} QRS)`); }
  // at very fast rates with wide QRS (e.g. VT) there is no isoelectric segment for this simple detector to anchor
  // QRS and T boundaries on; those comparisons are reported but not scored
  const noIso = rr.length > 0 && median(rr) < 2.2 * tr.qrsMs;
  if (noIso) lines.push(`  (RR ${median(rr).toFixed(0)} ms < 2.2 x QRS: no isoelectric segment, QRS/QT boundaries not scored)`);
  // QRS duration on the representative (signal-averaged, QRS-aligned) beat, as computerised ECG readers do: atrial
  // activity that is not locked to the QRS (fibrillation waves, dissociated P waves) averages out
  const pre = Math.round(0.3 * fs), post = Math.round(0.45 * fs);
  const use = pks.filter((pk) => pk - pre >= 2 && pk + post < L.I.length - 2);
  let qrsM = median(pairs.map((p) => ms(p.m.qrsOff - p.m.qrsOn)));
  if (use.length >= 3) {
    const A: Leads = {}; for (const nm of ALL) { const y = new Array<number>(pre + post).fill(0); for (const pk of use) for (let q = 0; q < pre + post; q++) y[q] += Lq[nm][pk - pre + q] / use.length; A[nm] = y; }
    const vA = spatialVelocity(A, fs); const mA = measureBeat(A, vA, fs, pre, null, null);
    qrsM = ms(mA.qrsOff - mA.qrsOn);
  }
  cmp('QRS', noIso ? null : qrsM, tr.qrsMs, 20);
  const qt = pairs.filter((p) => p.m.tOff !== null).map((p) => ms((p.m.tOff as number) - p.m.qrsOn));
  cmp('QT', noIso || !qt.length ? null : median(qt), tr.qtMs, 40);
  // frontal QRS axis from the net QRS deflections (max + min) in I and aVF inside the MEASURED QRS windows, read
  // against the isoelectric (TP) level just before the P wave when one was found (with a short PR the P wave is not
  // over at QRS onset), else just before the QRS. Without any isoelectric segment (VT) net deflections cannot be
  // read, and the net QRS area is used instead.
  let sI = 0, sF = 0;
  for (const p of pairs) {
    const k0 = cl === null && p.m.pOn !== null && p.m.pOn > 12 ? p.m.pOn : p.m.qrsOn;
    const bI = mean(Lq.I.slice(k0 - 10, k0 - 2)), bF = mean(Lq.aVF.slice(k0 - 10, k0 - 2));
    let xI = 0, nI = 0, xF = 0, nF = 0, aI = 0, aF = 0;
    for (let k = p.m.qrsOn; k <= p.m.qrsOff; k++) { const a = Lq.I[k] - bI, c = Lq.aVF[k] - bF; xI = Math.max(xI, a); nI = Math.min(nI, a); xF = Math.max(xF, c); nF = Math.min(nF, c); aI += a; aF += c; }
    if (noIso) { sI += aI; sF += aF; } else { sI += xI + nI; sF += xF + nF; }
  }
  const ax = Math.atan2(2 * sF / Math.sqrt(3), sI) * 180 / Math.PI;
  const dAx = Math.abs(((ax - tr.qrsAxisDeg + 540) % 360) - 180);
  const axOk = dAx <= 20; if (!axOk) ok = false;
  lines.push(`  axis   meas ${ax.toFixed(0).padStart(5)}  truth ${tr.qrsAxisDeg.toFixed(0).padStart(5)}  tol ±20°  ${axOk ? 'ok' : 'FAIL'}`);
  return { id, ok, lines };
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CONDITIONS);
let allOk = true;
for (const id of ids) { const r = check(id); allOk &&= r.ok; console.log(`${r.ok ? 'PASS' : 'FAIL'} ${id}`); for (const l of r.lines) console.log(l); }
console.log(allOk ? 'all checks passed' : 'some checks FAILED');
process.exitCode = allOk ? 0 : 1;

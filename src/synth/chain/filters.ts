/**
 * Recording-chain filters (DECISION §6.9 step 3): high-pass, low-pass and mains notch, causal or zero-phase, applied
 * to each electrode potential. Every operation here is linear and time-invariant over the strip — including the
 * warm-up (mirror padding and a start state equal to the padding's mean) — so filtering the electrodes and then
 * forming leads equals forming leads and then filtering them (T1).
 *
 *  - high-pass: causal = first order (bilinear, pre-warped), the analogue RC coupling of a recorder. A causal 0.5 Hz
 *    high-pass (monitor mode) visibly distorts the ST segment after a large QRS; 0.05 Hz causal does not (AHA/ACCF/HRS
 *    2007 Part I, Kligfield et al., Circulation 2007;115:1306: low-frequency cut-off 0.05 Hz, or 0.67 Hz with
 *    linear-phase filters). Zero-phase = second-order Butterworth run forward and backward (a flat pass band above
 *    ≈ 1 Hz, like the linear-phase filters of digital recorders).
 *  - low-pass: second-order Butterworth (bilinear, pre-warped); skipped when the cut-off is ≥ 0.45·fs (the sampled
 *    signal is already band-limited below it: 150 Hz at 250 Hz sampling).
 *  - notch: second-order IIR notch, Q = 25 (≈ 2 Hz wide at 50 Hz).
 *  - zero-phase: forward–backward, with the one-pass cut-off moved (in the bilinear-warped frequency) so the two passes
 *    together are −3 dB at the nominal frequency.
 */
import type { FilterSpec } from '../api';

/** y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2] */
export interface Biquad {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

const prewarp = (fc: number, fs: number): number => Math.tan((Math.PI * fc) / fs);

export function highpass1(fc: number, fs: number): Biquad {
  const K = prewarp(fc, fs);
  return { b0: 1 / (1 + K), b1: -1 / (1 + K), b2: 0, a1: (K - 1) / (K + 1), a2: 0 };
}

export function highpass2(fc: number, fs: number): Biquad {
  const K = prewarp(fc, fs), q = Math.SQRT2;
  const norm = 1 / (1 + q * K + K * K);
  return { b0: norm, b1: -2 * norm, b2: norm, a1: 2 * (K * K - 1) * norm, a2: (1 - q * K + K * K) * norm };
}

export function lowpass2(fc: number, fs: number): Biquad {
  const K = prewarp(fc, fs), q = Math.SQRT2;
  const norm = 1 / (1 + q * K + K * K);
  const b0 = K * K * norm;
  return { b0, b1: 2 * b0, b2: b0, a1: 2 * (K * K - 1) * norm, a2: (1 - q * K + K * K) * norm };
}

export function notch(f0: number, fs: number, Q = 25): Biquad {
  const w = (2 * Math.PI * f0) / fs, alpha = Math.sin(w) / (2 * Q), a0 = 1 + alpha, c = -2 * Math.cos(w);
  return { b0: 1 / a0, b1: c / a0, b2: 1 / a0, a1: c / a0, a2: (1 - alpha) / a0 };
}

/** Magnitude response |H(f)| of a cascade (for tests and lesson figures). */
export function magnitude(stages: readonly Biquad[], f: number, fs: number): number {
  const w = (2 * Math.PI * f) / fs;
  let m = 1;
  for (const s of stages) {
    const re = (z: number): number => Math.cos(z * w), im = (z: number): number => -Math.sin(z * w);
    const nr = s.b0 + s.b1 * re(1) + s.b2 * re(2), ni = s.b1 * im(1) + s.b2 * im(2);
    const dr = 1 + s.a1 * re(1) + s.a2 * re(2), di = s.a1 * im(1) + s.a2 * im(2);
    m *= Math.hypot(nr, ni) / Math.hypot(dr, di);
  }
  return m;
}

/** One causal pass of a biquad, starting in the steady state of a constant input `u0`. */
function pass(x: Float64Array, s: Biquad, u0: number): void {
  const dc = 1 + s.a1 + s.a2;
  const g = Math.abs(dc) < 1e-12 ? 0 : (s.b0 + s.b1 + s.b2) / dc;
  const y0 = g * u0;
  let z2 = s.b2 * u0 - s.a2 * y0;
  let z1 = s.b1 * u0 - s.a1 * y0 + z2;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = s.b0 * xi + z1;
    z1 = s.b1 * xi - s.a1 * yi + z2;
    z2 = s.b2 * xi - s.a2 * yi;
    x[i] = yi;
  }
}

/**
 * One-pass cut-off for a forward–backward pair that is −3 dB at `f` overall: each pass −1.5 dB at `f`. In the warped
 * domain w = tan(π·f/fs), r = w/w_c: second-order Butterworth high-pass |H|² = r⁴/(1 + r⁴) → r = (√2 − 1)^−¼;
 * low-pass |H|² = 1/(1 + r⁴) → r = (√2 − 1)^¼.
 */
function zeroPhaseCut(f: number, fs: number, r: number): number {
  return (fs / Math.PI) * Math.atan(Math.tan((Math.PI * f) / fs) / r);
}
const R_HP2 = Math.pow(Math.SQRT2 - 1, -0.25);
const R_LP2 = Math.pow(Math.SQRT2 - 1, 0.25);

/** The stages of a filter spec at a sampling rate (one-pass design; zero-phase cut-offs already adjusted). */
export function filterStages(spec: FilterSpec, fs: number): Biquad[] {
  const zero = spec.phase === 'zero';
  const out: Biquad[] = [];
  if (spec.highpassHz > 0) out.push(zero ? highpass2(zeroPhaseCut(spec.highpassHz, fs, R_HP2), fs) : highpass1(spec.highpassHz, fs));
  if (spec.lowpassHz > 0 && spec.lowpassHz < 0.45 * fs) out.push(lowpass2(zero ? zeroPhaseCut(spec.lowpassHz, fs, R_LP2) : spec.lowpassHz, fs));
  if (spec.notchHz !== null && spec.notchHz < 0.45 * fs) out.push(notch(spec.notchHz, fs));
  return out;
}

/** Warm-up length (samples): 3 s or the whole strip. */
const padOf = (n: number, fs: number): number => Math.max(0, Math.min(n - 1, Math.round(3 * fs)));

const mean = (x: Float64Array, a: number, b: number): number => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i];
  return b > a ? s / (b - a) : 0;
};

/** Causal cascade with a mirrored warm-up (the strip's first 3 s reflected in front of it). */
function causal(x: Float64Array, stages: readonly Biquad[], fs: number): Float64Array {
  const n = x.length, P = padOf(n, fs);
  const ext = new Float64Array(P + n);
  for (let i = 0; i < P; i++) ext[i] = x[P - i];
  ext.set(x, P);
  for (const s of stages) pass(ext, s, mean(ext, 0, Math.max(1, P)));
  return ext.slice(P);
}

/** Zero-phase (forward–backward) cascade with mirrored padding at both ends. */
function zeroPhase(x: Float64Array, stages: readonly Biquad[], fs: number): Float64Array {
  const n = x.length, P = padOf(n, fs);
  const ext = new Float64Array(n + 2 * P);
  for (let i = 0; i < P; i++) {
    ext[i] = x[P - i];
    ext[P + n + i] = x[n - 2 - i];
  }
  ext.set(x, P);
  for (const s of stages) {
    pass(ext, s, mean(ext, 0, Math.max(1, P)));
    ext.reverse();
    pass(ext, s, mean(ext, 0, Math.max(1, P)));
    ext.reverse();
  }
  return ext.slice(P, P + n);
}

/** Filter one signal (a new array; the input is not modified). */
export function applyFilter(x: Float64Array, spec: FilterSpec, fs: number): Float64Array {
  const stages = filterStages(spec, fs);
  if (!stages.length) return Float64Array.from(x);
  return spec.phase === 'zero' ? zeroPhase(x, stages, fs) : causal(x, stages, fs);
}

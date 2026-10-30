/**
 * Additive recording artefacts per electrode (DECISION §6.9 step 1). Each process is seeded from its own named fork
 * (`wander`, `emg:LA`, `tremor`, `mains`, `pop`, `motion`, `lead-off`), so adding a process never shifts another.
 * Artefacts live on electrodes (cables), never on leads: a lead shows an artefact only through the electrodes it uses —
 * an arm tremor spares the lead between the other two limbs, and a limb artefact reaches every chest lead at one third
 * through Wilson's central terminal. That is the teaching point (AHA/ACCF/HRS 2007 Part I; Batchvarov et al. Europace
 * 2007;9:1081 for artefact mimics).
 *
 * Amplitudes (NoiseSpec, mV):
 *  - wanderMv: respiratory wander (0.18–0.32 Hz, one breathing rhythm, per-electrode phase) plus a slow random walk;
 *    peak amplitude at the chest electrodes, a third of it at the limb electrodes.
 *  - emgMv: RMS of band-limited muscle noise (20–150 Hz, burst envelope) on each electrode of `emgOn` (default: the
 *    three recording limb electrodes).
 *  - tremor: quasi-periodic 4–7 Hz oscillation (rest tremor: the "pseudo-flutter" mimic), peak `mv`, on one limb.
 *  - mains: common-mode pickup; electrode e carries mv·(1 + imbalance·u_e)·sin(2π·hz·t), u_e ∈ [−1, 1]; the common
 *    part cancels in every lead, a lead keeps mv·imbalance·(u_a − u_b).
 *  - pop: a step of `mv` at `tMs` on one electrode, recovering exponentially (τ 250 ms).
 *  - motion: from `tMs` for `durMs`, broad quasi-periodic deflections (cycle 190–280 ms, peak `mv`) on one electrode:
 *    the "pseudo-VT" mimic; the native QRS complexes continue through it at the sinus rate.
 *  - leadOff: the electrode floats — a large drift (±15 mV) with mains and broadband noise; the recorder saturates.
 */
import type { ExtraLead } from '../../core/leads';
import type { Rng } from '../../core/rng';
import type { ChestCable, LimbCable, NoiseSpec } from '../api';
import { highpass2, lowpass2 } from './filters';

export type Cable = LimbCable | ChestCable | ExtraLead;
export const NOISE_PROCESSES = ['wander', 'emg', 'tremor', 'mains', 'pop', 'motion', 'leadOff'] as const;
export type NoiseProcess = (typeof NOISE_PROCESSES)[number];

const LIMB: readonly Cable[] = ['RA', 'LA', 'LL', 'RL'];
const isLimb = (c: Cable): boolean => LIMB.includes(c);

/** In-place causal biquad (zero initial state) for shaping noise. */
function shape(x: Float64Array, s: { b0: number; b1: number; b2: number; a1: number; a2: number }): void {
  let z1 = 0, z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i], yi = s.b0 * xi + z1;
    z1 = s.b1 * xi - s.a1 * yi + z2;
    z2 = s.b2 * xi - s.a2 * yi;
    x[i] = yi;
  }
}

const rms = (x: Float64Array): number => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
};

/**
 * Smooth random signal in ≈ [0, 1] (low-passed noise through a logistic), for envelopes and slow walks. The noise is
 * drawn, filtered and squashed on a coarse control grid (10 points per cycle of `hz`, ≥ 2 Hz) and interpolated
 * (Catmull–Rom): the content is far below the control rate, and the cost hardly grows with the sampling rate.
 */
function slowEnvelope(rng: Rng, n: number, fs: number, hz: number): Float64Array {
  const cr = Math.max(2, 10 * hz);
  const lead = 2; // seconds of warm-up on the control grid
  const m = Math.ceil((n / fs + lead) * cr) + 4;
  const c = new Float64Array(m);
  for (let i = 0; i < m; i++) c[i] = rng.normal();
  const lp = lowpass2(Math.min(hz, 0.4 * cr), cr);
  shape(c, lp);
  shape(c, lp);
  const ctl = c.subarray(Math.round(lead * cr));
  const s = rms(ctl) || 1;
  const g = Float64Array.from(ctl, (v) => 1 / (1 + Math.exp((-2 * v) / s)));
  const out = new Float64Array(n);
  const step = cr / fs;
  // Catmull–Rom per control interval: the cubic's coefficients once per interval, Horner per sample
  const last = g.length - 1;
  let i = 0;
  for (let k = 0; i < n; k++) {
    const p0 = g[k > 0 ? k - 1 : 0], p1 = g[k], p2 = g[Math.min(last, k + 1)], p3 = g[Math.min(last, k + 2)];
    const c0 = p1, c1 = 0.5 * (p2 - p0), c2 = 0.5 * (2 * p0 - 5 * p1 + 4 * p2 - p3), c3 = 0.5 * (-p0 + 3 * p1 - 3 * p2 + p3);
    for (; i < n; i++) {
      const u = i * step;
      if (u >= k + 1) break;
      const t = u - k;
      out[i] = c0 + t * (c1 + t * (c2 + t * c3));
    }
  }
  return out;
}

/** Slow random walk (low-passed Gaussian noise, unit RMS). */
function randomWalk(rng: Rng, n: number, fs: number, hz: number): Float64Array {
  const env = slowEnvelope(rng, n, fs, hz);
  let m = 0;
  for (let i = 0; i < n; i++) m += env[i];
  m /= n;
  for (let i = 0; i < n; i++) env[i] -= m;
  const s = rms(env) || 1;
  for (let i = 0; i < n; i++) env[i] /= s;
  return env;
}

function wander(spec: number, cables: readonly Cable[], fs: number, n: number, rng: Rng, add: (c: Cable, x: Float64Array) => void): void {
  const fr = rng.range(0.18, 0.32);
  const fm = rng.range(0.02, 0.05), fmPhase = rng.range(0, 2 * Math.PI);
  // one breathing rhythm Φ(t) (frequency-modulated); each electrode sees it with its own phase and harmonic mix:
  // sin(Φ + φ) = sin Φ·cos φ + cos Φ·sin φ, so the trigonometry is paid once per sample
  const s1 = new Float64Array(n), c1 = new Float64Array(n), s2 = new Float64Array(n), c2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const ph = 2 * Math.PI * fr * t + 0.5 * Math.sin(2 * Math.PI * fm * t + fmPhase);
    s1[i] = Math.sin(ph);
    c1[i] = Math.cos(ph);
    s2[i] = Math.sin(2 * ph);
    c2[i] = Math.cos(2 * ph);
  }
  for (const c of cables) {
    const r = rng.fork(c);
    const amp = spec * (isLimb(c) ? r.range(0.25, 0.4) : r.range(0.7, 1));
    const ph = r.range(0, 2 * Math.PI), h2 = r.range(0.1, 0.3);
    const walk = randomWalk(r.fork('walk'), n, fs, 0.06);
    const a1 = 0.8 * Math.cos(ph), b1 = 0.8 * Math.sin(ph), a2 = h2 * Math.cos(2 * ph + 0.7), b2 = h2 * Math.sin(2 * ph + 0.7);
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = amp * (a1 * s1[i] + b1 * c1[i] + a2 * s2[i] + b2 * c2[i] + 0.25 * walk[i]);
    add(c, x);
  }
}

function emg(mv: number, on: readonly Cable[], fs: number, n: number, rng: Rng, add: (c: Cable, x: Float64Array) => void): void {
  for (const c of on) {
    const r = rng.fork(`emg:${c}`);
    const pre = Math.round(0.5 * fs);
    // white noise (Irwin–Hall sum of four uniforms: Gaussian enough before the band-pass, far cheaper)
    const x = new Float64Array(n + pre);
    for (let i = 0; i < x.length; i++) x[i] = (r.next() + r.next() + r.next() + r.next() - 2) * Math.sqrt(3);
    shape(x, highpass2(20, fs));
    shape(x, lowpass2(Math.min(150, 0.45 * fs), fs));
    const env = slowEnvelope(r.fork('burst'), n, fs, 0.8);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = x[i + pre] * (0.35 + 0.65 * env[i]);
    const s = rms(y) || 1;
    add(c, y.map((v) => (v * mv) / s));
  }
}

/**
 * Skeletal-muscle bursts in given time windows (absolute ms from the strip start): the surface view of the
 * myopotentials a pacemaker oversenses (pectoral / arm effort). Band-limited like `emg`, `mv` RMS inside a window, with
 * 60 ms cosine ramps.
 */
export function emgBursts(windows: readonly { readonly from: number; readonly to: number }[], mv: number, on: readonly Cable[], fs: number, n: number, rng: Rng): Partial<Record<Cable, Float64Array>> {
  const out: Partial<Record<Cable, Float64Array>> = {};
  const ramp = 60;
  const gate = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i * 1000) / fs;
    let g = 0;
    for (const w of windows) {
      const e = Math.min(1, Math.max(0, (t - w.from + ramp) / ramp), Math.max(0, (w.to + ramp - t) / ramp));
      g = Math.max(g, 0.5 - 0.5 * Math.cos(Math.PI * e));
    }
    gate[i] = g;
  }
  for (const c of on) {
    const r = rng.fork(`burst:${c}`);
    const pre = Math.round(0.5 * fs);
    const x = new Float64Array(n + pre);
    for (let i = 0; i < x.length; i++) x[i] = (r.next() + r.next() + r.next() + r.next() - 2) * Math.sqrt(3);
    shape(x, highpass2(20, fs));
    shape(x, lowpass2(Math.min(150, 0.45 * fs), fs));
    const y = x.subarray(pre);
    const s = rms(y) || 1;
    out[c] = Float64Array.from(y, (v, i) => (v * mv * gate[i]) / s);
  }
  return out;
}

function tremor(t: NonNullable<NoiseSpec['tremor']>, fs: number, n: number, rng: Rng, add: (c: Cable, x: Float64Array) => void): void {
  const drift = randomWalk(rng.fork('freq'), n, fs, 0.15);
  const env = slowEnvelope(rng.fork('amp'), n, fs, 0.3);
  const h2 = rng.range(0.25, 0.4), p2 = rng.range(0.4, 1.2);
  let phase = rng.range(0, 2 * Math.PI);
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    phase += (2 * Math.PI * t.hz * (1 + 0.04 * drift[i])) / fs;
    x[i] = (t.mv * (0.75 + 0.25 * env[i]) * (Math.sin(phase) + h2 * Math.sin(2 * phase + p2))) / (1 + h2 * 0.5);
  }
  add(t.on, x);
}

function mains(m: NonNullable<NoiseSpec['mains']>, cables: readonly Cable[], fs: number, n: number, rng: Rng, add: (c: Cable, x: Float64Array) => void): void {
  const ph = rng.range(0, 2 * Math.PI);
  const w = (2 * Math.PI * m.hz) / fs;
  const wave = new Float64Array(n);
  for (let i = 0; i < n; i++) wave[i] = Math.sin(w * i + ph);
  for (const c of cables) {
    const k = m.mv * (1 + m.imbalance * rng.fork(c).range(-1, 1));
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = k * wave[i];
    add(c, x);
  }
}

function pop(p: NonNullable<NoiseSpec['pop']>, fs: number, n: number, add: (c: Cable, x: Float64Array) => void): void {
  const i0 = Math.round((p.tMs * fs) / 1000);
  const x = new Float64Array(n);
  for (let i = Math.max(0, i0); i < n; i++) x[i] = p.mv * Math.exp(-(i - i0) / (0.25 * fs));
  add(p.electrode, x);
}

function motion(m: NonNullable<NoiseSpec['motion']>, fs: number, n: number, rng: Rng, add: (c: Cable, x: Float64Array) => void): void {
  const x = new Float64Array(n);
  const ramp = 250;
  let t = m.tMs;
  const end = m.tMs + m.durMs;
  let sign = 1;
  while (t < end) {
    const P = rng.range(190, 280), a = m.mv * rng.range(0.65, 1) * sign;
    if (rng.next() < 0.75) sign = -sign;
    const i0 = Math.max(0, Math.ceil((t * fs) / 1000)), i1 = Math.min(n - 1, Math.floor(((t + P) * fs) / 1000));
    for (let i = i0; i <= i1; i++) {
      const ms = (i * 1000) / fs, u = (ms - t) / P;
      const env = Math.min(1, Math.max(0, (ms - m.tMs) / ramp), Math.max(0, (end - ms) / ramp));
      const e = 0.5 - 0.5 * Math.cos(Math.PI * env);
      // a broad main lobe and a smaller opposite lobe: a wide "complex" per cycle
      x[i] += e * a * (Math.exp(-(((u - 0.32) / 0.13) ** 2)) - 0.45 * Math.exp(-(((u - 0.72) / 0.16) ** 2)));
    }
    t += P;
  }
  add(m.electrode, x);
}

function leadOff(c: Cable, fs: number, n: number, rng: Rng, add: (c: Cable, x: Float64Array) => void): void {
  const walk = randomWalk(rng.fork('drift'), n, fs, 0.4);
  const ph = rng.range(0, 2 * Math.PI);
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = 15 * walk[i] + 2 * Math.sin((2 * Math.PI * 50 * i) / fs + ph) + 0.3 * rng.normal();
  add(c, x);
}

/**
 * The additive noise of every process, per cable (only processes present in the spec). `cables`: the cables recorded
 * (limb RA, LA, LL and every chest / extra cable in use).
 */
export function noiseProcesses(spec: NoiseSpec, cables: readonly Cable[], fs: number, n: number, rng: Rng): Partial<Record<NoiseProcess, Partial<Record<Cable, Float64Array>>>> {
  const out: Partial<Record<NoiseProcess, Partial<Record<Cable, Float64Array>>>> = {};
  const sink = (p: NoiseProcess) => {
    const m: Partial<Record<Cable, Float64Array>> = (out[p] = {});
    return (c: Cable, x: Float64Array): void => {
      const prev = m[c];
      if (prev) for (let i = 0; i < n; i++) prev[i] += x[i];
      else m[c] = x;
    };
  };
  if (spec.wanderMv && spec.wanderMv > 0) wander(spec.wanderMv, cables, fs, n, rng.fork('wander'), sink('wander'));
  if (spec.emgMv && spec.emgMv > 0) emg(spec.emgMv, spec.emgOn ?? ['RA', 'LA', 'LL'], fs, n, rng.fork('emg'), sink('emg'));
  if (spec.tremor && spec.tremor.mv > 0) tremor(spec.tremor, fs, n, rng.fork('tremor'), sink('tremor'));
  if (spec.mains && spec.mains.mv > 0) mains(spec.mains, cables, fs, n, rng.fork('mains'), sink('mains'));
  if (spec.pop && spec.pop.mv !== 0) pop(spec.pop, fs, n, sink('pop'));
  if (spec.motion && spec.motion.mv > 0) motion(spec.motion, fs, n, rng.fork('motion'), sink('motion'));
  if (spec.leadOff) leadOff(spec.leadOff, fs, n, rng.fork('lead-off'), sink('leadOff'));
  return out;
}

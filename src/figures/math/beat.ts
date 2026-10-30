/**
 * A schematic single beat (sum of asymmetric Gaussian waves) used by the explainer figures when they need a
 * "textbook" complex rather than a recorded ECG: the paper explorer, the action-potential alignment, the conduction
 * mini-trace, and the rate ruler without an ECG. It is an illustration, not a synthetic ECG — the synthetic engine
 * (src/synth) is the only producer of 12-lead tracings. Times in ms from P onset, voltages in mV.
 */
export interface Wave {
  readonly center: number;
  /** σ left of the centre (ms) */
  readonly wl: number;
  /** σ right of the centre (ms); defaults to wl */
  readonly wr?: number;
  readonly amp: number;
}

export interface BeatShape {
  readonly waves: readonly Wave[];
  /** fiducial marks (ms from P onset) that agree with the waves */
  readonly marks: { readonly pOn: number | null; readonly pOff: number | null; readonly qrsOn: number; readonly qrsOff: number; readonly tPeak: number; readonly tOff: number };
}

export function waveValue(w: Wave, t: number): number {
  const s = t < w.center ? w.wl : (w.wr ?? w.wl);
  const z = (t - w.center) / s;
  return z * z > 60 ? 0 : w.amp * Math.exp(-0.5 * z * z);
}

export function beatValue(shape: BeatShape, t: number): number {
  let v = 0;
  for (const w of shape.waves) v += waveValue(w, t);
  return v;
}

/** Lead-II-like normal beat: P 0–100, PR 160, QRS 160–250, ST, T peak ≈ 410, T end ≈ 500 (QT 340 ms). */
export const NORMAL_BEAT: BeatShape = {
  waves: [
    { center: 50, wl: 19, amp: 0.15 },
    { center: 172, wl: 5, amp: -0.1 },
    { center: 194, wl: 8, amp: 1.25 },
    { center: 216, wl: 7, amp: -0.3 },
    { center: 410, wl: 55, wr: 36, amp: 0.32 },
  ],
  marks: { pOn: 0, pOff: 100, qrsOn: 160, qrsOff: 245, tPeak: 410, tOff: 500 },
};

/**
 * Periodic trace of a beat shape: value at absolute time t (ms) for beats starting (P onset) at `first`, `first + rr`, …
 * Neighbouring beats overlap correctly (the T of one beat and the P of the next).
 */
export function periodicValue(shape: BeatShape, t: number, rr: number, first = 0): number {
  const k = Math.floor((t - first) / rr);
  let v = 0;
  for (let j = k - 1; j <= k + 1; j++) {
    if (j < 0) continue;
    v += beatValue(shape, t - first - j * rr);
  }
  return v;
}

/** Value at time t for beats at arbitrary onsets (sorted). */
export function trainValue(shape: BeatShape, t: number, onsets: readonly number[]): number {
  let v = 0;
  for (const o of onsets) {
    const dt = t - o;
    if (dt < -200 || dt > 900) continue;
    v += beatValue(shape, dt);
  }
  return v;
}

/** Sample a function into [t, v] points every `step` ms over [t0, t1]. */
export function sample(fn: (t: number) => number, t0: number, t1: number, step: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const n = Math.max(1, Math.round((t1 - t0) / step));
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    out.push([t, fn(t)]);
  }
  return out;
}

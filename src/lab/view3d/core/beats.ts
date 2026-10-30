/**
 * Beat-uniform packing (GPU contract: uBeatA[2] / uBeatV[2] = vec4(sinceMs, slot, apdScale, active), most recent first).
 * Times are beat-relative and computed on the CPU in float64 by the engine; the shader never sees absolute time, so
 * float32 precision does not degrade over long sessions.
 */
import type { ActiveBeat, BeatSnapshot } from '../../sim/types';

export const BEAT_STRIDE = 4;
/** Beat-relative times are clamped so float32 keeps ~0.004 ms resolution even if a beat is very old (AV block…). */
export const MAX_SINCE_MS = 60_000;

function writeBeat(b: ActiveBeat | null, out: Float32Array, o: number): void {
  if (!b) {
    out[o] = 0;
    out[o + 1] = 0;
    out[o + 2] = 1;
    out[o + 3] = 0;
    return;
  }
  out[o] = Math.max(-MAX_SINCE_MS, Math.min(MAX_SINCE_MS, b.sinceMs));
  out[o + 1] = b.slot;
  out[o + 2] = b.apdScale > 0 && Number.isFinite(b.apdScale) ? b.apdScale : 1;
  out[o + 3] = 1;
}

/**
 * Packs one compartment's pair into out[offset .. offset+8). Enforces "most recent first" (smallest sinceMs) even if
 * the engine hands the pair in another order, and moves a lone beat into position 0.
 */
export function packBeatPair(pair: readonly [ActiveBeat | null, ActiveBeat | null], out: Float32Array, offset = 0): void {
  let a = pair[0], b = pair[1];
  if (!a && b) {
    a = b;
    b = null;
  } else if (a && b && b.sinceMs < a.sinceMs) {
    const t = a;
    a = b;
    b = t;
  }
  writeBeat(a, out, offset);
  writeBeat(b, out, offset + BEAT_STRIDE);
}

/** out[0..8) = atrial pair, out[8..16) = ventricular pair. */
export function packBeatSnapshot(s: BeatSnapshot, out: Float32Array): void {
  packBeatPair(s.atrial, out, 0);
  packBeatPair(s.ventricular, out, 2 * BEAT_STRIDE);
}

/**
 * Time between the most recent atrial event and its ventricular event (A → His), needed to time the AV-node pulse.
 * When the ventricular event of the latest atrial beat has not happened yet, the previous gap is reused.
 */
export function avGapMs(s: BeatSnapshot, fallbackMs: number): number {
  const a = s.atrial[0], v = s.ventricular[0];
  if (a && v && v.sinceMs <= a.sinceMs) {
    const gap = a.sinceMs - v.sinceMs;
    if (gap > 20 && gap < 600) return gap;
  }
  return fallbackMs;
}

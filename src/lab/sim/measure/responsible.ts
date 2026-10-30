/**
 * "Which structures are responsible for the ECG right now?" — from per-structure activation/repolarization windows
 * (relative to the beat event). The real engine derives windows from the activation fields (min/max tAct over the
 * structure's voxels); the stub uses hand-set windows.
 */
import type { StructureId } from '../types';

export interface StructureWindow {
  readonly id: StructureId;
  /** Depolarization window (front passing), ms rel. to its beat event. */
  readonly t0: number;
  readonly t1: number;
  /** Optional repolarization window. */
  readonly r0?: number;
  readonly r1?: number;
}

/**
 * Weight 1 inside the depolarization window (tapered at the edges), 0.5 inside the repolarization window.
 * Returns structures sorted by weight, descending.
 */
export function responsibleFromWindows(
  windows: readonly StructureWindow[],
  tRelMs: number,
  repolScale = 1,
): { id: StructureId; w: number }[] {
  const out: { id: StructureId; w: number }[] = [];
  const taper = 4;
  for (const w of windows) {
    let wt = 0;
    if (tRelMs >= w.t0 - taper && tRelMs <= w.t1 + taper) {
      const edge = Math.min(tRelMs - (w.t0 - taper), w.t1 + taper - tRelMs);
      wt = Math.min(1, edge / taper);
    } else if (w.r0 !== undefined && w.r1 !== undefined) {
      const r0 = w.t0 + (w.r0 - w.t0) * repolScale, r1 = w.t0 + (w.r1 - w.t0) * repolScale;
      if (tRelMs >= r0 && tRelMs <= r1) wt = 0.5;
    }
    if (wt > 0) out.push({ id: w.id, w: wt });
  }
  return out.sort((a, b) => b.w - a.w);
}

/**
 * Per-region windows from an activation field (real engine): depolarization = 2nd–98th percentile of tAct over the
 * region's voxels, repolarization = same percentiles of tAct + APD_ref (scaled per beat by responsibleFromWindows).
 * Percentiles keep single stray voxels from stretching a window. `repolTailMs` widens the repolarization window on
 * both sides by the repolarization sigmoid tail (≈ 2·τr) so the late T wave still names its structures.
 */
export function windowsFromField(
  region: Uint8Array,
  tAct: Float32Array,
  apdRefMs: Float32Array,
  structures: readonly StructureId[],
  repolTailMs = 0,
): StructureWindow[] {
  const nS = structures.length;
  const acts: number[][] = Array.from({ length: nS }, () => []);
  const reps: number[][] = Array.from({ length: nS }, () => []);
  for (let v = 0; v < tAct.length; v++) {
    const t = tAct[v];
    if (t === Infinity || t !== t) continue;
    const r = region[v];
    if (r >= nS) continue;
    acts[r].push(t);
    reps[r].push(t + apdRefMs[v]);
  }
  const pct = (xs: Float64Array, p: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(p * (xs.length - 1))))];
  const out: StructureWindow[] = [];
  for (let r = 0; r < nS; r++) {
    if (acts[r].length === 0) continue;
    const a = Float64Array.from(acts[r]).sort(), rp = Float64Array.from(reps[r]).sort();
    out.push({ id: structures[r], t0: pct(a, 0.02), t1: pct(a, 0.98), r0: pct(rp, 0.02) - repolTailMs, r1: pct(rp, 0.98) + repolTailMs });
  }
  return out;
}

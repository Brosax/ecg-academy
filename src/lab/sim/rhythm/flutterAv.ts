/**
 * AV conduction of atrial flutter waves (deterministic). The AV node cannot follow ~300 impulses/min: its refractory
 * period lets every Nth flutter wave through (N:1 block, typically 2:1 → ~150/min, or 4:1 → ~75/min); the blocked
 * waves still reach the node (concealed), so the conducted ones arrive at a fixed point of the flutter cycle and the
 * ventricular rhythm is regular. A non-integer mean ratio r (heart-rate control between two fixed ratios) is "variable
 * block": the conducted waves are spaced ⌊r⌋ and ⌈r⌉ flutter cycles apart in a fixed pattern whose mean is exactly r
 * (an error accumulator, like Bresenham's line), so the ventricular rhythm becomes irregular in multiples of the
 * flutter cycle — as in clinical flutter with variable block.
 */

/** Ratios closer than this to an integer snap to it (fixed N:1 block, regular rhythm). */
const SNAP = 0.12;
export const FLUTTER_MIN_RATIO = 2;
export const FLUTTER_MAX_RATIO = 8;

/** Mean conduction ratio for a target ventricular rate (bpm) at a flutter cycle length (ms): ≥ 2, snapped to N:1 nearby. */
export function flutterRatioFor(targetBpm: number, cycleMs: number): number {
  const r = Math.min(FLUTTER_MAX_RATIO, Math.max(FLUTTER_MIN_RATIO, 60000 / Math.max(1, targetBpm) / cycleMs));
  const k = Math.round(r);
  return Math.abs(r - k) < SNAP ? k : r;
}

export class FlutterAvConduction {
  private r: number;
  private acc: number;

  constructor(ratio: number) {
    this.r = Math.max(1, ratio);
    // the first flutter wave conducts
    this.acc = this.r - 1;
  }

  get ratio(): number {
    return this.r;
  }

  /** New mean ratio; applies from the next flutter wave (the accumulator keeps its phase). */
  setRatio(ratio: number): void {
    this.r = Math.max(1, ratio);
    this.acc = Math.min(this.acc, this.r - 1);
  }

  /** Advances by one flutter wave; true if this wave conducts to the ventricles. */
  next(): boolean {
    this.acc += 1;
    if (this.acc >= this.r - 1e-9) {
      this.acc -= this.r;
      return true;
    }
    return false;
  }
}

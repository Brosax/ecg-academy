/**
 * Numeric answers as a pick of four values (no typing): the reference rounded to a readable unit plus three distractors,
 * each more than twice the grading tolerance away from the reference and from each other, so exactly one option scores.
 * Measurement decoys of the item (e.g. QT to the T peak) are preferred as distractors when they qualify. Seeded by the
 * item id, so the same item always shows the same options. Pure.
 */
import { createRng } from '../../core/rng';

export interface NumericChoiceSpec {
  readonly truth: number;
  /** full-credit tolerance of the grader (same unit as truth) */
  readonly tol: number;
  /** rounding unit of the displayed values */
  readonly unit: number;
  /** smallest valid value (e.g. 1 bpm, 10 ms); ignored for angles */
  readonly min?: number;
  /** values are angles in (−180, 180] */
  readonly angle?: boolean;
  /** preferred distractors (decoys) */
  readonly decoys?: readonly number[];
  readonly seed: string;
}

const wrap = (d: number) => {
  let x = ((d + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
};
const dist = (a: number, b: number, angle: boolean) => {
  const d = Math.abs(a - b);
  return angle ? Math.min(d, 360 - d) : d;
};

/** Four ascending values; the one nearest `truth` is the right answer. */
export function numericOptions(spec: NumericChoiceSpec): number[] {
  const { tol, unit, angle = false } = spec;
  const round = (v: number) => {
    const r = Math.round(v / unit) * unit;
    return angle ? wrap(r) : r;
  };
  const truth = round(spec.truth);
  const gap = 2 * tol + unit; // > 2 × tolerance → zero credit
  const ok = (v: number, taken: readonly number[]) =>
    (angle || v >= (spec.min ?? unit)) && dist(v, spec.truth, angle) > 2 * tol && taken.every((t) => dist(v, t, angle) >= gap);

  const out: number[] = [truth];
  for (const d of spec.decoys ?? []) {
    const v = round(d);
    if (out.length < 3 && ok(v, out)) out.push(v);
  }
  // spread the rest around the reference: a seeded mix of lower and higher steps
  const rng = createRng(spec.seed);
  const step = Math.ceil((2.5 * tol) / unit) * unit;
  // the closest steps first (in a seeded order), so distractors stay plausible
  const ks = [-2, -1, 1, 2, -3, 3, -4, 4, -5, 5, -6, 6];
  const near = ks.slice(0, 4);
  for (let i = near.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [near[i], near[j]] = [near[j], near[i]];
  }
  for (const k of near.concat(ks.slice(4))) {
    if (out.length >= 4) break;
    const v = round(truth + k * step);
    if (ok(v, out)) out.push(v);
  }
  return out.sort((a, b) => a - b);
}

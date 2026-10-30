/**
 * Seeded dial draws for drill items (DECISION §7, difficulty ladder). For every dial a scenario declares (and the
 * engine implements), the scenario range is cut by the exclusion bands of the dial's clinical thresholds
 * (dials.ts › DIALS[id].thresholds / band) and the value is drawn from the interval the difficulty asks for:
 *
 *   classic     the middle half of the range, outside every band (clear effect sizes);
 *   subtle      the quarter of the range nearest the scenario's closest threshold, outside its band (e.g. ST 1–1.5 mm
 *               above the STEMI limit, PR just over 200 ms); a dial with no threshold near its range draws classic;
 *   noisy       classic values (the recording chain adds the noise: index.ts › difficultyRecording);
 *   borderline  inside a band that intersects the range (the item's feedback teaches the threshold); with no band in
 *               the range, subtle.
 *
 * An empty interval falls back to the next wider one (the allowed part of the whole range, then the range middle), so
 * a draw always succeeds without retries. The draw is deterministic: one fork of the caller's stream per dial.
 */
import type { Rng } from '../../core/rng';
import type { DialId, DialRange, Difficulty, ScenarioDef } from '../api';
import { DIALS } from './dials';
import { drillRanges } from './ranges';

type Interval = readonly [number, number];

const EPS = 1e-9;

/** a − ∪bands, as sorted disjoint intervals */
function minus(range: Interval, cuts: readonly Interval[]): Interval[] {
  let out: Interval[] = [range];
  for (const [c0, c1] of cuts) {
    const next: Interval[] = [];
    for (const [a, b] of out) {
      if (c1 <= a || c0 >= b) {
        next.push([a, b]);
        continue;
      }
      if (c0 > a) next.push([a, c0]);
      if (c1 < b) next.push([c1, b]);
    }
    out = next;
  }
  return out.filter(([a, b]) => b - a > EPS);
}

function intersect(xs: readonly Interval[], [c0, c1]: Interval): Interval[] {
  return xs.map(([a, b]) => [Math.max(a, c0), Math.min(b, c1)] as Interval).filter(([a, b]) => b - a > EPS);
}

/** a uniform draw over a union of intervals */
function drawIn(xs: readonly Interval[], u: number): number {
  const total = xs.reduce((s, [a, b]) => s + (b - a), 0);
  let t = u * total;
  for (const [a, b] of xs) {
    if (t <= b - a) return a + t;
    t -= b - a;
  }
  return xs[xs.length - 1][1];
}

export interface DialPlan {
  /** the interval set the value is drawn from */
  readonly from: readonly Interval[];
  /** the bands (around thresholds) that intersect the range */
  readonly bands: readonly Interval[];
}

/** The interval set a difficulty draws dial `id` of scenario `def` from (exported for the T5 tests and the docs). */
export function dialPlan(def: ScenarioDef, id: DialId, r: DialRange, difficulty: Difficulty): DialPlan {
  const D = DIALS[id];
  const range: Interval = [r.min, r.max];
  const span = r.max - r.min;
  const ts = D.thresholds(def);
  const allBands: Interval[] = ts.map((t) => [t - D.band(t), t + D.band(t)] as Interval).filter(([a, b]) => b - a > EPS);
  const bands = allBands.map(([a, b]) => [Math.max(a, r.min), Math.min(b, r.max)] as Interval).filter(([a, b]) => b - a > 0.25 * D.step);
  const allowed = minus(range, allBands);
  const mid = (): Interval[] => [[r.min + span / 2, r.min + span / 2]];
  const classic = (): Interval[] => {
    const m = intersect(allowed, [r.min + span / 4, r.max - span / 4]);
    return m.length ? m : allowed.length ? allowed : mid();
  };
  const subtle = (): Interval[] => {
    // the threshold closest to the range (0 inside it), within one span of it
    const dist = (t: number): number => (t < r.min ? r.min - t : t > r.max ? t - r.max : 0);
    const near = ts.filter((t) => dist(t) <= Math.max(span, EPS)).sort((a, b) => dist(a) - dist(b) || Math.abs(a - (r.min + r.max) / 2) - Math.abs(b - (r.min + r.max) / 2));
    if (!near.length) return classic();
    const t = near[0];
    const lowSide = Math.abs(t - r.min) <= Math.abs(t - r.max);
    for (const frac of [0.25, 0.5]) {
      const w: Interval = lowSide ? [r.min, r.min + frac * span] : [r.max - frac * span, r.max];
      const x = intersect(allowed, w);
      if (x.length) return x;
    }
    return classic();
  };
  const from = difficulty === 'subtle' ? subtle() : difficulty === 'borderline' ? (bands.length ? bands : subtle()) : classic();
  return { from, bands };
}

/** Draw the dial values of one drill item. Only implemented dials of the scenario's drill ranges are drawn. */
export function drawDialValues(def: ScenarioDef, rng: Rng, difficulty: Difficulty): Partial<Record<DialId, number>> {
  const out: Partial<Record<DialId, number>> = {};
  const ranges = drillRanges(def);
  for (const id of Object.keys(ranges).sort() as DialId[]) {
    const r = ranges[id];
    const D = DIALS[id];
    if (!r || !D.implemented) continue;
    const plan = dialPlan(def, id, r, difficulty);
    const v = drawIn(plan.from, rng.fork(id).next());
    const q = Math.round(v / D.step) * D.step;
    // the step grid must not push a value out of its interval (or the range)
    const inside = plan.from.some(([a, b]) => q >= a - EPS && q <= b + EPS);
    const val = inside ? q : v;
    out[id] = Math.min(r.max, Math.max(r.min, Number(val.toFixed(6))));
  }
  return out;
}

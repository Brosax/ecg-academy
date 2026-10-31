/**
 * Pure timeline maths of the animated scenes (docs/design/f-explainers.md §2.2–2.3). A scene is a function of one
 * number p ∈ [0, 1]; a timeline tiles [0, 1] with narration beats. Nothing here touches the DOM or Preact, so every
 * decision the runtime takes (which beat, where prev/next land, how far a motion inside a beat has come, which ECG
 * instant the cursor shows) is tested in tests/figures/scene/timeline.test.ts.
 */
import { clamp, ease } from '../math/geom';

// ── types ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** A beat given by its nominal length; compileBeats turns the lengths into fractions of the timeline. */
export interface BeatDef<Id extends string = string> {
  readonly id: Id;
  readonly ms: number;
}

/** Fiducials of the ECG beat a scene is anchored to (BeatMarks); hisOn = qrsOn − 45 ms (math/conduction.ts). */
export type Fid = 'start' | 'pOn' | 'pOff' | 'hisOn' | 'qrsOn' | 'qrsOff' | 'tPeak' | 'end';

export interface AnchoredBeatDef<Id extends string = string> {
  readonly id: Id;
  readonly from: Fid;
  readonly to: Fid;
}

/** A compiled beat: fractions of the timeline; the beats of a timeline tile [0, 1] in order. */
export interface Beat<Id extends string = string> {
  readonly id: Id;
  readonly from: number;
  readonly to: number;
}

export interface Timeline<Id extends string = string> {
  readonly beats: readonly Beat<Id>[];
  /** wall-clock length of the play-once run */
  readonly durationMs: number;
  /** ECG time (ms) that p = 0 … 1 maps to (ECG-backed scenes only) */
  readonly window?: readonly [number, number];
  /** identity: changes when the source changes (re-arms autoplay); interaction state is never part of it */
  readonly key: string;
}

/** The subset of BeatMarks (src/core/ecg.ts) that anchorBeats reads. */
export interface BeatFiducials {
  readonly pOn: number | null;
  readonly pOff: number | null;
  readonly qrsOn: number;
  readonly qrsOff: number;
  readonly tPeak: number | null;
  readonly tOff: number;
}

export type BeatTargetKind = 'start' | 'middle' | 'end';

/** Shortest beat a zero-length anchor may collapse to (fraction of the timeline). */
export const MIN_BEAT_FRACTION = 0.01;
/** Default clamp of an anchored timeline's wall-clock length (HeartBlock convention). */
export const DEFAULT_CLAMP_MS: readonly [number, number] = [1500, 6000];
/** His bundle onset relative to the QRS onset (math/conduction.ts convention). */
export const HIS_LEAD_MS = 45;

// ── easing ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Smoothstep in/out on [0, 1] (clamped) — the easing of every motion inside a beat. */
export const easeInOut: (x: number) => number = ease;

/** Decelerating ease on [0, 1] (clamped): quick start, soft landing (used for a drop or a label sliding in). */
export function easeOut(x: number): number {
  const f = clamp(x, 0, 1);
  return 1 - (1 - f) * (1 - f);
}

/** Linear interpolation a → b by f (f is not clamped: callers pass an eased fraction). */
export function tween(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/**
 * Eased progress of x through [a, b]: 0 at or before a, 1 at or after b, smoothstep in between. The helper every
 * in-beat motion uses ("the arrow turns between local 0.2 and 0.7"). A degenerate range (b ≤ a) is a step at a.
 */
export function seg(x: number, a: number, b: number): number {
  if (b <= a) return x >= a ? 1 : 0;
  return easeInOut((x - a) / (b - a));
}

/** Linear progress of x through [a, b], clamped to [0, 1] — for pathLength / stroke-dasharray reveals. */
export function revealed(x: number, a: number, b: number): number {
  if (b <= a) return x >= a ? 1 : 0;
  return clamp((x - a) / (b - a), 0, 1);
}

/**
 * Split [a, b] into consecutive sub-ranges proportional to `weights` (motions that follow one another inside a beat:
 * "grow the axis, then drop the perpendicular, then slide the label"). Non-positive weights get no length.
 */
export function splitRange(a: number, b: number, weights: readonly number[]): Array<readonly [number, number]> {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  const out: Array<readonly [number, number]> = [];
  let x = a;
  for (const w of weights) {
    const len = total > 0 ? ((b - a) * Math.max(0, w)) / total : 0;
    out.push([x, x + len]);
    x += len;
  }
  return out;
}

// ── beats ──────────────────────────────────────────────────────────────────────────────────────────────────────

function tile<Id extends string>(ids: readonly Id[], lengths: readonly number[]): Beat<Id>[] {
  const total = lengths.reduce((s, l) => s + l, 0);
  if (ids.length === 0 || !(total > 0)) throw new Error('timeline: beats must have a positive total length');
  const beats: Beat<Id>[] = [];
  let from = 0;
  for (let i = 0; i < ids.length; i++) {
    const to = i === ids.length - 1 ? 1 : from + lengths[i] / total;
    beats.push({ id: ids[i], from, to });
    from = to;
  }
  return beats;
}

/**
 * Beats from nominal lengths: fractions tile [0, 1] exactly, durationMs = the sum (or `durationMs` when given, the
 * fractions then stay proportional), key = ids + lengths. `window` is passed through for ECG-backed scenes.
 */
export function compileBeats<Id extends string>(
  defs: readonly BeatDef<Id>[],
  opts: { readonly durationMs?: number; readonly window?: readonly [number, number]; readonly key?: string } = {},
): Timeline<Id> {
  for (const d of defs) if (!(d.ms >= 0)) throw new Error(`timeline: beat ${d.id} has an invalid length`);
  const sum = defs.reduce((s, d) => s + d.ms, 0);
  // a zero-length beat still gets a sliver so prev/next can land on it
  const lengths = defs.map((d) => (d.ms > 0 ? d.ms : Math.max(1, sum) * MIN_BEAT_FRACTION));
  const beats = tile(
    defs.map((d) => d.id),
    lengths,
  );
  const durationMs = opts.durationMs ?? sum;
  const key = opts.key ?? `${defs.map((d) => `${d.id}:${d.ms}`).join('|')}#${durationMs}${opts.window ? `@${opts.window[0]},${opts.window[1]}` : ''}`;
  return opts.window ? { beats, durationMs, window: opts.window, key } : { beats, durationMs, key };
}

/** The eight fiducial times of a beat, in ms of the record (null P → the P beats collapse; null tPeak → mid ST–T). */
export function fiducialTimes(b: BeatFiducials): Record<Fid, number> {
  const start = b.pOn != null ? b.pOn - 40 : b.qrsOn - 160;
  const end = b.tOff + 60;
  const pOn = b.pOn ?? start;
  const pOff = b.pOff ?? pOn;
  const hisOn = Math.max(pOff, b.qrsOn - HIS_LEAD_MS);
  const tPeak = b.tPeak ?? (b.qrsOff + b.tOff) / 2;
  return { start, pOn, pOff, hisOn, qrsOn: b.qrsOn, qrsOff: b.qrsOff, tPeak, end };
}

/**
 * Beats anchored to the fiducials of a real (or schematic) beat: p = 0 … 1 maps to [start, end] = [pOn − 40, tOff + 60]
 * (qrsOn − 160 without a P). Anchors must be non-decreasing (throws otherwise); a zero-length beat gets
 * MIN_BEAT_FRACTION of the timeline; durationMs = clamp((end − start) × slow, clampMs ?? [1500, 6000]).
 */
export function anchorBeats<Id extends string>(
  defs: readonly AnchoredBeatDef<Id>[],
  b: BeatFiducials,
  opts: { readonly slow: number; readonly clampMs?: readonly [number, number]; readonly key?: string },
): Timeline<Id> {
  const f = fiducialTimes(b);
  const span = f.end - f.start;
  if (!(span > 0)) throw new Error('timeline: the beat window is empty');
  const lengths: number[] = [];
  for (const d of defs) {
    const len = f[d.to] - f[d.from];
    if (len < -1e-9) throw new Error(`timeline: anchors of beat ${d.id} are decreasing (${d.from} → ${d.to})`);
    lengths.push(len);
  }
  const anyZero = lengths.some((l) => l <= 0);
  const beats = tile(
    defs.map((d) => d.id),
    anyZero ? lengths.map((l) => (l > 0 ? l : span * MIN_BEAT_FRACTION)) : lengths,
  );
  const [lo, hi] = opts.clampMs ?? DEFAULT_CLAMP_MS;
  const durationMs = clamp(span * opts.slow, lo, hi);
  const window: readonly [number, number] = [f.start, f.end];
  const key = opts.key ?? `${defs.map((d) => d.id).join('|')}@${Math.round(f.start)},${Math.round(f.end)}#${Math.round(b.qrsOn)}x${opts.slow}`;
  return { beats, durationMs, window, key };
}

/** Index of the beat containing p (p = 1 and anything beyond → the last beat; below 0 → the first). */
export function beatIndexAt(beats: readonly Beat[], p: number): number {
  if (beats.length === 0) return 0;
  if (p >= 1) return beats.length - 1;
  for (let i = 0; i < beats.length; i++) if (p < beats[i].to) return Math.max(0, i);
  return beats.length - 1;
}

/** Progress 0 … 1 of p inside beat i (0 before it, 1 after it). */
export function local(beats: readonly Beat[], i: number, p: number): number {
  const b = beats[i];
  if (!b) return 0;
  if (b.to <= b.from) return p >= b.from ? 1 : 0;
  return clamp((p - b.from) / (b.to - b.from), 0, 1);
}

/** Where prev / next / the beat bar land: the start, the middle or the end of beat i (clamped index). */
export function beatTarget(beats: readonly Beat[], i: number, where: BeatTargetKind): number {
  if (beats.length === 0) return 0;
  const b = beats[clamp(Math.round(i), 0, beats.length - 1)];
  if (where === 'start') return b.from;
  if (where === 'middle') return (b.from + b.to) / 2;
  return b.to;
}

// ── time ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** ECG time (ms) at p for a windowed timeline. */
export function timeOfP(window: readonly [number, number], p: number): number {
  return window[0] + (window[1] - window[0]) * clamp(p, 0, 1);
}

/** p of an ECG time (ms), clamped to [0, 1]; an empty window maps everything to 0. */
export function pOfTime(window: readonly [number, number], t: number): number {
  const span = window[1] - window[0];
  if (!(span > 0)) return 0;
  return clamp((t - window[0]) / span, 0, 1);
}

/**
 * Whether a frame may emit a state update: true when at least `minIntervalMs` passed since the last emitted frame
 * (0 → every frame). The hook raises the interval to ~33 ms (30 fps) when the previous frame took longer than 20 ms.
 */
export function frameGate(lastMs: number, nowMs: number, minIntervalMs: number): boolean {
  return minIntervalMs <= 0 || nowMs - lastMs >= minIntervalMs;
}

/** The interval frameGate should use after a frame that took `prevFrameMs`: 30 fps once frames get slow. */
export function gateInterval(prevFrameMs: number, slowFrameMs = 20, cappedIntervalMs = 1000 / 30): number {
  return prevFrameMs > slowFrameMs ? cappedIntervalMs : 0;
}

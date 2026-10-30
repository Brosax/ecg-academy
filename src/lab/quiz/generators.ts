/**
 * Seeded quiz generators. Answers are computed from the engine: truth windows (cycleAt), projections (projector /
 * sampleLeads), responsible structures (responsible). Questions use a cycle at or just before tRef — never far in the
 * future, because generating rhythm events ahead (append-only) would postpone a later heart-rate change.
 */
import { deflectionOf, ISO_MV, mag } from '../explain/vector';
import type { CycleTruth, FrankVec, LeadName, SimEngine, StructureId, WaveSegment } from '../sim/types';
import { LEADS, STRUCTURES } from '../sim/types';
import { mulberry32, pick, shuffle } from './rng';
import type { Rng } from './rng';
import type {
  CalipersQuestion, LeadGroupQuestion, Polarity, ProjectionQuestion, Question, QuizKind, SegmentQuestion, StripSpec,
  StructureQuestion,
} from './types';
import { QUIZ_KINDS, WALL_LEADS, WALLS } from './types';

export interface QuizContext {
  readonly engine: SimEngine;
  readonly rng: Rng;
  readonly tRef: number;
}

/** Earliest reference time with a complete cycle behind it (first P onset ≈ 112 ms at 75 bpm). */
export const MIN_TREF_MS = 2500;
/** Calipers tolerance (task spec: ±20 ms). */
export const CALIPER_TOL_MS = 20;
/** Segment clicks are accepted this close to the truth window (≈2 px on a phone-width strip). */
export const SEGMENT_CLICK_TOL_MS = 5;
/** Projection questions only use instants with a clearly visible heart vector. */
export const PROJ_MIN_H_MV = 0.25;
/** …and a clearly signed answer (3 × the isoelectric threshold) unless the answer is "≈ 0". */
export const PROJ_MIN_SIGNED_MV = 3 * ISO_MV;

/** Structures that depolarize (valves and the fibrous ring are not electrically active). */
export const ACTIVE_STRUCTURES: readonly StructureId[] = STRUCTURES.filter(
  (s) => !['MITRAL', 'TRICUSPID', 'AORTIC', 'PULMONARY', 'AV_RING'].includes(s),
);

const isComplete = (c: CycleTruth | null): c is CycleTruth =>
  !!c && c.pOn !== null && c.pOff !== null && c.qrsOn !== null && c.qrsOff !== null && c.tEnd !== null &&
  ['P', 'PR', 'QRS', 'T'].every((s) => c.segments.some((x) => x.seg === s));

/** A complete cycle at tRef or up to two beats earlier. */
export function pickCycle(ctx: QuizContext): CycleTruth {
  const base = Math.max(ctx.tRef, MIN_TREF_MS);
  const rr = 60000 / ctx.engine.rhythm.heartRate;
  const k = Math.floor(ctx.rng() * 3);
  for (const t of [base - k * rr, base, MIN_TREF_MS]) {
    const c = ctx.engine.cycleAt(Math.max(t, 0));
    if (isComplete(c)) return c;
  }
  throw new Error('quiz: no complete cardiac cycle available');
}

export function stripFor(cycle: CycleTruth, lead: LeadName, mark?: number): StripSpec {
  const tp = cycle.segments.find((s) => s.seg === 'TP');
  // show the whole TP plus the first 20 ms of the next P, so every segment can be clicked
  const end = Math.max(cycle.tEnd! + 60, (tp ? tp.t1 : cycle.tEnd! + 150) + 20);
  return { lead, t0: cycle.pOn! - 80, t1: end, zeroMs: cycle.pOn!, ...(mark !== undefined ? { mark } : {}) };
}

/** Samples H and all 12 leads over [t0, t0 + n) at 1 ms. */
function sampleWindow(engine: SimEngine, t0: number, n: number) {
  const a = new Float32Array(3 * n), v = new Float32Array(3 * n), leads = new Float32Array(12 * n);
  engine.sampleH(t0, n, a, v);
  engine.sampleLeads(t0, n, leads);
  const h = (i: number): FrankVec => [a[3 * i] + v[3 * i], a[3 * i + 1] + v[3 * i + 1], a[3 * i + 2] + v[3 * i + 2]];
  const lead = (l: LeadName, i: number) => leads[LEADS.indexOf(l) * n + i];
  return { h, lead };
}

const span = (c: CycleTruth, seg: WaveSegment) => c.segments.find((s) => s.seg === seg) ?? null;
const polarityOf = (mv: number): Polarity => {
  const d = deflectionOf(mv);
  return d === 'up' ? 'pos' : d === 'down' ? 'neg' : 'iso';
};

// ---------------------------------------------------------------- (1) click a segment

export function genSegment(ctx: QuizContext, id: string): SegmentQuestion {
  const c = pickCycle(ctx);
  const segs = c.segments.map((s) => s.seg);
  const seg = pick(ctx.rng, segs);
  const s = span(c, seg)!;
  return { id, kind: 'segment', seg, strip: stripFor(c, 'II'), answer: { t0: s.t0, t1: s.t1 } };
}

// ---------------------------------------------------------------- (2) which leads face a wall

export function genLeadGroup(ctx: QuizContext, id: string): LeadGroupQuestion {
  const wall = pick(ctx.rng, WALLS);
  return { id, kind: 'leadGroup', wall, answer: WALL_LEADS[wall] };
}

// ---------------------------------------------------------------- (3) projection sign

export function genProjection(ctx: QuizContext, id: string): ProjectionQuestion {
  const { engine, rng } = ctx;
  const c = pickCycle(ctx);
  const want: Polarity = pick(rng, ['pos', 'neg', 'iso'] as const);
  const mk = (tMs: number, lead: LeadName, h: FrankVec, valueMv: number): ProjectionQuestion => ({
    id, kind: 'projection', tMs, lead, h, valueMv, answer: polarityOf(valueMv),
    strip: stripFor(c, lead === 'II' ? 'aVL' : 'II', tMs),
  });

  const qrs = span(c, 'QRS')!;
  if (want === 'iso') {
    // H sweeps through every direction during the QRS, so each lead crosses zero while |H| is large.
    const n = Math.max(1, Math.round(qrs.t1 - qrs.t0));
    const w = sampleWindow(engine, qrs.t0, n);
    for (const lead of shuffle(rng, LEADS)) {
      let best = -1, bestAbs = Infinity;
      for (let i = 0; i < n; i++) {
        const v = Math.abs(w.lead(lead, i));
        // 0.8 × threshold keeps a margin so float rounding can never flip the answer vs. the explanation
        if (mag(w.h(i)) >= PROJ_MIN_H_MV && v < 0.8 * ISO_MV && v < bestAbs) {
          best = i;
          bestAbs = v;
        }
      }
      if (best >= 0) return mk(qrs.t0 + best, lead, w.h(best), w.lead(lead, best));
    }
  }
  const sign = want === 'neg' ? -1 : 1;
  for (const seg of shuffle(rng, ['QRS', 'QRS', 'QRS', 'T'] as const)) {
    const s = span(c, seg);
    if (!s) continue;
    const n = Math.max(1, Math.round(s.t1 - s.t0));
    const w = sampleWindow(engine, s.t0, n);
    const strong: number[] = [];
    for (let i = 0; i < n; i += 2) if (mag(w.h(i)) >= PROJ_MIN_H_MV) strong.push(i);
    if (!strong.length) continue;
    for (let tries = 0; tries < 8; tries++) {
      const i = pick(rng, strong);
      for (const lead of shuffle(rng, LEADS)) {
        const v = w.lead(lead, i);
        if (sign * v >= PROJ_MIN_SIGNED_MV) return mk(s.t0 + i, lead, w.h(i), v);
      }
    }
  }
  // Fallback (never expected with a physiological H): QRS peak in lead II.
  const n = Math.max(1, Math.round(qrs.t1 - qrs.t0));
  const w = sampleWindow(engine, qrs.t0, n);
  let bi = 0;
  for (let i = 0; i < n; i++) if (mag(w.h(i)) > mag(w.h(bi))) bi = i;
  return mk(qrs.t0 + bi, 'II', w.h(bi), w.lead('II', bi));
}

// ---------------------------------------------------------------- (4) which structure is depolarizing

/** Structures whose depolarization window contains t (weight ≈ 1 in engine.responsible). */
export function depolarizingAt(engine: SimEngine, tMs: number): StructureId[] {
  return engine
    .responsible(tMs)
    .filter((r) => r.w >= 0.99 && ACTIVE_STRUCTURES.includes(r.id))
    .map((r) => r.id);
}

export function genStructure(ctx: QuizContext, id: string): StructureQuestion {
  const { engine, rng } = ctx;
  const c = pickCycle(ctx);
  for (const seg of shuffle(rng, ['P', 'PR', 'QRS'] as const)) {
    const s = span(c, seg);
    if (!s) continue;
    const cands: number[] = [];
    for (let t = Math.ceil(s.t0); t < s.t1; t += 2) {
      const dep = depolarizingAt(engine, t);
      const busy = new Set(engine.responsible(t).map((r) => r.id));
      if (dep.length && ACTIVE_STRUCTURES.filter((x) => !busy.has(x)).length >= 3) cands.push(t);
    }
    if (!cands.length) continue;
    const tMs = pick(rng, cands);
    const answer = pick(rng, depolarizingAt(engine, tMs));
    const busy = new Set(engine.responsible(tMs).map((r) => r.id));
    const distractors = shuffle(rng, ACTIVE_STRUCTURES.filter((x) => !busy.has(x))).slice(0, 3);
    return { id, kind: 'structure', tMs, strip: stripFor(c, 'II', tMs), answer, options: shuffle(rng, [answer, ...distractors]) };
  }
  throw new Error('quiz: no depolarizing structure found in the cycle');
}

// ---------------------------------------------------------------- (5) calipers: PR interval

export function genCalipers(ctx: QuizContext, id: string): CalipersQuestion {
  const c = pickCycle(ctx);
  return {
    id, kind: 'calipers', strip: stripFor(c, 'II'), pOn: c.pOn!, qrsOn: c.qrsOn!, answerMs: c.qrsOn! - c.pOn!,
    toleranceMs: CALIPER_TOL_MS,
  };
}

// ---------------------------------------------------------------- quiz set

const GENERATORS: Readonly<Record<QuizKind, (ctx: QuizContext, id: string) => Question>> = {
  segment: genSegment,
  leadGroup: genLeadGroup,
  projection: genProjection,
  structure: genStructure,
  calipers: genCalipers,
};

export interface QuizOptions {
  readonly seed: number;
  /** Reference sim time (ms) — usually store.time at quiz start. */
  readonly tRef: number;
  /** Number of questions (default 10 = two of each kind). */
  readonly count?: number;
  readonly kinds?: readonly QuizKind[];
}

/** Deterministic for a given engine state, seed and tRef. */
export function generateQuiz(engine: SimEngine, opts: QuizOptions): Question[] {
  const rng = mulberry32(opts.seed);
  const kinds = opts.kinds ?? QUIZ_KINDS;
  const count = opts.count ?? 2 * kinds.length;
  const order: QuizKind[] = [];
  while (order.length < count) order.push(...shuffle(rng, kinds));
  const ctx: QuizContext = { engine, rng, tRef: opts.tRef };
  return order.slice(0, count).map((k, i) => GENERATORS[k](ctx, `${k}-${i + 1}`));
}

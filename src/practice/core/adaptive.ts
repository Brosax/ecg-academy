/**
 * Session planning (pure, seeded): the adaptive mixed mode (interleaves due reviews with the learner's weakest
 * competencies — PLAN §1 "deliberate practice, then interleaving; spaced repetition of what was missed"), the spaced-
 * review session, and the exam blueprint (every competency represented, the can't-miss competencies weighted double,
 * synthetic + real mixed).
 */
import type { FindingId } from '../../core/findings';
import { createRng, type Rng } from '../../core/rng';
import type { Difficulty } from '../../synth/index';
import { COMPETENCIES, type CompetencyId, type Mastery, type ReviewCard } from '../api';
import { FAMILY_SPECS, familiesTraining, familyAvailable, getSpec } from './families';
import type { FamilySpec } from './gen/common';
import { findingOfCard } from './mastery';

export interface PlanEntry {
  readonly family: string;
  readonly difficulty: Difficulty;
  readonly seed: number;
  readonly focus?: FindingId;
  /** the review card this entry answers (spaced review) */
  readonly card?: string;
}

/** Which families can produce items right now (default: the live catalogue / case library; tests inject a fake). */
export type Availability = (spec: FamilySpec) => boolean;

const synthFamilies = (c: CompetencyId, ok: Availability) => FAMILY_SPECS.filter((s) => s.competency === c && s.source === 'synth' && ok(s));
const realFamilies = (c: CompetencyId, ok: Availability) => FAMILY_SPECS.filter((s) => s.competency === c && s.source === 'real' && ok(s));

const LADDER: readonly Difficulty[] = ['classic', 'subtle', 'noisy', 'borderline'];

/** The requested difficulty, or the hardest one the family offers below it. */
export function fit(spec: Pick<FamilySpec, 'difficulties'>, d: Difficulty): Difficulty {
  if (spec.difficulties.includes(d)) return d;
  const below = spec.difficulties.filter((x) => LADDER.indexOf(x) < LADDER.indexOf(d));
  return below.length ? below.reduce((a, b) => (LADDER.indexOf(b) > LADDER.indexOf(a) ? b : a)) : spec.difficulties[0];
}

/** Difficulty matched to accuracy: classic until 60 %, subtle until 80 %, then noisy, then borderline. */
export function difficultyFor(accuracy: number | null): Difficulty {
  if (accuracy === null || accuracy < 0.6) return 'classic';
  if (accuracy < 0.8) return 'subtle';
  if (accuracy < 0.92) return 'noisy';
  return 'borderline';
}

function seedFrom(rng: Rng): number {
  return rng.int(1, 2_147_483_646);
}

/** Separate entries of the same family that ended up next to each other (best effort, deterministic). */
export function interleave<T extends { readonly family: string }>(xs: readonly T[]): T[] {
  const out = xs.slice();
  for (let i = 1; i < out.length; i++) {
    if (out[i].family !== out[i - 1].family) continue;
    const j = out.findIndex((x, k) => k > i && x.family !== out[i - 1].family && (k + 1 >= out.length || out[k + 1].family !== out[i].family));
    if (j > i) [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One review entry for a card: the family itself, or a family that trains the card's finding (with focus). */
export function reviewEntry(card: ReviewCard, rng: Rng, ok: Availability = familyAvailable): PlanEntry | null {
  const f = findingOfCard(card.key);
  const d: Difficulty = card.box <= 2 ? 'classic' : card.box === 3 ? 'subtle' : 'noisy';
  if (!f) {
    const spec = getSpec(card.key);
    return spec && ok(spec) ? { family: spec.id, difficulty: fit(spec, d), seed: seedFrom(rng), card: card.key } : null;
  }
  const cands = familiesTraining(f).filter(ok);
  if (cands.length === 0) return null;
  const pref = cands.filter((s) => s.source === 'synth' && (s.kind === 'choice' || s.kind === 'occlusion'));
  const spec = rng.pick(pref.length ? pref : cands);
  return { family: spec.id, difficulty: fit(spec, d), seed: seedFrom(rng), focus: f, card: card.key };
}

export function planReviews(cards: readonly ReviewCard[], seed: number, max = 20, ok: Availability = familyAvailable): PlanEntry[] {
  const rng = createRng(`reviews:${seed}`);
  const out: PlanEntry[] = [];
  for (const c of cards) {
    if (out.length >= max) break;
    const e = reviewEntry(c, rng.fork(c.key), ok);
    if (e) out.push(e);
  }
  return interleave(out);
}

/**
 * Adaptive mixed session: up to 40 % due reviews, the rest drawn by weakness — weight 1 − accuracy per competency
 * (unseen competencies 0.8, never below 0.05) — at a difficulty matched to the competency's accuracy.
 */
export function planMixed(opts: {
  readonly seed: number;
  readonly count: number;
  readonly mastery: (c: CompetencyId) => Mastery;
  readonly due: readonly ReviewCard[];
  readonly includeReal?: boolean;
  readonly available?: Availability;
}): PlanEntry[] {
  const ok = opts.available ?? familyAvailable;
  const rng = createRng(`mixed:${opts.seed}`);
  const out: PlanEntry[] = [];
  const nReview = Math.ceil(opts.count * 0.4);
  for (const c of opts.due) {
    if (out.length >= nReview) break;
    const e = reviewEntry(c, rng.fork(`r:${c.key}`), ok);
    if (e) out.push(e);
  }
  // a competency with no drill available today gets no weight (it would only produce dead slots)
  const weights = COMPETENCIES.map((c) => {
    if (synthFamilies(c, ok).length === 0 && (opts.includeReal === false || realFamilies(c, ok).length === 0)) return 0;
    const m = opts.mastery(c);
    return m.accuracy === null ? 0.8 : Math.max(0.05, 1 - m.accuracy);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return interleave(rng.shuffle(out));
  let k = 0;
  while (out.length < opts.count && k < opts.count * 4) {
    k++;
    const r = rng.fork(`m:${k}`);
    let x = r.next() * total;
    let ci = 0;
    while (ci < weights.length - 1 && (x >= weights[ci] || weights[ci] === 0)) {
      x -= weights[ci];
      ci++;
    }
    const comp = COMPETENCIES[ci];
    const m = opts.mastery(comp);
    const synth = synthFamilies(comp, ok);
    // real tracings once the competency is mastered on synthetic ones (or when no synthetic drill exists yet)
    const reals = opts.includeReal !== false && ((m.accuracy ?? 0) >= 0.8 || synth.length === 0) ? realFamilies(comp, ok) : [];
    const cands = reals.length && (synth.length === 0 || r.next() < 0.5) ? reals : synth;
    if (cands.length === 0) continue;
    const spec = r.pick(cands);
    out.push({ family: spec.id, difficulty: fit(spec, difficultyFor(m.accuracy)), seed: seedFrom(r) });
  }
  return interleave(rng.shuffle(out));
}

// ── exam ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Exam weight per competency: the can't-miss competencies (occlusion, arrhythmia) count double. */
export const EXAM_WEIGHT: Readonly<Record<CompetencyId, number>> = {
  C1: 1,
  C2: 1,
  C3: 1,
  C4: 1,
  C5: 1,
  C6: 1,
  C7: 1,
  C8: 2,
  C9: 2,
  C10: 1,
  C11: 1,
  C12: 1,
};

/**
 * Items per competency by largest remainder over the competencies that can be assessed (default: all); each of them
 * gets one when length ≥ their count, the others get 0.
 */
export function examAllocation(length: number, comps: readonly CompetencyId[] = COMPETENCIES): Record<CompetencyId, number> {
  const out = {} as Record<CompetencyId, number>;
  for (const c of COMPETENCIES) out[c] = 0;
  if (comps.length === 0 || length <= 0) return out;
  const total = comps.reduce((a, c) => a + EXAM_WEIGHT[c], 0);
  const base = length >= comps.length ? 1 : 0;
  let left = length - base * comps.length;
  const raw = comps.map((c) => ({ c, v: (left * EXAM_WEIGHT[c]) / total }));
  for (const r of raw) {
    out[r.c] = base + Math.floor(r.v);
  }
  left -= raw.reduce((a, r) => a + Math.floor(r.v), 0);
  const order = raw.slice().sort((a, b) => b.v - Math.floor(b.v) - (a.v - Math.floor(a.v)) || EXAM_WEIGHT[b.c] - EXAM_WEIGHT[a.c]);
  for (let i = 0; i < left; i++) out[order[i % order.length].c] += 1;
  return out;
}

/** Competencies the exam can assess today (at least one available drill, synthetic or — when allowed — real). */
export function examCompetencies(includeReal: boolean, ok: Availability = familyAvailable): CompetencyId[] {
  return COMPETENCIES.filter((c) => synthFamilies(c, ok).length > 0 || (includeReal && realFamilies(c, ok).length > 0));
}

export function examBlueprint(opts: { readonly length: number; readonly includeReal: boolean; readonly seed: number; readonly available?: Availability }): PlanEntry[] {
  const ok = opts.available ?? familyAvailable;
  const rng = createRng(`exam:${opts.seed}`);
  const alloc = examAllocation(opts.length, examCompetencies(opts.includeReal, ok));
  const out: (PlanEntry & { readonly comp: CompetencyId })[] = [];
  for (const c of COMPETENCIES) {
    for (let i = 0; i < alloc[c]; i++) {
      const r = rng.fork(`${c}:${i}`);
      const reals = opts.includeReal ? realFamilies(c, ok) : [];
      const synth = synthFamilies(c, ok);
      const useReal = reals.length > 0 && (synth.length === 0 || r.next() < 0.35);
      const cands = useReal ? reals : synth;
      if (cands.length === 0) continue;
      const spec = r.pick(cands);
      const d = r.pick(['classic', 'classic', 'subtle', 'subtle', 'noisy'] as const);
      out.push({ family: spec.id, difficulty: fit(spec, d), seed: seedFrom(r), comp: c });
    }
  }
  const shuffled = rng.shuffle(out);
  // avoid two items of the same competency in a row where possible
  for (let i = 1; i < shuffled.length; i++) {
    if (shuffled[i].comp !== shuffled[i - 1].comp) continue;
    const j = shuffled.findIndex((x, k) => k > i && x.comp !== shuffled[i - 1].comp);
    if (j > i) [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map(({ comp: _c, ...e }) => e);
}

/** Exam score per competency (mean item score) and the separate count of missed critical findings. */
export function examSummary(results: readonly { readonly competency: CompetencyId; readonly score: number; readonly missedCritical?: boolean }[]): {
  readonly total: number;
  readonly byCompetency: Readonly<Partial<Record<CompetencyId, { readonly n: number; readonly score: number }>>>;
  readonly missedCritical: number;
} {
  const by: Partial<Record<CompetencyId, { n: number; score: number }>> = {};
  for (const r of results) {
    const e = (by[r.competency] ??= { n: 0, score: 0 });
    e.n += 1;
    e.score += r.score;
  }
  for (const k of Object.keys(by) as CompetencyId[]) {
    const e = by[k];
    if (e) e.score /= e.n;
  }
  const total = results.length ? results.reduce((a, r) => a + r.score, 0) / results.length : 0;
  return { total, byCompetency: by, missedCritical: results.filter((r) => r.missedCritical).length };
}

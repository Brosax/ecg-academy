/**
 * Mastery and spaced-review maths (pure; docs/PLAN.md §3 assessment rules, §5).
 *
 *  - Exponentially weighted accuracy: a weighted mean of the scores with weights (1 − α)^age (newest age 0), α = 0.15
 *    (≈ the last 13 attempts carry two thirds of the weight). Normalized, so one attempt gives its own score.
 *  - Rolling accuracy over the last 30 attempts (all of them while there are fewer).
 *  - Plateau: at least 30 attempts and a flat learning curve — the least-squares slope over the last 30 scores changes
 *    the fitted accuracy by at most 0.15 across the window. A competency is passed at rolling-30 ≥ its target AND plateau.
 *  - Leitner boxes 1–5 with review intervals 1, 2, 4, 8, 16 days. A miss (score < 0.8) creates the card or sends it
 *    back to box 1 (due in 1 day); a pass at or after the due time moves it up one box; a pass from box 5 retires it.
 *    A pass before the card is due changes nothing (it was not a spaced review).
 */
import type { FindingId } from '../../core/findings';
import type { Attempt, CompetencyId, Mastery, ReviewCard } from '../api';

export const EW_ALPHA = 0.15;
export const ROLLING_N = 30;
export const PLATEAU_MAX_DRIFT = 0.15;
export const REVIEW_PASS = 0.8;
export const LEITNER_DAYS = [1, 2, 4, 8, 16] as const;
export const DAY_MS = 86_400_000;

/** Target rolling accuracy per competency (docs/PLAN.md §1, mastery evidence). */
export const MASTERY_TARGET: Readonly<Record<CompetencyId, number>> = {
  C1: 0.9,
  C2: 0.9,
  C3: 0.85,
  C4: 0.85,
  C5: 0.9,
  C6: 0.85,
  C7: 0.8,
  C8: 0.9,
  C9: 0.85,
  C10: 0.8,
  C11: 0.8,
  C12: 0.85,
};

export function ewAccuracy(scores: readonly number[], alpha: number = EW_ALPHA): number | null {
  if (scores.length === 0) return null;
  let num = 0;
  let den = 0;
  let w = 1;
  for (let i = scores.length - 1; i >= 0; i--) {
    num += w * scores[i];
    den += w;
    w *= 1 - alpha;
  }
  return num / den;
}

export function rolling(scores: readonly number[], n: number = ROLLING_N): number | null {
  if (scores.length === 0) return null;
  const xs = scores.slice(-n);
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Least-squares slope of y over its index. */
export function slope(ys: readonly number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - mx) * (ys[i] - my);
    sxx += (i - mx) * (i - mx);
  }
  return sxx === 0 ? 0 : sxy / sxx;
}

export function plateau(scores: readonly number[]): boolean {
  if (scores.length < ROLLING_N) return false;
  const xs = scores.slice(-ROLLING_N);
  return Math.abs(slope(xs) * (ROLLING_N - 1)) <= PLATEAU_MAX_DRIFT + 1e-12;
}

export function masteryFrom(scores: readonly number[]): Mastery {
  return { accuracy: ewAccuracy(scores), attempts: scores.length, rolling30: rolling(scores), plateau: plateau(scores) };
}

export function isPassed(m: Mastery, target: number): boolean {
  return m.rolling30 !== null && m.attempts >= ROLLING_N && m.rolling30 >= target - 1e-12 && m.plateau;
}

/**
 * Overall mastery 0..1: the mean over all twelve competencies of the EW accuracy scaled by the evidence behind it
 * (full weight from 10 attempts), so five lucky items in one skill do not fill the ring. null without any attempt.
 */
export function overallFrom(byCompetency: readonly Mastery[]): number | null {
  if (byCompetency.every((m) => m.attempts === 0)) return null;
  const total = byCompetency.reduce((acc, m) => acc + (m.accuracy ?? 0) * Math.min(1, m.attempts / 10), 0);
  return total / 12;
}

// ── Leitner ──────────────────────────────────────────────────────────────────────────────────────────────────────
type Box = ReviewCard['box'];

function dueFor(box: Box, at: number): number {
  return at + LEITNER_DAYS[box - 1] * DAY_MS;
}

/** Cards an attempt touches: one per trained finding, or the family when the item trains a skill only. */
export function cardKeys(a: Pick<Attempt, 'family' | 'findings'>): string[] {
  return a.findings.length ? a.findings.map((f) => `finding:${f}`) : [a.family];
}

/** The card after an attempt (null = no card: never missed, or retired from box 5). */
export function nextCard(card: ReviewCard | undefined, key: string, score: number, at: number): ReviewCard | null {
  if (score < REVIEW_PASS) return { key, box: 1, due: dueFor(1, at) };
  if (!card) return null;
  if (at < card.due) return card;
  if (card.box === 5) return null;
  const box = (card.box + 1) as Box;
  return { key, box, due: dueFor(box, at) };
}

export function findingOfCard(key: string): FindingId | null {
  return key.startsWith('finding:') ? (key.slice(8) as FindingId) : null;
}

// ── critical-findings tracker ────────────────────────────────────────────────────────────────────────────────────
export type CriticalStatus = 'unseen' | 'learning' | 'secured';

/** A critical finding is secured after ≥ 3 attempts with the last five (or all) at ≥ 0.8 and no missed-critical flag. */
export function criticalStatus(attempts: readonly Pick<Attempt, 'score' | 'missedCritical'>[]): CriticalStatus {
  if (attempts.length === 0) return 'unseen';
  const last = attempts.slice(-5);
  if (attempts.length >= 3 && last.every((a) => a.score >= REVIEW_PASS && !a.missedCritical)) return 'secured';
  return 'learning';
}

// ── confidence calibration ───────────────────────────────────────────────────────────────────────────────────────
export interface CalibrationRow {
  readonly confidence: 1 | 2 | 3;
  readonly n: number;
  readonly accuracy: number | null;
  /** accuracy a well-calibrated reader would have at this confidence */
  readonly expected: number;
}

export const CONFIDENCE_EXPECTED: Readonly<Record<1 | 2 | 3, number>> = { 1: 0.4, 2: 0.7, 3: 0.95 };

export function calibration(attempts: readonly Pick<Attempt, 'score' | 'confidence'>[]): CalibrationRow[] {
  return ([1, 2, 3] as const).map((c) => {
    const xs = attempts.filter((a) => a.confidence === c).map((a) => a.score);
    return { confidence: c, n: xs.length, accuracy: xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null, expected: CONFIDENCE_EXPECTED[c] };
  });
}

/** Learning curve points: rolling accuracy (window w) after each attempt. */
export function learningCurve(scores: readonly number[], w = 10): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < scores.length; i++) {
    sum += scores[i];
    if (i >= w) sum -= scores[i - w];
    out.push(sum / Math.min(i + 1, w));
  }
  return out;
}

import { describe, expect, it } from 'vitest';
import {
  calibration,
  cardKeys,
  criticalStatus,
  DAY_MS,
  EW_ALPHA,
  ewAccuracy,
  isPassed,
  learningCurve,
  masteryFrom,
  nextCard,
  overallFrom,
  plateau,
  rolling,
  slope,
} from '../../../src/practice/core/mastery';

describe('exponentially weighted accuracy', () => {
  it('is null without attempts and the score itself after one', () => {
    expect(ewAccuracy([])).toBeNull();
    expect(ewAccuracy([0.7])).toBeCloseTo(0.7, 12);
  });
  it('weights the newest attempt most (hand-computed)', () => {
    const w = 1 - EW_ALPHA;
    expect(ewAccuracy([0, 1])).toBeCloseTo(1 / (1 + w), 12);
    expect(ewAccuracy([1, 0])).toBeCloseTo(w / (1 + w), 12);
    expect(ewAccuracy([1, 1, 0])).toBeCloseTo((w + w * w) / (1 + w + w * w), 12);
  });
  it('is constant on a constant sequence', () => {
    expect(ewAccuracy(Array(50).fill(0.8))).toBeCloseTo(0.8, 12);
  });
});

describe('rolling-30 and plateau', () => {
  it('rolling uses the last 30 (all while fewer)', () => {
    expect(rolling([])).toBeNull();
    expect(rolling([1, 0])).toBe(0.5);
    expect(rolling([...Array(10).fill(0), ...Array(30).fill(1)])).toBe(1);
  });
  it('slope of a line', () => {
    expect(slope([0, 1, 2, 3])).toBeCloseTo(1, 12);
    expect(slope([5, 5, 5])).toBe(0);
  });
  it('needs 30 attempts; flat curves plateau, rising ones do not', () => {
    expect(plateau(Array(29).fill(1))).toBe(false);
    expect(plateau(Array(30).fill(1))).toBe(true);
    expect(plateau(Array.from({ length: 30 }, (_, i) => i / 29))).toBe(false);
    // a drift of exactly 0.15 across the window still counts as flat
    expect(plateau(Array.from({ length: 30 }, (_, i) => 0.8 + (0.15 * i) / 29))).toBe(true);
    expect(plateau(Array.from({ length: 30 }, (_, i) => 0.8 + (0.16 * i) / 29))).toBe(false);
  });
  it('masteryFrom and isPassed', () => {
    const m = masteryFrom(Array(30).fill(0.9));
    expect(m).toEqual({ accuracy: expect.closeTo(0.9, 9), attempts: 30, rolling30: expect.closeTo(0.9, 9), plateau: true });
    expect(isPassed(m, 0.85)).toBe(true);
    expect(isPassed(m, 0.95)).toBe(false);
    expect(isPassed(masteryFrom(Array(20).fill(1)), 0.8)).toBe(false);
  });
  it('overall mastery scales accuracy by evidence across all twelve competencies', () => {
    const none = masteryFrom([]);
    expect(overallFrom(Array(12).fill(none))).toBeNull();
    const five = masteryFrom(Array(5).fill(1));
    expect(overallFrom([five, ...Array(11).fill(none)])).toBeCloseTo(0.5 / 12, 12);
    const ten = masteryFrom(Array(10).fill(1));
    expect(overallFrom(Array(12).fill(ten))).toBeCloseTo(1, 12);
  });
  it('learning curve is a trailing mean', () => {
    expect(learningCurve([1, 0, 1, 1], 2)).toEqual([1, 0.5, 0.5, 1]);
  });
});

describe('Leitner boxes', () => {
  const t0 = 1_000_000_000_000;
  it('a miss creates a box-1 card due in one day', () => {
    expect(nextCard(undefined, 'k', 0.5, t0)).toEqual({ key: 'k', box: 1, due: t0 + DAY_MS });
  });
  it('a pass without a card creates nothing', () => {
    expect(nextCard(undefined, 'k', 1, t0)).toBeNull();
  });
  it('a pass before the due time changes nothing; at the due time it moves up one box', () => {
    const c = { key: 'k', box: 1 as const, due: t0 + DAY_MS };
    expect(nextCard(c, 'k', 1, t0 + 1000)).toBe(c);
    expect(nextCard(c, 'k', 0.8, t0 + DAY_MS)).toEqual({ key: 'k', box: 2, due: t0 + 3 * DAY_MS });
  });
  it('intervals are 1, 2, 4, 8, 16 days; box 5 passed retires the card; a miss resets to box 1', () => {
    let c = nextCard(undefined, 'k', 0, t0);
    let now = t0;
    const gaps: number[] = [];
    for (let i = 0; i < 4 && c; i++) {
      now = c.due;
      c = nextCard(c, 'k', 1, now);
      if (c) gaps.push((c.due - now) / DAY_MS);
    }
    expect(gaps).toEqual([2, 4, 8, 16]);
    expect(c?.box).toBe(5);
    if (c) expect(nextCard(c, 'k', 1, c.due)).toBeNull();
    if (c) expect(nextCard(c, 'k', 0.79, c.due)).toEqual({ key: 'k', box: 1, due: c.due + DAY_MS });
  });
  it('card keys: one per trained finding, else the family', () => {
    expect(cardKeys({ family: 'rate', findings: [] })).toEqual(['rate']);
    expect(cardKeys({ family: 'av-block', findings: ['av-block-3'] })).toEqual(['finding:av-block-3']);
  });
});

describe('critical tracker and calibration', () => {
  it('secured after ≥ 3 attempts with the last five passed and no missed critical', () => {
    expect(criticalStatus([])).toBe('unseen');
    expect(criticalStatus([{ score: 1 }, { score: 1 }])).toBe('learning');
    expect(criticalStatus([{ score: 0 }, { score: 1 }, { score: 1 }, { score: 1 }, { score: 1 }, { score: 1 }])).toBe('secured');
    expect(criticalStatus([{ score: 1 }, { score: 1 }, { score: 1, missedCritical: true }])).toBe('learning');
  });
  it('calibration rows per confidence', () => {
    const rows = calibration([
      { score: 1, confidence: 3 },
      { score: 0, confidence: 3 },
      { score: 1, confidence: 1 },
      { score: 1 },
    ]);
    expect(rows.map((r) => [r.confidence, r.n, r.accuracy])).toEqual([
      [1, 1, 1],
      [2, 0, null],
      [3, 2, 0.5],
    ]);
  });
});

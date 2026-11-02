import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { overallProgress } from '../../../src/app/slots';
import { scheduleReview as queueLessonReview } from '../../../src/course/deps';
import { reviewKeys } from '../../../src/course/stages';
import type { Attempt } from '../../../src/practice/api';
import { DAY_MS, LEITNER_DAYS } from '../../../src/practice/core/mastery';
import {
  allAttempts,
  allCards,
  dueReviews,
  exportProgress,
  getLessonProgress,
  importProgress,
  masteryOf,
  masteryOfFamily,
  masteryOfFinding,
  overallMastery,
  PROGRESS_KEY,
  progressVersion,
  recordAttempt,
  reloadProgress,
  resetProgress,
  scheduleReview,
  setLessonProgress,
} from '../../../src/practice/core/progress';
import exampleLesson from '../../course/fixtures/example-lesson';

class MemoryStorage {
  readonly m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

const g = globalThis as { localStorage?: unknown };
const prev = g.localStorage;
const mem = new MemoryStorage();
g.localStorage = mem;
afterAll(() => {
  g.localStorage = prev;
});

const T0 = 1_700_000_000_000;
const att = (over: Partial<Attempt> = {}): Attempt => ({ itemId: 'rate:classic:1', family: 'rate', competency: 'C2', findings: [], score: 1, at: T0, ...over });

beforeEach(() => {
  mem.clear();
  reloadProgress();
  resetProgress();
});

describe('progress store', () => {
  it('records attempts, persists them and bumps the version', () => {
    const v0 = progressVersion.value;
    recordAttempt(att());
    expect(progressVersion.value).toBe(v0 + 1);
    expect(allAttempts()).toHaveLength(1);
    expect(mem.getItem(PROGRESS_KEY)).toContain('rate:classic:1');
    reloadProgress();
    expect(allAttempts()).toHaveLength(1);
  });

  it('computes mastery per competency, finding and family; overall feeds the header ring', () => {
    for (let i = 0; i < 10; i++) recordAttempt(att({ at: T0 + i, score: i % 2 }));
    recordAttempt(att({ family: 'av-block', competency: 'C6', findings: ['av-block-3'], score: 1, at: T0 + 20 }));
    expect(masteryOf('C2').attempts).toBe(10);
    expect(masteryOf('C6').accuracy).toBe(1);
    expect(masteryOf('C1').accuracy).toBeNull();
    expect(masteryOfFinding('av-block-3').attempts).toBe(1);
    expect(masteryOfFamily('rate').rolling30).toBe(0.5);
    expect(overallMastery()).not.toBeNull();
    expect(overallProgress.value).toBe(overallMastery());
  });

  it('a miss enters spaced review; a pass at the due time promotes the card', () => {
    recordAttempt(att({ family: 'av-block', competency: 'C6', findings: ['av-block-2-mobitz2'], score: 0, at: T0 }));
    expect(dueReviews(T0)).toHaveLength(0);
    const due = dueReviews(T0 + DAY_MS);
    expect(due.map((c) => c.key)).toEqual(['finding:av-block-2-mobitz2']);
    recordAttempt(att({ family: 'av-block', competency: 'C6', findings: ['av-block-2-mobitz2'], score: 1, at: T0 + DAY_MS }));
    expect(dueReviews(T0 + DAY_MS * 2)).toHaveLength(0);
    expect(dueReviews(T0 + DAY_MS * 3)[0]?.box).toBe(2);
  });

  it('stores lesson progress', () => {
    expect(getLessonProgress('s2')).toBeNull();
    setLessonProgress('s2', { step: 3, done: false, at: T0 });
    expect(getLessonProgress('s2')).toEqual({ step: 3, done: false, at: T0 });
    setLessonProgress('s2', { step: -1, done: true, at: T0 } as never);
    expect(getLessonProgress('s2')?.step).toBe(3);
  });

  it('export → reset → import round-trips everything', () => {
    recordAttempt(att({ confidence: 2 }));
    recordAttempt(att({ family: 'occlusion', competency: 'C8', findings: ['stemi-inferior'], score: 0, missedCritical: true, at: T0 + 5 }));
    setLessonProgress('i1', { step: 2, done: true, at: T0 });
    const json = exportProgress();
    const doc = JSON.parse(json);
    expect(doc).toMatchObject({ app: 'ecg-academy', kind: 'progress', v: 1 });
    resetProgress();
    expect(allAttempts()).toHaveLength(0);
    expect(importProgress(json)).toBe(true);
    expect(exportProgress()).toBe(json);
    expect(allAttempts()[1]).toEqual(att({ family: 'occlusion', competency: 'C8', findings: ['stemi-inferior'], score: 0, missedCritical: true, at: T0 + 5 }));
    expect(getLessonProgress('i1')?.done).toBe(true);
  });

  it('rejects documents that are not progress, or from a newer schema, without touching state', () => {
    recordAttempt(att());
    const before = exportProgress();
    expect(importProgress('not json')).toBe(false);
    expect(importProgress('{"app":"other","kind":"progress","v":1,"attempts":[]}')).toBe(false);
    expect(importProgress('{"app":"ecg-academy","kind":"progress","v":99,"attempts":[]}')).toBe(false);
    expect(importProgress('{"app":"ecg-academy","kind":"progress","v":1,"attempts":"x"}')).toBe(false);
    expect(exportProgress()).toBe(before);
  });

  it('drops invalid entries but keeps valid ones', () => {
    const doc = {
      app: 'ecg-academy',
      kind: 'progress',
      v: 1,
      attempts: [att(), { ...att(), competency: 'C99' }, { ...att(), score: 'x' }, { ...att(), findings: ['lbbb', 'not-a-finding'], score: 7 }, null],
      cards: [{ key: 'rate', box: 9, due: 1 }, { key: 'rate', box: 2, due: T0 }],
      lessons: { a: { step: 1, done: false, at: T0 }, b: { step: 'x' } },
    };
    expect(importProgress(JSON.stringify(doc))).toBe(true);
    const xs = allAttempts();
    expect(xs).toHaveLength(2);
    expect(xs[1].findings).toEqual(['lbbb']);
    expect(xs[1].score).toBe(1);
    expect(dueReviews(T0).map((c) => c.box)).toEqual([2]);
    expect(getLessonProgress('a')).not.toBeNull();
    expect(getLessonProgress('b')).toBeNull();
  });

  it('a finished lesson’s key points enter the review queue and stay there', () => {
    const keys = reviewKeys(exampleLesson);
    expect(keys.length).toBeGreaterThan(0);
    expect(queueLessonReview(keys, T0)).toBe(true);
    // just learned: box 1, due after the same one-day interval as a first miss — not due immediately
    expect(dueReviews(T0)).toEqual([]);
    const dueAt = T0 + LEITNER_DAYS[0] * DAY_MS;
    const queued = dueReviews(dueAt);
    expect(queued.map((c) => c.key)).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
    expect(queued.every((c) => c.box === 1 && c.due === dueAt)).toBe(true);

    const json = exportProgress();
    resetProgress();
    expect(dueReviews(dueAt)).toEqual([]);
    expect(importProgress(json)).toBe(true);
    reloadProgress();
    expect(dueReviews(dueAt).map((c) => c.key)).toEqual(queued.map((c) => c.key));
  });

  it('does not move a card that is already queued, and a later pass promotes it', () => {
    recordAttempt(att({ family: 'av-block', competency: 'C6', findings: ['lbbb'], score: 0, at: T0 }));
    const missed = allCards().find((c) => c.key === 'finding:lbbb');
    expect(missed).toEqual({ key: 'finding:lbbb', box: 1, due: T0 + DAY_MS });
    const v = progressVersion.value;
    scheduleReview(['finding:lbbb', 'finding:lbbb', 'rate'], T0);
    expect(progressVersion.value).toBe(v + 1);
    expect(allCards().find((c) => c.key === 'finding:lbbb')).toEqual(missed);
    expect(allCards().find((c) => c.key === 'rate')).toEqual({ key: 'rate', box: 1, due: T0 + DAY_MS });

    const v2 = progressVersion.value;
    scheduleReview(['finding:lbbb', 'rate'], T0 + 5 * DAY_MS);
    expect(progressVersion.value).toBe(v2);
    expect(allCards().find((c) => c.key === 'rate')?.due).toBe(T0 + DAY_MS);

    recordAttempt(att({ score: 1, at: T0 + DAY_MS }));
    expect(allCards().find((c) => c.key === 'rate')).toEqual({ key: 'rate', box: 2, due: T0 + DAY_MS + LEITNER_DAYS[1] * DAY_MS });
  });

  it('ignores blank keys and finding ids that are not in the taxonomy', () => {
    const v = progressVersion.value;
    scheduleReview(['', 'finding:not-a-finding', 'finding:'], T0);
    expect(allCards()).toEqual([]);
    expect(progressVersion.value).toBe(v);
    expect(queueLessonReview([], T0)).toBe(false);
    scheduleReview(['finding:lbbb'], Number.NaN);
    expect(allCards()).toEqual([]);
  });

  it('recovers from corrupt stored data (kept aside) and from blocked storage', () => {
    mem.setItem(PROGRESS_KEY, '{"app":"ecg-academy",');
    reloadProgress();
    expect(allAttempts()).toHaveLength(0);
    expect(mem.getItem(`${PROGRESS_KEY}:corrupt`)).toBe('{"app":"ecg-academy",');
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
    };
    g.localStorage = throwing;
    reloadProgress();
    expect(() => recordAttempt(att())).not.toThrow();
    expect(allAttempts()).toHaveLength(1);
    g.localStorage = mem;
  });
});

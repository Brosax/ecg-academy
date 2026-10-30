/**
 * The curriculum plan, the course map model and the progress / navigation rules (src/course/catalogue.ts, stages.ts,
 * lessons/index.ts registry helpers).
 */
import { describe, expect, it } from 'vitest';
import type { Lesson } from '../../src/course/api';
import { CURRICULUM, PLANNED_IDS, PLANNED_STAGE, plannedLesson } from '../../src/course/catalogue';
import { fileIdOf, lessonFromModule, registerModules } from '../../src/course/lessons/index';
import {
  buildStages,
  clampStep,
  countDone,
  lessonCode,
  lessonFraction,
  lessonNeighbours,
  lessonState,
  nextLessonToContinue,
  progressAfterFinish,
  progressAfterVisit,
  readyOrder,
  resumeStep,
  reviewKeys,
  stageOfLesson,
} from '../../src/course/stages';
import type { LessonProgress } from '../../src/practice/api';
import { STAGES } from '../../src/practice/api';
import example from './fixtures/example-lesson';

const CJK = /[㐀-鿿]/;

describe('curriculum plan (docs/PLAN.md §3)', () => {
  it('eight stages in the PLAN order', () => {
    expect(CURRICULUM.map((s) => s.id)).toEqual([...STAGES]);
  });
  it('64 lessons with the PLAN ids, in order', () => {
    const expected = { F: 6, S: 7, R: 8, T: 7, I: 11, H: 9, O: 12, X: 4 } as const;
    for (const s of CURRICULUM) {
      expect(s.lessons.map((x) => x.id)).toEqual(Array.from({ length: expected[s.id] }, (_v, i) => `${s.id.toLowerCase()}${i + 1}`));
    }
    expect(PLANNED_IDS).toHaveLength(64);
    expect(new Set(PLANNED_IDS).size).toBe(64);
  });
  it('every title and goal is in zh, en and es (Chinese is Chinese, Spanish is not an English copy)', () => {
    const texts = CURRICULUM.flatMap((s) => [s.title, s.goal, ...s.lessons.map((x) => x.title)]);
    for (const t of texts) {
      expect(t.zh.trim()).not.toBe('');
      expect(t.en.trim()).not.toBe('');
      expect(t.es.trim()).not.toBe('');
      expect(CJK.test(t.zh), t.zh).toBe(true);
    }
    const copies = texts.filter((t) => t.es === t.en && /[a-z]{5,}/i.test(t.en)).map((t) => t.en);
    expect(copies).toEqual([]);
  });
  it('uses current terminology (Spain Spanish; no outdated "hemibloqueo" or "derivada")', () => {
    const es = CURRICULUM.flatMap((s) => [s.title.es, s.goal.es, ...s.lessons.map((x) => x.title.es)]).join('\n');
    expect(es).toMatch(/bloqueo/);
    expect(es).toMatch(/derivaci/);
    expect(es).not.toMatch(/hemibloqueo/i);
    expect(es).not.toMatch(/\bderivada\b/i);
  });
  it('plannedLesson and PLANNED_STAGE', () => {
    expect(plannedLesson('i10')).toMatchObject({ id: 'i10', stage: 'I', order: 10 });
    expect(plannedLesson('z1')).toBeNull();
    expect(PLANNED_STAGE.get('o12')).toBe('O');
  });
});

describe('registry helpers', () => {
  it('a module exports its lesson as default, as `lesson`, or as its only lesson-shaped export', () => {
    expect(lessonFromModule({ default: example })).toBe(example);
    expect(lessonFromModule({ lesson: example })).toBe(example);
    expect(lessonFromModule({ s2: example, helper: 3 })).toBe(example);
    expect(lessonFromModule({ a: example, b: example })).toBeNull();
    expect(lessonFromModule({ default: { id: 'x' } })).toBeNull();
  });
  it('file ids and registration from a (fake) glob map', () => {
    expect(fileIdOf('./i10.ts')).toBe('i10');
    const reg = registerModules({ './s2.ts': { default: example }, './f1.ts': {} });
    expect(reg.map((m) => [m.fileId, m.lesson?.id ?? null])).toEqual([
      ['f1', null],
      ['s2', 's2'],
    ]);
  });
});

const lessonMap = (...ls: Lesson[]) => new Map(ls.map((x) => [x.id, x]));
const withId = (id: string, stage: Lesson['stage'], order = 1): Lesson => ({ ...example, id, stage, order, title: { zh: id, en: id, es: id } });

describe('course map model', () => {
  const stages = buildStages(lessonMap(example, withId('f2', 'F'), withId('r1', 'R')));

  it('all 64 planned lessons are listed; existing ones are ready with their own title', () => {
    expect(stages.flatMap((s) => s.lessons)).toHaveLength(64);
    expect(readyOrder(stages)).toEqual(['f2', 's2', 'r1']);
    const s2 = stages[1].lessons[1];
    expect(s2).toEqual({ id: 's2', title: example.title, status: 'ready' });
    expect(stages[0].lessons[0].status).toBe('planned');
  });
  it('a lesson file not in the plan is appended to its stage', () => {
    const extra = buildStages(lessonMap(withId('f9', 'F', 9)));
    expect(extra[0].lessons.at(-1)).toMatchObject({ id: 'f9', status: 'ready' });
    expect(extra[0].lessons).toHaveLength(7);
  });
  it('neighbours skip planned lessons', () => {
    expect(lessonNeighbours(stages, 's2')).toEqual({ prev: 'f2', next: 'r1' });
    expect(lessonNeighbours(stages, 'f2')).toEqual({ prev: null, next: 's2' });
    expect(lessonNeighbours(stages, 'f1')).toEqual({ prev: null, next: null });
    expect(stageOfLesson(stages, 'r1')).toMatchObject({ n: 3, index: 0 });
    expect(lessonCode('i10')).toBe('I10');
  });
  it('continue: the most recently touched unfinished lesson, else the first ready lesson not done', () => {
    const p = new Map<string, LessonProgress>();
    const get = (id: string) => p.get(id) ?? null;
    expect(nextLessonToContinue(stages, get)).toBe('f2');
    p.set('f2', { step: 14, done: true, at: 1 });
    expect(nextLessonToContinue(stages, get)).toBe('s2');
    p.set('r1', { step: 3, done: false, at: 5 });
    p.set('s2', { step: 2, done: false, at: 3 });
    expect(nextLessonToContinue(stages, get)).toBe('r1');
    p.set('r1', { step: 14, done: true, at: 6 });
    p.set('s2', { step: 14, done: true, at: 7 });
    expect(nextLessonToContinue(stages, get)).toBeNull();
    expect(countDone(stages, get)).toEqual({ done: 3, ready: 3, planned: 61 });
  });
});

describe('progress rules (step = furthest step reached, 1-based)', () => {
  it('fraction, state and resume', () => {
    expect(lessonFraction(null, 10)).toBe(0);
    expect(lessonFraction({ step: 5, done: false, at: 0 }, 10)).toBe(0.5);
    expect(lessonFraction({ step: 3, done: true, at: 0 }, 10)).toBe(1);
    expect(lessonState(null)).toBe('new');
    expect(lessonState({ step: 0, done: false, at: 0 })).toBe('new');
    expect(lessonState({ step: 2, done: false, at: 0 })).toBe('started');
    expect(resumeStep({ step: 4, done: false, at: 0 }, 10)).toBe(4);
    expect(resumeStep({ step: 40, done: false, at: 0 }, 10)).toBe(10);
    expect(resumeStep({ step: 10, done: true, at: 0 }, 10)).toBe(1);
  });
  it('deep-link steps are clamped; no step = resume', () => {
    expect(clampStep(undefined, { step: 3, done: false, at: 0 }, 10)).toBe(3);
    expect(clampStep(0, null, 10)).toBe(1);
    expect(clampStep(99, null, 10)).toBe(10);
    expect(clampStep(4, null, 10)).toBe(4);
  });
  it('visiting keeps the furthest step and done; finishing marks done', () => {
    expect(progressAfterVisit(null, 2, 100)).toEqual({ step: 2, done: false, at: 100 });
    expect(progressAfterVisit({ step: 5, done: false, at: 1 }, 2, 100)).toEqual({ step: 5, done: false, at: 100 });
    expect(progressAfterVisit({ step: 5, done: true, at: 1 }, 6, 100)).toEqual({ step: 6, done: true, at: 100 });
    expect(progressAfterFinish(14, 9)).toEqual({ step: 14, done: true, at: 9 });
  });
  it('review keys: findings taught plus the families of checks and drills', () => {
    expect(reviewKeys(example)).toEqual(['finding:sinus-bradycardia', 'finding:sinus-tachycardia', 'rate']);
  });
});

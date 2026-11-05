import { describe, expect, it } from 'vitest';
import { getLesson } from '../../../src/course/lessons';
import { foundationChapterAt, foundationChapters, foundationEntryStep, isFoundation, presentationProgress } from '../../../src/course/foundations/presentation';
import { pageContext } from '../../../src/assistant/context';
import { lessonFraction } from '../../../src/course/stages';
import { LANGS, pick } from '../../../src/core/l10n';

describe('foundation presentation preserves stored block coordinates', () => {
  for (const id of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']) {
    const lesson = getLesson(id)!;
    it(`${id}: every old link maps once; named chapters are ordered and translated`, () => {
      const chapters = foundationChapters(lesson);
      expect(chapters.map(c => c.id)).toEqual(['question', 'story', 'practice', 'real', 'summary']);
      expect(chapters.flatMap(c => c.legacySteps).sort((a, b) => a - b)).toEqual(lesson.blocks.map((_, i) => i + 1));
      expect(chapters.map(c => c.step)).toEqual(chapters.map(c => c.step).sort((a, b) => a - b));
      for (let s = 1; s <= lesson.blocks.length; s++) expect(chapters[foundationChapterAt(lesson, s)].legacySteps).toContain(s);
      for (const c of chapters) for (const lang of LANGS) {
        expect(pick(c.title, lang).trim().length).toBeGreaterThan(0);
        expect(pick(c.description, lang).trim().length).toBeGreaterThan(0);
      }
      expect(foundationChapterAt(lesson, 0)).toBe(0);
      expect(foundationChapterAt(lesson, 999)).toBe(4);
      expect(foundationChapterAt(lesson, NaN)).toBe(0);
    });
    it(`${id}: new, partial and completed records share one presentation`, () => {
      const chapters = foundationChapters(lesson);
      expect(presentationProgress(lesson, null).fraction).toBe(0);
      expect(presentationProgress(lesson, { step: 0, done: false, at: 1 }).fraction).toBe(0);
      for (const [i, c] of chapters.entries()) for (const step of c.legacySteps) {
        expect(presentationProgress(lesson, { step, done: false, at: 1 })).toEqual({ index: i, total: 5, fraction: (i + 1) / 5 });
      }
      expect(presentationProgress(lesson, { step: lesson.blocks.length, done: true, at: 1 }).fraction).toBe(1);
    });
    it(`${id}: resumed entries expose a chapter-start route, while explicit old links keep their content`, () => {
      for (const chapter of foundationChapters(lesson)) for (const step of chapter.legacySteps) {
        const resumed = foundationEntryStep(lesson, undefined, step);
        expect(resumed).toBe(chapter.step);
        expect(foundationEntryStep(lesson, step, 1)).toBe(step);
        expect(pageContext({ name: 'lesson', id, step: resumed }, 'en').text).toContain(chapter.title.en);
      }
      expect(foundationEntryStep(lesson, 0, 1)).toBe(1);
      expect(foundationEntryStep(lesson, 999, 1)).toBe(lesson.blocks.length);
    });
    it(`${id}: AI sees public chapter descriptions, not hidden original block content`, () => {
      for (const c of foundationChapters(lesson)) for (const step of c.legacySteps) {
        const ctx = pageContext({ name: 'lesson', id, step }, 'en');
        expect(ctx.text).toContain('Current chapter');
        expect(ctx.text).toContain(c.title.en);
        const b = lesson.blocks[step - 1];
        if (b.kind === 'hook') expect(ctx.text).not.toContain(b.reveal.en);
        if (b.kind === 'real') for (const caseId of b.ids) expect(ctx.text).not.toContain(` ${caseId}`);
        if (b.kind === 'figure') expect(ctx.text).not.toContain(b.figure.id);
      }
    });
  }
  it('ordinary courses keep their block count and progress', () => {
    const lesson = getLesson('s1')!;
    const p = { step: 3, done: false, at: 1 };
    expect(isFoundation('f10')).toBe(false);
    expect(isFoundation('s1')).toBe(false);
    expect(foundationChapters(lesson)).toEqual([]);
    expect(presentationProgress(lesson, p)).toEqual({ index: 2, total: lesson.blocks.length, fraction: lessonFraction(p, lesson.blocks.length) });
  });
});

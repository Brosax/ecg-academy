/** Presentation coordinates are deliberately separate from stored, legacy block coordinates. */
import { l, type L10n } from '../../core/l10n';
import type { LessonProgress } from '../../practice/api';
import type { Block, Lesson } from '../api';
import { clampStep, lessonFraction } from '../stages';

export type FoundationChapterId = 'question' | 'story' | 'practice' | 'real' | 'summary';
export interface FoundationChapter {
  readonly id: FoundationChapterId;
  readonly title: L10n;
  /** Safe public description; never a question's correct answer or a case label. */
  readonly description: L10n;
  readonly legacySteps: readonly number[];
  /** Representative 1-based legacy block coordinate used by links and progress writes. */
  readonly step: number;
}

const CHAPTERS = [
  { id: 'question', title: l('从零开始', 'Start from zero', 'Empieza desde cero'), description: l('先认识本课需要的概念，再观察记录，提出问题。', 'Learn the concepts you need, then observe a recording and ask a question.', 'Conoce los conceptos necesarios; después observa un registro y plantea una pregunta.') },
  { id: 'story', title: l('推演与实验', 'Explore the mechanism', 'Explora el mecanismo'), description: l('跟随分段推演，再亲手改变条件，观察心电图如何回应。', 'Follow each explanation, then change the conditions and observe how the ECG responds.', 'Sigue cada explicación, cambia las condiciones y observa cómo responde el ECG.') },
  { id: 'practice', title: l('动手练习', 'Put it into practice', 'Ponlo en práctica'), description: l('用刚才观察到的关系，独立完成练习。', 'Use the relationships you just observed to complete the practice independently.', 'Aplica las relaciones que acabas de observar para resolver los ejercicios por tu cuenta.') },
  { id: 'real', title: l('真实心电图', 'A real ECG', 'Un ECG real'), description: l('将刚学的方法用于真实记录，辨认这些关系在实际心电图中的表现。', 'Apply what you learned to a real recording and recognise these relationships in the ECG.', 'Aplica lo aprendido a un registro real y reconoce estas relaciones en el ECG.') },
  { id: 'summary', title: l('带走的要点', 'What to take away', 'Ideas para recordar'), description: l('回顾本课学习目标和常见误区，整理读图方法。', 'Review the lesson’s objectives and common pitfalls, and consolidate the reading method.', 'Repasa los objetivos y errores frecuentes y consolida el método de lectura.') },
] as const;

export const isFoundation = (id: string): boolean => /^f[1-6]$/.test(id);

function chapterFor(kind: Block['kind']): FoundationChapterId {
  if (kind === 'hook') return 'question';
  if (kind === 'check' || kind === 'drill') return 'practice';
  if (kind === 'real') return 'real';
  if (kind === 'summary' || kind === 'pitfalls') return 'summary';
  return 'story';
}

const cache = new WeakMap<Lesson, readonly FoundationChapter[]>();
export function foundationChapters(lesson: Lesson): readonly FoundationChapter[] {
  if (!isFoundation(lesson.id)) return [];
  const hit = cache.get(lesson);
  if (hit) return hit;
  const chapters: FoundationChapter[] = [];
  for (const spec of CHAPTERS) {
    const legacySteps = lesson.blocks.flatMap((b, i) => chapterFor(b.kind) === spec.id ? [i + 1] : []);
    if (legacySteps.length) chapters.push({ ...spec, legacySteps, step: legacySteps[0] });
  }
  cache.set(lesson, chapters);
  return chapters;
}

/** Zero-based chapter index; clamp obsolete/out-of-range deep links before lookup. */
export function foundationChapterAt(lesson: Lesson, legacyStep: number): number {
  const step = clampStep(legacyStep, null, lesson.blocks.length);
  return Math.max(0, foundationChapters(lesson).findIndex(c => c.legacySteps.includes(step)));
}

/** Explicit old links retain their block; a resume entry opens the start of its chapter. */
export function foundationEntryStep(lesson: Lesson, requested: number | undefined, resume: number): number {
  if (requested !== undefined) return clampStep(requested, null, lesson.blocks.length);
  const chapters = foundationChapters(lesson);
  return chapters[foundationChapterAt(lesson, resume)]?.step ?? clampStep(resume, null, lesson.blocks.length);
}

/** One source for the map, home resume card and foundation player progress. */
export function presentationProgress(lesson: Lesson, p: LessonProgress | null): { index: number; total: number; fraction: number } {
  const chapters = foundationChapters(lesson);
  if (!chapters.length) return {
    index: Math.max(0, clampStep(p?.step, p, lesson.blocks.length) - 1),
    total: lesson.blocks.length,
    fraction: lessonFraction(p, lesson.blocks.length),
  };
  const index = foundationChapterAt(lesson, p?.step ?? 1);
  return { index, total: chapters.length, fraction: p?.done ? 1 : !p || p.step <= 0 ? 0 : (index + 1) / chapters.length };
}

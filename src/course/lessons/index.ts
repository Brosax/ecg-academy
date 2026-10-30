/**
 * Lesson registry. Every lesson is one data file `src/course/lessons/<id>.ts` (ids: docs/PLAN.md §3, e.g. f1, s4,
 * i10) that exports its `Lesson` as the default export (a named `lesson` export is accepted too). Files are picked up
 * by the glob below, so a lesson writer only adds a file — nothing here needs editing. Helpers shared by lesson files
 * must not match the pattern (e.g. `_helpers.ts`).
 */
import type { Lesson } from '../api';

/** Lesson data modules, keyed by path ('./f1.ts'). */
const modules = import.meta.glob<Readonly<Record<string, unknown>>>('./[a-z][0-9]*.ts', { eager: true });

export interface RegisteredModule {
  /** id from the file name ('./s4.ts' → 's4') */
  readonly fileId: string;
  readonly path: string;
  /** the lesson the module exports, or null when it exports nothing lesson-shaped */
  readonly lesson: Lesson | null;
}

const looksLikeLesson = (v: unknown): v is Lesson =>
  typeof v === 'object' && v !== null && typeof (v as { id?: unknown }).id === 'string' && Array.isArray((v as { blocks?: unknown }).blocks);

/** The lesson a data module exports: `default`, else `lesson`, else the only lesson-shaped export. */
export function lessonFromModule(mod: Readonly<Record<string, unknown>>): Lesson | null {
  if (looksLikeLesson(mod.default)) return mod.default;
  if (looksLikeLesson(mod.lesson)) return mod.lesson;
  const found = Object.values(mod).filter(looksLikeLesson);
  return found.length === 1 ? found[0] : null;
}

export function fileIdOf(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.ts$/, '');
}

/** Build the registry from glob modules (pure: tests pass a fake module map). */
export function registerModules(mods: Readonly<Record<string, Readonly<Record<string, unknown>>>>): RegisteredModule[] {
  return Object.keys(mods)
    .sort()
    .map((path) => ({ path, fileId: fileIdOf(path), lesson: lessonFromModule(mods[path]) }));
}

/** Every lesson data file found, with what it exports (lessons.test.ts validates each one). */
export const REGISTERED: readonly RegisteredModule[] = registerModules(modules);

/**
 * Lessons by id. A file whose lesson id differs from its file name is still registered under the lesson id (the
 * validator reports the mismatch); a file without a lesson is skipped (and reported by the validator test).
 */
export const LESSONS: ReadonlyMap<string, Lesson> = new Map(
  REGISTERED.filter((m): m is RegisteredModule & { lesson: Lesson } => m.lesson !== null).map((m) => [m.lesson.id, m.lesson]),
);

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.get(id);
}

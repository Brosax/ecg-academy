/**
 * The course map model: the curriculum plan (catalogue.ts) merged with the lessons that exist (lessons/index.ts), plus
 * the navigation and progress rules used by the course map, the lesson player and the home "continue" card.
 * Pure (lesson map and progress lookups are passed in) — tested in tests/course/stages.test.ts.
 */
import type { Lesson, StageDef } from './api';
import type { LessonProgress, StageId } from '../practice/api';
import { CURRICULUM } from './catalogue';

export type LessonStatus = StageDef['lessons'][number]['status'];

/**
 * All eight stages with every planned lesson: 'ready' (title from the lesson file) when a lesson file exists, else
 * 'planned' (title from the plan). Lessons registered with an id the plan does not list are appended to their stage,
 * ordered by `order`, so they stay reachable (the validator reports them).
 */
export function buildStages(lessons: ReadonlyMap<string, Lesson>): StageDef[] {
  const planned = new Set(CURRICULUM.flatMap((s) => s.lessons.map((x) => x.id)));
  return CURRICULUM.map((s) => {
    const extras = [...lessons.values()]
      .filter((x) => x.stage === s.id && !planned.has(x.id))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return {
      id: s.id,
      title: s.title,
      goal: s.goal,
      lessons: [
        ...s.lessons.map((p) => {
          const ready = lessons.get(p.id);
          return { id: p.id, title: ready ? ready.title : p.title, status: ready ? ('ready' as const) : ('planned' as const) };
        }),
        ...extras.map((x) => ({ id: x.id, title: x.title, status: 'ready' as const })),
      ],
    };
  });
}

/** Ready lesson ids in teaching order. */
export function readyOrder(stages: readonly StageDef[]): string[] {
  return stages.flatMap((s) => s.lessons.filter((x) => x.status === 'ready').map((x) => x.id));
}

export function stageOfLesson(stages: readonly StageDef[], id: string): { stage: StageDef; n: number; index: number } | null {
  for (let k = 0; k < stages.length; k++) {
    const index = stages[k].lessons.findIndex((x) => x.id === id);
    if (index >= 0) return { stage: stages[k], n: k + 1, index };
  }
  return null;
}

/** Previous / next READY lesson around `id` (planned lessons are skipped). */
export function lessonNeighbours(stages: readonly StageDef[], id: string): { prev: string | null; next: string | null } {
  const order = readyOrder(stages);
  const i = order.indexOf(id);
  if (i < 0) return { prev: null, next: null };
  return { prev: i > 0 ? order[i - 1] : null, next: i < order.length - 1 ? order[i + 1] : null };
}

/** Display code of a lesson id: 'f1' → 'F1', 'i10' → 'I10'. */
export const lessonCode = (id: string): string => id.toUpperCase();

// ── progress rules ────────────────────────────────────────────────────────────────────────────────────────────────
//
// LessonProgress.step (written by the course) = the furthest step reached, counted from 1 (0 = not started);
// `done` = the learner finished the last step. Deep links use the same 1-based step numbers (#/learn/<id>/<step>).

/** Completion 0..1 of a lesson with `steps` blocks. */
export function lessonFraction(p: LessonProgress | null, steps: number): number {
  if (!p) return 0;
  if (p.done) return 1;
  if (steps <= 0) return 0;
  return Math.max(0, Math.min(1, p.step / steps));
}

export type LessonState = 'new' | 'started' | 'done';

export function lessonState(p: LessonProgress | null): LessonState {
  if (!p) return 'new';
  if (p.done) return 'done';
  return p.step > 0 ? 'started' : 'new';
}

/** Step to open when no step is given: the furthest step reached (1-based), or 1 when new or already done. */
export function resumeStep(p: LessonProgress | null, steps: number): number {
  if (!p || p.done || steps <= 0) return 1;
  return Math.max(1, Math.min(steps, p.step));
}

/** A requested (deep-link) step clamped to 1..steps; undefined = resume. */
export function clampStep(step: number | undefined, p: LessonProgress | null, steps: number): number {
  if (step === undefined || !Number.isFinite(step)) return resumeStep(p, steps);
  return Math.max(1, Math.min(Math.max(1, steps), Math.trunc(step)));
}

/** Progress after visiting `step` (keeps the furthest step and `done`). */
export function progressAfterVisit(prev: LessonProgress | null, step: number, nowMs: number): LessonProgress {
  return { step: Math.max(prev?.step ?? 0, step), done: prev?.done ?? false, at: nowMs };
}

export function progressAfterFinish(steps: number, nowMs: number): LessonProgress {
  return { step: steps, done: true, at: nowMs };
}

/**
 * The lesson to continue: the most recently touched lesson that is started but not done; otherwise the first ready
 * lesson (teaching order) that is not done; null when every ready lesson is done (or none is ready).
 */
export function nextLessonToContinue(stages: readonly StageDef[], progress: (id: string) => LessonProgress | null): string | null {
  const order = readyOrder(stages);
  let recent: { id: string; at: number } | null = null;
  for (const id of order) {
    const p = progress(id);
    if (p && !p.done && p.step > 0 && (recent === null || p.at > recent.at)) recent = { id, at: p.at };
  }
  if (recent) return recent.id;
  return order.find((id) => !progress(id)?.done) ?? null;
}

/** Done / ready counts per stage and overall. */
export function countDone(stages: readonly StageDef[], progress: (id: string) => LessonProgress | null): { done: number; ready: number; planned: number } {
  let done = 0, ready = 0, planned = 0;
  for (const s of stages) {
    for (const x of s.lessons) {
      if (x.status === 'planned') planned++;
      else {
        ready++;
        if (progress(x.id)?.done) done++;
      }
    }
  }
  return { done, ready, planned };
}

export function stageById(stages: readonly StageDef[], id: StageId): StageDef | undefined {
  return stages.find((s) => s.id === id);
}

// ── review cards from a lesson ────────────────────────────────────────────────────────────────────────────────────

/**
 * Spaced-review keys a finished lesson contributes (src/practice ReviewCard keys): `finding:<id>` for each finding the
 * lesson teaches and the drill families its check and drill blocks use. De-duplicated, in lesson order.
 */
export function reviewKeys(lesson: Lesson): string[] {
  const keys: string[] = lesson.findings.map((f) => `finding:${f}`);
  for (const b of lesson.blocks) {
    if (b.kind === 'drill') keys.push(...b.families);
    else if (b.kind === 'check') keys.push('family' in b.item ? b.item.family : b.item.inline.family);
  }
  return [...new Set(keys)];
}

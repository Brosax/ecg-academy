/**
 * src/course — the course: curriculum map, lesson player and the lesson data (src/course/lessons/<id>.ts).
 * Public entry; other modules import only from here (contract types: ./api.ts).
 *
 *   LearnPage                          #/learn — eight stages, every lesson (ready / coming soon), progress
 *   LessonPage({ id, step? })          #/learn/:id[/:step] — the lesson player, one block per step
 *   ContinueLessonCard                 for homeSlots.continueLesson (src/app/slots.ts)
 *   wireCourse()                       plugs ContinueLessonCard into the home slot (call once from src/main.tsx)
 *   CriteriaCard                       a numeric criteria card (the atlas can reuse lesson criteria)
 *   courseStages() / getLesson(id)     the course map (StageDef[]) and lesson data
 *   resolveMarks(ecg, marks, opts?)    AutoMarks → viewer marks from the ECG's truth
 *   validateLesson(lesson, deps)       schema + catalogue checks of a lesson (liveValidateDeps() for the app's own)
 */
import './course.css';
import { homeSlots } from '../app/slots';
import { ContinueLessonCard } from './ContinueLessonCard';

export { LearnPage } from './LearnPage';
export { LessonPage } from './LessonPage';
export { ContinueLessonCard } from './ContinueLessonCard';
export { CriteriaCard } from './blocks';
export { courseStages } from './model';
export { getLesson, LESSONS } from './lessons/index';
export { isAutoMark, resolveMarks, type ResolveOptions } from './marks';
export { validateLesson, type LessonIssue, type ValidateDeps } from './validate';
export { liveValidateDeps } from './deps';
export type { AutoMark, Block, ItemRef, Lesson, LessonMark, StageDef, WorkedStep } from './api';

/** Plug the course into the shell: the home page's "continue lesson" card (call once from src/main.tsx). */
export function wireCourse(): void {
  homeSlots.continueLesson.value = ContinueLessonCard;
}

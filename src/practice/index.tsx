/**
 * src/practice — the practice engine: drill families and seeded item generators, graders with explanatory feedback,
 * the learner's progress store (attempts, mastery, Leitner review, lesson progress), and the pages. Contract:
 * ./api.ts. Other modules import only from here.
 *
 * Shell wiring (src/main.tsx, integrator): `wirePractice()` plugs ReviewsDueCard into homeSlots.reviewsDue,
 * ProgressDataControls into progressDataSlot, the structured report into every real-case page
 * (setCaseReadingSlot(CaseReportPanel)) and initialises the header ring (overallProgress).
 */
import './practice.css';
import { homeSlots, overallProgress, progressDataSlot } from '../app/slots';
import { setCaseReadingSlot } from '../real/index';
import { overallMastery } from './core/progress';
import { ProgressDataControls, ReviewsDueCard } from './ui/cards';
import { CaseReportPanel } from './ui/ReportForm';

export type * from './api';
export { COMPETENCIES, ITEM_KINDS, STAGES } from './api';

// components and pages
export { ItemPlayer } from './ui/ItemPlayer';
export { DrillRunner } from './ui/DrillRunner';
export { ReportForm, CaseReportPanel } from './ui/ReportForm';
export { PracticePage } from './ui/PracticePage';
export { DrillPage } from './ui/DrillPage';
export { ExamPage } from './ui/ExamPage';
export { ProgressPage } from './ui/ProgressPage';
export { ReviewsDueCard, ProgressDataControls } from './ui/cards';
export { AxisDial } from './ui/AxisDial';

// engine
export { families, getFamily, familiesTraining, familyAvailable, topicsOf } from './core/families';
export { generateItem } from './core/generate';
export { gradeItem } from './core/grade';
export { ecgOf, setPracticePorts, type RealPort, type SynthPort } from './core/ports';
export {
  recordAttempt,
  masteryOf,
  masteryOfFinding,
  masteryOfFamily,
  overallMastery,
  dueReviews,
  getLessonProgress,
  setLessonProgress,
  exportProgress,
  importProgress,
  resetProgress,
  progressVersion,
} from './core/progress';

/** Plug the practice module into the shell slots and the real-case page (call once from src/main.tsx). */
export function wirePractice(): void {
  homeSlots.reviewsDue.value = ReviewsDueCard;
  progressDataSlot.value = ProgressDataControls;
  setCaseReadingSlot(CaseReportPanel);
  overallProgress.value = overallMastery();
}

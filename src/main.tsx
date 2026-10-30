/**
 * Entry point: global styles, preferences (persisted lang/theme/settings mirrored onto <html>), the hash router, shell
 * side effects (document.title, reduce motion), the shell slots that feature modules fill (src/app/slots.ts — so no
 * module imports shell internals), then the app.
 *
 * Slots:
 *   homeSlots.continueLesson   src/course   ContinueLessonCard (wireCourse)
 *   homeSlots.reviewsDue       src/practice ReviewsDueCard (wirePractice)
 *   homeSlots.caseOfDay        src/real     CaseOfDayCard
 *   homeSlots.heroEcg          src/app      HeroEcg — a live normal 12-lead from src/synth in src/ecg's viewer
 *   overallProgress            src/practice overallMastery(), recomputed whenever progressVersion bumps
 *   progressDataSlot           src/practice ProgressDataControls (wirePractice)
 *   real case reading slot     src/practice CaseReportPanel — structured report graded against the case's 12SL
 *                              reference measurements and its labels mapped to findings (wirePractice)
 */
// must stay the first import: repairs an undecodable hash before the router module reads it (see hashGuard.ts)
import './app/hashGuard';
import { effect } from '@preact/signals';
import { render } from 'preact';
import './app/theme.css';
import { App } from './app/App';
import { HeroEcg } from './app/HeroEcg';
import { startRouter } from './app/router';
import { startShellEffects } from './app/shellEffects';
import { homeSlots, overallProgress } from './app/slots';
import { startPersistence } from './app/store';
import { wireCourse } from './course';
import { overallMastery, progressVersion, wirePractice } from './practice';
import { CaseOfDayCard } from './real';

startPersistence();
startRouter();
startShellEffects();

// ── slots ──
wireCourse();
wirePractice();
homeSlots.caseOfDay.value = CaseOfDayCard;
homeSlots.heroEcg.value = HeroEcg;
// the header ring follows every progress write (record, import, reset, another tab's reload)
effect(() => {
  void progressVersion.value;
  overallProgress.value = overallMastery();
});

const root = document.getElementById('app');
if (root) render(<App />, root);

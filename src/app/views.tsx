/**
 * The router switch: route name → page component, with the page components imported exactly as docs/PLAN.md §12 names
 * them from each module's index.tsx. VIEWS is keyed by route name, so the type checker rejects a router change the shell
 * does not handle; tests/app checks that every route renders the component routes.ts PAGE_OF promises.
 */
import type { ComponentChild } from 'preact';
import { AtlasPage, FindingPage } from '../atlas';
import { LearnPage, LessonPage } from '../course';
import { DrillPage, ExamPage, PracticePage, ProgressPage } from '../practice';
import { LabPage } from '../lab';
import { CasePage, CasesPage } from '../real';
import { ToolsPage } from '../tools';
import { DevViewer } from './DevViewer';
import { AboutPage, HomePage, NotFoundPage, SettingsPage } from './index';
import type { Route } from './router';
import { isDevViewer, type RouteName, type RouteOf } from './routes';

type ViewTable = { readonly [K in RouteName]: (r: RouteOf<K>) => ComponentChild };

export const VIEWS: ViewTable = {
  home: () => <HomePage />,
  learn: () => <LearnPage />,
  lesson: (r) => <LessonPage id={r.id} step={r.step} />,
  practice: () => <PracticePage />,
  drill: (r) => <DrillPage id={r.id} />,
  lab: (r) => <LabPage scenario={r.scenario} />,
  cases: () => <CasesPage />,
  case: (r) => <CasePage id={r.id} />,
  atlas: () => <AtlasPage />,
  finding: (r) => <FindingPage id={r.id} />,
  exam: () => <ExamPage />,
  tools: (r) => <ToolsPage tab={r.tab} />,
  progress: () => <ProgressPage />,
  settings: () => <SettingsPage />,
  about: () => <AboutPage />,
  notfound: (r) => (isDevViewer(r) ? <DevViewer /> : <NotFoundPage path={r.path} />),
};

/** The page element for a route. */
export function viewFor(r: Route): ComponentChild {
  return (VIEWS[r.name] as (r: Route) => ComponentChild)(r);
}

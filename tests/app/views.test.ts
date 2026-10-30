/**
 * The router switch (src/app/views.tsx) renders, for every route name, exactly the page component docs/PLAN.md §12
 * names, with the route parameters as props. Page modules are replaced by named markers so the test does not depend
 * on other workstreams' internals (and needs no DOM: a view is just a VNode).
 */
import type { VNode } from 'preact';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/app/index', () => ({
  HomePage: function HomePage() {
    return null;
  },
  SettingsPage: function SettingsPage() {
    return null;
  },
  AboutPage: function AboutPage() {
    return null;
  },
  NotFoundPage: function NotFoundPage() {
    return null;
  },
}));
vi.mock('../../src/app/DevViewer', () => ({
  DevViewer: function DevViewer() {
    return null;
  },
}));
vi.mock('../../src/course', () => ({
  LearnPage: function LearnPage() {
    return null;
  },
  LessonPage: function LessonPage() {
    return null;
  },
}));
vi.mock('../../src/practice', () => ({
  PracticePage: function PracticePage() {
    return null;
  },
  DrillPage: function DrillPage() {
    return null;
  },
  ExamPage: function ExamPage() {
    return null;
  },
  ProgressPage: function ProgressPage() {
    return null;
  },
}));
vi.mock('../../src/real', () => ({
  CasesPage: function CasesPage() {
    return null;
  },
  CasePage: function CasePage() {
    return null;
  },
  // used by routes.ts for case titles
  getCase: () => undefined,
}));
vi.mock('../../src/atlas', () => ({
  AtlasPage: function AtlasPage() {
    return null;
  },
  FindingPage: function FindingPage() {
    return null;
  },
}));
vi.mock('../../src/lab', () => ({
  LabPage: function LabPage() {
    return null;
  },
}));
vi.mock('../../src/tools', () => ({
  ToolsPage: function ToolsPage() {
    return null;
  },
}));

const { VIEWS, viewFor } = await import('../../src/app/views');
const { PAGE_OF, ROUTE_NAMES } = await import('../../src/app/routes');
const { SAMPLE_ROUTES } = await import('./fixtures');

/** docs/PLAN.md §12 — the page components each module exports. */
const PLAN_PAGES = {
  app: ['HomePage', 'SettingsPage', 'AboutPage', 'NotFoundPage'],
  course: ['LearnPage', 'LessonPage'],
  practice: ['PracticePage', 'DrillPage', 'ExamPage', 'ProgressPage'],
  lab: ['LabPage'],
  real: ['CasesPage', 'CasePage'],
  atlas: ['AtlasPage', 'FindingPage'],
  tools: ['ToolsPage'],
} as const;

function componentName(v: unknown): string {
  const t = (v as VNode).type;
  return typeof t === 'function' ? t.name : String(t);
}

describe('page switch', () => {
  it('has a view for every route name and nothing else', () => {
    expect(Object.keys(VIEWS).sort()).toEqual([...ROUTE_NAMES].sort());
    expect(Object.keys(PAGE_OF).sort()).toEqual([...ROUTE_NAMES].sort());
  });

  it('PAGE_OF uses exactly the §12 page exports, each from its module', () => {
    const used = new Set(Object.values(PAGE_OF).map((p) => `${p.module}.${p.component}`));
    const planned = new Set(Object.entries(PLAN_PAGES).flatMap(([m, names]) => names.map((n) => `${m}.${n}`)));
    expect(used).toEqual(planned);
  });

  it.each(SAMPLE_ROUTES.map((r) => [JSON.stringify(r), r] as const))('%s renders its page', (_label, r) => {
    const v = viewFor(r);
    const expected = r.name === 'notfound' && r.path === 'dev/viewer' ? 'DevViewer' : PAGE_OF[r.name].component;
    expect(componentName(v)).toBe(expected);
  });

  it('passes the route parameters as props', () => {
    const props = (r: Parameters<typeof viewFor>[0]) => (viewFor(r) as VNode<Record<string, unknown>>).props;
    expect(props({ name: 'lesson', id: 's4', step: 3 })).toMatchObject({ id: 's4', step: 3 });
    expect(props({ name: 'lesson', id: 'f1' })).toMatchObject({ id: 'f1', step: undefined });
    expect(props({ name: 'drill', id: 'rate:7' })).toMatchObject({ id: 'rate:7' });
    expect(props({ name: 'case', id: 42 })).toMatchObject({ id: 42 });
    expect(props({ name: 'finding', id: 'lbbb' })).toMatchObject({ id: 'lbbb' });
    expect(props({ name: 'tools', tab: 'qtc' })).toMatchObject({ tab: 'qtc' });
    expect(props({ name: 'lab', scenario: 'lbbb' })).toMatchObject({ scenario: 'lbbb' });
    expect(props({ name: 'notfound', path: 'nope' })).toMatchObject({ path: 'nope' });
  });
});

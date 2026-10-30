/**
 * Pure route metadata for the shell: which navigation section a route belongs to, which page component renders it
 * (docs/PLAN.md §12), the document title, and the key that decides when focus moves to the new page heading.
 * Nothing here renders, so the table can be unit-tested in node (src/real is imported only for the case lookup).
 */
import { FINDINGS, isFindingId } from '../core/findings';
import type { Lang } from '../core/l10n';
import { tc } from '../i18n/common';
import { tsh } from '../i18n/shell';
import { getCase } from '../real';
import type { IconName } from '../ui';
import { href, type Route } from './router';

export type RouteName = Route['name'];
export type RouteOf<K extends RouteName> = Extract<Route, { readonly name: K }>;

/** Every route name of src/app/router.ts — the type check below fails when the router gains a route. */
export const ROUTE_NAMES = [
  'home',
  'learn',
  'lesson',
  'practice',
  'drill',
  'lab',
  'cases',
  'case',
  'atlas',
  'finding',
  'exam',
  'tools',
  'progress',
  'settings',
  'about',
  'notfound',
] as const satisfies readonly RouteName[];

type MissingRouteNames = Exclude<RouteName, (typeof ROUTE_NAMES)[number]>;
/** compile-time proof that ROUTE_NAMES lists every route */
export const ROUTE_NAMES_COMPLETE: [MissingRouteNames] extends [never] ? true : false = true;

// ── navigation sections ─────────────────────────────────────────────────────────────────────────────────────────────

export const SECTION_IDS = ['home', 'learn', 'practice', 'lab', 'cases', 'atlas', 'exam', 'tools', 'progress', 'settings', 'about'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

type CommonKey = Parameters<typeof tc>[0];

export interface SectionDef {
  readonly route: Route;
  readonly label: CommonKey;
  readonly icon: IconName;
}

export const SECTIONS: Readonly<Record<SectionId, SectionDef>> = {
  home: { route: { name: 'home' }, label: 'navHome', icon: 'home' },
  learn: { route: { name: 'learn' }, label: 'navLearn', icon: 'book' },
  practice: { route: { name: 'practice' }, label: 'navPractice', icon: 'target' },
  lab: { route: { name: 'lab' }, label: 'navLab', icon: 'heart' },
  cases: { route: { name: 'cases' }, label: 'navCases', icon: 'wave' },
  atlas: { route: { name: 'atlas' }, label: 'navAtlas', icon: 'search' },
  exam: { route: { name: 'exam' }, label: 'navExam', icon: 'clock' },
  tools: { route: { name: 'tools' }, label: 'navTools', icon: 'calipers' },
  progress: { route: { name: 'progress' }, label: 'navProgress', icon: 'chart' },
  settings: { route: { name: 'settings' }, label: 'navSettings', icon: 'settings' },
  about: { route: { name: 'about' }, label: 'navAbout', icon: 'info' },
};

/** Desktop header (one row at ≥ 1100 px). */
export const HEADER_NAV = ['learn', 'practice', 'lab', 'cases', 'atlas', 'exam', 'tools'] as const satisfies readonly SectionId[];
/** Phone bottom tab bar (≤ 760 px); everything else is in the header menu. */
export const TAB_NAV = ['learn', 'practice', 'lab', 'cases', 'atlas'] as const satisfies readonly SectionId[];
/** Phone header menu: every section. */
export const MENU_NAV = ['home', 'learn', 'practice', 'lab', 'cases', 'atlas', 'exam', 'tools', 'progress', 'settings', 'about'] as const satisfies readonly SectionId[];

export const SECTION_OF: Readonly<Record<RouteName, SectionId | null>> = {
  home: 'home',
  learn: 'learn',
  lesson: 'learn',
  practice: 'practice',
  drill: 'practice',
  lab: 'lab',
  cases: 'cases',
  case: 'cases',
  atlas: 'atlas',
  finding: 'atlas',
  exam: 'exam',
  tools: 'tools',
  progress: 'progress',
  settings: 'settings',
  about: 'about',
  notfound: null,
};

export function sectionOf(r: Route): SectionId | null {
  return SECTION_OF[r.name];
}

// ── pages (docs/PLAN.md §12) ────────────────────────────────────────────────────────────────────────────────────────

export const PAGE_MODULES = ['app', 'course', 'practice', 'lab', 'real', 'atlas', 'tools'] as const;
export type PageModule = (typeof PAGE_MODULES)[number];

export interface PageRef {
  /** folder under src/ whose index.tsx exports the component */
  readonly module: PageModule;
  readonly component: string;
}

/** Which page component renders each route. The shell's view table (views.tsx) is keyed by the same route names. */
export const PAGE_OF: Readonly<Record<RouteName, PageRef>> = {
  home: { module: 'app', component: 'HomePage' },
  learn: { module: 'course', component: 'LearnPage' },
  lesson: { module: 'course', component: 'LessonPage' },
  practice: { module: 'practice', component: 'PracticePage' },
  drill: { module: 'practice', component: 'DrillPage' },
  lab: { module: 'lab', component: 'LabPage' },
  cases: { module: 'real', component: 'CasesPage' },
  case: { module: 'real', component: 'CasePage' },
  atlas: { module: 'atlas', component: 'AtlasPage' },
  finding: { module: 'atlas', component: 'FindingPage' },
  exam: { module: 'practice', component: 'ExamPage' },
  tools: { module: 'tools', component: 'ToolsPage' },
  progress: { module: 'practice', component: 'ProgressPage' },
  settings: { module: 'app', component: 'SettingsPage' },
  about: { module: 'app', component: 'AboutPage' },
  notfound: { module: 'app', component: 'NotFoundPage' },
};

// ── dev route ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** `#/dev/viewer` — mounts src/ecg/dev/ViewerDemo.tsx in development builds (the router reports it as `notfound`). */
export const DEV_VIEWER_PATH = 'dev/viewer';

/** Development builds (and tests) only: in production `#/dev/viewer` is an ordinary "page not found". */
const DEV_ROUTES = import.meta.env.DEV;

export function isDevViewer(r: Route, dev: boolean = DEV_ROUTES): boolean {
  return dev && r.name === 'notfound' && r.path.replace(/\/+$/, '') === DEV_VIEWER_PATH;
}

// ── focus & titles ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Identity of the page a route shows. Moving between keys is a page change (focus the new h1, scroll to top);
 * sub-state inside a page (a lesson's step, a tools tab) keeps the key so the page manages its own focus.
 */
export function pageKey(r: Route): string {
  switch (r.name) {
    case 'lesson':
      return `lesson/${r.id}`;
    case 'tools':
      return 'tools';
    case 'lab':
      return 'lab';
    default:
      return href(r);
  }
}

export const BRAND = 'ECG Academy';

/** Localized app name shown after the brand when it differs from it (zh: 心电图读图学院, es: Academia de ECG). */
export function brandSubtitle(lang: Lang): string | null {
  const name = tc.in(lang, 'appName');
  return name === BRAND ? null : name;
}

/**
 * Title of a real case. The route carries the PTB-XL ecg_id, but the case page is headed with the blind case number
 * (3 digits, src/real CasePage); the title uses the same number so the tab and the heading agree. An unknown id falls
 * back to the library's name (the page then says the case does not exist).
 */
export function caseTitle(ecgId: number, lang: Lang): string {
  const c = getCase(ecgId);
  return c ? tsh.in(lang, 'titleCase', { n: String(c.num).padStart(3, '0') }) : tc.in(lang, 'navCases');
}

/** Page heading used in the document title (null = the home page, which uses the full brand). */
export function pageLabel(r: Route, lang: Lang): string | null {
  switch (r.name) {
    case 'home':
      return null;
    case 'lesson':
      return tsh.in(lang, 'titleLesson', { id: r.id.toUpperCase() });
    case 'case':
      return caseTitle(r.id, lang);
    case 'finding':
      return isFindingId(r.id) ? FINDINGS[r.id].name[lang] : tc.in(lang, 'navAtlas');
    case 'notfound':
      return isDevViewer(r) ? tsh.in(lang, 'titleDev') : tc.in(lang, 'notFound');
    default: {
      const s = SECTION_OF[r.name];
      return s ? tc.in(lang, SECTIONS[s].label) : null;
    }
  }
}

export function documentTitle(r: Route, lang: Lang): string {
  const page = pageLabel(r, lang);
  if (page) return `${page} · ${BRAND}`;
  const sub = brandSubtitle(lang);
  return sub ? `${BRAND} · ${sub}` : BRAND;
}

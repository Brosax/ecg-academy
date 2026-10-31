/**
 * What the assistant is told about the page the learner is on: route → a short description (English labels, content
 * in the UI language). Visible content only — a lesson's title and current step, an atlas entry's definition and
 * criteria, a drill family's title. Never the hidden answer: a real case gives only its blind number, age and sex (the
 * cardiologists' labels stay behind "Reveal"), a drill gives no item, topic or seed, a lesson hook gives its question
 * but not its reveal. Pure (no DOM); tested in tests/assistant/context.test.ts on every sample route.
 */
import type { Route } from '../app/router';
import { entryOf } from '../atlas';
import { FINDINGS, isFindingId } from '../core/findings';
import { pick, type L10n, type Lang } from '../core/l10n';
import { getLesson, type Block } from '../course';
import { tsh } from '../i18n/shell';
import { getFamily } from '../practice';
import { getCase } from '../real';

export type ContextKind = 'general' | 'lesson' | 'finding' | 'case' | 'drill' | 'lab';

export interface PageContext {
  readonly kind: ContextKind;
  /** the thing on screen, named in the UI language ('' = nothing specific) */
  readonly title: string;
  /** what the model is told ('' = nothing specific) */
  readonly text: string;
}

/** Upper bound of the context text sent with every request (characters). */
export const MAX_CONTEXT_CHARS = 1600;
/** Upper bound of one lesson step's text inside it. */
export const MAX_STEP_CHARS = 900;

export function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

const NONE: PageContext = { kind: 'general', title: '', text: '' };

const general = (text: string): PageContext => ({ kind: 'general', title: '', text });

export function pageContext(route: Route, lang: Lang): PageContext {
  switch (route.name) {
    case 'lesson':
      return lessonContext(route.id, route.step, lang);
    case 'finding':
      return findingContext(route.id, lang);
    case 'case':
      return caseContext(route.id, lang);
    case 'drill':
      return drillContext(route.id, lang);
    case 'lab':
      return labContext(route.scenario);
    case 'learn':
      return general('The course map: eight stages, from the ECG paper and the leads to the complete structured report.');
    case 'practice':
      return general('The practice hub: drills of one skill at a time (rate, intervals, axis, rhythm, patterns) with unlimited generated items.');
    case 'cases':
      return general("The real-case library: 12-lead ECGs from PTB-XL, read first, then the cardiologists' labels are revealed.");
    case 'atlas':
      return general('The pattern atlas: every ECG finding with its criteria, a synthetic exemplar, real examples and its mimics.');
    case 'exam':
      return general('The timed exam. You cannot see its questions; never give or guess an exam answer — explain method and criteria only.');
    case 'tools':
      return general(
        `The reference tools (tab: ${route.tab ?? 'checklist'}): the systematic reading checklist, adult normal values, calculators (rate, QTc, axis) and a trilingual glossary.`,
      );
    default:
      return NONE;
  }
}

/** Text of one lesson block, for "explain this step". A hook's reveal and a check's answer are withheld. */
export function blockText(b: Block, lang: Lang): string {
  const p = (t: L10n | undefined): string => (t ? pick(t, lang) : '');
  switch (b.kind) {
    case 'hook':
      return `A question the learner attempts before the teaching (its answer is withheld from you): ${p(b.question)}`;
    case 'text':
      return [p(b.title), p(b.body)].filter(Boolean).join('\n');
    case 'ecg':
    case 'live':
    case 'heart':
    case 'real':
      return p(b.caption);
    case 'figure':
      return p(b.caption);
    case 'criteria':
      return [p(b.title), ...b.items.map((i) => `- ${p(i.label)}: ${p(i.value)}`)].join('\n');
    case 'worked':
      return [p(b.title), ...b.steps.map((s) => `- ${p(s.title)}: ${p(s.body)}`)].join('\n');
    case 'contrast':
      return [p(b.title), `${p(b.left.caption)} — versus — ${p(b.right.caption)}`, p(b.point)].join('\n');
    case 'pitfalls':
      return ['Pitfalls:', ...b.items.map((t) => `- ${p(t)}`)].join('\n');
    case 'summary':
      return ['Take-aways:', ...b.points.map((t) => `- ${p(t)}`)].join('\n');
    case 'check':
    case 'drill':
      return 'A practice question (its answer is withheld from you).';
  }
}

function lessonContext(id: string, step: number | undefined, lang: Lang): PageContext {
  const lesson = getLesson(id);
  const label = id.toUpperCase();
  if (!lesson) return { kind: 'lesson', title: label, text: `Lesson ${label} (not found).` };
  const t = (x: L10n): string => pick(x, lang);
  const title = t(lesson.title);
  const lines = [`Lesson ${label} — "${title}".`, `Summary: ${t(lesson.summary)}`, 'Objectives:', ...lesson.objectives.map((o) => `- ${t(o)}`)];
  const n = lesson.blocks.length;
  if (step !== undefined && n > 0) {
    const k = Math.min(Math.max(1, Math.floor(step)), n);
    const block = lesson.blocks[k - 1];
    lines.push(`Current step ${k} of ${n} (a "${block.kind}" block):`, clip(blockText(block, lang), MAX_STEP_CHARS));
  }
  return { kind: 'lesson', title: `${label} · ${title}`, text: clip(lines.join('\n'), MAX_CONTEXT_CHARS) };
}

function findingContext(id: string, lang: Lang): PageContext {
  if (!isFindingId(id)) return { kind: 'finding', title: id, text: `An atlas page that does not exist ("${id}").` };
  const def = FINDINGS[id];
  const t = (x: L10n): string => pick(x, lang);
  const name = t(def.name);
  const e = entryOf(id);
  const lines = [`The atlas page of the finding "${name}" (English: "${def.name.en}"; category ${def.cat}; severity ${def.severity}).`];
  if (e) {
    lines.push(
      `Definition: ${t(e.definition)}`,
      'Key features:',
      ...e.features.map((f) => `- ${t(f)}`),
      'Criteria:',
      ...e.criteria.map((c) => `- ${t(c.label)}: ${t(c.value)} [${c.source}]`),
      `Mechanism: ${t(e.mechanism)}`,
    );
    if (e.mimics.length > 0) lines.push(`Mimics: ${e.mimics.map((m) => FINDINGS[m.id].name.en).join(', ')}.`);
  }
  return { kind: 'finding', title: name, text: clip(lines.join('\n'), MAX_CONTEXT_CHARS) };
}

function caseContext(id: number, lang: Lang): PageContext {
  const c = getCase(id);
  const num = c ? String(c.num).padStart(3, '0') : String(id);
  const sex = c?.sex === 'M' ? 'male' : c?.sex === 'F' ? 'female' : 'unknown';
  const age = c?.age != null ? String(c.age) : 'unknown';
  const text = [
    `A real 12-lead ECG: blind case No. ${num} from PTB-XL (patient age ${age}, sex ${sex}).`,
    "The cardiologists' labels and the reference measurements stay hidden until the learner presses \"Reveal\", and you cannot see the tracing.",
    "Never guess or state this ECG's diagnosis; help with the systematic method, how to measure, and what each criterion means.",
  ].join('\n');
  return { kind: 'case', title: tsh.in(lang, 'titleCase', { n: num }), text };
}

function drillContext(id: string, lang: Lang): PageContext {
  const familyId = id.split(':')[0];
  const fam = getFamily(familyId);
  const t = (x: L10n): string => pick(x, lang);
  const title = fam ? t(fam.title) : familyId;
  const lines = [
    fam ? `A practice drill — "${title}": ${t(fam.description)}` : `A practice session ("${familyId}").`,
    'You cannot see the items; never state or guess the answer of the current item. Explain the criteria and the method of deciding.',
  ];
  return { kind: 'drill', title, text: lines.join('\n') };
}

function labContext(scenario: string | undefined): PageContext {
  const name = scenario ? scenario.replace(/-/g, ' ') : '';
  const text = [
    'The Heart Lab: a 3D heart model whose activation drives a live 12-lead ECG (overview, electrodes and leads, section, blood flow, click-to-freeze).',
    name ? `Current scenario: ${name}.` : 'Scenario: normal sinus rhythm (the default).',
  ].join('\n');
  return { kind: 'lab', title: name, text };
}

/**
 * Lesson validator (docs/PLAN.md §11 "every lesson validates against the schema; every referenced scenario / finding /
 * case exists; every string has zh/en/es"). Pure: the catalogues it checks against (synth scenarios, practice drill
 * families, real cases, figure ids) are passed in, so tests can run it with fakes and tests/course/lessons.test.ts
 * runs it on every registered lesson with the live catalogues.
 *
 * Errors make a lesson unusable or wrong (unknown scenario, missing translation, dial outside the scenario's range…);
 * warnings flag authoring smells (no hook, no summary, a criteria card without a source…).
 */
import { LAYOUTS } from '../app/store';
import { FINDINGS } from '../core/findings';
import { EXTRA_LEADS, STD_LEADS, type ExtraLead } from '../core/leads';
import { REGIONS } from '../core/regions';
import type { DrillFamily } from '../practice/api';
import { COMPETENCIES, ITEM_KINDS, STAGES, type StageId } from '../practice/api';
import { DIAL_IDS, DIFFICULTIES, type ScenarioDef } from '../synth/api';
import { AUTO_MARK_KINDS, MARK_COLORS } from './marks';
import { unbalancedMarkers } from './markup';

export interface LessonIssue {
  readonly level: 'error' | 'warning';
  /** JSON-ish path inside the lesson, e.g. `blocks[3].steps[1].title.es` */
  readonly path: string;
  readonly message: string;
}

export interface ValidateDeps {
  /** the synth scenario catalogue (src/synth scenarios()) */
  readonly scenarios: readonly ScenarioDef[];
  /** drill families (src/practice families()); null = the practice engine is not available */
  readonly families: readonly DrillFamily[] | null;
  /** real-case lookup (src/real getCase): undefined = no such case */
  readonly getCase: (id: number) => unknown;
  /** figure ids (src/figures FIGURE_IDS) */
  readonly figureIds: readonly string[];
  /** decision-tree ids (src/figures TREE_IDS); omitted = not checked */
  readonly treeIds?: readonly string[];
  /** planned lesson id → stage (catalogue.ts); omitted = not checked */
  readonly plan?: ReadonlyMap<string, StageId>;
  /** expected id (the data file name); omitted = not checked */
  readonly fileId?: string;
}

type Obj = Readonly<Record<string, unknown>>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const has = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

const LEADS: readonly string[] = [...STD_LEADS, ...EXTRA_LEADS];
const LANG_KEYS = ['zh', 'en', 'es'] as const;
const BLOCK_KINDS = ['hook', 'text', 'ecg', 'live', 'figure', 'heart', 'criteria', 'worked', 'contrast', 'check', 'drill', 'real', 'pitfalls', 'summary'] as const;
const ECG_MARK_KINDS = ['bracket', 'wave', 'region', 'hline', 'arrow', 'lead'] as const;
const CJK = /[㐀-鿿]/;

/** Context of the ECG a mark / view refers to (for AutoMark and extra-lead checks). */
interface EcgCtx {
  readonly real: boolean;
  /** extra leads the synthetic request asks for */
  readonly extra: readonly string[];
  /** record length (ms) for window checks */
  readonly durationMs: number;
}

export function validateLesson(lesson: unknown, deps: ValidateDeps): LessonIssue[] {
  const issues: LessonIssue[] = [];
  const err = (path: string, message: string) => issues.push({ level: 'error', path, message });
  const warn = (path: string, message: string) => issues.push({ level: 'warning', path, message });

  const scenarioById = new Map(deps.scenarios.map((s) => [s.id, s]));
  const familyById = deps.families ? new Map(deps.families.map((f) => [f.id, f])) : null;

  // ── generic: every L10n-shaped object has all three languages ───────────────────────────────────────────────────
  const walk = (v: unknown, path: string) => {
    if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${path}[${i}]`));
      return;
    }
    if (!isObj(v)) return;
    if (LANG_KEYS.some((k) => k in v)) {
      for (const k of LANG_KEYS) {
        const s = v[k];
        if (!isStr(s) || s.trim() === '') err(`${path}.${k}`, `missing ${k} text (every string needs zh, en and es)`);
      }
      const zh = v.zh, en = v.en, es = v.es;
      if (isStr(zh) && isStr(en) && zh.trim() !== '' && !CJK.test(zh) && /[a-z]{4,}/i.test(zh) && zh === en) {
        warn(`${path}.zh`, 'zh text is identical to en (not translated?)');
      }
      if (isStr(es) && isStr(en) && es === en && /[a-z]{5,}\s+[a-z]{5,}/i.test(en)) warn(`${path}.es`, 'es text is identical to en (not translated?)');
      return;
    }
    for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(lesson, '');

  if (!isObj(lesson)) {
    err('', 'a lesson must be an object');
    return issues;
  }
  const L = lesson;

  // ── helpers for required fields ─────────────────────────────────────────────────────────────────────────────────
  const l10n = (v: unknown, path: string, required = true): boolean => {
    if (v === undefined) {
      if (required) err(path, 'required text (L10n { zh, en, es }) is missing');
      return false;
    }
    if (!isObj(v) || !LANG_KEYS.some((k) => k in v)) {
      err(path, 'expected localized text { zh, en, es }');
      return false;
    }
    return true;
  };
  const l10nList = (v: unknown, path: string, min = 1): readonly unknown[] => {
    if (!Array.isArray(v)) {
      err(path, 'expected a list of localized texts');
      return [];
    }
    if (v.length < min) err(path, `needs at least ${min} item(s)`);
    v.forEach((x, i) => l10n(x, `${path}[${i}]`));
    return v;
  };
  const finding = (v: unknown, path: string) => {
    if (!isStr(v) || !(v in FINDINGS)) err(path, `unknown finding id ${JSON.stringify(v)} (src/core/findings.ts)`);
  };
  const leadOk = (v: unknown, path: string, ctx: EcgCtx | null, allowAll: boolean) => {
    if (allowAll && v === 'all') return;
    if (!has(LEADS, v)) {
      err(path, `unknown lead ${JSON.stringify(v)}`);
      return;
    }
    if ((EXTRA_LEADS as readonly string[]).includes(v) && ctx) {
      if (ctx.real) err(path, `real ECGs have no ${v} lead`);
      else if (!ctx.extra.includes(v)) err(path, `lead ${v} is not recorded: add it to the request's extraLeads`);
    }
  };

  // ── ECG sources ─────────────────────────────────────────────────────────────────────────────────────────────────
  const dialsCheck = (dials: unknown, sc: ScenarioDef | undefined, path: string) => {
    if (dials === undefined) return;
    if (!isObj(dials)) {
      err(path, 'dials must be an object { dialId: value }');
      return;
    }
    for (const [id, val] of Object.entries(dials)) {
      if (!has(DIAL_IDS, id)) {
        err(`${path}.${id}`, `unknown dial id "${id}" (src/synth/api.ts DIAL_IDS)`);
        continue;
      }
      if (!isNum(val)) err(`${path}.${id}`, 'dial value must be a number');
      if (!sc) continue;
      const range = sc.dials[id];
      if (!range) err(`${path}.${id}`, `scenario "${sc.id}" does not allow the dial "${id}" (allowed: ${Object.keys(sc.dials).join(', ') || 'none'})`);
      else if (isNum(val) && (val < range.min || val > range.max)) err(`${path}.${id}`, `${val} is outside the scenario's range ${range.min}…${range.max}`);
    }
  };
  const scenarioRef = (id: unknown, variant: unknown, path: string): ScenarioDef | undefined => {
    if (!isStr(id) || id === '') {
      err(`${path}.scenario`, 'scenario id is missing');
      return undefined;
    }
    const sc = scenarioById.get(id);
    if (!sc) {
      const hint = deps.scenarios.length === 0 ? ' — the synth catalogue is empty (src/synth not built yet?)' : '';
      err(`${path}.scenario`, `unknown scenario id "${id}"${hint}`);
      return undefined;
    }
    if (variant !== undefined) {
      if (!isStr(variant)) err(`${path}.variant`, 'variant must be a string');
      else if (!sc.variants || !(variant in sc.variants)) {
        err(`${path}.variant`, `scenario "${id}" has no variant "${variant}" (variants: ${Object.keys(sc.variants ?? {}).join(', ') || 'none'})`);
      }
    }
    return sc;
  };
  const seedOk = (v: unknown, path: string) => {
    if (!isInt(v) || v < 0) err(path, 'seed must be a non-negative integer (exercises are reproducible from their seed)');
  };
  const source = (v: unknown, path: string): EcgCtx | null => {
    if (!isObj(v)) {
      err(path, 'ECG source is missing ({ kind: "synth", req } or { kind: "real", id })');
      return null;
    }
    if (v.kind === 'real') {
      if (!isInt(v.id)) err(`${path}.id`, 'real ECG id must be an integer (PTB-XL ecg_id)');
      else if (deps.getCase(v.id) === undefined) err(`${path}.id`, `unknown real case ${v.id} (not in the curated PTB-XL library)`);
      return { real: true, extra: [], durationMs: 10_000 };
    }
    if (v.kind !== 'synth') {
      err(`${path}.kind`, `unknown ECG source kind ${JSON.stringify(v.kind)}`);
      return null;
    }
    const req = v.req;
    if (!isObj(req)) {
      err(`${path}.req`, 'synthetic ECG request is missing');
      return null;
    }
    const sc = scenarioRef(req.scenario, req.variant, `${path}.req`);
    seedOk(req.seed, `${path}.req.seed`);
    dialsCheck(req.dials, sc, `${path}.req.dials`);
    if (req.difficulty !== undefined && !has(DIFFICULTIES, req.difficulty)) err(`${path}.req.difficulty`, `unknown difficulty ${JSON.stringify(req.difficulty)}`);
    if (req.fs !== undefined && ![250, 500, 1000].includes(req.fs as number)) err(`${path}.req.fs`, 'fs must be 250, 500 or 1000');
    if (req.durationS !== undefined && (!isNum(req.durationS) || req.durationS < 1 || req.durationS > 60)) err(`${path}.req.durationS`, 'durationS must be 1–60 s');
    const extra: string[] = [];
    if (req.extraLeads !== undefined) {
      if (!Array.isArray(req.extraLeads)) err(`${path}.req.extraLeads`, 'extraLeads must be a list');
      else
        req.extraLeads.forEach((x, i) => {
          if (!has(EXTRA_LEADS as readonly ExtraLead[], x)) err(`${path}.req.extraLeads[${i}]`, `unknown extra lead ${JSON.stringify(x)}`);
          else extra.push(x);
        });
    }
    return { real: false, extra, durationMs: (isNum(req.durationS) ? req.durationS : 10) * 1000 };
  };

  // ── views and marks ─────────────────────────────────────────────────────────────────────────────────────────────
  const view = (v: unknown, path: string, ctx: EcgCtx | null) => {
    if (v === undefined) return;
    if (!isObj(v)) {
      err(path, 'view must be an object');
      return;
    }
    if (v.layout !== undefined && !has(LAYOUTS, v.layout)) err(`${path}.layout`, `unknown layout ${JSON.stringify(v.layout)}`);
    if (v.lead !== undefined) leadOk(v.lead, `${path}.lead`, ctx, false);
    if (v.window !== undefined) {
      const w = v.window;
      if (!Array.isArray(w) || w.length !== 2 || !isNum(w[0]) || !isNum(w[1]) || w[0] < 0 || w[1] <= w[0]) err(`${path}.window`, 'window must be [t0, t1] in ms with 0 ≤ t0 < t1');
      else if (ctx && w[1] > ctx.durationMs + 1) err(`${path}.window`, `window ends after the record (${ctx.durationMs} ms)`);
    }
    if (v.highlightLeads !== undefined) leads(v.highlightLeads, `${path}.highlightLeads`, ctx);
    if (v.calipers !== undefined && typeof v.calipers !== 'boolean') err(`${path}.calipers`, 'calipers must be true or false');
  };
  const leads = (v: unknown, path: string, ctx: EcgCtx | null) => {
    if (!Array.isArray(v)) {
      err(path, 'expected a list of leads');
      return;
    }
    v.forEach((x, i) => leadOk(x, `${path}[${i}]`, ctx, false));
  };
  const marks = (v: unknown, path: string, ctx: EcgCtx | null) => {
    if (v === undefined) return;
    if (!Array.isArray(v)) {
      err(path, 'marks must be a list');
      return;
    }
    v.forEach((m, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(m)) {
        err(p, 'a mark must be an object');
        return;
      }
      if (m.color !== undefined && !has(MARK_COLORS, m.color)) err(`${p}.color`, `unknown mark colour ${JSON.stringify(m.color)}`);
      if ('auto' in m) {
        if (!has(AUTO_MARK_KINDS, m.auto)) err(`${p}.auto`, `unknown AutoMark ${JSON.stringify(m.auto)} (${AUTO_MARK_KINDS.join(', ')})`);
        if (ctx?.real) err(p, 'AutoMarks need the model truth: they cannot be used on a real ECG (use explicit marks)');
        if (m.lead !== undefined) leadOk(m.lead, `${p}.lead`, ctx, true);
        if (m.beat !== undefined && (!isInt(m.beat) || m.beat < 0)) err(`${p}.beat`, 'beat must be a non-negative integer index into truth.beats');
        if (m.label !== undefined) l10n(m.label, `${p}.label`);
        return;
      }
      if (!has(ECG_MARK_KINDS, m.kind)) {
        err(`${p}.kind`, `unknown mark kind ${JSON.stringify(m.kind)}`);
        return;
      }
      if (ctx && !ctx.real && m.kind !== 'lead' && m.kind !== 'hline') {
        warn(p, 'explicit time marks on a synthetic ECG break when the seed or a dial changes: prefer an AutoMark');
      }
      leadOk(m.lead, `${p}.lead`, ctx, m.kind === 'bracket' || m.kind === 'wave' || m.kind === 'region');
      const num = (k: string) => {
        if (!isNum(m[k])) err(`${p}.${k}`, `${k} must be a number`);
      };
      if (m.kind === 'bracket' || m.kind === 'region') {
        num('t0');
        num('t1');
      }
      if (m.kind === 'wave' || m.kind === 'arrow') num('t');
      if (m.kind === 'hline' || m.kind === 'arrow') num('mv');
      if (m.kind === 'wave' && !isStr(m.label)) err(`${p}.label`, 'a wave mark needs a short text label');
    });
  };

  // ── practice references ─────────────────────────────────────────────────────────────────────────────────────────
  const familyRef = (id: unknown, difficulty: unknown, path: string) => {
    if (!isStr(id) || id === '') {
      err(path, 'drill family id is missing');
      return;
    }
    if (!familyById) {
      err(path, `cannot check drill family "${id}": the practice engine is not available (src/practice not built yet?)`);
      return;
    }
    const f = familyById.get(id);
    if (!f) {
      err(path, `unknown drill family "${id}" (src/practice families())`);
      return;
    }
    if (difficulty !== undefined && has(DIFFICULTIES, difficulty) && !f.difficulties.includes(difficulty)) {
      err(path, `family "${id}" has no "${difficulty}" difficulty (has: ${f.difficulties.join(', ')})`);
    }
  };
  const inlineItem = (it: unknown, path: string) => {
    if (!isObj(it)) {
      err(path, 'inline item must be an object');
      return;
    }
    if (!has(ITEM_KINDS, it.kind)) err(`${path}.kind`, `unknown item kind ${JSON.stringify(it.kind)}`);
    if (!isStr(it.id) || it.id === '') err(`${path}.id`, 'item id is missing');
    if (!isStr(it.family) || it.family === '') err(`${path}.family`, 'item family is missing');
    if (!has(COMPETENCIES, it.competency)) err(`${path}.competency`, `unknown competency ${JSON.stringify(it.competency)}`);
    if (!has(DIFFICULTIES, it.difficulty)) err(`${path}.difficulty`, `unknown difficulty ${JSON.stringify(it.difficulty)}`);
    seedOk(it.seed, `${path}.seed`);
    l10n(it.prompt, `${path}.prompt`);
    l10n(it.explanation, `${path}.explanation`);
    if (it.hint !== undefined) l10n(it.hint, `${path}.hint`);
    const ctx = source(it.ecg, `${path}.ecg`);
    view(it.view, `${path}.view`, ctx);
    if (it.kind === 'compare') source(it.ecg2, `${path}.ecg2`);
    if (!Array.isArray(it.findings)) err(`${path}.findings`, 'findings must be a list');
    else it.findings.forEach((f, i) => finding(f, `${path}.findings[${i}]`));
    const key = it.key;
    if (!isObj(key)) {
      err(`${path}.key`, 'answer key is missing');
      return;
    }
    if (it.kind === 'choice') {
      const opts = Array.isArray(key.options) ? key.options : [];
      if (opts.length < 2) err(`${path}.key.options`, 'a choice item needs at least two options');
      opts.forEach((o, i) => {
        if (!isObj(o) || !isStr(o.id)) err(`${path}.key.options[${i}]`, 'option needs an id');
        else l10n(o.label, `${path}.key.options[${i}].label`);
      });
      if (!opts.some((o) => isObj(o) && o.id === key.correct)) err(`${path}.key.correct`, 'the correct option is not among the options');
    }
    if (it.kind === 'findings') {
      const opts = Array.isArray(key.options) ? key.options : [];
      const corr = Array.isArray(key.correct) ? key.correct : [];
      opts.forEach((f, i) => finding(f, `${path}.key.options[${i}]`));
      corr.forEach((f, i) => {
        finding(f, `${path}.key.correct[${i}]`);
        if (!opts.includes(f)) err(`${path}.key.correct[${i}]`, 'a correct finding is not among the options');
      });
    }
    if (it.kind === 'occlusion') {
      if (!['occlusion', 'indeterminate', 'not-occlusion'].includes(key.call as string)) err(`${path}.key.call`, 'call must be occlusion, indeterminate or not-occlusion');
      if (key.mimic !== undefined) finding(key.mimic, `${path}.key.mimic`);
    }
  };

  // ── lesson fields ───────────────────────────────────────────────────────────────────────────────────────────────
  const id = L.id;
  if (!isStr(id) || !/^[a-z]\d+$/.test(id)) err('id', `lesson id must look like "f1" or "i10" (got ${JSON.stringify(id)})`);
  if (deps.fileId !== undefined && id !== deps.fileId) err('id', `lesson id "${String(id)}" does not match its file name "${deps.fileId}.ts"`);
  if (!has(STAGES, L.stage)) err('stage', `unknown stage ${JSON.stringify(L.stage)} (${STAGES.join(', ')})`);
  else if (isStr(id) && id[0].toUpperCase() !== L.stage) err('stage', `lesson ${id} belongs to stage ${id[0].toUpperCase()}, not ${L.stage}`);
  if (deps.plan && isStr(id)) {
    const st = deps.plan.get(id);
    if (st === undefined) err('id', `lesson "${id}" is not in the curriculum plan (docs/PLAN.md §3, src/course/catalogue.ts)`);
  }
  if (!isInt(L.order) || L.order < 1) err('order', 'order must be a positive integer');
  else if (isStr(id) && /^[a-z]\d+$/.test(id) && L.order !== Number(id.slice(1))) {
    warn('order', `order ${L.order} differs from the lesson's position in its stage (${Number(id.slice(1))})`);
  }
  l10n(L.title, 'title');
  l10n(L.summary, 'summary');
  l10nList(L.objectives, 'objectives');
  if (!isNum(L.minutes) || L.minutes < 1 || L.minutes > 90) err('minutes', 'minutes must be an estimate between 1 and 90');
  if (!Array.isArray(L.competencies) || L.competencies.length === 0) err('competencies', 'list the competencies (C1–C12) the lesson trains');
  else L.competencies.forEach((c, i) => has(COMPETENCIES, c) || err(`competencies[${i}]`, `unknown competency ${JSON.stringify(c)}`));
  if (!Array.isArray(L.findings)) err('findings', 'findings must be a list (may be empty)');
  else L.findings.forEach((f, i) => finding(f, `findings[${i}]`));
  if (!Array.isArray(L.sources) || L.sources.length === 0) err('sources', 'cite at least one source (guideline or paper; the book only as "Castellano et al. 2004")');
  else L.sources.forEach((s, i) => (isStr(s) && s.trim() !== '') || err(`sources[${i}]`, 'a source must be a non-empty string'));

  const blocks = Array.isArray(L.blocks) ? L.blocks : null;
  if (!blocks || blocks.length === 0) {
    err('blocks', 'a lesson needs at least one block');
    return issues;
  }

  blocks.forEach((b, i) => {
    const p = `blocks[${i}]`;
    if (!isObj(b)) {
      err(p, 'a block must be an object');
      return;
    }
    if (!has(BLOCK_KINDS, b.kind)) {
      err(`${p}.kind`, `unknown block kind ${JSON.stringify(b.kind)} (${BLOCK_KINDS.join(', ')})`);
      return;
    }
    switch (b.kind) {
      case 'hook': {
        const ctx = source(b.ecg, `${p}.ecg`);
        view(b.view, `${p}.view`, ctx);
        l10n(b.question, `${p}.question`);
        l10n(b.reveal, `${p}.reveal`);
        break;
      }
      case 'text': {
        if (b.title !== undefined) l10n(b.title, `${p}.title`);
        if (l10n(b.body, `${p}.body`) && isObj(b.body)) {
          for (const k of LANG_KEYS) {
            const s = b.body[k];
            if (isStr(s) && unbalancedMarkers(s)) warn(`${p}.body.${k}`, 'unpaired * or ** markers (light markup: **bold**, *italic*)');
          }
        }
        break;
      }
      case 'ecg': {
        const ctx = source(b.ecg, `${p}.ecg`);
        view(b.view, `${p}.view`, ctx);
        marks(b.marks, `${p}.marks`, ctx);
        l10n(b.caption, `${p}.caption`);
        break;
      }
      case 'live': {
        const sc = scenarioRef(b.scenario, b.variant, p);
        seedOk(b.seed, `${p}.seed`);
        if (!Array.isArray(b.dials) || b.dials.length === 0) err(`${p}.dials`, 'a live block needs at least one dial');
        else
          b.dials.forEach((d, k) => {
            const dp = `${p}.dials[${k}]`;
            if (!isObj(d) || !has(DIAL_IDS, d.id)) {
              err(`${dp}.id`, `unknown dial id ${JSON.stringify(isObj(d) ? d.id : d)} (src/synth/api.ts DIAL_IDS)`);
              return;
            }
            if (sc && !sc.dials[d.id]) err(`${dp}.id`, `scenario "${sc.id}" does not allow the dial "${d.id}" (allowed: ${Object.keys(sc.dials).join(', ') || 'none'})`);
            if (d.label !== undefined) l10n(d.label, `${dp}.label`);
          });
        const ctx: EcgCtx = { real: false, extra: [], durationMs: 10_000 };
        view(b.view, `${p}.view`, ctx);
        marks(b.marks, `${p}.marks`, ctx);
        l10n(b.caption, `${p}.caption`);
        break;
      }
      case 'figure': {
        const f = b.figure;
        if (!isObj(f) || !isStr(f.id) || !deps.figureIds.includes(f.id)) {
          err(`${p}.figure.id`, `unknown figure ${JSON.stringify(isObj(f) ? f.id : f)} (${deps.figureIds.join(', ')})`);
        } else if (f.id === 'decision-tree' && deps.treeIds) {
          const tree = isObj(f.params) ? f.params.tree : undefined;
          if (!has(deps.treeIds, tree)) err(`${p}.figure.params.tree`, `unknown decision tree ${JSON.stringify(tree)} (${deps.treeIds.join(', ')})`);
        }
        if (isObj(f) && f.params !== undefined && !isObj(f.params)) err(`${p}.figure.params`, 'params must be an object');
        if (b.ecg !== undefined) source(b.ecg, `${p}.ecg`);
        if (b.caption !== undefined) l10n(b.caption, `${p}.caption`);
        break;
      }
      case 'heart': {
        const ctx = source(b.ecg, `${p}.ecg`);
        if (ctx?.real) warn(`${p}.ecg`, 'a real ECG has no region states: the heart shows anatomy only');
        if (b.emphasize !== undefined) {
          if (!Array.isArray(b.emphasize)) err(`${p}.emphasize`, 'emphasize must be a list of region ids');
          else b.emphasize.forEach((r, k) => (isStr(r) && r in REGIONS) || err(`${p}.emphasize[${k}]`, `unknown region ${JSON.stringify(r)} (src/core/regions.ts)`));
        }
        if (b.showConduction !== undefined && typeof b.showConduction !== 'boolean') err(`${p}.showConduction`, 'showConduction must be true or false');
        l10n(b.caption, `${p}.caption`);
        break;
      }
      case 'criteria': {
        l10n(b.title, `${p}.title`);
        if (!Array.isArray(b.items) || b.items.length === 0) err(`${p}.items`, 'a criteria card needs at least one criterion');
        else
          b.items.forEach((it, k) => {
            if (!isObj(it)) err(`${p}.items[${k}]`, 'criterion must be { label, value }');
            else {
              l10n(it.label, `${p}.items[${k}].label`);
              l10n(it.value, `${p}.items[${k}].value`);
            }
          });
        if (b.source === undefined) warn(`${p}.source`, 'cite the source of the criteria (docs/curriculum/criteria.md "source" column)');
        else if (!isStr(b.source) || b.source.trim() === '') err(`${p}.source`, 'source must be a non-empty string');
        break;
      }
      case 'worked': {
        l10n(b.title, `${p}.title`);
        const ctx = source(b.ecg, `${p}.ecg`);
        view(b.view, `${p}.view`, ctx);
        if (!Array.isArray(b.steps) || b.steps.length === 0) err(`${p}.steps`, 'a worked example needs at least one step');
        else
          b.steps.forEach((s, k) => {
            const sp = `${p}.steps[${k}]`;
            if (!isObj(s)) {
              err(sp, 'a step must be an object');
              return;
            }
            l10n(s.title, `${sp}.title`);
            l10n(s.body, `${sp}.body`);
            marks(s.marks, `${sp}.marks`, ctx);
            if (s.highlightLeads !== undefined) leads(s.highlightLeads, `${sp}.highlightLeads`, ctx);
            view(s.view, `${sp}.view`, ctx);
          });
        break;
      }
      case 'contrast': {
        l10n(b.title, `${p}.title`);
        let ctxL: EcgCtx | null = null;
        for (const side of ['left', 'right'] as const) {
          const s = b[side];
          const sp = `${p}.${side}`;
          if (!isObj(s)) {
            err(sp, `the ${side} side is missing`);
            continue;
          }
          const ctx = source(s.ecg, `${sp}.ecg`);
          if (side === 'left') ctxL = ctx;
          l10n(s.caption, `${sp}.caption`);
          marks(s.marks, `${sp}.marks`, ctx);
        }
        l10n(b.point, `${p}.point`);
        view(b.view, `${p}.view`, ctxL);
        break;
      }
      case 'check': {
        const it = b.item;
        if (!isObj(it)) err(`${p}.item`, 'item reference is missing ({ family, seed } or { inline })');
        else if ('inline' in it) inlineItem(it.inline, `${p}.item.inline`);
        else {
          familyRef(it.family, it.difficulty, `${p}.item.family`);
          seedOk(it.seed, `${p}.item.seed`);
          if (it.difficulty !== undefined && !has(DIFFICULTIES, it.difficulty)) err(`${p}.item.difficulty`, `unknown difficulty ${JSON.stringify(it.difficulty)}`);
        }
        break;
      }
      case 'drill': {
        if (!Array.isArray(b.families) || b.families.length === 0) err(`${p}.families`, 'a drill needs at least one family');
        else b.families.forEach((f, k) => familyRef(f, b.difficulty, `${p}.families[${k}]`));
        if (!isInt(b.count) || b.count < 1 || b.count > 50) err(`${p}.count`, 'count must be 1–50 items');
        if (!isNum(b.passScore) || b.passScore <= 0 || b.passScore > 1) err(`${p}.passScore`, 'passScore is a fraction in (0, 1], e.g. 0.8');
        if (b.difficulty !== undefined && !has(DIFFICULTIES, b.difficulty)) err(`${p}.difficulty`, `unknown difficulty ${JSON.stringify(b.difficulty)}`);
        break;
      }
      case 'real': {
        if (!Array.isArray(b.ids) || b.ids.length === 0) err(`${p}.ids`, 'list 1–3 real case ids');
        else {
          if (b.ids.length > 3) warn(`${p}.ids`, 'more than three real cases in one block (PLAN §4: 1–3)');
          b.ids.forEach((x, k) => {
            if (!isInt(x)) err(`${p}.ids[${k}]`, 'case id must be an integer (PTB-XL ecg_id)');
            else if (deps.getCase(x) === undefined) err(`${p}.ids[${k}]`, `unknown real case ${x} (not in the curated PTB-XL library)`);
          });
        }
        l10n(b.caption, `${p}.caption`);
        break;
      }
      case 'pitfalls':
        l10nList(b.items, `${p}.items`);
        break;
      case 'summary': {
        const pts = l10nList(b.points, `${p}.points`);
        if (pts.length > 0 && (pts.length < 3 || pts.length > 5)) warn(`${p}.points`, 'a summary works best with 3–5 take-aways');
        break;
      }
    }
  });

  const kinds = blocks.filter(isObj).map((b) => b.kind);
  if (kinds[0] !== 'hook') warn('blocks[0]', 'lessons should open with a hook (attempt before teaching)');
  if (!kinds.includes('summary')) warn('blocks', 'no summary block (take-aways feed the spaced review)');
  if (!kinds.includes('check') && !kinds.includes('drill')) warn('blocks', 'no check or drill block (practice with feedback)');
  return issues;
}

export const errorsOf = (issues: readonly LessonIssue[]): LessonIssue[] => issues.filter((x) => x.level === 'error');

/** One line per issue, for test failure messages. */
export function formatIssues(issues: readonly LessonIssue[]): string {
  return issues.map((x) => `${x.level === 'error' ? 'ERROR' : 'warn '} ${x.path || '(lesson)'}: ${x.message}`).join('\n');
}

/**
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 *  PATTERN ATLAS — ENTRY SCHEMA (src/atlas). Read this before writing entries.
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * One entry per FindingId (src/core/findings.ts). The atlas page of a finding is built from its entry plus things the
 * atlas finds by itself: the synthetic exemplar (src/synth `scenarios({ finding })` + `generate`), the real PTB-XL
 * examples (src/real `casesWithFinding`) and the drill families that train it (src/practice `families()`).
 *
 * HOW TO ADD ENTRIES (other workstreams: rhythm + conduction, ischemia + other)
 *   1. Create `src/atlas/entries/<category>.ts` (one file per FindingCategory; several categories may share a file).
 *   2. Export exactly `export const entries: readonly AtlasEntry[] = [ … ];` — the registry (registry.ts) collects every
 *      file in entries/ with import.meta.glob, so no other file has to be edited.
 *   3. Run `npx vitest run tests/atlas` — validateEntry() below is applied to every entry (all three languages, valid
 *      mimic ids, sources, lesson ids, urgency for critical findings, banned outdated terms).
 *
 * CONTENT RULES
 *   - Write original text for medical students: short, concrete, one idea per line. Never copy the reference book
 *     (Castellano et al. 2004); use it only for structure. Use the CURRENT value of every criterion from
 *     docs/curriculum/criteria.md and cite the guideline/paper in `source` (short form) and `sources` (full form).
 *   - Every L10n has zh / en / es. Chinese: standard textbook terms (导联, 心房异常, 左前分支阻滞). Spanish: Spain usage
 *     ("derivación", "aurícula", "onda", "segmento", "bloqueo de rama", "bloqueo fascicular", "anomalía auricular").
 *   - Modern terminology only (docs/curriculum/critic.json "outdated_concepts"): atrial ABNORMALITY (not enlargement),
 *     fascicular block (not hemiblock), R-wave peak time (not intrinsicoid deflection), "secondary ST–T abnormalities"
 *     (not systolic/diastolic overload), sinus node dysfunction (not sick sinus), describe ST/T morphology instead of
 *     "subendocardial / subepicardial ischaemia / injury". BANNED_TERMS below is enforced by the tests.
 *   - `mechanism` is exactly two sentences (zh: two "。"). Avoid abbreviations ending in a period ("e.g.") there.
 *   - `mimics` lists findings a reader could confuse with this one, each with the ONE feature that separates them,
 *     written so it reads as "here …; in the mimic …". Mimic ids may point to any category (entries written or not).
 *   - `urgency` is required for `critical` findings ("can't-miss") and recommended for any finding with a time-critical
 *     next step. It states what to do in the next minutes, not a treatment protocol.
 *   - `lessons` are lesson ids of docs/PLAN.md §3 (LESSON_IDS below).
 */
import type { LayoutId } from '../app/store';
import { FINDING_CATEGORIES, FINDINGS, isFindingId, type FindingCategory, type FindingId } from '../core/findings';
import { LANGS, type L10n } from '../core/l10n';
import type { Lead } from '../core/leads';
import type { DialId, RecordingSpec } from '../synth/api';

/** A numeric (or explicitly qualitative) criterion with its source (short citation, e.g. "Hancock 2009, AHA Part V"). */
export interface Criterion {
  readonly label: L10n;
  readonly value: L10n;
  readonly source: string;
}

/** A look-alike and the feature that tells the two apart. */
export interface MimicSpec {
  readonly id: FindingId;
  /** "here …; in the mimic …" — one discriminating feature, concrete and visible on the ECG */
  readonly discriminator: L10n;
  /** leads where the discriminating feature is best seen (highlighted in the side-by-side view) */
  readonly leads?: readonly Lead[];
}

export const URGENCIES = ['immediate', 'urgent', 'routine'] as const;
export type Urgency = (typeof URGENCIES)[number];

export interface UrgencySpec {
  /** immediate = act now (minutes); urgent = same visit / hours; routine = elective work-up */
  readonly level: Urgency;
  /** the next step, one or two sentences */
  readonly next: L10n;
}

/** How the synthetic exemplar is shown. Everything is optional: the atlas finds scenarios by finding id. */
export interface ExemplarSpec {
  /** preferred scenario ids, tried first (ignored when the synth catalogue does not have them) */
  readonly scenarios?: readonly string[];
  readonly variant?: string;
  readonly dials?: Readonly<Partial<Record<DialId, number>>>;
  readonly layout?: LayoutId;
  /** lead of 'single' / 'strip' layouts and rhythm strip */
  readonly lead?: Lead;
  /** leads where the finding is best seen (highlighted) */
  readonly leads?: readonly Lead[];
  /**
   * Recording-chain fallback, used only while the synth catalogue has no scenario for the finding: the `scenario`
   * heart recorded through `recording` (a cable swap, a misplaced chest electrode). Only the recording changes — the
   * cardiac source is untouched (CLAUDE.md one-source rule), so it suits technical findings, never a disease.
   */
  readonly fallback?: { readonly scenario: string; readonly recording: RecordingSpec; readonly label: L10n };
}

export interface AtlasEntry {
  readonly id: FindingId;
  /** one line */
  readonly definition: L10n;
  /** "how to recognise it": 2–6 key features in reading order */
  readonly features: readonly L10n[];
  /** numeric criteria with sources (at least one) */
  readonly criteria: readonly Criterion[];
  /** why it looks like this — exactly two sentences */
  readonly mechanism: L10n;
  /** look-alikes / differential */
  readonly mimics: readonly MimicSpec[];
  /** common reading errors (at least one) */
  readonly pitfalls: readonly L10n[];
  /** required for critical findings */
  readonly urgency?: UrgencySpec;
  /** lesson ids (docs/PLAN.md §3) */
  readonly lessons: readonly string[];
  /** full references (guidelines, papers); the book only as "Castellano et al. 2004" */
  readonly sources: readonly string[];
  /** extra search keys in any language (abbreviations, eponyms, older names): 'LVH', 'HVI', 'P pulmonale' */
  readonly aka?: readonly string[];
  readonly exemplar?: ExemplarSpec;
}

/** Stable lesson ids of docs/PLAN.md §3 (tests check this list against the plan). */
export const LESSON_IDS = [
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6',
  's1', 's2', 's3', 's4', 's5', 's6', 's7',
  'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8',
  't1', 't2', 't3', 't4', 't5', 't6', 't7',
  'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9', 'i10', 'i11',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9',
  'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10', 'o11', 'o12',
  'x1', 'x2', 'x3', 'x4',
] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export function isLessonId(s: string): s is LessonId {
  return (LESSON_IDS as readonly string[]).includes(s);
}

/**
 * Outdated or wrong terms that must not appear in atlas content (critic.json "outdated_concepts"; findings.ts naming).
 * Matched case-insensitively against every language. Glossary pages may *mention* old terms as "replaces …"; entries may not.
 */
export const BANNED_TERMS: readonly { readonly re: RegExp; readonly use: string }[] = [
  { re: /hemibloqueo|hemiblock|半支阻滞/i, use: 'bloqueo fascicular / fascicular block / 分支阻滞' },
  { re: /crecimiento auricular|atrial enlargement|心房扩大/i, use: 'anomalía auricular / atrial abnormality / 心房异常' },
  { re: /intrinsicoid|intrinsecoide|室壁激动时间/i, use: 'R-wave peak time / tiempo de pico de la R / R峰时间' },
  { re: /sick sinus|enfermedad del nodo sinusal|病态窦房结/i, use: 'sinus node dysfunction / disfunción sinusal / 窦房结功能障碍' },
  { re: /subepicardial (ischaemia|ischemia|injury)|subendocardial (ischaemia|ischemia|injury)|isquemia subendoc|isquemia subepic|lesión subepic|lesión subendoc|心内膜下心肌缺血|心外膜下心肌损伤/i, use: 'describe the ST/T morphology' },
  { re: /sobrecarga (sistólica|diastólica)|(systolic|diastolic) overload|收缩期负荷过重|舒张期负荷过重/i, use: 'secondary ST–T abnormalities' },
  { re: /\bderivada\b|\bcomputadora\b/i, use: 'derivación / ordenador (Spain usage)' },
  { re: /\bnodal rhythm|\bnodal tachycardia|ritmo nodal/i, use: 'junctional' },
];

const SENTENCE_END = /[.!?](?=\s|$)/g;

function sentencesEn(s: string): number {
  return (s.trim().match(SENTENCE_END) ?? []).length;
}

function sentencesZh(s: string): number {
  return (s.match(/[。！？]/g) ?? []).length;
}

const filled = (t: L10n | undefined): boolean => !!t && LANGS.every((l) => typeof t[l] === 'string' && t[l].trim().length > 0);

/**
 * Every L10n of an entry with a path for messages. `prose` = running text, which must contain Chinese characters in zh
 * (criteria labels / values may be pure notation such as "V1" or "≥ 120 ms").
 */
export function entryTexts(e: AtlasEntry): { path: string; t: L10n; prose: boolean }[] {
  const out: { path: string; t: L10n; prose: boolean }[] = [
    { path: 'definition', t: e.definition, prose: true },
    { path: 'mechanism', t: e.mechanism, prose: true },
  ];
  e.features.forEach((t, i) => out.push({ path: `features[${i}]`, t, prose: true }));
  e.criteria.forEach((c, i) => {
    out.push({ path: `criteria[${i}].label`, t: c.label, prose: false });
    out.push({ path: `criteria[${i}].value`, t: c.value, prose: false });
  });
  e.mimics.forEach((m, i) => out.push({ path: `mimics[${i}].discriminator`, t: m.discriminator, prose: true }));
  e.pitfalls.forEach((t, i) => out.push({ path: `pitfalls[${i}]`, t, prose: true }));
  if (e.urgency) out.push({ path: 'urgency.next', t: e.urgency.next, prose: true });
  if (e.exemplar?.fallback) out.push({ path: 'exemplar.fallback.label', t: e.exemplar.fallback.label, prose: true });
  return out;
}

/** Problems with an entry (empty = valid). Used by the tests for every registered entry. */
export function validateEntry(e: AtlasEntry): string[] {
  const p: string[] = [];
  const at = (m: string) => p.push(`${e.id}: ${m}`);
  if (!isFindingId(e.id)) {
    at('unknown finding id');
    return p;
  }
  for (const { path, t, prose } of entryTexts(e)) {
    if (!filled(t)) at(`${path} must have non-empty zh / en / es`);
    else {
      if (prose && !/[一-鿿]/.test(t.zh)) at(`${path}.zh has no Chinese text`);
      if (prose && t.es === t.en && /[a-z]{4,}/i.test(t.en)) at(`${path}.es is a copy of the English text`);
      for (const b of BANNED_TERMS) {
        for (const l of LANGS) if (b.re.test(t[l])) at(`${path}.${l} uses an outdated term (${b.re.source}) — use ${b.use}`);
      }
    }
  }
  if (e.features.length < 2 || e.features.length > 6) at('features: 2–6 items');
  if (e.criteria.length < 1) at('criteria: at least one');
  e.criteria.forEach((c, i) => {
    if (!c.source || c.source.trim().length < 4) at(`criteria[${i}] needs a source`);
  });
  if (e.pitfalls.length < 1) at('pitfalls: at least one');
  if (e.sources.length < 1 || e.sources.some((s) => s.trim().length < 8)) at('sources: at least one full reference');
  if (filled(e.mechanism)) {
    if (sentencesEn(e.mechanism.en) !== 2) at(`mechanism.en must be two sentences (found ${sentencesEn(e.mechanism.en)})`);
    if (sentencesEn(e.mechanism.es) !== 2) at(`mechanism.es must be two sentences (found ${sentencesEn(e.mechanism.es)})`);
    if (sentencesZh(e.mechanism.zh) !== 2) at(`mechanism.zh must be two sentences (found ${sentencesZh(e.mechanism.zh)})`);
  }
  if (filled(e.definition) && sentencesEn(e.definition.en) > 1) at('definition must be one line (one sentence)');
  const seen = new Set<string>();
  for (const m of e.mimics) {
    if (!isFindingId(m.id)) at(`mimic ${m.id} is not a FindingId`);
    if (m.id === e.id) at('a finding cannot be its own mimic');
    if (seen.has(m.id)) at(`mimic ${m.id} listed twice`);
    seen.add(m.id);
  }
  if (FINDINGS[e.id].severity === 'critical' && !e.urgency) at('critical finding needs urgency');
  if (e.urgency && !(URGENCIES as readonly string[]).includes(e.urgency.level)) at('urgency.level invalid');
  if (e.exemplar?.fallback && FINDINGS[e.id].cat !== 'technical') at('exemplar.fallback changes only the recording: technical findings only');
  if (e.lessons.length < 1) at('lessons: at least one');
  for (const id of e.lessons) if (!isLessonId(id)) at(`lesson ${id} is not a PLAN §3 lesson id`);
  return p;
}

/** Categories in display order (re-exported for pages). */
export const ATLAS_CATEGORIES: readonly FindingCategory[] = FINDING_CATEGORIES;

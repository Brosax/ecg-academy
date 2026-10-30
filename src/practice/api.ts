/**
 * PUBLIC CONTRACT of the practice engine (src/practice): items, answers, grading, drill families, mastery, spaced review,
 * exam and the learner's progress store (lessons included). Other modules import only from src/practice/index.tsx.
 *
 * Pedagogy (docs/PLAN.md §1, §3, §5): immediate explanatory feedback; tolerances HR ±10 % (min ±5 bpm), intervals ±20 ms
 * (QT/QTc ±30 ms), axis ±30° (full credit ±20°); `critical` findings must reach 100 % before a stage is passed; in
 * occlusion items a missed occlusion is penalised more than a false activation and "repeat ECG / extra leads" can be the
 * right answer; the learner commits an answer before any reveal; confidence (1–3) is collected for calibration.
 */
import type { FindingId } from '../core/findings';
import type { L10n } from '../core/l10n';
import type { Lead } from '../core/leads';
import type { EcgMark } from '../ecg/api';
import type { LayoutId } from '../app/store';
import type { Difficulty, SynthRequest } from '../synth/api';

// ── competencies (PLAN §1) ─────────────────────────────────────────────────────────────────────────────────────────
export const COMPETENCIES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12'] as const;
export type CompetencyId = (typeof COMPETENCIES)[number];

export const STAGES = ['F', 'S', 'R', 'T', 'I', 'H', 'O', 'X'] as const;
export type StageId = (typeof STAGES)[number];

// ── where an item's ECG comes from ─────────────────────────────────────────────────────────────────────────────────
export type EcgSource =
  | { readonly kind: 'synth'; readonly req: SynthRequest }
  | { readonly kind: 'real'; readonly id: number };

export interface ItemView {
  readonly layout?: LayoutId;
  readonly lead?: Lead;
  readonly window?: readonly [number, number];
  readonly highlightLeads?: readonly Lead[];
  readonly calipers?: boolean;
}

export interface Option {
  readonly id: string;
  readonly label: L10n;
}

// ── items ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ITEM_KINDS = [
  'rate', // type the ventricular (or atrial) rate
  'measure', // measure an interval with calipers or type ms
  'qtc', // compute QTc
  'axis', // frontal axis: quadrant or degrees
  'choice', // single choice (rhythm, territory, mechanism, normal/abnormal…)
  'findings', // multi-select findings
  'locate', // click the ECG: a lead / a beat / a wave
  'occlusion', // occlusion likely / indeterminate (repeat, extra leads) / not occlusion (name the mimic)
  'report', // structured full reading
  'compare', // which of two ECGs shows X
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

interface ItemBase {
  /** reproducible id `${family}:${difficulty}:${seed}` */
  readonly id: string;
  readonly family: string;
  readonly competency: CompetencyId;
  readonly difficulty: Difficulty;
  readonly seed: number;
  readonly prompt: L10n;
  readonly ecg: EcgSource;
  readonly view?: ItemView;
  /** shown after answering (always — right or wrong) */
  readonly explanation: L10n;
  /** marks drawn on the ECG after grading (resolved by the item generator from model truth) */
  readonly reveal?: readonly EcgMark[];
  /** findings this item trains (mastery + spaced review per finding) */
  readonly findings: readonly FindingId[];
  /** optional hint, revealed on request (costs partial credit) */
  readonly hint?: L10n;
}

export type Item =
  | (ItemBase & { readonly kind: 'rate'; readonly key: { readonly truthBpm: number; readonly which: 'ventricular' | 'atrial'; readonly tolerancePct: number; readonly minTolBpm: number } })
  | (ItemBase & { readonly kind: 'measure'; readonly key: { readonly what: 'pr' | 'qrs' | 'qt' | 'rr' | 'p' | 'pp'; readonly lead?: Lead; readonly truthMs: number; readonly toleranceMs: number } })
  | (ItemBase & { readonly kind: 'qtc'; readonly key: { readonly formula: 'bazett' | 'fridericia' | 'framingham' | 'hodges'; readonly qtMs: number; readonly rrMs: number; readonly truthMs: number; readonly toleranceMs: number; readonly given: boolean } })
  | (ItemBase & { readonly kind: 'axis'; readonly key: { readonly mode: 'quadrant' | 'degrees'; readonly truthDeg: number; readonly fullDeg: number; readonly partialDeg: number } })
  | (ItemBase & { readonly kind: 'choice'; readonly key: { readonly options: readonly Option[]; readonly correct: string } })
  | (ItemBase & { readonly kind: 'findings'; readonly key: { readonly options: readonly FindingId[]; readonly correct: readonly FindingId[] } })
  | (ItemBase & { readonly kind: 'locate'; readonly key: { readonly targets: readonly { readonly lead: Lead | 'any'; readonly t0: number; readonly t1: number }[]; readonly need: 'one' | 'all' } })
  | (ItemBase & { readonly kind: 'occlusion'; readonly key: { readonly call: 'occlusion' | 'indeterminate' | 'not-occlusion'; readonly territory?: string; readonly mimic?: FindingId; readonly mimicOptions?: readonly FindingId[]; readonly territoryOptions?: readonly Option[] } })
  | (ItemBase & { readonly kind: 'report'; readonly key: ReportKey })
  | (ItemBase & { readonly kind: 'compare'; readonly ecg2: EcgSource; readonly key: { readonly correct: 'left' | 'right' } });

export interface ReportKey {
  readonly rateBpm: number | null;
  readonly rhythm: FindingId | null;
  readonly regular: boolean | null;
  readonly prMs: number | null;
  readonly qrsMs: number | null;
  readonly qtcMs: number | null;
  readonly axisDeg: number | null;
  /** findings a complete report must list (excluding the rhythm) */
  readonly findings: readonly FindingId[];
  /** findings that are acceptable but not required (e.g. derived descriptive ones) */
  readonly optional?: readonly FindingId[];
}

// ── answers & grades ───────────────────────────────────────────────────────────────────────────────────────────────
export type Answer =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'choice'; readonly id: string }
  | { readonly kind: 'multi'; readonly ids: readonly string[] }
  | { readonly kind: 'picks'; readonly picks: readonly { readonly lead: Lead; readonly tMs: number }[] }
  | { readonly kind: 'occlusion'; readonly call: 'occlusion' | 'indeterminate' | 'not-occlusion'; readonly territory?: string; readonly mimic?: FindingId }
  | { readonly kind: 'report'; readonly report: ReportAnswer };

export interface ReportAnswer {
  readonly rateBpm: number | null;
  readonly rhythm: FindingId | null;
  readonly regular: boolean | null;
  readonly prMs: number | null;
  readonly qrsMs: number | null;
  readonly qtcMs: number | null;
  readonly axisDeg: number | null;
  readonly findings: readonly FindingId[];
  readonly notes?: string;
}

export interface Grade {
  /** 0..1 */
  readonly score: number;
  readonly verdict: 'correct' | 'partial' | 'incorrect';
  /** short, specific feedback on THIS answer (plus the item's explanation is shown) */
  readonly feedback: L10n;
  /** per-field breakdown for report items */
  readonly fields?: readonly { readonly field: string; readonly ok: boolean; readonly expected: string; readonly given: string }[];
  /** occlusion items: a missed occlusion (most serious error) */
  readonly missedCritical?: boolean;
  readonly usedHint?: boolean;
  /** learner's confidence 1 (guess) … 3 (sure), when collected */
  readonly confidence?: 1 | 2 | 3;
}

// ── drill families ─────────────────────────────────────────────────────────────────────────────────────────────────
export interface DrillFamily {
  readonly id: string;
  readonly stage: StageId;
  readonly competency: CompetencyId;
  readonly kind: ItemKind;
  readonly title: L10n;
  readonly description: L10n;
  readonly difficulties: readonly Difficulty[];
  /** findings this family can produce (atlas "practise this" links, spaced review) */
  readonly findings: readonly FindingId[];
}

// ── progress store (learner state, owned by src/practice; lessons write through it) ────────────────────────────────
export interface Attempt {
  readonly itemId: string;
  readonly family: string;
  readonly competency: CompetencyId;
  readonly findings: readonly FindingId[];
  readonly score: number;
  readonly at: number; // epoch ms
  readonly confidence?: 1 | 2 | 3;
  readonly missedCritical?: boolean;
}

export interface LessonProgress {
  readonly step: number;
  readonly done: boolean;
  readonly at: number;
}

export interface Mastery {
  /** exponentially weighted accuracy 0..1 (null = no attempts) */
  readonly accuracy: number | null;
  readonly attempts: number;
  /** rolling accuracy over the last 30 attempts and whether the curve has plateaued */
  readonly rolling30: number | null;
  readonly plateau: boolean;
}

export interface ReviewCard {
  readonly key: string; // `${family}` or `finding:${id}`
  readonly box: 1 | 2 | 3 | 4 | 5; // Leitner box: 1, 2, 4, 8, 16 days
  readonly due: number; // epoch ms
}

// ── components and functions exported by src/practice/index.tsx (exact names) ─────────────────────────────────────
//   ItemPlayer(props: ItemPlayerProps)              one item: ECG + prompt + answer UI + Feedback + explanation/reveal
//   DrillRunner(props: DrillRunnerProps)            embedded mini-drill (lessons) and the drill page body
//   ReportForm(props: ReportFormProps)              structured report (real cases slot, report items, exam)
//   PracticePage, DrillPage({ id }), ExamPage, ProgressPage
//   ContinueLessonHint? — no: the course owns its home card; practice provides ReviewsDueCard for homeSlots.reviewsDue
//   ReviewsDueCard, ProgressDataControls (settings slot)
//   families(): readonly DrillFamily[];  getFamily(id): DrillFamily | undefined
//   generateItem(familyId: string, seed: number, difficulty?: Difficulty, opts?: GenerateOptions): Promise<Item>
//                                                   opts.topic (optional, added 2026-10-29): strict topic for families that
//                                                   take one (metabolic, systemic, artefacts) — the item id then ends in
//                                                   `:${topic}`; opts.focus: spaced-review preference (falls back)
//   topicsOf(familyId: string): readonly FindingId[]   topics a family accepts today (empty = takes no topic)
//   gradeItem(item: Item, answer: Answer): Grade
//   ecgOf(source: EcgSource): Promise<Ecg>          resolves synthetic (src/synth generate) and real (src/real) ECGs; cached
//   recordAttempt(a: Attempt): void;  masteryOf(c: CompetencyId): Mastery;  masteryOfFinding(id: FindingId): Mastery
//   overallMastery(): number | null;  dueReviews(nowMs: number): readonly ReviewCard[]
//   getLessonProgress(id: string): LessonProgress | null;  setLessonProgress(id: string, p: LessonProgress): void
//   exportProgress(): string;  importProgress(json: string): boolean;  resetProgress(): void
//   progressVersion: ReadonlySignal<number>        bumps on every write (components re-render)

export interface ItemPlayerProps {
  readonly item: Item;
  readonly onGraded?: (grade: Grade, answer: Answer) => void;
  readonly onNext?: () => void;
  /** inline in a lesson (smaller ECG, no page chrome) */
  readonly compact?: boolean;
  readonly collectConfidence?: boolean;
  /** record the attempt in the progress store (default true) */
  readonly record?: boolean;
}

/** Options of generateItem (all optional; omitting them keeps the original three-argument behaviour). */
export interface GenerateOptions {
  /** spaced review of one finding: prefer scenarios / cases showing it (falls back to the whole pool) */
  readonly focus?: FindingId;
  /** strict topic (families with topics: metabolic, systemic, artefacts): the item is about exactly this finding */
  readonly topic?: FindingId;
}

export interface DrillRunnerProps {
  readonly families: readonly string[];
  /** strict topic for every item of the run (families that take one; see topicsOf) */
  readonly topic?: FindingId;
  readonly count: number;
  readonly passScore?: number;
  readonly difficulty?: Difficulty;
  readonly seed?: number;
  readonly compact?: boolean;
  readonly onFinish?: (summary: { readonly score: number; readonly passed: boolean; readonly missedCritical: number }) => void;
}

export interface ReportFormProps {
  readonly ecg: import('../core/ecg').Ecg | null;
  /** what the report is graded against (null = self-assessment only) */
  readonly reference: ReportKey | null;
  readonly onSubmit?: (grade: Grade, answer: ReportAnswer) => void;
  /** lock the form and show the comparison */
  readonly revealed?: boolean;
}

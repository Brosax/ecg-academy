/**
 * The learner's reading of a real case (checklist + notes), its comparison with the cardiologists' labels and the
 * 12SL reference measurements, and its persistence (localStorage, always inside try/catch). Pure apart from storage.
 */
import type { FindingId } from '../core/findings';
import { FINDINGS, isFindingId } from '../core/findings';
import type { CaliperMeasure } from '../ecg/api';
import type { RealReference } from './api';

export const AXIS_CLASSES = ['normal', 'lad', 'rad', 'extreme'] as const;
export type AxisClass = (typeof AXIS_CLASSES)[number];

/** The axis finding of each axis class (src/core/findings.ts). */
export const AXIS_FINDING = { normal: 'axis-normal', lad: 'lad', rad: 'rad', extreme: 'extreme-axis' } as const satisfies Record<
  AxisClass,
  FindingId
>;

/** QTc formulas the learner can report (Fridericia first: preferred over Bazett, which over-corrects at fast rates). */
export const QTC_FORMULAS = ['fridericia', 'bazett'] as const;
export type QtcFormula = (typeof QTC_FORMULAS)[number];

/** Rhythm choices offered in the checklist (finding ids of the rhythm category) — 'other' is free. */
export const RHYTHM_CHOICES = [
  'sinus-rhythm',
  'sinus-bradycardia',
  'sinus-tachycardia',
  'sinus-arrhythmia',
  'ectopic-atrial-rhythm',
  'atrial-fibrillation',
  'atrial-flutter',
  'atrial-tachycardia',
  'svt',
  'junctional-escape-rhythm',
  'accelerated-junctional-rhythm',
  'ventricular-escape-rhythm',
  'paced-rhythm',
] as const satisfies readonly FindingId[];
export type RhythmChoice = (typeof RHYTHM_CHOICES)[number] | 'other' | '';

/** Sinus family: naming the sinus rhythm without the rate/regularity qualifier earns partial credit. */
const SINUS_FAMILY: readonly FindingId[] = ['sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia'];
const SVT_FAMILY: readonly FindingId[] = ['svt', 'atrial-tachycardia', 'avnrt', 'avrt'];

/** What the learner wrote. Numbers are kept as typed (strings) and parsed when compared. */
export interface Reading {
  readonly rate: string;
  readonly rhythm: RhythmChoice;
  readonly axis: AxisClass | '';
  readonly axisDeg: string;
  readonly pr: string;
  readonly qrs: string;
  readonly qt: string;
  readonly qtc: string;
  /** formula of the learner's QTc (it is compared with the 12SL value of the same formula) */
  readonly qtcFormula: QtcFormula;
  readonly findings: readonly FindingId[];
  readonly notes: string;
  readonly revealed: boolean;
}

export const EMPTY_READING: Reading = {
  rate: '',
  rhythm: '',
  axis: '',
  axisDeg: '',
  pr: '',
  qrs: '',
  qt: '',
  qtc: '',
  qtcFormula: 'fridericia',
  findings: [],
  notes: '',
  revealed: false,
};

export function isBlankReading(r: Reading): boolean {
  return (
    !r.rate && !r.rhythm && !r.axis && !r.axisDeg && !r.pr && !r.qrs && !r.qt && !r.qtc && r.findings.length === 0 && !r.notes.trim()
  );
}

/** Parse a typed number ("72", "72.5", "72,5", " −30 "); null when empty or not a number. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.').replace(/[−–]/g, '-');
  if (!t || !/^[+-]?\d+(\.\d+)?$/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

/** Angle in (−180, 180]. */
export function normalizeAxis(deg: number): number {
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** Frontal QRS axis class: normal −30°…+90°, left −30°…−90°, right +90°…+180°, extreme −90°…−180°. */
export function axisClass(deg: number): AxisClass {
  const d = normalizeAxis(deg);
  if (d >= -30 && d <= 90) return 'normal';
  if (d < -30 && d >= -90) return 'lad';
  if (d > 90) return 'rad';
  return 'extreme';
}

/** Signed smallest angular difference a − b in (−180, 180]. */
export function axisDiff(a: number, b: number): number {
  return normalizeAxis(a - b);
}

/** Rate from an RR (or any cycle) duration. */
export function bpmFromMs(ms: number): number {
  return 60000 / ms;
}

/** Bazett QTc (ms) from QT (ms) and heart rate (bpm). */
export function qtcBazett(qtMs: number, hrBpm: number): number {
  const rrS = 60 / hrBpm;
  return qtMs / Math.sqrt(rrS);
}

/** Fridericia QTc (ms) from QT (ms) and heart rate (bpm). */
export function qtcFridericia(qtMs: number, hrBpm: number): number {
  const rrS = 60 / hrBpm;
  return qtMs / Math.cbrt(rrS);
}

export function computeQtc(formula: QtcFormula, qtMs: number, hrBpm: number): number {
  return formula === 'bazett' ? qtcBazett(qtMs, hrBpm) : qtcFridericia(qtMs, hrBpm);
}

// ── comparison ────────────────────────────────────────────────────────────────────────────────────────────────────

export type MeasureKey = 'hr' | 'pr' | 'qrs' | 'qt' | 'qtcB' | 'qtcF' | 'axis' | 'pAxis' | 'tAxis';
export type Verdict = 'ok' | 'off' | 'na';

export interface MeasureRow {
  readonly key: MeasureKey;
  readonly ref: number | null;
  readonly mine: number | null;
  /** mine − ref (angles: smallest signed difference) */
  readonly diff: number | null;
  /** tolerance used for the verdict, in the row's unit */
  readonly tol: number | null;
  readonly unit: 'bpm' | 'ms' | 'deg';
  readonly verdict: Verdict;
}

/** Tolerances (docs/PLAN.md §1): rate ±10 %, PR/QRS ±20 ms, QT/QTc ±30 ms, axis ±20°. */
export const TOLERANCE = { hrFrac: 0.1, pr: 20, qrs: 20, qt: 30, qtc: 30, axis: 20 } as const;

function row(key: MeasureKey, ref: number | null, mine: number | null, tol: number | null, unit: MeasureRow['unit'], angular = false): MeasureRow {
  const diff = ref != null && mine != null ? (angular ? axisDiff(mine, ref) : mine - ref) : null;
  const verdict: Verdict = diff == null || tol == null ? 'na' : Math.abs(diff) <= tol + 1e-9 ? 'ok' : 'off';
  return { key, ref, mine, diff, tol, unit, verdict };
}

/** The 12SL reference rows next to the learner's values; the learner's QTc sits in the row of the formula they chose. */
export function compareMeasurements(r: Reading, ref: RealReference): MeasureRow[] {
  const hr = parseNum(r.rate);
  const axisDeg = parseNum(r.axisDeg);
  const qtc = parseNum(r.qtc);
  const qrsAxis = ref.qrsAxisDeg != null ? normalizeAxis(ref.qrsAxisDeg) : null;
  return [
    row('hr', ref.hrBpm, hr, ref.hrBpm != null ? Math.max(1, Math.round(ref.hrBpm * TOLERANCE.hrFrac)) : null, 'bpm'),
    row('pr', ref.prMs, parseNum(r.pr), TOLERANCE.pr, 'ms'),
    row('qrs', ref.qrsMs, parseNum(r.qrs), TOLERANCE.qrs, 'ms'),
    row('qt', ref.qtMs, parseNum(r.qt), TOLERANCE.qt, 'ms'),
    row('qtcB', ref.qtcBazettMs, r.qtcFormula === 'bazett' ? qtc : null, TOLERANCE.qtc, 'ms'),
    row('qtcF', ref.qtcFridericiaMs, r.qtcFormula === 'fridericia' ? qtc : null, TOLERANCE.qtc, 'ms'),
    row('axis', qrsAxis, axisDeg, TOLERANCE.axis, 'deg', true),
    row('pAxis', ref.pAxisDeg != null ? normalizeAxis(ref.pAxisDeg) : null, null, null, 'deg'),
    row('tAxis', ref.tAxisDeg != null ? normalizeAxis(ref.tAxisDeg) : null, null, null, 'deg'),
  ];
}

export interface ChoiceVerdict<M, T = M> {
  readonly mine: M | null;
  readonly truth: readonly T[];
  readonly verdict: 'ok' | 'partial' | 'wrong' | 'na' | 'unanswered';
}

/** Rhythm findings that name the dominant rhythm (as opposed to ectopy or blocks). */
export const DOMINANT_RHYTHMS: readonly FindingId[] = [
  'sinus-rhythm',
  'sinus-bradycardia',
  'sinus-tachycardia',
  'sinus-arrhythmia',
  'ectopic-atrial-rhythm',
  'atrial-fibrillation',
  'atrial-flutter',
  'atrial-tachycardia',
  'mat',
  'svt',
  'avnrt',
  'avrt',
  'junctional-escape-rhythm',
  'accelerated-junctional-rhythm',
  'ventricular-escape-rhythm',
  'aivr',
  'vt-monomorphic',
  'paced-rhythm',
];

export function compareRhythm(mine: RhythmChoice, caseFindings: readonly FindingId[]): ChoiceVerdict<RhythmChoice, FindingId> {
  const truth = caseFindings.filter((f) => DOMINANT_RHYTHMS.includes(f));
  if (!mine) return { mine: null, truth, verdict: 'unanswered' };
  if (truth.length === 0) return { mine, truth, verdict: 'na' };
  if (mine === 'other') {
    // right only when the labelled rhythm is not among the offered choices
    const offered = truth.some((t) => (RHYTHM_CHOICES as readonly FindingId[]).includes(t));
    return { mine, truth, verdict: offered ? 'wrong' : 'ok' };
  }
  if (truth.includes(mine)) return { mine, truth, verdict: 'ok' };
  const inFamily = (fam: readonly FindingId[]) => fam.includes(mine) && truth.some((t) => fam.includes(t));
  if (inFamily(SINUS_FAMILY) || inFamily(SVT_FAMILY)) return { mine, truth, verdict: 'partial' };
  return { mine, truth, verdict: 'wrong' };
}

/**
 * The learner's axis class against the class of the 12SL QRS axis. When no class was chosen but degrees were typed,
 * the class of the typed axis is graded.
 */
export function compareAxis(mine: AxisClass | '', refDeg: number | null, typedDeg: number | null = null): ChoiceVerdict<AxisClass> {
  const truth = refDeg != null ? [axisClass(refDeg)] : [];
  if (!mine && typedDeg != null) mine = axisClass(typedDeg);
  if (!mine) return { mine: null, truth, verdict: 'unanswered' };
  if (truth.length === 0) return { mine, truth, verdict: 'na' };
  return { mine, truth, verdict: truth[0] === mine ? 'ok' : 'wrong' };
}

export interface FindingsComparison {
  readonly hit: readonly FindingId[];
  readonly missed: readonly FindingId[];
  /** the learner's findings the labels neither state nor allow */
  readonly extra: readonly FindingId[];
  /** the learner's findings the labels allow without stating them (scp.ts rule 11, e.g. an MI of undetermined stage) */
  readonly compatible: readonly FindingId[];
}

/**
 * A learner finding that contains another one: reporting it counts as reporting the other (LVH with strain is LVH; in
 * this taxonomy an old MI is diagnosed by its pathological Q waves).
 */
export const IMPLIES: Readonly<Partial<Record<FindingId, readonly FindingId[]>>> = {
  'lvh-strain': ['lvh'],
  'old-mi-anterior': ['pathological-q'],
  'old-mi-inferior': ['pathological-q'],
  'old-mi-lateral': ['pathological-q'],
};

/**
 * Learner findings (+ the chosen rhythm) against the case's mapped findings. The cardiologists' labels say nothing about
 * the frontal axis (PTB-XL's heart_axis is not mapped, scp.ts rule 10), so an axis finding is judged against the class
 * of the 12SL QRS axis instead: found when it agrees, "not in the labels" when it does not, never "missed".
 * `allowed` (scp.ts compatibleFindings) lists what the labels are consistent with without stating it; a learner finding
 * in it is `compatible`, not `extra`. A finding implied by one the learner reported (IMPLIES) counts as found.
 */
export function compareFindings(
  r: Reading,
  caseFindings: readonly FindingId[],
  refQrsAxisDeg: number | null = null,
  allowed: readonly FindingId[] = [],
): FindingsComparison {
  const mine = new Set<FindingId>(r.findings);
  if (r.rhythm && r.rhythm !== 'other') mine.add(r.rhythm);
  const covered = new Set<FindingId>(mine);
  for (const f of mine) for (const g of IMPLIES[f] ?? []) covered.add(g);
  const truth = new Set(caseFindings);
  const ok = new Set(allowed);
  const refAxis: FindingId | null = refQrsAxisDeg != null ? AXIS_FINDING[axisClass(refQrsAxisDeg)] : null;
  const axisAgrees = (f: FindingId) => !truth.has(f) && FINDINGS[f].cat === 'axis' && f === refAxis;
  const notTruth = [...mine].filter((f) => !truth.has(f) && !axisAgrees(f));
  return {
    hit: [...caseFindings.filter((f) => covered.has(f)), ...[...mine].filter(axisAgrees)],
    missed: caseFindings.filter((f) => !covered.has(f)),
    extra: notTruth.filter((f) => !ok.has(f)),
    compatible: notTruth.filter((f) => ok.has(f)),
  };
}

// ── calipers ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** What the learner's last caliper placement measured: a time interval (with its rate) or an amplitude. */
export type CaliperReading =
  | { readonly kind: 'time'; readonly ms: number; readonly bpm: number }
  | { readonly kind: 'amplitude'; readonly mv: number };

/**
 * The viewer reports mv0 / mv1 only in amplitude mode; its time lines are then not what the learner is measuring, so an
 * amplitude measure never feeds the interval fields.
 */
export function caliperReading(m: CaliperMeasure | null): CaliperReading | null {
  if (!m) return null;
  if (m.mv0 != null && m.mv1 != null) {
    const mv = Math.abs(m.mv1 - m.mv0);
    return Number.isFinite(mv) ? { kind: 'amplitude', mv } : null;
  }
  return Number.isFinite(m.dtMs) && m.dtMs > 0 ? { kind: 'time', ms: m.dtMs, bpm: bpmFromMs(m.dtMs) } : null;
}

// ── persistence ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const READING_PREFIX = 'ecg-academy:real:reading:v1:';
const READ_SET_KEY = 'ecg-academy:real:read:v1';

function defaultStore(): KeyValueStore | null {
  try {
    return (globalThis.localStorage as KeyValueStore | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Validate untrusted stored JSON into a Reading. */
export function sanitizeReading(x: unknown): Reading {
  if (!x || typeof x !== 'object') return EMPTY_READING;
  const o = x as Record<string, unknown>;
  const str = (k: string, max = 32) => (typeof o[k] === 'string' ? (o[k] as string).slice(0, max) : '');
  const rhythm = str('rhythm', 64);
  const axis = str('axis');
  const formula = str('qtcFormula');
  return {
    rate: str('rate'),
    rhythm: rhythm === 'other' || (RHYTHM_CHOICES as readonly string[]).includes(rhythm) ? (rhythm as RhythmChoice) : '',
    axis: (AXIS_CLASSES as readonly string[]).includes(axis) ? (axis as AxisClass) : '',
    axisDeg: str('axisDeg'),
    pr: str('pr'),
    qrs: str('qrs'),
    qt: str('qt'),
    qtc: str('qtc'),
    qtcFormula: (QTC_FORMULAS as readonly string[]).includes(formula) ? (formula as QtcFormula) : EMPTY_READING.qtcFormula,
    findings: Array.isArray(o.findings) ? [...new Set((o.findings as unknown[]).filter((f): f is FindingId => typeof f === 'string' && isFindingId(f)))] : [],
    notes: str('notes', 20000),
    revealed: o.revealed === true,
  };
}

export function loadReading(id: number, store: KeyValueStore | null = defaultStore()): Reading {
  try {
    const raw = store?.getItem(READING_PREFIX + id);
    return raw ? sanitizeReading(JSON.parse(raw)) : EMPTY_READING;
  } catch {
    return EMPTY_READING;
  }
}

/** Save (or remove, when blank and not revealed). Returns false when storage is unavailable. */
export function saveReading(id: number, r: Reading, store: KeyValueStore | null = defaultStore()): boolean {
  try {
    if (!store) return false;
    if (isBlankReading(r) && !r.revealed) store.removeItem(READING_PREFIX + id);
    else store.setItem(READING_PREFIX + id, JSON.stringify(r));
    return true;
  } catch {
    return false;
  }
}

export function loadReadSet(store: KeyValueStore | null = defaultStore()): Set<number> {
  try {
    const raw = store?.getItem(READ_SET_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is number => Number.isInteger(x)) : []);
  } catch {
    return new Set();
  }
}

export function saveReadSet(ids: ReadonlySet<number>, store: KeyValueStore | null = defaultStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(READ_SET_KEY, JSON.stringify([...ids].sort((a, b) => a - b)));
    return true;
  } catch {
    return false;
  }
}

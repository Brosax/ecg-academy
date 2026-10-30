/**
 * Reading answer keys from the model truth (EcgTruth) and the clinical categories graders share: axis categories,
 * sinus rhythms, occlusion calls and territories, triage level. Pure.
 *
 * Axis categories (adults; AHA/ACCF/HRS 2009 Part III, Surawicz B et al., Circulation 2009;119:e235 — see
 * docs/curriculum/criteria.md `qrs-axis-adult`): normal −30°…+90°; left axis deviation −30°…−90° (exclusive of −30°);
 * right axis deviation +90°…+180° (exclusive of +90°); extreme ("north-west") −90°…−180° (exclusive of both ends).
 */
import type { BeatMarks, EcgTruth } from '../../core/ecg';
import { FINDINGS, type FindingId } from '../../core/findings';

export const AXIS_CATEGORIES = ['axis-normal', 'lad', 'rad', 'extreme-axis'] as const satisfies readonly FindingId[];
export type AxisCategory = (typeof AXIS_CATEGORIES)[number];

/** Normalize an angle to (−180, 180]. */
export function normDeg(d: number): number {
  let x = d % 360;
  if (x <= -180) x += 360;
  if (x > 180) x -= 360;
  return x;
}

/** Smallest absolute angular difference (0…180). */
export function angDiff(a: number, b: number): number {
  return Math.abs(normDeg(a - b));
}

export function axisCategory(deg: number): AxisCategory {
  const d = normDeg(deg);
  if (d >= -30 && d <= 90) return 'axis-normal';
  if (d >= -90 && d < -30) return 'lad';
  if (d > 90 && d <= 180) return 'rad';
  return 'extreme-axis';
}

/** Distance (°) from an angle to the nearest category boundary (−30, +90, ±180, −90). */
export function axisBoundaryDistance(deg: number): number {
  return Math.min(...[-30, 90, 180, -90].map((b) => angDiff(deg, b)));
}

export const SINUS_RHYTHMS = ['sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia'] as const satisfies readonly FindingId[];

export function isSinus(rhythm: FindingId): boolean {
  return (SINUS_RHYTHMS as readonly string[]).includes(rhythm);
}

/** Ventricular beats that represent the dominant (conducted, non-aberrant) complex. */
export function isDominant(b: BeatMarks): boolean {
  return !b.aberrant && (b.kind === 'sinus' || b.kind === 'atrial' || b.kind === 'junctional' || b.kind === 'paced-atrial');
}

/**
 * Index of the beat closest to the middle of the record matching `pred` (default: dominant beats with a following
 * beat), or -1. Middle beats keep brackets away from the paper edges.
 */
export function middleBeat(truth: EcgTruth, durationMs: number, pred: (b: BeatMarks, i: number) => boolean = (b, i) => isDominant(b) && i < truth.beats.length - 1): number {
  const mid = durationMs / 2;
  let best = -1;
  let bestD = Infinity;
  truth.beats.forEach((b, i) => {
    if (!pred(b, i)) return;
    const d = Math.abs(b.qrsOn - mid);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** Mean RR (ms) from the beats, falling back to 60000 / hrBpm. */
export function meanRr(truth: EcgTruth): number {
  const b = truth.beats;
  if (b.length >= 2) return (b[b.length - 1].qrsOn - b[0].qrsOn) / (b.length - 1);
  return truth.hrBpm > 0 ? 60000 / truth.hrBpm : 1000;
}

/** Window of the T wave of a beat (ms): from the J point region to T end. */
export function tWindow(b: BeatMarks): readonly [number, number] {
  const peak = b.tPeak ?? (b.j + b.tOff) / 2;
  const t0 = Math.max(b.j + 20, peak - (b.tOff - peak) * 1.2);
  return [t0, b.tOff + 10];
}

// ── occlusion (stage I: "for every chest-pain ECG commit to occlusion / indeterminate / not occlusion") ─────────────
export type OcclusionCall = 'occlusion' | 'indeterminate' | 'not-occlusion';

/**
 * Patterns that call for emergent reperfusion: STEMI and STEMI equivalents, and MI read through LBBB / pacing with
 * positive Sgarbossa / Smith-modified Sgarbossa criteria.
 */
export const OCCLUSION_FINDINGS = [
  'stemi-anterior',
  'stemi-anteroseptal',
  'stemi-anterolateral',
  'stemi-inferior',
  'stemi-lateral',
  'stemi-high-lateral',
  'stemi-posterior',
  'rv-infarction',
  'de-winter',
  'sgarbossa-positive',
] as const satisfies readonly FindingId[];

/**
 * "Probable occlusion" without STEMI criteria: hyperacute T waves alone. On the three-way call this is
 * `indeterminate`, with the step that resolves it (repeat the ECG in 15–30 min, extra leads, old tracing; immediate
 * angiography if the pain persists — 2023 ESC ACS guideline, very-high-risk NSTE-ACS), as lesson i7 teaches.
 */
export const PROBABLE_OCCLUSION_FINDINGS = ['hyperacute-t'] as const satisfies readonly FindingId[];

/**
 * Confounders that invalidate the STEMI millimetre thresholds: LBBB (including rate-dependent LBBB) and ventricular
 * pacing. With ongoing ischaemic symptoms they are never "not an occlusion" (2023 ESC ACS guideline: BBB or paced
 * rhythm with ongoing symptoms → manage as possible occlusion). Sgarbossa / Smith-modified criteria met
 * (`sgarbossa-positive`) → occlusion likely; not met → indeterminate, with the next step.
 */
export const OCCLUSION_CONFOUNDERS = ['lbbb', 'paced-rhythm'] as const satisfies readonly FindingId[];

/** Ischaemia that is not an occlusion pattern on this tracing: repeat the ECG, add leads, serial troponin. */
export const INDETERMINATE_FINDINGS = ['st-depression-ischemic', 't-inversion-ischemic'] as const satisfies readonly FindingId[];

/** ST-elevation / T-wave mimics a learner must name (not occlusion). Takotsubo is excluded on purpose: it cannot be
 *  told apart from an anterior occlusion on the ECG and is managed as one until angiography. LBBB is a confounder, not
 *  a mimic (OCCLUSION_CONFOUNDERS). */
export const OCCLUSION_MIMICS = [
  'early-repolarization',
  'pericarditis',
  'lv-aneurysm',
  'lvh-strain',
  'brugada-type1',
  'hyperkalemia',
  'athlete-changes',
  'juvenile-t',
] as const satisfies readonly FindingId[];

export const TERRITORIES = ['anterior', 'inferior', 'lateral', 'posterior'] as const;
export type TerritoryId = (typeof TERRITORIES)[number];

/** Wall of an occlusion finding (anteroseptal/anterolateral/de Winter → anterior; RV → inferior). */
export const TERRITORY_OF: Readonly<Partial<Record<FindingId, TerritoryId>>> = {
  'stemi-anterior': 'anterior',
  'stemi-anteroseptal': 'anterior',
  'stemi-anterolateral': 'anterior',
  'de-winter': 'anterior',
  'stemi-inferior': 'inferior',
  'rv-infarction': 'inferior',
  'stemi-lateral': 'lateral',
  'stemi-high-lateral': 'lateral',
  'stemi-posterior': 'posterior',
};

/** Why a call was made (explanations pick their wording from it). */
export type OcclusionReason = 'stemi' | 'sgarbossa' | 'confounder' | 'probable' | 'ischemia' | 'mimic' | 'none';

const inList =
  (xs: readonly string[]) =>
  (f: FindingId): boolean =>
    xs.includes(f);

/**
 * The call a set of truth findings demands. Precedence: occlusion (Sgarbossa-positive first, then the first STEMI /
 * equivalent in the findings' own — declared — order) › confounder (LBBB / pacing, Sgarbossa negative) › probable
 * occlusion (hyperacute T alone) › regional ischaemia › named mimic. The territory is the wall of the first finding
 * that has one (RV infarction implies inferior; Sgarbossa takes the wall of its co-declared STEMI finding).
 */
export function occlusionCallOf(findings: readonly FindingId[]): {
  call: OcclusionCall;
  target: FindingId | null;
  territory: TerritoryId | null;
  mimic: FindingId | null;
  reason: OcclusionReason;
} {
  const occ: FindingId | null = findings.includes('sgarbossa-positive') ? 'sgarbossa-positive' : (findings.find(inList(OCCLUSION_FINDINGS)) ?? null);
  if (occ) {
    const wall = findings.map((f) => TERRITORY_OF[f]).find((t): t is TerritoryId => !!t) ?? null;
    return { call: 'occlusion', target: occ, territory: wall, mimic: null, reason: occ === 'sgarbossa-positive' ? 'sgarbossa' : 'stemi' };
  }
  const conf = findings.find(inList(OCCLUSION_CONFOUNDERS)) ?? null;
  if (conf) return { call: 'indeterminate', target: conf, territory: null, mimic: null, reason: 'confounder' };
  const prob = findings.find(inList(PROBABLE_OCCLUSION_FINDINGS)) ?? null;
  if (prob) return { call: 'indeterminate', target: prob, territory: null, mimic: null, reason: 'probable' };
  const ind = findings.find(inList(INDETERMINATE_FINDINGS)) ?? null;
  if (ind) return { call: 'indeterminate', target: ind, territory: null, mimic: null, reason: 'ischemia' };
  const mimic = findings.find(inList(OCCLUSION_MIMICS)) ?? null;
  return { call: 'not-occlusion', target: mimic, territory: null, mimic, reason: mimic ? 'mimic' : 'none' };
}

// ── triage (x3: 10-second emergency triage) ─────────────────────────────────────────────────────────────────────
export type Triage = 'critical' | 'major' | 'routine';

/**
 * Urgency that differs from a finding's "can't-miss" severity. A Brugada type 1 pattern must never be missed (it stays
 * `critical` for mastery and the 100 % tracker), but on its own — no syncope, arrhythmia or fever — it calls for a
 * same-day expert review, not a resuscitation call (Zeppenfeld K et al., 2022 ESC VA/SCD guidelines, Eur Heart J
 * 2022;43:3997; Wilde AAM et al., 2022 EHRA/HRS/APHRS/LAHRS inherited arrhythmia consensus, Europace 2022;24:1307 —
 * risk is driven by symptoms; fever and sodium-channel blockers are treated or stopped promptly).
 * A prolonged QT is likewise a same-day problem unless QTc ≥ 500 ms or torsades is present (LONG_QT_ACT_NOW_MS;
 * torsades is critical on its own).
 */
export const TRIAGE_OVERRIDE: Readonly<Partial<Record<FindingId, Triage>>> = { 'brugada-type1': 'major', 'long-qt': 'major' };

/** Combinations more urgent than any of their parts: pre-excited AF (AF conducted over an accessory pathway can
 *  degenerate into VF — 2019 ESC SVT guideline; criteria.md `preexcited-af`). */
export const TRIAGE_COMBINATIONS: readonly { readonly all: readonly FindingId[]; readonly level: Triage }[] = [{ all: ['atrial-fibrillation', 'wpw'], level: 'critical' }];

/** QTc at or above which a long QT is an act-now finding (high torsades risk; criteria.md `qtc-bazett`, AHA 2009 Part IV). */
export const LONG_QT_ACT_NOW_MS = 500;

export interface TriageContext {
  /** the QTc of the tracing (ms); a long QT is `critical` only when it is ≥ LONG_QT_ACT_NOW_MS */
  readonly qtcMs?: number;
}

const TRIAGE_RANK: Readonly<Record<Triage, number>> = { routine: 0, major: 1, critical: 2 };

export function triageOf(findings: readonly FindingId[], ctx: TriageContext = {}): Triage {
  let level: Triage = 'routine';
  const raise = (t: Triage) => {
    if (TRIAGE_RANK[t] > TRIAGE_RANK[level]) level = t;
  };
  for (const c of TRIAGE_COMBINATIONS) if (c.all.every((f) => findings.includes(f))) raise(c.level);
  for (const f of findings) {
    const s = TRIAGE_OVERRIDE[f] ?? FINDINGS[f].severity;
    if (f === 'long-qt' && ctx.qtcMs !== undefined && ctx.qtcMs >= LONG_QT_ACT_NOW_MS) raise('critical');
    else if (s === 'critical' || s === 'major') raise(s);
  }
  return level;
}

/** The QTc used for triage: Fridericia above 90/min (Bazett over-corrects at fast rates), Bazett otherwise. */
export function triageQtc(truth: Pick<EcgTruth, 'hrBpm' | 'qtcBazettMs' | 'qtcFridericiaMs'>): { readonly ms: number; readonly formula: 'bazett' | 'fridericia' } {
  return truth.hrBpm > 90 ? { ms: truth.qtcFridericiaMs, formula: 'fridericia' } : { ms: truth.qtcBazettMs, formula: 'bazett' };
}

/** Pre-excited AF: AF conducted over an accessory pathway. */
export function isPreexcitedAf(findings: readonly FindingId[]): boolean {
  return findings.includes('atrial-fibrillation') && findings.includes('wpw');
}

/** Highest-severity finding of a set (for "the key finding was …" feedback), or null. */
export function keyFinding(findings: readonly FindingId[]): FindingId | null {
  const order = { critical: 3, major: 2, minor: 1, normal: 0 } as const;
  let best: FindingId | null = null;
  for (const f of findings) if (!best || order[FINDINGS[f].severity] > order[FINDINGS[best].severity]) best = f;
  return best;
}

/** Every finding of a set is a normal finding or a normal variant. */
export function allNormal(findings: readonly FindingId[]): boolean {
  return findings.every((f) => FINDINGS[f].severity === 'normal');
}

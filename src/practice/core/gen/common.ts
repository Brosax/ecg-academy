/**
 * Shared machinery of the item generators: family specs, the generation context (seeded rng, difficulty, optional
 * focus finding for spaced review), scenario pools resolved from the synth catalogue AT CALL TIME (so families grow
 * with the catalogue), seeded draws of scenario + dials with bounded, deterministic retries, and the item base.
 *
 * Determinism: everything random comes from `createRng(`${family}:${difficulty}:${seed}`)` and its forks; a draw that
 * fails its acceptance test is retried with the next fork, never with fresh entropy.
 */
import type { BeatMarks, Ecg, EcgTruth } from '../../../core/ecg';
import type { FindingId } from '../../../core/findings';
import type { L10n } from '../../../core/l10n';
import type { ExtraLead, Lead, StdLead } from '../../../core/leads';
import { sampleAt } from '../../../core/ecg';
import type { Rng } from '../../../core/rng';
import type { EcgMark, MarkColor } from '../../../ecg/api';
import type { RealCaseMeta } from '../../../real/index';
import type { DialId, Difficulty, RecordingSpec, ScenarioDef, ScenarioGroup, SynthRequest, SynthResult } from '../../../synth/index';
import type { CompetencyId, EcgSource, Item, ItemKind, StageId } from '../../api';
import type { ItemViewX } from '../extras';
import { ports, synthOf } from '../ports';

export type PoolSel = { readonly group: ScenarioGroup } | { readonly finding: FindingId } | { readonly id: string };

export interface GenCtx {
  readonly spec: FamilySpec;
  readonly seed: number;
  readonly difficulty: Difficulty;
  readonly rng: Rng;
  /** spaced review of one finding: restrict the pool to scenarios / cases showing it when possible */
  readonly focus?: FindingId;
  /**
   * strict topic filter (families with `topics`): the item is about this finding or generation fails — unlike
   * `focus`, it never falls back to the whole pool
   */
  readonly topic?: FindingId;
}

export interface FamilySpec {
  readonly id: string;
  readonly stage: StageId;
  readonly competency: CompetencyId;
  readonly kind: ItemKind;
  readonly title: L10n;
  readonly description: L10n;
  readonly difficulties: readonly Difficulty[];
  readonly source: 'synth' | 'real';
  /** synthetic scenario pool (resolved when an item is generated) */
  readonly pool?: readonly PoolSel[];
  /**
   * findings that disqualify a scenario (its base findings) or a variant (its own findings) from this family — e.g.
   * pre-excited or paced tracings in a narrow-complex family, LBBB tracings in a territory family
   */
  readonly exclude?: readonly FindingId[];
  /** the family accepts a strict topic filter (`generateItem(…, { topic })`): one of its `findings` */
  readonly topics?: boolean;
  /** findings this family trains, known statically (choice options); pool findings are added for 'pool' families */
  readonly findings: readonly FindingId[];
  readonly findingsFromPool?: boolean;
  /**
   * single-choice families over findings: the option universe. The family is offered only when the pool declares at
   * least two of them (one answer that never changes would train a wrong prior, not recognition).
   */
  readonly needs?: readonly FindingId[];
  /** custom availability test (contrast pairs); default: the pool (and `needs`) resolve against the catalogue */
  readonly available?: () => boolean;
  /** the real-ECG family that continues this one's difficulty ladder */
  readonly realTwin?: string;
  readonly make: (ctx: GenCtx) => Promise<Item>;
}

export const ALL_DIFFICULTIES = ['classic', 'subtle', 'noisy', 'borderline'] as const satisfies readonly Difficulty[];
/** pattern-recognition families: borderline draws teach nothing a threshold item does not */
export const PATTERN_DIFFICULTIES = ['classic', 'subtle', 'noisy'] as const satisfies readonly Difficulty[];
export const REAL_DIFFICULTIES = ['classic'] as const satisfies readonly Difficulty[];

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly family: string,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

// ── pools ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Scenarios matching any selector, de-duplicated and sorted by id (stable for a given catalogue). */
export function resolvePool(sels: readonly PoolSel[]): ScenarioDef[] {
  const { synth } = ports();
  const byId = new Map<string, ScenarioDef>();
  for (const s of sels) {
    let xs: readonly ScenarioDef[];
    if ('id' in s) xs = synth.scenarios().filter((d) => d.id === s.id);
    else if ('group' in s) xs = synth.scenarios({ group: s.group });
    else xs = synth.scenarios({ finding: s.finding });
    for (const d of xs) byId.set(d.id, d);
  }
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The family's pool: its selectors resolved now, minus scenarios whose base findings hit `exclude`. */
export function specPool(spec: Pick<FamilySpec, 'pool' | 'exclude'>): ScenarioDef[] {
  const pool = resolvePool(spec.pool ?? []);
  const ex = spec.exclude ?? [];
  return ex.length ? pool.filter((s) => !s.findings.some((f) => ex.includes(f))) : pool;
}

/** Variant filter of a family: a variant whose own findings hit `exclude` is never drawn. */
export function variantAllowed(spec: Pick<FamilySpec, 'exclude'>): (findings: readonly FindingId[] | undefined) => boolean {
  const ex = spec.exclude ?? [];
  return (fs) => !fs || !fs.some((f) => ex.includes(f));
}

/** Findings a scenario declares, including its variants'. */
export function scenarioFindings(s: ScenarioDef): FindingId[] {
  const out = new Set<FindingId>(s.findings);
  for (const v of Object.values(s.variants ?? {})) for (const f of v.findings ?? []) out.add(f);
  return [...out];
}

export function poolWith(pool: readonly ScenarioDef[], f: FindingId): ScenarioDef[] {
  return pool.filter((s) => scenarioFindings(s).includes(f));
}

/** Keep the focus finding's scenarios when the pool has any. */
export function focusPool(ctx: GenCtx, pool: readonly ScenarioDef[]): readonly ScenarioDef[] {
  if (!ctx.focus) return pool;
  const xs = poolWith(pool, ctx.focus);
  return xs.length ? xs : pool;
}

export function requirePool(ctx: GenCtx, pool: readonly ScenarioDef[]): readonly ScenarioDef[] {
  if (pool.length === 0) throw new GenerationError(`no synthetic scenario available for family "${ctx.spec.id}"`, ctx.spec.id);
  return pool;
}

// ── draws ────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface SynthDraw {
  readonly scenario: ScenarioDef;
  readonly req: SynthRequest;
  readonly result: SynthResult;
  readonly ecg: Ecg;
  readonly truth: EcgTruth;
  readonly source: EcgSource;
  /** the fork used for this draw (item-level choices after the draw use it, so retries stay deterministic) */
  readonly rng: Rng;
}

export interface DrawOptions {
  /** accept or reject a realised tracing (e.g. axis far from a category boundary) */
  readonly accept?: (d: SynthDraw) => boolean;
  /** choose the scenario for this attempt (default: uniform over the pool) */
  readonly choose?: (rng: Rng, pool: readonly ScenarioDef[]) => ScenarioDef;
  /** pick a variant (default: none) */
  readonly variant?: (rng: Rng, s: ScenarioDef) => string | undefined;
  /** adjust the drawn dials of a scenario (e.g. 2:1 flutter for a tachycardia family); the engine clamps to its ranges */
  readonly dials?: (s: ScenarioDef, drawn: Readonly<Partial<Record<DialId, number>>>) => Readonly<Partial<Record<DialId, number>>>;
  readonly recording?: RecordingSpec;
  readonly extraLeads?: readonly ExtraLead[];
  readonly durationS?: number;
  readonly tries?: number;
}

export async function drawSynth(ctx: GenCtx, pool: readonly ScenarioDef[], opts: DrawOptions = {}): Promise<SynthDraw> {
  requirePool(ctx, pool);
  const tries = opts.tries ?? 8;
  let lastErr: unknown = null;
  let fallback: SynthDraw | null = null;
  for (let k = 0; k < tries; k++) {
    const r = ctx.rng.fork(`draw:${k}`);
    const scenario = opts.choose ? opts.choose(r, pool) : r.pick(pool);
    const variant = opts.variant?.(r, scenario);
    const drawn = ports().synth.drawDials(scenario.id, r.fork('dials'), ctx.difficulty);
    const dials = opts.dials ? opts.dials(scenario, drawn) : drawn;
    const req: SynthRequest = {
      scenario: scenario.id,
      ...(variant ? { variant } : {}),
      seed: r.int(1, 2_147_483_646),
      dials,
      difficulty: ctx.difficulty,
      ...(opts.recording ? { recording: opts.recording } : {}),
      ...(opts.extraLeads ? { extraLeads: opts.extraLeads } : {}),
      ...(opts.durationS ? { durationS: opts.durationS } : {}),
    };
    let result: SynthResult;
    try {
      result = await synthOf(req);
    } catch (e) {
      lastErr = e;
      continue;
    }
    const truth = result.ecg.truth;
    if (!truth) continue;
    const d: SynthDraw = { scenario, req, result, ecg: result.ecg, truth, source: { kind: 'synth', req }, rng: r.fork('item') };
    if (!opts.accept || opts.accept(d)) return d;
    fallback = d;
  }
  if (lastErr && !fallback) throw lastErr instanceof Error ? lastErr : new GenerationError(String(lastErr), ctx.spec.id);
  throw new GenerationError(`family "${ctx.spec.id}": no acceptable tracing after ${tries} draws`, ctx.spec.id);
}

/** Pick an equal share of scenario classes first, then a scenario inside the class (balanced two-way / n-way items). */
export function chooseByClass<T extends string>(classOf: (s: ScenarioDef) => T | null, classes: readonly T[]) {
  return (rng: Rng, pool: readonly ScenarioDef[]): ScenarioDef => {
    const avail = classes.filter((c) => pool.some((s) => classOf(s) === c));
    if (avail.length === 0) return rng.pick(pool);
    const c = rng.pick(avail);
    return rng.pick(pool.filter((s) => classOf(s) === c));
  };
}

/** Use a declared variant some of the time (natural variety inside a scenario). */
export function someVariant(p = 0.4, keep?: (findings: readonly FindingId[] | undefined) => boolean) {
  return (rng: Rng, s: ScenarioDef): string | undefined => {
    const ids = Object.entries(s.variants ?? {})
      .filter(([, v]) => !keep || keep(v.findings))
      .map(([id]) => id)
      .sort();
    if (ids.length === 0 || rng.next() >= p) return undefined;
    return rng.pick(ids);
  };
}

// ── real cases ───────────────────────────────────────────────────────────────────────────────────────────────────
export function realCases(): readonly RealCaseMeta[] {
  return ports().real.cases();
}

export function pickCase(ctx: GenCtx, cases: readonly RealCaseMeta[], salt = 'case'): RealCaseMeta {
  if (cases.length === 0) throw new GenerationError(`no real case available for family "${ctx.spec.id}"`, ctx.spec.id);
  const sorted = [...cases].sort((a, b) => a.id - b.id);
  const focused = ctx.focus ? sorted.filter((c) => c.findings.includes(ctx.focus as FindingId)) : [];
  return ctx.rng.fork(salt).pick(focused.length ? focused : sorted);
}

// ── item base ────────────────────────────────────────────────────────────────────────────────────────────────────
/** Reproducible item id: `${family}:${difficulty}:${seed}`, plus `:${topic}` when a strict topic was requested. */
export function itemId(family: string, difficulty: Difficulty, seed: number, topic?: FindingId): string {
  return topic ? `${family}:${difficulty}:${seed}:${topic}` : `${family}:${difficulty}:${seed}`;
}

export interface BaseParts {
  readonly prompt: L10n;
  readonly explanation: L10n;
  readonly ecg: EcgSource;
  readonly findings: readonly FindingId[];
  readonly view?: ItemViewX;
  readonly reveal?: readonly EcgMark[];
  readonly hint?: L10n;
}

export function base(ctx: GenCtx, p: BaseParts) {
  return {
    id: itemId(ctx.spec.id, ctx.difficulty, ctx.seed, ctx.topic),
    family: ctx.spec.id,
    competency: ctx.spec.competency,
    difficulty: ctx.difficulty,
    seed: ctx.seed,
    prompt: p.prompt,
    ecg: p.ecg,
    explanation: p.explanation,
    findings: p.findings,
    ...(p.view ? { view: p.view } : {}),
    ...(p.reveal && p.reveal.length ? { reveal: p.reveal } : {}),
    ...(p.hint ? { hint: p.hint } : {}),
  };
}

// ── reading the signal (explanations that match what is visible) ────────────────────────────────────────────────
/** Net QRS deflection (largest positive + largest negative, mV) of one beat in one lead, relative to the PR level. */
export function netQrs(ecg: Ecg, lead: StdLead, b: BeatMarks): number {
  const arr = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const ref = sampleAt(arr, fs, b.qrsOn - 20);
  let hi = -Infinity;
  let lo = Infinity;
  for (let t = b.qrsOn; t <= b.qrsOff; t += 1000 / fs) {
    const v = sampleAt(arr, fs, t) - ref;
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  }
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return 0;
  return Math.max(0, hi) + Math.min(0, lo);
}

/** Most positive and most negative QRS deflection (mV) of one beat in one lead, relative to the PR level. */
export function qrsExtremes(ecg: Ecg, lead: StdLead, b: BeatMarks): { readonly hi: number; readonly lo: number } {
  const arr = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const ref = sampleAt(arr, fs, b.qrsOn - 20);
  let hi = 0;
  let lo = 0;
  for (let t = b.qrsOn; t <= b.qrsOff; t += 1000 / fs) {
    const v = sampleAt(arr, fs, t) - ref;
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  }
  return { hi, lo };
}

/** Largest T-wave deflection (mV, signed) of one beat in one lead, relative to the PR level. */
export function tPeakAmp(ecg: Ecg, lead: StdLead, b: BeatMarks): number {
  const arr = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const ref = sampleAt(arr, fs, b.qrsOn - 20);
  let best = 0;
  for (let t = b.j + 20; t <= b.tOff; t += 1000 / fs) {
    const v = sampleAt(arr, fs, t) - ref;
    if (Math.abs(v) > Math.abs(best)) best = v;
  }
  return best;
}

/** Highest point (mV, against the PR level 20 ms before the QRS) of the T wave from J + 40 ms to the T end: the
 *  upright part of a T that may start from a depressed ST (the mirror T of posterior injury). */
export function tUprightAmp(ecg: Ecg, lead: StdLead, b: BeatMarks): number {
  const arr = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const ref = sampleAt(arr, fs, b.qrsOn - 20);
  let best = -Infinity;
  for (let t = b.j + 40; t <= b.tOff; t += 1000 / fs) best = Math.max(best, sampleAt(arr, fs, t) - ref);
  return Number.isFinite(best) ? best : 0;
}

/** Peak-to-peak QRS amplitude (mV) of one beat in one lead. */
export function p2pQrs(ecg: Ecg, lead: StdLead, b: BeatMarks): number {
  const arr = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  let hi = -Infinity;
  let lo = Infinity;
  for (let t = b.qrsOn; t <= b.qrsOff; t += 1000 / fs) {
    const v = sampleAt(arr, fs, t);
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  }
  return Number.isFinite(hi) && Number.isFinite(lo) ? hi - lo : 0;
}

export function clampWindow(t0: number, t1: number, durationMs: number): readonly [number, number] {
  const w = t1 - t0;
  let a = Math.max(0, t0);
  let b = a + w;
  if (b > durationMs) {
    b = durationMs;
    a = Math.max(0, b - w);
  }
  return [Math.round(a), Math.round(b)];
}

/** Leads that best show a finding (reveal highlights after grading). */
export const FINDING_LEADS: Readonly<Partial<Record<FindingId, readonly Lead[]>>> = {
  rbbb: ['V1', 'V2', 'I', 'V6'],
  irbbb: ['V1', 'I', 'V6'],
  lbbb: ['V1', 'V2', 'I', 'aVL', 'V5', 'V6'],
  ilbbb: ['I', 'V5', 'V6'],
  lafb: ['I', 'aVL', 'II', 'III', 'aVF'],
  lpfb: ['I', 'aVL', 'III', 'aVF'],
  'bifascicular-block': ['V1', 'I', 'aVL', 'II', 'aVF'],
  'trifascicular-block': ['V1', 'I', 'aVF', 'II'],
  wpw: ['II', 'V4', 'V5', 'V6'],
  'short-pr': ['II'],
  lvh: ['V1', 'V2', 'V5', 'V6', 'aVL'],
  'lvh-strain': ['I', 'aVL', 'V5', 'V6'],
  rvh: ['V1', 'V5', 'V6', 'I'],
  lae: ['II', 'V1'],
  rae: ['II', 'V1'],
  'biatrial-abnormality': ['II', 'V1'],
  'interatrial-block': ['II', 'III', 'aVF'],
  'low-voltage': ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'],
  'stemi-anterior': ['V1', 'V2', 'V3', 'V4', 'III', 'aVF'],
  'stemi-anteroseptal': ['V1', 'V2', 'V3'],
  'stemi-anterolateral': ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'],
  'stemi-inferior': ['II', 'III', 'aVF', 'aVL'],
  'stemi-lateral': ['I', 'aVL', 'V5', 'V6'],
  'stemi-high-lateral': ['I', 'aVL', 'III', 'aVF'],
  'stemi-posterior': ['V1', 'V2', 'V3'],
  'rv-infarction': ['II', 'III', 'aVF', 'V1'],
  'de-winter': ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'aVR'],
  wellens: ['V2', 'V3'],
  'avr-elevation-diffuse-std': ['aVR', 'V1', 'I', 'II', 'V4', 'V5', 'V6'],
  'hyperacute-t': ['V2', 'V3', 'V4'],
  'st-depression-ischemic': ['V4', 'V5', 'V6'],
  't-inversion-ischemic': ['V2', 'V3', 'V4'],
  'lv-aneurysm': ['V1', 'V2', 'V3', 'V4'],
  'sgarbossa-positive': ['V1', 'V2', 'V3', 'V5', 'V6'],
  'old-mi-anterior': ['V1', 'V2', 'V3', 'V4'],
  'old-mi-inferior': ['II', 'III', 'aVF'],
  'old-mi-lateral': ['I', 'aVL', 'V5', 'V6'],
  pericarditis: ['II', 'aVR', 'V5', 'V6'],
  'early-repolarization': ['II', 'III', 'aVF', 'V4', 'V5', 'V6'],
  'brugada-type1': ['V1', 'V2'],
  'brugada-type2': ['V1', 'V2'],
  hyperkalemia: ['V2', 'V3', 'V4', 'II'],
  hypokalemia: ['V2', 'V3', 'II'],
  'long-qt': ['II', 'V5'],
  'short-qt': ['II', 'V3'],
  hypercalcemia: ['II', 'V3'],
  hypocalcemia: ['II', 'V3'],
  'digoxin-effect': ['V5', 'V6', 'II'],
  hypothermia: ['II', 'V3', 'V4', 'V5'],
  'na-channel-blockade': ['aVR', 'I'],
  'apical-hcm': ['V3', 'V4', 'V5'],
  hcm: ['I', 'aVL', 'V5', 'V6'],
  arvc: ['V1', 'V2', 'V3'],
  'pulmonary-embolism': ['I', 'III', 'V1', 'V2', 'V3'],
  'cerebral-t': ['V2', 'V3', 'V4', 'V5'],
  dextrocardia: ['I', 'aVR', 'V1', 'V6'],
  'electrode-reversal-la-ra': ['I', 'aVR', 'aVL'],
  'electrode-reversal-la-ll': ['I', 'II', 'III'],
  'electrode-reversal-ra-ll': ['II', 'aVR', 'aVF'],
  'precordial-misplacement': ['V1', 'V2', 'V3'],
};

/** P / F wave marks on a lead (blocked atrial waves coloured as errors) — reveal of rhythm and AV-block items. */
export function atrialMarks(truth: EcgTruth, lead: Lead = 'II', max = 60): EcgMark[] {
  const out: EcgMark[] = [];
  for (const a of truth.atrial.slice(0, max)) {
    if (!a.visible || a.kind === 'fibrillation') continue;
    const label = a.kind === 'flutter' ? 'F' : a.kind === 'retrograde' || a.kind === 'ectopic' ? "P'" : 'P';
    out.push({ kind: 'wave', lead, t: a.t, label, color: a.conductedTo === null ? 'err' : 'atrial' });
  }
  return out;
}

export function bracket(lead: Lead | 'all', t0: number, t1: number, label: string, color: MarkColor): EcgMark {
  return { kind: 'bracket', lead, t0, t1, label, color };
}

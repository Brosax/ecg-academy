/**
 * AutoMark resolution — lesson marks computed from the ECG's own truth when the lesson renders, so a mark is right for
 * any seed or dial value (src/course/api.ts AutoMark). Pure, no DOM; unit-tested in tests/course/marks.test.ts.
 *
 *  - EcgMarks pass through unchanged; AutoMarks need `ecg.truth` (synthetic ECGs) and are dropped without it (real ECGs
 *    have no fiducials — the validator rejects AutoMarks on real sources).
 *  - The default beat is the dominant beat (most frequent beat kind, not aberrant) that sits best inside the panels
 *    where the mark's lead is drawn: a 3×4 sheet shows each lead for 2.5 s only, so a V2 mark must use a beat inside
 *    the V2 column. `beat` (an index into truth.beats) overrides the choice.
 *  - Default lead: II (the conventional rhythm / interval lead) — interval brackets drawn in all 13 panels would bury
 *    the tracing. `lead: 'all'` on a morphology mark (q, r, s, j, st60) is expanded to the twelve standard leads.
 *  - Estimates (BeatMarks has no T onset, delta end or pacing-spike time): T onset = half-way from J to the T peak;
 *    δ = the first 35 % of the QRS (20–60 ms); a ventricular pacing spike = the paced beat's QRS onset.
 */
import type { LayoutId } from '../app/store';
import type { BeatMarks, Ecg, EcgTruth } from '../core/ecg';
import { sampleAt } from '../core/ecg';
import { pick, type L10n, type Lang } from '../core/l10n';
import { CABRERA_LIMB, STD_LEADS, type Lead } from '../core/leads';
import type { EcgMark, MarkColor } from '../ecg/api';
import type { AutoMark, LessonMark } from './api';

export const AUTO_MARK_KINDS = [
  'p',
  'pr',
  'pr-segment',
  'qrs',
  'q',
  'r',
  's',
  'j',
  'st',
  'st60',
  't',
  'qt',
  'rr',
  'u',
  'delta',
  'f-waves',
  'blocked-p',
  'pacing-spike',
] as const satisfies readonly AutoMark['auto'][];
type AutoKind = AutoMark['auto'];
type MissingAutoKinds = Exclude<AutoKind, (typeof AUTO_MARK_KINDS)[number]>;
/** compile-time proof that AUTO_MARK_KINDS lists every AutoMark kind */
export const AUTO_MARK_KINDS_COMPLETE: [MissingAutoKinds] extends [never] ? true : false = true;

export const MARK_COLORS = ['atrial', 'qrs', 'repol', 'injury', 'vector', 'highlight', 'ok', 'err'] as const satisfies readonly MarkColor[];

const DEFAULT_COLOR: Readonly<Record<AutoKind, MarkColor>> = {
  p: 'atrial',
  pr: 'atrial',
  'pr-segment': 'atrial',
  qrs: 'qrs',
  q: 'qrs',
  r: 'qrs',
  s: 'qrs',
  j: 'qrs',
  st: 'injury',
  st60: 'injury',
  t: 'repol',
  qt: 'repol',
  rr: 'vector',
  u: 'repol',
  delta: 'qrs',
  'f-waves': 'atrial',
  'blocked-p': 'atrial',
  'pacing-spike': 'highlight',
};

/** Morphology marks are per lead: 'all' expands to the twelve standard leads. */
const PER_LEAD: ReadonlySet<AutoKind> = new Set<AutoKind>(['q', 'r', 's', 'j', 'st60']);

export const DEFAULT_MARK_LEAD: Lead = 'II';

export function isAutoMark(m: LessonMark): m is AutoMark {
  return typeof (m as { auto?: unknown }).auto === 'string';
}

// ── where a lead is visible on the sheet ──────────────────────────────────────────────────────────────────────────

export interface ResolveOptions {
  /** layout the ECG is shown in (default '3x4+1') */
  readonly layout?: LayoutId;
  /** paper speed: one sheet is 250 mm (10 s at 25 mm/s, 5 s at 50 mm/s) */
  readonly speed?: 25 | 50;
  /** viewer window (single / strip: the shown span; other layouts: window[0] is the sheet start) */
  readonly window?: readonly [number, number];
  /** lead of 'single' / 'strip' and the rhythm strip of '3x4+1' (default II) */
  readonly lead?: Lead;
  /** limb leads in Cabrera order (moves II, aVL, aVR between the first two 3×4 columns) */
  readonly cabrera?: boolean;
  /** language for labels the viewer takes as plain strings (wave letters); default 'en' */
  readonly lang?: Lang;
}

const PAGE_MM = 250;
const MIN_SPAN_MS = 100;
const STD_LIMB: readonly Lead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];

/** Leads of each 3×4 column: limb leads 1–3, limb leads 4–6, V1–V3, V4–V6 (Cabrera: aVL I −aVR / II aVF III). */
function columns3x4(cabrera: boolean): readonly (readonly Lead[])[] {
  const limb: readonly Lead[] = cabrera ? CABRERA_LIMB.map((x) => (x === '-aVR' ? 'aVR' : x)) : STD_LIMB;
  return [limb.slice(0, 3), limb.slice(3, 6), ['V1', 'V2', 'V3'], ['V4', 'V5', 'V6']];
}

type Win = readonly [number, number];

/**
 * Time windows of the sheet panels that show `lead` (one entry per panel; 'all' = every panel). Mirrors the viewer's
 * layout rules (src/ecg/layout.ts): 3×4 columns of a quarter page each plus full-width rhythm strips; 6×2 and 12×1
 * show the first half page / whole page in every lead; single / strip show the window. The player passes exactly the
 * options it gives the viewer; if the learner then changes layout or speed in the viewer toolbar, default beats are
 * not re-chosen (a mark may then sit in another column) — teaching ECGs with marks open without the toolbar.
 */
export function leadWindows(lead: Lead | 'all', durationMs: number, o: ResolveOptions = {}): Win[] {
  const layout = o.layout ?? '3x4+1';
  const page = (PAGE_MM / (o.speed ?? 25)) * 1000;
  const total = Math.max(MIN_SPAN_MS, durationMs);
  const start = Math.max(0, Math.min(o.window ? Math.min(o.window[0], o.window[1]) : 0, total - MIN_SPAN_MS));
  const avail = total - start;
  const out: Win[] = [];
  switch (layout) {
    case '3x4+1':
    case '3x4+3': {
      const span = Math.max(MIN_SPAN_MS, Math.min(page, avail));
      const col = span / 4;
      columns3x4(o.cabrera ?? false).forEach((leads, c) => {
        for (const l of leads) if (lead === 'all' || lead === l) out.push([start + c * col, start + (c + 1) * col]);
      });
      const rhythm: readonly Lead[] = layout === '3x4+1' ? [o.lead ?? 'II'] : ['II', 'V1', 'V5'];
      for (const l of rhythm) if (lead === 'all' || lead === l) out.push([start, start + span]);
      return out;
    }
    case '6x2':
    case '12x1': {
      const span = Math.max(MIN_SPAN_MS, Math.min(layout === '6x2' ? page / 2 : page, avail));
      for (const l of STD_LEADS) if (lead === 'all' || lead === l) out.push([start, start + span]);
      return out;
    }
    case 'single':
    case 'strip': {
      if (lead !== 'all' && lead !== (o.lead ?? 'II')) return out;
      let a = o.window ? Math.min(o.window[0], o.window[1]) : 0;
      let b = o.window ? Math.max(o.window[0], o.window[1]) : total;
      a = Math.max(0, Math.min(a, total - MIN_SPAN_MS));
      b = Math.max(a + MIN_SPAN_MS, Math.min(b, total));
      out.push([a, b]);
      return out;
    }
  }
}

// ── beat choice ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Most frequent kind among non-aberrant beats (ties: the kind seen first). */
export function dominantKind(beats: readonly BeatMarks[]): BeatMarks['kind'] | null {
  const counts = new Map<BeatMarks['kind'], number>();
  for (const b of beats) if (!b.aberrant) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  if (counts.size === 0) for (const b of beats) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  let best: BeatMarks['kind'] | null = null;
  let n = 0;
  for (const [k, c] of counts) {
    if (c > n) {
      best = k;
      n = c;
    }
  }
  return best;
}

function beatSpan(b: BeatMarks): Win {
  const a = Math.min(b.pOn ?? b.qrsOn, b.qrsOn) - 20;
  const z = Math.max(b.tOff, b.uOff ?? b.tOff) + 20;
  return [a, z];
}

const mid = (w: Win) => (w[0] + w[1]) / 2;

/** Lexicographic a < b (1 µs tolerance on each component, so float noise never decides). */
function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let k = 0; k < a.length; k++) {
    if (a[k] < b[k] - 1e-3) return true;
    if (a[k] > b[k] + 1e-3) return false;
  }
  return false;
}

/**
 * Index of the default beat for a mark drawn in `windows`: the dominant beat contained in the most panels, then the one
 * closest to `prefer` (default: the centre of its narrowest containing panel), then to the middle of the record.
 * Null without beats.
 */
export function defaultBeat(truth: EcgTruth, durationMs: number, windows: readonly Win[] = [], prefer?: number): number | null {
  const beats = truth.beats;
  if (beats.length === 0) return null;
  const dom = dominantKind(beats);
  let cand = beats.map((b, i) => i).filter((i) => beats[i].kind === dom && !beats[i].aberrant);
  if (cand.length === 0) cand = beats.map((_b, i) => i);
  const recordMid = durationMs / 2;
  let best = cand[0];
  let bestKey: [number, number, number] | null = null;
  for (const i of cand) {
    const [s0, s1] = beatSpan(beats[i]);
    const c = (s0 + s1) / 2;
    const inside = windows.filter((w) => s0 >= w[0] && s1 <= w[1]);
    const narrowest = inside.reduce<Win | null>((m, w) => (m === null || w[1] - w[0] < m[1] - m[0] ? w : m), null);
    const ref = prefer ?? (narrowest ? mid(narrowest) : windows.length ? mid(windows[0]) : recordMid);
    const key: [number, number, number] = [-inside.length, Math.abs(c - ref), Math.abs(c - recordMid)];
    if (bestKey === null || lexLess(key, bestKey)) {
      best = i;
      bestKey = key;
    }
  }
  return best;
}

// ── QRS wave labelling ────────────────────────────────────────────────────────────────────────────────────────────

export interface QrsWave {
  /** Q, R, S, QS, R′, S′ … (letter case by size: lowercase = small wave) */
  readonly label: string;
  readonly role: 'q' | 'r' | 's' | 'qs';
  readonly t: number;
  readonly mv: number;
}

/** A deflection must leave the baseline by this much to count as a wave (0.5 mm at standard gain). */
export const MIN_WAVE_MV = 0.05;
const PRIME = '′';

/** Isoelectric reference before a QRS: the mean over [qrsOn − 30, qrsOn − 10] ms (the PR segment). */
export function baselineBefore(arr: Float32Array, fs: number, qrsOn: number): number {
  let s = 0;
  let n = 0;
  for (let t = qrsOn - 30; t <= qrsOn - 10 + 1e-9; t += 1000 / fs) {
    s += sampleAt(arr, fs, Math.max(0, t));
    n++;
  }
  return n ? s / n : sampleAt(arr, fs, qrsOn);
}

/**
 * Waves of one QRS in one lead (standard nomenclature): the signal minus the baseline is split into excursions above
 * and below it; excursions smaller than MIN_WAVE_MV are ignored (adjacent same-side excursions merge, i.e. a notched
 * wave stays one wave). First positive wave = R, later ones R′, R″; negative before the first R = Q, after an R = S
 * (S′ after R′); no positive wave at all = QS. Uppercase when the wave is ≥ 0.5 mV or ≥ half the largest wave.
 */
export function qrsWaves(arr: Float32Array, fs: number, qrsOn: number, qrsOff: number, base?: number): QrsWave[] {
  const b0 = base ?? baselineBefore(arr, fs, qrsOn);
  const i0 = Math.max(0, Math.round((qrsOn * fs) / 1000));
  const i1 = Math.min(arr.length - 1, Math.round((qrsOff * fs) / 1000));
  interface Ex {
    sign: 1 | -1;
    peak: number;
    i: number;
  }
  const raw: Ex[] = [];
  let cur: Ex | null = null;
  for (let i = i0; i <= i1; i++) {
    const d = arr[i] - b0;
    const sign: 1 | -1 | 0 = d > 1e-6 ? 1 : d < -1e-6 ? -1 : 0;
    if (sign === 0) continue;
    if (cur && cur.sign === sign) {
      if (Math.abs(d) > Math.abs(cur.peak)) {
        cur.peak = d;
        cur.i = i;
      }
    } else {
      cur = { sign, peak: d, i };
      raw.push(cur);
    }
  }
  const big = raw.filter((e) => Math.abs(e.peak) >= MIN_WAVE_MV);
  const merged: Ex[] = [];
  for (const e of big) {
    const last = merged[merged.length - 1];
    if (last && last.sign === e.sign) {
      if (Math.abs(e.peak) > Math.abs(last.peak)) merged[merged.length - 1] = { ...e };
    } else merged.push({ ...e });
  }
  if (merged.length === 0) return [];
  const tOf = (i: number) => (i * 1000) / fs;
  const largest = Math.max(...merged.map((e) => Math.abs(e.peak)));
  const letter = (L: string, mv: number) => (Math.abs(mv) >= 0.5 || Math.abs(mv) >= largest / 2 ? L : L.toLowerCase());
  if (!merged.some((e) => e.sign > 0)) {
    const deepest = merged.reduce((m, e) => (e.peak < m.peak ? e : m));
    return [{ label: 'QS', role: 'qs', t: tOf(deepest.i), mv: deepest.peak }];
  }
  const out: QrsWave[] = [];
  let rCount = 0;
  for (const e of merged) {
    if (e.sign > 0) {
      out.push({ label: letter('R', e.peak) + PRIME.repeat(rCount), role: 'r', t: tOf(e.i), mv: e.peak });
      rCount++;
    } else if (rCount === 0) {
      out.push({ label: letter('Q', e.peak), role: 'q', t: tOf(e.i), mv: e.peak });
    } else {
      out.push({ label: letter('S', e.peak) + PRIME.repeat(Math.max(0, rCount - 1)), role: 's', t: tOf(e.i), mv: e.peak });
    }
  }
  return out;
}

// ── labels ────────────────────────────────────────────────────────────────────────────────────────────────────────

const same = (s: string): L10n => ({ zh: s, en: s, es: s });

/** Signed number with a fixed number of decimals; Spanish uses a decimal comma. */
function signed(v: number, digits: number, comma: boolean): string {
  const r = Number(v.toFixed(digits));
  const s = `${r > 0 ? '+' : r < 0 ? '−' : '±'}${Math.abs(r).toFixed(digits)}`;
  return comma ? s.replace('.', ',') : s;
}

export function stLabel(mv: number): L10n {
  const en = `ST ${signed(mv * 10, 1, false)} mm (${signed(mv, 2, false)} mV)`;
  return { zh: en, en, es: `ST ${signed(mv * 10, 1, true)} mm (${signed(mv, 2, true)} mV)` };
}

const msLabel = (name: string, ms: number): L10n => same(`${name} ${Math.round(ms)} ms`);

const LABEL_PR_SEGMENT: L10n = { zh: 'PR 段', en: 'PR segment', es: 'segmento PR' };
const LABEL_ST_SEGMENT: L10n = { zh: 'ST 段', en: 'ST segment', es: 'segmento ST' };
const LABEL_BLOCKED_P: L10n = { zh: '未下传 P 波', en: 'blocked P', es: 'P bloqueada' };
const LABEL_SPIKE: L10n = { zh: '起搏信号', en: 'pacing spike', es: 'espícula' };

// ── estimates for fiducials the truth does not carry ──────────────────────────────────────────────────────────────

/** T onset estimate: half-way from J to the T peak (or J + 80 ms without a T peak), kept inside [J, T end]. */
export function tOnsetEstimate(b: BeatMarks): number {
  const est = b.tPeak !== null ? b.j + (b.tPeak - b.j) / 2 : b.j + 80;
  return Math.max(b.j, Math.min(est, b.tOff - 20));
}

/** End of the δ wave estimate: the first 35 % of the QRS, 20–60 ms. */
export function deltaEndEstimate(b: BeatMarks): number {
  return b.qrsOn + Math.max(20, Math.min(60, 0.35 * (b.qrsOff - b.qrsOn)));
}

function medianPDuration(truth: EcgTruth): number {
  const d = truth.beats.filter((b) => b.pOn !== null && b.pOff !== null).map((b) => (b.pOff as number) - (b.pOn as number));
  if (d.length === 0) return 100;
  d.sort((a, b) => a - b);
  return d[Math.floor(d.length / 2)];
}

// ── resolution ────────────────────────────────────────────────────────────────────────────────────────────────────

function leadArray(ecg: Ecg, lead: Lead): Float32Array | null {
  return (ecg.signal.leads as Readonly<Partial<Record<Lead, Float32Array>>>)[lead] ?? null;
}

function pickBeat(ecg: Ecg, truth: EcgTruth, m: AutoMark, lead: Lead | 'all', o: ResolveOptions): number | null {
  if (m.beat !== undefined) {
    return Number.isInteger(m.beat) && m.beat >= 0 && m.beat < truth.beats.length ? m.beat : null;
  }
  // a mark on every panel ('all') uses the beat nearest the middle of the record; a lead mark centres in its panel
  const dur = ecg.signal.durationMs;
  return defaultBeat(truth, dur, leadWindows(lead, dur, o), lead === 'all' ? dur / 2 : undefined);
}

function resolveOne(ecg: Ecg, truth: EcgTruth, m: AutoMark, lead: Lead | 'all', o: ResolveOptions): EcgMark[] {
  const color = m.color ?? DEFAULT_COLOR[m.auto];
  const fs = ecg.signal.fs;
  const label = <T extends L10n | string>(dflt: T): L10n | T => m.label ?? dflt;
  /** wave marks take a plain string */
  const text = (dflt: string): string => (m.label ? pick(m.label, o.lang ?? 'en') : dflt);

  // events that are not tied to one beat
  if (m.auto === 'f-waves' || m.auto === 'blocked-p' || m.auto === 'pacing-spike') {
    const l: Lead | 'all' = lead;
    if (m.auto === 'f-waves') {
      const wins = leadWindows(l, ecg.signal.durationMs, o);
      const narrow = wins.reduce<Win | null>((a, w) => (a === null || w[1] - w[0] < a[1] - a[0] ? w : a), null) ?? [0, ecg.signal.durationMs];
      return truth.atrial
        .filter((e) => (e.kind === 'flutter' || e.kind === 'fibrillation') && e.t >= narrow[0] && e.t <= narrow[1])
        .map((e): EcgMark => ({ kind: 'wave', lead: l, t: e.t, label: text(e.kind === 'flutter' ? 'F' : 'f'), color }));
    }
    if (m.auto === 'blocked-p') {
      const dur = medianPDuration(truth);
      return truth.atrial
        .filter((e) => e.conductedTo === null && e.visible && e.kind !== 'flutter' && e.kind !== 'fibrillation' && e.kind !== 'retrograde')
        .map((e): EcgMark => ({ kind: 'region', lead: l, t0: e.t, t1: e.t + dur, color, label: label(LABEL_BLOCKED_P) }));
    }
    const spikes = [
      ...truth.atrial.filter((e) => e.kind === 'paced').map((e) => e.t),
      ...truth.beats.filter((b) => b.kind === 'paced-ventricular').map((b) => b.qrsOn),
    ].sort((a, b) => a - b);
    return spikes.map((t): EcgMark => ({ kind: 'region', lead: l, t0: t - 8, t1: t + 4, color, label: label(LABEL_SPIKE) }));
  }

  const bi = pickBeat(ecg, truth, m, lead, o);
  if (bi === null) return [];
  const b = truth.beats[bi];
  switch (m.auto) {
    case 'p':
      return b.pOn !== null && b.pOff !== null ? [{ kind: 'region', lead, t0: b.pOn, t1: b.pOff, color, label: label('P') }] : [];
    case 'pr':
      return b.pOn !== null ? [{ kind: 'bracket', lead, t0: b.pOn, t1: b.qrsOn, color, label: label(msLabel('PR', b.qrsOn - b.pOn)) }] : [];
    case 'pr-segment':
      return b.pOff !== null && b.pOff < b.qrsOn ? [{ kind: 'region', lead, t0: b.pOff, t1: b.qrsOn, color, label: label(LABEL_PR_SEGMENT) }] : [];
    case 'qrs':
      return [{ kind: 'bracket', lead, t0: b.qrsOn, t1: b.qrsOff, color, label: label(msLabel('QRS', b.qrsOff - b.qrsOn)) }];
    case 'st': {
      const t1 = tOnsetEstimate(b);
      return t1 > b.j ? [{ kind: 'region', lead, t0: b.j, t1, color, label: label(LABEL_ST_SEGMENT) }] : [];
    }
    case 't':
      return [{ kind: 'region', lead, t0: tOnsetEstimate(b), t1: b.tOff, color, label: label('T') }];
    case 'qt':
      return [{ kind: 'bracket', lead, t0: b.qrsOn, t1: b.tOff, color, label: label(msLabel('QT', b.tOff - b.qrsOn)) }];
    case 'rr': {
      const i = bi + 1 < truth.beats.length ? bi : bi - 1;
      if (i < 0) return [];
      const a = truth.beats[i].qrsOn;
      const z = truth.beats[i + 1].qrsOn;
      return [{ kind: 'bracket', lead, t0: a, t1: z, color, label: label(msLabel('RR', z - a)) }];
    }
    case 'u':
      return b.uOff !== null && b.uOff > b.tOff ? [{ kind: 'region', lead, t0: b.tOff, t1: b.uOff, color, label: label('U') }] : [];
    case 'delta':
      return [{ kind: 'region', lead, t0: b.qrsOn, t1: deltaEndEstimate(b), color, label: label('δ') }];
    case 'j':
      if (lead === 'all') return [];
      return [{ kind: 'wave', lead, t: b.j, label: text('J'), color }];
    case 'q':
    case 'r':
    case 's': {
      if (lead === 'all') return [];
      const arr = leadArray(ecg, lead);
      if (!arr) return [];
      const want = m.auto;
      return qrsWaves(arr, fs, b.qrsOn, b.qrsOff)
        .filter((w) => w.role === want || (want === 'q' && w.role === 'qs'))
        .map((w): EcgMark => ({ kind: 'wave', lead, t: w.t, label: text(w.label), color }));
    }
    case 'st60': {
      if (lead === 'all') return [];
      const arr = leadArray(ecg, lead);
      if (!arr) return [];
      const t = b.j + 60;
      const base = baselineBefore(arr, fs, b.qrsOn);
      const mv = sampleAt(arr, fs, t);
      const dev = truth.stMv[lead] ?? mv - base;
      return [
        { kind: 'hline', lead, mv: base, t0: b.qrsOn - 60, t1: t + 60, color: 'vector' },
        { kind: 'arrow', lead, t, mv, color, label: label(stLabel(dev)) },
      ];
    }
  }
}

/**
 * Turn lesson marks into viewer marks for this ECG. AutoMarks without truth are dropped; EcgMarks pass through.
 * `o` describes how the ECG is shown (layout, speed, window, rhythm lead) so default beats land inside the panels.
 */
export function resolveMarks(ecg: Ecg, marks: readonly LessonMark[] | undefined, o: ResolveOptions = {}): EcgMark[] {
  if (!marks || marks.length === 0) return [];
  const out: EcgMark[] = [];
  const truth = ecg.truth;
  for (const m of marks) {
    if (!isAutoMark(m)) {
      out.push(m);
      continue;
    }
    if (!truth) continue;
    const lead = m.lead ?? DEFAULT_MARK_LEAD;
    const leads: readonly (Lead | 'all')[] = lead === 'all' && PER_LEAD.has(m.auto) ? STD_LEADS : [lead];
    for (const l of leads) out.push(...resolveOne(ecg, truth, m, l, o));
  }
  return out;
}

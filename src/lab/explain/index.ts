/**
 * Model-generated explanations: pure functions that turn engine state (H(t), lead vectors, model-truth timing,
 * responsible structures) into localized sentences. Every number quoted comes from the same projection the ECG shows
 * (one-source rule); the only fixed text is per-segment physiology (docs/research/activation-physiology.md,
 * docs/research/disease-spec.md normal-sinus-rhythm).
 */
import { SEGMENT_STRUCTURES } from '../app/commands';
import type { Lang } from '../app/store';
import { tc } from '../i18n/common';
import { te } from '../i18n/explain';
import type { CycleTruth, FrankVec, LeadName, MechPhase, SimEngine, StructureId, WaveSegment } from '../sim/types';
import { PRECORDIAL_LEADS } from '../sim/types';
import { patternString, qrsRuns, runAt, runLabel } from './qrsPattern';
import type { WaveRun } from './qrsPattern';
import {
  addF, angleBetweenDeg, deflectionOf, dirPhrase, directionsOf, dotF, effectiveLeadVector, fmtDeg, fmtNum,
  frontalAngleDeg, H_MIN_MV, horizontalAngleDeg, ISO_MV, joinList, joinSentences, leadRows, mag, projectLead,
} from './vector';
import type { Deflection, Dir } from './vector';

export * from './vector';
export * from './qrsPattern';

// ---------------------------------------------------------------- sampling helpers

export interface Instant {
  readonly tMs: number;
  readonly hA: FrankVec;
  readonly hV: FrankVec;
  /** H = H_A + H_V (Frank, mV). */
  readonly h: FrankVec;
}

export function sampleInstant(engine: SimEngine, tMs: number): Instant {
  const a = new Float32Array(3), v = new Float32Array(3);
  engine.sampleH(tMs, 1, a, v);
  const hA: FrankVec = [a[0], a[1], a[2]], hV: FrankVec = [v[0], v[1], v[2]];
  return { tMs, hA, hV, h: addF(hA, hV) };
}

/** One lead's samples over [t0, t1) at 1 ms — straight from engine.sampleLeads (the displayed signal). */
export function sampleLead(engine: SimEngine, lead: LeadName, t0: number, t1: number): Float32Array {
  const n = Math.max(1, Math.round(t1 - t0));
  const out = new Float32Array(12 * n);
  engine.sampleLeads(t0, n, out);
  const li = engine.projector.leads.indexOf(lead);
  return out.slice(li * n, (li + 1) * n);
}

/** Segment containing t in the engine's cycle truth (half-open [t0, t1)). */
export function segmentAt(cycle: CycleTruth | null, tMs: number): WaveSegment | null {
  return cycle?.segments.find((s) => tMs >= s.t0 && tMs < s.t1)?.seg ?? null;
}

export type QrsPart = 'early' | 'mid' | 'late';
/** Thirds of activation by time fraction of the QRS (septum ≈ first 15–20 ms of ~90 ms; Durrer 1970). */
export function qrsPartAt(cycle: CycleTruth, tMs: number): QrsPart | null {
  if (cycle.qrsOn === null || cycle.qrsOff === null || cycle.qrsOff <= cycle.qrsOn) return null;
  const f = (tMs - cycle.qrsOn) / (cycle.qrsOff - cycle.qrsOn);
  if (f < 0 || f >= 1) return null;
  return f < 0.22 ? 'early' : f < 0.65 ? 'mid' : 'late';
}

const isPrecordial = (l: LeadName): boolean => PRECORDIAL_LEADS.includes(l);

// ---------------------------------------------------------------- explainLeadAt

export type IsoReason = 'noVector' | 'perpendicular' | 'small';

export interface LeadExplanation {
  readonly lead: LeadName;
  readonly tMs: number;
  readonly segment: WaveSegment | null;
  readonly qrsPart: QrsPart | null;
  readonly h: FrankVec;
  readonly hMag: number;
  readonly hDirs: readonly Dir[];
  readonly hFrontalDeg: number;
  readonly hHorizontalDeg: number;
  readonly leadVec: FrankVec;
  readonly leadMag: number;
  readonly leadDirs: readonly Dir[];
  /** Angle between H and the lead vector (deg); null when H ≈ 0. */
  readonly angleDeg: number | null;
  /** Lead voltage at tMs (mV) — identical to engine.sampleLeads. */
  readonly valueMv: number;
  readonly deflection: Deflection;
  readonly isoReason: IsoReason | null;
  /** Name of the wave this instant belongs to in this lead (e.g. "q", "R", "s", "P", "T"), if any. */
  readonly wave: string | null;
  readonly sentences: readonly string[];
  /**
   * The same sentences grouped by step of the causal chain (heart → vector H → lead axis → projection → result);
   * concatenated in this order they equal `sentences`.
   */
  readonly parts: LeadExplanationParts;
  readonly text: string;
}

export interface LeadExplanationParts {
  /** What the heart is doing now and which structures take part. */
  readonly context: readonly string[];
  /** Direction and size of the heart vector H. */
  readonly vector: readonly string[];
  /** Direction and sensitivity of the lead axis. */
  readonly axis: readonly string[];
  /** Angle θ, |H|·|L|·cos θ, and why the value is ≈ 0 when it is. */
  readonly projection: readonly string[];
  /** The resulting deflection and wave name. */
  readonly result: readonly string[];
}

function waveNameKey(label: string): Parameters<typeof te.in>[1] | null {
  switch (label) {
    case 'P': return 'wn.P';
    case 'T': return 'wn.T';
    case 'Q': return 'wn.Q';
    case 'q': return 'wn.q';
    case 'R': return 'wn.R';
    case 'r': return 'wn.r';
    case 'R′': return 'wn.R2';
    case 'r′': return 'wn.r2';
    case 'S': case 'S′': return 'wn.S';
    case 's': case 's′': return 'wn.s';
    case 'QS': return 'wn.QS';
    default: return null;
  }
}

/** Which wave of this lead the instant belongs to, measured on the projected trace. */
function waveAt(engine: SimEngine, cycle: CycleTruth | null, seg: WaveSegment | null, lead: LeadName, tMs: number, defl: Deflection): string | null {
  if (defl === 'iso' || !cycle || !seg) return null;
  if (seg === 'P') return 'P';
  if (seg === 'T') return 'T';
  if (seg !== 'QRS' || cycle.qrsOn === null || cycle.qrsOff === null) return null;
  const s = sampleLead(engine, lead, cycle.qrsOn, cycle.qrsOff);
  const run = runAt(qrsRuns(s), Math.round(tMs - cycle.qrsOn));
  if (!run || (run.sign > 0) !== (defl === 'up')) return null;
  return runLabel(run);
}

/** `ctx.*`: the full sentence (explanations, chain); `cap.*`: its short form for the caption under the heart. */
const contextKey = <K extends 'ctx' | 'cap'>(seg: WaveSegment | null, part: QrsPart | null, kind: K) =>
  seg === 'QRS' && part ? (`${kind}.QRS.${part}` as const) : seg && seg !== 'QRS' ? (`${kind}.${seg}` as const) : (`${kind}.none` as const);

function segmentPartAt(engine: SimEngine, tMs: number): { seg: WaveSegment | null; part: QrsPart | null } {
  const cycle = engine.cycleAt(tMs);
  const seg = segmentAt(cycle, tMs);
  return { seg, part: cycle && seg === 'QRS' ? qrsPartAt(cycle, tMs) : null };
}

/** The first sentence of the explanation — what the heart is doing at tMs (lead-independent, cheap). */
export function contextSentence(engine: SimEngine, tMs: number, lang: Lang): string {
  const { seg, part } = segmentPartAt(engine, tMs);
  return te.in(lang, contextKey(seg, part, 'ctx'));
}

/** The short form of contextSentence (≤ 110 characters), for the one-sentence caption under the heart. */
export function captionSentence(engine: SimEngine, tMs: number, lang: Lang): string {
  const { seg, part } = segmentPartAt(engine, tMs);
  return te.in(lang, contextKey(seg, part, 'cap'));
}

/** Both forms from one lookup of the cycle: the caption shows `caption` and keeps `context` as its tooltip. */
export function captionSentences(engine: SimEngine, tMs: number, lang: Lang): { readonly caption: string; readonly context: string } {
  const { seg, part } = segmentPartAt(engine, tMs);
  return { caption: te.in(lang, contextKey(seg, part, 'cap')), context: te.in(lang, contextKey(seg, part, 'ctx')) };
}

export function explainLeadAt(engine: SimEngine, lead: LeadName, tMs: number, lang: Lang): LeadExplanation {
  const cycle = engine.cycleAt(tMs);
  const seg = segmentAt(cycle, tMs);
  const part = cycle && seg === 'QRS' ? qrsPartAt(cycle, tMs) : null;
  const inst = sampleInstant(engine, tMs);
  const p = engine.projector;
  const L = effectiveLeadVector(p, lead, inst.hA, inst.hV);
  const value = projectLead(p, lead, inst.hA, inst.hV);
  const defl = deflectionOf(value);
  const hMag = mag(inst.h), lMag = mag(L);
  const angle = hMag >= H_MIN_MV ? angleBetweenDeg(inst.h, L) : null;
  const isoReason: IsoReason | null =
    defl !== 'iso' ? null : hMag < H_MIN_MV ? 'noVector' : angle !== null && Math.abs(90 - angle) < 15 ? 'perpendicular' : 'small';
  const wave = waveAt(engine, cycle, seg, lead, tMs, defl);

  const context: string[] = [], vector: string[] = [], axis: string[] = [], projection: string[] = [], result: string[] = [];
  // 1. what the heart is doing
  context.push(te.in(lang, contextKey(seg, part, 'ctx')));
  const active = engine.responsible(tMs).slice(0, 4).map((r) => tc.in(lang, `struct.${r.id}`));
  if (active.length) context.push(te.in(lang, 'active.list', { list: joinList(lang, active) }));
  // 2. heart vector
  const hDirs = directionsOf(inst.h);
  if (hMag < H_MIN_MV) vector.push(te.in(lang, 'h.zero', { mag: fmtNum(hMag, 2, lang) }));
  else
    vector.push(
      te.in(lang, 'h.dir', {
        dirs: dirPhrase(lang, hDirs),
        ang: fmtDeg(frontalAngleDeg(inst.h), lang),
        hang: fmtDeg(horizontalAngleDeg(inst.h), lang),
        mag: fmtNum(hMag, 2, lang),
      }),
    );
  // 3. lead vector
  const leadDirs = directionsOf(L);
  axis.push(
    te.in(lang, isPrecordial(lead) ? 'lead.axis.prec' : 'lead.axis.limb', {
      lead,
      dirs: dirPhrase(lang, leadDirs),
      ang: fmtDeg(frontalAngleDeg(L), lang),
      hang: fmtDeg(horizontalAngleDeg(L), lang),
      mag: fmtNum(lMag, 2, lang),
    }),
  );
  // 4. projection and result
  if (angle !== null) projection.push(te.in(lang, 'proj', { theta: fmtNum(angle, 0, lang), v: fmtNum(value, 2, lang, true) }));
  if (isoReason === 'noVector') projection.push(te.in(lang, 'iso.zero'));
  else if (isoReason === 'perpendicular') projection.push(te.in(lang, 'iso.perp'));
  else if (isoReason === 'small') projection.push(te.in(lang, 'iso.small'));
  const nameKey = wave ? waveNameKey(wave) : null;
  result.push(
    te.in(lang, 'defl.result', {
      lead,
      word: te.in(lang, defl === 'up' ? 'word.up' : defl === 'down' ? 'word.down' : 'word.iso'),
      wave: nameKey ? te.in(lang, 'wave.is', { name: te.in(lang, nameKey) }) : '',
    }),
  );
  const S = [...context, ...vector, ...axis, ...projection, ...result];
  return {
    lead, tMs, segment: seg, qrsPart: part, h: inst.h, hMag, hDirs, hFrontalDeg: frontalAngleDeg(inst.h),
    hHorizontalDeg: horizontalAngleDeg(inst.h), leadVec: L, leadMag: lMag, leadDirs, angleDeg: angle, valueMv: value,
    deflection: defl, isoReason, wave, sentences: S, parts: { context, vector, axis, projection, result },
    text: joinSentences(lang, S),
  };
}

// ---------------------------------------------------------------- explainSegment

export interface SegmentExplanation {
  readonly seg: WaveSegment;
  readonly title: string;
  readonly structures: readonly StructureId[];
  readonly durationMs: number | null;
  readonly mech: readonly MechPhase[];
  readonly sentences: readonly string[];
  readonly text: string;
}

/** What the heart is doing during a segment; with a cycle, adds this beat's duration and simultaneous mechanics. */
export function explainSegment(seg: WaveSegment, lang: Lang, cycle?: CycleTruth | null): SegmentExplanation {
  const S: string[] = [te.in(lang, `segx.${seg}`)];
  const structures = SEGMENT_STRUCTURES[seg];
  if (structures.length) S.push(te.in(lang, 'segx.structs', { list: joinList(lang, structures.map((id) => tc.in(lang, `struct.${id}`))) }));
  const span = cycle?.segments.find((s) => s.seg === seg) ?? null;
  const mech: MechPhase[] = [];
  if (span) {
    S.push(te.in(lang, 'segx.dur', { ms: Math.round(span.t1 - span.t0) }));
    for (const m of cycle!.mech) if (Math.min(m.t1, span.t1) - Math.max(m.t0, span.t0) > 5) mech.push(m.phase);
    if (mech.length) S.push(te.in(lang, 'segx.mech', { list: joinList(lang, mech.map((m) => tc.in(lang, `mech.${m}`))) }));
  }
  return {
    seg, title: tc.in(lang, `seg.${seg}`), structures, durationMs: span ? span.t1 - span.t0 : null, mech, sentences: S,
    text: joinSentences(lang, S),
  };
}

// ---------------------------------------------------------------- explainLeadMorphology

export type Shape = 'up' | 'down' | 'biphasic' | 'flat';
export type MainDeflection = 'pos' | 'neg' | 'equi';

export interface WaveSummary {
  /** Signed largest excursion (mV). */
  readonly peak: number;
  /** Net area (mV·ms). */
  readonly area: number;
  readonly shape: Shape;
  /** Mean heart vector over the wave (Frank, mV). */
  readonly meanH: FrankVec;
  /** Angle between the mean vector and this lead's axis (deg). */
  readonly angleDeg: number | null;
}

export interface LeadMorphology {
  readonly lead: LeadName;
  readonly p: WaveSummary | null;
  readonly qrs: (WaveSummary & { readonly runs: readonly WaveRun[]; readonly pattern: string; readonly main: MainDeflection }) | null;
  readonly t: (WaveSummary & { readonly concordant: boolean | null; readonly qrstAngleDeg: number | null }) | null;
  readonly sentences: readonly string[];
  readonly text: string;
}

export function shapeOf(samples: ArrayLike<number>): Shape {
  let max = 0, min = 0;
  for (let i = 0; i < samples.length; i++) {
    max = Math.max(max, samples[i]);
    min = Math.min(min, samples[i]);
  }
  if (max < ISO_MV && -min < ISO_MV) return 'flat';
  const big = Math.max(max, -min);
  if (max >= ISO_MV && -min >= ISO_MV && Math.min(max, -min) > 0.3 * big) return 'biphasic';
  return max >= -min ? 'up' : 'down';
}

export function mainDeflectionOf(samples: ArrayLike<number>): MainDeflection {
  let net = 0, abs = 0;
  for (let i = 0; i < samples.length; i++) {
    net += samples[i];
    abs += Math.abs(samples[i]);
  }
  if (abs < 1e-9) return 'equi';
  const r = net / abs;
  return r > 0.2 ? 'pos' : r < -0.2 ? 'neg' : 'equi';
}

function summarize(engine: SimEngine, lead: LeadName, t0: number, t1: number, comp: 'A' | 'V'): WaveSummary & { samples: Float32Array } {
  const n = Math.max(1, Math.round(t1 - t0));
  const a = new Float32Array(3 * n), v = new Float32Array(3 * n);
  engine.sampleH(t0, n, a, v);
  const src = comp === 'A' ? a : v;
  const m: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) m[k] += src[3 * i + k] / n;
  const samples = sampleLead(engine, lead, t0, t1);
  let peak = 0, area = 0;
  for (const x of samples) {
    if (Math.abs(x) > Math.abs(peak)) peak = x;
    area += x;
  }
  const rows = leadRows(engine.projector, lead);
  const L = comp === 'A' ? rows.a : rows.v;
  return { peak, area, shape: shapeOf(samples), meanH: m, angleDeg: angleBetweenDeg(m, L), samples };
}

/** "Why does this lead look like this?" — P, QRS and T of one cycle measured on the projected trace. */
export function explainLeadMorphology(engine: SimEngine, lead: LeadName, cycle: CycleTruth | null, lang: Lang): LeadMorphology {
  const S: string[] = [];
  const span = (seg: WaveSegment) => cycle?.segments.find((s) => s.seg === seg) ?? null;
  const pSpan = span('P'), qSpan = span('QRS'), tSpan = span('T');
  const p = pSpan ? summarize(engine, lead, pSpan.t0, pSpan.t1, 'A') : null;
  const q = qSpan ? summarize(engine, lead, qSpan.t0, qSpan.t1, 'V') : null;
  const t = tSpan ? summarize(engine, lead, tSpan.t0, tSpan.t1, 'V') : null;
  if (!p && !q && !t) {
    S.push(te.in(lang, 'm.none'));
    return { lead, p: null, qrs: null, t: null, sentences: S, text: joinSentences(lang, S) };
  }
  const deg = (x: number | null) => (x === null ? '—' : fmtNum(x, 0, lang));
  if (p)
    S.push(
      te.in(lang, 'm.p', {
        shape: te.in(lang, `shape.${p.shape}`), peak: fmtNum(p.peak, 2, lang, true),
        dirs: dirPhrase(lang, directionsOf(p.meanH)), theta: deg(p.angleDeg),
      }),
    );
  let qrs: LeadMorphology['qrs'] = null;
  if (q) {
    const runs = qrsRuns(q.samples);
    const main = mainDeflectionOf(q.samples);
    qrs = { peak: q.peak, area: q.area, shape: q.shape, meanH: q.meanH, angleDeg: q.angleDeg, runs, pattern: patternString(runs), main };
    S.push(
      te.in(lang, 'm.qrs', {
        pattern: qrs.pattern, main: te.in(lang, `main.${main}`), dirs: dirPhrase(lang, directionsOf(q.meanH)),
        ang: fmtDeg(frontalAngleDeg(q.meanH), lang), theta: deg(q.angleDeg),
      }),
    );
  }
  let tw: LeadMorphology['t'] = null;
  if (t) {
    const tMain = mainDeflectionOf(t.samples);
    const concordant = !qrs || qrs.main === 'equi' || tMain === 'equi' ? null : qrs.main === tMain;
    const qrst = q ? angleBetweenDeg(q.meanH, t.meanH) : null;
    tw = { peak: t.peak, area: t.area, shape: t.shape, meanH: t.meanH, angleDeg: t.angleDeg, concordant, qrstAngleDeg: qrst };
    S.push(
      te.in(lang, 'm.t', {
        shape: te.in(lang, `shape.${t.shape}`), peak: fmtNum(t.peak, 2, lang, true),
        conc: te.in(lang, concordant === null ? 'conc.na' : concordant ? 'conc.yes' : 'conc.no'), qrst: deg(qrst),
      }),
    );
  }
  const strip = (w: (WaveSummary & { samples?: Float32Array }) | null): WaveSummary | null =>
    w ? { peak: w.peak, area: w.area, shape: w.shape, meanH: w.meanH, angleDeg: w.angleDeg } : null;
  return { lead, p: strip(p), qrs, t: tw, sentences: S, text: joinSentences(lang, S) };
}

/** Mean direction of several lead vectors (used to explain which wall a lead group faces). */
export function meanLeadDirection(engine: SimEngine, leads: readonly LeadName[]): FrankVec {
  const m: [number, number, number] = [0, 0, 0];
  for (const l of leads) {
    const v = engine.projector.leadVector(l);
    const n = mag(v) || 1;
    for (let k = 0; k < 3; k++) m[k] += v[k] / n / leads.length;
  }
  return m;
}

/** dot(H, L) sign check used by tests and the quiz (independent of the explanation text). */
export const projectionSign = (h: FrankVec, l: FrankVec): number => Math.sign(dotF(h, l));

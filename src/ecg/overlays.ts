/**
 * Teaching overlays computed from the model truth (ecg.truth) — pure, unit-tested.
 *
 *  - Wave labels: P (F for flutter waves), the QRS components named per lead (q/Q, r/R, s/S, R′, QS — capital when
 *    ≥ 0.5 mV, the usual textbook convention), T, U, and δ (pre-excitation) / J (Osborn or early-repolarization J wave)
 *    when the truth flags them. Positions are the lead's own extremum inside the truth window of that wave, so a label
 *    always sits on the drawn deflection; T and U must be a real peak inside their window (not the window's edge, i.e.
 *    an ST segment or the tail of the T), otherwise that lead gets no T / U label.
 *  - Interval brackets: PR, QRS and QT of the representative (dominant) beat, from that beat's fiducials.
 *  - ST markers: J point and J + 60 ms with the ST deviation from the isoelectric (PR-segment) baseline; the value is
 *    truth.stMv[lead] when the truth provides it.
 */
import { sampleAt, type AtrialEvent, type BeatKind, type BeatMarks, type EcgSignal, type EcgTruth } from '../core/ecg';
import type { Lead } from '../core/leads';
import { leadArray } from './layout';
import type { Token } from './theme';

/** A component smaller than this is not named (mV). */
export const QRS_MIN_MV = 0.05;
/** Capital letter from this amplitude on (mV) — 5 mm at the standard gain. */
export const QRS_CAPITAL_MV = 0.5;
/** P / T / U deflections flatter than these are left unlabelled (mV). */
export const P_MIN_MV = 0.02;
export const T_MIN_MV = 0.03;
export const U_MIN_MV = 0.015;
/** ST is measured this long after the J point (ms). */
export const ST_OFFSET_MS = 60;

export type WaveTag = 'P' | 'F' | 'Q' | 'R' | 'S' | 'QS' | 'T' | 'U' | 'delta' | 'J';

export interface WaveLabel {
  readonly tag: WaveTag;
  /** text drawn (e.g. 'q', 'R′', 'δ') */
  readonly text: string;
  readonly t: number;
  /** true lead voltage at t (mV) */
  readonly mv: number;
  /** deflection relative to the baseline, in the displayed polarity (decides above / below placement) */
  readonly up: boolean;
  readonly color: Token;
  /** index into truth.beats (−1 for a non-conducted atrial wave) */
  readonly beat: number;
}

const PRIME = '′';
const WAVE_COLOR: Readonly<Record<WaveTag, Token>> = {
  P: 'c-atrial',
  F: 'c-atrial',
  Q: 'c-qrs',
  R: 'c-qrs',
  S: 'c-qrs',
  QS: 'c-qrs',
  delta: 'c-qrs',
  J: 'c-injury',
  T: 'c-repol',
  U: 'c-repol',
};

// ───────────────────────────────────────────────────────────────────────────── beats

/**
 * Start and end of a beat's measurable waves: P onset (or QRS onset) → T end. The U wave is not required, so a beat
 * whose U wave runs past a column edge is still the column's beat (its U label is simply clipped to the column).
 * A retrograde P wave after the QRS does not move the start.
 */
export function beatSpan(b: BeatMarks): [number, number] {
  return [Math.min(b.pOn ?? b.qrsOn, b.qrsOn), Math.max(b.tOff, b.pOff ?? b.tOff)];
}

/** The atrial activation that conducted to a beat (null when the truth does not say). */
export function conductingAtrial(truth: EcgTruth, beat: number): AtrialEvent | null {
  return truth.atrial.find((a) => a.conductedTo === beat) ?? null;
}

/** How early (ms) before a beat's P onset its atrial event may be stamped and still be that P wave. */
const P_EVENT_LEAD_MS = 40;

/** Is an atrial event the P wave of a beat (its time falls in the beat's P window)? */
const isBeatP = (a: AtrialEvent, b: BeatMarks): boolean => b.pOn !== null && b.pOff !== null && a.t >= b.pOn - P_EVENT_LEAD_MS && a.t <= b.pOff;

/**
 * The atrial wave drawn as a beat's P (pOn → pOff): the event that conducted the beat, else an atrial event inside that
 * P window — e.g. the retrograde P′ of a junctional beat, which is not "conducted to" the ventricles.
 */
export function beatAtrial(truth: EcgTruth, beat: number): AtrialEvent | null {
  const c = conductingAtrial(truth, beat);
  if (c) return c;
  const b = truth.beats[beat];
  return b ? (truth.atrial.find((a) => isBeatP(a, b)) ?? null) : null;
}

/**
 * How an atrial wave is named: sinus (and atrial-paced) P waves "P"; ectopic and retrograde atrial waves "P′" (the usual
 * textbook mark of a P wave that does not come from the sinus node); flutter waves "F"; fibrillatory waves are not
 * named (they are not discrete waves).
 */
export function atrialName(kind: AtrialEvent['kind'] | null): { tag: 'P' | 'F'; text: string } | null {
  switch (kind) {
    case 'fibrillation':
      return null;
    case 'flutter':
      return { tag: 'F', text: 'F' };
    case 'ectopic':
    case 'retrograde':
      return { tag: 'P', text: `P${PRIME}` };
    default:
      return { tag: 'P', text: 'P' };
  }
}

/** Most frequent kind among non-aberrant beats (ties: the earliest seen). */
export function dominantKind(truth: EcgTruth): BeatKind | null {
  const n = new Map<BeatKind, number>();
  for (const b of truth.beats) if (!b.aberrant) n.set(b.kind, (n.get(b.kind) ?? 0) + 1);
  let best: BeatKind | null = null, bn = 0;
  for (const [k, c] of n) if (c > bn) {
    best = k;
    bn = c;
  }
  return best;
}

/** Indices of beats whose waves lie entirely within [t0, t1]. */
export function beatsInWindow(truth: EcgTruth, t0: number, t1: number): number[] {
  const out: number[] = [];
  truth.beats.forEach((b, i) => {
    const [a, z] = beatSpan(b);
    if (a >= t0 && z <= t1) out.push(i);
  });
  return out;
}

/** Indices of beats with any wave inside [t0, t1] (a beat cut by a strip edge keeps the labels of its visible waves). */
export function beatsOverlapping(truth: EcgTruth, t0: number, t1: number): number[] {
  const out: number[] = [];
  truth.beats.forEach((b, i) => {
    const [a, z] = beatSpan(b);
    const end = Math.max(z, b.uOff ?? z);
    if (end >= t0 && a <= t1) out.push(i);
  });
  return out;
}

/**
 * The beat a panel uses for brackets, ST markers and single-beat labels: a beat of the dominant kind, conducted
 * normally, fully inside the window — the second such beat when there are three or more (away from the edge).
 */
export function representativeBeat(truth: EcgTruth, t0: number, t1: number): number | null {
  const inside = beatsInWindow(truth, t0, t1);
  const dom = dominantKind(truth);
  let c = inside.filter((i) => truth.beats[i].kind === dom && !truth.beats[i].aberrant);
  if (c.length === 0) c = inside.filter((i) => !truth.beats[i].aberrant);
  if (c.length === 0) c = inside;
  if (c.length === 0) return null;
  return c.length >= 3 ? c[1] : c[0];
}

// ───────────────────────────────────────────────────────────────────────────── per-lead measurements

function meanOver(a: Float32Array, fs: number, ta: number, tb: number): number {
  const i0 = Math.max(0, Math.round((ta * fs) / 1000));
  const i1 = Math.min(a.length - 1, Math.round((tb * fs) / 1000));
  if (i1 < i0) return sampleAt(a, fs, ta);
  let s = 0;
  for (let i = i0; i <= i1; i++) s += a[i];
  return s / (i1 - i0 + 1);
}

/** Isoelectric level of a beat in a lead (mV): the PR segment, or the 25–8 ms before QRS onset when there is none. */
export function isoBaseline(a: Float32Array, fs: number, b: BeatMarks): number {
  if (b.pOff !== null && b.qrsOn - b.pOff >= 14) return meanOver(a, fs, b.pOff + 4, b.qrsOn - 4);
  return meanOver(a, fs, b.qrsOn - 25, b.qrsOn - 8);
}

/**
 * Extremum of (v − base)·sign over [ta, tb]: sign 1 = highest, −1 = lowest, 0 = largest |deviation|.
 * Returns the time and true voltage, or null for an empty window.
 */
export function extremum(a: Float32Array, fs: number, ta: number, tb: number, base: number, sign: 1 | -1 | 0): { t: number; mv: number } | null {
  const i0 = Math.max(0, Math.ceil((ta * fs) / 1000));
  const i1 = Math.min(a.length - 1, Math.floor((tb * fs) / 1000));
  let best = -1, bv = -Infinity;
  for (let i = i0; i <= i1; i++) {
    const r = a[i] - base;
    const s = sign === 0 ? Math.abs(r) : sign * r;
    if (s > bv) {
      bv = s;
      best = i;
    }
  }
  return best < 0 ? null : { t: (best * 1000) / fs, mv: a[best] };
}

/**
 * The wave's own hump over [ta, tb]: among the interior local peaks of (v − base) — a local maximum above the baseline
 * or a local minimum below it — the one furthest from the baseline. Unlike `extremum` it never returns the window edge,
 * so the tail of the previous wave (a T wave still returning to the baseline at T end, an elevated ST segment running
 * into the T window) is not mistaken for the wave. Null when the window holds no hump.
 */
export function humpPeak(a: Float32Array, fs: number, ta: number, tb: number, base: number): { t: number; mv: number } | null {
  const i0 = Math.max(1, Math.ceil((ta * fs) / 1000) + 1);
  const i1 = Math.min(a.length - 2, Math.floor((tb * fs) / 1000) - 1);
  let best = -1, bv = 0;
  for (let i = i0; i <= i1; i++) {
    const r = a[i] - base, rp = a[i - 1] - base, rn = a[i + 1] - base;
    const peak = r > 0 ? r >= rp && r > rn : r < 0 && r <= rp && r < rn;
    if (peak && Math.abs(r) > bv) {
      bv = Math.abs(r);
      best = i;
    }
  }
  return best < 0 ? null : { t: (best * 1000) / fs, mv: a[best] };
}

export interface QrsComponent {
  readonly tag: 'Q' | 'R' | 'S' | 'QS';
  readonly text: string;
  readonly t: number;
  /** true lead voltage at the peak */
  readonly mv: number;
  /** amplitude from the baseline in the displayed polarity (mV, signed) */
  readonly amp: number;
}

/**
 * Names the QRS components of one lead between QRS onset and offset. `polarity` −1 names the inverted trace (−aVR).
 * Lobes are runs of one sign relative to the baseline; lobes under QRS_MIN_MV are ignored and neighbours of the same
 * sign merged. First negative lobe before any positive one = Q; positive lobes R, R′, R″; negative lobes after an R =
 * S, S′; no positive lobe at all = QS.
 */
export function qrsComponents(a: Float32Array, fs: number, qrsOn: number, qrsOff: number, base: number, polarity: 1 | -1 = 1): QrsComponent[] {
  const i0 = Math.max(0, Math.round((qrsOn * fs) / 1000));
  const i1 = Math.min(a.length - 1, Math.round((qrsOff * fs) / 1000));
  const dead = 0.01;
  interface Lobe { sign: 1 | -1; peak: number; i: number; start: number }
  const rel = (i: number) => (a[i] - base) * polarity;
  const lobes: Lobe[] = [];
  let cur: Lobe | null = null;
  for (let i = i0; i <= i1; i++) {
    const r = rel(i);
    const s: 0 | 1 | -1 = r > dead ? 1 : r < -dead ? -1 : 0;
    if (s === 0) continue;
    if (cur && cur.sign === s) {
      if (Math.abs(r) > Math.abs(cur.peak)) {
        cur.peak = r;
        cur.i = i;
      }
    } else {
      if (cur) lobes.push(cur);
      cur = { sign: s, peak: r, i, start: i };
    }
  }
  if (cur) lobes.push(cur);
  // The trace running into a displaced J point / ST segment (injury current) is not a wave: a last lobe still growing
  // when the QRS ends would turn ST elevation into an "r′" and ST depression into an "s′". Its peak is taken before
  // that terminal run instead — a wave that turned back first (e.g. an s merging into ST depression) keeps its name;
  // a lobe that only grows towards the end is dropped.
  const endTol = Math.max(1, Math.round((4 * fs) / 1000));
  const last = lobes[lobes.length - 1];
  if (last && lobes.length > 1 && last.i >= i1 - endTol) {
    const v = (i: number) => rel(i) * last.sign;
    let k = i1;
    while (k > last.start && v(k - 1) <= v(k)) k--;
    let best = -1;
    for (let i = last.start + 1; i < k; i++) if (v(i) >= v(i - 1) && v(i) > v(i + 1) && (best < 0 || v(i) > v(best))) best = i;
    if (best >= 0) {
      last.peak = rel(best);
      last.i = best;
    } else lobes.pop();
  }
  const kept: Lobe[] = [];
  for (const l of lobes) {
    if (Math.abs(l.peak) < QRS_MIN_MV) continue;
    const last = kept[kept.length - 1];
    if (last && last.sign === l.sign) {
      if (Math.abs(l.peak) > Math.abs(last.peak)) kept[kept.length - 1] = l;
    } else kept.push(l);
  }
  const mk = (tag: QrsComponent['tag'], letter: string, l: Lobe, primes: number): QrsComponent => {
    const big = Math.abs(l.peak) >= QRS_CAPITAL_MV;
    const text = tag === 'QS' ? 'QS' : (big ? letter.toUpperCase() : letter.toLowerCase()) + PRIME.repeat(primes);
    return { tag, text, t: (l.i * 1000) / fs, mv: a[l.i], amp: l.peak };
  };
  if (!kept.some((l) => l.sign === 1)) {
    if (kept.length === 0) return [];
    let deep = kept[0];
    for (const l of kept) if (l.peak < deep.peak) deep = l;
    return [mk('QS', 'QS', deep, 0)];
  }
  const out: QrsComponent[] = [];
  let rN = 0, sN = 0;
  kept.forEach((l, k) => {
    if (l.sign === -1 && k === 0) out.push(mk('Q', 'q', l, 0));
    else if (l.sign === 1) out.push(mk('R', 'r', l, rN++));
    else out.push(mk('S', 's', l, sN++));
  });
  return out;
}

/** Morphology string of a lead's QRS (e.g. 'rS', 'qR', 'rSR′', 'QS'). */
export const morphology = (c: readonly QrsComponent[]): string => c.map((x) => x.text).join('');

export interface OverlayFlags {
  /** pre-excitation: label the δ wave */
  readonly delta: boolean;
  /**
   * J-point patterns: Osborn waves / hypothermia, early repolarization and the Brugada patterns (whose terminal "r′" in
   * V1–V2 is J-point elevation, so the QRS namer does not call it a wave) — label J where the J point is displaced
   */
  readonly jWave: boolean;
}

export function overlayFlags(truth: EcgTruth): OverlayFlags {
  const f = truth.findings as readonly string[];
  return {
    delta: f.includes('wpw'),
    jWave: ['osborn-waves', 'hypothermia', 'early-repolarization', 'brugada-type1', 'brugada-type2'].some((x) => f.includes(x)),
  };
}

/** All wave labels of one beat in one lead (displayed polarity −1 for −aVR). */
export function beatLabels(sig: EcgSignal, truth: EcgTruth, beat: number, lead: Lead, polarity: 1 | -1 = 1, flags = overlayFlags(truth)): WaveLabel[] {
  const a = leadArray(sig, lead);
  const b = truth.beats[beat];
  if (!a || !b) return [];
  const fs = sig.fs;
  const base = isoBaseline(a, fs, b);
  const out: WaveLabel[] = [];
  const push = (tag: WaveTag, text: string, t: number, mv: number) =>
    out.push({ tag, text, t, mv, up: (mv - base) * polarity >= 0, color: WAVE_COLOR[tag], beat });

  const atrialWave = atrialName(beatAtrial(truth, beat)?.kind ?? null);
  if (atrialWave && b.pOn !== null && b.pOff !== null && b.pOff > b.pOn) {
    const e = extremum(a, fs, b.pOn, b.pOff, base, 0);
    if (e && Math.abs(e.mv - base) >= P_MIN_MV) push(atrialWave.tag, atrialWave.text, e.t, e.mv);
  }
  if (flags.delta) {
    const t = b.qrsOn + Math.min(20, (b.qrsOff - b.qrsOn) / 4);
    push('delta', 'δ', t, sampleAt(a, fs, t));
  }
  for (const c of qrsComponents(a, fs, b.qrsOn, b.qrsOff, base, polarity)) push(c.tag, c.text, c.t, c.mv);
  if (b.j > b.qrsOff + 2) {
    const e = extremum(a, fs, b.qrsOff - 5, b.j, base, 0);
    if (e) push('J', 'J', e.t, e.mv);
  } else if (flags.jWave) {
    // only in leads where the J point is visibly displaced (no "J" on a flat J point)
    const v = sampleAt(a, fs, b.j);
    if (Math.abs(v - base) >= QRS_MIN_MV) push('J', 'J', b.j, v);
  }
  const tStart = Math.max(b.j, b.qrsOff) + 40;
  if (b.tOff > tStart) {
    // the T wave's own peak. A trace that only slopes through the window — a depressed ST segment recovering to the
    // baseline, an elevated one running down into an isoelectric T — has no T peak to point at, so no label: the
    // window's edge would put "T" on the ST segment
    const e = humpPeak(a, fs, tStart, b.tOff, base);
    if (e && Math.abs(e.mv - base) >= T_MIN_MV) push('T', 'T', e.t, e.mv);
  }
  if (b.uOff !== null && b.uOff > b.tOff) {
    // only a real U hump — never the T wave's tail at T end
    const e = humpPeak(a, fs, b.tOff, b.uOff, base);
    if (e && Math.abs(e.mv - base) >= U_MIN_MV) push('U', 'U', e.t, e.mv);
  }
  return out;
}

/**
 * Labels of the visible atrial waves that no beat labels (blocked P waves, the non-conducted F waves of flutter, and a
 * conducted wave whose beat carries no P window) in [t0, t1]: P (F for flutter) at the lead's extremum in the 100 ms
 * after the activation. A wave that is a beat's own P — the conducted P, or a junctional beat's retrograde P′ — is
 * labelled with its beat, never twice.
 */
export function atrialLabels(sig: EcgSignal, truth: EcgTruth, lead: Lead, t0: number, t1: number, polarity: 1 | -1 = 1): WaveLabel[] {
  const a = leadArray(sig, lead);
  if (!a) return [];
  const out: WaveLabel[] = [];
  const hasP = (b: BeatMarks | undefined) => b !== undefined && b.pOn !== null && b.pOff !== null;
  for (const ev of truth.atrial) {
    if (!ev.visible || ev.kind === 'fibrillation') continue;
    if (ev.t < t0 || ev.t + 100 > t1) continue;
    if (ev.conductedTo !== null && hasP(truth.beats[ev.conductedTo])) continue;
    if (truth.beats.some((b) => isBeatP(ev, b))) continue;
    const base = meanOver(a, sig.fs, ev.t - 20, ev.t - 4);
    const e = extremum(a, sig.fs, ev.t, ev.t + 100, base, 0);
    if (!e || Math.abs(e.mv - base) < P_MIN_MV) continue;
    const name = atrialName(ev.kind);
    if (!name) continue;
    out.push({ tag: name.tag, text: name.text, t: e.t, mv: e.mv, up: (e.mv - base) * polarity >= 0, color: WAVE_COLOR[name.tag], beat: -1 });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────── brackets & ST

export interface IntervalBracket {
  readonly kind: 'PR' | 'QRS' | 'QT';
  readonly t0: number;
  readonly t1: number;
  readonly ms: number;
  readonly color: Token;
}

/**
 * PR, QRS and QT brackets of a beat. PR only when the beat's P wave precedes the QRS — a retrograde P before the QRS
 * gives the short P′R of a junctional rhythm, one after the QRS gives none — and never for flutter or fibrillation
 * waves (`atrial` = the kind of the atrial wave that conducted the beat, if known).
 */
export function intervalBrackets(b: BeatMarks, atrial: AtrialEvent['kind'] | null = null): IntervalBracket[] {
  const out: IntervalBracket[] = [];
  const pWave = atrial !== 'flutter' && atrial !== 'fibrillation';
  if (b.pOn !== null && b.pOn < b.qrsOn && pWave) out.push({ kind: 'PR', t0: b.pOn, t1: b.qrsOn, ms: b.qrsOn - b.pOn, color: 'c-conduction' });
  out.push({ kind: 'QRS', t0: b.qrsOn, t1: b.qrsOff, ms: b.qrsOff - b.qrsOn, color: 'c-qrs' });
  out.push({ kind: 'QT', t0: b.qrsOn, t1: b.tOff, ms: b.tOff - b.qrsOn, color: 'c-repol' });
  return out;
}

export interface StMeasure {
  readonly j: number;
  readonly j60: number;
  /** isoelectric level (true mV) */
  readonly baseline: number;
  readonly jMv: number;
  readonly j60Mv: number;
  /** ST deviation at J + 60 ms (true lead mV, + = elevation) */
  readonly stMv: number;
  readonly fromTruth: boolean;
}

/** ST elevation drawn as notable (mV): 0.1 in most leads, 0.2 in V2–V3; depression from 0.05 mV. */
export const ST_NOTABLE = { up: 0.1, upV2V3: 0.2, down: 0.05 } as const;

/**
 * Is an ST deviation (true lead mV, + = elevation) drawn in the injury colour? The thresholds follow the usual adult
 * criteria — elevation ≥ 0.1 mV, but ≥ 0.2 mV in V2–V3 where smaller elevation is common in healthy (male) hearts;
 * depression ≥ 0.05 mV — so a normal tracing is not painted as ischaemic. A visual cue only: the criteria proper are
 * read at the J point, in two contiguous leads, and depend on age and sex.
 */
export function stNotable(lead: Lead, stMv: number): boolean {
  const up = lead === 'V2' || lead === 'V3' ? ST_NOTABLE.upV2V3 : ST_NOTABLE.up;
  return stMv >= up - 1e-9 || stMv <= -ST_NOTABLE.down + 1e-9;
}

export function stMeasure(sig: EcgSignal, truth: EcgTruth, beat: number, lead: Lead): StMeasure | null {
  const a = leadArray(sig, lead);
  const b = truth.beats[beat];
  if (!a || !b) return null;
  const baseline = isoBaseline(a, sig.fs, b);
  const j = b.j, j60 = b.j + ST_OFFSET_MS;
  const jMv = sampleAt(a, sig.fs, j), j60Mv = sampleAt(a, sig.fs, j60);
  const tv = (truth.stMv as Readonly<Partial<Record<Lead, number>>>)[lead];
  return { j, j60, baseline, jMv, j60Mv, stMv: tv ?? j60Mv - baseline, fromTruth: tv !== undefined };
}

/**
 * Laddergram layout from the model's truth (ecg.truth.atrial + ecg.truth.beats). Three tiers stacked vertically in
 * "ladder units": A = [0, 1], AV = [1, 2], V = [2, 3]; x is time in ms (same axis as the ECG strip).
 *
 * Conventions (classic Lewis ladder diagram):
 * - Sinus / flutter / paced atrial activation: a line from the top of A, slightly slanted (atrial spread).
 * - Ectopic atrial or ventricular origin: a dot inside its tier, with lines spreading out of it.
 * - AV conduction: a slanted line from the bottom of A to the top of V at QRS onset; its slope is the AV conduction
 *   time, labelled in ms (P onset → QRS onset).
 * - A blocked impulse: the AV line stops half-way with a short perpendicular bar.
 * - Retrograde atrial activation: drawn upwards from the junctional / ventricular origin into A.
 *
 * Timing assumption: `AtrialEvent.t` is not specified as P onset or P peak in the contract. For conducted events we use
 * the linked beat's `pOn`; for the others we shift `t` by the median (t − pOn) observed on linked events, so every
 * A-tier mark refers to P onset either way.
 */
import type { AtrialEvent, BeatMarks, EcgTruth } from '../../core/ecg';

export type LadderSegKind = 'atrial' | 'antegrade' | 'blocked' | 'retrograde' | 'ventricular' | 'fib';

export interface LadderSegment {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly kind: LadderSegKind;
  /** conducted with aberrancy (drawn dashed) */
  readonly aberrant?: boolean;
}

export interface LadderMark {
  readonly t: number;
  readonly y: number;
  readonly kind: 'block' | 'origin' | 'pace';
}

export interface LadderLabel {
  readonly t: number;
  readonly y: number;
  /** AV conduction time (ms) */
  readonly ms: number;
}

export interface LadderLayout {
  readonly t0: number;
  readonly t1: number;
  readonly segments: readonly LadderSegment[];
  readonly marks: readonly LadderMark[];
  readonly labels: readonly LadderLabel[];
  /** indices of beats shown */
  readonly beats: readonly number[];
  /** indices of atrial events shown */
  readonly atrial: readonly number[];
}

export interface LadderOptions {
  readonly maxBeats?: number;
  /** fallback AV conduction time when the truth has none (ms) */
  readonly typicalPrMs?: number;
}

/** atrial spread drawn across the A tier (ms) */
export const A_SPREAD = 30;

type TruthLike = Pick<EcgTruth, 'atrial' | 'beats' | 'prMs'>;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const CONDUCTED_KINDS: ReadonlySet<BeatMarks['kind']> = new Set(['sinus', 'atrial', 'capture', 'fusion', 'paced-atrial']);

/** P-onset time of each atrial event (see the timing assumption above). */
export function atrialOnsets(truth: TruthLike): number[] {
  const offsets: number[] = [];
  for (const ev of truth.atrial) {
    const b = ev.conductedTo != null ? truth.beats[ev.conductedTo] : undefined;
    if (b && b.pOn != null) offsets.push(ev.t - b.pOn);
  }
  const off = median(offsets);
  return truth.atrial.map((ev) => {
    const b = ev.conductedTo != null ? truth.beats[ev.conductedTo] : undefined;
    return b && b.pOn != null ? b.pOn : ev.t - off;
  });
}

/** Synthesize atrial events from P onsets when the truth carries none (e.g. partial truth). */
function effectiveAtrial(truth: TruthLike): AtrialEvent[] {
  if (truth.atrial.length) return truth.atrial.slice();
  const out: AtrialEvent[] = [];
  truth.beats.forEach((b, i) => {
    if (b.pOn != null) out.push({ t: b.pOn, kind: 'sinus', conductedTo: i, visible: true });
  });
  return out;
}

export function buildLadder(truthIn: TruthLike, opts: LadderOptions = {}): LadderLayout {
  const truth: TruthLike = { ...truthIn, atrial: effectiveAtrial(truthIn) };
  const beats = truth.beats;
  const maxBeats = Math.max(1, opts.maxBeats ?? 8);
  const pr = opts.typicalPrMs ?? truth.prMs ?? 160;
  const onsets = atrialOnsets(truth);

  const shownBeats: number[] = [];
  for (let i = 0; i < beats.length && shownBeats.length < maxBeats; i++) shownBeats.push(i);

  let t0: number;
  let t1: number;
  if (shownBeats.length) {
    const first = beats[shownBeats[0]];
    const last = beats[shownBeats[shownBeats.length - 1]];
    t0 = Math.min(first.pOn ?? first.qrsOn - 250, first.qrsOn - 250);
    t1 = Math.max(last.tOff, last.qrsOn + 300);
    // include a leading atrial event that belongs to the first shown beat or precedes it closely
    for (let k = 0; k < onsets.length; k++) if (onsets[k] < t0 && onsets[k] > t0 - 400) t0 = onsets[k];
    t0 -= 60;
    t1 += 60;
  } else {
    t0 = onsets.length ? onsets[0] - 100 : 0;
    t1 = onsets.length ? onsets[Math.min(onsets.length - 1, maxBeats * 2)] + 600 : 1000;
  }

  const segments: LadderSegment[] = [];
  const marks: LadderMark[] = [];
  const labels: LadderLabel[] = [];
  const shownAtrial: number[] = [];
  const linked = new Set<number>();

  truth.atrial.forEach((ev, k) => {
    const tA = onsets[k];
    if (tA < t0 || tA > t1) return;
    shownAtrial.push(k);
    switch (ev.kind) {
      case 'fibrillation':
        segments.push({ x0: tA, y0: 0.2, x1: tA + 14, y1: 0.8, kind: 'fib' });
        break;
      case 'retrograde':
        segments.push({ x0: tA, y0: 1, x1: tA + A_SPREAD, y1: 0, kind: 'retrograde' });
        break;
      case 'ectopic':
        marks.push({ t: tA, y: 0.45, kind: 'origin' });
        segments.push({ x0: tA, y0: 0.45, x1: tA + 14, y1: 0, kind: 'atrial' });
        segments.push({ x0: tA, y0: 0.45, x1: tA + A_SPREAD, y1: 1, kind: 'atrial' });
        break;
      case 'paced':
        marks.push({ t: tA, y: 0, kind: 'pace' });
        segments.push({ x0: tA, y0: 0, x1: tA + A_SPREAD, y1: 1, kind: 'atrial' });
        break;
      default:
        segments.push({ x0: tA, y0: 0, x1: tA + A_SPREAD, y1: 1, kind: 'atrial' });
    }
    if (ev.kind === 'retrograde') return;
    const bi = ev.conductedTo;
    if (bi != null && beats[bi]) {
      const b = beats[bi];
      if (b.qrsOn > t1 + 1) return;
      linked.add(bi);
      segments.push({ x0: tA + A_SPREAD, y0: 1, x1: b.qrsOn, y1: 2, kind: 'antegrade', aberrant: b.aberrant });
      if (ev.kind !== 'fibrillation') labels.push({ t: (tA + A_SPREAD + b.qrsOn) / 2, y: 1.5, ms: Math.round(b.qrsOn - tA) });
    } else if (ev.kind !== 'fibrillation') {
      // blocked: stop half-way through the AV tier
      const xm = tA + A_SPREAD + Math.max(40, pr - A_SPREAD) / 2;
      segments.push({ x0: tA + A_SPREAD, y0: 1, x1: xm, y1: 1.5, kind: 'blocked' });
      marks.push({ t: xm, y: 1.5, kind: 'block' });
    }
  });

  for (const bi of shownBeats) {
    const b = beats[bi];
    const on = b.qrsOn;
    switch (b.kind) {
      case 'ventricular':
      case 'escape-ventricular':
        marks.push({ t: on, y: 2.5, kind: 'origin' });
        segments.push({ x0: on, y0: 2.5, x1: on + 35, y1: 2, kind: 'ventricular' });
        segments.push({ x0: on, y0: 2.5, x1: on + 45, y1: 3, kind: 'ventricular' });
        break;
      case 'junctional':
      case 'escape-junctional': {
        const tj = on - 25;
        marks.push({ t: tj, y: 1.6, kind: 'origin' });
        segments.push({ x0: tj, y0: 1.6, x1: on, y1: 2, kind: 'antegrade' });
        segments.push({ x0: on, y0: 2, x1: on + 40, y1: 3, kind: 'ventricular', aberrant: b.aberrant });
        break;
      }
      case 'paced-ventricular':
        marks.push({ t: on, y: 2, kind: 'pace' });
        segments.push({ x0: on, y0: 2, x1: on + 50, y1: 3, kind: 'ventricular' });
        break;
      default: {
        segments.push({ x0: on, y0: 2, x1: on + 40, y1: 3, kind: 'ventricular', aberrant: b.aberrant });
        if (!linked.has(bi) && CONDUCTED_KINDS.has(b.kind)) {
          // conducted beat without an explicit link: use the nearest preceding atrial event (≥ 60 ms before)
          let best = -1;
          for (let k = 0; k < onsets.length; k++) {
            const ev = truth.atrial[k];
            if (ev.kind === 'retrograde') continue;
            if (onsets[k] <= on - 60 && onsets[k] >= on - 600 && (best < 0 || onsets[k] > onsets[best])) best = k;
          }
          if (best >= 0) {
            const tA = onsets[best];
            segments.push({ x0: tA + A_SPREAD, y0: 1, x1: on, y1: 2, kind: 'antegrade', aberrant: b.aberrant });
            if (truth.atrial[best].kind !== 'fibrillation') labels.push({ t: (tA + A_SPREAD + on) / 2, y: 1.5, ms: Math.round(on - tA) });
          }
        }
      }
    }
  }

  // retrograde conduction: from the originating junctional/ventricular beat up through AV
  truth.atrial.forEach((ev, k) => {
    if (ev.kind !== 'retrograde') return;
    const tA = onsets[k];
    if (tA < t0 || tA > t1) return;
    let origin = -1;
    for (const bi of shownBeats) {
      const b = beats[bi];
      if (b.qrsOn >= tA - 400 && b.qrsOn <= tA + 120 && (origin < 0 || Math.abs(b.qrsOn - tA) < Math.abs(beats[origin].qrsOn - tA))) origin = bi;
    }
    if (origin < 0) return;
    const b = beats[origin];
    if (b.kind === 'junctional' || b.kind === 'escape-junctional') segments.push({ x0: b.qrsOn - 25, y0: 1.6, x1: tA, y1: 1, kind: 'retrograde' });
    else segments.push({ x0: b.qrsOn + 30, y0: 2, x1: tA, y1: 1, kind: 'retrograde' });
  });

  return { t0, t1, segments, marks, labels, beats: shownBeats, atrial: shownAtrial };
}

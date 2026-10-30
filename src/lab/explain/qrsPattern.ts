/**
 * Names the deflections of one lead's QRS from its projected samples (Q = negative before any positive, R = positive,
 * S = negative after a positive; lower case when the wave is under half of the complex's largest deflection).
 * Pure measurement of the projected trace — nothing is drawn or assumed per lead.
 */
import { ISO_MV } from './vector';

export type WaveLetter = 'Q' | 'R' | 'S' | 'QS';

export interface WaveRun {
  readonly letter: WaveLetter;
  /** 0 for the first R / S, 1 for R′ / S′. */
  readonly order: number;
  readonly sign: 1 | -1;
  /** Inclusive sample indices. */
  readonly i0: number;
  readonly i1: number;
  /** Signed extreme value (mV). */
  readonly peak: number;
  readonly small: boolean;
}

/**
 * @param samples lead voltage over the QRS window (1 sample per ms)
 * @param minLen  runs shorter than this many samples are treated as noise
 */
export function qrsRuns(samples: ArrayLike<number>, iso = ISO_MV, minLen = 3): WaveRun[] {
  const raw: { sign: 1 | -1; i0: number; i1: number; peak: number }[] = [];
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    const s = v > iso ? 1 : v < -iso ? -1 : 0;
    if (s === 0) continue;
    const last = raw[raw.length - 1];
    if (last && last.sign === s && last.i1 === i - 1) {
      last.i1 = i;
      if (Math.abs(v) > Math.abs(last.peak)) last.peak = v;
    } else raw.push({ sign: s, i0: i, i1: i, peak: v });
  }
  // drop noise, then merge neighbours of equal sign separated only by the dropped bits / iso samples
  const kept: typeof raw = [];
  for (const r of raw) {
    if (r.i1 - r.i0 + 1 < minLen) continue;
    const last = kept[kept.length - 1];
    if (last && last.sign === r.sign) {
      last.i1 = r.i1;
      if (Math.abs(r.peak) > Math.abs(last.peak)) last.peak = r.peak;
    } else kept.push({ ...r });
  }
  const maxAbs = kept.reduce((m, r) => Math.max(m, Math.abs(r.peak)), 0);
  const anyPositive = kept.some((r) => r.sign > 0);
  let rCount = 0, sCount = 0, seenPositive = false;
  return kept.map((r) => {
    let letter: WaveLetter, order = 0;
    if (r.sign > 0) {
      letter = 'R';
      order = rCount++;
      seenPositive = true;
    } else if (!anyPositive) letter = 'QS';
    else if (!seenPositive) letter = 'Q';
    else {
      letter = 'S';
      order = sCount++;
    }
    return { letter, order, sign: r.sign, i0: r.i0, i1: r.i1, peak: r.peak, small: Math.abs(r.peak) < 0.5 * maxAbs };
  });
}

/** Display letter of a run: "q", "R", "s", "R′", "QS". */
export function runLabel(r: WaveRun): string {
  if (r.letter === 'QS') return 'QS';
  const l = r.small ? r.letter.toLowerCase() : r.letter;
  return r.order > 0 ? `${l}′` : l;
}

/** Whole-complex pattern, e.g. "qRs", "rS", "QS"; "—" when the lead is flat. */
export function patternString(runs: readonly WaveRun[]): string {
  if (runs.length === 0) return '—';
  if (runs.every((r) => r.letter === 'QS')) return 'QS';
  return runs.map(runLabel).join('');
}

/** The run that contains sample index i, if any. */
export const runAt = (runs: readonly WaveRun[], i: number): WaveRun | null => runs.find((r) => i >= r.i0 && i <= r.i1) ?? null;

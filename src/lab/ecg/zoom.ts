/**
 * Zoom of a single-lead detail strip. The student chooses how many beats the strip shows — "standard" (25 mm/s, as
 * many beats as fit), 4, 2 or 1 beat — and the strip spreads that time over its whole width, so one beat can fill the
 * box and the P wave, PR segment, QRS notches, J point and T wave separate. The effective paper speed follows from the
 * box size and is shown in the scale label (the grid stays 1 mm / 5 mm, so a small square is worth fewer ms when
 * zoomed). The gain (5 / 10 / 20 mm/mV) scales the amplitude; the calibration pulse always shows 1 mV at that gain.
 * Pure helpers (no DOM) so they are unit-tested; each LeadDetail owns one zoom signal.
 */
import { signal } from '@preact/signals';
import type { Signal } from '@preact/signals';

/** Beats shown; 0 = standard paper speed (25 mm/s), as many beats as fit. Ordered from zoomed out to zoomed in. */
export const BEAT_LEVELS = [0, 4, 2, 1] as const;
export const GAINS = [5, 10, 20] as const;
export type Beats = (typeof BEAT_LEVELS)[number];
export type Gain = (typeof GAINS)[number];

export interface StripZoom {
  readonly beats: Beats;
  readonly gain: Gain;
}

/** The clinical standard (rhythm strips, 12-lead sheet). */
export const STANDARD_ZOOM: StripZoom = { beats: 0, gain: 10 };
/** Detail strips open on two beats, each spread wide enough to read its waves. */
export const DETAIL_ZOOM: StripZoom = { beats: 2, gain: 10 };

export const createZoom = (z: StripZoom = DETAIL_ZOOM): Signal<StripZoom> => signal(z);

/** One level in (dir 1: fewer beats) or out (−1: more beats); stays at the ends. */
export function stepZoom(z: StripZoom, dir: 1 | -1): StripZoom {
  const i = BEAT_LEVELS.indexOf(z.beats);
  const j = Math.min(BEAT_LEVELS.length - 1, Math.max(0, i + dir));
  return j === i ? z : { ...z, beats: BEAT_LEVELS[j]! };
}
export const canStep = (z: StripZoom, dir: 1 | -1): boolean => stepZoom(z, dir) !== z;

/** Vertical factor relative to 10 mm/mV. */
export const gainFactor = (z: StripZoom): number => z.gain / 10;

const MM_PER_MS = 25 / 1000;

/** Time window (ms) of a standard 25 mm/s strip with `traceMm` of trace: rounded down to 100 ms, within [min, max]. */
export function windowForTraceMm(traceMm: number, minMs = 1500, maxMs = 10000): number {
  return Math.min(maxMs, Math.max(minMs, Math.floor(traceMm / MM_PER_MS / 100) * 100));
}

export interface StripScale {
  /** Time shown across the trace (ms). */
  readonly windowMs: number;
  /** Horizontal stretch relative to 25 mm/s (effective paper speed = 25 · kx mm/s). */
  readonly kx: number;
}

/**
 * Window and horizontal stretch of a detail strip.
 * - fill (`traceMm` given: the box's trace width in paper mm at 25 mm/s): standard → as much time as fits at 25 mm/s;
 *   n beats → n·RR spread over the whole width.
 * - natural size (`traceMm` null; the strip sets its own aspect): standard → 3 beats at 25 mm/s; n beats → n·RR drawn
 *   as wide as 3 standard beats.
 */
export function stripScale(z: StripZoom, rrMs: number, traceMm: number | null): StripScale {
  const rr = Math.min(2000, Math.max(300, rrMs));
  if (traceMm !== null) {
    if (z.beats === 0) return { windowMs: windowForTraceMm(traceMm), kx: 1 };
    const windowMs = z.beats * rr;
    return { windowMs, kx: Math.max(0.25, traceMm / (windowMs * MM_PER_MS)) };
  }
  const std = Math.min(6000, Math.max(1500, Math.round((3 * rr) / 100) * 100));
  if (z.beats === 0) return { windowMs: std, kx: 1 };
  const windowMs = z.beats * rr;
  return { windowMs, kx: std / windowMs };
}

/** Effective paper speed (mm/s), rounded for display. */
export const speedOf = (kx: number): number => Math.round(25 * kx);

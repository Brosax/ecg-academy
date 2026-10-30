/**
 * ECG paper arithmetic. Standard recording: 25 mm/s and 10 mm/mV, so one small square (1 mm) = 0.04 s horizontally and
 * 0.1 mV vertically; one large square (5 mm) = 0.2 s and 0.5 mV. The calibration pulse is 1 mV high (10 mm at standard
 * gain) and usually 0.2 s wide.
 */
export const SPEEDS = [25, 50] as const;
export type Speed = (typeof SPEEDS)[number];
export const GAINS = [5, 10, 20] as const;
export type Gain = (typeof GAINS)[number];

/** Seconds represented by `mm` millimetres at a paper speed (mm/s). */
export function secondsPerMm(speed: number): number {
  return 1 / speed;
}

/** Millivolts represented by one millimetre at a gain (mm/mV). */
export function mvPerMm(gain: number): number {
  return 1 / gain;
}

export function mmFromMs(ms: number, speed: number): number {
  return (ms * speed) / 1000;
}

export function mmFromMv(mv: number, gain: number): number {
  return mv * gain;
}

export interface SquareValues {
  /** small square (1 mm): seconds and millivolts */
  readonly smallS: number;
  readonly smallMv: number;
  /** large square (5 mm) */
  readonly largeS: number;
  readonly largeMv: number;
}

export function squareValues(speed: number, gain: number): SquareValues {
  return { smallS: 1 / speed, smallMv: 1 / gain, largeS: 5 / speed, largeMv: 5 / gain };
}

/** Calibration pulse: 1 mV high, 200 ms wide → size in mm. */
export function calibrationPulse(speed: number, gain: number, widthMs = 200): { readonly widthMm: number; readonly heightMm: number } {
  return { widthMm: mmFromMs(widthMs, speed), heightMm: mmFromMv(1, gain) };
}

export interface RrBracket {
  /** y of the horizontal R–R line (mm) */
  readonly lineY: number;
  /** baseline of the label (mm) */
  readonly textY: number;
  /** the two ends of the vertical ticks at each R (mm) */
  readonly tick: readonly [number, number];
  readonly above: boolean;
}

/**
 * Where to draw the R–R bracket on a strip `height` mm tall whose trace spans [traceTop, traceBottom] (mm, y down):
 * above the R peaks when there is room for the bracket and its label (`textMm` tall), otherwise below the deepest
 * point of the trace (at 20 mm/mV the R wave reaches the top of the strip).
 */
export function rrBracket(traceTop: number, traceBottom: number, height: number, textMm = 1.35): RrBracket {
  const margin = 0.3;
  // above: line 1.8 mm over the peak, label baseline 0.6 mm over the line, glyphs ≈ 0.75 × size above the baseline
  const aboveLine = traceTop - 1.8;
  if (aboveLine - 0.6 - 0.75 * textMm >= margin) {
    return { lineY: aboveLine, textY: aboveLine - 0.6, tick: [aboveLine + 0.8, aboveLine - 0.8], above: true };
  }
  // below: label baseline under the line, descenders ≈ 0.25 × size below the baseline
  const below = 0.6 + 0.75 * textMm;
  const lineY = Math.min(traceBottom + 1.8, height - below - 0.25 * textMm - margin);
  return { lineY, textY: lineY + below, tick: [lineY - 0.8, lineY + 0.8], above: false };
}

/** Format seconds the way a learner writes them on paper (0.04, 0.2, 0.02…). */
export function fmtSeconds(s: number): string {
  return String(Math.round(s * 1000) / 1000);
}

/** Format millivolts (0.1, 0.05, 0.5, 0.25…). */
export function fmtMv(mv: number): string {
  const r = Math.round(mv * 1000) / 1000;
  return String(r);
}

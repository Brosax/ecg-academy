/**
 * ECG paper geometry — pure (no DOM). Standard paper: 1 mm minor / 5 mm major squares; paper speed 25 or 50 mm/s
 * (one small square = 40 or 20 ms); gain 5 / 10 / 20 mm/mV (one small square = 0.2 / 0.1 / 0.05 mV).
 * The calibration pulse is a 1 mV step lasting 200 ms, so its height shows the gain and its width the speed.
 */

export type Speed = 25 | 50;
export type Gain = 5 | 10 | 20;

export const SPEEDS = [25, 50] as const satisfies readonly Speed[];
export const GAINS = [5, 10, 20] as const satisfies readonly Gain[];

export const PAPER = {
  minorMm: 1,
  majorMm: 5,
  /** calibration pulse: 1 mV for 200 ms */
  calMv: 1,
  calMs: 200,
} as const;

/** mm of paper per ms of time at a speed (mm/s). */
export const mmPerMs = (speed: number): number => speed / 1000;
export const msToMm = (ms: number, speed: number): number => (ms * speed) / 1000;
export const mmToMs = (mm: number, speed: number): number => (mm * 1000) / speed;
export const mvToMm = (mv: number, gain: number): number => mv * gain;
export const mmToMv = (mm: number, gain: number): number => mm / gain;

/** Duration of one small (1 mm) square, ms: 40 at 25 mm/s, 20 at 50 mm/s. */
export const msPerSmallSquare = (speed: number): number => 1000 / speed;
/** Voltage of one small (1 mm) square, mV: 0.1 at 10 mm/mV. */
export const mvPerSmallSquare = (gain: number): number => 1 / gain;

/** Round up to the next whole major square (5 mm). */
export const ceilMajor = (mm: number): number => Math.ceil(mm / PAPER.majorMm - 1e-9) * PAPER.majorMm + 0; // + 0: never −0

/**
 * Which grid levels are legible at this scale (CSS px per mm × dpr). Minor lines closer than 3 device px merge into a
 * flat tint, so they are dropped; major lines need ≥ 4 device px.
 */
export function gridLevels(pxPerMm: number, dpr: number): { minor: boolean; major: boolean } {
  const dev = pxPerMm * dpr;
  return { minor: dev * PAPER.minorMm >= 3, major: dev * PAPER.majorMm >= 4 };
}

/**
 * Grid line positions (device px, offset by 0.5 for crisp 1-px lines) along one axis: lines at originPx + i·stepPx for
 * every integer i inside [0, lengthPx]. `major` flags every 5th line counted from the origin.
 */
export function gridLines(originPx: number, stepPx: number, lengthPx: number): { pos: number; major: boolean }[] {
  const out: { pos: number; major: boolean }[] = [];
  if (!(stepPx > 0)) return out;
  const iStart = Math.ceil((0 - originPx) / stepPx);
  const iEnd = Math.floor((lengthPx - originPx) / stepPx);
  for (let i = iStart; i <= iEnd; i++) out.push({ pos: Math.round(originPx + i * stepPx) + 0.5, major: ((i % 5) + 5) % 5 === 0 });
  return out;
}

/** Largest CSS px per mm such that a widthMm × heightMm sheet fits a cssW × cssH box (height ≤ 0: width only). */
export function fitPxPerMm(cssW: number, cssH: number, widthMm: number, heightMm: number): number {
  if (cssW <= 0 || widthMm <= 0) return 0;
  const byW = cssW / widthMm;
  if (cssH <= 0 || heightMm <= 0) return byW;
  return Math.min(byW, cssH / heightMm);
}

/** Smallest CSS px per mm a fitted sheet is drawn at: below it waves and labels merge, so narrower boxes scroll. */
export const MIN_FIT_PX_PER_MM = 2.2;

/** CSS size rules of the paper box (CSS px; aspect = width / height). */
export interface PaperBox {
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly aspect?: number;
}

/**
 * How big the paper box is:
 *  - a fixed `height`: that height, at least as wide as the sheet needs to keep a readable scale (MIN_FIT_PX_PER_MM, or
 *    the scale the height allows when that is smaller — a wider box would only add empty paper);
 *  - a calibrated screen (`pxPerMm`): the sheet at true physical size;
 *  - otherwise: the container width with the sheet's proportions, never narrower than the readable scale.
 * A box wider than its container scrolls sideways inside the viewer (phones), never widening the page.
 */
export function paperBox(widthMm: number, heightMm: number, height: number | undefined, pxPerMm: number | null): PaperBox {
  const w = Math.max(1, widthMm), h = Math.max(1, heightMm);
  if (height) return { height, minWidth: Math.round(w * Math.min(MIN_FIT_PX_PER_MM, height / h)) };
  if (pxPerMm) return { width: w * pxPerMm, height: h * pxPerMm };
  return { aspect: w / h, minWidth: Math.round(w * MIN_FIT_PX_PER_MM) };
}

/** Width (mm) of the pulse zone at the start of each row: 1 mm lead-in + pulse + margin, rounded to a major square. */
export function calZoneMm(speed: number): number {
  return ceilMajor(msToMm(PAPER.calMs, speed) + 4);
}

/**
 * Calibration pulse polyline (sheet mm, y down) for a row. `stepsMm` are the pulse heights in mm, drawn one after the
 * other with equal widths: [10] = a plain 1 mV pulse at 10 mm/mV; [10, 5] = the stepped pulse printed when the chest
 * leads run at half gain (limb part, then chest part).
 */
export function calibrationPulseMm(xMm: number, baselineMm: number, speed: number, stepsMm: readonly number[]): [number, number][] {
  const w = msToMm(PAPER.calMs, speed);
  const x0 = xMm + 1;
  const pts: [number, number][] = [[xMm, baselineMm], [x0, baselineMm]];
  const n = Math.max(1, stepsMm.length);
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const h = stepsMm[i] ?? 0;
    pts.push([x0 + i * sw, baselineMm - h], [x0 + (i + 1) * sw, baselineMm - h]);
  }
  pts.push([x0 + w, baselineMm], [x0 + w + 1, baselineMm]);
  return pts;
}

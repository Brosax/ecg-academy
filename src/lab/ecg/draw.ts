/**
 * Shared 2D drawing helpers for the ECG paper and traces. All coordinates are device px on unscaled contexts so grid
 * lines stay crisp (§8b: odd-width lines at half-pixel offsets).
 */
import type { ThemeColors } from '../app/theme';
import { font, scratchBuf } from './canvas';
import { decimatedCapacity, decimateMinMax } from './decimate';
import { calibrationPulseMm, gridLevels, gridLines, mvToMm, PAPER } from './paper';
import type { RingCache } from './sampler';

/** Paper placement: CSS px per mm, device-pixel ratio, and the device-px position of sheet mm (0, 0). */
export interface PaperFrame {
  readonly pxPerMm: number;
  readonly dpr: number;
  readonly ox: number;
  readonly oy: number;
}

export const devPerMm = (f: PaperFrame): number => f.pxPerMm * f.dpr;
export const mmX = (f: PaperFrame, mm: number): number => f.ox + mm * f.pxPerMm * f.dpr;
export const mmY = (f: PaperFrame, mm: number): number => f.oy + mm * f.pxPerMm * f.dpr;
/** Device px per mV and per ms at the paper scale. */
export const devPerMv = (f: PaperFrame): number => PAPER.mmPerMv * devPerMm(f);
export const devPerMs = (f: PaperFrame): number => (PAPER.mmPerS / 1000) * devPerMm(f);

/** Paper background with 1 mm / 5 mm grid aligned to the sheet origin. */
export function drawPaper(ctx: CanvasRenderingContext2D, w: number, h: number, f: PaperFrame, c: ThemeColors): void {
  ctx.fillStyle = c['ecg-paper'];
  ctx.fillRect(0, 0, w, h);
  const step = devPerMm(f);
  const lv = gridLevels(f.pxPerMm, f.dpr);
  const xs = gridLines(f.ox, step, w), ys = gridLines(f.oy, step, h);
  if (lv.minor) {
    ctx.strokeStyle = c['ecg-grid-minor'];
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const l of xs) if (!l.major) { ctx.moveTo(l.pos, 0); ctx.lineTo(l.pos, h); }
    for (const l of ys) if (!l.major) { ctx.moveTo(0, l.pos); ctx.lineTo(w, l.pos); }
    ctx.stroke();
  }
  if (lv.major) {
    const lw = f.dpr >= 2 ? 2 : 1;
    const adj = lw % 2 === 0 ? -0.5 : 0; // even widths sit on whole pixels
    ctx.strokeStyle = c['ecg-grid-major'];
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (const l of xs) if (l.major) { ctx.moveTo(l.pos + adj, 0); ctx.lineTo(l.pos + adj, h); }
    for (const l of ys) if (l.major) { ctx.moveTo(0, l.pos + adj); ctx.lineTo(w, l.pos + adj); }
    ctx.stroke();
  }
}

/** Caption drawn above the calibration pulse ("1 mV"), in the label colour with a halo in the paper colour. */
export interface CalPulseLabel {
  readonly text: string;
  readonly color: string;
  readonly paperColor: string;
}

/** Below this scale (CSS px per mm) the 9 px caption would be unreadable, so it is skipped. */
const CAL_LABEL_MIN_PX_PER_MM = 2.2;

/**
 * 1 mV calibration pulse for a row (baseline in sheet mm), starting 1 mm into the reserved area at xMm0; `heightMm` is
 * 1 mV at the row's gain (a strip at 20 mm/mV draws a 20 mm pulse, as an ECG machine does).
 * With `label`, its text sits just above the pulse's top edge (left-aligned with the rising edge); the caller's text
 * state (font, alignment) is left untouched.
 */
export function drawCalPulse(
  ctx: CanvasRenderingContext2D,
  f: PaperFrame,
  xMm0: number,
  baselineMm: number,
  color: string,
  label?: CalPulseLabel,
  heightMm = mvToMm(PAPER.calMv),
): void {
  const pts = calibrationPulseMm(baselineMm, xMm0 + 1, heightMm);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, 1.4 * f.dpr);
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(mmX(f, x), mmY(f, y)) : ctx.moveTo(mmX(f, x), mmY(f, y))));
  ctx.stroke();
  if (!label || f.pxPerMm < CAL_LABEL_MIN_PX_PER_MM) return;
  const y = mmY(f, baselineMm - heightMm) - 1.5 * f.dpr;
  if (y - 9 * f.dpr < 0) return; // pulse top too close to the canvas edge (strip baseline raised for tall R waves)
  ctx.save();
  ctx.font = font(9, f.dpr, 600);
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  haloText(ctx, label.text, mmX(f, xMm0 + 1), y, label.color, label.paperColor, f.dpr);
  ctx.restore();
}

/**
 * Appends a trace segment to the current path from a ring cache: samples k0..k1 (inclusive) of channel ch, with
 * x = x0 + (k − k0)·dx and y = y0 − v·sy (device px). Min/max-decimated per device column.
 */
export function pathRing(ctx: CanvasRenderingContext2D, ring: RingCache, ch: number, k0: number, k1: number, x0: number, dx: number, y0: number, sy: number): void {
  const n = k1 - k0 + 1;
  if (n < 2) return;
  const src = scratchBuf(0, n);
  ring.copy(ch, k0, n, src);
  pathArray(ctx, src, 0, n, x0, dx, y0, sy);
}

/** Same as pathRing for a plain array slice src[i0 … i0+n−1]. */
export function pathArray(ctx: CanvasRenderingContext2D, src: ArrayLike<number>, i0: number, n: number, x0: number, dx: number, y0: number, sy: number): void {
  if (n < 2) return;
  const out = scratchBuf(1, 2 * decimatedCapacity(n, dx) + 4);
  const m = decimateMinMax(src, i0, n, x0, dx, out);
  if (m === 0) return;
  ctx.moveTo(out[0], y0 - out[1] * sy);
  for (let i = 1; i < m; i++) ctx.lineTo(out[2 * i], y0 - out[2 * i + 1] * sy);
}

/** Text with a halo in the paper colour so labels stay legible over grid and traces. */
export function haloText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, halo: string, dpr: number): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * dpr;
  ctx.strokeStyle = halo;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

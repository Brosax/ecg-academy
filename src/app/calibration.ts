/**
 * Screen calibration maths (pure). The learner matches an on-screen outline to a real ID-1 card (ISO/IEC 7810:
 * 85.60 × 53.98 mm); the outline width in CSS px divided by the matched edge in mm gives CSS px per real mm, which the
 * viewer uses to draw ECG paper at true size (store.settings.viewer.pxPerMm).
 */
import type { Lang } from '../core/l10n';

export const CARD_MM = { long: 85.6, short: 53.98 } as const;
export type CardEdge = keyof typeof CARD_MM;

/** CSS reference pixel: 96 px per inch — what an uncalibrated screen is assumed to show. */
export const DEFAULT_PX_PER_MM = 96 / 25.4;

/** Plausible range of CSS px per mm (very low-density projectors … phones at high zoom). */
export const MIN_PX_PER_MM = 2;
export const MAX_PX_PER_MM = 12;

/** The true-size check figure: a 20 × 10 mm piece of ECG paper (four large squares by two). */
export const CHECK_MM = { w: 20, h: 10 } as const;

/**
 * Box reserved for the check figure (px): its size at MAX_PX_PER_MM. The figure grows with px/mm while the learner drags,
 * so a fixed box keeps everything below it (the card outline the learner is matching) from moving.
 */
export const CHECK_BOX_PX = { w: CHECK_MM.w * MAX_PX_PER_MM, h: CHECK_MM.h * MAX_PX_PER_MM } as const;

/**
 * Phones show about 5.5–6.5 CSS px per mm, so the long edge needs ≥ 85.6 × 5 px of stage. Narrower stages start with
 * the short edge when nothing is saved yet (the 96-dpi default would wrongly suggest the long edge fits).
 */
export const LONG_EDGE_MIN_STAGE_PX = Math.ceil(CARD_MM.long * 5);

/** Which card edge the calibration starts with for a stage of `availablePx` (and the saved calibration, if any). */
export function initialEdge(availablePx: number, savedPxPerMm: number | null): CardEdge {
  if (isValidPxPerMm(savedPxPerMm)) return widthForPxPerMm(savedPxPerMm, 'long') <= availablePx ? 'long' : 'short';
  return availablePx >= LONG_EDGE_MIN_STAGE_PX ? 'long' : 'short';
}

/**
 * The outline the calibration starts with on a stage of `availablePx`: the edge from initialEdge(), drawn at the saved
 * calibration (or the 96-dpi default), clamped for that same edge — so a valid saved value is shown unchanged.
 */
export function initialOutline(availablePx: number, savedPxPerMm: number | null): { readonly edge: CardEdge; readonly width: number } {
  const edge = initialEdge(availablePx, savedPxPerMm);
  const ppm = isValidPxPerMm(savedPxPerMm) ? savedPxPerMm : DEFAULT_PX_PER_MM;
  return { edge, width: clampWidth(widthForPxPerMm(ppm, edge), edge, availablePx) };
}

/** Card outline width (px) for a px/mm value along the given edge. */
export function widthForPxPerMm(pxPerMm: number, edge: CardEdge): number {
  return pxPerMm * CARD_MM[edge];
}

/** px/mm from the matched outline width, rounded to 0.001 px/mm (more digits are noise). */
export function pxPerMmFromWidth(widthPx: number, edge: CardEdge): number {
  return Math.round((widthPx / CARD_MM[edge]) * 1000) / 1000;
}

/** Keep the outline width inside the plausible px/mm range and inside the available space. */
export function clampWidth(widthPx: number, edge: CardEdge, availablePx = Infinity): number {
  const lo = MIN_PX_PER_MM * CARD_MM[edge];
  const hi = Math.max(lo, Math.min(MAX_PX_PER_MM * CARD_MM[edge], availablePx));
  if (!Number.isFinite(widthPx)) return lo;
  return Math.min(hi, Math.max(lo, widthPx));
}

/** Height of the outline for a given width: the card lies flat for the long edge, upright for the short one. */
export function outlineHeight(widthPx: number, edge: CardEdge): number {
  return edge === 'long' ? (widthPx * CARD_MM.short) / CARD_MM.long : (widthPx * CARD_MM.long) / CARD_MM.short;
}

/** Keyboard step for the outline handle (px): ±1, or ±10 with Shift. Returns 0 for unrelated keys. */
export function keyStep(key: string, shift: boolean): number {
  const s = shift ? 10 : 1;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return s;
    case 'ArrowLeft':
    case 'ArrowDown':
      return -s;
    case 'PageUp':
      return 10;
    case 'PageDown':
      return -10;
    default:
      return 0;
  }
}

/** Is a stored value usable as a calibration? (anything else means "fit to the container") */
export function isValidPxPerMm(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= MIN_PX_PER_MM && v <= MAX_PX_PER_MM;
}

/** Display a px/mm value with a fixed number of decimals (stable width in tabular digits). */
export function formatPxPerMm(v: number, lang: Lang): string {
  const s = v.toFixed(2);
  return lang === 'es' ? s.replace('.', ',') : s;
}

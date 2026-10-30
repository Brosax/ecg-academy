import { describe, expect, it } from 'vitest';
import {
  CARD_MM,
  CHECK_BOX_PX,
  CHECK_MM,
  clampWidth,
  DEFAULT_PX_PER_MM,
  formatPxPerMm,
  initialEdge,
  initialOutline,
  isValidPxPerMm,
  keyStep,
  LONG_EDGE_MIN_STAGE_PX,
  MAX_PX_PER_MM,
  MIN_PX_PER_MM,
  outlineHeight,
  pxPerMmFromWidth,
  widthForPxPerMm,
} from '../../src/app/calibration';

describe('screen calibration (bank card, ISO/IEC 7810 ID-1)', () => {
  it('uses the ID-1 card size', () => {
    expect(CARD_MM.long).toBe(85.6);
    expect(CARD_MM.short).toBe(53.98);
  });

  it('width ↔ px/mm round-trips on both edges', () => {
    for (const ppm of [2.5, DEFAULT_PX_PER_MM, 4.2, 6.75, 11.9]) {
      for (const edge of ['long', 'short'] as const) {
        expect(pxPerMmFromWidth(widthForPxPerMm(ppm, edge), edge)).toBeCloseTo(ppm, 3);
      }
    }
    // a 96-dpi screen: the long edge is 323.5 px
    expect(widthForPxPerMm(DEFAULT_PX_PER_MM, 'long')).toBeCloseTo(323.53, 1);
  });

  it('clamps the outline to the plausible range and to the available space', () => {
    expect(clampWidth(1, 'long')).toBeCloseTo(MIN_PX_PER_MM * CARD_MM.long);
    expect(clampWidth(10_000, 'long')).toBeCloseTo(MAX_PX_PER_MM * CARD_MM.long);
    expect(clampWidth(500, 'long', 300)).toBe(300);
    expect(clampWidth(Number.NaN, 'short')).toBeCloseTo(MIN_PX_PER_MM * CARD_MM.short);
    // never below the minimum even when the container is tiny
    expect(clampWidth(500, 'long', 10)).toBeCloseTo(MIN_PX_PER_MM * CARD_MM.long);
  });

  it('outline keeps the card proportions (flat for the long edge, upright for the short one)', () => {
    expect(outlineHeight(856, 'long')).toBeCloseTo(539.8, 6);
    expect(outlineHeight(539.8, 'short')).toBeCloseTo(856, 6);
  });

  it('keyboard steps', () => {
    expect(keyStep('ArrowRight', false)).toBe(1);
    expect(keyStep('ArrowLeft', true)).toBe(-10);
    expect(keyStep('ArrowUp', false)).toBe(1);
    expect(keyStep('PageDown', false)).toBe(-10);
    expect(keyStep('a', false)).toBe(0);
  });

  it('reserves the check figure at its largest size, so dragging cannot move the outline below it', () => {
    expect(CHECK_MM).toEqual({ w: 20, h: 10 });
    expect(CHECK_BOX_PX).toEqual({ w: CHECK_MM.w * MAX_PX_PER_MM, h: CHECK_MM.h * MAX_PX_PER_MM });
    // every px/mm the outline can reach draws a figure that fits the reserved box
    for (const ppm of [MIN_PX_PER_MM, DEFAULT_PX_PER_MM, 6.4, MAX_PX_PER_MM]) {
      expect(CHECK_MM.w * ppm).toBeLessThanOrEqual(CHECK_BOX_PX.w);
      expect(CHECK_MM.h * ppm).toBeLessThanOrEqual(CHECK_BOX_PX.h);
    }
  });

  it('starts with the edge that can fit: short on phones, long on wider screens', () => {
    expect(LONG_EDGE_MIN_STAGE_PX).toBe(428);
    // nothing saved: a 375 px phone (≈ 6 CSS px/mm) cannot show 85.6 mm, a tablet or desktop stage can
    expect(initialEdge(357, null)).toBe('short');
    expect(initialEdge(427, null)).toBe('short');
    expect(initialEdge(428, null)).toBe('long');
    expect(initialEdge(800, null)).toBe('long');
    expect(initialEdge(Infinity, null)).toBe('long');
    // saved calibration: the long edge is kept whenever it fits at that scale
    expect(initialEdge(357, 4)).toBe('long'); // 342.4 px
    expect(initialEdge(357, 6.2)).toBe('short'); // 530.7 px
    expect(initialEdge(530, 6.2)).toBe('short');
    expect(initialEdge(531, 6.2)).toBe('long');
    // an invalid stored value is ignored
    expect(initialEdge(357, 0.5)).toBe('short');
  });

  it('starts with an outline that shows a saved calibration unchanged, whichever edge fits', () => {
    // regression: the start used to be clamped for the long edge after switching to the short one, which moved a low saved
    // value (short width 161.9 px < long-edge minimum 171.2 px) and made it look unsaved
    for (const [stage, saved] of [
      [250, 3],
      [357, 6.2],
      [357, 4],
      [800, 2.1],
      [800, 11.9],
      [Infinity, 5],
    ] as const) {
      const o = initialOutline(stage, saved);
      expect(o.edge).toBe(initialEdge(stage, saved));
      expect(pxPerMmFromWidth(o.width, o.edge)).toBeCloseTo(saved, 3);
      expect(o.width).toBeLessThanOrEqual(stage);
    }
    expect(initialOutline(250, 3).edge).toBe('short');
    // nothing saved (or an invalid value): the 96-dpi default on the edge that fits
    expect(initialOutline(800, null)).toEqual({ edge: 'long', width: widthForPxPerMm(DEFAULT_PX_PER_MM, 'long') });
    expect(initialOutline(357, 0.5)).toEqual({ edge: 'short', width: widthForPxPerMm(DEFAULT_PX_PER_MM, 'short') });
  });

  it('a phone-width stage holds the short edge at phone densities', () => {
    // 375 px screen, full-bleed stage (2 px inset) minus the 16 px handle room = 357 px
    for (const ppm of [5.5, 6.0, 6.4, 6.6]) {
      const w = widthForPxPerMm(ppm, 'short');
      expect(w).toBeLessThanOrEqual(357);
      expect(clampWidth(w, 'short', 357)).toBeCloseTo(w, 6);
    }
  });

  it('validates stored values and formats them with a stable width', () => {
    expect(isValidPxPerMm(3.78)).toBe(true);
    expect(isValidPxPerMm(null)).toBe(false);
    expect(isValidPxPerMm(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidPxPerMm(0.5)).toBe(false);
    expect(isValidPxPerMm('4')).toBe(false);
    expect(formatPxPerMm(3.7795, 'en')).toBe('3.78');
    expect(formatPxPerMm(3.7795, 'es')).toBe('3,78');
    expect(formatPxPerMm(4, 'zh')).toBe('4.00');
  });
});

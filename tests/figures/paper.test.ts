import { describe, expect, it } from 'vitest';
import { NORMAL_BEAT, periodicValue } from '../../src/figures/math/beat';
import { GAINS, rrBracket, SPEEDS } from '../../src/figures/math/paper';

// the paper figure's strip: 70 × 38 mm, baseline at 27 mm, trace from 14 mm, beats every 800 ms
const W = 70;
const H = 38;
const BASE = 27;
const X0 = 14;
const RR = 800;
const TEXT = 1.35;

function traceExtent(speed: number, gain: number): { top: number; bottom: number } {
  let top = BASE, bottom = BASE;
  for (let x = X0; x <= W - 0.5; x += 0.1) {
    const y = BASE - periodicValue(NORMAL_BEAT, (x - X0) * (1000 / speed), RR) * gain;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { top, bottom };
}

describe('R–R bracket placement on the paper figure', () => {
  for (const speed of SPEEDS) {
    for (const gain of GAINS) {
      it(`stays inside the strip and clear of the trace at ${speed} mm/s, ${gain} mm/mV`, () => {
        const { top, bottom } = traceExtent(speed, gain);
        const b = rrBracket(top, bottom, H, TEXT);
        const textTop = b.textY - 0.75 * TEXT;
        const textBottom = b.textY + 0.25 * TEXT;
        for (const y of [b.lineY, b.tick[0], b.tick[1], textTop, textBottom]) {
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(H);
        }
        if (b.above) {
          // ticks and label entirely above the R peak
          expect(Math.max(b.tick[0], b.tick[1])).toBeLessThan(top);
          expect(textBottom).toBeLessThan(b.lineY);
        } else {
          // ticks and label entirely below the deepest point of the trace
          expect(Math.min(b.tick[0], b.tick[1])).toBeGreaterThan(bottom);
          expect(textTop).toBeGreaterThan(b.lineY);
        }
      });
    }
  }

  it('goes below the trace when the R wave reaches the top of the strip (20 mm/mV), above otherwise', () => {
    const g20 = traceExtent(25, 20);
    expect(rrBracket(g20.top, g20.bottom, H, TEXT).above).toBe(false);
    const g10 = traceExtent(25, 10);
    expect(rrBracket(g10.top, g10.bottom, H, TEXT).above).toBe(true);
  });
});

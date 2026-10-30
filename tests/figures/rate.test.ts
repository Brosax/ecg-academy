import { describe, expect, it } from 'vitest';
import {
  countIn6s,
  detectRPeaks,
  largePerMinute,
  meanRate,
  rate1500,
  rate300,
  rate6s,
  rPeaksFromBeats,
  rrIntervals,
  rrIrregularity,
  SEQ_300,
  seq300Bracket,
  seq300Label,
  smallPerMinute,
  smallSquareMs,
  squaresFromRr,
} from '../../src/figures/math/rate';

describe('rate arithmetic at 25 mm/s', () => {
  it('the 300 sequence is 300 / n large squares', () => {
    expect(SEQ_300).toEqual([300, 150, 100, 75, 60, 50]);
    SEQ_300.forEach((v, i) => expect(rate300(i + 1)).toBe(v));
    expect(seq300Label(3)).toBe(100);
    expect(seq300Label(3.5)).toBeNull();
    expect(seq300Label(7)).toBeNull();
  });

  it('brackets an RR that falls between two heavy lines', () => {
    expect(seq300Bracket(4.2)).toEqual([75, 60]);
    expect(seq300Bracket(1.5)).toEqual([300, 150]);
    expect(seq300Bracket(0.8)).toBeNull();
  });

  it('1500 method and squares from RR agree', () => {
    const sq = squaresFromRr(800);
    expect(sq.small).toBe(20);
    expect(sq.large).toBe(4);
    expect(rate1500(sq.small)).toBe(75);
    expect(rate300(sq.large)).toBe(75);
    expect(smallSquareMs(25)).toBe(40);
  });

  it('6-second method multiplies the count by 10', () => {
    expect(rate6s(7)).toBe(70);
    expect(countIn6s([100, 900, 1700, 5900, 6100, 7000], 0)).toBe(4);
    expect(countIn6s([100, 900, 1700, 5900, 6100, 7000], 1000)).toBe(3);
  });
});

describe('rate arithmetic at 50 mm/s', () => {
  it('doubles the constants', () => {
    expect(largePerMinute(50)).toBe(600);
    expect(smallPerMinute(50)).toBe(3000);
    const sq = squaresFromRr(800, 50);
    expect(sq.small).toBe(40);
    expect(rate300(sq.large, 50)).toBe(75);
    expect(rate1500(sq.small, 50)).toBe(75);
  });
});

describe('R peaks', () => {
  const fs = 500;

  function strip(peaksMs: number[], durationMs = 10000, negative = false) {
    const n = (durationMs * fs) / 1000;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = (i * 1000) / fs;
      let v = 0.05 * Math.sin((2 * Math.PI * t) / 3000); // slow baseline wander
      for (const p of peaksMs) {
        v += (negative ? -1 : 1) * 1.2 * Math.exp(-0.5 * ((t - p) / 10) ** 2);
        v += 0.25 * Math.exp(-0.5 * ((t - p - 250) / 50) ** 2); // T wave
      }
      x[i] = v;
    }
    return x;
  }

  it('detects regular R peaks within 10 ms', () => {
    const peaks = Array.from({ length: 12 }, (_, i) => 400 + i * 800);
    const found = detectRPeaks(strip(peaks), fs);
    expect(found.length).toBe(peaks.length);
    found.forEach((t, i) => expect(Math.abs(t - peaks[i])).toBeLessThanOrEqual(10));
    expect(meanRate(found)).toBeCloseTo(75, 0);
    expect(rrIrregularity(found)).toBeLessThan(0.05);
  });

  it('detects negative complexes and irregular RR', () => {
    const peaks = [300, 900, 1350, 2300, 2800, 3900, 4400, 5100, 6400, 7000, 7600, 8800, 9500];
    const found = detectRPeaks(strip(peaks, 10000, true), fs);
    expect(found.length).toBe(peaks.length);
    expect(rrIrregularity(found)).toBeGreaterThan(0.5);
    expect(rrIntervals([0, 800, 1500])).toEqual([800, 700]);
  });

  it('finds the R peak inside annotated QRS windows', () => {
    const x = strip([1000, 1800]);
    const beat = (on: number) => ({
      kind: 'sinus' as const,
      pOn: on - 160,
      pOff: on - 60,
      qrsOn: on,
      qrsOff: on + 90,
      j: on + 90,
      tPeak: on + 250,
      tOff: on + 350,
      uOff: null,
      aberrant: false,
    });
    const r = rPeaksFromBeats([beat(955), beat(1755)], x, fs);
    expect(Math.abs(r[0] - 1000)).toBeLessThanOrEqual(2);
    expect(Math.abs(r[1] - 1800)).toBeLessThanOrEqual(2);
  });
});

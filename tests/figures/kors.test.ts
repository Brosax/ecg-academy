import { describe, expect, it } from 'vitest';
import type { EcgSignal } from '../../src/core/ecg';
import { STD_LEADS } from '../../src/core/leads';
import {
  beatAt,
  beatWindow,
  KORS_LEADS,
  KORS_MATRIX,
  korsTransform,
  loopSignedArea,
  meanVector,
  stepBeatCursor,
  stickyBeat,
  vcgAt,
  vcgSeries,
} from '../../src/figures/math/kors';

describe('Kors regression transform', () => {
  it('is a 3 × 8 matrix over I, II, V1–V6', () => {
    expect(KORS_LEADS).toEqual(['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
    expect(KORS_MATRIX.length).toBe(3);
    for (const row of KORS_MATRIX) expect(row.length).toBe(8);
  });

  it('keeps the published coefficients (Kors 1990): spot checks', () => {
    expect(KORS_MATRIX[0][0]).toBe(0.38); // X ← I
    expect(KORS_MATRIX[0][7]).toBe(0.54); // X ← V6
    expect(KORS_MATRIX[1][1]).toBe(0.93); // Y ← II
    expect(KORS_MATRIX[2][2]).toBe(-0.43); // Z ← V1
  });

  it('maps leftward, inferior and posterior signals to +X, +Y, +Z', () => {
    const unitOf = (lead: string) => KORS_LEADS.map((l) => (l === lead ? 1 : 0));
    expect(korsTransform(unitOf('V6'))[0]).toBeGreaterThan(0.5);
    expect(korsTransform(unitOf('I'))[0]).toBeGreaterThan(0.3);
    expect(korsTransform(unitOf('II'))[1]).toBeGreaterThan(0.9);
    // a negative deflection in V1 (an S wave) means the vector points away from V1: posterior (+Z)
    expect(korsTransform(unitOf('V1').map((v) => -v))[2]).toBeGreaterThan(0.4);
  });

  it('is linear', () => {
    const a = [0.1, 0.5, -0.4, -0.2, 0.3, 0.8, 1.1, 0.9];
    const b = [0.3, -0.2, 0.1, 0.4, -0.5, 0.2, 0.0, -0.1];
    const ta = korsTransform(a), tb = korsTransform(b);
    const tab = korsTransform(a.map((v, i) => 2 * v - b[i]));
    for (let k = 0; k < 3; k++) expect(tab[k]).toBeCloseTo(2 * ta[k] - tb[k], 12);
  });
});

describe('VCG series', () => {
  const fs = 500;
  const durationMs = 1200;
  const n = (durationMs * fs) / 1000;

  function sig(fn: (lead: string, t: number) => number): EcgSignal {
    const leads = Object.fromEntries(
      STD_LEADS.map((l) => {
        const x = new Float32Array(n);
        for (let i = 0; i < n; i++) x[i] = fn(l, (i * 1000) / fs);
        return [l, x];
      }),
    ) as unknown as EcgSignal['leads'];
    return { fs, durationMs, leads };
  }

  it('a flat (offset) signal gives a loop at the origin', () => {
    const s = vcgSeries(sig(() => 0.4), 300, 700, 2, [250, 290]);
    expect(s.t.length).toBe(201);
    for (let k = 0; k < s.t.length; k++) {
      expect(Math.abs(s.x[k])).toBeLessThan(1e-6);
      expect(Math.abs(s.y[k])).toBeLessThan(1e-6);
      expect(Math.abs(s.z[k])).toBeLessThan(1e-6);
    }
  });

  it('reproduces the transform sample by sample and interpolates in time', () => {
    const pulse = (t: number) => Math.exp(-0.5 * ((t - 500) / 20) ** 2);
    const w: Record<string, number> = { I: 0.6, II: 1.0, V1: -0.5, V2: -0.2, V3: 0.3, V4: 0.9, V5: 1.0, V6: 0.8 };
    const s = vcgSeries(sig((l, t) => (w[l] ?? 0) * pulse(t)), 400, 600, 2, [300, 350]);
    const peak = vcgAt(s, 500)!;
    const expected = korsTransform(KORS_LEADS.map((l) => w[l]));
    for (let k = 0; k < 3; k++) expect(peak[k]).toBeCloseTo(expected[k], 4);
    expect(vcgAt(s, 399)).toBeNull();
    const m = meanVector(s, 400, 600);
    expect(Math.sign(m[0])).toBe(Math.sign(expected[0]));
    expect(Math.sign(m[1])).toBe(Math.sign(expected[1]));
  });

  it('measures loop rotation with the shoelace formula (y down: clockwise > 0)', () => {
    // right, down, left, up on screen = clockwise
    expect(loopSignedArea([0, 1, 1, 0], [0, 0, 1, 1])).toBeGreaterThan(0);
    expect(loopSignedArea([0, 0, 1, 1], [0, 1, 1, 0])).toBeLessThan(0);
  });

  it('picks the beat under the cursor', () => {
    const b = (on: number) => ({
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
    const beats = [b(300), b(1100), b(1900)];
    expect(beatAt(beats, 350)).toBe(0);
    expect(beatAt(beats, 1000)).toBe(1); // inside beat 1's P wave
    expect(beatAt(beats, 2500)).toBe(2);
    expect(beatAt(beats, null)).toBe(1);
    expect(beatAt([], 100)).toBe(-1);
  });
});

describe('beat under the cursor in the vector-loop figure', () => {
  const b = (on: number) => ({
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
  const DUR = 3000;
  const slow = [b(300), b(1100), b(1900)]; // RR 800 ms: a TP gap between the shown windows
  const fast = [b(300), b(700), b(1100), b(1500)]; // RR 400 ms: the shown windows overlap

  it('shows a beat from just before its P to just after its T', () => {
    expect(beatWindow(slow[1], DUR)).toEqual([920, 1480]);
    expect(beatWindow(b(100), DUR)[0]).toBe(0);
    expect(beatWindow(b(2900), DUR)[1]).toBe(DUR - 2);
  });

  it('keeps the shown beat while the cursor stays in its window (beatAt alone would flip to the neighbour)', () => {
    // 925 ms is inside beat 1's window but before beatAt's boundary (beat 1's P onset, 940 ms)
    expect(beatAt(slow, 925)).toBe(0);
    expect(stickyBeat(slow, 925, 1, DUR)).toBe(1);
    expect(stickyBeat(slow, 925, -1, DUR)).toBe(0);
    // outside the shown window, beatAt decides
    expect(stickyBeat(slow, 2000, 1, DUR)).toBe(2);
    expect(stickyBeat(slow, null, -1, DUR)).toBe(1);
    // overlapping windows at a fast rate: the T of beat 1 runs into beat 2's window
    expect(stickyBeat(fast, 1060, 1, DUR)).toBe(1);
    expect(stickyBeat(fast, 1060, 2, DUR)).toBe(2);
  });

  it('steps inside the window, stops on its edge, then continues into the next beat', () => {
    expect(stepBeatCursor(slow, 1, null, 4, DUR)).toEqual({ beat: 1, t: 924 });
    expect(stepBeatCursor(slow, 1, 1000, -40, DUR)).toEqual({ beat: 1, t: 960 });
    expect(stepBeatCursor(slow, 1, 1478, 4, DUR)).toEqual({ beat: 1, t: 1480 });
    // across the TP gap to the next shown window
    expect(stepBeatCursor(slow, 1, 1480, 4, DUR)).toEqual({ beat: 2, t: 1720 });
    expect(stepBeatCursor(slow, 2, 1720, -4, DUR)).toEqual({ beat: 1, t: 1480 });
    // into the overlap: time keeps running forwards
    expect(stepBeatCursor(fast, 1, 1080, 40, DUR)).toEqual({ beat: 2, t: 1120 });
    // first and last beats are the ends
    expect(stepBeatCursor(slow, 0, 120, -4, DUR)).toEqual({ beat: 0, t: 120 });
    expect(stepBeatCursor(slow, 2, 2280, 4, DUR)).toEqual({ beat: 2, t: 2280 });
    // a cursor outside the window starts from the edge it moves away from
    expect(stepBeatCursor(slow, 1, 2500, -4, DUR)).toEqual({ beat: 1, t: 1476 });
  });

  it('reaches the window edge and moves on when the beat marks are fractional milliseconds', () => {
    // fractional marks (fs = 300 Hz): the window is whole milliseconds, so a rounded cursor can sit on its edge
    const frac = [b(300.33), b(1133.67), b(1967)];
    const [, z] = beatWindow(frac[1], DUR);
    expect(Number.isInteger(z)).toBe(true);
    expect(stepBeatCursor(frac, 1, z - 10, 40, DUR)).toEqual({ beat: 1, t: z });
    expect(stepBeatCursor(frac, 1, z, 40, DUR).beat).toBe(2);
    // a fractional external cursor just past the edge still counts as on it
    expect(stepBeatCursor(frac, 1, z + 0.4, 40, DUR).beat).toBe(2);
    expect(stickyBeat(frac, z + 0.4, 1, DUR)).toBe(1);
  });

  for (const [name, beats] of [['slow', slow], ['fast', fast]] as const) {
    it(`walks every beat forwards and backwards without the window flipping (${name} rate)`, () => {
      let beat = stickyBeat(beats, null, -1, DUR);
      let t: number | null = null;
      const seen = new Set<number>();
      let prev = -Infinity;
      for (let k = 0; k < 400; k++) {
        const r = stepBeatCursor(beats, beat, t, 40, DUR);
        expect(r.t).toBeGreaterThanOrEqual(prev);
        expect(stickyBeat(beats, r.t, r.beat, DUR)).toBe(r.beat);
        seen.add(r.beat);
        prev = r.t;
        beat = r.beat;
        t = r.t;
      }
      expect(beat).toBe(beats.length - 1);
      prev = Infinity;
      for (let k = 0; k < 400; k++) {
        const r = stepBeatCursor(beats, beat, t, -40, DUR);
        expect(r.t).toBeLessThanOrEqual(prev);
        expect(stickyBeat(beats, r.t, r.beat, DUR)).toBe(r.beat);
        seen.add(r.beat);
        prev = r.t;
        beat = r.beat;
        t = r.t;
      }
      expect(beat).toBe(0);
      expect(seen.size).toBe(beats.length);
    });
  }
});

/**
 * Pure timeline maths of the scene runtime (src/figures/scene/timeline.ts): beats tile [0, 1], easing is monotone
 * and clamped, beat lookup at the boundaries, prev/next targets, fiducial anchoring, the cursor time map and the
 * frame gate. Also the phase presets (phases.ts) on the schematic NORMAL_BEAT.
 */
import { describe, expect, it } from 'vitest';
import { NORMAL_BEAT } from '../../../src/figures/math/beat';
import { HEART_PHASES, JOURNEY_PHASES, PHASE_LABEL_KEY, phaseBeats } from '../../../src/figures/scene/phases';
import { sceneZh } from '../../../src/figures/scene/strings';
import {
  anchorBeats,
  beatIndexAt,
  beatTarget,
  compileBeats,
  easeInOut,
  easeOut,
  fiducialTimes,
  frameGate,
  gateInterval,
  local,
  MIN_BEAT_FRACTION,
  pOfTime,
  revealed,
  seg,
  splitRange,
  timeOfP,
  tween,
} from '../../../src/figures/scene/timeline';

const DEFS = [
  { id: 'a', ms: 1000 },
  { id: 'b', ms: 3000 },
  { id: 'c', ms: 1000 },
] as const;

describe('compileBeats', () => {
  it('tiles [0, 1] in order with fractions proportional to the lengths', () => {
    const tl = compileBeats(DEFS);
    expect(tl.beats.map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(tl.beats[0].from).toBe(0);
    expect(tl.beats[tl.beats.length - 1].to).toBe(1);
    for (let i = 1; i < tl.beats.length; i++) expect(tl.beats[i].from).toBe(tl.beats[i - 1].to);
    expect(tl.beats[0].to).toBeCloseTo(0.2, 12);
    expect(tl.beats[1].to).toBeCloseTo(0.8, 12);
    expect(tl.durationMs).toBe(5000);
    expect(tl.window).toBeUndefined();
  });

  it('durationMs can be overridden, window passes through, key encodes ids and lengths', () => {
    const tl = compileBeats(DEFS, { durationMs: 2500, window: [100, 600] });
    expect(tl.durationMs).toBe(2500);
    expect(tl.window).toEqual([100, 600]);
    expect(tl.beats[1].to).toBeCloseTo(0.8, 12);
    expect(tl.key).not.toBe(compileBeats(DEFS).key);
    expect(compileBeats(DEFS).key).toBe(compileBeats([...DEFS]).key);
    expect(compileBeats(DEFS).key).not.toBe(compileBeats([{ id: 'a', ms: 1000 }, { id: 'b', ms: 3001 }, { id: 'c', ms: 1000 }]).key);
  });

  it('a zero-length beat keeps a sliver (so prev / next can land on it); invalid lengths throw', () => {
    const tl = compileBeats([
      { id: 'x', ms: 0 },
      { id: 'y', ms: 1000 },
    ]);
    expect(tl.beats[0].to).toBeGreaterThan(0);
    expect(tl.beats[0].to).toBeLessThanOrEqual(MIN_BEAT_FRACTION + 1e-9);
    expect(() => compileBeats([{ id: 'n', ms: -5 }])).toThrow();
    expect(() => compileBeats([])).toThrow();
  });
});

describe('easing', () => {
  it('easeInOut and easeOut are monotone non-decreasing, clamped, 0 at 0 and 1 at 1', () => {
    for (const f of [easeInOut, easeOut]) {
      expect(f(0)).toBe(0);
      expect(f(1)).toBe(1);
      expect(f(-3)).toBe(0);
      expect(f(7)).toBe(1);
      let prev = -Infinity;
      for (let i = 0; i <= 200; i++) {
        const y = f(i / 200);
        expect(y).toBeGreaterThanOrEqual(prev);
        prev = y;
      }
    }
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 12);
    expect(easeOut(0.5)).toBeCloseTo(0.75, 12);
  });

  it('seg is 0 before its range, 1 after it, eased inside; revealed is linear; degenerate ranges are a step', () => {
    expect(seg(0.1, 0.2, 0.7)).toBe(0);
    expect(seg(0.2, 0.2, 0.7)).toBe(0);
    expect(seg(0.7, 0.2, 0.7)).toBe(1);
    expect(seg(0.9, 0.2, 0.7)).toBe(1);
    expect(seg(0.45, 0.2, 0.7)).toBeCloseTo(0.5, 12);
    expect(seg(0.3, 0.2, 0.7)).toBeLessThan(0.2); // eased: slower start than linear 0.2
    expect(revealed(0.3, 0.2, 0.7)).toBeCloseTo(0.2, 12);
    expect(revealed(-1, 0.2, 0.7)).toBe(0);
    expect(revealed(2, 0.2, 0.7)).toBe(1);
    expect(seg(0.5, 0.5, 0.5)).toBe(1);
    expect(seg(0.49, 0.5, 0.5)).toBe(0);
    expect(revealed(0.5, 0.5, 0.5)).toBe(1);
  });

  it('tween interpolates; splitRange tiles a range by weights', () => {
    expect(tween(10, 20, 0.25)).toBe(12.5);
    const parts = splitRange(0.2, 0.8, [1, 2, 1]);
    expect(parts[0][0]).toBeCloseTo(0.2, 12);
    expect(parts[0][1]).toBeCloseTo(0.35, 12);
    expect(parts[1][1]).toBeCloseTo(0.65, 12);
    expect(parts[2][1]).toBeCloseTo(0.8, 12);
    expect(splitRange(0, 1, [0, 0])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });
});

describe('beat lookup', () => {
  const { beats } = compileBeats(DEFS); // boundaries at 0.2 and 0.8

  it('beatIndexAt: a boundary belongs to the beat that starts there; p = 1 is the last beat; out of range clamps', () => {
    expect(beatIndexAt(beats, 0)).toBe(0);
    expect(beatIndexAt(beats, 0.19999)).toBe(0);
    expect(beatIndexAt(beats, 0.2)).toBe(1);
    expect(beatIndexAt(beats, 0.79999)).toBe(1);
    expect(beatIndexAt(beats, 0.8)).toBe(2);
    expect(beatIndexAt(beats, 1)).toBe(2);
    expect(beatIndexAt(beats, 1.5)).toBe(2);
    expect(beatIndexAt(beats, -0.5)).toBe(0);
    expect(beatIndexAt([], 0.5)).toBe(0);
  });

  it('local is 0 before a beat, 1 after it and linear inside', () => {
    expect(local(beats, 1, 0.1)).toBe(0);
    expect(local(beats, 1, 0.2)).toBe(0);
    expect(local(beats, 1, 0.5)).toBeCloseTo(0.5, 12);
    expect(local(beats, 1, 0.8)).toBe(1);
    expect(local(beats, 1, 0.95)).toBe(1);
    expect(local(beats, 7, 0.5)).toBe(0);
  });

  it('beatTarget lands on start / middle / end and clamps the index', () => {
    expect(beatTarget(beats, 1, 'start')).toBeCloseTo(0.2, 12);
    expect(beatTarget(beats, 1, 'middle')).toBeCloseTo(0.5, 12);
    expect(beatTarget(beats, 1, 'end')).toBeCloseTo(0.8, 12);
    expect(beatTarget(beats, -4, 'end')).toBeCloseTo(0.2, 12);
    expect(beatTarget(beats, 99, 'start')).toBeCloseTo(0.8, 12);
    expect(beatTarget(beats, 99, 'end')).toBe(1);
    expect(beatTarget([], 0, 'end')).toBe(0);
  });
});

describe('anchorBeats and the phase presets', () => {
  const m = NORMAL_BEAT.marks; // pOn 0, pOff 100, qrsOn 160, qrsOff 245, tPeak 410, tOff 500

  it('fiducialTimes: window [pOn − 40, tOff + 60], hisOn = qrsOn − 45; null fiducials are guarded', () => {
    const f = fiducialTimes(m);
    expect(f.start).toBe(-40);
    expect(f.end).toBe(560);
    expect(f.hisOn).toBe(115);
    const noP = fiducialTimes({ ...m, pOn: null, pOff: null, tPeak: null });
    expect(noP.start).toBe(0);
    expect(noP.pOn).toBe(0);
    expect(noP.pOff).toBe(0);
    expect(noP.tPeak).toBeCloseTo((245 + 500) / 2, 12);
  });

  for (const [name, defs] of [
    ['HEART_PHASES', HEART_PHASES],
    ['JOURNEY_PHASES', JOURNEY_PHASES],
  ] as const) {
    it(`${name}: monotone, tiles [0, 1], qrs spans exactly [qrsOn, qrsOff] in ECG time, clamp 1.5–6 s`, () => {
      const tl = phaseBeats(defs, m, 5);
      expect(tl.window).toEqual([-40, 560]);
      expect(tl.beats[0].from).toBe(0);
      expect(tl.beats[tl.beats.length - 1].to).toBe(1);
      for (let i = 1; i < tl.beats.length; i++) {
        expect(tl.beats[i].from).toBe(tl.beats[i - 1].to);
        expect(tl.beats[i].to).toBeGreaterThan(tl.beats[i].from);
      }
      const qrs = tl.beats.find((b) => b.id === 'qrs')!;
      expect(timeOfP(tl.window!, qrs.from)).toBeCloseTo(160, 9);
      expect(timeOfP(tl.window!, qrs.to)).toBeCloseTo(245, 9);
      expect(tl.durationMs).toBe(600 * 5);
      expect(phaseBeats(defs, m, 1).durationMs).toBe(1500);
      expect(phaseBeats(defs, m, 50).durationMs).toBe(6000);
      for (const b of tl.beats) expect(PHASE_LABEL_KEY[b.id] in sceneZh).toBe(true);
    });
  }

  it('a P-less beat collapses the P-anchored beats to the minimum sliver; decreasing anchors throw', () => {
    const tl = phaseBeats(HEART_PHASES, { ...m, pOn: null, pOff: null }, 5);
    const p = tl.beats.find((b) => b.id === 'p')!;
    expect(p.to - p.from).toBeGreaterThan(0);
    expect(p.to - p.from).toBeLessThanOrEqual(MIN_BEAT_FRACTION * 1.5);
    expect(() => anchorBeats([{ id: 'x', from: 'qrsOff', to: 'qrsOn' }], m, { slow: 5 })).toThrow();
    expect(() => anchorBeats([{ id: 'x', from: 'start', to: 'end' }], { ...m, tOff: -500 }, { slow: 5 })).toThrow();
  });

  it('key changes with the beat but not with the slow factor alone being equal', () => {
    const a = phaseBeats(HEART_PHASES, m, 5);
    const b = phaseBeats(HEART_PHASES, { ...m, pOn: 800, pOff: 900, qrsOn: 960, qrsOff: 1045, tPeak: 1210, tOff: 1300 }, 5);
    expect(a.key).not.toBe(b.key);
    expect(phaseBeats(HEART_PHASES, m, 5).key).toBe(a.key);
  });
});

describe('time map and frame gate', () => {
  it('timeOfP / pOfTime round-trip in whole ms and clamp', () => {
    const w: readonly [number, number] = [-40, 560];
    for (let t = -40; t <= 560; t += 7) expect(Math.round(timeOfP(w, pOfTime(w, t)))).toBe(t);
    expect(pOfTime(w, -1000)).toBe(0);
    expect(pOfTime(w, 1000)).toBe(1);
    expect(timeOfP(w, -1)).toBe(-40);
    expect(timeOfP(w, 2)).toBe(560);
    expect(pOfTime([5, 5], 5)).toBe(0);
  });

  it('frameGate passes every frame at interval 0 and holds to the interval otherwise; slow frames cap at 30 fps', () => {
    expect(frameGate(100, 101, 0)).toBe(true);
    expect(frameGate(100, 120, 33)).toBe(false);
    expect(frameGate(100, 133, 33)).toBe(true);
    expect(gateInterval(8)).toBe(0);
    expect(gateInterval(25)).toBeCloseTo(1000 / 30, 9);
  });
});

describe('reduced motion (the runtime contract the hook follows)', () => {
  it('p = 1 is the last beat and every beat reports local = 1: end frames are complete on their own', () => {
    const { beats } = compileBeats(DEFS);
    expect(beatIndexAt(beats, 1)).toBe(beats.length - 1);
    for (let i = 0; i < beats.length; i++) expect(local(beats, i, 1)).toBe(1);
    // prev / next under reduced motion land on end frames: the end target of each beat is its `to`
    for (let i = 0; i < beats.length; i++) expect(beatTarget(beats, i, 'end')).toBe(beats[i].to);
  });
});

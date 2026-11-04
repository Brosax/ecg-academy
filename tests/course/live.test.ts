/**
 * Live-block dials (src/course/live.ts): start values come from the scenario as authored (or the middle of the range),
 * always on the slider grid; the tracing generated with them reports every realised dial, so the read-out equals what
 * is drawn.
 */
import { describe, expect, it } from 'vitest';
import { authoredDialValue, dialStep, liveNote, noteAt, pickDials, realisedDials, snapDial, startDials, sweepValues } from '../../src/course/live';
import { l } from '../../src/core/l10n';
import { generate, scenarios, type ScenarioDef } from '../../src/synth';

const base: ScenarioDef = {
  id: 'x',
  group: 'normal',
  findings: ['normal-ecg'],
  source: {
    rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.02 },
    activation: { kind: 'conducted' },
    injury: [{ where: 'global', layer: 'epicardial', stMv: 0.12 }],
  },
  dials: { rate: { min: 60, max: 100 }, pr: { min: 120, max: 200 }, st: { min: 0.08, max: 0.18 }, hrv: { min: 0, max: 0.04 }, voltage: { min: 0.5, max: 1.5 } },
  variants: { fast: { label: l('快', 'fast', 'rápida'), patch: { rhythm: { kind: 'sinus', rateBpm: 95 } } } },
};

describe('dial grid', () => {
  it('fixed steps per dial, 1-2-5 steps for continuous ones', () => {
    expect(dialStep('rate', { min: 40, max: 150 })).toBe(1);
    expect(dialStep('voltage', { min: 0.3, max: 2 })).toBe(0.05);
    expect(dialStep('hrv', { min: 0, max: 0.04 })).toBeCloseTo(0.0005, 10);
    expect(dialStep('fCoarseness', { min: 0.2, max: 0.9 })).toBeCloseTo(0.01, 10);
  });

  it('snaps into the range and onto the grid', () => {
    expect(snapDial('rate', { min: 60, max: 100 }, 72.4)).toBe(72);
    expect(snapDial('rate', { min: 60, max: 100 }, 140)).toBe(100);
    expect(snapDial('pr', { min: 120, max: 200 }, 163)).toBe(165);
    expect(snapDial('st', { min: 0.08, max: 0.18 }, 0.123)).toBe(0.12);
  });
});

describe('start values', () => {
  it('read the authored value from the source spec (the variant wins)', () => {
    expect(authoredDialValue(base, undefined, 'rate')).toBe(72);
    expect(authoredDialValue(base, 'fast', 'rate')).toBe(95);
    expect(authoredDialValue(base, undefined, 'st')).toBe(0.12);
    expect(authoredDialValue(base, undefined, 'voltage')).toBe(1);
    expect(authoredDialValue(base, undefined, 'pr')).toBeUndefined();
  });

  it('fall back to the middle of the range; dials the scenario does not allow are dropped', () => {
    const s = startDials(base, undefined, ['rate', 'pr', 'st', 'qtc', 'voltage']);
    expect(s).toEqual({ rate: 72, pr: 160, st: 0.12, voltage: 1 });
  });

  it('keep only realised dials', () => {
    expect(realisedDials(['rate', 'pr', 'axis'], { rate: 70, axis: 40 })).toEqual(['rate', 'axis']);
    expect(pickDials({ rate: 70, pr: 160 }, ['pr'])).toEqual({ pr: 160 });
  });

  it('a played dial starts where the experiment says, on the grid', () => {
    expect(startDials(base, undefined, ['rate', 'pr'], { dial: 'rate', from: 61.4 })).toEqual({ rate: 61, pr: 160 });
    expect(startDials(base, undefined, ['rate'], { dial: 'pr', from: 200 })).toEqual({ rate: 72 });
  });
});

describe('played experiments', () => {
  it('a sweep runs from → to on the slider grid, both ends included, no repeats, at most the frame budget', () => {
    const r = { min: 60, max: 100 };
    const up = sweepValues('rate', r, 60, 100, 24);
    expect(up[0]).toBe(60);
    expect(up[up.length - 1]).toBe(100);
    expect(up.length).toBeLessThanOrEqual(24);
    expect(new Set(up).size).toBe(up.length);
    for (let i = 1; i < up.length; i++) expect(up[i]).toBeGreaterThan(up[i - 1]);
    expect(sweepValues('rate', r, 100, 60, 24)).toEqual([...up].reverse());
    expect(sweepValues('rate', r, 60, 62, 24)).toEqual([60, 61, 62]);
    expect(sweepValues('rate', r, 20, 300, 5)).toEqual([60, 70, 80, 90, 100]);
  });

  it('the note on screen is the one whose range holds the value', () => {
    const notes = [
      { min: 60, max: 62, text: l('a', 'a', 'a') },
      { min: 73, max: 77, text: l('b', 'b', 'b') },
    ];
    expect(noteAt(notes, 61)?.text.en).toBe('a');
    expect(noteAt(notes, 77)?.text.en).toBe('b');
    expect(noteAt(notes, 70)).toBeUndefined();
    expect(noteAt(undefined, 70)).toBeUndefined();
  });

  it('no note once the learner moves a dial the notes were not written for', () => {
    const play = { dial: 'rate' as const, notes: [{ min: 60, max: 62, text: l('a', 'a', 'a') }] };
    const start = { rate: 60, qtc: 405 };
    expect(liveNote(play, { rate: 61, qtc: 405 }, start)?.text.en).toBe('a');
    expect(liveNote(play, { rate: 61, qtc: 450 }, start)).toBeUndefined();
    expect(liveNote(undefined, { rate: 61 }, start)).toBeUndefined();
    expect(liveNote(play, null, start)).toBeUndefined();
  });
});

describe('with the synthetic engine', () => {
  const live = scenarios().filter((s) => Object.keys(s.dials).length > 0);

  it('the catalogue has scenarios with dials', () => {
    expect(live.length).toBeGreaterThan(0);
  });

  it('a tracing generated with the start values reports every value it realised, equal to the slider', () => {
    const sc = scenarios().find((s) => s.id === 'normal');
    expect(sc).toBeDefined();
    const ids = ['rate', 'pr', 'qrs', 'qtc'] as const;
    const start = startDials(sc!, undefined, ids);
    expect(start.rate).toBe(authoredDialValue(sc!, undefined, 'rate'));
    const res = generate({ scenario: 'normal', seed: 13, dials: start });
    for (const id of realisedDials(ids, res.applied)) expect(Math.abs((res.applied[id] ?? NaN) - (start[id] ?? NaN))).toBeLessThan(dialStep(id, sc!.dials[id]!) / 2 + 1e-9);
    // the rate the learner reads on the strip agrees with the slider
    expect(Math.abs(res.ecg.truth!.hrBpm - start.rate!)).toBeLessThanOrEqual(Math.max(5, 0.1 * start.rate!));
  });
});

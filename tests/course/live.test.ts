/**
 * Live-block dials (src/course/live.ts): start values come from the scenario as authored (or the middle of the range),
 * always on the slider grid; the tracing generated with them reports every realised dial, so the read-out equals what
 * is drawn.
 */
import { describe, expect, it } from 'vitest';
import { authoredDialValue, dialStep, pickDials, realisedDials, snapDial, startDials } from '../../src/course/live';
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

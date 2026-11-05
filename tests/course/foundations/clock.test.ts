import { describe, expect, it } from 'vitest';
import { advancePlayback, advanceProgress, canContinue, clampProgress } from '../../../src/course/foundations/clock';

describe('manual explanation playback', () => {
  it('changes speed without resetting the paused position and loops only when requested',()=>{
    expect(advancePlayback(.3,100,800,.5)).toBeCloseTo(.3625);
    expect(advancePlayback(.3,100,800,2)).toBeCloseTo(.55);
    expect(advancePlayback(.9,800,800,1)).toBe(1);
    expect(advancePlayback(.9,800,800,1,true)).toBeCloseTo(.9);
    expect(advancePlayback(.3,0,800,2,true)).toBe(.3);
    expect(advancePlayback(.4,-100,800,1)).toBe(.4);
  });
  it('continues from the paused position rather than restarting', () => {
    expect(advanceProgress(.4,1200,6000)).toBeCloseTo(.6);
    expect(advanceProgress(.4,6000,6000)).toBe(1);
    expect(advanceProgress(.4,-100,6000)).toBe(.4);
  });
  it('unlocks after any attempt, including while the explanation is paused halfway', () => {
    expect(canContinue(1,false)).toBe(false);
    expect(canContinue(.5,false)).toBe(false);
    expect(canContinue(0,true)).toBe(true);
    expect(canContinue(.5,true)).toBe(true);
    expect(canContinue(.99,true)).toBe(true);
    expect(canContinue(1,true)).toBe(true);
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(1.1)).toBe(1);
  });
});

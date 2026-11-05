import { describe, expect, it } from 'vitest';
import { paperDistance, paperHeight, pulseSize, rateFromPaper } from '../../../src/course/foundations/f4.math';
describe('foundation paper experiment', () => {
  it('changes only the axis belonging to the selected recording setting', () => {
    expect(pulseSize(25,10)).toEqual({width:5,height:10});
    expect(pulseSize(50,10)).toEqual({width:10,height:10});
    expect(pulseSize(25,20)).toEqual({width:5,height:20});
    expect(paperDistance(800,50)).toBe(2*paperDistance(800,25));
    expect(paperHeight(.8,20)).toBe(2*paperHeight(.8,10));
  });
  it('recovers the same actual rate at either paper speed', () => {
    for (const rr of [400, 600, 800, 1000, 1500]) {
      const slow = rateFromPaper(paperDistance(rr,25),25);
      const fast = rateFromPaper(paperDistance(rr,50),50);
      expect(slow).toBeCloseTo(60000/rr);
      expect(fast).toBeCloseTo(slow);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { momentWindow, phaseAt, phaseWindow, teachingTime } from '../../../src/course/foundations/f1.math';
const beat = { pOn: 1000, pOff: 1080, qrsOn: 1160, qrsOff: 1245, tPeak: 1410, tOff: 1500 };
describe('foundation conduction story source clock', () => {
  it('anchors every teaching segment to real source fiducials', () => {
    expect(phaseWindow(beat, 0)).toEqual([945, 1080]);
    expect(phaseWindow(beat, 1)).toEqual([1080, 1160]);
    expect(phaseWindow(beat, 2)).toEqual([1160, 1245]);
    expect(phaseWindow(beat, 3)).toEqual([1245, 1500]);
    for (let i = 0; i < 5; i++) {
      const [a,b] = phaseWindow(beat, i);
      expect(teachingTime(beat, i, 0)).toBe(a);
      expect(teachingTime(beat, i, 1)).toBe(b);
      expect(teachingTime(beat, i, .5)).toBe((a+b)/2);
    }
  });
  it('structure and wave selection choose the same instant irrespective of the animation clock', () => {
    for (const moment of ['p', 'pr', 'qrs', 'st', 't'] as const) {
      const [a,b] = momentWindow(beat, moment);
      const time = teachingTime(beat, 0, 0, moment);
      expect(time).toBeGreaterThan(a);
      expect(time).toBeLessThan(b);
      expect(time).toBe(teachingTime(beat, 4, 1, moment));
      expect(phaseAt(beat, time)).toBe(moment);
    }
  });
  it('follows a changed PR source without assuming the original QRS onset', () => {
    const delayed = {...beat, qrsOn: 1200, qrsOff: 1285, tPeak: 1450, tOff: 1540};
    expect(teachingTime(delayed, 1, 1)).toBe(1200);
    expect(phaseWindow(delayed, 2)[1] - phaseWindow(delayed, 2)[0]).toBe(85);
    expect(phaseAt(delayed, 1180)).toBe('pr');
  });
});

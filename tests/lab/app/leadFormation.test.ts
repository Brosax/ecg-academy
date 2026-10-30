import { describe, expect, it } from 'vitest';
import { LEAD_FORMATION, LEAD_PICKER_GROUPS, leadVectorFromElectrodes } from '../../../src/lab/app/modes/leadFormation';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import { LEADS } from '../../../src/lab/sim/types';

describe('lead formation table', () => {
  const e = new StubEngine();

  it('rebuilds every projector lead vector from the electrode lead vectors', () => {
    for (const lead of LEADS) {
      const f = LEAD_FORMATION[lead];
      const rebuilt = leadVectorFromElectrodes(e.electrodes, f);
      const ref = e.projector.leadVector(lead);
      for (let k = 0; k < 3; k++) expect(rebuilt[k]).toBeCloseTo(ref[k], 9);
    }
  });

  it('never uses the ground electrode, and precordial leads use the Wilson central terminal', () => {
    for (const lead of LEADS) {
      const f = LEAD_FORMATION[lead];
      expect([f.plus, ...f.minus]).not.toContain('RL');
      if (f.kind === 'precordial') expect([...f.minus].sort()).toEqual(['LA', 'LL', 'RA']);
      if (f.kind === 'augmented') expect(f.minus.length).toBe(2);
      if (f.kind === 'bipolar') expect(f.minus.length).toBe(1);
    }
  });

  it('groups all 12 leads exactly once in the picker', () => {
    expect(LEAD_PICKER_GROUPS.flatMap((g) => g.leads).sort()).toEqual([...LEADS].sort());
  });
});

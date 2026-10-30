import { describe, expect, it } from 'vitest';
import { REGION_LIST, type RegionId } from '../../src/core/regions';
import { demoRegions } from '../../src/heart3d/dev/fixture';
import { cardiacPhase } from '../../src/heart3d/phase';

const ids = REGION_LIST.map((r) => r.id);

function phaseAt(t: number, r = demoRegions()) {
  const out = new Float32Array(r.ids.length);
  r.stateAt(t, out);
  return cardiacPhase(r.ids, out);
}

describe('cardiac phase from region states', () => {
  it('follows a normal cycle P → PR → QRS → ST → T → baseline', () => {
    expect(phaseAt(30)).toBe('atrial');
    expect(phaseAt(120)).toBe('av');
    expect(phaseAt(200)).toBe('qrs');
    expect(phaseAt(300)).toBe('st');
    expect(phaseAt(460)).toBe('t');
    expect(phaseAt(800)).toBe('rest');
  });

  it('all resting = baseline; any ventricular depolarization wins', () => {
    const s = new Float32Array(ids.length);
    expect(cardiacPhase(ids, s)).toBe('rest');
    s[ids.indexOf('ra')] = 0.5;
    expect(cardiacPhase(ids, s)).toBe('atrial');
    s[ids.indexOf('lv-apex')] = 0.3;
    expect(cardiacPhase(ids, s)).toBe('qrs');
  });

  it('atria done with a silent AV junction (blocked P) leaves the ventricles at rest', () => {
    const s = new Float32Array(ids.length);
    s[ids.indexOf('ra')] = 1;
    s[ids.indexOf('la')] = 1;
    expect(cardiacPhase(ids, s)).toBe('rest');
    s[ids.indexOf('av-node')] = 0.4;
    expect(cardiacPhase(ids, s)).toBe('av');
  });

  it('without conduction states, depolarized atria imply AV conduction', () => {
    const sub: RegionId[] = ['ra', 'la', 'lv-apex'];
    expect(cardiacPhase(sub, Float32Array.from([1, 1, 0]))).toBe('av');
    expect(cardiacPhase(sub, Float32Array.from([2, 2, 1]))).toBe('st');
    expect(cardiacPhase(sub, Float32Array.from([2, 2, 1.5]))).toBe('t');
  });
});

import { describe, expect, it } from 'vitest';
import { limbValues, limbTraces, projection, projectionKind, chestTraces } from '../../../src/course/foundations/f2.math';

describe('the foundations vector source', () => {
  it('all six limb leads obey electrode identities for every sampled angle', () => {
    for (let angle=-180; angle<=180; angle+=3) {
      const r=angle*Math.PI/180, v=limbValues(Math.cos(r),Math.sin(r));
      expect(v.II).toBeCloseTo(v.I+v.III,12);
      expect(v.aVR).toBeCloseTo(-(v.I+v.II)/2,12);
      expect(v.aVL).toBeCloseTo(v.I-v.II/2,12);
      expect(v.aVF).toBeCloseTo(v.II-v.I/2,12);
      for (const lead of ['I','II','III','aVR','aVL','aVF'] as const) expect(v[lead]).toBeCloseTo(projection(angle,lead),12);
    }
  });
  it('a zero instantaneous projection differs from a balanced moving complex', () => {
    expect(projectionKind(projection(150,'II'))).toBe('zero');
    const traces=limbTraces(60);
    expect(Math.max(...traces.aVL)).toBeGreaterThan(.05);
    expect(Math.min(...traces.aVL)).toBeLessThan(-.05);
    expect(Math.abs(traces.aVL.reduce((a,b)=>a+b,0))).toBeLessThan(1e-10);
    for (let i=0;i<traces.I.length;i++) expect(traces.II[i]).toBeCloseTo(traces.I[i]+traces.III[i],12);
  });
  it('the shared horizontal source gives the opposing principal V1/V6 deflections', () => {
    const t=chestTraces();
    expect(Math.abs(Math.min(...t.V1))).toBeGreaterThan(Math.max(...t.V1));
    expect(Math.max(...t.V6)).toBeGreaterThan(Math.abs(Math.min(...t.V6)));
  });
});

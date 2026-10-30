import { describe, expect, it } from 'vitest';
import { StubEngine } from '../../../../src/lab/sim/stub/stubEngine';
import { LEADS } from '../../../../src/lab/sim/types';

describe('StubEngine', () => {
  const t0 = performance.now();
  const eng = new StubEngine();
  const buildMs = performance.now() - t0;

  it('builds a closed render mesh and labelled grid quickly', () => {
    expect(eng.geometry.mesh.index.length).toBeGreaterThan(3000);
    expect(eng.geometry.mesh.voxel.length).toBe(eng.geometry.mesh.position.length / 3);
    expect(buildMs).toBeLessThan(15000);
    console.log(`stub build ${buildMs.toFixed(0)} ms, verts ${eng.geometry.mesh.position.length / 3}, tris ${eng.geometry.mesh.index.length / 3}`);
  });

  it('produces a plausible lead II and exact Einthoven', () => {
    const n = 2000;
    const out = new Float32Array(12 * n);
    eng.sampleLeads(0, n, out);
    const lead = (name: string) => out.subarray(LEADS.indexOf(name as never) * n, (LEADS.indexOf(name as never) + 1) * n);
    const II = lead('II'), I = lead('I'), III = lead('III');
    const max = Math.max(...II);
    expect(max).toBeGreaterThan(0.4);
    for (let i = 0; i < n; i += 37) expect(I[i] + III[i]).toBeCloseTo(II[i], 5);
  });

  it('cycle truth orders segments P < PR < QRS < ST < T', () => {
    const c = eng.cycleAt(500)!;
    expect(c).not.toBeNull();
    const segs = c.segments.map((s) => s.seg);
    expect(segs.slice(0, 5)).toEqual(['P', 'PR', 'QRS', 'ST', 'T']);
    expect(c.valves.length).toBe(4);
    const snap = eng.activeBeats(500);
    expect(snap.ventricular[0]).not.toBeNull();
    expect(eng.responsible(c.qrsOn! + 10).length).toBeGreaterThan(0);
  });
});

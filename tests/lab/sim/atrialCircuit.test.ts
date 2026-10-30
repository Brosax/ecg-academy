/**
 * Atrial re-entry circuit (conduction/atrialCircuit.ts) on the HRA heart: annulus frame orientation, caval orifices,
 * one activation per revolution (tAct ∈ [0, CL)), a seamless cut, the crista line of block, the slow isthmus setting the
 * emergent cycle length, and the reverse (clockwise) circuit.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AtrialCircuitSpec, CircuitActivation } from '../../../src/lab/sim/conduction/atrialCircuit';
import { annulusAngle, annulusFrame, buildCircuitActivation, cavalOrifices } from '../../../src/lab/sim/conduction/atrialCircuit';
import { voxelCenter } from '../../../src/lab/sim/conduction/gridUtil';
import { resolveParams } from '../../../src/lab/sim/conduction/params';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { ATRIAL_FLUTTER_TYPICAL } from '../../../src/lab/sim/scenarios/batch3/supraventricularReentry';
import type { GeometryBundle } from '../../../src/lab/sim/types';
import { COMP, TISSUE, compOfTissue } from '../../../src/lab/sim/types';

let geo: GeometryBundle;
let a: CircuitActivation;
const spec = ATRIAL_FLUTTER_TYPICAL.atrial.main.circuit!;
const p = () => resolveParams(ATRIAL_FLUTTER_TYPICAL.params);

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url))));
  a = buildCircuitActivation(geo, p(), 'flutter', spec);
});

/** Median activation of the right-atrial wall next to the annulus (depth < 15 mm) per 30° sector from the cut. */
function ringMedians(act: CircuitActivation, dir: 1 | -1): number[] {
  const g = geo.grid, f = act.frame, t = act.field.tAct;
  const phi0 = annulusAngle(f, f.ivc!);
  const s: number[][] = Array.from({ length: 12 }, () => []);
  for (let v = 0; v < g.tissue.length; v++) {
    if (g.tissue[v] !== TISSUE.RA || !Number.isFinite(t[v])) continue;
    const q = voxelCenter(g, v);
    if (-((q[0] - f.c[0]) * f.n[0] + (q[1] - f.c[1]) * f.n[1] + (q[2] - f.c[2]) * f.n[2]) > 15) continue;
    let d = dir * (annulusAngle(f, q) - phi0);
    d -= 2 * Math.PI * Math.floor(d / (2 * Math.PI));
    s[Math.min(11, Math.floor(d / (Math.PI / 6)))].push(t[v]);
  }
  return s.map((x) => [...x].sort((u, w) => u - w)[Math.floor(x.length / 2)]);
}

describe('atrial re-entry circuit', () => {
  it('annulus frame: eInf points body-inferior, eSep toward the septum (mitral side), right-handed with the RA→RV axis', () => {
    const f = annulusFrame(geo);
    const R = geo.pose.R;
    expect(-(R[3] * f.eInf[0] + R[4] * f.eInf[1] + R[5] * f.eInf[2])).toBeGreaterThan(0.8);
    const mv = geo.valves.find((v) => v.id === 'MITRAL')!.centerMm;
    expect((mv[0] - f.c[0]) * f.eSep[0] + (mv[1] - f.c[1]) * f.eSep[1] + (mv[2] - f.c[2]) * f.eSep[2]).toBeGreaterThan(0);
    expect(Math.abs(f.eInf[0] * f.n[0] + f.eInf[1] * f.n[1] + f.eInf[2] * f.n[2])).toBeLessThan(1e-9);
  });

  it('caval orifices: IVC inferior to the SVC, both on the right-atrial side of the annulus', () => {
    const { ivc, svc } = cavalOrifices(geo);
    const f = annulusFrame(geo);
    expect(ivc && svc).toBeTruthy();
    const depth = (c: readonly number[]) => -((c[0] - f.c[0]) * f.n[0] + (c[1] - f.c[1]) * f.n[1] + (c[2] - f.c[2]) * f.n[2]);
    expect(depth(ivc!.c)).toBeGreaterThan(5);
    expect(depth(svc!.c)).toBeGreaterThan(5);
    const inf = (c: readonly number[]) => (c[0] - f.c[0]) * f.eInf[0] + (c[1] - f.c[1]) * f.eInf[1] + (c[2] - f.c[2]) * f.eInf[2];
    expect(inf(ivc!.c)).toBeGreaterThan(inf(svc!.c) + 30);
    expect(ivc!.rMm).toBeGreaterThan(4);
  });

  it('every atrial voxel activates exactly once per revolution: tAct ∈ [0, CL), the cut seeds at ≈ 0', () => {
    const g = geo.grid, t = a.field.tAct;
    let n = 0;
    for (let v = 0; v < g.tissue.length; v++) {
      if (compOfTissue(g.tissue[v]) !== COMP.Atrial) continue;
      expect(Number.isFinite(t[v])).toBe(true);
      expect(t[v]).toBeGreaterThanOrEqual(0);
      expect(t[v]).toBeLessThan(a.cycleMs);
      n++;
    }
    expect(n).toBeGreaterThan(20000);
    expect(Math.min(...Array.from(a.cutVoxels, (v) => t[v]))).toBe(0);
    expect(Math.max(...Array.from(a.cutVoxels, (v) => t[v]))).toBeLessThan(15);
  });

  it('counterclockwise (LAO) rotation around the annulus with the slow isthmus last; the cut is seamless', () => {
    const med = ringMedians(a, 1);
    for (let i = 1; i < 12; i++) expect(med[i]).toBeGreaterThan(med[i - 1]);
    expect(med[0]).toBeLessThan(20);
    expect(med[11]).toBeGreaterThan(a.cycleMs - 35);
  });

  it('the crista line blocks: the two sides of the line are activated ≥ 30 ms apart on average', () => {
    const g = geo.grid, t = a.field.tAct, [nx, ny] = g.dims;
    const blk = new Set(a.blockVoxels);
    let sum = 0, n = 0;
    for (const v of a.blockVoxels) {
      // compare the voxels 4 steps either way along each axis that leave the line
      for (const d of [1, nx, nx * ny]) {
        const u = v + 3 * d, w = v - 3 * d;
        if (blk.has(u) || blk.has(w) || !Number.isFinite(t[u]) || !Number.isFinite(t[w])) continue;
        if (compOfTissue(g.tissue[u]) !== COMP.Atrial || compOfTissue(g.tissue[w]) !== COMP.Atrial) continue;
        let dt = Math.abs(t[u] - t[w]);
        dt = Math.min(dt, a.cycleMs - dt);
        sum += dt;
        n++;
      }
    }
    expect(a.blockVoxels.length).toBeGreaterThan(100);
    expect(n).toBeGreaterThan(20);
    expect(sum / n).toBeGreaterThanOrEqual(30);
  });

  it('the cycle length is emergent: the slow isthmus sets it (≈ 200 ms at 0.35, shorter with a faster isthmus)', () => {
    expect(a.cycleMs).toBeGreaterThan(180);
    expect(a.cycleMs).toBeLessThan(220);
    expect(a.isthmusVoxels.length).toBeGreaterThan(200);
    const fast = buildCircuitActivation(geo, p(), 'flutter', { ...spec, isthmusSpeed: 0.7 });
    expect(fast.cycleMs).toBeLessThan(a.cycleMs - 15);
  });

  it('the reverse circuit (clockwise) rotates the other way', () => {
    const cw: AtrialCircuitSpec = { ...spec, direction: 'cw' };
    const b = buildCircuitActivation(geo, p(), 'flutter-cw', cw);
    const med = ringMedians(b, -1);
    let up = 0;
    for (let i = 1; i < 12; i++) if (med[i] > med[i - 1]) up++;
    expect(up).toBeGreaterThanOrEqual(10);
  });
});

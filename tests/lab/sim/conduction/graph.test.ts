import { describe, expect, it } from 'vitest';
import { buildAtrialActivation, buildVentricularActivation, cavityOnsets, terminalOnsets } from '../../../../src/lab/sim/conduction/graph';
import { DEFAULT_ENGINE_PARAMS } from '../../../../src/lab/sim/conduction/params';
import { buildStubGeometry } from '../../../../src/lab/sim/stub/stubGeometry';
import { COMP, STRUCTURES, TISSUE, compOfTissue } from '../../../../src/lab/sim/types';

const geo = buildStubGeometry(2);
const p = DEFAULT_ENGINE_PARAMS;

describe('atrial variant (sinus)', () => {
  const a = buildAtrialActivation(geo, p);
  it('starts at the SA node in the right atrium and stays in the atria', () => {
    expect(geo.grid.tissue[a.saVoxel]).toBe(TISSUE.RA);
    expect(a.field.tMinMs).toBeCloseTo(p.saExitMs, 6);
    let leaked = 0;
    for (let v = 0; v < geo.grid.tissue.length; v++) if (compOfTissue(geo.grid.tissue[v]) !== COMP.Atrial && a.field.tAct[v] !== Infinity) leaked++;
    expect(leaked).toBe(0);
  });
  it('activates the atria within ≤ 110 ms and reaches the AV node first-third-ish', () => {
    expect(a.field.tMaxMs - a.field.tMinMs).toBeLessThanOrEqual(110);
    expect(a.avnArrivalMs).toBeGreaterThan(15);
    expect(a.avnArrivalMs).toBeLessThan(80);
  });
  it("Bachmann's bundle conducts faster than 1.7 m/s along its course", () => {
    expect(a.bachmann).not.toBeNull();
    const t = a.bachmannT!, arc = a.bachmann!.arcMm;
    let i0 = 0;
    for (let i = 1; i < t.length; i++) if (t[i] < t[i0]) i0 = i;
    // from the earliest node, travel along the cable is at vBachmann
    const iEnd = i0 < t.length / 2 ? t.length - 1 : 0;
    const v = Math.abs(arc[iEnd] - arc[i0]) / (t[iEnd] - t[i0]);
    expect(v).toBeGreaterThan(1.7);
  });
});

describe('ventricular variant (normal)', () => {
  const va = buildVentricularActivation(geo, p);
  it('HV ≈ 35–45 ms (V event = His activation)', () => {
    expect(va.hvMs).toBeGreaterThanOrEqual(35);
    expect(va.hvMs).toBeLessThanOrEqual(45);
  });
  it('Durrer: the three LV sites start within 0–5 ms of LV onset, the RV 5–10 ms later', () => {
    const on = terminalOnsets(va);
    const lv = on.filter((x) => x.id !== 'RBB');
    expect(lv.length).toBe(3);
    for (const x of lv) expect(x.relMs).toBeLessThanOrEqual(5);
    const c = cavityOnsets(va);
    expect(c.rvMs - c.lvMs).toBeGreaterThanOrEqual(5);
    expect(c.rvMs - c.lvMs).toBeLessThanOrEqual(10);
  });
  it('Purkinje mask: subendocardial, apical, no RVOT / LV posterobasal', () => {
    const pk = va.purkinje;
    expect(pk.size).toBeGreaterThan(100);
    const bad = new Set(['RVOT', 'LV_POSTEROBASAL'].map((s) => STRUCTURES.indexOf(s as never)));
    for (let n = 0; n < pk.size; n++) {
      const v = pk.voxel[n];
      expect(geo.grid.apexBase[v]).toBeLessThanOrEqual(p.purkinjeExtent);
      expect(bad.has(geo.grid.region[v])).toBe(false);
    }
    // both septal surfaces are covered (septum voxels facing LV and facing RV blood)
    const septal = new Set<number>();
    for (let n = 0; n < pk.size; n++) if (geo.grid.tissue[pk.voxel[n]] === TISSUE.Septum) septal.add(pk.chamber[n]);
    expect(septal.size).toBe(2);
  });
  it('ventricular field never enters the atria (His is the only AV connection)', () => {
    let leaked = 0;
    for (let v = 0; v < geo.grid.tissue.length; v++) if (compOfTissue(geo.grid.tissue[v]) !== COMP.Ventricular && va.field.tAct[v] !== Infinity) leaked++;
    expect(leaked).toBe(0);
    expect(va.field.tMaxMs - va.field.tMinMs).toBeLessThan(120);
  });
  it('conduction-system paths are timed at the bundle velocity', () => {
    const his = va.paths.find((x) => x.id === 'HIS')!;
    expect(his.t0).toBe(0);
    expect(his.t1).toBeCloseTo(his.lengthMm / p.vBundleMps, 6);
    for (const id of ['LAF', 'LPF', 'LSF'] as const) expect(va.paths.find((x) => x.id === id)!.t0).toBeGreaterThanOrEqual(his.t1);
  });
});

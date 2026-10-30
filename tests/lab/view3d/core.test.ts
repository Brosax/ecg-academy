import { describe, expect, it } from 'vitest';
import { frankToApp } from '../../../src/lab/sim/frame';
import { valveOpenAt } from '../../../src/lab/sim/measure/truth';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import type { ActivationField, ActiveBeat, BeatSnapshot, EngineFields, VoxelGrid } from '../../../src/lab/sim/types';
import { COMP, compOfTissue, isMyocardium, LEADS, TISSUE } from '../../../src/lab/sim/types';
import { T_NEVER } from '../../../src/lab/view3d/gpuContract';
import { buildHeartAttributes, mechReference } from '../../../src/lab/view3d/core/attributes';
import { avGapMs, packBeatPair, packBeatSnapshot } from '../../../src/lab/view3d/core/beats';
import { buildChamberWeights, buildFieldChannels, fromHalf, HALF_NEVER, packFieldVolume, toHalf } from '../../../src/lab/view3d/core/fieldTexture';
import { computeSliceArrows, gridBox, sampleCompField, sliceBasis, sliceRect } from '../../../src/lab/view3d/core/slice';
import { valveOpenness, VALVE_RAMP_MS } from '../../../src/lab/view3d/core/valveMotion';
import { CM_PER_MV, frankToAppInto, heartVectorArrow, leadAxisSpec, leadValue } from '../../../src/lab/view3d/core/vectors';
import { CONDUCTION_TIMING, pulseIntensity, pulseWindow, TABLE_FIRST_MYOCARDIUM_MS, vTimeScale } from '../../../src/lab/view3d/conductionTiming';

const eng = new StubEngine();
const expectVec = (a: readonly number[], b: readonly number[]) => a.forEach((x, i) => expect(x + 0).toBeCloseTo(b[i], 9));
const beat = (sinceMs: number, slot: 0 | 1 = 0, apdScale = 1, eventId = 1): ActiveBeat => ({ eventId, slot, sinceMs, apdScale });

describe('beat-uniform packing', () => {
  it('packs vec4(since, slot, apdScale, active), most recent first', () => {
    const out = new Float32Array(8);
    packBeatPair([beat(900, 1, 0.9), beat(120, 0, 1.1)], out);
    expect(Array.from(out.slice(0, 4))).toEqual([120, 0, expect.closeTo(1.1, 6), 1]);
    expect(Array.from(out.slice(4, 8))).toEqual([900, 1, expect.closeTo(0.9, 6), 1]);
  });
  it('moves a lone beat to position 0 and marks missing beats inactive', () => {
    const out = new Float32Array(8).fill(7);
    packBeatPair([null, beat(40)], out);
    expect(out[0]).toBe(40);
    expect(out[3]).toBe(1);
    expect(out[7]).toBe(0);
    packBeatPair([null, null], out);
    expect(out[3]).toBe(0);
    expect(out[7]).toBe(0);
  });
  it('clamps very old beats so float32 keeps precision', () => {
    const out = new Float32Array(8);
    packBeatPair([beat(3.6e6), null], out);
    expect(out[0]).toBe(60000);
  });
  it('packs the engine snapshot (atrial then ventricular) and derives the A→His gap', () => {
    const qrsOn = eng.cycleAt(2000)!.qrsOn!;
    const snap = eng.activeBeats(qrsOn);
    const out = new Float32Array(16);
    packBeatSnapshot(snap, out);
    expect(out[3]).toBe(1);
    expect(out[11]).toBe(1);
    expect(out[8]).toBeCloseTo(snap.ventricular[0]!.sinceMs, 3);
    const gap = avGapMs(snap, 130);
    expect(gap).toBeGreaterThan(100);
    expect(gap).toBeLessThan(200);
  });
});

describe('heart attributes from engine fields', () => {
  const geo = eng.geometry;
  const attr = buildHeartAttributes(geo, eng.fields);
  it('has one value per vertex and copies grid labels', () => {
    const n = geo.mesh.voxel.length;
    for (const a of Object.values(attr)) expect(a.length).toBe(n);
    for (let i = 0; i < n; i += 97) {
      const v = geo.mesh.voxel[i];
      expect(attr.tissue[i]).toBe(geo.grid.tissue[v]);
      expect(attr.region[i]).toBe(geo.grid.region[v]);
      expect(attr.aha[i]).toBe(geo.grid.aha[v]);
    }
  });
  it('uses the compartment slot field and the 1e9 sentinel for unactivated / missing slots', () => {
    let myo = 0, other = 0;
    for (let i = 0; i < attr.tAct0.length; i++) {
      const v = geo.mesh.voxel[i];
      const t = geo.grid.tissue[v];
      expect(attr.tAct1[i]).toBe(T_NEVER); // stub has no slot-1 field
      if (isMyocardium(t)) {
        const f = compOfTissue(t) === COMP.Atrial ? eng.fields.atrial[0] : eng.fields.ventricular[0];
        expect(attr.tAct0[i]).toBe(f.tAct[v]);
        expect(attr.apdRef[i]).toBeGreaterThan(100);
        myo++;
      } else {
        expect(attr.tAct0[i]).toBe(T_NEVER);
        other++;
      }
    }
    expect(myo).toBeGreaterThan(1000);
    expect(other).toBeGreaterThan(0);
  });
  it('mechanical reference times are plausible medians', () => {
    const r = mechReference(geo.grid, eng.fields);
    expect(r.tActV).toBeGreaterThan(eng.fields.ventricular[0].tMinMs);
    expect(r.tActV).toBeLessThan(eng.fields.ventricular[0].tMaxMs);
    expect(r.apdV).toBeGreaterThan(200);
    expect(r.apdA).toBeGreaterThan(100);
  });
});

/** Tiny synthetic grid: one LV voxel in the middle of a 7³ box. */
function tinyGrid(): { grid: VoxelGrid; fields: EngineFields } {
  const dims: [number, number, number] = [7, 7, 7];
  const N = 343;
  const tissue = new Uint8Array(N), chamber = new Uint8Array(N);
  const c = 3 + 7 * (3 + 7 * 3);
  tissue[c] = TISSUE.LV;
  chamber[c] = 3;
  const grid: VoxelGrid = {
    dims, hMm: 2, originMm: [-6, -6, -6], tissue, chamber, aha: new Uint8Array(N), region: new Uint8Array(N).fill(255),
    wallDepth: new Float32Array(N), apexBase: new Float32Array(N), transDir: new Float32Array(3 * N), sdfMm: new Float32Array(N).fill(3),
  };
  const tAct = new Float32Array(N).fill(Infinity);
  tAct[c] = 10;
  const f: ActivationField = { id: 'x', comp: COMP.Ventricular, tAct, tMinMs: 10, tMaxMs: 10 };
  const apdRefMs = new Float32Array(N);
  apdRefMs[c] = 250;
  const fields: EngineFields = {
    atrial: [{ ...f, comp: COMP.Atrial, tAct: new Float32Array(N).fill(Infinity) }, null],
    ventricular: [f, null],
    apd: { apdRefMs, rrRefMs: 800, rateExp: 1 / 3 },
    apAtrial: { tauUpMs: 3, tauRepMs: 40, plateauSlope: 0.3, lowpassHz: 150 },
    apVentricular: { tauUpMs: 2.5, tauRepMs: 15, plateauSlope: 0.1, lowpassHz: 150 },
  };
  return { grid, fields };
}

describe('field texture packing', () => {
  it('converts half floats accurately and encodes the sentinel as the largest finite half', () => {
    for (const x of [0, 1, -2.5, 0.333, 12.75, 123.4, 245.6, 1000, 60000]) expect(fromHalf(toHalf(x))).toBeCloseTo(x, x < 128 ? 1 : -1);
    expect(toHalf(HALF_NEVER)).toBe(0x7bff);
    expect(toHalf(1e9)).toBe(0x7bff);
    expect(fromHalf(toHalf(1e-6))).toBeCloseTo(0, 5);
  });
  it('dilates tAct/apd exactly 2 voxels (26-neighbourhood) and never touches myocardium', () => {
    const { grid, fields } = tinyGrid();
    const ch = buildFieldChannels(grid, fields, 2);
    const at = (i: number, j: number, k: number) => i + 7 * (j + 7 * k);
    expect(ch.tAct0[at(3, 3, 3)]).toBe(10);
    expect(ch.tAct0[at(4, 3, 3)]).toBe(10);
    expect(ch.tAct0[at(4, 4, 4)]).toBe(10);
    expect(ch.tAct0[at(5, 5, 5)]).toBe(10);
    expect(ch.apd[at(5, 1, 3)]).toBe(250);
    expect(Number.isNaN(ch.tAct0[at(6, 3, 3)])).toBe(true);
    expect(Number.isNaN(ch.tAct1[at(4, 3, 3)])).toBe(true);
    expect(ch.stamp[at(3, 3, 3)]).toBe(1);
    expect(ch.stamp[at(4, 3, 3)]).toBe(2);
    expect(ch.stamp[at(5, 3, 3)]).toBe(3);
  });
  it('packs RGBA16F with the sentinel outside the band and maps voxel centres to texel centres', () => {
    const { grid, fields } = tinyGrid();
    const vol = packFieldVolume(grid, fields);
    const at = (i: number, j: number, k: number) => 4 * (i + 7 * (j + 7 * k));
    expect(fromHalf(vol.rgbaHalf[at(3, 3, 3)])).toBe(10);
    expect(fromHalf(vol.rgbaHalf[at(3, 3, 3) + 2])).toBe(250);
    expect(fromHalf(vol.rgbaHalf[at(3, 3, 3) + 3])).toBe(3);
    expect(fromHalf(vol.rgbaHalf[at(0, 0, 0)])).toBe(HALF_NEVER);
    expect(vol.boxMinMm).toEqual([-7, -7, -7]);
    expect(vol.boxSizeMm).toEqual([14, 14, 14]);
    // voxel i = 3 centre (0 mm) → texture coordinate (i + 0.5) / n
    expect((0 - vol.boxMinMm[0]) / vol.boxSizeMm[0]).toBeCloseTo(3.5 / 7, 12);
    expect(vol.label).toBe(grid.tissue);
  });
  it('chamber weights are 1 inside the chamber and dilate only into outside voxels', () => {
    const { grid } = tinyGrid();
    const w = buildChamberWeights(grid);
    const at = (i: number, j: number, k: number) => 4 * (i + 7 * (j + 7 * k));
    expect(w[at(3, 3, 3) + 2]).toBe(255);
    expect(w[at(4, 3, 3) + 2]).toBe(255);
    expect(w[at(4, 3, 3) + 0]).toBe(0);
    expect(w[at(6, 3, 3) + 2]).toBe(0);
  });
  it('real stub grid: myocardium keeps its own values, blood near the wall gets dilated values', () => {
    const g = eng.geometry.grid;
    const ch = buildFieldChannels(g, eng.fields);
    let checked = 0, dil = 0;
    for (let v = 0; v < g.tissue.length; v += 13) {
      const t = g.tissue[v];
      if (compOfTissue(t) === COMP.Ventricular) {
        expect(ch.tAct0[v]).toBe(eng.fields.ventricular[0].tAct[v]);
        checked++;
      } else if (t === TISSUE.Blood && ch.stamp[v] === 2) {
        expect(Number.isFinite(ch.tAct0[v])).toBe(true);
        dil++;
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(dil).toBeGreaterThan(10);
  });
});

describe('slice plane basis and rectangle', () => {
  it('basis is orthonormal and right-handed for presets and oblique normals', () => {
    for (const n of [[0, 0, 1], [0, 1, 0], [-1, 0, 0], [0.3, -0.7, 0.2], [1, 1, 1]] as const) {
      const b = sliceBasis(n);
      const d = (a: readonly number[], c: readonly number[]) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
      expect(d(b.u, b.u)).toBeCloseTo(1, 9);
      expect(d(b.v, b.v)).toBeCloseTo(1, 9);
      expect(d(b.u, b.v)).toBeCloseTo(0, 9);
      expect(d(b.u, b.n)).toBeCloseTo(0, 9);
      const cx = [b.u[1] * b.v[2] - b.u[2] * b.v[1], b.u[2] * b.v[0] - b.u[0] * b.v[2], b.u[0] * b.v[1] - b.u[1] * b.v[0]];
      expect(d(cx, b.n)).toBeCloseTo(1, 9);
    }
  });
  it('covers the grid box exactly for an axis-aligned plane', () => {
    const box = { min: [-10, -20, -30] as const, max: [10, 40, 30] as const };
    const r = sliceRect(box, [0, 0, 1], 5, 0);
    expect(r.valid).toBe(true);
    expect(r.center[2]).toBeCloseTo(5, 9);
    expect(r.center[0]).toBeCloseTo(0, 9);
    expect(r.center[1]).toBeCloseTo(10, 9);
    expect([r.halfU, r.halfV].sort((a, b) => a - b)).toEqual([expect.closeTo(10, 9), expect.closeTo(30, 9)]);
    expect(sliceRect(box, [0, 0, 1], 31).valid).toBe(false);
  });
  it('oblique plane: every box/plane intersection point lies inside the rectangle', () => {
    const g = eng.geometry.grid;
    const box = gridBox(g);
    const r = sliceRect(box, [0.4, 0.8, -0.3], 12, 0);
    expect(r.valid).toBe(true);
    for (let k = 0; k < 2000; k++) {
      const p: [number, number, number] = [
        box.min[0] + ((k * 37) % 101) / 100 * (box.max[0] - box.min[0]),
        box.min[1] + ((k * 53) % 103) / 102 * (box.max[1] - box.min[1]),
        0,
      ];
      // solve for z on the plane
      const n = r.n;
      p[2] = (12 - n[0] * p[0] - n[1] * p[1]) / n[2];
      if (p[2] < box.min[2] || p[2] > box.max[2]) continue;
      const q = [p[0] - r.center[0], p[1] - r.center[1], p[2] - r.center[2]];
      const pu = q[0] * r.u[0] + q[1] * r.u[1] + q[2] * r.u[2];
      const pv = q[0] * r.v[0] + q[1] * r.v[1] + q[2] * r.v[2];
      expect(Math.abs(pu)).toBeLessThanOrEqual(r.halfU + 1e-6);
      expect(Math.abs(pv)).toBeLessThanOrEqual(r.halfV + 1e-6);
    }
  });
  it('propagation arrows lie in the plane and point toward later activation', () => {
    const g = eng.geometry.grid;
    const r = sliceRect(gridBox(g), [0, 0, 1], 0);
    const arrows = computeSliceArrows(g, eng.fields, r, 5);
    expect(arrows.count).toBeGreaterThan(20);
    let forward = 0;
    for (let a = 0; a < arrows.count; a++) {
      const d = [arrows.dir[3 * a], arrows.dir[3 * a + 1], arrows.dir[3 * a + 2]];
      expect(Math.hypot(d[0], d[1], d[2])).toBeCloseTo(1, 4);
      expect(Math.abs(d[2])).toBeLessThan(1e-6);
      const c = arrows.comp[a];
      const f = c === COMP.Atrial ? eng.fields.atrial[0] : eng.fields.ventricular[0];
      const p = [arrows.pos[3 * a], arrows.pos[3 * a + 1], arrows.pos[3 * a + 2]] as const;
      const t0 = sampleCompField(g, f.tAct, c, [p[0] - d[0] * 2, p[1] - d[1] * 2, p[2]]);
      const t1 = sampleCompField(g, f.tAct, c, [p[0] + d[0] * 2, p[1] + d[1] * 2, p[2]]);
      if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) forward++;
    }
    expect(forward / arrows.count).toBeGreaterThan(0.8);
  });
});

describe('Frank → app arrow and lead axes', () => {
  it('maps Frank axes to the app frame (left, inferior → −y, posterior → −z), 1 mV = 4 cm', () => {
    const z = new Float32Array(3);
    const a = heartVectorArrow(new Float32Array([1, 0, 0]), z);
    expectVec(a.dir, [1, 0, 0]);
    expect(a.lengthCm).toBeCloseTo(CM_PER_MV, 9);
    expectVec(heartVectorArrow(new Float32Array([0, 0.5, 0]), new Float32Array([0, 0.5, 0])).dir, [0, -1, 0]);
    expectVec(heartVectorArrow(z, new Float32Array([0, 0, 2])).dir, [0, 0, -1]);
    expect(heartVectorArrow(z, new Float32Array([0, 0, 2])).lengthCm).toBeCloseTo(8, 9);
    const out = [0, 0, 0];
    for (const v of [[0.3, -1.2, 0.7], [1, 2, 3]] as const) {
      frankToAppInto(out, v[0], v[1], v[2]);
      expectVec(out, frankToApp(v));
    }
  });
  it('builds lead axes per lead type with the right poles', () => {
    const I = leadAxisSpec(eng.projector, 'I');
    expect(I.kind).toBe('bipolar');
    expect([I.positive, ...I.negative]).toEqual(['LA', 'RA']);
    expect(I.dirApp[0]).toBeGreaterThan(0.9);
    const aVF = leadAxisSpec(eng.projector, 'aVF');
    expect(aVF.kind).toBe('augmented');
    expect(aVF.positive).toBe('LL');
    expect(aVF.negative).toEqual(['RA', 'LA']);
    expect(aVF.dirApp[1]).toBeLessThan(-0.9); // inferior
    const V2 = leadAxisSpec(eng.projector, 'V2');
    expect(V2.kind).toBe('precordial');
    expect(V2.wct).toBe(true);
    expect(V2.dirApp[2]).toBeGreaterThan(0.9); // anterior
    expect(V2.sensitivity).toBeGreaterThan(I.sensitivity);
  });
  it('projection equals the ECG sample and |L|·(H·L̂)', () => {
    const n = 1;
    const out = new Float32Array(12);
    const hA = new Float32Array([0.05, 0.1, -0.02]), hV = new Float32Array([0.7, 0.9, 0.3]);
    eng.projector.project(hA, hV, n, out);
    LEADS.forEach((l, i) => {
      expect(leadValue(eng.projector, l, hA, hV)).toBeCloseTo(out[i], 5);
      const s = leadAxisSpec(eng.projector, l);
      const H = frankToApp([hA[0] + hV[0], hA[1] + hV[1], hA[2] + hV[2]]);
      const proj = s.sensitivity * (H[0] * s.dirApp[0] + H[1] * s.dirApp[1] + H[2] * s.dirApp[2]);
      expect(proj).toBeCloseTo(out[i], 5);
    });
  });
});

describe('conduction pulse timing', () => {
  const snap = (sinceA: number | null, sinceV: number | null): BeatSnapshot => ({
    atrial: [sinceA === null ? null : beat(sinceA), null],
    ventricular: [sinceV === null ? null : beat(sinceV), null],
  });
  it('stretches V-referenced times to the first ventricular activation', () => {
    expect(vTimeScale(TABLE_FIRST_MYOCARDIUM_MS)).toBe(1);
    expect(vTimeScale(20)).toBeCloseTo(0.5, 9);
    expect(vTimeScale(Infinity)).toBe(1);
  });
  it('AV node runs from A + 50 ms to the His (V) event; His-Purkinje pulses use the V event', () => {
    const w = pulseWindow('AVN', snap(80, null), 130, 1)!;
    expect(w.sinceStartMs).toBeCloseTo(30, 9);
    expect(w.durMs).toBeCloseTo(130 - 50, 9);
    const his = pulseWindow('HIS', snap(140, 10), 130, 0.5)!;
    expect(his.sinceStartMs).toBeCloseTo(10, 9);
    expect(his.durMs).toBeCloseTo(CONDUCTION_TIMING.HIS.end.ms * 0.5, 9);
    expect(pulseWindow('LAF', snap(10, null), 130, 1)).toBeNull();
  });
  it('the pulse is brightest at its front and dark ahead of it', () => {
    const w = { sinceStartMs: 10, durMs: 20 }; // front at u = 0.5
    expect(pulseIntensity(0.5, w, 12)).toBeCloseTo(1, 6);
    expect(pulseIntensity(0.8, w, 12)).toBe(0);
    expect(pulseIntensity(0.2, w, 12)).toBeLessThan(1);
    expect(pulseIntensity(0.2, w, 12)).toBeGreaterThan(0);
  });
});

describe('valve motion', () => {
  it('matches valveOpenAt outside the opening/closing ramps', () => {
    const c = eng.cycleAt(3000)!;
    for (const ev of c.valves) {
      for (let t = c.pOn! - 50; t < c.pOn! + 1200; t += 3) {
        const nearEdge = [ev.openMs, ev.closeMs].some((e) => t >= e && t < e + VALVE_RAMP_MS);
        if (nearEdge) continue;
        expect(valveOpenness(ev.id, ev, t)).toBe(valveOpenAt(ev, t) ? 1 : 0);
      }
      const mid = valveOpenness(ev.id, ev, ev.openMs + VALVE_RAMP_MS / 2);
      expect(mid).toBeGreaterThan(0.2);
      expect(mid).toBeLessThan(0.8);
    }
    expect(valveOpenness('MITRAL', undefined, 0)).toBe(1);
    expect(valveOpenness('AORTIC', undefined, 0)).toBe(0);
  });
});

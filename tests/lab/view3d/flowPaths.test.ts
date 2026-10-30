/**
 * Schematic blood-flow streamlines (src/view3d/core/flowPaths.ts) on the stub heart (fast) and the baked HRA heart.
 * Containment is scored on the raw voxel labels (tissue === Blood, chamber in the path's chambers), not on the
 * builder's own largest-component domains. Exempt from it: samples within VALVE_BAND_MM of the valve plane (the
 * crossing runs through the annulus — a Ring slab on the stub, Ring next to the HRA mitral orifice) and, on outflow
 * paths, everything past the semilunar plane (the great-artery stub lies in the arterial root: Out on HRA, Vessel on
 * the stub). The opposite-side check has no exemption: Ring / Out / Vessel are not blood.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { dot, sub } from '../../../src/lab/sim/frame';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { removeIslands } from '../../../src/lab/sim/geometry/hra/voxelize';
import { buildStubGeometry } from '../../../src/lab/sim/stub/stubGeometry';
import type { GeometryBundle, ValveGeom, ValveId, Vec3 } from '../../../src/lab/sim/types';
import { CHAMBER, TISSUE, VALVES } from '../../../src/lab/sim/types';
import {
  buildFlowPaths, computeFlowPaths, FLOW_MIN_RADIUS_MM, FLOW_STEP_MM, FLOW_STUB_MM, flowChamberDomains,
} from '../../../src/lab/view3d/core/flowPaths';
import type { FlowPath } from '../../../src/lab/view3d/core/flowTypes';

const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
const VALVE_BAND_MM = 6;
const ALLOWED: Record<ValveId, readonly number[]> = {
  MITRAL: [CHAMBER.LA, CHAMBER.LV],
  TRICUSPID: [CHAMBER.RA, CHAMBER.RV],
  AORTIC: [CHAMBER.LV],
  PULMONARY: [CHAMBER.RV],
};
const OPPOSITE: Record<'L' | 'R', readonly number[]> = { L: [CHAMBER.RA, CHAMBER.RV], R: [CHAMBER.LA, CHAMBER.LV] };

const voxAt = (geo: GeometryBundle, p: Vec3): number => {
  const g = geo.grid, [nx, ny, nz] = g.dims;
  const i = Math.round((p[0] - g.originMm[0]) / g.hMm), j = Math.round((p[1] - g.originMm[1]) / g.hMm), k = Math.round((p[2] - g.originMm[2]) / g.hMm);
  return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : i + nx * (j + ny * k);
};
const valveOf = (geo: GeometryBundle, id: ValveId): ValveGeom => geo.valves.find((v) => v.id === id)!;
const planeDist = (v: ValveGeom, p: Vec3) => dot(sub(p, v.centerMm), v.normal);
const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Share of the scored samples inside Blood of the allowed chambers, and the scored count. */
function containment(geo: GeometryBundle, p: FlowPath): { frac: number; scored: number } {
  const v = valveOf(geo, p.valve), g = geo.grid;
  let ok = 0, scored = 0;
  for (const x of p.pts) {
    const s = planeDist(v, x);
    if (Math.abs(s) <= VALVE_BAND_MM || (p.leg === 'out' && s > 0)) continue;
    scored++;
    const w = voxAt(geo, x);
    if (w >= 0 && g.tissue[w] === TISSUE.Blood && ALLOWED[p.valve].includes(g.chamber[w])) ok++;
  }
  return { frac: ok / Math.max(1, scored), scored };
}

/** Samples (and segment mid-points) that sit in blood of the other heart side. */
function oppositeHits(geo: GeometryBundle, p: FlowPath): number {
  const g = geo.grid;
  let hits = 0;
  const test = (x: Vec3) => {
    const w = voxAt(geo, x);
    if (w >= 0 && g.tissue[w] === TISSUE.Blood && OPPOSITE[p.side].includes(g.chamber[w])) hits++;
  };
  p.pts.forEach((x, i) => {
    test(x);
    if (i > 0) test(mid(p.pts[i - 1], x));
  });
  return hits;
}

/** Sign changes of the plane distance along the path, and the worst tangent·normal within ±3 mm of the plane. */
function crossing(geo: GeometryBundle, p: FlowPath): { changes: number; minDot: number; first: number; last: number } {
  const v = valveOf(geo, p.valve);
  const s = p.pts.map((x) => planeDist(v, x));
  let changes = 0, minDot = Infinity;
  for (let i = 1; i < s.length; i++) if (Math.sign(s[i]) !== Math.sign(s[i - 1]) && s[i] !== 0) changes++;
  for (let i = 0; i < s.length; i++) {
    if (Math.abs(s[i]) > 3) continue;
    const a = p.pts[Math.max(0, i - 1)], b = p.pts[Math.min(s.length - 1, i + 1)];
    minDot = Math.min(minDot, dot(unit(sub(b, a)), v.normal));
  }
  return { changes, minDot, first: s[0], last: s[s.length - 1] };
}

function checkPaths(geo: GeometryBundle, paths: readonly FlowPath[], label: string): void {
  expect(paths.map((p) => p.valve)).toEqual([...VALVES]);
  expect(paths.map((p) => `${p.side}${p.leg}`)).toEqual(['Lin', 'Rin', 'Lout', 'Rout']);
  for (const p of paths) {
    const c = containment(geo, p), x = crossing(geo, p), opp = oppositeHits(geo, p);
    console.log(
      `[flowPaths ${label}] ${p.valve.padEnd(9)} ${p.lengthMm.toFixed(1)} mm, ${p.pts.length} pts, in-blood ${(100 * c.frac).toFixed(1)} % of ${c.scored}, ` +
        `crossings ${x.changes}, min t·n ${x.minDot.toFixed(2)}, opposite ${opp}, r ${Math.min(...p.radiusMm).toFixed(1)}–${Math.max(...p.radiusMm).toFixed(1)} mm`,
    );
    expect(c.scored).toBeGreaterThan(10);
    expect(c.frac).toBeGreaterThanOrEqual(0.95);
    expect(opp).toBe(0);
    expect(x.first).toBeLessThan(0);
    expect(x.last).toBeGreaterThan(0);
    expect(x.changes).toBe(1);
    expect(x.minDot).toBeGreaterThan(0.5);
    expect(p.lengthMm).toBeGreaterThan(30);
    expect(p.lengthMm).toBeLessThan(160);
    expect(p.radiusMm.length).toBe(p.pts.length);
    for (const r of p.radiusMm) {
      expect(r).toBeGreaterThanOrEqual(FLOW_MIN_RADIUS_MM);
      expect(r).toBeLessThanOrEqual(valveOf(geo, p.valve).radiusMm);
    }
    for (let i = 1; i < p.pts.length; i++) {
      const d = Math.hypot(...sub(p.pts[i], p.pts[i - 1]));
      expect(d).toBeLessThanOrEqual(FLOW_STEP_MM + 1e-9);
      expect(d).toBeGreaterThan(0.5);
    }
  }
  // inflow → apex → outflow: each side's loop is continuous at the apex, the outflow ends on the stub tip, and in the
  // middle third of the ventricular inflow leg the two legs run apart (inflow side vs outflow tract), not on one line
  for (const [inId, outId] of [['MITRAL', 'AORTIC'], ['TRICUSPID', 'PULMONARY']] as const) {
    const pin = paths[VALVES.indexOf(inId)], pout = paths[VALVES.indexOf(outId)];
    expect(pin.pts[pin.pts.length - 1]).toEqual(pout.pts[0]);
    const sl = valveOf(geo, outId), tip = pout.pts[pout.pts.length - 1];
    expect(planeDist(sl, tip)).toBeCloseTo(FLOW_STUB_MM, 6);
    const av = valveOf(geo, inId);
    const vent = pin.pts.slice(pin.pts.findIndex((x) => planeDist(av, x) > VALVE_BAND_MM));
    const third = vent.slice(Math.floor(vent.length / 3), Math.ceil((2 * vent.length) / 3));
    const gap = third.map((x) => Math.min(...pout.pts.map((y) => Math.hypot(...sub(x, y))))).sort((a, b) => a - b);
    console.log(`[flowPaths ${label}] ${inId}/${outId} mid-ventricle gap min ${gap[0].toFixed(1)}, median ${gap[gap.length >> 1].toFixed(1)} mm`);
    expect(gap[gap.length >> 1]).toBeGreaterThan(5);
  }
}

/** Reference: removeIslands per chamber label, as in the bake (hra/voxelize). */
function expectDomainsMatchRemoveIslands(geo: GeometryBundle): void {
  const g = geo.grid, n = g.tissue.length;
  const dom = flowChamberDomains(g), mask = new Uint8Array(n);
  let diff = 0, kept = 0, blood = 0;
  for (const ch of [CHAMBER.LA, CHAMBER.RA, CHAMBER.LV, CHAMBER.RV]) {
    for (let v = 0; v < n; v++) mask[v] = g.tissue[v] === TISSUE.Blood && g.chamber[v] === ch ? 1 : 0;
    const keep = removeIslands(mask, g.dims, 'largest');
    for (let v = 0; v < n; v++) {
      if ((keep[v] === 1) !== (dom[v] === ch)) diff++;
      kept += keep[v];
      blood += mask[v];
    }
  }
  expect(diff).toBe(0);
  expect(kept).toBeGreaterThan(0.95 * blood);
}

describe('flow paths on the stub heart', () => {
  const geo = buildStubGeometry();
  it('runs inflow → valve → apex and apex → outflow → valve → stub, inside the right blood', () => {
    checkPaths(geo, computeFlowPaths(geo), 'stub');
  });
  it('is deterministic and cached per geometry', () => {
    expect(computeFlowPaths(geo)).toEqual(computeFlowPaths(geo));
    expect(buildFlowPaths(geo)).toBe(buildFlowPaths(geo));
    const coarse = buildStubGeometry(3);
    expect(buildFlowPaths(coarse)).not.toBe(buildFlowPaths(geo));
  });
  it('chamber domains = largest 6-connected component of each cavity label', () => {
    expectDomainsMatchRemoveIslands(geo);
  });
});

describe('flow paths on the HRA heart', () => {
  let geo: GeometryBundle;
  let paths: readonly FlowPath[];
  let ms = 0;
  beforeAll(async () => {
    geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
    const t0 = performance.now();
    paths = buildFlowPaths(geo);
    ms = performance.now() - t0;
    console.log(`[flowPaths hra] build ${ms.toFixed(0)} ms`);
  });
  it('runs inside the right blood, crosses each valve once head-on, never enters the other side', () => {
    checkPaths(geo, paths, 'hra');
  });
  it('is deterministic and served from the cache', () => {
    expect(buildFlowPaths(geo)).toBe(paths);
    expect(computeFlowPaths(geo)).toEqual(paths);
  });
  it('drops the label-leak crevices: domains = largest component per cavity label', () => {
    expectDomainsMatchRemoveIslands(geo);
  });
});

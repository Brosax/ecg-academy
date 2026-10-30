/**
 * Vessel streams of the schematic blood-flow layer (src/view3d/core/vesselPaths.ts) on the baked HRA heart: venous
 * inflow along the venae cavae and pulmonary veins into the atria, outflow along the aorta and both pulmonary
 * arteries. Containment is scored on the raw voxel labels (a stream sample in blood must be blood of its own atrium:
 * no stream may fake a shunt through another cavity) and on the overlay meshes (the centreline stays in the lumen).
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { localToApp } from '../../../src/lab/sim/frame';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { buildStubGeometry } from '../../../src/lab/sim/stub/stubGeometry';
import type { GeometryBundle, Vec3 } from '../../../src/lab/sim/types';
import { CHAMBER, TISSUE, VALVES } from '../../../src/lab/sim/types';
import { createFlowCtx, computeFlowPaths } from '../../../src/lab/view3d/core/flowPaths';
import type { VesselFlowPath } from '../../../src/lab/view3d/core/flowTypes';
import { isVesselPath } from '../../../src/lab/view3d/core/flowTypes';
import {
  BRIDGE_MAX_MM, buildFlowNetwork, computeVesselPaths, FLOW_ARTERIES, FLOW_VEINS, marchTube, ringAt, vesselComponents,
} from '../../../src/lab/view3d/core/vesselPaths';

const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function voxAt(geo: GeometryBundle, p: Vec3): number {
  const g = geo.grid, [nx, ny, nz] = g.dims;
  const i = Math.round((p[0] - g.originMm[0]) / g.hMm), j = Math.round((p[1] - g.originMm[1]) / g.hMm), k = Math.round((p[2] - g.originMm[2]) / g.hMm);
  return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : i + nx * (j + ny * k);
}

/** Distance from p to the nearest vertex of an overlay. */
function toMesh(geo: GeometryBundle, id: string, p: Vec3): number {
  const V = geo.overlays!.find((o) => o.id === id)!.position;
  let best = Infinity;
  for (let i = 0; i < V.length; i += 3) best = Math.min(best, (V[i] - p[0]) ** 2 + (V[i + 1] - p[1]) ** 2 + (V[i + 2] - p[2]) ** 2);
  return Math.sqrt(best);
}

describe('vessel streams on the HRA heart', () => {
  let geo: GeometryBundle;
  let net: ReturnType<typeof buildFlowNetwork>;
  let buildMs = 0;
  beforeAll(async () => {
    geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
    const t0 = performance.now();
    net = buildFlowNetwork(geo);
    buildMs = performance.now() - t0;
  });
  const veins = () => net.vessels.filter((p) => p.leg === 'in');
  const arteries = () => net.vessels.filter((p) => p.leg === 'out');

  it('one stream per vein (both venae cavae, four pulmonary veins), the aorta and both pulmonary arteries', () => {
    expect(net.heart.map((p) => p.valve)).toEqual([...VALVES]);
    expect(veins().map((p) => p.vessel)).toEqual([...FLOW_VEINS.R, ...FLOW_VEINS.L]);
    expect(arteries().map((p) => `${p.vessel}${p.branch ? `/${p.branch}` : ''}`)).toEqual(['AORTA', 'PULMONARY_TRUNK/L', 'PULMONARY_TRUNK/R']);
    for (const p of net.vessels) {
      expect(isVesselPath(p)).toBe(true);
      expect(p.pts.length).toBe(p.radiusMm.length);
      expect(p.pts.length).toBeGreaterThan(10);
      for (const r of p.radiusMm) expect(r).toBeGreaterThanOrEqual(1);
    }
    // built once per geometry, on first show of the layer: a few hundred ms at most
    expect(buildMs).toBeLessThan(3000);
  });

  it('veins: right side → TRICUSPID stream, left side → MITRAL stream, ending exactly where the atrial leg starts', () => {
    const tIn = net.heart[VALVES.indexOf('TRICUSPID')], mIn = net.heart[VALVES.indexOf('MITRAL')];
    for (const v of veins()) {
      const right = (FLOW_VEINS.R as readonly string[]).includes(v.vessel);
      expect(v.side).toBe(right ? 'R' : 'L');
      expect(v.valve).toBe(right ? 'TRICUSPID' : 'MITRAL');
      const body = (right ? tIn : mIn).pts[0];
      expect(dist(v.pts[v.pts.length - 1], body), v.vessel).toBeLessThan(1e-6);
      // the stream starts out in the vein, well upstream of the atrium
      expect(dist(v.pts[0], body), v.vessel).toBeGreaterThan(25);
      expect(toMesh(geo, v.vessel, v.pts[0]), v.vessel).toBeLessThan(15);
    }
  });

  it('veins: every sample that lies in blood is blood of its own atrium (no stream crosses another cavity)', () => {
    const g = geo.grid;
    for (const v of veins()) {
      const own = v.side === 'L' ? CHAMBER.LA : CHAMBER.RA;
      let inAtrium = 0;
      for (const p of v.pts) {
        const w = voxAt(geo, p);
        if (w < 0 || g.tissue[w] !== TISSUE.Blood) continue;
        expect(g.chamber[w], `${v.vessel} at ${p.map(Math.round)}`).toBe(own);
        inAtrium++;
      }
      // the atrial leg runs through the atrium's blood
      expect(inAtrium, v.vessel).toBeGreaterThanOrEqual(5);
    }
  });

  it('veins: orifice found from the blood↔Vessel face contacts, a vein short of the atrium bridged within the cap', () => {
    const bridged = veins().filter((v) => v.bridged);
    // HRA: only the left superior pulmonary vein ends short of the left-atrial blood (≈ 8 mm)
    expect(bridged.map((v) => v.vessel)).toEqual(['PV_LS']);
    expect(BRIDGE_MAX_MM).toBeLessThanOrEqual(10);
  });

  it('vessel samples run along the lumen: about one lumen radius from the wall vertices, not on the wall', () => {
    for (const v of net.vessels) {
      const grid = geo.grid;
      const ratios: number[] = [];
      v.pts.forEach((p, i) => {
        const w = voxAt(geo, p);
        if (w >= 0 && grid.tissue[w] === TISSUE.Blood) return; // the cavity part is scored above
        ratios.push(toMesh(geo, v.vessel, p) / v.radiusMm[i]);
      });
      if (ratios.length < 5) continue;
      ratios.sort((a, b) => a - b);
      const median = ratios[ratios.length >> 1];
      expect(median, v.vessel).toBeGreaterThan(0.5);
      expect(median, v.vessel).toBeLessThan(1.5);
    }
  });

  it('arteries continue the semilunar streams from their stub end; the aorta runs through the arch, the trunk forks', () => {
    const aOut = net.heart[VALVES.indexOf('AORTIC')], pOut = net.heart[VALVES.indexOf('PULMONARY')];
    const [aorta, pl, pr] = arteries();
    expect(aorta.valve).toBe('AORTIC');
    expect(aorta.side).toBe('L');
    expect(dist(aorta.pts[0], aOut.pts[aOut.pts.length - 1])).toBeLessThan(1e-6);
    expect(aorta.lengthMm).toBeGreaterThan(120);
    // ends in the descending aorta: the far end is lower (app −y, body inferior) than the arch top
    const app = aorta.pts.map((p) => localToApp(geo.pose, p));
    const top = Math.max(...app.map((p) => p[1]));
    expect(top - app[app.length - 1][1]).toBeGreaterThan(3); // cm
    for (const b of [pl, pr]) {
      expect(b.valve).toBe('PULMONARY');
      expect(b.side).toBe('R');
      expect(dist(b.pts[0], pOut.pts[pOut.pts.length - 1])).toBeLessThan(1e-6);
    }
    // left branch ends to the patient's left (app +x) of the right one
    const xEnd = (p: VesselFlowPath) => localToApp(geo.pose, p.pts[p.pts.length - 1])[0];
    expect(xEnd(pl)).toBeGreaterThan(xEnd(pr) + 3);
    expect(dist(pl.pts[pl.pts.length - 1], pr.pts[pr.pts.length - 1])).toBeGreaterThan(40);
    for (const p of [aorta, pl, pr]) expect(FLOW_ARTERIES[p.side]).toBe(p.vessel);
  });

  it('pure and deterministic: a second build on a fresh context gives the same streams', () => {
    const c = createFlowCtx(geo);
    const again = computeVesselPaths(geo, c, computeFlowPaths(geo, c));
    expect(again.length).toBe(net.vessels.length);
    again.forEach((p, i) => {
      expect(p.vessel).toBe(net.vessels[i].vessel);
      expect(p.pts).toEqual(net.vessels[i].pts);
    });
    // the network is cached per geometry
    expect(buildFlowNetwork(geo)).toBe(net);
  });

  it('ring fit: the axis of a hollow tube from a partial arc, and the march follows it', () => {
    // synthetic tube wall, radius 10 mm along +z, 0..60 mm, vertices on rings every 1 mm
    const V: number[] = [];
    for (let z = 0; z <= 60; z += 1) for (let a = 0; a < 48; a++) V.push(10 * Math.cos((2 * Math.PI * a) / 48) + 3, 10 * Math.sin((2 * Math.PI * a) / 48), z);
    const W = Float32Array.from(V);
    const ring = ringAt(W, [9, 4, 20], [0, 0, 1], 25);
    expect(ring).not.toBeNull();
    expect(dist(ring!.c, [3, 0, 20])).toBeLessThan(0.05);
    expect(ring!.r).toBeCloseTo(10, 1);
    // less than half the wall in reach (a ≈ 160° arc): still the axis; a ≈ 100° patch is not taken for a ring
    const arc = ringAt(W, [13, 0, 20], [0, 0, 1], 13);
    expect(arc).not.toBeNull();
    expect(dist(arc!.c, [3, 0, 20])).toBeLessThan(0.5);
    expect(ringAt(W, [13, 0, 20], [0, 0, 1], 8)).toBeNull();
    // a march entering off-axis and tilted converges on the axis and stops past the end
    const m = marchTube(W, [8, 2, -5], [0.2, 0, 1], 200);
    const last = m.pts[m.pts.length - 1];
    expect(Math.hypot(last[0] - 3, last[1])).toBeLessThan(0.5);
    expect(last[2]).toBeGreaterThan(55);
    expect(last[2]).toBeLessThan(62);
    // components: a vessel split into separate tubes keeps the big ones only
    const idx: number[] = [];
    for (let k = 0; k < 60; k++) for (let a = 0; a < 48; a++) {
      const p = k * 48 + a, q = k * 48 + ((a + 1) % 48);
      idx.push(p, q, p + 48, q, q + 48, p + 48);
    }
    expect(vesselComponents({ position: W, index: Uint32Array.from(idx) }).length).toBe(1);
  });
});

describe('vessel streams without overlays (stub heart)', () => {
  it('no vessel streams, the four heart streams unchanged', () => {
    const geo = buildStubGeometry();
    const net = buildFlowNetwork(geo);
    expect(net.vessels).toEqual([]);
    expect(net.heart.map((p) => p.valve)).toEqual([...VALVES]);
    expect(net.heart.every((p) => !isVesselPath(p))).toBe(true);
  });
});

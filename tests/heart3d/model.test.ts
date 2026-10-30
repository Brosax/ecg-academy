import { describe, expect, it } from 'vitest';
import type { HeartAsset } from '../../src/heart3d/format';
import {
  arcFractions,
  buildTube,
  computeNormals,
  inflate,
  labelMask,
  mergeTubes,
  pathwayBridge,
  pointAtFraction,
  polylineLength,
  regionOutline,
  ringPoints,
  smoothPolyline,
  vertexNeighbors,
} from '../../src/heart3d/model';
import { heart } from './asset';

/** n×n grid of unit squares in the z = 0 plane (normals +z). */
function grid(n: number) {
  const pos: number[] = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) pos.push(i, j, 0);
  const idx: number[] = [];
  const v = (i: number, j: number) => j * (n + 1) + i;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      idx.push(v(i, j), v(i + 1, j), v(i + 1, j + 1));
      idx.push(v(i, j), v(i + 1, j + 1), v(i, j + 1));
    }
  return { pos: Float32Array.from(pos), idx: Uint32Array.from(idx), v };
}

describe('mesh helpers', () => {
  it('computes unit normals facing the winding side', () => {
    const g = grid(2);
    const n = computeNormals(g.pos, g.idx);
    for (let i = 0; i < n.length; i += 3) {
      expect(n[i + 2]).toBeCloseTo(1, 6);
      expect(Math.hypot(n[i], n[i + 1], n[i + 2])).toBeCloseTo(1, 6);
    }
  });

  it('builds symmetric vertex adjacency', () => {
    const g = grid(2);
    const nb = vertexNeighbors(g.idx, 9);
    const has = (a: number, b: number) => Array.from(nb.list.subarray(nb.offsets[a], nb.offsets[a + 1])).includes(b);
    expect(has(4, 0)).toBe(true);
    expect(has(0, 4)).toBe(true);
    expect(has(0, 8)).toBe(false);
  });

  it('thickens only around the masked region, with a smooth falloff', () => {
    const g = grid(6);
    const N = computeNormals(g.pos, g.idx);
    const mask = new Uint8Array(49);
    mask[g.v(3, 3)] = 1;
    const out = inflate(g.pos, N, vertexNeighbors(g.idx, 49), mask, 4, 2);
    expect(out[3 * g.v(3, 3) + 2]).toBeCloseTo(4, 6);
    const near = out[3 * g.v(4, 3) + 2];
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(4);
    expect(out[3 * g.v(0, 0) + 2]).toBe(0);
  });

  it('outlines a region as a closed loop on its border', () => {
    const g = grid(6);
    const N = computeNormals(g.pos, g.idx);
    const mask = new Uint8Array(49);
    for (let j = 2; j <= 4; j++) for (let i = 2; i <= 4; i++) mask[g.v(i, j)] = 1;
    const loops = regionOutline(g.pos, N, g.idx, mask, 0.5);
    expect(loops.length).toBe(1);
    const L = loops[0];
    const n = L.length / 3;
    expect(n).toBeGreaterThanOrEqual(8);
    expect([L[0], L[1]]).toEqual([L[3 * (n - 1)], L[3 * (n - 1) + 1]]); // closed
    for (let k = 0; k < n; k++) {
      expect(L[3 * k + 2]).toBeCloseTo(0.5, 6); // lifted along the normal
      expect(L[3 * k]).toBeGreaterThanOrEqual(1.5);
      expect(L[3 * k]).toBeLessThanOrEqual(4.5);
    }
  });

  it('smooths polylines keeping open ends fixed', () => {
    const p = Float32Array.from([0, 0, 0, 1, 2, 0, 2, 0, 0]);
    const s = smoothPolyline(p, 1, false);
    expect(Array.from(s.subarray(0, 3))).toEqual([0, 0, 0]);
    expect(Array.from(s.subarray(6, 9))).toEqual([2, 0, 0]);
    expect(s[4]).toBeCloseTo(1, 6);
  });
});

describe('polylines and tubes', () => {
  const line = Float32Array.from([0, 0, 0, 3, 0, 0, 3, 4, 0]);

  it('measures arc fractions and interpolates along them', () => {
    expect(polylineLength(line)).toBeCloseTo(7, 6);
    const fr = arcFractions(line);
    expect(Array.from(fr)).toEqual([0, 3 / 7, 1].map((x) => Math.fround(x)));
    const mid = pointAtFraction(line, fr, 0.5);
    expect(mid[0]).toBeCloseTo(3, 5);
    expect(mid[1]).toBeCloseTo(0.5, 5);
    expect(pointAtFraction(line, fr, -1)).toEqual([0, 0, 0]);
    expect(pointAtFraction(line, fr, 2)).toEqual([3, 4, 0]);
  });

  it('builds a tube with one ring per point and per-vertex arc fraction', () => {
    const t = buildTube(line, 0.5, 6);
    expect(t.positions.length).toBe(3 * 6 * 3);
    expect(t.indices.length).toBe(2 * 6 * 6);
    expect(t.along[0]).toBe(0);
    expect(t.along[t.along.length - 1]).toBe(1);
    // every ring vertex is `radius` away from its centre point
    for (let k = 0; k < 6; k++) expect(Math.hypot(t.positions[3 * k], t.positions[3 * k + 1], t.positions[3 * k + 2])).toBeCloseTo(0.5, 5);
    const m = mergeTubes([t, t]);
    expect(m.along.length).toBe(2 * t.along.length);
    expect(Math.max(...m.indices)).toBe(2 * t.along.length - 1);
  });

  it('draws a ring of the requested radius around a point', () => {
    const r = ringPoints([1, 2, 3], [0, 0, 1], 5, 16);
    expect(r.length).toBe(17 * 3);
    for (let k = 0; k < 17; k++) {
      expect(Math.hypot(r[3 * k] - 1, r[3 * k + 1] - 2)).toBeCloseTo(5, 4);
      expect(r[3 * k + 2]).toBeCloseTo(3, 5);
    }
  });
});

describe('on the heart asset', () => {
  const a: HeartAsset = heart();
  const N = computeNormals(a.positions, a.indices);

  it('builds an accessory-pathway bridge from atrium to the ventricular region across the AV groove', () => {
    for (const id of ['lv-basal-inferolateral', 'lv-basal-anterolateral', 'rv-basal', 'lv-basal-inferoseptal'] as const) {
      const p = pathwayBridge(a, N, id);
      expect(p, id).not.toBeNull();
      const n = p!.length / 3;
      const len = polylineLength(p!);
      expect(len, id).toBeGreaterThan(8);
      expect(len, id).toBeLessThan(45);
      // the first point is on the atrial side (toward the base), the last on the ventricle
      const u = a.header.frame.longAxis;
      const lvl = (k: number) => p![3 * k] * u[0] + p![3 * k + 1] * u[1] + p![3 * k + 2] * u[2];
      expect(lvl(0), id).toBeGreaterThan(lvl(n - 1));
    }
  });

  it('labelMask selects exactly the vertices of a label', () => {
    const m = labelMask(a, ['lv-apex']);
    const k = a.labelIds.indexOf('lv-apex');
    let n = 0;
    for (let v = 0; v < m.length; v++) {
      expect(m[v] === 1).toBe(a.labels[v] === k);
      n += m[v];
    }
    expect(n).toBeGreaterThan(0);
  });

  it('outlines a real region in one or a few loops', () => {
    const loops = regionOutline(a.positions, N, a.indices, labelMask(a, ['lv-mid-anterior']), 0.7);
    expect(loops.length).toBeGreaterThan(0);
    expect(loops.length).toBeLessThan(12);
  });
});

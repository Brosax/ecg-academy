import { describe, expect, it } from 'vitest';
import { sdSphere, smin } from '../../../../src/lab/sim/geometry/sdf';
import { computeNormals, surfaceNets } from '../../../../src/lab/sim/geometry/surfaceNets';

function grid(n: number, h: number, f: (x: number, y: number, z: number) => number) {
  const o = -((n - 1) / 2) * h;
  const field = new Float32Array(n * n * n);
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) field[i + n * (j + n * k)] = f(o + i * h, o + j * h, o + k * h);
  return { field, dims: [n, n, n] as [number, number, number], origin: [o, o, o] as [number, number, number] };
}

describe('surfaceNets', () => {
  const { field, dims, origin } = grid(40, 1.5, (x, y, z) => smin(sdSphere(x - 6, y, z, 14), sdSphere(x + 8, y, z, 10), 4));
  const r = surfaceNets(field, dims, origin, 1.5);

  it('produces a closed 2-manifold (every edge used by exactly two triangles, opposite directions)', () => {
    const edges = new Map<string, number>();
    for (let t = 0; t < r.index.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = r.index[t + e], b = r.index[t + ((e + 1) % 3)];
        edges.set(`${a},${b}`, (edges.get(`${a},${b}`) ?? 0) + 1);
      }
    for (const [key, cnt] of edges) {
      const [a, b] = key.split(',');
      expect(cnt).toBe(1);
      expect(edges.get(`${b},${a}`)).toBe(1);
    }
  });

  it('faces point outward (positive enclosed volume close to the analytic value)', () => {
    const s = grid(40, 1.5, (x, y, z) => sdSphere(x, y, z, 14));
    const rs = surfaceNets(s.field, s.dims, s.origin, 1.5);
    let vol = 0;
    const p = rs.position;
    for (let t = 0; t < rs.index.length; t += 3) {
      const a = rs.index[t] * 3, b = rs.index[t + 1] * 3, c = rs.index[t + 2] * 3;
      vol += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
    }
    const exact = (4 / 3) * Math.PI * 14 ** 3;
    expect(vol).toBeGreaterThan(0.97 * exact);
    expect(vol).toBeLessThan(1.03 * exact);
    const n = computeNormals(r.position, r.index);
    expect(n.length).toBe(r.position.length);
  });
});

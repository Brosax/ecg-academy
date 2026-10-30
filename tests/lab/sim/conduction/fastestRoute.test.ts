import { describe, expect, it } from 'vitest';
import { fastestRoute, stencilOffsets } from '../../../../src/lab/sim/conduction/fastestRoute';
import { buildPurkinjeLayer } from '../../../../src/lab/sim/conduction/purkinje';
import { COMP, TISSUE } from '../../../../src/lab/sim/types';
import { idx, makeGrid } from '../helpers/syntheticGrid';

describe('stencils', () => {
  it('26 and 50 neighbour offsets', () => {
    for (const s of [26, 50] as const) {
      const o = stencilOffsets(s);
      expect(o.length / 3).toBe(s);
      const keys = new Set<string>();
      for (let q = 0; q < o.length; q += 3) {
        const r2 = o[q] ** 2 + o[q + 1] ** 2 + o[q + 2] ** 2;
        expect(r2).toBeGreaterThan(0);
        expect(r2).toBeLessThanOrEqual(s === 26 ? 3 : 5);
        keys.add(`${o[q]},${o[q + 1]},${o[q + 2]}`);
      }
      expect(keys.size).toBe(s);
      for (const k of keys) expect(keys.has(k.split(',').map((x) => -Number(x)).join(','))).toBe(true);
    }
  });
});

describe('fastest route', () => {
  const n = 41;
  const block = makeGrid([n, n, n], 1, () => ({ tissue: TISSUE.LV }));
  const c = (n - 1) / 2;
  const center = idx(block, c, c, c);

  it('isotropic travel times approximate Euclidean distance / v (50: ≈ 5 %, 26: ≈ 9 %)', () => {
    for (const [s, tol] of [[50, 0.06], [26, 0.1]] as const) {
      const r = fastestRoute({ grid: block, comp: COMP.Ventricular, stencil: s, vLongMps: 0.5, vTransMps: 0.5, seeds: [{ voxel: center, tMs: 3 }] });
      let sum = 0, cnt = 0, worst = 0;
      for (let k = 0; k < n; k++)
        for (let j = 0; j < n; j++)
          for (let i = 0; i < n; i++) {
            const d = Math.hypot(i - c, j - c, k - c);
            if (d < 10 || d > 20) continue;
            const err = (r.tAct[idx(block, i, j, k)] - 3) / (d / 0.5) - 1;
            expect(err).toBeGreaterThanOrEqual(-1e-6); // graph distances never undercut the straight line
            sum += err;
            cnt++;
            worst = Math.max(worst, err);
          }
      const mean = sum / cnt;
      console.log(`stencil ${s}: mean overestimate ${(100 * mean).toFixed(2)} %, worst ${(100 * worst).toFixed(2)} %`);
      expect(mean).toBeLessThan(tol);
      expect(r.tAct[center]).toBe(3);
    }
  });

  it('anisotropy: slow across the wall (transDir), fast along it', () => {
    const g = makeGrid([n, n, n], 1, () => ({ tissue: TISSUE.LV, transDir: [0, 0, 1] }));
    const r = fastestRoute({ grid: g, comp: COMP.Ventricular, stencil: 50, vLongMps: 0.85, vTransMps: 0.34, seeds: [{ voxel: center, tMs: 0 }] });
    expect(r.tAct[idx(g, c + 10, c, c)]).toBeCloseTo(10 / 0.85, 4);
    expect(r.tAct[idx(g, c, c, c + 10)]).toBeCloseTo(10 / 0.34, 4);
    expect(r.tAct[idx(g, c, c + 10, c)]).toBeCloseTo(10 / 0.85, 4);
  });

  it('ring isolation: atrial seeds never activate ventricular voxels (diagonals cannot leak through a 1-voxel ring)', () => {
    const g = makeGrid([12, 12, 12], 1, (_i, j) => ({ tissue: j < 5 ? TISSUE.LV : j === 5 ? TISSUE.Ring : TISSUE.RA }));
    for (const s of [26, 50] as const) {
      const r = fastestRoute({ grid: g, comp: COMP.Atrial, stencil: s, vLongMps: 1, vTransMps: 1, seeds: [{ voxel: idx(g, 6, 9, 6), tMs: 0 }, { voxel: idx(g, 6, 2, 6), tMs: 0 }] });
      let bad = 0;
      for (let v = 0; v < g.tissue.length; v++) {
        const ok = g.tissue[v] === TISSUE.RA ? Number.isFinite(r.tAct[v]) : r.tAct[v] === Infinity;
        if (!ok) bad++;
      }
      expect(bad).toBe(0);
    }
  });

  it('two-layer Purkinje graph: PMJ delay, fast spread, retrograde block', () => {
    // LV cavity blood for k < 3, wall 3 ≤ k < 9
    const g = makeGrid([30, 30, 12], 1, (_i, _j, k) =>
      k < 3 ? { tissue: TISSUE.Blood, chamber: 3 } : k < 9 ? { tissue: TISSUE.LV, chamber: 3, transDir: [0, 0, 1], wallDepth: (k - 3) / 5 } : { tissue: TISSUE.Out },
    );
    const opts = { extent: 1, exclude: [], stencil: 50 as const, vPurkinjeMps: 3, pmjDelayMs: 7, retroDelayMs: Infinity };
    const pk = buildPurkinjeLayer(g, opts);
    expect(pk.size).toBe(30 * 30); // one subendocardial sheet at k = 3
    const a = pk.nodeOfVoxel[idx(g, 2, 2, 3)], b = idx(g, 27, 2, 3);
    const r = fastestRoute({ grid: g, comp: COMP.Ventricular, stencil: 50, vLongMps: 0.85, vTransMps: 0.34, seeds: [], layers: [pk], layerSeeds: [{ layer: 0, node: a, tMs: 0 }] });
    expect(r.tAct[idx(g, 2, 2, 3)]).toBeCloseTo(7, 5);
    expect(r.tAct[b]).toBeCloseTo(25 / 3 + 7, 3); // along Purkinje at 3 m/s, then the PMJ
    // muscle seed with retrograde block: the Purkinje network stays silent
    const blocked = fastestRoute({ grid: g, comp: COMP.Ventricular, stencil: 50, vLongMps: 0.85, vTransMps: 0.34, seeds: [{ voxel: idx(g, 15, 15, 8), tMs: 0 }], layers: [pk] });
    expect(blocked.layerT[0].every((t) => t === Infinity)).toBe(true);
    const pkRetro = buildPurkinjeLayer(g, { ...opts, retroDelayMs: 20 });
    const retro = fastestRoute({ grid: g, comp: COMP.Ventricular, stencil: 50, vLongMps: 0.85, vTransMps: 0.34, seeds: [{ voxel: idx(g, 15, 15, 8), tMs: 0 }], layers: [pkRetro] });
    expect(retro.layerT[0].some((t) => Number.isFinite(t))).toBe(true);
  });

  it('is deterministic', () => {
    const run = () => fastestRoute({ grid: block, comp: COMP.Ventricular, stencil: 50, vLongMps: 0.85, vTransMps: 0.85, seeds: [{ voxel: center, tMs: 0 }, { voxel: 5, tMs: 4 }] }).tAct;
    expect(run()).toEqual(run());
  });
});

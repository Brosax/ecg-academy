/**
 * Visual check of the procedural heart: writes slice PNGs to tests/out/geometry/ (gitignored) and logs build stats.
 * Axial = short axis (y), x right / anterior up; coronal (z) ≈ four-chamber; sagittal (x).
 */
import { describe, expect, it } from 'vitest';
import { buildHeartGeometryWithInfo } from '../../../../src/lab/sim/geometry/heart';
import { CHAMBER, TISSUE } from '../../../../src/lab/sim/types';
import { ahaColor, apexBaseColor, regionColor, renderPathProjection, renderSlices, tissueColor, wallDepthColor } from './slices';

const OUT = 'tests/out/geometry';

describe('procedural heart — visual slices', () => {
  const t0 = performance.now();
  const { bundle, info } = buildHeartGeometryWithInfo();
  const ms = performance.now() - t0;
  const g = bundle.grid;

  it('writes slice images and reports stats', () => {
    const counts: Record<string, number> = {};
    const names = Object.fromEntries(Object.entries(TISSUE).map(([k, v]) => [v, k]));
    for (let v = 0; v < g.tissue.length; v++) counts[names[g.tissue[v]]] = (counts[names[g.tissue[v]]] ?? 0) + 1;
    let lvBlood = 0;
    for (let v = 0; v < g.tissue.length; v++) if (g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.LV) lvBlood++;
    const vox = g.hMm ** 3;
    const triBy: Record<string, number> = {};
    const m = bundle.mesh;
    for (let t = 0; t < m.index.length; t += 3) {
      const tt = names[g.tissue[m.voxel[m.index[t]]]];
      triBy[tt] = (triBy[tt] ?? 0) + 1;
    }
    console.log('triangles by tissue', JSON.stringify(triBy));
    const vol = [0, 0, 0, 0, 0];
    for (let v = 0; v < g.tissue.length; v++) if (g.tissue[v] === TISSUE.Blood) vol[g.chamber[v]]++;
    console.log('blood mL [none, LA, RA, LV, RV]', vol.map((n) => Math.round((n * vox) / 1000)).join(' '));
    console.log(
      JSON.stringify(
        {
          totalMs: Math.round(ms),
          timings: Object.fromEntries(Object.entries(info.timingsMs).map(([k, v]) => [k, Math.round(v)])),
          dims: g.dims,
          originMm: g.originMm,
          shiftA: info.shiftA,
          counts,
          lvCavityMl: (lvBlood * vox) / 1000,
          lvMyoMl: (((counts.LV ?? 0) + (counts.Septum ?? 0)) * vox) / 1000,
          triangles: bundle.mesh.index.length / 3,
          vertices: bundle.mesh.position.length / 3,
          insertion: info.insertionDeg,
          relabelled: info.relabelledAtrialVoxels,
          misses: info.conductionMisses,
        },
        null,
        1,
      ),
    );
    const ys = [-55, -40, -25, -10, 5, 20, 32, 45, 60];
    const zs = [-30, -20, -10, 0, 10, 20, 30, 40, 50];
    const xs = [-55, -40, -25, -10, 0, 10, 20, 30, 40];
    const paths = bundle.paths;
    renderSlices(g, { axis: 'y', at: ys }, tissueColor, `${OUT}/axial-tissue.png`, { paths });
    renderSlices(g, { axis: 'z', at: zs }, tissueColor, `${OUT}/coronal-tissue.png`, { paths });
    renderSlices(g, { axis: 'x', at: xs }, tissueColor, `${OUT}/sagittal-tissue.png`, { paths });
    renderSlices(g, { axis: 'y', at: ys }, wallDepthColor, `${OUT}/axial-walldepth.png`);
    renderSlices(g, { axis: 'z', at: zs }, wallDepthColor, `${OUT}/coronal-walldepth.png`);
    renderSlices(g, { axis: 'z', at: zs }, apexBaseColor, `${OUT}/coronal-apexbase.png`);
    renderSlices(g, { axis: 'y', at: ys }, ahaColor, `${OUT}/axial-aha.png`);
    renderSlices(g, { axis: 'z', at: zs }, ahaColor, `${OUT}/coronal-aha.png`);
    renderSlices(g, { axis: 'y', at: ys }, regionColor, `${OUT}/axial-region.png`);
    renderSlices(g, { axis: 'z', at: zs }, regionColor, `${OUT}/coronal-region.png`);
    renderPathProjection(g, paths, 'z', `${OUT}/paths-coronal.png`);
    renderPathProjection(g, paths, 'x', `${OUT}/paths-sagittal.png`);
    renderPathProjection(g, paths, 'y', `${OUT}/paths-axial.png`);
    expect(bundle.mesh.index.length).toBeGreaterThan(0);
  });
});

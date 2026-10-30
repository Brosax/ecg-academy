/** Test helper: exact comparison of two GeometryBundles. */
import type { GeometryBundle } from '../../../../../src/lab/sim/types';

/** '' when every array / JSON field of the two bundles is identical, else the first differing field. */
export function sameBundle(a: GeometryBundle, b: GeometryBundle): string {
  const arr = (x: ArrayLike<number>, y: ArrayLike<number>) => x.length === y.length && Array.prototype.every.call(x, (v: number, i: number) => Object.is(v, y[i]));
  for (const k of ['tissue', 'chamber', 'aha', 'region', 'wallDepth', 'apexBase', 'transDir', 'sdfMm'] as const) if (!arr(a.grid[k], b.grid[k])) return `grid.${k}`;
  for (const k of ['position', 'normal', 'index', 'voxel'] as const) if (!arr(a.mesh[k], b.mesh[k])) return `mesh.${k}`;
  const json = (x: GeometryBundle) => JSON.stringify([x.grid.dims, x.grid.hMm, x.grid.originMm, x.pose, x.chambers, x.paths, x.valves, x.landmarks, x.credits, x.source, x.hash]);
  if (json(a) !== json(b)) return 'json';
  if ((a.overlays?.length ?? 0) !== (b.overlays?.length ?? 0)) return 'overlays';
  for (let i = 0; i < (a.overlays?.length ?? 0); i++) {
    const x = a.overlays![i], y = b.overlays![i];
    if (x.id !== y.id || x.kind !== y.kind || !arr(x.position, y.position) || !arr(x.index, y.index) || !arr(x.normal, y.normal)) return `overlay.${x.id}`;
  }
  return '';
}
